import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

/**
 * staff_notes — shared notes across coaching staff.
 *
 * Bridges single-coach usage and staff collaboration without
 * requiring full auth/multi-user to be built yet.
 *
 * A note has a target (what it's about) and a visibility level
 * (who can see it). Private notes are visible only to the author.
 * Staff notes are visible to all program members.
 *
 * Design principles:
 * - Simple text-first (no rich editor needed yet)
 * - Target-typed (player, team, game, practice, program, recruit)
 * - Role-aware visibility (private / staff / program)
 * - Author-tracked
 * - Pinnable (important notes float to top)
 *
 * Future capabilities:
 * - "All staff notes on Marcus this week"
 * - "Game notes from last 3 opponents"
 * - "Private coaching journal"
 * - "Practice notes accessible to assistant coaches"
 */
export const staffNotesTable = pgTable("staff_notes", {
  id: serial("id").primaryKey(),

  programId: integer("program_id")
    .notNull()
    .references(() => programsTable.id, { onDelete: "cascade" }),

  // What this note is about
  targetType: text("target_type").notNull(),
  // Allowed: player | team | game | practice | recruit | program | general

  // Optional FK to the target entity
  targetId: integer("target_id"),

  // Note content — plain text, no HTML
  content: text("content").notNull(),

  // Author (userId / email)
  authorId: text("author_id").notNull(),
  authorRole: text("author_role"),              // coach | assistant | admin

  // Visibility control
  visibility: text("visibility").notNull().default("staff"),
  // Allowed:
  //   private  — only the author sees it
  //   staff    — all program staff see it
  //   program  — all program members (including viewers)

  // Pinned notes surface first in their target context
  isPinned: integer("is_pinned").notNull().default(0),  // 0=no, 1=yes

  // Optional tag for filtering (freeform)
  tag: text("tag"),
  // Examples: "development", "concern", "recruiting", "film"

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertStaffNoteSchema = createInsertSchema(staffNotesTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertStaffNote = z.infer<typeof insertStaffNoteSchema>;
export type StaffNote = typeof staffNotesTable.$inferSelect;

// ─── Constants ────────────────────────────────────────────────────────────────

export const NOTE_TARGET_TYPES = {
  PLAYER:   "player",
  TEAM:     "team",
  GAME:     "game",
  PRACTICE: "practice",
  RECRUIT:  "recruit",
  PROGRAM:  "program",
  GENERAL:  "general",
} as const;

export type NoteTargetType = typeof NOTE_TARGET_TYPES[keyof typeof NOTE_TARGET_TYPES];

export const NOTE_VISIBILITY = {
  PRIVATE: "private",
  STAFF:   "staff",
  PROGRAM: "program",
} as const;

export type NoteVisibility = typeof NOTE_VISIBILITY[keyof typeof NOTE_VISIBILITY];
