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

## Responsive Design — Non-Negotiables
Every layout component MUST support mobile (≥320px), tablet (≥768px), and desktop (≥1024px).

**Sidebar rule:**
- Desktop (`md:` and up): fixed sidebar, `pl-64` on main content
- Mobile (below `md:`): sidebar hidden by default; hamburger button in fixed top bar opens a slide-in drawer with a dark backdrop; tapping backdrop or a nav item closes it
- **NEVER** use a hardcoded `pl-64` or `w-64 fixed` sidebar without the corresponding mobile drawer pattern

**Layout checklist before every deploy:**
- [ ] No fixed-width elements that bleed off screen on mobile
- [ ] `p-4 md:p-8` on main content containers (tighter padding on mobile)
- [ ] Tables use `overflow-x-auto` wrapper on mobile
- [ ] Forms stack vertically on mobile (`flex-col md:flex-row`)
- [ ] Touch targets ≥ 44px height on interactive elements
- [ ] Test in browser devtools at 390px width (iPhone 14) before pushing

## Git Workflow
- `main` = source of truth
- Push after every phase completion
- No direct commits to main without a handoff doc update
