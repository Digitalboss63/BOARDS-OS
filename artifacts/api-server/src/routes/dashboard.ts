import { Router, type IRouter } from "express";
import { db, teamsTable, playersTable, practicesTable, gamesTable, scoutingReportsTable } from "@workspace/db";
import { gte, desc, sql } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetUpcomingEventsResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/dashboard/summary", async (_req, res): Promise<void> => {
  try {
    const now = new Date();

    const [[totalPlayers], [totalTeams], [upcomingPractices], [upcomingGames], [scoutingReports]] =
      await Promise.all([
        db.select({ count: sql<number>`count(*)::int` }).from(playersTable),
        db.select({ count: sql<number>`count(*)::int` }).from(teamsTable),
        db.select({ count: sql<number>`count(*)::int` }).from(practicesTable).where(gte(practicesTable.scheduledAt, now)),
        db.select({ count: sql<number>`count(*)::int` }).from(gamesTable).where(gte(gamesTable.scheduledAt, now)),
        db.select({ count: sql<number>`count(*)::int` }).from(scoutingReportsTable),
      ]);

    const allGames = await db.select({ result: gamesTable.result }).from(gamesTable);
    const totalWins   = allGames.filter((g) => g.result === "win").length;
    const totalLosses = allGames.filter((g) => g.result === "loss").length;

    const summary = {
      totalPlayers:     totalPlayers?.count  ?? 0,
      totalTeams:       totalTeams?.count    ?? 0,
      upcomingPractices: upcomingPractices?.count ?? 0,
      upcomingGames:    upcomingGames?.count ?? 0,
      totalWins,
      totalLosses,
      scoutingReports:  scoutingReports?.count ?? 0,
    };

    res.json(GetDashboardSummaryResponse.parse(summary));
  } catch (err) {
    logger.error({ err }, "GET /dashboard/summary failed");
    res.status(500).json({ error: "Failed to load dashboard summary." });
  }
});

router.get("/dashboard/upcoming", async (_req, res): Promise<void> => {
  try {
    const now = new Date();

    const [upcomingGames, upcomingPractices, teams] = await Promise.all([
      db.select().from(gamesTable).where(gte(gamesTable.scheduledAt, now)).orderBy(gamesTable.scheduledAt).limit(5),
      db.select().from(practicesTable).where(gte(practicesTable.scheduledAt, now)).orderBy(practicesTable.scheduledAt).limit(5),
      db.select().from(teamsTable),
    ]);

    const teamMap = new Map(teams.map((t) => [t.id, t.name]));

    const gameEvents = upcomingGames.map((g) => ({
      id: g.id,
      type: "game",
      title: `vs ${g.opponent}`,
      scheduledAt: g.scheduledAt.toISOString(),
      teamName: teamMap.get(g.teamId) ?? "Unknown Team",
      location: g.location,
    }));

    const practiceEvents = upcomingPractices.map((p) => ({
      id: p.id,
      type: "practice",
      title: p.focus,
      scheduledAt: p.scheduledAt.toISOString(),
      teamName: teamMap.get(p.teamId) ?? "Unknown Team",
      location: null,
    }));

    const combined = [...gameEvents, ...practiceEvents]
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
      .slice(0, 8);

    res.json(GetUpcomingEventsResponse.parse(combined));
  } catch (err) {
    logger.error({ err }, "GET /dashboard/upcoming failed");
    res.status(500).json({ error: "Failed to load upcoming events." });
  }
});

router.get("/dashboard/recent-activity", async (_req, res): Promise<void> => {
  try {
    const [recentGames, recentPlayers, recentPractices, recentScouting] = await Promise.all([
      db.select().from(gamesTable).orderBy(desc(gamesTable.createdAt)).limit(3),
      db.select().from(playersTable).orderBy(desc(playersTable.createdAt)).limit(3),
      db.select().from(practicesTable).orderBy(desc(practicesTable.createdAt)).limit(2),
      db.select().from(scoutingReportsTable).orderBy(desc(scoutingReportsTable.createdAt)).limit(2),
    ]);

    let activityCounter = 1;
    const activity = [
      ...recentGames.map((g) => ({
        id: activityCounter++,
        type: "game",
        description: `Game vs ${g.opponent} ${g.result !== "upcoming" ? `— ${g.result}` : "scheduled"}`,
        createdAt: g.createdAt.toISOString(),
      })),
      ...recentPlayers.map((p) => ({
        id: activityCounter++,
        type: "player",
        description: `${p.firstName} ${p.lastName} added to roster`,
        createdAt: p.createdAt.toISOString(),
      })),
      ...recentPractices.map((p) => ({
        id: activityCounter++,
        type: "practice",
        description: `Practice planned: ${p.focus}`,
        createdAt: p.createdAt.toISOString(),
      })),
      ...recentScouting.map((s) => ({
        id: activityCounter++,
        type: "scouting",
        description: `Scouting report: ${s.opponentName}`,
        createdAt: s.createdAt.toISOString(),
      })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 8);

    res.json(GetRecentActivityResponse.parse(activity));
  } catch (err) {
    logger.error({ err }, "GET /dashboard/recent-activity failed");
    res.status(500).json({ error: "Failed to load recent activity." });
  }
});

export default router;
