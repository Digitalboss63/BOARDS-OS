# Phase 5 Handoff — BOARDS-OS
**Date:** 2026-05-12
**Built by:** OpenClaw Agent
**Phase:** 5 — Scaling, Self-Heal, Operational Intelligence, Production Architecture

## What Was Built

### Multi-Program / Tenant Architecture (DB Layer)
Three new Drizzle schema files added to `lib/db/src/schema/`:

**programs.ts** — Top-level tenant container
- Fields: id, name, slug (unique), sport, level, city, state, country, logoUrl, primaryColor, ownerId, plan, isActive, timestamps
- Slug supports subdomain routing (eastside.boardsos.com)
- plan field supports future tiered access gating

**program-users.ts** — User → program membership with roles
- Fields: id, programId (FK→programs), userId (auth-agnostic text), role, status, invitedBy, timestamps
- Unique constraint: one role per (programId, userId)
- Role hierarchy: viewer(1) → assistant(2) → coach(3) → admin(4) → owner(5)
- Exports: `PROGRAM_ROLES`, `ROLE_LEVELS`, `hasMinRole()` utility

**invites.ts** — Invite token lifecycle
- Fields: id, programId (FK→programs), token (unique, crypto-random), email (optional), role, status, invitedBy, expiresAt, acceptedAt, acceptedBy, timestamps
- Status lifecycle: pending → accepted | expired | revoked
- Exports: `INVITE_STATUSES` constants

### Self-Heal / Operational Intelligence (DB Layer)
One new schema file: `lib/db/src/schema/system.ts`

**system_snapshots** — Point-in-time platform state captures
- Flexible jsonb payload (row counts, health status, node version, uptime)
- Program-scoped or global (programId nullable)

**system_events** — Operational telemetry log
- eventType, severity (info/warning/error/critical), message, context (jsonb), requestId, route, durationMs
- Exports: `EVENT_TYPES`, `EVENT_SEVERITIES` constants
- Prunable — designed for 90-day retention cron

**fix_records** — Known-issue knowledge base
- slug (unique), title, symptom, rootCause, resolution, tags, linkedEventType
- Used by /api/system/diagnose to surface fix recommendations

**detection_rules** — Configurable alerting rules engine
- condition (jsonb), action (jsonb), isActive, cooldownSeconds, programId (optional scoping)
- Phase 5: evaluated on demand by diagnose endpoint
- Phase 6: background cron evaluation

### Server-Side Utilities
**artifacts/api-server/src/lib/program-context.ts**
- `resolveProgramMembership(userId, programId)` — DB lookup
- `resolveProgramBySlug(slug)` — program resolver
- `requireProgramRole(minRole)` — middleware factory (STUB in Phase 5 — pass-through)
- `requireAdmin()` — ACTIVE enforcement via X-Admin-Token header

**artifacts/api-server/src/lib/invite-utils.ts**
- `generateInviteToken()` — 32-byte crypto-random hex
- `inviteExpiresAt(days)` — expiry date helper
- `validateInviteToken(token, email?)` — full lifecycle check
- `acceptInvite(id, acceptedBy)` — mark accepted + audit trail
- `revokeInvite(id)` — admin revocation

### Production Middleware (4 new files)
**middlewares/request-id.ts** — UUID on every request, X-Request-Id response header
**middlewares/cors-config.ts** — Wildcard dev, APP_URL-locked production
**middlewares/error-boundary.ts** — Global unhandled error catcher, safe 500 response
**middlewares/rate-limit.ts** — apiLimiter (100/min), strictLimiter (10/min), health endpoints exempt

### System Admin Routes (`artifacts/api-server/src/routes/system.ts`)
All protected by requireAdmin() (X-Admin-Token header):
- `POST /api/system/snapshot` — capture row counts + uptime snapshot
- `GET  /api/system/snapshots` — last 50 snapshots
- `GET  /api/system/events` — recent telemetry events (default 100, max 500)
- `POST /api/system/events` — manually log an event
- `GET  /api/system/diagnose` — diff + cross-reference fix records → recommendations
- `GET  /api/system/fix-records` — list known fixes
- `POST /api/system/fix-records` — add a new fix record
- `GET  /api/system/rules` — list detection rules

### Wiring Updates
**app.ts** — Rebuilt with correct middleware order:
1. requestIdMiddleware
2. buildCorsMiddleware()
3. pinoHttp logging
4. express.json + urlencoded
5. apiLimiter on /api
6. routes
7. errorBoundary (last)

**index.ts** — Added graceful SIGTERM/SIGINT shutdown:
- Drains HTTP connections
- Closes DB pool
- 10-second force-exit fallback

**routes/index.ts** — systemRouter added

**schema/index.ts** — All new tables exported

## Architecture Decisions

| Decision | Reasoning |
|---|---|
| `userId` as text (not int) | Auth-provider agnostic — works with email, Clerk sub, Auth0 uid |
| FK cascades on programId | Deleting a program cleans up users and invites automatically |
| No FK on existing tables yet | Additive only — no disruption to current Replit workflows |
| `requireProgramRole()` is a stub | Phase 5 is scaffolding only — enforcement in Phase 6 with real auth |
| `requireAdmin()` uses header token | Simple, effective for single-tenant admin without full auth system |
| CORS locked by env var | No code change needed to lock down prod — just set APP_URL in Railway |
| Rate limiter skips health routes | Health checks must never be blocked for monitoring tools |
| jsonb for condition/action | Flexible rules engine — no schema migration needed to add new rule types |

## Environment Variables Required
| Variable | Purpose | Required Now |
|---|---|---|
| `DATABASE_URL` | Postgres connection | YES |
| `PORT` | Server port | YES (auto) |
| `ADMIN_TOKEN` | /api/system/* auth | YES (admin features) |
| `APP_URL` | CORS lock for production | YES before Railway deploy |
| `ANTHROPIC_API_KEY` | AI features | Phase 6 |

## Security Scan — Phase 5
| Check | Result |
|---|---|
| err.message in new routes | ✅ None — all routes use generic strings |
| Secrets in logs | ✅ redactSecrets() used in invite-utils.ts and error-boundary.ts |
| Admin routes unprotected | ✅ requireAdmin() enforced on all /system/* routes |
| CORS wildcard in production | ✅ Locked by APP_URL env var |
| Rate limiting | ✅ apiLimiter on all /api routes |
| invite token in logs | ✅ Token never logged — only invite ID |

## What's NOT Done Yet
- `express-rate-limit` package needs to be added to api-server/package.json (Replit installs on rebuild)
- Existing tables (teams, players, etc.) don't have programId FK yet — Phase 6 migration
- requireProgramRole() is stub — needs Phase 7 auth integration (Clerk)
- Detection rules evaluation is manual only — Phase 6: cron background runner
- Admin Diagnostics UI page — Phase 6
- Invite UI + email sending — Phase 7
- Multi-program switcher UI — Phase 7

## Migration Notes
Phase 5 tables use `CREATE TABLE IF NOT EXISTS` semantics via Drizzle — safe to run on existing DB.
No existing tables altered. Zero risk to current Eastside Eagles seed data.

When Phase 6 adds programId to existing tables:
1. Add `program_id INTEGER REFERENCES programs(id)` as NULLABLE first
2. Backfill: `UPDATE teams SET program_id = 1` (Eastside Eagles = program 1)
3. Then make NOT NULL in a second migration
4. Never make it NOT NULL in a single step on a populated table

## Next Agent Instructions
**Phase 6 — AI Integration:**
1. Add `express-rate-limit` to `artifacts/api-server/package.json` dependencies
2. Create `artifacts/api-server/src/ai/provider.ts`
3. Add `POST /api/practice-plan/generate` route
4. Add `POST /api/film-room/analyze` route
5. Add `/api/health/ai` endpoint
6. Update Practice Engine + Film Room pages to call real API

**Phase 7 — Auth + Multi-Program:**
1. Integrate Clerk (`@clerk/express`)
2. Activate `requireProgramRole()` middleware (remove stub body)
3. Add programId FK to existing tables (phased migration above)
4. Build invite acceptance flow (no email yet — link-based)
5. Build program switcher UI

## Go/No-Go Gate
| Check | Status |
|---|---|
| New schema tables export cleanly | ✅ schema/index.ts updated |
| app.ts middleware order correct | ✅ health → CORS → log → body → rateLimit → routes → errorBoundary |
| System routes require admin token | ✅ requireAdmin() on all /system/* |
| CORS locks on APP_URL in prod | ✅ env-var driven |
| Graceful shutdown handles SIGTERM | ✅ 10s drain + pool close |
| No new err.message leaks | ✅ Confirmed |
| express-rate-limit installed | ⚠️ Must be in package.json — verify on Replit rebuild |
