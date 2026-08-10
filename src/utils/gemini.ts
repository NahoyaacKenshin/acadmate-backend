/**
 * Gemini AI Utility
 *
 * Provides a single initialized GoogleGenerativeAI client and a defensive
 * `generateWithFallback` function that automatically cascades through
 * the model chain on 429 (Resource Exhausted) errors:
 *
 *   gemini-2.5-pro  →  gemini-2.5-flash  →  gemini-2.5-flash-lite
 *
 * All models share the same single GEMINI_API_KEY.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "@/config/env";

// ── Client ───────────────────────────────────────────────────────────────────

export const genAI = new GoogleGenerativeAI(ENV.GEMINI_API_KEY ?? "");

// ── Model Cascade ─────────────────────────────────────────────────────────────

const MODEL_CASCADE = [
  "gemini-pro-latest",
  "gemini-flash-latest",
  "gemini-flash-lite-latest",
] as const;

export type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

/**
 * Attempts to generate content using the best available model.
 * On a 429 (Resource Exhausted) error, it cascades to the next model in
 * the fallback chain. Throws if all models are exhausted or a non-429 error occurs.
 *
 * @param parts       - The content parts (text or inline data) to send to Gemini.
 * @param temperature - Optional generation temperature. Defaults to 1.0 (default Gemini).
 *                      Pass 0.2 for RAG chat to reduce hallucination risk.
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
      console.log(`[Gemini] Success with model: ${modelName}`);
      return text;
    } catch (err: unknown) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      const isTransientError =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("500") ||
        message.toLowerCase().includes("resource exhausted") ||
        message.toLowerCase().includes("quota") ||
        message.toLowerCase().includes("service unavailable");

      if (isTransientError) {
        console.warn(
          `[Gemini] Transient error or rate limit hit on ${modelName}. Cascading to next model...`
        );
        continue;
      }

      // Non-rate-limit error — rethrow immediately
      throw err;
    }
  }

  // All models exhausted
  throw new Error(
    `[Gemini] All models exhausted due to rate limits. Last error: ${
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

