import { AsyncLocalStorage } from "async_hooks";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/env";
import type { Request, Response, NextFunction } from "express";

// ── Client & BYOK Store ───────────────────────────────────────────────────────

export const defaultGenAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY ?? "");
export const genAI = defaultGenAI; // Backwards-compatible export

/**
 * AsyncLocalStorage holds an optional user-provided Gemini API key
 * for the lifetime of a single Express HTTP request.
 */
export const aiKeyStorage = new AsyncLocalStorage<string | null>();

/**
 * Express middleware that extracts the user's custom Gemini API key from the
 * `x-gemini-api-key` header and stores it in AsyncLocalStorage context.
 */
export function aiKeyMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers["x-gemini-api-key"];
  const customKey =
    typeof header === "string" && header.trim().startsWith("AIzaSy")
      ? header.trim()
      : null;

  aiKeyStorage.run(customKey, () => {
    next();
  });
}

/**
 * Returns a GoogleGenerativeAI client using the user's custom key if present,
 * or falling back to the system default GEMINI_API_KEY.
 */
export function getGenAIClient(explicitKey?: string): { client: GoogleGenerativeAI; isCustom: boolean } {
  const contextKey = aiKeyStorage.getStore();
  const keyToUse = explicitKey || contextKey;

  if (keyToUse && keyToUse.trim().length > 0) {
    return { client: new GoogleGenerativeAI(keyToUse.trim()), isCustom: true };
  }

  return { client: defaultGenAI, isCustom: false };
}

// ── Model Cascade ─────────────────────────────────────────────────────────────

const MODEL_CASCADE = [
  "gemini-3.5-flash",          // ⚡ Primary workhorse — verified active, fast, reliable
  "gemini-3.6-flash",          // ⚡ High-throughput modern flash
  "gemini-3.5-flash-lite",     // 🪶 Ultra-fast lightweight fallback
  "gemini-flash-lite-latest",  // 🔄 Stable flash-lite alias
  "gemini-3.1-flash-lite",     // 🔄 Verified available fallback
  "gemini-3.8-flash",          // ⚡ Latest Gemini 3.8 (when not at peak capacity)
  "gemini-3.7-flash",          // ⚡ Gemini 3.7 Flash (when not at peak capacity)
  "gemini-3.1-pro-preview",    // 🥇 Flagship preview (when quota permits)
] as const;

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Attempts to generate content using the best available model.
 * If any model encounters an error (rate limit, service outage, deprecation, or unexpected failure),
 * it automatically cascades to the next model in the cascade list.
 *
 * Supports User-Provided Gemini API Key (BYOK) with automated fallback to system key.
 *
 * @param parts       - The content parts (text or inline data) to send to Gemini.
 * @param temperature - Generation temperature (e.g. 0.2 for deterministic RAG answers).
 * @param customKey   - Optional explicit custom Gemini API key.
 */
export async function generateWithFallback(
  parts: GeminiPart[],
  temperature = 1.0,
  customKey?: string
): Promise<string> {
  const { client, isCustom } = getGenAIClient(customKey);
  let lastError: unknown;

  // Attempt generation with active client (user custom key or system key)
  try {
    return await executeCascade(client, parts, temperature);
  } catch (err: unknown) {
    lastError = err;
    // If the user's custom key failed (e.g. invalid key or quota exhausted),
    // gracefully fall back to the system default key so the user is never blocked!
    if (isCustom) {
      console.warn(
        "[Gemini BYOK] User custom API key failed. Falling back gracefully to system default key..."
      );
      try {
        return await executeCascade(defaultGenAI, parts, temperature);
      } catch (fallbackErr: unknown) {
        lastError = fallbackErr;
      }
    }
  }

  // All models and fallbacks exhausted
  throw new Error(
    `[Gemini] All AI models in cascade exhausted. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

async function executeCascade(
  activeClient: GoogleGenerativeAI,
  parts: GeminiPart[],
  temperature: number
): Promise<string> {
  let cascadeError: unknown;

  for (const modelName of MODEL_CASCADE) {
    try {
      console.log(`[Gemini] Attempting with model: ${modelName} (temperature: ${temperature})`);
      const model = activeClient.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await model.generateContent(parts as any);
      const text = result.response.text();
      if (text && text.trim().length > 0) {
        console.log(`[Gemini] Success with model: ${modelName}`);
        return text;
      }
    } catch (err: unknown) {
      cascadeError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Gemini] Error on model ${modelName}: "${message.slice(0, 150)}". Cascading to next available AI model...`
      );
      await new Promise((resolve) => setTimeout(resolve, 350));
      continue;
    }
  }

  throw cascadeError;
}

/**
 * Generates a 768-dimensional text embedding vector using Gemini's
 * `gemini-embedding-001` model (with fallback to `gemini-embedding-2`).
 * Used for RAG (Retrieval-Augmented Generation) in the AI Notebook pipeline.
 *
 * Supports User-Provided Gemini API Key (BYOK) with automated fallback to system key.
 *
 * @param text - The text content to embed (should be ~500 words / chunk).
 * @param customKey - Optional explicit custom Gemini API key.
 * @returns An array of 768 floats representing the semantic vector.
 */
export async function generateEmbedding(text: string, customKey?: string): Promise<number[]> {
  const EMBEDDING_MODELS = ["gemini-embedding-001", "gemini-embedding-2"];
  const { client, isCustom } = getGenAIClient(customKey);
  let lastErr: unknown;

  const tryEmbed = async (activeClient: GoogleGenerativeAI): Promise<number[] | null> => {
    for (const modelName of EMBEDDING_MODELS) {
      try {
        const model = activeClient.getGenerativeModel({ model: modelName });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await model.embedContent({
          content: { role: "user", parts: [{ text }] },
          outputDimensionality: 768,
        } as any);
        if (result?.embedding?.values) {
          return result.embedding.values;
        }
      } catch (err) {
        lastErr = err;
        console.warn(`[Gemini] generateEmbedding error with ${modelName}:`, err);
      }
    }
    return null;
  };

  const values = await tryEmbed(client);
  if (values) return values;

  // Fallback to system default if user custom key failed
  if (isCustom) {
    console.warn("[Gemini BYOK] User custom key embedding failed. Falling back to default system key...");
    const fallbackValues = await tryEmbed(defaultGenAI);
    if (fallbackValues) return fallbackValues;
  }

  throw new Error(
    `[Gemini] Failed to generate embedding vector. Last error: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}

/**
 * Verifies if a user-supplied Gemini API key is valid by sending
 * a lightweight ping request to Google's API.
 */
export async function verifyGeminiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  if (!apiKey || typeof apiKey !== "string") {
    return { valid: false, error: "API key is required." };
  }

  const trimmed = apiKey.trim();
  if (!trimmed.startsWith("AIzaSy")) {
    return {
      valid: false,
      error: "Invalid format. Google Gemini API keys must begin with 'AIzaSy'.",
    };
  }

  if (trimmed.length < 35 || trimmed.length > 45) {
    return {
      valid: false,
      error: `Invalid length (${trimmed.length} chars). Gemini API keys are typically 39 characters.`,
    };
  }

  try {
    const testClient = new GoogleGenerativeAI(trimmed);
    const model = testClient.getGenerativeModel({
      model: "gemini-3.5-flash",
      generationConfig: { maxOutputTokens: 5 },
    });
    const result = await model.generateContent("Ping");
    if (result && result.response) {
      return { valid: true };
    }
    return { valid: false, error: "Google did not return a valid response." };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("API_KEY_INVALID") || message.includes("400") || message.includes("403")) {
      return {
        valid: false,
        error: "Google rejected this key. Please check that you copied it accurately from Google AI Studio.",
      };
    }
    return {
      valid: false,
      error: `Verification failed: ${message.slice(0, 120)}`,
    };
  }
}

