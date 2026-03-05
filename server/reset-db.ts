/**
 * Bazani to'liq tozalash — barcha jadvallarni bo'shatadi, ID lar 0 dan boshlanadi.
 * Ishga tushirish: npm run db:reset
 */
import "dotenv/config";
import { sql } from "drizzle-orm";
import { db } from "./db";

const TABLES = [
  "time_entries",
  "invoice_items",
  "messages",
  "conversations",
  "tasks",
  "transactions",
  "invoices",
  "projects",
  "clients",
  "companies",
  "invoice_settings",
  "finance_settings",
  "sessions",
  "users",
];

async function resetDb() {
  console.log("Bazani tozalash...");
  const list = TABLES.map((t) => `"${t}"`).join(", ");
  await db.execute(
    sql.raw(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
  );
  console.log("Baza tozalandi. Ma'lumotlar 0.");
}

resetDb().catch(console.error).finally(() => process.exit(0));
