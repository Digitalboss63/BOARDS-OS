/**
 * telemetry.ts — Passive feature usage telemetry middleware.
 *
 * Records "a coach used this feature" without slowing responses.
 * Fire-and-forget: errors are swallowed and logged — never thrown.
 *
 * Privacy principles:
 * - Never logs request body content
 * - Never logs auth tokens or personal data
 * - Only records: route pattern, method, status, duration, programId if present
 * - All telemetry is opt-out compatible (TELEMETRY_DISABLED=true skips all writes)
 *
 * Usage:
 *   app.use(telemetryMiddleware);   // passive on all routes
 *   router.post("/...", featureEvent("practice_engine_used"), handler); // explicit feature events
 */

import { Request, Response, NextFunction } from "express";
import { db, systemEventsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const TELEMETRY_DISABLED = process.env["TELEMETRY_DISABLED"] === "true";

// Routes that are too noisy to track individually
const SKIP_PATTERNS = [
  /^\/healthz/,
  /^\/health/,
  /^\/favicon/,
];

/**
 * Passive request telemetry — records slow requests and errors.
 * Attached globally in app.ts as response-finish listener.
 */
export function telemetryMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (TELEMETRY_DISABLED) { next(); return; }

  const start = Date.now();
  const url = req.url?.split("?")[0] ?? "";

  // Skip noisy utility routes
  if (SKIP_PATTERNS.some((p) => p.test(url))) { next(); return; }

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    // Only write telemetry events for notable cases:
    // - server errors (5xx)
    // - slow requests (>2000ms)
    const isError = status >= 500;
    const isSlow = duration > 2000;

    if (!isError && !isSlow) return;

    const eventType = isError ? "api_error" : "slow_request";
    const severity = isError ? "error" : "warning";
    const message = isError
      ? `${req.method} ${url} → ${status}`
      : `Slow request: ${req.method} ${url} took ${duration}ms`;

    // Fire and forget — never await in middleware
    db.insert(systemEventsTable).values({
      eventType,
      severity,
      message,
      requestId: (req as any).id ?? null,
      route: url,
      durationMs: duration,
      context: { method: req.method, status },
    }).catch((err) => {
      logger.warn({ err }, "telemetry: failed to write event (non-fatal)");
    });
  });

  next();
}

/**
 * featureEvent(eventType) — explicit feature usage recorder.
 *
 * Use on specific routes to record intentional feature engagement.
 * Example: router.post("/practice-plan/generate", featureEvent("practice_engine_used"), handler)
 *
 * Records on response finish — never blocks the request.
 */
export function featureEvent(eventType: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (TELEMETRY_DISABLED) { next(); return; }

    res.on("finish", () => {
      if (res.statusCode >= 400) return; // Don't record failed feature uses

      db.insert(systemEventsTable).values({
        eventType,
        severity: "info",
        message: `Feature used: ${eventType}`,
        requestId: (req as any).id ?? null,
        route: req.url?.split("?")[0] ?? "",
        durationMs: null,
        context: { method: req.method },
      }).catch((err) => {
        logger.warn({ err }, `featureEvent(${eventType}): write failed (non-fatal)`);
      });
    });

    next();
  };
}
