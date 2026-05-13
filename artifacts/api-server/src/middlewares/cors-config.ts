/**
 * cors-config.ts
 *
 * Environment-aware CORS configuration.
 * Development: allows all origins (wildcard).
 * Production: restricts to APP_URL + any additional allowed origins.
 *
 * Set APP_URL in Railway Variables before deploy.
 * For multiple origins: APP_ALLOWED_ORIGINS="https://a.com,https://b.com"
 */

import cors from "cors";

function buildAllowedOrigins(): string[] | "*" {
  if (process.env["NODE_ENV"] !== "production") {
    return "*"; // Dev: unrestricted
  }

  const origins: string[] = [];

  const appUrl = process.env["APP_URL"];
  if (appUrl) origins.push(appUrl.replace(/\/$/, ""));

  const extra = process.env["APP_ALLOWED_ORIGINS"];
  if (extra) {
    extra.split(",").forEach((o) => {
      const trimmed = o.trim().replace(/\/$/, "");
      if (trimmed) origins.push(trimmed);
    });
  }

  return origins.length > 0 ? origins : "*";
}

export function buildCorsMiddleware() {
  const allowed = buildAllowedOrigins();

  return cors({
    origin: allowed,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Token", "X-Request-Id", "X-Program-Id"],
    credentials: true,
  });
}
