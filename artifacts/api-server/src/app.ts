import express, { type Express } from "express";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middlewares/request-id";
import { buildCorsMiddleware } from "./middlewares/cors-config";
import { apiLimiter } from "./middlewares/rate-limit";
import { errorBoundary } from "./middlewares/error-boundary";
import { telemetryMiddleware } from "./middlewares/telemetry";

// Resolve frontend dist relative to the project root (process.cwd()).
// esbuild bundles everything into a single .mjs — __dirname from fileURLToPath
// resolves to the dist/ folder, not the project root. process.cwd() on Railway
// is always the repo root, so this is the safe anchor.
const frontendDist = path.join(process.cwd(), "artifacts", "boards", "dist", "public");

const app: Express = express();

// ── 1. Request ID — must be first for log correlation ─────────────────────────
app.use(requestIdMiddleware);

// ── 2. CORS — environment-aware (wildcard dev, locked prod) ──────────────────
app.use(buildCorsMiddleware());

// ── 3. Static frontend — BEFORE body parsing / middleware ─────────────────────
// Serves the Vite build output. express.static short-circuits to file response
// before any other middleware runs — this is the correct order.
app.use(express.static(frontendDist));

// ── 4. Request logging — safe serializers, no secrets ────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ── 5. Body parsing ────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 6. Rate limiting on all API routes ────────────────────────────────────────
app.use("/api", apiLimiter);

// ── 7. Passive telemetry — fire-and-forget, non-blocking ─────────────────────
app.use(telemetryMiddleware);

// ── 8. API routes ─────────────────────────────────────────────────────────────
app.use("/api", router);

// ── 9. SPA fallback ────────────────────────────────────────────────────────────
// Serves index.html for all non-API, non-static routes.
// This enables client-side routing to work after a hard refresh.
// Express 5 wildcard syntax: /{*path}
app.get("/{*path}", (_req, res) => {
  const indexPath = path.join(frontendDist, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      logger.warn({ frontendDist }, "SPA fallback: index.html not found — frontend may not be built yet");
      res.status(503).json({ error: "Frontend not available. Please check the build." });
    }
  });
});

// ── 10. Error boundary — MUST be last ─────────────────────────────────────────
app.use(errorBoundary);

export default app;
