import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

// Lazy database initialization to avoid connecting during build time
let _db: ReturnType<typeof drizzle> | null = null;

// Check if we're in a build environment (during next build)
const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build' ||
                    process.env.NEXT_PHASE === 'phase-export';

function getDb() {
  // During build time, throw a helpful error instead of trying to connect
  if (isBuildTime) {
    throw new Error(
      'Database access attempted during build time. ' +
      'This is not allowed. Ensure all data-fetching pages use "export const dynamic = force-dynamic"'
    );
  }

  if (!_db) {
    // Check if database credentials are available
    const dbUrl = process.env.TURSO_DATABASE_URL;

    if (!dbUrl) {
      throw new Error(
        'Database configuration missing. TURSO_DATABASE_URL environment variable is required at runtime.'
      );
    }

    // Only create client when actually needed, not at import time
    const client = createClient({
      url: dbUrl,
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
