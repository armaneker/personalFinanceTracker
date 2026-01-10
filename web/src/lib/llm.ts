import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

import { StatementExtraction, StatementExtractionPrompt } from "./types";
import { logLLMStart, logLLMComplete, logLLMError, llmLogger } from "./logger";

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
  color: z.string().nullish(),
});

const metadataSchema = z.object({
  statement_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  statement_month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
  card_last4: z.string().optional(),
  cardholder_name: z.string().optional(),
});

export const statementExtractionSchema = z.object({
  run_id: z.string().optional(),
  model: z.string().optional(),
  metadata: metadataSchema.optional(),
  summary: summarySchema,
  transactions: z.array(transactionSchema),
  warnings: z.array(z.string()).optional().default([]),
  statement_notes: z.string().nullable().optional(),
  new_categories: z.array(newCategorySchema).optional().default([]),
});

export type ValidatedStatementExtraction = z.infer<typeof statementExtractionSchema>;

// ============================================================================
// Claude Client
// ============================================================================

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new LLMError(
      "Missing ANTHROPIC_API_KEY. Set it in your environment or .env.local file.",
      LLMErrorCode.MISSING_API_KEY
    );
  }
  if (!cachedClient) {
    cachedClient = new Anthropic({ apiKey });
  }
  return cachedClient;
}

// ============================================================================
// Prompt Builder
// ============================================================================

const SYSTEM_PROMPT = `You are a personal finance data extractor. You take Turkish credit card statements and produce structured JSON.

CRITICAL REQUIREMENTS:
- You MUST extract EVERY SINGLE transaction from the statement. Do NOT stop early.
- If there are 90+ transactions, you MUST output all 90+ transactions.
- Do NOT truncate, summarize, or skip any transactions.
- Continue generating until ALL transactions are included in the output.

Rules:
- Return valid JSON only. No markdown fences, no explanations - just the JSON object.
- Amounts are decimal numbers. Charges should be negative, refunds positive.
- Dates must be ISO 8601 YYYY-MM-DD. If day is missing infer best guess.
- Provide statement summary totals and currency.
- Include warnings for ambiguous rows.
- Extract metadata from statement: statement date (to determine month), card last 4 digits, and cardholder name.
- Skip non-transaction lines (previous balance "BİR ÖNCEKİ HESAP ÖZETİ BAKİYENİZ", payment transfers "HESAPTAN AKTARIM", reward point additions like "MAXİPUAN İLAVE").
`;

function buildPrompt(input: StatementExtractionPrompt): string {
  const schema = {
    run_id: "string",
    model: "string",
    metadata: {
      statement_date: "YYYY-MM-DD (extract from statement 'Hesap Kesim Tarihi' or similar)",
      statement_month: "YYYY-MM (derived from statement_date)",
      card_last4: "string (last 4 digits from masked card number like '4743********8479')",
      cardholder_name: "string (extract from statement, e.g., 'SN. ARMAN EKER')",
    },
    summary: {
      transactions: "number (count of actual spending transactions)",
      total_spend: "number (positive total of charges)",
      currency: "TRY or other ISO currency code",
    },
    transactions: [
      {
        id: "string unique id (format: tx-YYYY-MM-DD-merchant-amount)",
        card_id: "string card identifier",
        owner_id: "string owner identifier or null",
        statement_ref: "string original filename",
        transaction_date: "YYYY-MM-DD",
        post_date: "YYYY-MM-DD or null",
        merchant: "string merchant title (cleaned up)",
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

  return `Output ONLY valid JSON following this schema. Do not include markdown fences or any text before/after the JSON.

Statement metadata:
- Statement name: ${input.statementName}
- Card id: ${input.cardId ?? "detect from statement (format: card-issuer-last4)"}
- Owner id: ${input.ownerId ?? "owner-arman"}
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

CRITICAL: This statement has many transactions across multiple pages. You MUST extract ALL of them - every single line item that represents a purchase or refund.
Do NOT stop after 10-20 transactions. Continue until you have extracted every transaction from every page.
The transactions array must contain ALL transactions from the statement, even if there are 80-100+ of them.

Output the JSON now:`;
}

// ============================================================================
// Error Handler
// ============================================================================

function handleAnthropicError(error: unknown): never {
  if (error instanceof Anthropic.APIError) {
    const status = error.status;
    const message = error.message;

    switch (status) {
      case 401:
        throw new LLMError(
          "Anthropic API authentication failed. Please check your ANTHROPIC_API_KEY is valid.",
          LLMErrorCode.AUTHENTICATION_FAILED,
          { statusCode: 401, retryable: false, cause: error }
        );

      case 404:
        throw new LLMError(
          `Anthropic model not found. Error: ${message}`,
          LLMErrorCode.MODEL_NOT_FOUND,
          { statusCode: 404, retryable: false, cause: error }
        );

      case 429:
        throw new LLMError(
          "Anthropic API rate limit exceeded. Please wait a moment and try again.",
          LLMErrorCode.RATE_LIMITED,
          { statusCode: 429, retryable: true, cause: error }
        );

      case 500:
      case 502:
      case 503:
      case 504:
        throw new LLMError(
          `Anthropic server error (${status}). Please try again later.`,
          LLMErrorCode.SERVER_ERROR,
          { statusCode: status, retryable: true, cause: error }
        );

      default:
        throw new LLMError(
          `Anthropic API error: ${message}`,
          LLMErrorCode.SERVER_ERROR,
          { statusCode: status, retryable: status >= 500, cause: error }
        );
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ETIMEDOUT")) {
      throw new LLMError(
        "Network error connecting to Anthropic API. Please check your internet connection.",
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
    "An unknown error occurred while calling the Anthropic API.",
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
  const exponentialDelay = config.baseDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay;
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
      const isRetryable = error instanceof LLMError ? error.retryable : false;

      if (!isRetryable || attempt >= config.maxAttempts - 1) {
        throw error;
      }

      const delayMs = calculateBackoffDelay(attempt, config);
      llmLogger.warn(
        {
          attempt: attempt + 1,
          maxAttempts: config.maxAttempts,
          delayMs: Math.round(delayMs),
          error: (error as Error).message,
        },
        `LLM request failed (attempt ${attempt + 1}/${config.maxAttempts}). Retrying in ${Math.round(delayMs)}ms...`
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
  const model = process.env.CLAUDE_IMPORT_MODEL ?? "claude-sonnet-4-20250514";

  const startTime = Date.now();

  logLLMStart({
    operation: "extractTransactions",
    model,
    inputSummary: `statement=${input.statementName}, textLength=${input.statementText.length}, categories=${input.categories.length}`,
  });

  try {
    const result = await withRetry(async () => {
      let response;
      try {
        // Use streaming for long requests
        const stream = client.messages.stream({
          model,
          max_tokens: 32000,
          system: SYSTEM_PROMPT,
          messages: [
            { role: "user", content: buildPrompt(input) },
          ],
        });
        response = await stream.finalMessage();
      } catch (error) {
        handleAnthropicError(error);
      }

      // Extract text content from Claude's response
      const textBlock = response.content.find((block) => block.type === "text");
      const content = textBlock?.type === "text" ? textBlock.text : null;

      if (!content) {
        throw new LLMError(
          "LLM returned no content in the response.",
          LLMErrorCode.EMPTY_RESPONSE,
          { retryable: true }
        );
      }

      // Parse JSON - handle potential markdown fences
      let jsonContent = content.trim();
      if (jsonContent.startsWith("```json")) {
        jsonContent = jsonContent.slice(7);
      } else if (jsonContent.startsWith("```")) {
        jsonContent = jsonContent.slice(3);
      }
      if (jsonContent.endsWith("```")) {
        jsonContent = jsonContent.slice(0, -3);
      }
      jsonContent = jsonContent.trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(jsonContent);
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

      // Check for transaction count mismatch
      const reportedCount = validationResult.data.summary.transactions;
      const actualCount = validationResult.data.transactions.length;
      if (reportedCount !== actualCount) {
        const mismatchWarning = `Transaction count mismatch: summary reports ${reportedCount} transactions but only ${actualCount} were extracted. Some transactions may have been missed.`;
        llmLogger.warn({ reportedCount, actualCount }, mismatchWarning);
        validationResult.data.warnings = validationResult.data.warnings || [];
        validationResult.data.warnings.push(mismatchWarning);
      }

      // Log successful completion
      const usage = response.usage;
      logLLMComplete({
        operation: "extractTransactions",
        model,
        promptTokens: usage?.input_tokens,
        completionTokens: usage?.output_tokens,
        totalTokens: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
        durationMs: Date.now() - startTime,
      });

      return validationResult.data;
    });

    return result as StatementExtraction;
  } catch (error) {
    logLLMError("extractTransactions", error as Error, {
      model,
      statementName: input.statementName,
      durationMs: Date.now() - startTime,
    });
    throw error;
  }
}
