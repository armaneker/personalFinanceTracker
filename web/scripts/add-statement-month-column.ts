/**
 * Migration script to add statement_month column to import_runs table
 * Run with: npx tsx scripts/add-statement-month-column.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  if (!dbUrl) {
    throw new Error("TURSO_DATABASE_URL not set");
  }

  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  console.log("Adding statement_month column to import_runs table...");

  try {
    await client.execute(`
      ALTER TABLE import_runs ADD COLUMN statement_month TEXT
    `);
    console.log("✅ Column statement_month added successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes("duplicate column")) {
      console.log("ℹ️  Column statement_month already exists, skipping.");
    } else {
      throw error;
    }
  }

  // Verify the column was added
  const result = await client.execute("PRAGMA table_info(import_runs)");
  console.log("\nCurrent import_runs schema:");
  for (const row of result.rows) {
    console.log(`  - ${row.name}: ${row.type}`);
  }

  console.log("\nMigration complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
