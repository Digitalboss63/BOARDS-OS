import { pgTable, text, serial, integer, timestamp, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

/**
 * program_users — membership table linking users to programs with roles.
 *
 * Role hierarchy (ascending privilege):
 *   viewer → assistant → coach → admin → owner
 *
 * One user can be a member of multiple programs (multi-school staff).
 * userId is intentionally text (not integer) to be auth-provider agnostic —
 * will hold email until Clerk/Auth0 is integrated, then their sub/uid.
 */
export const programUsersTable = pgTable(
  "program_users",
  {
    id: serial("id").primaryKey(),

    programId: integer("program_id")
      .notNull()
      .references(() => programsTable.id, { onDelete: "cascade" }),

    // Auth-provider-agnostic user identifier (email or clerk sub)
    userId: text("user_id").notNull(),

    // Role within this program
    role: text("role").notNull().default("coach"),
    // Allowed: owner | admin | coach | assistant | viewer

    // Membership status
    status: text("status").notNull().default("active"),
    // Allowed: active | suspended | removed

    // Audit trail
    invitedBy: text("invited_by"),
    joinedAt: timestamp("joined_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => ({
    // One user can only have one active membership per program
    uniqueMembership: unique("program_users_program_user_unique").on(table.programId, table.userId),
  })
);

export const insertProgramUserSchema = createInsertSchema(programUsersTable).omit({
  id: true,
  joinedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProgramUser = z.infer<typeof insertProgramUserSchema>;
export type ProgramUser = typeof programUsersTable.$inferSelect;

/**
 * Valid roles — use these constants everywhere instead of raw strings.
 */
export const PROGRAM_ROLES = {
  OWNER:     "owner",
  ADMIN:     "admin",
  COACH:     "coach",
  ASSISTANT: "assistant",
  VIEWER:    "viewer",
} as const;

export type ProgramRole = typeof PROGRAM_ROLES[keyof typeof PROGRAM_ROLES];

/**
 * Privilege level for role comparison.
 * Higher number = more access.
 */
export const ROLE_LEVELS: Record<ProgramRole, number> = {
  viewer:    1,
  assistant: 2,
  coach:     3,
  admin:     4,
  owner:     5,
};

export function hasMinRole(userRole: ProgramRole, required: ProgramRole): boolean {
  return ROLE_LEVELS[userRole] >= ROLE_LEVELS[required];
}
