/**
 * Standard error codes for the application
 */
export enum ErrorCode {
  // Authentication & Authorization
  UNAUTHORIZED = "UNAUTHORIZED",
  FORBIDDEN = "FORBIDDEN",

  // Validation
  VALIDATION_ERROR = "VALIDATION_ERROR",
  INVALID_INPUT = "INVALID_INPUT",

  // Resource errors
  NOT_FOUND = "NOT_FOUND",
  CONFLICT = "CONFLICT",
  DUPLICATE = "DUPLICATE",

  // Server errors
  INTERNAL_ERROR = "INTERNAL_ERROR",
  DATABASE_ERROR = "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",

  // Import-specific errors
  IMPORT_FAILED = "IMPORT_FAILED",
  PDF_PARSE_ERROR = "PDF_PARSE_ERROR",
  LLM_ERROR = "LLM_ERROR",

  // Rate limiting
  RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
}

/**
 * Standard API error response format
 */
export interface ApiError {
  error: string;
  code: ErrorCode;
  details?: unknown;
}

/**
 * Application error class with error code and HTTP status
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "AppError";

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Convert error to API error response format
   */
  toJSON(): ApiError {
    return {
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

/**
 * Helper functions to create common errors
 */
export class ErrorFactory {
  static unauthorized(message = "Unauthorized access"): AppError {
    return new AppError(message, ErrorCode.UNAUTHORIZED, 401);
  }

  static forbidden(message = "Forbidden"): AppError {
    return new AppError(message, ErrorCode.FORBIDDEN, 403);
  }

  static notFound(resource: string): AppError {
    return new AppError(`${resource} not found`, ErrorCode.NOT_FOUND, 404);
  }

  static validationError(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.VALIDATION_ERROR, 400, details);
  }

  static conflict(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.CONFLICT, 409, details);
  }

  static duplicate(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.DUPLICATE, 409, details);
  }

  static internalError(message = "Internal server error", details?: unknown): AppError {
    return new AppError(message, ErrorCode.INTERNAL_ERROR, 500, details);
  }

  static databaseError(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.DATABASE_ERROR, 500, details);
  }

  static importError(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.IMPORT_FAILED, 500, details);
  }

  static pdfParseError(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.PDF_PARSE_ERROR, 400, details);
  }

  static llmError(message: string, details?: unknown): AppError {
    return new AppError(message, ErrorCode.LLM_ERROR, 500, details);
  }

  static rateLimitExceeded(message = "Rate limit exceeded"): AppError {
    return new AppError(message, ErrorCode.RATE_LIMIT_EXCEEDED, 429);
  }
}

/**
 * User-friendly error messages for common error codes
 */
export const USER_FRIENDLY_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.UNAUTHORIZED]: "You need to be logged in to access this resource.",
  [ErrorCode.FORBIDDEN]: "You don't have permission to access this resource.",
  [ErrorCode.VALIDATION_ERROR]: "The data provided is invalid. Please check your input.",
  [ErrorCode.INVALID_INPUT]: "The input provided is invalid.",
  [ErrorCode.NOT_FOUND]: "The requested resource could not be found.",
  [ErrorCode.CONFLICT]: "This operation conflicts with existing data.",
  [ErrorCode.DUPLICATE]: "This resource already exists.",
  [ErrorCode.INTERNAL_ERROR]: "An unexpected error occurred. Please try again later.",
  [ErrorCode.DATABASE_ERROR]: "A database error occurred. Please try again later.",
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: "An external service is unavailable. Please try again later.",
  [ErrorCode.IMPORT_FAILED]: "Failed to import the statement. Please check the file and try again.",
  [ErrorCode.PDF_PARSE_ERROR]: "Failed to parse the PDF file. Please check the file format.",
  [ErrorCode.LLM_ERROR]: "Failed to process the statement with AI. Please try again.",
  [ErrorCode.RATE_LIMIT_EXCEEDED]: "Too many requests. Please wait a moment and try again.",
};

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(code: ErrorCode): string {
  return USER_FRIENDLY_MESSAGES[code] || USER_FRIENDLY_MESSAGES[ErrorCode.INTERNAL_ERROR];
}
