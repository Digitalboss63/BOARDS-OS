/**
 * coaching-events.ts
 *
 * GET  /api/coaching-events          — list events (filter by programId, category)
 * POST /api/coaching-events          — create a coaching event
 * GET  /api/coaching-events/:id      — get single event
 * GET  /api/coaching-events/timeline — program timeline (recent 50, sorted desc)
 */

import { Router, type IRouter } from "express";
import { db, coachingEventsTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";
import { z } from "zod";

const router: IRouter = Router();

const createEventSchema = z.object({
  programId:   z.number().int().positive(),
  category:    z.string().min(1),
  eventType:   z.string().min(1),
  title:       z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  actorId:     z.string().optional(),
  actorRole:   z.string().optional(),
  refTable:    z.string().optional(),
  refId:       z.number().int().positive().optional(),
  playerId:    z.number().int().positive().optional(),
  metadata:    z.record(z.unknown()).optional(),
  importance:  z.number().int().min(1).max(5).optional(),
  occurredAt:  z.string().datetime().optional(),
});

router.get("/coaching-events/timeline", async (req, res): Promise<void> => {
  const programId = parseInt(req.query["programId"] as string ?? "0");
  if (!programId) {
    res.status(400).json({ error: "programId is required." });
    return;
  }
  try {
    const events = await db
      .select()
      .from(coachingEventsTable)
      .where(eq(coachingEventsTable.programId, programId))
      .orderBy(desc(coachingEventsTable.occurredAt))
      .limit(50);
    res.json(events);
  } catch (err) {
    logger.error({ err }, "GET /coaching-events/timeline failed");
    res.status(500).json({ error: "Failed to fetch timeline." });
  }
});

router.get("/coaching-events", async (req, res): Promise<void> => {
  const programId = parseInt(req.query["programId"] as string ?? "0");
  const category = req.query["category"] as string | undefined;

  if (!programId) {
    res.status(400).json({ error: "programId is required." });
    return;
  }
  try {
    const conditions = [eq(coachingEventsTable.programId, programId)];
    if (category) conditions.push(eq(coachingEventsTable.category, category));

    const events = await db
      .select()
      .from(coachingEventsTable)
      .where(and(...conditions))
      .orderBy(desc(coachingEventsTable.occurredAt))
      .limit(100);
    res.json(events);
  } catch (err) {
    logger.error({ err }, "GET /coaching-events failed");
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

router.post("/coaching-events", async (req, res): Promise<void> => {
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  try {
    const data = {
      ...parsed.data,
      occurredAt: parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date(),
      metadata: parsed.data.metadata ?? null,
    };
    const [event] = await db.insert(coachingEventsTable).values(data).returning();
    res.status(201).json(event);
  } catch (err) {
    logger.error({ err }, "POST /coaching-events failed");
    res.status(500).json({ error: "Failed to create event." });
  }
});

router.get("/coaching-events/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id." }); return; }
  try {
    const [event] = await db
      .select()
      .from(coachingEventsTable)
      .where(eq(coachingEventsTable.id, id))
      .limit(1);
    if (!event) { res.status(404).json({ error: "Event not found." }); return; }
    res.json(event);
  } catch (err) {
    logger.error({ err }, "GET /coaching-events/:id failed");
    res.status(500).json({ error: "Failed to fetch event." });
  }
});

export default router;
