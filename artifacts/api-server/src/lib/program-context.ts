/**
 * program-context.ts
 *
 * Server-side program ownership utilities.
 * Used by middleware and route handlers to enforce program-scoped access.
 *
 * Phase 5: scaffolding only — no auth enforcement yet.
 * Phase 6: wire to Clerk/session middleware, enforce on all program-scoped routes.
 */

import { Request, Response, NextFunction } from "express";
import { db, programUsersTable, programsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { hasMinRole, PROGRAM_ROLES, type ProgramRole } from "@workspace/db";
import { logger } from "./logger";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProgramContext {
  programId: number;
  userId: string;
  role: ProgramRole;
}

// Extend Express Request type for downstream route handlers
declare global {
  namespace Express {
    interface Request {
      programContext?: ProgramContext;
    }
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

/**
 * Resolve a user's membership in a program.
 * Returns null if the user is not an active member.
 */
export async function resolveProgramMembership(
  userId: string,
  programId: number
): Promise<ProgramContext | null> {
  const [membership] = await db
    .select()
    .from(programUsersTable)
    .where(
      and(
        eq(programUsersTable.userId, userId),
        eq(programUsersTable.programId, programId),
        eq(programUsersTable.status, "active")
      )
    )
    .limit(1);

  if (!membership) return null;

  return {
    programId: membership.programId,
    userId: membership.userId,
    role: membership.role as ProgramRole,
  };
}

/**
 * Resolve a program by slug.
 * Returns null if not found or inactive.
 */
export async function resolveProgramBySlug(slug: string) {
  const [program] = await db
    .select()
    .from(programsTable)
    .where(and(eq(programsTable.slug, slug), eq(programsTable.isActive, true)))
    .limit(1);

  return program ?? null;
}

// ─── Middleware Factories ─────────────────────────────────────────────────────

/**
 * requireProgramRole(minRole)
 *
 * Middleware factory. When auth is integrated, attach this to any route
 * that requires at minimum `minRole` within the program.
 *
 * Phase 5: STUB — passes through without enforcement.
 * Replace the stub body with real auth lookup in Phase 6.
 *
 * Usage:
 *   router.get("/teams", requireProgramRole("coach"), handler)
 */
export function requireProgramRole(minRole: ProgramRole) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // ── PHASE 6: Replace this stub with real auth enforcement ──────────────
    // const userId = req.auth?.userId;  // from Clerk middleware
    // const programId = parseInt(req.params.programId ?? req.headers["x-program-id"] as string);
    // if (!userId || !programId) { res.status(401).json({ error: "Unauthorized." }); return; }
    // const ctx = await resolveProgramMembership(userId, programId);
    // if (!ctx || !hasMinRole(ctx.role, minRole)) { res.status(403).json({ error: "Insufficient permissions." }); return; }
    // req.programContext = ctx;
    // ── END PHASE 6 ────────────────────────────────────────────────────────

    // Phase 5 stub: pass through, log intent
    logger.debug({ minRole }, "requireProgramRole: stub — not enforced (Phase 5)");
    next();
  };
}

/**
 * requireAdmin()
 *
 * Middleware for platform-level admin routes (system snapshots, diagnostics).
 * Uses ADMIN_TOKEN header check — simple, effective for single-tenant admin.
 *
 * Phase 5: active enforcement.
 * Phase 6: replace with Clerk session + admin role check.
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminToken = process.env["ADMIN_TOKEN"];
    if (!adminToken) {
      logger.warn("ADMIN_TOKEN not set — admin endpoints are unprotected");
      next();
      return;
    }

    const provided = req.headers["x-admin-token"] as string | undefined;
    if (!provided || provided !== adminToken) {
      res.status(401).json({ error: "Unauthorized." });
      return;
    }

    next();
  };
}
