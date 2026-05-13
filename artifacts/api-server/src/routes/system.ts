/**
 * system.ts — Admin system routes
 *
 * All routes here require X-Admin-Token header.
 * These routes power the future Admin Diagnostics dashboard.
 *
 * POST /api/system/snapshot    — capture current platform state
 * GET  /api/system/snapshots   — list recent snapshots
 * GET  /api/system/events      — recent telemetry events
 * POST /api/system/events      — log an event manually (internal use)
 * GET  /api/system/diagnose    — diff current state vs last snapshot + match fix records
 * GET  /api/system/fix-records — list known fix records
 * GET  /api/system/rules       — list detection rules
 */

import { Router, type IRouter } from "express";
import { db, systemSnapshotsTable, systemEventsTable, fixRecordsTable, detectionRulesTable } from "@workspace/db";
import { programsTable, teamsTable, playersTable, practicesTable, gamesTable, scoutingReportsTable } from "@workspace/db";
import { desc, eq, and, gte } from "drizzle-orm";
import { requireAdmin } from "../lib/program-context";
import { logger } from "../lib/logger";
import { safeValidationError } from "../lib/sanitize";
import { count } from "drizzle-orm";

const router: IRouter = Router();

// Apply admin auth to all system routes
router.use(requireAdmin());

// ─── Snapshot ────────────────────────────────────────────────────────────────

router.post("/system/snapshot", async (req, res): Promise<void> => {
  try {
    // Gather row counts for all major tables
    const [[players], [teams], [practices], [games], [scouting], [programs]] = await Promise.all([
      db.select({ count: count() }).from(playersTable),
      db.select({ count: count() }).from(teamsTable),
      db.select({ count: count() }).from(practicesTable),
      db.select({ count: count() }).from(gamesTable),
      db.select({ count: count() }).from(scoutingReportsTable),
      db.select({ count: count() }).from(programsTable),
    ]);

    const snapshot = {
      capturedAt: new Date().toISOString(),
      rowCounts: {
        players: players?.count ?? 0,
        teams: teams?.count ?? 0,
        practices: practices?.count ?? 0,
        games: games?.count ?? 0,
        scoutingReports: scouting?.count ?? 0,
        programs: programs?.count ?? 0,
      },
      nodeVersion: process.version,
      uptime: Math.round(process.uptime()),
    };

    const label = (req.body?.label as string | undefined) ?? null;
    const triggeredBy = (req.body?.triggeredBy as string | undefined) ?? "admin";

    const [saved] = await db
      .insert(systemSnapshotsTable)
      .values({ snapshot, label, triggeredBy })
      .returning();

    // Log the event
    await db.insert(systemEventsTable).values({
      eventType: "snapshot_taken",
      severity: "info",
      message: `Snapshot taken${label ? `: ${label}` : ""}`,
      requestId: (req as any).id,
      route: "/api/system/snapshot",
    });

    res.status(201).json({ id: saved.id, snapshot, label });
  } catch (err) {
    logger.error({ err }, "POST /system/snapshot failed");
    res.status(500).json({ error: "Failed to capture snapshot." });
  }
});

router.get("/system/snapshots", async (_req, res): Promise<void> => {
  try {
    const snapshots = await db
      .select()
      .from(systemSnapshotsTable)
      .orderBy(desc(systemSnapshotsTable.createdAt))
      .limit(50);
    res.json(snapshots);
  } catch (err) {
    logger.error({ err }, "GET /system/snapshots failed");
    res.status(500).json({ error: "Failed to fetch snapshots." });
  }
});

// ─── Events ───────────────────────────────────────────────────────────────────

router.get("/system/events", async (req, res): Promise<void> => {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string ?? "100"), 500);
    const events = await db
      .select()
      .from(systemEventsTable)
      .orderBy(desc(systemEventsTable.createdAt))
      .limit(limit);
    res.json(events);
  } catch (err) {
    logger.error({ err }, "GET /system/events failed");
    res.status(500).json({ error: "Failed to fetch events." });
  }
});

router.post("/system/events", async (req, res): Promise<void> => {
  try {
    const { eventType, severity, message, context, route, durationMs, programId } = req.body;
    if (!eventType || !message) {
      res.status(400).json({ error: "eventType and message are required." });
      return;
    }
    const [saved] = await db
      .insert(systemEventsTable)
      .values({
        eventType,
        severity: severity ?? "info",
        message: String(message).slice(0, 500), // cap length
        context: context ?? null,
        requestId: (req as any).id,
        route: route ?? null,
        durationMs: durationMs ?? null,
        programId: programId ?? null,
      })
      .returning();
    res.status(201).json({ id: saved.id });
  } catch (err) {
    logger.error({ err }, "POST /system/events failed");
    res.status(500).json({ error: "Failed to log event." });
  }
});

// ─── Diagnose ─────────────────────────────────────────────────────────────────

router.get("/system/diagnose", async (_req, res): Promise<void> => {
  try {
    // Get last snapshot
    const [lastSnapshot] = await db
      .select()
      .from(systemSnapshotsTable)
      .orderBy(desc(systemSnapshotsTable.createdAt))
      .limit(1);

    // Get recent error events (last 24h)
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentErrors = await db
      .select()
      .from(systemEventsTable)
      .where(gte(systemEventsTable.createdAt, since))
      .orderBy(desc(systemEventsTable.createdAt))
      .limit(20);

    // Get active detection rules
    const rules = await db
      .select()
      .from(detectionRulesTable)
      .where(eq(detectionRulesTable.isActive, 1));

    // Get fix records for cross-referencing
    const fixes = await db.select().from(fixRecordsTable);

    // Build diagnosis report
    const errorEvents = recentErrors.filter(
      (e) => e.severity === "error" || e.severity === "critical"
    );

    // Match error event types against fix records
    const recommendations = errorEvents
      .map((event) => {
        const fix = fixes.find((f) => f.linkedEventType === event.eventType);
        return fix
          ? { event: event.message, fix: fix.title, resolution: fix.resolution }
          : null;
      })
      .filter(Boolean);

    res.json({
      lastSnapshot: lastSnapshot ?? null,
      recentErrorCount: errorEvents.length,
      activeRules: rules.length,
      recommendations,
      recentErrors: errorEvents.slice(0, 5),
    });
  } catch (err) {
    logger.error({ err }, "GET /system/diagnose failed");
    res.status(500).json({ error: "Diagnosis failed." });
  }
});

// ─── Fix Records ──────────────────────────────────────────────────────────────

router.get("/system/fix-records", async (_req, res): Promise<void> => {
  try {
    const records = await db
      .select()
      .from(fixRecordsTable)
      .orderBy(fixRecordsTable.createdAt);
    res.json(records);
  } catch (err) {
    logger.error({ err }, "GET /system/fix-records failed");
    res.status(500).json({ error: "Failed to fetch fix records." });
  }
});

router.post("/system/fix-records", async (req, res): Promise<void> => {
  try {
    const { slug, title, symptom, rootCause, resolution, tags, linkedEventType } = req.body;
    if (!slug || !title || !symptom || !rootCause || !resolution) {
      res.status(400).json({ error: "slug, title, symptom, rootCause, and resolution are required." });
      return;
    }
    const [saved] = await db
      .insert(fixRecordsTable)
      .values({ slug, title, symptom, rootCause, resolution, tags: tags ?? null, linkedEventType: linkedEventType ?? null })
      .returning();
    res.status(201).json(saved);
  } catch (err) {
    logger.error({ err }, "POST /system/fix-records failed");
    res.status(500).json({ error: "Failed to create fix record." });
  }
});

// ─── Detection Rules ──────────────────────────────────────────────────────────

router.get("/system/rules", async (_req, res): Promise<void> => {
  try {
    const rules = await db
      .select()
      .from(detectionRulesTable)
      .orderBy(detectionRulesTable.createdAt);
    res.json(rules);
  } catch (err) {
    logger.error({ err }, "GET /system/rules failed");
    res.status(500).json({ error: "Failed to fetch rules." });
  }
});

export default router;
