import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

/**
 * coaching_events — unified operational timeline for coaching activity.
 *
 * This is the coaching layer of the event system — distinct from system_events
 * (infrastructure telemetry). Every meaningful coaching action is recorded here:
 * a practice was run, a film session happened, a player note was written,
 * a recruit was contacted.
 *
 * Design principles:
 * - Append-only semantics (never edit history, only add corrections)
 * - AI-readable structure (category + metadata jsonb)
 * - Program-scoped (required for multi-program)
 * - Actor-tracked (who did the action)
 * - Lightweight — does not replace existing CRUD tables, links to them via refId
 *
 * Future capabilities this enables:
 * - Program activity timeline ("what happened this week")
 * - Coaching pattern analysis ("you haven't filmed in 12 days")
 * - Player development history ("every note on Marcus since October")
 * - Recruiting contact log ("last contact with Devon Harris: 6 days ago")
 * - Operational drift detection ("practice cadence dropped after road trip")
 */
export const coachingEventsTable = pgTable("coaching_events", {
  id: serial("id").primaryKey(),

  // Program association (required — no platform-wide coaching events)
  programId: integer("program_id")
    .notNull()
    .references(() => programsTable.id, { onDelete: "cascade" }),

  // Event category — drives filtering, grouping, AI signal processing
  category: text("category").notNull(),
  /*
   * Allowed values:
   *   practice         — practice session logged
   *   workout          — individual/group workout
   *   film_session     — film breakdown completed
   *   player_note      — observation about a player
   *   recruiting       — recruiting contact, evaluation, visit
   *   game             — game logged (win/loss/notes)
   *   scouting         — opponent scouting activity
   *   staff_action     — coaching staff action (meeting, decision)
   *   system           — automated platform event (migration, snapshot)
   */

  // Specific event type within category
  eventType: text("event_type").notNull(),
  /*
   * Examples:
   *   practice.completed, practice.planned, practice.cancelled
   *   film_session.reviewed, film_session.clipped
   *   player_note.observation, player_note.development, player_note.concern
   *   recruiting.contact, recruiting.visit, recruiting.offer, recruiting.commit
   *   game.logged, game.won, game.lost
   */

  // Human-readable title (1 line, shown in timeline)
  title: text("title").notNull(),

  // Optional longer description
  description: text("description"),

  // Actor — who performed this action (userId / email / "system")
  actorId: text("actor_id").notNull().default("system"),
  actorRole: text("actor_role"),               // coach | assistant | admin | system

  // Optional link back to the originating entity in another table
  refTable: text("ref_table"),                  // e.g. "practices", "players", "games"
  refId: integer("ref_id"),                     // e.g. practices.id = 12

  // Optional player association (for player-specific events)
  playerId: integer("player_id"),

  // Flexible structured metadata — AI-readable
  // Examples:
  //   { focusArea: "Defense", durationMinutes: 90, attendanceCount: 14 }
  //   { recruitName: "Devon Harris", contactMethod: "text", outcome: "positive" }
  //   { filmType: "opponent", opponentId: 5, keyFindings: ["pick-and-roll weakness"] }
  metadata: jsonb("metadata"),

  // Importance signal (1-5, used for future priority filtering)
  // 1 = routine, 3 = notable, 5 = critical/milestone
  importance: integer("importance").notNull().default(1),

  // When the coaching action actually occurred (may differ from createdAt)
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCoachingEventSchema = createInsertSchema(coachingEventsTable).omit({
  id: true,
  createdAt: true,
});

export type InsertCoachingEvent = z.infer<typeof insertCoachingEventSchema>;
export type CoachingEvent = typeof coachingEventsTable.$inferSelect;

// ─── Constants ────────────────────────────────────────────────────────────────

export const COACHING_CATEGORIES = {
  PRACTICE:     "practice",
  WORKOUT:      "workout",
  FILM_SESSION: "film_session",
  PLAYER_NOTE:  "player_note",
  RECRUITING:   "recruiting",
  GAME:         "game",
  SCOUTING:     "scouting",
  STAFF_ACTION: "staff_action",
  SYSTEM:       "system",
} as const;

export type CoachingCategory = typeof COACHING_CATEGORIES[keyof typeof COACHING_CATEGORIES];

export const COACHING_EVENT_TYPES: Record<string, string[]> = {
  practice:     ["practice.completed", "practice.planned", "practice.cancelled", "practice.modified"],
  workout:      ["workout.individual", "workout.group", "workout.conditioning"],
  film_session: ["film_session.reviewed", "film_session.clipped", "film_session.shared"],
  player_note:  ["player_note.observation", "player_note.development", "player_note.concern", "player_note.milestone"],
  recruiting:   ["recruiting.contact", "recruiting.evaluation", "recruiting.visit", "recruiting.offer", "recruiting.commit", "recruiting.decommit"],
  game:         ["game.logged", "game.won", "game.lost", "game.tied"],
  scouting:     ["scouting.report_created", "scouting.opponent_reviewed", "scouting.game_plan_updated"],
  staff_action: ["staff_action.meeting", "staff_action.decision", "staff_action.note"],
  system:       ["system.snapshot", "system.migration", "system.deploy"],
};
