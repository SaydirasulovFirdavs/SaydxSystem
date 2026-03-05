import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || typeof url !== "string" || url.trim() === "") {
    const msg = "DATABASE_URL must be set. Did you forget to provision a database?";
    console.error("[db]", msg);
    throw new Error(msg);
  }
  return url.trim();
}

const connectionString = getDatabaseUrl();

/** Global Pool instance — reused across Vercel serverless invocations to avoid connection explosion. */
export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 2,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 10_000,
});

pool.on("error", (err: Error) => {
  console.error("[db] Unexpected pool error:", err.message);
});

pool.on("connect", () => {
  if (process.env.NODE_ENV === "development") {
    console.log("[db] Client connected to PostgreSQL");
  }
});

export const db = drizzle(pool, { schema });
