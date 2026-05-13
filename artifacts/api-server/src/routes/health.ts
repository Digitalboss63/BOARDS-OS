import { Router, type IRouter } from "express";
import { db, systemEventsTable } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { gte, sql } from "drizzle-orm";

const router: IRouter = Router();

// ── Basic health — no DB deps, always responds ────────────────────────────────
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// ── Full system health ────────────────────────────────────────────────────────
// Returns: server + database + telemetry + env status.
// Never returns 500 — always returns a structured status object.
// Returns 503 only when database is confirmed unreachable.
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

  // ── DB ping — use sql tagged template (Drizzle requirement) ──────────────
  try {
    await db.execute(sql`SELECT 1`);
    result.database = "ok";
  } catch (err) {
    logger.error({ err }, "Health check: DB ping failed");
    result.database = "error";
  }

  // ── Telemetry integrity — only attempted when DB is reachable ────────────
  // Gracefully handles the case where system_events table doesn't exist yet
  // (pre-migration fresh deploy).
  if (result.database === "ok") {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      await db
        .select({ id: systemEventsTable.id })
        .from(systemEventsTable)
        .where(gte(systemEventsTable.createdAt, oneHourAgo))
        .limit(1);
      result.telemetry = "ok";
    } catch (err) {
      // Table may not exist yet on a fresh deploy (pre-migration).
      // This is expected and not a real error — downgrade to "pending" not "error".
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist") || msg.includes("relation")) {
        result.telemetry = "pending_migration";
        logger.info("Health check: telemetry table not yet migrated — expected on fresh deploy");
      } else {
        logger.warn({ err }, "Health check: telemetry query failed unexpectedly");
        result.telemetry = "degraded";
      }
    }
  } else {
    result.telemetry = "degraded";
  }

  // ── Env var check — list names only, never values ────────────────────────
  const required = ["DATABASE_URL", "PORT"];
  const missing = required.filter((v) => !process.env[v]);
  if (missing.length > 0) {
    result.env = `missing vars: ${missing.join(", ")}`;
  }

  // 503 only for confirmed DB unreachable — all other issues return 200
  // so monitoring tools can read the structured response
  const statusCode = result.database === "error" ? 503 : 200;
  res.status(statusCode).json(result);
});

export default router;
