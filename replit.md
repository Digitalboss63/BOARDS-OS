# BOARDS

Basketball Operations, Analysis & R&D System — an AI-powered basketball intelligence and program management platform for coaches, programs, and organizations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/boards run dev` — run the frontend (auto-assigned port)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + wouter + shadcn/ui + Tailwind CSS
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — Drizzle table definitions (teams, players, practices, games, scouting-reports)
- `artifacts/api-server/src/routes/` — Express route handlers
- `artifacts/boards/src/pages/` — Frontend pages
- `artifacts/boards/src/index.css` — Theme (dark film-room palette)

## Architecture decisions

- Contract-first OpenAPI spec drives Zod validation schemas (server) and React Query hooks (client) via Orval codegen
- Dark mode only — film-room aesthetic with charcoal/graphite palette and burnt orange accents
- Dashboard activity feed uses sequential IDs to avoid React key collisions across entity types
- Dates stored as timestamptz throughout

## Product

BOARDS is a basketball intelligence platform for AAU, high school, trainers, and academies. Core modules: Command Center dashboard, Roster Management, Team Management, Practice Planner, Game Log, and Scouting Intel.

## User preferences

- Design: Film-room energy. Dark charcoal + graphite + burnt orange accents (sparingly). Clean ESPN/Nike analytics aesthetic. NOT a fan app — intelligent, tactical, elite, understated.
- No emojis anywhere in the UI
- Basketball identity should feel like "NBA front office meets elite high school program"

## Gotchas

- After each OpenAPI spec change, run codegen before writing routes: `pnpm --filter @workspace/api-spec run codegen`
- Activity feed IDs are synthesized (sequential counter) since games/players/practices all have overlapping DB IDs starting from 1
- Seed dates must be in the future relative to current date for dashboard upcoming events to show

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
