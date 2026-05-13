import { Router, type IRouter } from "express";
import { db, systemEventsTable } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { desc, gte } from "drizzle-orm";

const router: IRouter = Router();

// Basic health — no DB deps, always fast
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Full system health — server + DB + telemetry integrity check
router.get("/health/full", async (_req, res) => {
  const result: {
    server: string;
    database: string;
    ai: string;
    env: string;
    telemetry: string;
  } = {
    server:    "ok",
    database:  "checking",
    ai:        "n/a",
    env:       "loaded",
    telemetry: "checking",
  };

  // DB ping
  try {
    await db.execute("SELECT 1" as any);
    result.database = "ok";
  } catch (err) {
    logger.error({ err }, "Health check: DB ping failed");
    result.database = "error";
  }

  // Telemetry integrity — check for critical events in the last hour
  try {
    if (result.database === "ok") {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentCritical = await db
        .select({ id: systemEventsTable.id })
        .from(systemEventsTable)
        .where(gte(systemEventsTable.createdAt, oneHourAgo))
        .limit(1);
      // Telemetry is "ok" if we can query it — whether or not there are critical events
      // The presence of critical events is surfaced via /api/system/diagnose
      result.telemetry = "ok";
    } else {
      result.telemetry = "degraded";
    }
  } catch (err) {
    logger.warn({ err }, "Health check: telemetry query failed");
    result.telemetry = "error";
  }

  // Env var check — list names only, never values
  const required = ["DATABASE_URL", "PORT"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    result.env = `missing vars: ${missing.join(", ")}`;
  }

  const statusCode = result.database === "error" ? 503 : 200;
  res.status(statusCode).json(result);
});

export default router;
