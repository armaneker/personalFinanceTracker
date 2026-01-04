import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Create libSQL client with Turso credentials
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Create and export the drizzle database instance
export const db = drizzle(client, { schema });

// Re-export schema for convenience
export * from "./schema";
