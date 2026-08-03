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
 */
export async function generateWithFallback(parts: GeminiPart[]): Promise<string> {
  let lastError: unknown;

  for (const modelName of MODEL_CASCADE) {
    try {
      console.log(`[Gemini] Attempting with model: ${modelName}`);
      const model = genAI.getGenerativeModel({ model: modelName });
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
