/**
 * Application initialization
 * Validates environment configuration on startup
 * Import this file at the top of your Next.js configuration or entry points
 */

import { validateEnv } from "./env";

// Only validate during runtime, not during build time or tests
const isBuildTime = process.env.NEXT_PHASE === "phase-production-build" ||
                    process.env.NEXT_PHASE === "phase-export";
const isTest = process.env.NODE_ENV === "test";

if (!isBuildTime && !isTest) {
  try {
    validateEnv();
    console.log("✓ Environment configuration validated successfully");
  } catch {
    // Error is already logged by validateEnv
    process.exit(1);
  }
}
