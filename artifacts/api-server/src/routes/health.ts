import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { HealthCheckResponse } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Basic health — no DB deps, always fast
router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

// Full system health — server + DB readiness check
router.get("/health/full", async (_req, res) => {
  const result: {
    server: string;
    database: string;
    ai: string;
    env: string;
  } = {
    server: "ok",
    database: "checking",
    ai: "n/a",
    env: "loaded",
  };

  // DB ping
  try {
    await db.execute("SELECT 1" as any);
    result.database = "ok";
  } catch (err) {
    logger.error({ err }, "Health check: DB ping failed");
    result.database = "error";
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
