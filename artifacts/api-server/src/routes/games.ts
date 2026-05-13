import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, gamesTable } from "@workspace/db";
import {
  ListGamesResponse,
  CreateGameBody,
  GetGameParams,
  GetGameResponse,
  UpdateGameParams,
  UpdateGameBody,
  UpdateGameResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeGame(g: typeof gamesTable.$inferSelect) {
  return {
    ...g,
    scheduledAt: g.scheduledAt.toISOString(),
    createdAt: g.createdAt.toISOString(),
  };
}

router.get("/games", async (req, res): Promise<void> => {
  const games = await db.select().from(gamesTable).orderBy(gamesTable.scheduledAt);
  res.json(ListGamesResponse.parse(games.map(serializeGame)));
});

router.post("/games", async (req, res): Promise<void> => {
  const parsed = CreateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = {
    ...parsed.data,
    scheduledAt: new Date(parsed.data.scheduledAt),
    result: parsed.data.result ?? "upcoming",
    isHome: parsed.data.isHome ?? true,
  };
  const [game] = await db.insert(gamesTable).values(data).returning();
  res.status(201).json(GetGameResponse.parse(serializeGame(game)));
});

router.get("/games/:id", async (req, res): Promise<void> => {
  const params = GetGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [game] = await db.select().from(gamesTable).where(eq(gamesTable.id, params.data.id));
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(GetGameResponse.parse(serializeGame(game)));
});

router.patch("/games/:id", async (req, res): Promise<void> => {
  const params = UpdateGameParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGameBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.scheduledAt) {
    updateData.scheduledAt = new Date(parsed.data.scheduledAt);
  }
  const [game] = await db.update(gamesTable).set(updateData).where(eq(gamesTable.id, params.data.id)).returning();
  if (!game) {
    res.status(404).json({ error: "Game not found" });
    return;
  }
  res.json(UpdateGameResponse.parse(serializeGame(game)));
});

export default router;
