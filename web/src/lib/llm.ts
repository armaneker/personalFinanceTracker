import OpenAI from "openai";
import { z } from "zod";

import { StatementExtraction, StatementExtractionPrompt } from "./types";

// ============================================================================
// Custom LLM Error Class
// ============================================================================

export enum LLMErrorCode {
  MISSING_API_KEY = "MISSING_API_KEY",
  AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
  MODEL_NOT_FOUND = "MODEL_NOT_FOUND",
  RATE_LIMITED = "RATE_LIMITED",
  SERVER_ERROR = "SERVER_ERROR",
  NETWORK_ERROR = "NETWORK_ERROR",
  EMPTY_RESPONSE = "EMPTY_RESPONSE",
  INVALID_RESPONSE = "INVALID_RESPONSE",
  VALIDATION_FAILED = "VALIDATION_FAILED",
  MAX_RETRIES_EXCEEDED = "MAX_RETRIES_EXCEEDED",
}

export class LLMError extends Error {
  readonly code: LLMErrorCode;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly details?: unknown;

  constructor(
    message: string,
    code: LLMErrorCode,
    options?: {
      statusCode?: number;
      retryable?: boolean;
      details?: unknown;
      cause?: Error;
    }
  ) {
    super(message, { cause: options?.cause });
    this.name = "LLMError";
    this.code = code;
    this.statusCode = options?.statusCode;
    this.retryable = options?.retryable ?? false;
    this.details = options?.details;
  }
}

// ============================================================================
// Zod Validation Schema
// ============================================================================

const transactionSchema = z.object({
  id: z.string(),
  card_id: z.string(),
  owner_id: z.string().nullable().optional(),
  statement_ref: z.string(),
  transaction_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  post_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  merchant: z.string(),
  description: z.string().nullable().optional(),
  amount: z.number(),
  currency: z.string().min(3).max(3),
  category_id: z.string().nullable().optional(),
  llm_category_id: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});

const summarySchema = z.object({
  transactions: z.number().int().nonnegative(),
  total_spend: z.number(),
  currency: z.string().min(3).max(3),
});

const newCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string().optional(),
});

export const statementExtractionSchema = z.object({
  run_id: z.string().optional(),
  model: z.string().optional(),
  summary: summarySchema,
  transactions: z.array(transactionSchema),
  warnings: z.array(z.string()).optional().default([]),
  statement_notes: z.string().nullable().optional(),
  new_categories: z.array(newCategorySchema).optional().default([]),
});

export type ValidatedStatementExtraction = z.infer<typeof statementExtractionSchema>;

// ============================================================================
// OpenAI Client
// ============================================================================

let cachedClient: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "Missing OPENAI_API_KEY. Set it in your environment or .env.local file.",
      LLMErrorCode.MISSING_API_KEY
    );
  }
  if (!cachedClient) {
    cachedClient = new OpenAI({ apiKey });
  }
  return cachedClient;
}

// ============================================================================
// Prompt Builder
// ============================================================================

const SYSTEM_PROMPT = `You are a personal finance data extractor. You take Turkish credit card statements and produce structured JSON.

Rules:
- Return valid JSON only. Use the schema provided.
- Amounts are decimal numbers. Charges should be negative, refunds positive.
- Dates must be ISO 8601 YYYY-MM-DD. If day is missing infer best guess.
- Provide statement summary totals and currency.
- Include warnings for ambiguous rows.
`;

function buildPrompt(input: StatementExtractionPrompt): string {
  const schema = {
    run_id: "string",
    model: "string",
    summary: {
      transactions: "number",
      total_spend: "number (positive total of charges)",
      currency: "TRY or other ISO currency code",
    },
    transactions: [
      {
        id: "string unique id",
        card_id: "string card identifier",
        owner_id: "string owner identifier or null",
        statement_ref: "string original filename",
        transaction_date: "YYYY-MM-DD",
        post_date: "YYYY-MM-DD or null",
        merchant: "string merchant title",
        description: "string description or null",
        amount: "number (negative charge, positive refund)",
        currency: "string currency code",
        category_id: "string auto category id if certain",
        llm_category_id: "string category suggestion",
        notes: "string notes or null",
      },
    ],
    warnings: ["string"],
    statement_notes: "string or null",
    new_categories: [
      {
        id: "string category id",
        name: "string category name",
        color: "hex color or omit",
      },
    ],
  };

  const categoriesSummary = input.categories.map((cat) => ({ id: cat.id, name: cat.name }));

  return `
Output ONLY valid JSON following this schema (enforced via response_format). Do not include markdown fences.

Statement metadata:
- Statement name: ${input.statementName}
- Card id: ${input.cardId ?? "unknown"}
- Owner id: ${input.ownerId ?? "unknown"}
- Target month: ${input.month ?? "detect from data"}

Existing categories (id -> name):
${JSON.stringify(categoriesSummary, null, 2)}

Categorization rules:
- Use an existing category id when possible.
- If a spending clearly belongs to a new category, add an entry to new_categories with a slug-like id (lowercase, use dashes).
- Category ids in transactions must reference either an existing id above or one you include in new_categories.

Statement text:
${input.statementText}

Schema (for reference):
${JSON.stringify(schema, null, 2)}
`;
}

// ============================================================================
// Error Handler
// ============================================================================

function handleOpenAIError(error: unknown): never {
  if (error instanceof OpenAI.APIError) {
    const status = error.status;
    const message = error.message;

    switch (status) {
      case 401:
        throw new LLMError(
          "OpenAI API authentication failed. Please check your OPENAI_API_KEY is valid and has not expired.",
          LLMErrorCode.AUTHENTICATION_FAILED,
          { statusCode: 401, retryable: false, cause: error }
        );

      case 404:
        throw new LLMError(
          `OpenAI model not found. Ensure OPENAI_IMPORT_MODEL is set to a valid model name (e.g., gpt-4o-mini). Error: ${message}`,
          LLMErrorCode.MODEL_NOT_FOUND,
          { statusCode: 404, retryable: false, cause: error }
        );

      case 429:
        throw new LLMError(
          "OpenAI API rate limit exceeded. Please wait a moment and try again, or check your API plan limits.",
          LLMErrorCode.RATE_LIMITED,
          { statusCode: 429, retryable: true, cause: error }
        );

      case 500:
      case 502:
      case 503:
      case 504:
        throw new LLMError(
          `OpenAI server error (${status}). The service may be temporarily unavailable. Please try again later.`,
          LLMErrorCode.SERVER_ERROR,
          { statusCode: status, retryable: true, cause: error }
        );

      default:
        throw new LLMError(
          `OpenAI API error: ${message}`,
          LLMErrorCode.SERVER_ERROR,
          { statusCode: status, retryable: status >= 500, cause: error }
        );
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
      throw new LLMError(
        "Network error connecting to OpenAI API. Please check your internet connection.",
        LLMErrorCode.NETWORK_ERROR,
        { retryable: true, cause: error }
      );
    }

    throw new LLMError(
      `Unexpected error: ${error.message}`,
      LLMErrorCode.SERVER_ERROR,
      { retryable: false, cause: error }
    );
  }

  throw new LLMError(
    "An unknown error occurred while calling the OpenAI API.",
    LLMErrorCode.SERVER_ERROR,
    { retryable: false }
  );
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
};

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function calculateBackoffDelay(attempt: number, config: RetryConfig): number {
  // Exponential backoff: baseDelay * 2^attempt with jitter
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelayMs);
}

async function withRetry<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Check if error is retryable
      const isRetryable = error instanceof LLMError ? error.retryable : false;

      if (!isRetryable || attempt >= config.maxAttempts - 1) {
        throw error;
      }

      // Calculate delay and wait before retrying
      const delayMs = calculateBackoffDelay(attempt, config);
      console.warn(
        `LLM request failed (attempt ${attempt + 1}/${config.maxAttempts}): ${
          (error as Error).message
        }. Retrying in ${Math.round(delayMs)}ms...`
      );
      await sleep(delayMs);
    }
  }

  throw new LLMError(
    `Failed after ${config.maxAttempts} attempts. Last error: ${lastError?.message}`,
    LLMErrorCode.MAX_RETRIES_EXCEEDED,
    { cause: lastError ?? undefined }
  );
}

// ============================================================================
// Main Export: Extract Transactions with LLM
// ============================================================================

export async function extractTransactionsWithLLM(
  input: StatementExtractionPrompt
): Promise<StatementExtraction> {
  const client = getClient();
  const model = process.env.OPENAI_IMPORT_MODEL ?? "gpt-4o-mini";

  const result = await withRetry(async () => {
    let response;
    try {
      response = await client.chat.completions.create({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildPrompt(input) },
        ],
      });
    } catch (error) {
      handleOpenAIError(error);
    }

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new LLMError(
        "LLM returned no content in the response. This may indicate an issue with the model or prompt.",
        LLMErrorCode.EMPTY_RESPONSE,
        { retryable: true }
      );
    }

    // Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new LLMError(
        `Failed to parse LLM response as JSON: ${(error as Error).message}`,
        LLMErrorCode.INVALID_RESPONSE,
        { retryable: false, details: { rawContent: content.slice(0, 500) }, cause: error as Error }
      );
    }

    // Validate with Zod schema
    const validationResult = statementExtractionSchema.safeParse(parsed);
    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("; ");

      throw new LLMError(
        `LLM response validation failed: ${issues}`,
        LLMErrorCode.VALIDATION_FAILED,
        { retryable: false, details: validationResult.error.issues }
      );
    }

    return validationResult.data;
  });

  // Cast to StatementExtraction (the validated data is compatible)
  return result as StatementExtraction;
}
