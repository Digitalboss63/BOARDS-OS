import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Fail fast at startup if DATABASE_URL is missing — better than a confusing
// connection error downstream. Railway sets this automatically when a Postgres
// service is linked.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database and link it to this service?"
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Railway Postgres requires SSL in production; allow both
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
