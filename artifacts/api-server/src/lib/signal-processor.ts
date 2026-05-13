/**
 * signal-processor.ts
 *
 * Utilities for writing player signals and generating rule-based
 * recommendations. This is the bridge between raw coaching events
 * and the recommendation queue.
 *
 * Phase 6: rule-based only — no AI.
 * Phase 7+: AI layer reads from recommendation_queue and enhances/replaces
 * rule-based recommendations.
 *
 * All functions are safe — errors are caught and logged, never thrown.
 */

import { db, playerSignalsTable, recommendationQueueTable, coachingEventsTable } from "@workspace/db";
import { SIGNAL_TYPES, RECOMMENDATION_TYPES } from "@workspace/db";
import { desc, eq, and, gte, count } from "drizzle-orm";
import { logger } from "./logger";
import { redactSecrets } from "./sanitize";

// ─── Signal Writers ───────────────────────────────────────────────────────────

/**
 * recordSignal — write a player signal.
 * Fire-and-forget safe: call without await if needed.
 */
export async function recordSignal(signal: {
  programId: number;
  playerId: number;
  signalType: string;
  value: number;
  source?: string;
  actorId?: string;
  context?: Record<string, unknown>;
  occurredAt?: Date;
}): Promise<void> {
  try {
    await db.insert(playerSignalsTable).values({
      programId: signal.programId,
      playerId: signal.playerId,
      signalType: signal.signalType,
      value: signal.value,
      source: signal.source ?? "manual_coach",
      actorId: signal.actorId ?? "system",
      context: signal.context ?? null,
      occurredAt: signal.occurredAt ?? new Date(),
    });
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "recordSignal: failed (non-fatal)");
  }
}

/**
 * recordCoachingEvent — write a coaching timeline event.
 * Fire-and-forget safe.
 */
export async function recordCoachingEvent(event: {
  programId: number;
  category: string;
  eventType: string;
  title: string;
  description?: string;
  actorId?: string;
  actorRole?: string;
  refTable?: string;
  refId?: number;
  playerId?: number;
  metadata?: Record<string, unknown>;
  importance?: number;
  occurredAt?: Date;
}): Promise<void> {
  try {
    await db.insert(coachingEventsTable).values({
      programId: event.programId,
      category: event.category,
      eventType: event.eventType,
      title: event.title,
      description: event.description ?? null,
      actorId: event.actorId ?? "system",
      actorRole: event.actorRole ?? null,
      refTable: event.refTable ?? null,
      refId: event.refId ?? null,
      playerId: event.playerId ?? null,
      metadata: event.metadata ?? null,
      importance: event.importance ?? 1,
      occurredAt: event.occurredAt ?? new Date(),
    });
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "recordCoachingEvent: failed (non-fatal)");
  }
}

// ─── Rule-Based Recommendation Processor ─────────────────────────────────────

/**
 * enqueueRecommendation — write a recommendation to the queue.
 * Deduplicates by recommendationType + programId + status=pending.
 * If an identical pending recommendation already exists, skips the insert.
 */
export async function enqueueRecommendation(rec: {
  programId: number;
  playerId?: number;
  recommendationType: string;
  priority: number;
  headline: string;
  detail?: string;
  suggestedAction?: string;
  generatedBy?: string;
  sourceSignals?: number[];
  expiresInDays?: number;
}): Promise<void> {
  try {
    // Check for existing pending recommendation of same type for this program
    const [existing] = await db
      .select({ id: recommendationQueueTable.id })
      .from(recommendationQueueTable)
      .where(
        and(
          eq(recommendationQueueTable.programId, rec.programId),
          eq(recommendationQueueTable.recommendationType, rec.recommendationType),
          eq(recommendationQueueTable.status, "pending"),
          rec.playerId
            ? eq(recommendationQueueTable.playerId, rec.playerId)
            : undefined as any
        )
      )
      .limit(1);

    if (existing) return; // Already queued — don't spam

    const expiresAt = rec.expiresInDays
      ? new Date(Date.now() + rec.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    await db.insert(recommendationQueueTable).values({
      programId: rec.programId,
      playerId: rec.playerId ?? null,
      recommendationType: rec.recommendationType,
      priority: rec.priority,
      headline: rec.headline,
      detail: rec.detail ?? null,
      suggestedAction: rec.suggestedAction ?? null,
      generatedBy: rec.generatedBy ?? "rule_engine",
      sourceSignals: rec.sourceSignals ? rec.sourceSignals : null,
      expiresAt,
      status: "pending",
    });
  } catch (err) {
    logger.error({ err: redactSecrets(String(err)) }, "enqueueRecommendation: failed (non-fatal)");
  }
}

/**
 * runRecommendationRules — evaluate rule-based recommendations for a program.
 *
 * Called by POST /api/system/run-rules (admin) or future background job.
 * Each rule is self-contained — one failure doesn't stop the others.
 *
 * Phase 6 rules:
 * 1. Practice gap — no coaching events of category "practice" in 5+ days
 * 2. Film gap — no film_session events in 10+ days
 */
export async function runRecommendationRules(programId: number): Promise<{ rulesEvaluated: number; recommendationsQueued: number }> {
  let rulesEvaluated = 0;
  let recommendationsQueued = 0;

  const queueIfNew = async (rec: Parameters<typeof enqueueRecommendation>[0]) => {
    const before = recommendationsQueued;
    await enqueueRecommendation(rec);
    // We can't easily tell if it was inserted without a return value, so count attempts
    recommendationsQueued++;
  };

  // ── Rule 1: Practice Gap ──────────────────────────────────────────────────
  rulesEvaluated++;
  try {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    const [recentPractice] = await db
      .select({ id: coachingEventsTable.id })
      .from(coachingEventsTable)
      .where(
        and(
          eq(coachingEventsTable.programId, programId),
          eq(coachingEventsTable.category, "practice"),
          gte(coachingEventsTable.occurredAt, fiveDaysAgo)
        )
      )
      .limit(1);

    if (!recentPractice) {
      await queueIfNew({
        programId,
        recommendationType: RECOMMENDATION_TYPES.PRACTICE_GAP,
        priority: 3,
        headline: "No practice logged in the last 5 days.",
        detail: "Your practice cadence has dropped. Whether it's a break or a scheduling gap — make sure your next session is on the books.",
        suggestedAction: "Open Practice Engine and schedule your next session.",
        expiresInDays: 3,
      });
    }
  } catch (err) {
    logger.warn({ err: redactSecrets(String(err)) }, "runRecommendationRules: rule 1 failed");
  }

  // ── Rule 2: Film Gap ──────────────────────────────────────────────────────
  rulesEvaluated++;
  try {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
    const [recentFilm] = await db
      .select({ id: coachingEventsTable.id })
      .from(coachingEventsTable)
      .where(
        and(
          eq(coachingEventsTable.programId, programId),
          eq(coachingEventsTable.category, "film_session"),
          gte(coachingEventsTable.occurredAt, tenDaysAgo)
        )
      )
      .limit(1);

    if (!recentFilm) {
      await queueIfNew({
        programId,
        recommendationType: RECOMMENDATION_TYPES.FILM_GAP,
        priority: 2,
        headline: "No film session logged in the last 10 days.",
        detail: "Film work is one of the highest-leverage coaching activities. A 10-day gap usually means it's getting skipped under pressure.",
        suggestedAction: "Open Film Room and log today's session — even brief notes count.",
        expiresInDays: 5,
      });
    }
  } catch (err) {
    logger.warn({ err: redactSecrets(String(err)) }, "runRecommendationRules: rule 2 failed");
  }

  return { rulesEvaluated, recommendationsQueued };
}
