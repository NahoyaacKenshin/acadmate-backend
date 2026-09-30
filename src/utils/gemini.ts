/**
 * Gemini AI Utility
 *
 * Provides a single initialized GoogleGenerativeAI client and a defensive
 * `generateWithFallback` function that automatically cascades through
 * the model chain on 429 (quota exhausted) and 503 (service capacity) errors:
 *
 *   gemini-3.5-flash  →  gemini-3.6-flash  →  gemini-3.5-flash-lite  →  gemini-flash-lite-latest  →  gemini-3.1-flash-lite  →  gemini-3.8-flash  →  gemini-3.7-flash  →  gemini-3.1-pro-preview
 *
 * All models share the same single GEMINI_API_KEY.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/env";

// ── Client ───────────────────────────────────────────────────────────────────

export const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY ?? "");

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
 * @param parts       - The content parts (text or inline data) to send to Gemini.
 * @param temperature - Generation temperature (e.g. 0.2 for deterministic RAG answers).
 */
export async function generateWithFallback(parts: GeminiPart[], temperature = 1.0): Promise<string> {
  let lastError: unknown;

  for (const modelName of MODEL_CASCADE) {
    try {
      console.log(`[Gemini] Attempting with model: ${modelName} (temperature: ${temperature})`);
      const model = genAI.getGenerativeModel({
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
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(
        `[Gemini] Error on model ${modelName}: "${message.slice(0, 150)}". Cascading to next available AI model...`
      );
      await new Promise((resolve) => setTimeout(resolve, 350));
      continue;
    }
  }

  // All models exhausted — throw descriptive error for caller fallback
  throw new Error(
    `[Gemini] All AI models in cascade exhausted. Last error: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

/**
 * Generates a 768-dimensional text embedding vector using Gemini's
 * `gemini-embedding-001` model (with fallback to `gemini-embedding-2`).
 * Used for RAG (Retrieval-Augmented Generation) in the AI Notebook pipeline.
 *
 * @param text - The text content to embed (should be ~500 words / chunk).
 * @returns An array of 768 floats representing the semantic vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const EMBEDDING_MODELS = ['gemini-embedding-001', 'gemini-embedding-2'];
  let lastErr: unknown;

  for (const modelName of EMBEDDING_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text }] },
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

  throw new Error(
    `[Gemini] Failed to generate embedding vector. Last error: ${
      lastErr instanceof Error ? lastErr.message : String(lastErr)
    }`
  );
}

