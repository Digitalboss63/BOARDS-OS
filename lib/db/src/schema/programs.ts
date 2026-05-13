import { pgTable, text, serial, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * programs — top-level tenant container.
 *
 * Every major entity (teams, players, practices, games, scouting_reports)
 * will carry a program_id FK when Phase 6 migration runs.
 * For now this table exists as the ownership anchor.
 *
 * Multi-program / white-label ready:
 *   - slug supports subdomain routing (e.g. eastside.boardsos.com)
 *   - primaryColor supports per-program branding
 *   - plan supports tiered access gating
 */
export const programsTable = pgTable("programs", {
  id: serial("id").primaryKey(),

  // Identity
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),          // URL-safe identifier
  sport: text("sport").notNull().default("basketball"),
  level: text("level").notNull().default("high_school"), // high_school | college | aau | youth | pro

  // Location
  city: text("city"),
  state: text("state"),
  country: text("country").notNull().default("US"),

  // Branding (Phase 6 UI)
  logoUrl: text("logo_url"),
  primaryColor: text("primary_color"),            // hex e.g. #E05C1A

  // Ownership — ownerId maps to an email or future auth provider ID
  ownerId: text("owner_id").notNull(),

  // Tier / access plan
  plan: text("plan").notNull().default("free"),   // free | starter | pro | enterprise

  // Status
  isActive: boolean("is_active").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertProgramSchema = createInsertSchema(programsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProgram = z.infer<typeof insertProgramSchema>;
export type Program = typeof programsTable.$inferSelect;
