import { pgTable, text, serial, integer, jsonb, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

/**
 * system_snapshots — periodic point-in-time platform state captures.
 *
 * Captured by POST /api/system/snapshot (admin only).
 * Used by /api/system/diagnose to diff current vs last known-good state.
 *
 * programId is nullable — null = platform-wide snapshot, int = program-scoped.
 */
export const systemSnapshotsTable = pgTable("system_snapshots", {
  id: serial("id").primaryKey(),

  programId: integer("program_id"),              // null = global

  // Snapshot payload — flexible JSON
  // Expected shape: { rowCounts: {players, teams, ...}, health: {...}, timestamp }
  snapshot: jsonb("snapshot").notNull(),

  // Human label for this snapshot (e.g. "post-Phase4-deploy", "pre-migration")
  label: text("label"),

  // Who triggered it
  triggeredBy: text("triggered_by").notNull().default("system"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemSnapshot = typeof systemSnapshotsTable.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * system_events — operational telemetry log.
 *
 * Records errors, slow requests, auth failures, and significant state changes.
 * NOT a full access log — only noteworthy events.
 * Designed to be prunable (cron job deletes events older than 90 days).
 */
export const systemEventsTable = pgTable("system_events", {
  id: serial("id").primaryKey(),

  programId: integer("program_id"),              // null = platform-wide

  // Event classification
  eventType: text("event_type").notNull(),
  // Examples: api_error | auth_failure | slow_request | db_error
  //           snapshot_taken | rule_triggered | invite_sent | invite_accepted

  severity: text("severity").notNull().default("info"),
  // Allowed: info | warning | error | critical

  // What happened — safe, no secrets
  message: text("message").notNull(),

  // Optional structured context — redacted before storage
  context: jsonb("context"),

  // Request trace (from request-id middleware)
  requestId: text("request_id"),

  // Route that triggered the event
  route: text("route"),

  // Response time in ms (for slow_request events)
  durationMs: integer("duration_ms"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SystemEvent = typeof systemEventsTable.$inferSelect;

export const EVENT_TYPES = {
  API_ERROR:        "api_error",
  AUTH_FAILURE:     "auth_failure",
  SLOW_REQUEST:     "slow_request",
  DB_ERROR:         "db_error",
  SNAPSHOT_TAKEN:   "snapshot_taken",
  RULE_TRIGGERED:   "rule_triggered",
  INVITE_SENT:      "invite_sent",
  INVITE_ACCEPTED:  "invite_accepted",
  DEPLOY_DETECTED:  "deploy_detected",
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export const EVENT_SEVERITIES = {
  INFO:     "info",
  WARNING:  "warning",
  ERROR:    "error",
  CRITICAL: "critical",
} as const;

export type EventSeverity = typeof EVENT_SEVERITIES[keyof typeof EVENT_SEVERITIES];

// ─────────────────────────────────────────────────────────────────────────────

/**
 * fix_records — known-issue knowledge base.
 *
 * When a bug is diagnosed and fixed, log it here.
 * The /api/system/diagnose endpoint can cross-reference active events
 * against fix_records to surface recommended actions automatically.
 */
export const fixRecordsTable = pgTable("fix_records", {
  id: serial("id").primaryKey(),

  // Short identifier — used by detection rules to reference fixes
  slug: text("slug").notNull().unique(),          // e.g. "db-connection-refused"

  title: text("title").notNull(),
  symptom: text("symptom").notNull(),
  rootCause: text("root_cause").notNull(),
  resolution: text("resolution").notNull(),

  // Tags for grouping (JSON array of strings)
  tags: jsonb("tags"),                            // e.g. ["db", "env", "startup"]

  // Linked event type that typically surfaces this issue
  linkedEventType: text("linked_event_type"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type FixRecord = typeof fixRecordsTable.$inferSelect;

// ─────────────────────────────────────────────────────────────────────────────

/**
 * detection_rules — configurable rules engine for automated alerting.
 *
 * Each rule defines a condition (expressed as a JSON config)
 * and an action to take when triggered (log event, send alert, etc.).
 *
 * Phase 5: rules are evaluated manually by /api/system/diagnose.
 * Phase 6: background cron evaluates rules on a schedule.
 */
export const detectionRulesTable = pgTable("detection_rules", {
  id: serial("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  // What to watch
  // JSON config: { metric: "error_rate_5m", threshold: 10, comparison: "gt" }
  condition: jsonb("condition").notNull(),

  // What to do when triggered
  // JSON config: { action: "log_event", severity: "warning", message: "..." }
  action: jsonb("action").notNull(),

  // Enabled/disabled
  isActive: integer("is_active").notNull().default(1), // 1=active, 0=disabled (int for parity)

  // Optional program scope (null = applies to all programs)
  programId: integer("program_id"),

  // Cooldown: don't fire this rule again within N seconds of last trigger
  cooldownSeconds: integer("cooldown_seconds").notNull().default(300),

  lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type DetectionRule = typeof detectionRulesTable.$inferSelect;
