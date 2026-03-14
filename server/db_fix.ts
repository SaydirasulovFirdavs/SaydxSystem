import { db } from "./db";
import { sql } from "drizzle-orm";

async function checkAndFixSchema() {
  console.log("Checking database schema...");
  try {
    // Check if columns exist
    const checkResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'invoices' AND column_name IN ('vat_rate', 'discount_rate');
    `);
    
    console.log("Existing columns in DB:", JSON.stringify(checkResult.rows));

    if (checkResult.rows.length < 2) {
      console.log("Adding missing columns...");
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS vat_rate NUMERIC DEFAULT '0' NOT NULL`);
      await db.execute(sql`ALTER TABLE invoices ADD COLUMN IF NOT EXISTS discount_rate NUMERIC DEFAULT '0' NOT NULL`);
      console.log("Columns added successfully!");
    } else {
      console.log("All columns already exist.");
    }

  } catch (err) {
    console.error("Database operation failed:", err);
  }
}

// Exporting a function to be called from a route for execution in production
export { checkAndFixSchema };
