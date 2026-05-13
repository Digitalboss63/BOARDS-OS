import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, scoutingReportsTable } from "@workspace/db";
import {
  ListScoutingReportsResponse,
  CreateScoutingReportBody,
  GetScoutingReportParams,
  GetScoutingReportResponse,
  UpdateScoutingReportParams,
  UpdateScoutingReportBody,
  UpdateScoutingReportResponse,
  DeleteScoutingReportParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeReport(r: typeof scoutingReportsTable.$inferSelect) {
  return {
    ...r,
    gameDate: r.gameDate ? r.gameDate.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  };
}

router.get("/scouting-reports", async (req, res): Promise<void> => {
  const reports = await db.select().from(scoutingReportsTable).orderBy(scoutingReportsTable.createdAt);
  res.json(ListScoutingReportsResponse.parse(reports.map(serializeReport)));
});

router.post("/scouting-reports", async (req, res): Promise<void> => {
  const parsed = CreateScoutingReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const data = {
    ...parsed.data,
    gameDate: parsed.data.gameDate ? new Date(parsed.data.gameDate) : null,
  };
  const [report] = await db.insert(scoutingReportsTable).values(data).returning();
  res.status(201).json(GetScoutingReportResponse.parse(serializeReport(report)));
});

router.get("/scouting-reports/:id", async (req, res): Promise<void> => {
  const params = GetScoutingReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [report] = await db.select().from(scoutingReportsTable).where(eq(scoutingReportsTable.id, params.data.id));
  if (!report) {
    res.status(404).json({ error: "Scouting report not found" });
    return;
  }
  res.json(GetScoutingReportResponse.parse(serializeReport(report)));
});

router.patch("/scouting-reports/:id", async (req, res): Promise<void> => {
  const params = UpdateScoutingReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateScoutingReportBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.gameDate) {
    updateData.gameDate = new Date(parsed.data.gameDate);
  }
  const [report] = await db.update(scoutingReportsTable).set(updateData).where(eq(scoutingReportsTable.id, params.data.id)).returning();
  if (!report) {
    res.status(404).json({ error: "Scouting report not found" });
    return;
  }
  res.json(UpdateScoutingReportResponse.parse(serializeReport(report)));
});

router.delete("/scouting-reports/:id", async (req, res): Promise<void> => {
  const params = DeleteScoutingReportParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [report] = await db.delete(scoutingReportsTable).where(eq(scoutingReportsTable.id, params.data.id)).returning();
  if (!report) {
    res.status(404).json({ error: "Scouting report not found" });
    return;
  }
  res.sendStatus(204);
});

export default router;
