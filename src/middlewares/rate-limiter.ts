import rateLimit from 'express-rate-limit';

/**
 * Dedicated rate limiter for expensive AI operations (Gemini embeddings, RAG chat, OCR schedule parsing).
 * Limits requests to 20 per minute per IP to protect downstream API quotas and prevent billing spikes.
 */
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 'error',
    message: 'Too many AI requests. Please wait a moment before asking again.',
  },
});
