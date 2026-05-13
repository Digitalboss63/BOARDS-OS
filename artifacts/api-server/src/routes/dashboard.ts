import { Router, type IRouter } from "express";
import { db, teamsTable, playersTable, practicesTable, gamesTable, scoutingReportsTable } from "@workspace/db";
import { gte, sql } from "drizzle-orm";
import {
  GetDashboardSummaryResponse,
  GetUpcomingEventsResponse,
  GetRecentActivityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/summary", async (req, res): Promise<void> => {
  const now = new Date();

  const [totalPlayers] = await db.select({ count: sql<number>`count(*)::int` }).from(playersTable);
  const [totalTeams] = await db.select({ count: sql<number>`count(*)::int` }).from(teamsTable);
  const [upcomingPractices] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(practicesTable)
    .where(gte(practicesTable.scheduledAt, now));
  const [upcomingGames] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(gamesTable)
    .where(gte(gamesTable.scheduledAt, now));
  const [scoutingReports] = await db.select({ count: sql<number>`count(*)::int` }).from(scoutingReportsTable);

  const allGames = await db.select({ result: gamesTable.result }).from(gamesTable);
  const totalWins = allGames.filter(g => g.result === "win").length;
  const totalLosses = allGames.filter(g => g.result === "loss").length;

  const summary = {
    totalPlayers: totalPlayers?.count ?? 0,
    totalTeams: totalTeams?.count ?? 0,
    upcomingPractices: upcomingPractices?.count ?? 0,
    upcomingGames: upcomingGames?.count ?? 0,
    totalWins,
    totalLosses,
    scoutingReports: scoutingReports?.count ?? 0,
  };

  res.json(GetDashboardSummaryResponse.parse(summary));
});

router.get("/dashboard/upcoming", async (req, res): Promise<void> => {
  const now = new Date();

  const upcomingGames = await db
    .select()
    .from(gamesTable)
    .where(gte(gamesTable.scheduledAt, now))
    .orderBy(gamesTable.scheduledAt)
    .limit(5);

  const upcomingPractices = await db
    .select()
    .from(practicesTable)
    .where(gte(practicesTable.scheduledAt, now))
    .orderBy(practicesTable.scheduledAt)
    .limit(5);

  const teams = await db.select().from(teamsTable);
  const teamMap = new Map(teams.map(t => [t.id, t.name]));

  const gameEvents = upcomingGames.map(g => ({
    id: g.id,
    type: "game",
    title: `vs ${g.opponent}`,
    scheduledAt: g.scheduledAt.toISOString(),
    teamName: teamMap.get(g.teamId) ?? "Unknown Team",
    location: g.location,
  }));

  const practiceEvents = upcomingPractices.map(p => ({
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
});

router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const recentGames = await db
    .select()
    .from(gamesTable)
    .orderBy(sql`created_at DESC`)
    .limit(3);

  const recentPlayers = await db
    .select()
    .from(playersTable)
    .orderBy(sql`created_at DESC`)
    .limit(3);

  const recentPractices = await db
    .select()
    .from(practicesTable)
    .orderBy(sql`created_at DESC`)
    .limit(2);

  const recentScouting = await db
    .select()
    .from(scoutingReportsTable)
    .orderBy(sql`created_at DESC`)
    .limit(2);

  let activityCounter = 1;
  const activity = [
    ...recentGames.map(g => ({
      id: activityCounter++,
      type: "game",
      description: `Game vs ${g.opponent} ${g.result !== "upcoming" ? `— ${g.result}` : "scheduled"}`,
      createdAt: g.createdAt.toISOString(),
    })),
    ...recentPlayers.map(p => ({
      id: activityCounter++,
      type: "player",
      description: `${p.firstName} ${p.lastName} added to roster`,
      createdAt: p.createdAt.toISOString(),
    })),
    ...recentPractices.map(p => ({
      id: activityCounter++,
      type: "practice",
      description: `Practice planned: ${p.focus}`,
      createdAt: p.createdAt.toISOString(),
    })),
    ...recentScouting.map(s => ({
      id: activityCounter++,
      type: "scouting",
      description: `Scouting report created for ${s.opponentName}`,
      createdAt: s.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  res.json(GetRecentActivityResponse.parse(activity));
});

export default router;
