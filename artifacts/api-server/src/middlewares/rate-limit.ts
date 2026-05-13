/**
 * rate-limit.ts
 *
 * IP-based rate limiting for public API endpoints.
 * Uses in-memory store (express-rate-limit default).
 * For multi-instance production: swap to Redis store.
 *
 * Tiers:
 *   - apiLimiter:    100 req/min  — general API routes
 *   - strictLimiter:  10 req/min  — sensitive endpoints (invite accept, auth)
 */

import rateLimit from "express-rate-limit";

function rateLimitMessage(windowMs: number, max: number) {
  return {
    error: `Too many requests. Limit is ${max} per ${Math.round(windowMs / 60000)} minute(s). Please slow down.`,
  };
}

/**
 * General API rate limiter — apply to all /api/* routes.
 */
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,   // 1 minute
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage(60 * 1000, 100),
  skip: (req) => {
    // Skip health checks — they should never be rate limited
    return req.path === "/healthz" || req.path === "/health/full";
  },
});

/**
 * Strict limiter for sensitive operations.
 * Apply individually to invite acceptance, auth endpoints, etc.
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: rateLimitMessage(60 * 1000, 10),
});
