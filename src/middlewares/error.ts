/**
 * Error Handler Middleware
 * Centralized error handling with consistent response format
 */

import { config } from "../config";
import { AppError, InternalServerError } from "../utils/error";
import { logError, logger } from "../utils/logger";


/**
 * Global error handler
 * Catches all errors and returns consistent JSON responses
 */
export function handleError(error: any) {
  // Handle known application errors
  if (error instanceof AppError) {
    logError(error);
    return new Response(
      JSON.stringify(error.toJSON()),
      {
        status: error.statusCode,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle Zod validation errors
  if (error.name === 'ZodError' || error.code === 'VALIDATION') {
    logger.warn({ error: error.message }, 'Validation error');
    return new Response(
      JSON.stringify({
        error: {
          name: 'ValidationError',
          message: 'Request validation failed',
          code: 'VALIDATION_ERROR',
          statusCode: 422,
          details: error.errors || error.all || [],
        },
      }),
      {
        status: 422,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle Elysia's built-in errors
  if (error.code === 'NOT_FOUND') {
    return new Response(
      JSON.stringify({
        error: {
          name: 'NotFoundError',
          message: error.message || 'Resource not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error.code === 'PARSE') {
    return new Response(
      JSON.stringify({
        error: {
          name: 'ParseError',
          message: 'Failed to parse request body',
          code: 'PARSE_ERROR',
          statusCode: 400,
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  if (error.code === 'INVALID_COOKIE_SIGNATURE') {
    return new Response(
      JSON.stringify({
        error: {
          name: 'InvalidCookieError',
          message: 'Invalid cookie signature',
          code: 'INVALID_COOKIE',
          statusCode: 400,
        },
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle standard Error instances
  if (error instanceof Error) {
    logger.error({ 
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      }
    }, 'Unhandled error');
    
    const internalError = new InternalServerError(
      config.app.env === 'production' 
        ? 'An unexpected error occurred' 
        : error.message
    );

    return new Response(
      JSON.stringify(internalError.toJSON()),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Handle unknown error types
  logger.error({ error }, 'Unknown error type');
  
  const internalError = new InternalServerError(
    config.app.env === 'production' 
      ? 'An unexpected error occurred' 
      : String(error)
  );

  return new Response(
    JSON.stringify(internalError.toJSON()),
    {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export function asyncHandler<T>(
  handler: (...args: any[]) => Promise<T>
) {
  return async (...args: any[]) => {
    try {
      return await handler(...args);
    } catch (error) {
      throw error;
    }
  };
}