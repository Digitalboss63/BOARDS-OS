import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

/**
 * recommendation_queue — pending coaching insights waiting to be surfaced.
 *
 * This table is the bridge between signal collection and AI output.
 * In Phase 6: rows are written by rule-based processors (no AI yet).
 * In Phase 7+: rows may be written by the AI recommendation engine.
 *
 * A recommendation sits in this queue until:
 *   - A coach acknowledges it (status → acknowledged)
 *   - A coach dismisses it (status → dismissed)
 *   - It expires (status → expired, driven by expiresAt)
 *   - It's superseded by a newer recommendation of the same type
 *
 * Design principles:
 * - Coaching language always (no stats jargon)
 * - Actionable — every recommendation has a suggested action
 * - Expirable — stale insights are worse than no insight
 * - Dismissable — coaches control the signal, not the platform
 * - Priority-ordered — most important surfaces first
 */
export const recommendationQueueTable = pgTable("recommendation_queue", {
  id: serial("id").primaryKey(),

  programId: integer("program_id")
    .notNull()
    .references(() => programsTable.id, { onDelete: "cascade" }),

  // Optional player focus (null = program-wide recommendation)
  playerId: integer("player_id"),

  // Recommendation type — drives deduplication and UI grouping
  recommendationType: text("recommendation_type").notNull(),
  /*
   * Allowed values:
   *   practice_gap         — too many days without practice
   *   player_overload      — player logging too many minutes
   *   film_gap             — no film session in too long
   *   development_gap      — no dev notes for player
   *   recruiting_gap       — no contact with high-priority recruit
   *   roster_depth         — weakness in a position group
   *   opponent_prep        — upcoming opponent has no scouting report
   *   coaching_pattern     — coach hasn't used a feature in X days
   */

  // Priority 1-5 (5 = urgent, 1 = low)
  priority: integer("priority").notNull().default(3),

  // Coaching-language headline — what the coach sees
  // Written in plain English, not analyst/dev language
  headline: text("headline").notNull(),

  // 1-2 sentence explanation
  detail: text("detail"),

  // What the coach should do about it
  suggestedAction: text("suggested_action"),

  // Status lifecycle
  status: text("status").notNull().default("pending"),
  // Allowed: pending | acknowledged | dismissed | expired | acted_upon

  // Who generated this recommendation
  generatedBy: text("generated_by").notNull().default("system"),
  // Values: "system" | "rule_engine" | "ai" (Phase 7+)

  // Source signals that triggered this (array of player_signal IDs or event IDs)
  sourceSignals: jsonb("source_signals"),

  // When this recommendation becomes stale
  expiresAt: timestamp("expires_at", { withTimezone: true }),

  // When a coach interacted with it
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: text("acknowledged_by"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecommendationSchema = createInsertSchema(recommendationQueueTable).omit({
  id: true,
  acknowledgedAt: true,
  acknowledgedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationQueueTable.$inferSelect;

// ─── Constants ────────────────────────────────────────────────────────────────

export const RECOMMENDATION_TYPES = {
  PRACTICE_GAP:    "practice_gap",
  PLAYER_OVERLOAD: "player_overload",
  FILM_GAP:        "film_gap",
  DEVELOPMENT_GAP: "development_gap",
  RECRUITING_GAP:  "recruiting_gap",
  ROSTER_DEPTH:    "roster_depth",
  OPPONENT_PREP:   "opponent_prep",
  COACHING_PATTERN: "coaching_pattern",
} as const;

export type RecommendationType = typeof RECOMMENDATION_TYPES[keyof typeof RECOMMENDATION_TYPES];

export const RECOMMENDATION_STATUSES = {
  PENDING:      "pending",
  ACKNOWLEDGED: "acknowledged",
  DISMISSED:    "dismissed",
  EXPIRED:      "expired",
  ACTED_UPON:   "acted_upon",
} as const;
