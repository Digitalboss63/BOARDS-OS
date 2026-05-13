import express, { type Express } from "express";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requestIdMiddleware } from "./middlewares/request-id";
import { buildCorsMiddleware } from "./middlewares/cors-config";
import { apiLimiter } from "./middlewares/rate-limit";
import { errorBoundary } from "./middlewares/error-boundary";
import { telemetryMiddleware } from "./middlewares/telemetry";

const app: Express = express();

// ── 1. Request ID — must be first for log correlation
app.use(requestIdMiddleware);

// ── 2. CORS — environment-aware (wildcard dev, locked prod)
app.use(buildCorsMiddleware());

// ── 3. Request logging — safe serializers, no secrets
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0], // strip query params from logs
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  })
);

// ── 4. Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── 5. Rate limiting on all API routes
app.use("/api", apiLimiter);

// ── 6. Passive telemetry — fire-and-forget, non-blocking
app.use(telemetryMiddleware);

// ── 7. Feature routes
app.use("/api", router);

// ── 8. Error boundary — MUST be last, after all routes
app.use(errorBoundary);

export default app;
