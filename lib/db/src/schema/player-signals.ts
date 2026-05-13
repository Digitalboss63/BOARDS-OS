import { pgTable, text, serial, integer, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";
import { playersTable } from "./players";

/**
 * player_signals — lightweight signal collection for future AI recommendations.
 *
 * Each row is a single measurable data point about a player at a point in time.
 * This table does NOT replace dev profiles or player notes. It feeds the
 * recommendation engine that doesn't exist yet.
 *
 * Design principles:
 * - Write-often, read-occasionally (optimized for inserts)
 * - Normalized signal types (not free-form)
 * - Value is always numeric (even for booleans: 0/1)
 * - Context jsonb carries the human-readable story
 * - Append-only — signals are never edited
 *
 * Future capabilities:
 * - "Marcus has had 3 concerning effort signals in the last 2 weeks"
 * - "Devon is overloaded — 28+ minutes 7 games straight"
 * - "No development signals logged for Tyler in 10 days"
 * - "Shooting metrics trending down — flag for coach review"
 */
export const playerSignalsTable = pgTable("player_signals", {
  id: serial("id").primaryKey(),

  programId: integer("program_id")
    .notNull()
    .references(() => programsTable.id, { onDelete: "cascade" }),

  playerId: integer("player_id")
    .notNull()
    .references(() => playersTable.id, { onDelete: "cascade" }),

  // Signal type — normalized vocabulary
  signalType: text("signal_type").notNull(),
  /*
   * Allowed values:
   *   minutes_played       — game minutes (value = minutes)
   *   practice_attendance  — attended practice (value = 1) / missed (value = 0)
   *   effort_rating        — coach effort rating 1-5 (value = rating)
   *   film_session         — participated in film session (value = 1)
   *   development_note     — development note logged (value = 1)
   *   concern_flag         — coach flagged a concern (value = 1)
   *   milestone            — positive milestone (value = 1)
   *   readiness_score      — subjective readiness 1-10 (value = score)
   *   recruiting_contact   — recruit received contact (value = 1)
   */

  // Numeric value — semantic meaning depends on signalType
  value: real("value").notNull(),

  // Optional source (what generated this signal)
  source: text("source"),
  // Examples: "manual_coach", "practice_log", "game_log", "film_room"

  // Who recorded it
  actorId: text("actor_id").notNull().default("system"),

  // Optional context for human readability and future AI
  context: jsonb("context"),
  // Example: { gameId: 12, opponent: "Riverside", practiceId: 5 }

  // When the signal occurred (may differ from insert time)
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertPlayerSignalSchema = createInsertSchema(playerSignalsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertPlayerSignal = z.infer<typeof insertPlayerSignalSchema>;
export type PlayerSignal = typeof playerSignalsTable.$inferSelect;

// ─── Constants ────────────────────────────────────────────────────────────────

export const SIGNAL_TYPES = {
  MINUTES_PLAYED:      "minutes_played",
  PRACTICE_ATTENDANCE: "practice_attendance",
  EFFORT_RATING:       "effort_rating",
  FILM_SESSION:        "film_session",
  DEVELOPMENT_NOTE:    "development_note",
  CONCERN_FLAG:        "concern_flag",
  MILESTONE:           "milestone",
  READINESS_SCORE:     "readiness_score",
  RECRUITING_CONTACT:  "recruiting_contact",
} as const;

export type SignalType = typeof SIGNAL_TYPES[keyof typeof SIGNAL_TYPES];
