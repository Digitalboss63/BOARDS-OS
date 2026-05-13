import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { programsTable } from "./programs";

/**
 * invites — time-limited invite tokens for program membership.
 *
 * Lifecycle: pending → accepted | expired | revoked
 *
 * token is a cryptographically random string (generated server-side).
 * email is optional — tokens can be shareable links (no email required).
 *
 * Future: QR code invites, role-scoped links, coach-to-coach referrals.
 */
export const invitesTable = pgTable("invites", {
  id: serial("id").primaryKey(),

  programId: integer("program_id")
    .notNull()
    .references(() => programsTable.id, { onDelete: "cascade" }),

  // Crypto-random token (min 32 chars) — never expose in logs
  token: text("token").notNull().unique(),

  // Optional target email — if set, only that email can accept
  email: text("email"),

  // Role the invited user will receive on acceptance
  role: text("role").notNull().default("coach"),

  // Lifecycle status
  status: text("status").notNull().default("pending"),
  // Allowed: pending | accepted | expired | revoked

  // Who created the invite (userId / email of inviter)
  invitedBy: text("invited_by").notNull(),

  // Expiry — default 7 days, enforced at application layer
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),

  // When it was accepted (null until used)
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),

  // Who accepted (null until used)
  acceptedBy: text("accepted_by"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertInviteSchema = createInsertSchema(invitesTable).omit({
  id: true,
  acceptedAt: true,
  acceptedBy: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertInvite = z.infer<typeof insertInviteSchema>;
export type Invite = typeof invitesTable.$inferSelect;

export const INVITE_STATUSES = {
  PENDING:  "pending",
  ACCEPTED: "accepted",
  EXPIRED:  "expired",
  REVOKED:  "revoked",
} as const;

export type InviteStatus = typeof INVITE_STATUSES[keyof typeof INVITE_STATUSES];
