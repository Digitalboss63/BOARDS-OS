import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, practicesTable } from "@workspace/db";
import {
  ListPracticesResponse,
  CreatePracticeBody,
  GetPracticeParams,
  GetPracticeResponse,
  UpdatePracticeParams,
  UpdatePracticeBody,
  UpdatePracticeResponse,
  DeletePracticeParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";

const router: IRouter = Router();

function serializePractice(p: typeof practicesTable.$inferSelect) {
  return {
    ...p,
    scheduledAt: p.scheduledAt.toISOString(),
    createdAt: p.createdAt.toISOString(),
  };
}

router.get("/practices", async (_req, res): Promise<void> => {
  const practices = await db.select().from(practicesTable).orderBy(practicesTable.scheduledAt);
  res.json(ListPracticesResponse.parse(practices.map(serializePractice)));
});

router.post("/practices", async (req, res): Promise<void> => {
  const parsed = CreatePracticeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  const data = {
    ...parsed.data,
    scheduledAt: new Date(parsed.data.scheduledAt),
    status: parsed.data.status ?? "scheduled",
  };
  const [practice] = await db.insert(practicesTable).values(data).returning();
  res.status(201).json(GetPracticeResponse.parse(serializePractice(practice)));
});

router.get("/practices/:id", async (req, res): Promise<void> => {
  const params = GetPracticeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const [practice] = await db.select().from(practicesTable).where(eq(practicesTable.id, params.data.id));
  if (!practice) {
    res.status(404).json({ error: "Practice not found." });
    return;
  }
  res.json(GetPracticeResponse.parse(serializePractice(practice)));
});

router.patch("/practices/:id", async (req, res): Promise<void> => {
  const params = UpdatePracticeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const parsed = UpdatePracticeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) {
    updateData.scheduledAt = new Date(parsed.data.scheduledAt);
  }
  const [practice] = await db.update(practicesTable).set(updateData).where(eq(practicesTable.id, params.data.id)).returning();
  if (!practice) {
    res.status(404).json({ error: "Practice not found." });
    return;
  }
  res.json(UpdatePracticeResponse.parse(serializePractice(practice)));
});

router.delete("/practices/:id", async (req, res): Promise<void> => {
  const params = DeletePracticeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const [practice] = await db.delete(practicesTable).where(eq(practicesTable.id, params.data.id)).returning();
  if (!practice) {
    res.status(404).json({ error: "Practice not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;
