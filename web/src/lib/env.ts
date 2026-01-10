import { z } from "zod";

/**
 * Environment variable validation schema
 * Ensures all required configuration is present and valid on startup
 */
const envSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z
    .string()
    .min(1, "OPENAI_API_KEY is required")
    .startsWith("sk-", "OPENAI_API_KEY must start with 'sk-'"),
  OPENAI_IMPORT_MODEL: z
    .string()
    .min(1)
    .default("gpt-4o-mini")
    .describe("Model to use for transaction extraction"),

  // NextAuth Configuration
  NEXTAUTH_SECRET: z
    .string()
    .min(32, "NEXTAUTH_SECRET must be at least 32 characters for security")
    .describe("Secret for JWT signing"),
  NEXTAUTH_URL: z
    .string()
    .url("NEXTAUTH_URL must be a valid URL")
    .default("http://localhost:3000"),

  // Authentication Credentials
  AUTH_USER_EMAIL: z
    .string()
    .email("AUTH_USER_EMAIL must be a valid email address"),
  AUTH_USER_PASSWORD_HASH: z
    .string()
    .min(1, "AUTH_USER_PASSWORD_HASH is required")
    .startsWith("$2", "AUTH_USER_PASSWORD_HASH must be a bcrypt hash (starts with $2)")
    .describe("Bcrypt hash of admin password"),

  // Turso Database Configuration
  TURSO_DATABASE_URL: z
    .string()
    .min(1, "TURSO_DATABASE_URL is required")
    .refine(
      (url) => url.startsWith("libsql://") || url.startsWith("file:"),
      "TURSO_DATABASE_URL must start with 'libsql://' or 'file:' for local development"
    ),
  TURSO_AUTH_TOKEN: z
    .string()
    .min(1, "TURSO_AUTH_TOKEN is required"),

  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validate and parse environment variables
 * Throws a descriptive error if any required variables are missing or invalid
 */
export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.issues;
    const missingVars = errors
      .map((err: z.ZodIssue) => {
        const path = err.path.join(".");
        return `  - ${path}: ${err.message}`;
      })
      .join("\n");

    const errorMessage = [
      "",
      "====================================================================",
      "ENVIRONMENT CONFIGURATION ERROR",
      "====================================================================",
      "",
      "Required environment variables are missing or invalid:",
      "",
      missingVars,
      "",
      "To fix this:",
      "  1. Copy .env.example to .env.local:",
      "     cp .env.example .env.local",
      "",
      "  2. Fill in the required values in .env.local",
      "     See README.md for detailed setup instructions",
      "",
      "  3. Restart the application",
      "",
      "====================================================================",
      "",
    ].join("\n");

    console.error(errorMessage);
    throw new Error("Environment validation failed. See console output above.");
  }

  return result.data;
}

/**
 * Validated environment variables
 * Use this instead of process.env for type safety
 *
 * NOTE: This is initialized as null and populated after validation
 * in instrumentation.ts to ensure proper timing with Next.js env loading
 */
let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    _env = validateEnv();
  }
  return _env;
}

// Getter for backward compatibility
export const env = new Proxy({} as Env, {
  get(_, prop) {
    return getEnv()[prop as keyof Env];
  },
});
