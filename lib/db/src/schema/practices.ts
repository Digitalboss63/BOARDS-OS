import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const practicesTable = pgTable("practices", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull(),
  scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
  durationMinutes: integer("duration_minutes").notNull().default(90),
  focus: text("focus").notNull(),
  drills: text("drills"),
  notes: text("notes"),
  status: text("status").notNull().default("scheduled"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPracticeSchema = createInsertSchema(practicesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPractice = z.infer<typeof insertPracticeSchema>;
export type Practice = typeof practicesTable.$inferSelect;
