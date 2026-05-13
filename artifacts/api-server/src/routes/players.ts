import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, playersTable } from "@workspace/db";
import {
  ListPlayersResponse,
  CreatePlayerBody,
  GetPlayerParams,
  GetPlayerResponse,
  UpdatePlayerParams,
  UpdatePlayerBody,
  UpdatePlayerResponse,
  DeletePlayerParams,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";

const router: IRouter = Router();

function serializePlayer(p: typeof playersTable.$inferSelect) {
  return { ...p, createdAt: p.createdAt.toISOString() };
}

router.get("/players", async (_req, res): Promise<void> => {
  const players = await db.select().from(playersTable).orderBy(playersTable.lastName);
  res.json(ListPlayersResponse.parse(players.map(serializePlayer)));
});

router.post("/players", async (req, res): Promise<void> => {
  const parsed = CreatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  const data = { ...parsed.data, status: parsed.data.status ?? "active" };
  const [player] = await db.insert(playersTable).values(data).returning();
  res.status(201).json(GetPlayerResponse.parse(serializePlayer(player)));
});

router.get("/players/:id", async (req, res): Promise<void> => {
  const params = GetPlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const [player] = await db.select().from(playersTable).where(eq(playersTable.id, params.data.id));
  if (!player) {
    res.status(404).json({ error: "Player not found." });
    return;
  }
  res.json(GetPlayerResponse.parse(serializePlayer(player)));
});

router.patch("/players/:id", async (req, res): Promise<void> => {
  const params = UpdatePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const parsed = UpdatePlayerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: safeValidationError(parsed.error) });
    return;
  }
  const [player] = await db.update(playersTable).set(parsed.data).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) {
    res.status(404).json({ error: "Player not found." });
    return;
  }
  res.json(UpdatePlayerResponse.parse(serializePlayer(player)));
});

router.delete("/players/:id", async (req, res): Promise<void> => {
  const params = DeletePlayerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: safeValidationError(params.error) });
    return;
  }
  const [player] = await db.delete(playersTable).where(eq(playersTable.id, params.data.id)).returning();
  if (!player) {
    res.status(404).json({ error: "Player not found." });
    return;
  }
  res.sendStatus(204);
});

export default router;
