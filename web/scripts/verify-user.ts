/**
 * Script to verify and fix user-related issues
 * Run with: npx tsx scripts/verify-user.ts
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

  console.log("=== Checking database state ===\n");

  // Check users
  console.log("Users:");
  const users = await client.execute("SELECT id, email, name FROM users");
  for (const user of users.rows) {
    console.log(`  - ${user.id}: ${user.email} (${user.name})`);
  }
  if (users.rows.length === 0) {
    console.log("  (no users found)");
  }

  // Check if default-user exists
  const defaultUser = users.rows.find(u => u.id === 'default-user');
  console.log(`\ndefault-user exists: ${defaultUser ? 'YES' : 'NO'}`);

  // Check cards
  console.log("\nCards:");
  const cards = await client.execute("SELECT id, user_id, name FROM cards");
  for (const card of cards.rows) {
    console.log(`  - ${card.id}: ${card.name} (user: ${card.user_id})`);
  }
  if (cards.rows.length === 0) {
    console.log("  (no cards found)");
  }

  // Check import_runs
  console.log("\nImport Runs:");
  const runs = await client.execute("SELECT run_id, user_id, card_id, status FROM import_runs LIMIT 5");
  for (const run of runs.rows) {
    console.log(`  - ${run.run_id}: user=${run.user_id}, card=${run.card_id}, status=${run.status}`);
  }
  if (runs.rows.length === 0) {
    console.log("  (no import runs found)");
  }

  // Check categories
  console.log("\nCategories:");
  const cats = await client.execute("SELECT id, user_id, name FROM categories LIMIT 10");
  for (const cat of cats.rows) {
    console.log(`  - ${cat.id}: ${cat.name} (user: ${cat.user_id})`);
  }
  if (cats.rows.length === 0) {
    console.log("  (no categories found)");
  }

  // Check foreign key status
  console.log("\nForeign Key Status:");
  const fkStatus = await client.execute("PRAGMA foreign_keys");
  console.log(`  PRAGMA foreign_keys = ${fkStatus.rows[0]?.foreign_keys}`);

  console.log("\n=== Done ===");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
