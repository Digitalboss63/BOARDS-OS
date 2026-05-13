# Phase 6 Handoff — BOARDS-OS
**Date:** 2026-05-12
**Built by:** OpenClaw Agent
**Phase:** 6 — Operational Intelligence Layer

## What Was Built

### DB Schema (4 new tables — all additive, no existing tables altered)

**coaching_events** (`lib/db/src/schema/coaching-events.ts`)
- Unified operational timeline for coaching activity
- Categories: practice, workout, film_session, player_note, recruiting, game, scouting, staff_action, system
- Fields: programId (FK), category, eventType, title, description, actorId, actorRole, refTable, refId, playerId, metadata (jsonb), importance (1-5), occurredAt, createdAt
- Exports: `COACHING_CATEGORIES`, `COACHING_EVENT_TYPES` constants
- AI-readable structure: category + eventType + metadata enables future pattern analysis

**player_signals** (`lib/db/src/schema/player-signals.ts`)
- Lightweight signal collection feeding future AI recommendations
- Signal types: minutes_played, practice_attendance, effort_rating, film_session, development_note, concern_flag, milestone, readiness_score, recruiting_contact
- Fields: programId (FK), playerId (FK→players), signalType, value (real), source, actorId, context (jsonb), occurredAt, createdAt
- Exports: `SIGNAL_TYPES` constants
- Append-only semantics — never edit historical signals

**recommendation_queue** (`lib/db/src/schema/recommendation-queue.ts`)
- Pending coaching insights awaiting coach interaction
- Status lifecycle: pending → acknowledged | dismissed | expired | acted_upon
- Fields: programId (FK), playerId (optional), recommendationType, priority (1-5), headline, detail, suggestedAction, status, generatedBy, sourceSignals (jsonb), expiresAt, acknowledgedAt, acknowledgedBy, timestamps
- Exports: `RECOMMENDATION_TYPES`, `RECOMMENDATION_STATUSES` constants
- Phase 6: rule_engine generated. Phase 7+: AI generated.

**staff_notes** (`lib/db/src/schema/staff-notes.ts`)
- Shared notes across coaching staff with role-based visibility
- Target types: player, team, game, practice, recruit, program, general
- Visibility: private (author only) | staff (all staff) | program (all members)
- Fields: programId (FK), targetType, targetId (optional FK), content, authorId, authorRole, visibility, isPinned, tag, timestamps
- Exports: `NOTE_TARGET_TYPES`, `NOTE_VISIBILITY` constants

### Server Utilities

**signal-processor.ts** (`artifacts/api-server/src/lib/`)
- `recordSignal(signal)` — write player signal (fire-and-forget safe)
- `recordCoachingEvent(event)` — write coaching timeline event (fire-and-forget safe)
- `enqueueRecommendation(rec)` — write to recommendation queue with deduplication
- `runRecommendationRules(programId)` — evaluate 2 rule-based recommendations:
  - Rule 1: Practice gap — no practice events in 5+ days → queue recommendation
  - Rule 2: Film gap — no film_session events in 10+ days → queue recommendation

**telemetry.ts** (`artifacts/api-server/src/middlewares/`)
- `telemetryMiddleware` — passive response-finish listener: only records 5xx errors and >2000ms slow requests
- `featureEvent(eventType)` — explicit feature usage decorator for specific routes
- Controlled by `TELEMETRY_DISABLED=true` env var
- Privacy-safe: never logs request body, auth tokens, or personal data

### API Routes (3 new route files)

**coaching-events.ts**
- `GET  /api/coaching-events/timeline` — recent 50 events for a program (desc)
- `GET  /api/coaching-events` — filtered list (programId required, category optional)
- `POST /api/coaching-events` — create event
- `GET  /api/coaching-events/:id` — single event

**signals.ts**
- `POST  /api/signals` — record player signal
- `GET   /api/signals/:playerId` — player signal history (programId required)
- `GET   /api/recommendations` — pending recommendations for program
- `PATCH /api/recommendations/:id` — acknowledge/dismiss/act_upon a recommendation
- `POST  /api/system/run-rules` — trigger rule evaluation (admin token required)

**staff-notes.ts**
- `GET    /api/staff-notes` — list notes (programId required, targetType/targetId optional)
- `POST   /api/staff-notes` — create note
- `PATCH  /api/staff-notes/:id` — update content, pin status, or tag
- `DELETE /api/staff-notes/:id` — delete note

### Middleware Updates
- `telemetryMiddleware` added to `app.ts` between rate limiter and routes
- `routes/index.ts` — 3 new routers registered

### Health Endpoint Update
- `/api/health/full` — added `telemetry` field:
  - `"ok"` — DB reachable and telemetry queries work
  - `"degraded"` — DB unreachable (telemetry depends on DB)
  - `"error"` — query failed unexpectedly

## Architecture Decisions

| Decision | Reasoning |
|---|---|
| coaching_events separate from system_events | coaching_events = what coaches do; system_events = what the platform does. Separate concerns, different retention policies |
| player_signals uses `real` for value | All signal types normalized to numeric — enables future aggregation/averaging across types |
| recommendation deduplication by type+program+status | Prevents flooding the queue with the same recommendation every time rules run |
| telemetry is fire-and-forget | Telemetry failures must never affect coaching workflows — errors are swallowed and logged |
| `featureEvent()` is opt-in per route | Not every route needs feature tracking — don't add noise, add where it matters |
| staff_notes uses integer isPinned (0/1) | Drizzle/Postgres `boolean` had edge cases with some drivers — int is safer and consistent with existing pattern in detection_rules |

## Security Scan — Phase 6
| Check | Result |
|---|---|
| err.message in any new route | ✅ None — all routes use generic strings + logger.error |
| Secrets in telemetry payload | ✅ Telemetry only captures method, url, status — no body or auth |
| Secrets in signal context | ✅ Context is coach-written metadata — no auth data flows here |
| Admin route protection | ✅ POST /system/run-rules uses requireAdmin() |
| TELEMETRY_DISABLED escape hatch | ✅ Present — production can disable if needed |

## Environment Variables Required
| Variable | Purpose | Required |
|---|---|---|
| `DATABASE_URL` | Postgres connection | YES |
| `PORT` | Server port | YES (auto) |
| `ADMIN_TOKEN` | /api/system/* and /api/system/run-rules | Required for admin |
| `APP_URL` | CORS lock | Required for production |
| `TELEMETRY_DISABLED` | Disable telemetry writes | Optional (default: false) |

## Migration Notes
All 4 new tables use `IF NOT EXISTS` semantics via Drizzle. Zero risk to existing data.

When programId FK is added to existing tables in Phase 7:
1. Create `programs` row for Eastside Eagles (programId = 1)
2. Add `program_id INTEGER REFERENCES programs(id)` as NULLABLE
3. `UPDATE teams/players/etc SET program_id = 1`
4. Make NOT NULL in separate migration

## Recommendation Rules — Current State
| Rule | Trigger | Priority | Expires |
|---|---|---|---|
| practice_gap | No practice event in 5 days | 3 | 3 days |
| film_gap | No film_session event in 10 days | 2 | 5 days |

More rules can be added to `runRecommendationRules()` without schema changes.

## What's NOT Done Yet
- Admin Diagnostics UI page (Phase 7)
- Coaching Events timeline UI (Phase 7)
- Player signals display in Player Lab (Phase 7)
- Recommendations panel in Command Center (Phase 7)
- Staff Notes UI (Phase 7)
- More recommendation rules (development_gap, recruiting_gap, roster_depth)
- Background cron for auto-running rules
- AI recommendation layer (Phase 8 — needs ANTHROPIC_API_KEY)
- programId FK on existing tables (Phase 7 migration)

## Go/No-Go Gate
| Check | Status |
|---|---|
| /api/health/full includes telemetry field | ✅ |
| All new routes use safeValidationError | ✅ |
| No err.message in API responses | ✅ |
| Admin routes protected | ✅ |
| Telemetry is fire-and-forget (can't break workflows) | ✅ |
| Schema index updated | ✅ |
| Routes index updated | ✅ |
| app.ts middleware order correct | ✅ |

## Next Agent Instructions (Phase 7)
1. Build Admin Diagnostics page (frontend `/admin`)
2. Add Recommendations panel to Command Center dashboard
3. Add Coaching Events timeline to Command Center
4. Add Staff Notes to Player Lab and Practices pages
5. programId FK migration on existing tables
6. Add 3 more recommendation rules: development_gap, recruiting_gap, roster_depth
7. Background cron job for `runRecommendationRules()`
