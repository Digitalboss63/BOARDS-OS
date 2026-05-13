import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const scoutingReportsTable = pgTable("scouting_reports", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  opponentName: text("opponent_name").notNull(),
  gameDate: timestamp("game_date", { withTimezone: true }),
  offensiveSystem: text("offensive_system"),
  defensiveSystem: text("defensive_system"),
  keyPlayers: text("key_players"),
  strengths: text("strengths"),
  weaknesses: text("weaknesses"),
  adjustments: text("adjustments"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertScoutingReportSchema = createInsertSchema(scoutingReportsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertScoutingReport = z.infer<typeof insertScoutingReportSchema>;
export type ScoutingReport = typeof scoutingReportsTable.$inferSelect;
