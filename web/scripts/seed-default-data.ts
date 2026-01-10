/**
 * Seed script to create default owner and card entries for the default-user
 * Run with: npx tsx scripts/seed-default-data.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as schema from "../src/db/schema";

const DEFAULT_USER_ID = "default-user";

async function main() {
  const dbUrl = process.env.TURSO_DATABASE_URL;
  if (!dbUrl) {
    throw new Error("TURSO_DATABASE_URL not set");
  }

  const client = createClient({
    url: dbUrl,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
  const db = drizzle(client, { schema });

  const now = new Date().toISOString();

  // Check if user exists
  const users = await db.select().from(schema.users).where(eq(schema.users.id, DEFAULT_USER_ID));
  if (users.length === 0) {
    console.error(`User ${DEFAULT_USER_ID} not found. Create user first.`);
    process.exit(1);
  }
  console.log(`Found user: ${users[0].email}`);

  // Create default owner if not exists
  const existingOwners = await db.select().from(schema.owners).where(eq(schema.owners.userId, DEFAULT_USER_ID));
  if (existingOwners.length === 0) {
    console.log("Creating default owner...");
    await db.insert(schema.owners).values({
      id: "owner-arman",
      userId: DEFAULT_USER_ID,
      label: "Arman",
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created owner: owner-arman");
  } else {
    console.log(`Existing owners: ${existingOwners.map(o => o.id).join(", ")}`);
    // Check if owner-arman exists
    const hasDefaultOwner = existingOwners.some(o => o.id === "owner-arman");
    if (!hasDefaultOwner) {
      await db.insert(schema.owners).values({
        id: "owner-arman",
        userId: DEFAULT_USER_ID,
        label: "Arman",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created owner: owner-arman");
    }
  }

  // Create default card if not exists
  const existingCards = await db.select().from(schema.cards).where(eq(schema.cards.userId, DEFAULT_USER_ID));
  if (existingCards.length === 0) {
    console.log("Creating default cards...");

    // Create unknown-card (used as fallback)
    await db.insert(schema.cards).values({
      id: "unknown-card",
      userId: DEFAULT_USER_ID,
      name: "Unknown Card",
      issuer: "Unknown",
      last4: "0000",
      currency: "TRY",
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created card: unknown-card");

    // Also create "unknown" card in case that's what's in the data
    await db.insert(schema.cards).values({
      id: "unknown",
      userId: DEFAULT_USER_ID,
      name: "Unknown",
      issuer: "Unknown",
      last4: "0000",
      currency: "TRY",
      createdAt: now,
      updatedAt: now,
    });
    console.log("Created card: unknown");
  } else {
    console.log(`Existing cards: ${existingCards.map(c => c.id).join(", ")}`);

    // Check if unknown-card exists
    const hasUnknownCard = existingCards.some(c => c.id === "unknown-card");
    if (!hasUnknownCard) {
      await db.insert(schema.cards).values({
        id: "unknown-card",
        userId: DEFAULT_USER_ID,
        name: "Unknown Card",
        issuer: "Unknown",
        last4: "0000",
        currency: "TRY",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created card: unknown-card");
    }

    // Check if unknown exists
    const hasUnknown = existingCards.some(c => c.id === "unknown");
    if (!hasUnknown) {
      await db.insert(schema.cards).values({
        id: "unknown",
        userId: DEFAULT_USER_ID,
        name: "Unknown",
        issuer: "Unknown",
        last4: "0000",
        currency: "TRY",
        createdAt: now,
        updatedAt: now,
      });
      console.log("Created card: unknown");
    }
  }

  // Verify
  const finalOwners = await db.select().from(schema.owners).where(eq(schema.owners.userId, DEFAULT_USER_ID));
  const finalCards = await db.select().from(schema.cards).where(eq(schema.cards.userId, DEFAULT_USER_ID));

  console.log("\n=== Final State ===");
  console.log(`Owners (${finalOwners.length}):`, finalOwners.map(o => `${o.id}: ${o.label}`).join(", "));
  console.log(`Cards (${finalCards.length}):`, finalCards.map(c => `${c.id}: ${c.name}`).join(", "));

  console.log("\nSeed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
