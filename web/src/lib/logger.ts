import pino, { Logger } from "pino";

/**
 * Structured logging utility using Pino
 * - JSON format in production (NODE_ENV=production)
 * - Pretty format in development
 */

const isDevelopment = process.env.NODE_ENV !== "production";

// Base logger configuration
const baseConfig: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? "info",
  formatters: {
    level: (label: string) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

// Create the base logger with appropriate transport
const logger: Logger = isDevelopment
  ? pino({
      ...baseConfig,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    })
  : pino(baseConfig);

// ============================================================================
// Child Loggers for Different Contexts
// ============================================================================

/**
 * Logger for API request/response logging
 */
export const apiLogger = logger.child({ context: "api" });

/**
 * Logger for LLM (OpenAI) operations
 */
export const llmLogger = logger.child({ context: "llm" });

/**
 * Logger for data store operations
 */
export const dataLogger = logger.child({ context: "data" });

/**
 * Logger for import operations
 */
export const importLogger = logger.child({ context: "import" });

// ============================================================================
// Utility Types and Functions
// ============================================================================

export interface RequestLogData {
  method: string;
  path: string;
  query?: Record<string, string>;
  body?: unknown;
}

export interface ResponseLogData {
  method: string;
  path: string;
  status: number;
  durationMs: number;
}

export interface LLMCallLogData {
  operation: string;
  model: string;
  inputSummary?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  durationMs?: number;
}

export interface ErrorLogData {
  error: Error;
  context?: Record<string, unknown>;
}

/**
 * Log an incoming API request
 */
export function logRequest(data: RequestLogData): void {
  apiLogger.info(
    {
      method: data.method,
      path: data.path,
      query: data.query,
      body: data.body,
    },
    `Incoming ${data.method} ${data.path}`
  );
}

/**
 * Log an API response
 */
export function logResponse(data: ResponseLogData): void {
  const level = data.status >= 500 ? "error" : data.status >= 400 ? "warn" : "info";
  apiLogger[level](
    {
      method: data.method,
      path: data.path,
      status: data.status,
      durationMs: data.durationMs,
    },
    `${data.method} ${data.path} - ${data.status} (${data.durationMs}ms)`
  );
}

/**
 * Log the start of an LLM call
 */
export function logLLMStart(data: Pick<LLMCallLogData, "operation" | "model" | "inputSummary">): void {
  llmLogger.info(
    {
      operation: data.operation,
      model: data.model,
      inputSummary: data.inputSummary,
    },
    `Starting LLM call: ${data.operation}`
  );
}

/**
 * Log the completion of an LLM call
 */
export function logLLMComplete(data: LLMCallLogData): void {
  llmLogger.info(
    {
      operation: data.operation,
      model: data.model,
      promptTokens: data.promptTokens,
      completionTokens: data.completionTokens,
      totalTokens: data.totalTokens,
      durationMs: data.durationMs,
    },
    `LLM call completed: ${data.operation} (${data.durationMs}ms, ${data.totalTokens ?? "?"} tokens)`
  );
}

/**
 * Log an LLM error
 */
export function logLLMError(operation: string, error: Error, context?: Record<string, unknown>): void {
  llmLogger.error(
    {
      operation,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        ...(error as unknown as Record<string, unknown>),
      },
      context,
    },
    `LLM error in ${operation}: ${error.message}`
  );
}

/**
 * Log an error with context
 */
export function logError(message: string, data: ErrorLogData): void {
  logger.error(
    {
      error: {
        name: data.error.name,
        message: data.error.message,
        stack: data.error.stack,
      },
      context: data.context,
    },
    message
  );
}

// Export the base logger for custom use cases
export default logger;
