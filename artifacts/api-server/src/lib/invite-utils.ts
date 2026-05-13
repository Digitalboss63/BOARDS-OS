/**
 * invite-utils.ts
 *
 * Server-side invite token generation and validation utilities.
 * No email sending — token lifecycle management only.
 *
 * Phase 5: scaffolding only.
 * Phase 6: integrate with email provider (Resend/Postmark).
 */

import { randomBytes } from "crypto";
import { db, invitesTable } from "@workspace/db";
import { eq, and, gt } from "drizzle-orm";
import { INVITE_STATUSES } from "@workspace/db";
import { logger } from "./logger";
import { redactSecrets } from "./sanitize";

/**
 * Generate a cryptographically secure invite token.
 * 32 bytes = 64 hex chars. Sufficient for invite links.
 */
export function generateInviteToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Create an invite expiry timestamp.
 * Default: 7 days from now.
 */
export function inviteExpiresAt(daysFromNow = 7): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d;
}

/**
 * Validate an invite token.
 *
 * Returns the invite record if:
 *   - token exists
 *   - status is "pending"
 *   - not expired
 *   - if email-scoped, matches the provided email
 *
 * Returns null if invalid.
 * Never throws — logs errors internally.
 */
export async function validateInviteToken(
  token: string,
  claimingEmail?: string
): Promise<typeof invitesTable.$inferSelect | null> {
  try {
    const [invite] = await db
      .select()
      .from(invitesTable)
      .where(
        and(
          eq(invitesTable.token, token),
          eq(invitesTable.status, INVITE_STATUSES.PENDING),
          gt(invitesTable.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!invite) return null;

    // If the invite is email-scoped, verify the claiming user matches
    if (invite.email && claimingEmail) {
      if (invite.email.toLowerCase() !== claimingEmail.toLowerCase()) {
        logger.warn({ route: "validateInviteToken" }, "Invite claimed by wrong email");
        return null;
      }
    }

    return invite;
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "validateInviteToken: DB error");
    return null;
  }
}

/**
 * Mark an invite as accepted.
 * Call this after successfully creating the program_users membership.
 */
export async function acceptInvite(
  inviteId: number,
  acceptedBy: string
): Promise<boolean> {
  try {
    await db
      .update(invitesTable)
      .set({
        status: INVITE_STATUSES.ACCEPTED,
        acceptedAt: new Date(),
        acceptedBy,
      })
      .where(eq(invitesTable.id, inviteId));
    return true;
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "acceptInvite: DB error");
    return false;
  }
}

/**
 * Revoke an invite by ID.
 * Admin action — no user-facing feedback needed.
 */
export async function revokeInvite(inviteId: number): Promise<boolean> {
  try {
    await db
      .update(invitesTable)
      .set({ status: INVITE_STATUSES.REVOKED })
      .where(eq(invitesTable.id, inviteId));
    return true;
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "revokeInvite: DB error");
    return false;
  }
}
