# BOARDS-OS — Project Protocols
_Inherits from MASTER-BUILD-PROCESS.md. Project-specific rules below._

## Stack
- **Frontend:** React 18 + TypeScript + Vite 5 + Tailwind v4 + wouter + TanStack Query
- **Backend:** Express + TypeScript + Drizzle ORM
- **DB:** PostgreSQL (Replit-managed; Railway Postgres for production)
- **Monorepo:** pnpm workspaces

## Environment Variables
| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Postgres connection string | YES |
| `PORT` | Server bind port (set by platform) | YES |

## Build Pipeline
```
OC (OpenClaw) → all build and finishing work
GitHub → source of truth (push after every phase)
Railway → production deployment target
ChatGPT → strategy, prompt engineering, debug direction
```

## Security Non-Negotiables
- NEVER expose `err.message` / `err.stack` in API responses
- ALL Zod validation errors use `safeValidationError()` from `lib/sanitize.ts`
- NO secrets in frontend code, logs, or committed files
- `redactSecrets()` in sanitize.ts wraps all error output before logging externally

## Health Endpoints
| Endpoint | Purpose |
|---|---|
| `GET /api/healthz` | Basic server alive check |
| `GET /api/health/full` | Full system: server + DB + env status |

## Routing Conventions
- All API routes prefixed with `/api`
- Frontend routes handled by wouter (client-side)
- No `/api` prefix on frontend pages

## Module Pages (Phase 1-3 Complete)
| Route | Page | Status |
|---|---|---|
| `/` | Command Center (Dashboard) | ✅ Live |
| `/roster` | Roster Management | ✅ Live |
| `/teams` | Teams | ✅ Live |
| `/practices` | Practices | ✅ Live |
| `/games` | Games | ✅ Live |
| `/scouting` | Scouting Intel | ✅ Live |
| `/player-lab` | Player Lab | ✅ Live |
| `/practice-engine` | Practice Engine | ✅ Live |
| `/competitive-iq` | Competitive IQ | ✅ Live |
| `/film-room` | Film Room | ✅ Live |
| `/game-prep` | Game Prep | ✅ Live |
| `/recruiting` | Recruiting Board | ✅ Live |

## Phase 4 Targets
- Connect Competitive IQ to real game/practice data
- Player Lab dev notes persistence (backend endpoint)
- Real AI integration on Practice Engine + Film Room (when API key available)
- Rate limiting on all public endpoints
- CORS lock-down for production domain

## Railway Deployment
- `railway.toml` — build + start commands + health check config
- `nixpacks.toml` — forces `NODE_ENV=development` during install + build phases
- Build: installs deps → builds frontend → builds backend
- Start: `node artifacts/api-server/dist/index.mjs`
- Health check: `/api/healthz`
- Frontend served as static files from `artifacts/boards/dist/public`
- SPA fallback: `/{*path}` → `index.html`

## Git Workflow
- `main` = source of truth
- Push after every phase completion
- No direct commits to main without a handoff doc update
