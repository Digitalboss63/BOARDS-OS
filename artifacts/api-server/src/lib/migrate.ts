/**
 * migrate.ts — Inline schema bootstrap for Railway cold deploys.
 *
 * Runs CREATE TABLE IF NOT EXISTS for all tables on startup.
 * This is NOT a full migration system — it's a safe, idempotent
 * bootstrap that ensures the DB is ready to accept requests.
 *
 * Rules:
 * - All statements use IF NOT EXISTS — always safe to re-run
 * - Never DROP or ALTER existing tables (additive only)
 * - New columns are added by Phase via separate ALTER statements
 * - Failures are logged and rethrown — a broken DB means no startup
 *
 * Run order matters: tables with FKs must come after their parents.
 */

import { pool } from "@workspace/db";
import { logger } from "./logger";

const MIGRATIONS: Array<{ name: string; sql: string }> = [
  // ── Core basketball operations ──────────────────────────────────────────
  {
    name: "teams",
    sql: `
      CREATE TABLE IF NOT EXISTS teams (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        level TEXT NOT NULL DEFAULT 'Varsity',
        season TEXT NOT NULL,
        record TEXT NOT NULL DEFAULT '0-0',
        coach_name TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "players",
    sql: `
      CREATE TABLE IF NOT EXISTS players (
        id SERIAL PRIMARY KEY,
        first_name TEXT NOT NULL,
        last_name TEXT NOT NULL,
        position TEXT NOT NULL,
        jersey_number INTEGER NOT NULL,
        team_id INTEGER NOT NULL,
        height TEXT,
        weight INTEGER,
        graduation_year INTEGER,
        status TEXT NOT NULL DEFAULT 'active',
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "practices",
    sql: `
      CREATE TABLE IF NOT EXISTS practices (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        duration_minutes INTEGER NOT NULL DEFAULT 90,
        focus TEXT NOT NULL,
        drills TEXT,
        notes TEXT,
        status TEXT NOT NULL DEFAULT 'scheduled',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "games",
    sql: `
      CREATE TABLE IF NOT EXISTS games (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        opponent TEXT NOT NULL,
        scheduled_at TIMESTAMPTZ NOT NULL,
        location TEXT NOT NULL,
        is_home BOOLEAN NOT NULL DEFAULT TRUE,
        result TEXT NOT NULL DEFAULT 'upcoming',
        score_us INTEGER,
        score_them INTEGER,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "scouting_reports",
    sql: `
      CREATE TABLE IF NOT EXISTS scouting_reports (
        id SERIAL PRIMARY KEY,
        team_id INTEGER NOT NULL,
        opponent_name TEXT NOT NULL,
        game_date TIMESTAMPTZ,
        offensive_system TEXT,
        defensive_system TEXT,
        key_players TEXT,
        strengths TEXT,
        weaknesses TEXT,
        adjustments TEXT,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },

  // ── Multi-program architecture ──────────────────────────────────────────
  {
    name: "programs",
    sql: `
      CREATE TABLE IF NOT EXISTS programs (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        sport TEXT NOT NULL DEFAULT 'basketball',
        level TEXT NOT NULL DEFAULT 'high_school',
        city TEXT,
        state TEXT,
        country TEXT NOT NULL DEFAULT 'US',
        logo_url TEXT,
        primary_color TEXT,
        owner_id TEXT NOT NULL,
        plan TEXT NOT NULL DEFAULT 'free',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "program_users",
    sql: `
      CREATE TABLE IF NOT EXISTS program_users (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'coach',
        status TEXT NOT NULL DEFAULT 'active',
        invited_by TEXT,
        joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (program_id, user_id)
      )`,
  },
  {
    name: "invites",
    sql: `
      CREATE TABLE IF NOT EXISTS invites (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        token TEXT NOT NULL UNIQUE,
        email TEXT,
        role TEXT NOT NULL DEFAULT 'coach',
        status TEXT NOT NULL DEFAULT 'pending',
        invited_by TEXT NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        accepted_at TIMESTAMPTZ,
        accepted_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },

  // ── Self-heal / operational intelligence ───────────────────────────────
  {
    name: "system_snapshots",
    sql: `
      CREATE TABLE IF NOT EXISTS system_snapshots (
        id SERIAL PRIMARY KEY,
        program_id INTEGER,
        snapshot JSONB NOT NULL,
        label TEXT,
        triggered_by TEXT NOT NULL DEFAULT 'system',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "system_events",
    sql: `
      CREATE TABLE IF NOT EXISTS system_events (
        id SERIAL PRIMARY KEY,
        program_id INTEGER,
        event_type TEXT NOT NULL,
        severity TEXT NOT NULL DEFAULT 'info',
        message TEXT NOT NULL,
        context JSONB,
        request_id TEXT,
        route TEXT,
        duration_ms INTEGER,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "fix_records",
    sql: `
      CREATE TABLE IF NOT EXISTS fix_records (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        symptom TEXT NOT NULL,
        root_cause TEXT NOT NULL,
        resolution TEXT NOT NULL,
        tags JSONB,
        linked_event_type TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "detection_rules",
    sql: `
      CREATE TABLE IF NOT EXISTS detection_rules (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        condition JSONB NOT NULL,
        action JSONB NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        program_id INTEGER,
        cooldown_seconds INTEGER NOT NULL DEFAULT 300,
        last_triggered_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },

  // ── Coaching operational layer ──────────────────────────────────────────
  {
    name: "coaching_events",
    sql: `
      CREATE TABLE IF NOT EXISTS coaching_events (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        category TEXT NOT NULL,
        event_type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        actor_id TEXT NOT NULL DEFAULT 'system',
        actor_role TEXT,
        ref_table TEXT,
        ref_id INTEGER,
        player_id INTEGER,
        metadata JSONB,
        importance INTEGER NOT NULL DEFAULT 1,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "player_signals",
    sql: `
      CREATE TABLE IF NOT EXISTS player_signals (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
        signal_type TEXT NOT NULL,
        value REAL NOT NULL,
        source TEXT,
        actor_id TEXT NOT NULL DEFAULT 'system',
        context JSONB,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "recommendation_queue",
    sql: `
      CREATE TABLE IF NOT EXISTS recommendation_queue (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        player_id INTEGER,
        recommendation_type TEXT NOT NULL,
        priority INTEGER NOT NULL DEFAULT 3,
        headline TEXT NOT NULL,
        detail TEXT,
        suggested_action TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        generated_by TEXT NOT NULL DEFAULT 'system',
        source_signals JSONB,
        expires_at TIMESTAMPTZ,
        acknowledged_at TIMESTAMPTZ,
        acknowledged_by TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },
  {
    name: "staff_notes",
    sql: `
      CREATE TABLE IF NOT EXISTS staff_notes (
        id SERIAL PRIMARY KEY,
        program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
        target_type TEXT NOT NULL,
        target_id INTEGER,
        content TEXT NOT NULL,
        author_id TEXT NOT NULL,
        author_role TEXT,
        visibility TEXT NOT NULL DEFAULT 'staff',
        is_pinned INTEGER NOT NULL DEFAULT 0,
        tag TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )`,
  },

  // ── Seed: default program (Eastside Eagles = programId 1) ──────────────
  // INSERT ... WHERE NOT EXISTS prevents re-seeding on redeploy.
  {
    name: "seed_default_program",
    sql: `
      INSERT INTO programs (name, slug, sport, level, owner_id, plan)
      SELECT 'Eastside Eagles', 'eastside-eagles', 'basketball', 'high_school', 'admin', 'free'
      WHERE NOT EXISTS (
        SELECT 1 FROM programs WHERE slug = 'eastside-eagles'
      )`,
  },
];

export async function runMigrations(): Promise<void> {
  logger.info("Running DB migrations...");
  const client = await pool.connect();
  try {
    for (const migration of MIGRATIONS) {
      try {
        await client.query(migration.sql);
        logger.debug({ table: migration.name }, "Migration: OK");
      } catch (err) {
        logger.error({ err, migration: migration.name }, "Migration failed");
        throw err; // Fail fast — broken schema means no startup
      }
    }
    logger.info(`Migrations complete — ${MIGRATIONS.length} statements applied`);
  } finally {
    client.release();
  }
}
