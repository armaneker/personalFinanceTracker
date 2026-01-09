import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { z } from "zod";

describe("Environment Validation", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe("Valid configurations", () => {
    it("should validate a complete and correct environment", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-proj-test-key",
        OPENAI_IMPORT_MODEL: "gpt-4o-mini",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "test@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$testpasswordhash",
        TURSO_DATABASE_URL: "libsql://test-db.turso.io",
        TURSO_AUTH_TOKEN: "test-token",
        NODE_ENV: "test",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(true);
    });

    it("should use default values for optional variables", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.OPENAI_IMPORT_MODEL).toBe("gpt-4o-mini");
        expect(result.data.NODE_ENV).toBe("development");
      }
    });
  });

  describe("Missing required variables", () => {
    it("should fail when OPENAI_API_KEY is missing", () => {
      const testEnv = {
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when database credentials are missing", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });
  });

  describe("Invalid variable formats", () => {
    it("should fail when OPENAI_API_KEY doesn't start with sk-", () => {
      const testEnv = {
        OPENAI_API_KEY: "invalid-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when NEXTAUTH_SECRET is too short", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "short",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when AUTH_USER_EMAIL is not a valid email", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "not-an-email",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when AUTH_USER_PASSWORD_HASH is not a bcrypt hash", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "not-a-bcrypt-hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when TURSO_DATABASE_URL doesn't start with libsql://", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "http://localhost:3000",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "https://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });

    it("should fail when NEXTAUTH_URL is not a valid URL", () => {
      const testEnv = {
        OPENAI_API_KEY: "sk-test-key",
        NEXTAUTH_SECRET: "a-very-long-secret-that-is-at-least-32-characters",
        NEXTAUTH_URL: "not-a-url",
        AUTH_USER_EMAIL: "admin@example.com",
        AUTH_USER_PASSWORD_HASH: "$2a$10$hash",
        TURSO_DATABASE_URL: "libsql://db.turso.io",
        TURSO_AUTH_TOKEN: "token",
      };

      const envSchema = z.object({
        OPENAI_API_KEY: z.string().min(1).startsWith("sk-"),
        OPENAI_IMPORT_MODEL: z.string().min(1).default("gpt-4o-mini"),
        NEXTAUTH_SECRET: z.string().min(32),
        NEXTAUTH_URL: z.string().url().default("http://localhost:3000"),
        AUTH_USER_EMAIL: z.string().email(),
        AUTH_USER_PASSWORD_HASH: z.string().min(1).startsWith("$2"),
        TURSO_DATABASE_URL: z.string().min(1).startsWith("libsql://"),
        TURSO_AUTH_TOKEN: z.string().min(1),
        NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
      });

      const result = envSchema.safeParse(testEnv);
      expect(result.success).toBe(false);
    });
  });
});
