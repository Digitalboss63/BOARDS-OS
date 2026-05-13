/**
 * request-id.ts
 *
 * Attaches a unique request ID to every inbound request.
 * Used for log correlation and telemetry event linking.
 *
 * Sets:
 *   req.id       — UUID v4 string
 *   X-Request-Id — response header (safe to expose)
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers["x-request-id"] as string) || randomUUID();
  (req as any).id = id;
  res.setHeader("X-Request-Id", id);
  next();
}
