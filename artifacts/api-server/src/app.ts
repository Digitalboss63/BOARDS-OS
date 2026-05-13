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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

// ── 1. Request ID — must be first for log correlation
app.use(requestIdMiddleware);

// ── 2. CORS — environment-aware (wildcard dev, locked prod)
app.use(buildCorsMiddleware());

// ── 3. Static frontend — BEFORE all middleware to avoid interference
//    Serves the Vite build output from artifacts/boards/dist/public
const frontendDist = path.resolve(__dirname, "../../boards/dist/public");
app.use(express.static(frontendDist));

// ── 4. Request logging — safe serializers, no secrets
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

// ── 5. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 6. Rate limiting on all API routes
app.use("/api", apiLimiter);

// ── 7. Passive telemetry — fire-and-forget, non-blocking
app.use(telemetryMiddleware);

// ── 8. API routes
app.use("/api", router);

// ── 9. SPA fallback — serve index.html for all non-API routes
//    Must come AFTER API routes so /api/* never hits this
app.get("/{*path}", (_req, res) => {
  res.sendFile(path.join(frontendDist, "index.html"), (err) => {
    if (err) {
      logger.warn("SPA fallback: index.html not found — frontend may not be built yet");
      res.status(503).json({ error: "Frontend build not available." });
    }
  });
});

// ── 10. Error boundary — MUST be last
app.use(errorBoundary);

export default app;
