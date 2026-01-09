import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Lazy database initialization to avoid connecting during build time
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    // Only create client when actually needed, not at import time
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// Export db as a getter to ensure lazy initialization
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(target, prop) {
    return getDb()[prop as keyof ReturnType<typeof drizzle>];
  },
});

// Re-export schema for convenience
export * from "./schema";
