/**
 * staff-notes.ts
 *
 * GET    /api/staff-notes           — list notes (filter by programId, targetType, targetId)
 * POST   /api/staff-notes           — create a note
 * PATCH  /api/staff-notes/:id       — update content or pin status
 * DELETE /api/staff-notes/:id       — delete a note
 */

import { Router, type IRouter } from "express";
import { db, staffNotesTable } from "@workspace/db";
import { desc, eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";
import { z } from "zod/v4";

const router: IRouter = Router();

const createNoteSchema = z.object({
  programId:   z.number().int().positive(),
  targetType:  z.string().min(1),
  targetId:    z.number().int().positive().optional(),
  content:     z.string().min(1).max(5000),
  authorId:    z.string().min(1),
  authorRole:  z.string().optional(),
  visibility:  z.enum(["private", "staff", "program"]).default("staff"),
  isPinned:    z.number().int().min(0).max(1).optional(),
  tag:         z.string().max(50).optional(),
});

const updateNoteSchema = z.object({
  content:  z.string().min(1).max(5000).optional(),
  isPinned: z.number().int().min(0).max(1).optional(),
  tag:      z.string().max(50).optional(),
});

router.get("/staff-notes", async (req, res): Promise<void> => {
  const programId   = parseInt(req.query["programId"] as string ?? "0");
  const targetType  = req.query["targetType"] as string | undefined;
  const targetId    = req.query["targetId"] ? parseInt(req.query["targetId"] as string) : undefined;

  if (!programId) {
    res.status(400).json({ error: "programId is required." });
    return;
  }
  try {
    const conditions: any[] = [eq(staffNotesTable.programId, programId)];
    if (targetType) conditions.push(eq(staffNotesTable.targetType, targetType));
    if (targetId)   conditions.push(eq(staffNotesTable.targetId, targetId));

    const notes = await db
      .select()
      .from(staffNotesTable)
      .where(and(...conditions))
      .orderBy(desc(staffNotesTable.isPinned), desc(staffNotesTable.createdAt))
      .limit(100);
    res.json(notes);
  } catch (err) {
    logger.error({ err }, "GET /staff-notes failed");
    res.status(500).json({ error: "Failed to fetch notes." });
  }
});

router.post("/staff-notes", async (req, res): Promise<void> => {
  const parsed = createNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  try {
    const [note] = await db
      .insert(staffNotesTable)
      .values({ ...parsed.data, isPinned: parsed.data.isPinned ?? 0 })
      .returning();
    res.status(201).json(note);
  } catch (err) {
    logger.error({ err }, "POST /staff-notes failed");
    res.status(500).json({ error: "Failed to create note." });
  }
});

router.patch("/staff-notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id." }); return; }

  const parsed = updateNoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  try {
    const [note] = await db
      .update(staffNotesTable)
      .set(parsed.data)
      .where(eq(staffNotesTable.id, id))
      .returning();
    if (!note) { res.status(404).json({ error: "Note not found." }); return; }
    res.json(note);
  } catch (err) {
    logger.error({ err }, "PATCH /staff-notes/:id failed");
    res.status(500).json({ error: "Failed to update note." });
  }
});

router.delete("/staff-notes/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params["id"] ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id." }); return; }
  try {
    const [note] = await db
      .delete(staffNotesTable)
      .where(eq(staffNotesTable.id, id))
      .returning();
    if (!note) { res.status(404).json({ error: "Note not found." }); return; }
    res.sendStatus(204);
  } catch (err) {
    logger.error({ err }, "DELETE /staff-notes/:id failed");
    res.status(500).json({ error: "Failed to delete note." });
  }
});

export default router;
