import app from "./app";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, (err?: Error) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "BOARDS-OS API server listening");
});

// ── Graceful shutdown ─────────────────────────────────────────────────────────
// On SIGTERM (Railway deploy/stop), drain in-flight requests then close DB pool.

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Received shutdown signal — draining connections");

  server.close(async () => {
    logger.info("HTTP server closed");
    try {
      await pool.end();
      logger.info("DB pool closed");
    } catch (err) {
      logger.error({ err }, "Error closing DB pool");
    }
    process.exit(0);
  });

  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.warn("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));
