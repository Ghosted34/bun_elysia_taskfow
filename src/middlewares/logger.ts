import { config } from "../config";
import { AppError, InternalServerError } from "../utils/error";
import { logError, logger } from "../utils/logger";

export function handleError(error: Error) {
  // Log the error
  logError(error);

  // Handle known application errors
  if (error instanceof AppError) {
    return new Response(JSON.stringify(error.toJSON()), {
      status: error.statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Handle Zod validation errors
  if (error.name === "ZodError") {
    const zodError = error as any;
    return new Response(
      JSON.stringify({
        error: {
          name: "ValidationError",
          message: "Request validation failed",
          code: "VALIDATION_ERROR",
          statusCode: 422,
          details: zodError.errors,
        },
      }),
      {
        status: 422,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // Handle unknown errors
  logger.error({ error }, "Unhandled error");

  const internalError = new InternalServerError(
    config.app.env === "production"
      ? "An unexpected error occurred"
      : error.message,
  );

  return new Response(JSON.stringify(internalError.toJSON()), {
    status: 500,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T>(handler: (...args: any[]) => Promise<T>) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      throw error;
    }
  };
}
