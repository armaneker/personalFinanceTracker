/**
 * Next.js Instrumentation
 * Runs once when the server starts in Node.js runtime
 * Used for environment validation and other server initialization tasks
 *
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Only run in Node.js runtime (not Edge Runtime)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import to avoid loading in Edge Runtime
    const { validateEnv } = await import("./lib/env");

    // Skip validation during build time and tests
    const isBuildTime =
      process.env.NEXT_PHASE === "phase-production-build" ||
      process.env.NEXT_PHASE === "phase-export";
    const isTest = process.env.NODE_ENV === "test";

    if (!isBuildTime && !isTest) {
      try {
        validateEnv();
        console.log("✓ Environment configuration validated successfully");
      } catch (error) {
        // Error is already logged by validateEnv
        console.error("Environment validation failed. Server cannot start.");
        process.exit(1);
      }
    }
  }
}
