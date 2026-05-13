/**
 * error-boundary.ts
 *
 * Global Express error handler middleware.
 * Catches any unhandled errors thrown in async route handlers.
 * Logs the full error server-side; returns a safe generic message to the client.
 *
 * Must be registered AFTER all routes:
 *   app.use(errorBoundary);
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";
import { redactSecrets } from "../lib/sanitize";

export function errorBoundary(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const requestId = (req as any).id ?? "unknown";

  // Safe server-side log — redact any accidental secret leaks
  logger.error(
    {
      requestId,
      method: req.method,
      url: req.url?.split("?")[0],
      err: redactSecrets(err instanceof Error ? err.stack ?? err.message : String(err)),
    },
    "Unhandled route error"
  );

  // Never expose internals to the client
  if (res.headersSent) return;

  res.status(500).json({ error: "An unexpected error occurred. Please try again." });
}
