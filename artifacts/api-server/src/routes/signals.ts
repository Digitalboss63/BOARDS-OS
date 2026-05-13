/**
 * signals.ts
 *
 * POST /api/signals              — record a player signal
 * GET  /api/signals/:playerId    — get signals for a player
 * GET  /api/recommendations      — get pending recommendations for a program
 * PATCH /api/recommendations/:id — acknowledge or dismiss a recommendation
 * POST /api/system/run-rules     — trigger recommendation rule evaluation (admin)
 */

import { Router, type IRouter } from "express";
import { db, playerSignalsTable, recommendationQueueTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";
import { recordSignal, runRecommendationRules } from "../lib/signal-processor";
import { requireAdmin } from "../lib/program-context";
import { z } from "zod/v4";

const router: IRouter = Router();

const signalSchema = z.object({
  programId:   z.number().int().positive(),
  playerId:    z.number().int().positive(),
  signalType:  z.string().min(1),
  value:       z.number(),
  source:      z.string().optional(),
  actorId:     z.string().optional(),
  context:     z.record(z.unknown()).optional(),
  occurredAt:  z.string().datetime().optional(),
});

// ─── Signals ──────────────────────────────────────────────────────────────────

router.post("/signals", async (req, res): Promise<void> => {
  const parsed = signalSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  try {
    await recordSignal({
      ...parsed.data,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
    });
    res.status(201).json({ ok: true });
  } catch (err) {
    logger.error({ err }, "POST /signals failed");
    res.status(500).json({ error: "Failed to record signal." });
  }
});

router.get("/signals/:playerId", async (req, res): Promise<void> => {
  const playerId = parseInt(req.params["playerId"] ?? "0");
  const programId = parseInt(req.query["programId"] as string ?? "0");
  if (!playerId || !programId) {
    res.status(400).json({ error: "playerId and programId are required." });
    return;
  }
  try {
    const signals = await db
      .select()
      .from(playerSignalsTable)
      .where(
        and(
          eq(playerSignalsTable.playerId, playerId),
          eq(playerSignalsTable.programId, programId)
        )
      )
      .orderBy(desc(playerSignalsTable.occurredAt))
      .limit(100);
    res.json(signals);
  } catch (err) {
    logger.error({ err }, "GET /signals/:playerId failed");
    res.status(500).json({ error: "Failed to fetch signals." });
  }
});

// ─── Recommendations ──────────────────────────────────────────────────────────

router.get("/recommendations", async (req, res): Promise<void> => {
  const programId = parseInt(req.query["programId"] as string ?? "0");
  if (!programId) {
    res.status(400).json({ error: "programId is required." });
    return;
  }
  try {
    const recs = await db
      .select()
      .from(recommendationQueueTable)
      .where(
        and(
          eq(recommendationQueueTable.programId, programId),
          eq(recommendationQueueTable.status, "pending")
        )
      )
      .orderBy(desc(recommendationQueueTable.priority), desc(recommendationQueueTable.createdAt))
      .limit(20);
    res.json(recs);
  } catch (err) {
    logger.error({ err }, "GET /recommendations failed");
    res.status(500).json({ error: "Failed to fetch recommendations." });
  }
});

router.patch("/recommendations/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id." }); return; }

  const actionSchema = z.object({
    action:   z.enum(["acknowledged", "dismissed", "acted_upon"]),
    actorId:  z.string().optional(),
  });
  const parsed = actionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  try {
    const [updated] = await db
      .update(recommendationQueueTable)
      .set({
        status: parsed.data.action,
        acknowledgedAt: new Date(),
        acknowledgedBy: parsed.data.actorId ?? "unknown",
      })
      .where(eq(recommendationQueueTable.id, id))
      .returning();
    if (!updated) { res.status(404).json({ error: "Recommendation not found." }); return; }
    res.json(updated);
  } catch (err) {
    logger.error({ err }, "PATCH /recommendations/:id failed");
    res.status(500).json({ error: "Failed to update recommendation." });
  }
});

// ─── Rule Runner (admin) ──────────────────────────────────────────────────────

router.post("/system/run-rules", requireAdmin(), async (req, res): Promise<void> => {
  const programId = parseInt(req.body?.programId ?? "0");
  if (!programId) {
    res.status(400).json({ error: "programId is required." });
    return;
  }
  try {
    const result = await runRecommendationRules(programId);
    res.json({ ok: true, ...result });
  } catch (err) {
    logger.error({ err }, "POST /system/run-rules failed");
    res.status(500).json({ error: "Rule evaluation failed." });
  }
});

export default router;
