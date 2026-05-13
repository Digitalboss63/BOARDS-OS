# Phase 7.5 Handoff — BOARDS-OS
**Date:** 2026-05-13
**Built by:** OpenClaw Agent
**Phase:** 7.5 — Railway Stabilization + Production Validation

## Issues Found & Fixed

### 1. `db.execute("SELECT 1")` — Invalid Drizzle Syntax
**File:** `artifacts/api-server/src/routes/health.ts`
**Issue:** Drizzle's `.execute()` requires a `sql` tagged template, not a raw string. Would throw `TypeError` at runtime on every `/health/full` call.
**Fix:** Changed to `await db.execute(sql\`SELECT 1\`)`

### 2. Telemetry Health Check — Crashes on Fresh Deploy
**File:** `artifacts/api-server/src/routes/health.ts`
**Issue:** Querying `system_events` table before migration runs throws "relation does not exist". On a fresh Railway deploy, `/health/full` would return `telemetry: "error"` — misleading and blocking Railway's health check.
**Fix:** Added error classification — if error message contains "does not exist" or "relation", return `telemetry: "pending_migration"` (expected state) instead of `"error"`. True errors return `"degraded"`.

### 3. SPA Fallback Path Resolution — Wrong Anchor
**File:** `artifacts/api-server/src/app.ts`
**Issue:** Used `__dirname` from `fileURLToPath(import.meta.url)` — in the esbuild bundle this resolves to the `dist/` directory, not the project root. `path.join(__dirname, "../../boards/dist/public")` would resolve incorrectly.
**Fix:** Changed to `path.join(process.cwd(), "artifacts", "boards", "dist", "public")`. Railway always sets `cwd()` to the repo root.

### 4. No Inline DB Migration — Tables Don't Exist on Fresh Deploy
**File:** NEW `artifacts/api-server/src/lib/migrate.ts`
**Issue:** No mechanism to create tables on a fresh Railway Postgres instance. `drizzle-kit push` requires a dev environment. Without migration, every API call would fail with "relation does not exist".
**Fix:** Added `runMigrations()` — 18 `CREATE TABLE IF NOT EXISTS` statements covering all schema tables. Runs at startup before the HTTP server binds. Includes seed for default program (Eastside Eagles, programId=1).

### 5. `index.ts` Mojibake in Comments + No Async Startup
**File:** `artifacts/api-server/src/index.ts`
**Issue:** Em dashes corrupted to garbled Unicode in comments. Also, migration needed to run before `app.listen()` but startup was synchronous.
**Fix:** Rewrote with `async start()` function — migrations run first, then server binds. Clean UTF-8 comments.

### 6. `lib/db/src/index.ts` — Missing SSL Config for Railway Postgres
**File:** `lib/db/src/index.ts`
**Issue:** Railway Postgres requires SSL in production (`ssl: { rejectUnauthorized: false }`). Without it, connection silently fails on Railway's managed Postgres.
**Fix:** Added conditional SSL — `rejectUnauthorized: false` in production, `false` in development.

### 7. `dashboard.ts` — Raw SQL String + Mojibake + No Error Handling
**File:** `artifacts/api-server/src/routes/dashboard.ts`
**Issue:** Used `sql\`created_at DESC\`` raw string in `orderBy` (fragile). Em dash mojibake in `description` field. No try/catch on DB calls — any DB error propagates as unhandled.
**Fix:** Replaced with typed `desc()` from drizzle-orm. Clean UTF-8. Added try/catch with safe 500 responses on all three routes.

### 8. `railway.toml` — Health Check Timeout Too Short
**File:** `railway.toml`
**Issue:** 30 second timeout may not cover cold start + migration time on first deploy.
**Fix:** Increased `healthcheckTimeout` to 60 seconds.

## Files Changed
| File | Change |
|---|---|
| `artifacts/api-server/src/routes/health.ts` | Fixed `db.execute(sql)`, graceful telemetry pre-migration handling |
| `artifacts/api-server/src/app.ts` | Fixed SPA path anchor (`process.cwd()` not `__dirname`) |
| `artifacts/api-server/src/index.ts` | Async startup with migration, clean comments |
| `artifacts/api-server/src/lib/migrate.ts` | NEW — 18-statement idempotent schema bootstrap + default program seed |
| `artifacts/api-server/src/routes/dashboard.ts` | Fixed ordering, error handling, clean text |
| `lib/db/src/index.ts` | Added SSL config for Railway Postgres |
| `railway.toml` | Health check timeout 30→60s |

## Security Scan — Phase 7.5
| Check | Result |
|---|---|
| `err.message` in API responses | ✅ None — `health.ts` reads message to classify only, never sends |
| `error-boundary.ts` | ✅ Uses `redactSecrets()` — logs only |
| Secrets in logs | ✅ No new log statements added |
| SSL credentials | ✅ `rejectUnauthorized: false` — standard for managed Postgres, no cert pinning needed |
| Migration SQL injection | ✅ Not possible — all SQL is hardcoded, no user input in migration statements |
| Seed idempotency | ✅ `WHERE NOT EXISTS` prevents re-seeding on redeploy |

## Environment Variables Required for Railway
| Variable | Purpose | Required | Notes |
|---|---|---|---|
| `DATABASE_URL` | Postgres connection | **YES** | Auto-set when Railway Postgres service is linked |
| `PORT` | Server port | **YES** | Auto-set by Railway |
| `NODE_ENV` | Runtime mode | **YES** | Set to `production` in Railway Variables tab |
| `ADMIN_TOKEN` | Admin route auth | **YES** | `openssl rand -hex 32` |
| `APP_URL` | CORS origin lock | **YES** | e.g. `https://boards-os.up.railway.app` |
| `TELEMETRY_DISABLED` | Disable telemetry writes | No | Default: false |

## Production Readiness Assessment

### ✅ Ready
- Railway deployment config (build + start + health check)
- Nixpacks NODE_ENV handling (devDeps install correctly)
- Inline DB migrations (all 18 tables, idempotent)
- Default program seed (programId=1 Eastside Eagles)
- SSL for Railway Postgres
- SPA serving + fallback routing
- Health endpoints (`/api/healthz` + `/api/health/full`)
- Error boundary — no raw errors to client
- Rate limiting — 100 req/min
- CORS — env-var locked for production
- Request ID middleware
- Graceful shutdown (SIGTERM)
- All API routes with safe error handling
- `sanitize.ts` protecting all error output

### ⚠️ Known Risks
1. **`--frozen-lockfile` on Railway** — lockfile was updated on Windows (pnpm EISDIR partial run). If lockfile is inconsistent with package.json on Linux, Railway install will fail. Mitigation: remove `--frozen-lockfile` flag if build fails; re-lock on Railway.
2. **`system_events` table column casing** — Drizzle maps `eventType` → `event_type` via snake_case. Ensure the migration column name matches. Currently `event_type TEXT` — correct.
3. **No auth yet** — all routes are effectively public. `requireAdmin()` only protects `/api/system/*` routes.
4. **DEFAULT_PROGRAM_ID = 1 hardcoded** in frontend — works for single-program; breaks when multi-program is introduced (Phase 8).

### Scaling Readiness
- Single service (API + frontend served together) — horizontal scaling possible via Railway replicas
- In-memory rate limiter — will not synchronize across replicas (Redis rate limiter needed for multi-instance)
- DB pool (pg.Pool) — each Railway instance gets its own pool; acceptable for current scale
- No caching layer yet — all DB queries on every request

## Recommended Phase 8 Priorities
1. **Verify Railway deploy** — connect GitHub → create Railway service → set env vars → watch build logs → hit `/api/health/full`
2. **AI integration** — `POST /api/practice-plan/generate` + `POST /api/film-room/analyze` (Anthropic key)
3. **Admin diagnostics page** — frontend `/admin` route with snapshot, events, recommendations, health
4. **programId dynamic** — replace `DEFAULT_PROGRAM_ID = 1` with auth context
5. **Redis rate limiter** — for multi-instance Railway deploys
6. **More recommendation rules** — development_gap, recruiting_gap, roster_depth

## Go/No-Go Gate
| Check | Status |
|---|---|
| `db.execute(sql\`SELECT 1\`)` syntax correct | ✅ |
| Telemetry health — graceful pre-migration | ✅ |
| SPA path uses `process.cwd()` | ✅ |
| Migrations run before server bind | ✅ |
| SSL configured for Railway Postgres | ✅ |
| Dashboard routes have try/catch | ✅ |
| Security scan — no `err.message` leaks | ✅ |
| Health check timeout 60s | ✅ |
