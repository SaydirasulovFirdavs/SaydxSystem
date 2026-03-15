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

    // Check for contracts table columns
    const checkContractsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contracts' AND column_name IN (
        'verification_token', 'work_method', 'advance_payment', 
        'remaining_amount', 'contract_type', 'technical_assignment_url',
        'assigned_employee_id', 'payment_type', 'pdf_url', 'title'
      );
    `);

    const existingContractColumns = checkContractsResult.rows.map((r: any) => r.column_name);
    console.log("Existing columns in 'contracts':", JSON.stringify(existingContractColumns));

    const contractUpdates = [
      { name: "verification_token", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS verification_token TEXT` },
      { name: "work_method", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS work_method TEXT DEFAULT 'offline'` },
      { name: "advance_payment", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS advance_payment NUMERIC DEFAULT '0'` },
      { name: "remaining_amount", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT '0'` },
      { name: "contract_type", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type TEXT` },
      { name: "technical_assignment_url", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS technical_assignment_url TEXT` },
      { name: "assigned_employee_id", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS assigned_employee_id VARCHAR REFERENCES users(id)` },
      { name: "payment_type", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_type TEXT` },
      { name: "pdf_url", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS pdf_url TEXT` },
      { name: "title", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS title TEXT` },
      { name: "client_address", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_address TEXT` },
      { name: "client_phone", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_phone TEXT` },
      { name: "client_bank_name", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_bank_name TEXT` },
      { name: "client_mfo", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_mfo TEXT` },
      { name: "client_inn", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_inn TEXT` },
      { name: "client_account_number", sql: sql`ALTER TABLE contracts ADD COLUMN IF NOT EXISTS client_account_number TEXT` },
    ];

    for (const update of contractUpdates) {
      if (!existingContractColumns.includes(update.name)) {
        console.log(`Adding missing column '${update.name}' to 'contracts'...`);
        await db.execute(update.sql);
        console.log(`Column '${update.name}' added successfully!`);
      }
    }

    // Explicitly make 'title' nullable to resolve existing constraints
    console.log("Ensuring 'title' column in 'contracts' is nullable...");
    await db.execute(sql`ALTER TABLE contracts ALTER COLUMN title DROP NOT NULL`);
    console.log("'title' column adjusted.");
    
    // Check for finance_settings table columns
    const checkFinanceSettingsResult = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'finance_settings' AND column_name = 'use_automatic_rate';
    `);

    if (checkFinanceSettingsResult.rows.length === 0) {
      console.log("Adding missing column 'use_automatic_rate' to 'finance_settings'...");
      await db.execute(sql`ALTER TABLE finance_settings ADD COLUMN IF NOT EXISTS use_automatic_rate BOOLEAN DEFAULT TRUE NOT NULL`);
      console.log("Column 'use_automatic_rate' added successfully!");
    }

  } catch (err) {
    console.error("Database operation failed:", err);
  }
}

// Exporting a function to be called from a route for execution in production
export { checkAndFixSchema };
