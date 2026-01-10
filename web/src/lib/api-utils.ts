import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError, ErrorFactory, ErrorCode } from "./errors";
import logger from "./logger";
import { LLMError, LLMErrorCode } from "./llm";

/**
 * Convert any error to an AppError
 */
export function normalizeError(error: unknown): AppError {
  // Already an AppError
  if (error instanceof AppError) {
    return error;
  }

  // LLM-specific errors with detailed handling
  if (error instanceof LLMError) {
    // Map LLM error codes to appropriate AppError types
    switch (error.code) {
      case LLMErrorCode.MISSING_API_KEY:
      case LLMErrorCode.AUTHENTICATION_FAILED:
        return new AppError(
          error.message,
          ErrorCode.LLM_ERROR,
          401,
          { llmCode: error.code, details: error.details }
        );

      case LLMErrorCode.MODEL_NOT_FOUND:
        // Return detailed error message with actionable fix
        return ErrorFactory.llmError(
          error.message,
          { llmCode: error.code, details: error.details }
        );

      case LLMErrorCode.RATE_LIMITED:
        return new AppError(
          error.message,
          ErrorCode.RATE_LIMIT_EXCEEDED,
          429,
          { llmCode: error.code, details: error.details }
        );

      case LLMErrorCode.VALIDATION_FAILED:
      case LLMErrorCode.INVALID_RESPONSE:
        return ErrorFactory.llmError(
          error.message,
          { llmCode: error.code, details: error.details }
        );

      default:
        return ErrorFactory.llmError(
          error.message,
          { llmCode: error.code, details: error.details }
        );
    }
  }

  // Zod validation error
  if (error instanceof ZodError) {
    return ErrorFactory.validationError(
      "Validation failed",
      error.flatten()
    );
  }

  // Standard Error
  if (error instanceof Error) {
    // Check for specific error patterns
    if (error.message.includes("not found") || error.message.includes("Not found")) {
      return ErrorFactory.notFound(error.message);
    }
    if (error.message.includes("duplicate") || error.message.includes("already exists")) {
      return ErrorFactory.duplicate(error.message);
    }
    if (error.message.includes("unauthorized") || error.message.includes("Unauthorized")) {
      return ErrorFactory.unauthorized(error.message);
    }

    // Default to internal error
    return ErrorFactory.internalError(error.message);
  }

  // Unknown error type
  return ErrorFactory.internalError("An unexpected error occurred");
}

/**
 * Create a standard error response
 */
export function errorResponse(error: unknown): NextResponse {
  const appError = normalizeError(error);

  // Log error details
  if (appError.statusCode >= 500) {
    logger.error({
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
      details: appError.details,
      stack: appError.stack,
    }, "API Error");
  } else {
    logger.warn({
      code: appError.code,
      message: appError.message,
      statusCode: appError.statusCode,
      details: appError.details,
    }, "API Error");
  }

  return NextResponse.json(
    appError.toJSON(),
    { status: appError.statusCode }
  );
}

/**
 * Wrap an async handler with error handling
 */
export function withErrorHandling<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return errorResponse(error);
    }
  };
}

/**
 * Validate request body against a Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: { safeParse: (data: unknown) => { success: boolean; data?: T; error?: ZodError } }
): Promise<T> {
  const payload = await request.json();
  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw ErrorFactory.validationError("Invalid request body", parsed.error?.flatten());
  }

  return parsed.data as T;
}

/**
 * Success response helper
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Created response helper
 */
export function createdResponse<T>(data: T): NextResponse {
  return NextResponse.json(data, { status: 201 });
}

/**
 * No content response helper
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}
