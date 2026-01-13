/**
 * Script to create the default-user in the users table
 * This is needed because cards/import_runs reference this user via foreign key
 * Run with: npx tsx scripts/create-default-user.ts
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

  console.log("Creating default-user in users table...\n");

  const now = new Date().toISOString();
  try {
    await client.execute({
      sql: `INSERT INTO users (id, email, password_hash, name, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (id) DO NOTHING`,
      args: [
        "default-user",
        "default@local.dev",
        "placeholder-hash-not-for-login", // This user won't be used for actual login
        "Default User",
        now,
        now,
      ],
    });
    console.log("✅ default-user created successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes("UNIQUE constraint")) {
      console.log("ℹ️  default-user already exists, skipping.");
    } else {
      throw error;
    }
  }

  // Verify the user was created
  const result = await client.execute("SELECT id, email, name FROM users");
  console.log("\nCurrent users:");
  for (const row of result.rows) {
    console.log(`  - ${row.id}: ${row.email} (${row.name})`);
  }

  console.log("\nDone!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
