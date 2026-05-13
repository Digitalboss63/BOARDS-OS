import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gamesTable = pgTable("games", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  opponent: text("opponent").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  location: text("location").notNull(),
  isHome: boolean("is_home").notNull().default(true),
  result: text("result").notNull().default("upcoming"),
  scoreUs: integer("score_us"),
  scoreThem: integer("score_them"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertGameSchema = createInsertSchema(gamesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertGame = z.infer<typeof insertGameSchema>;
export type Game = typeof gamesTable.$inferSelect;
