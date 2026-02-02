/**
 * Custom Error Classes
 * Structured error handling with HTTP status codes
 */

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public override message: string,
    public code?: string,
    public details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        details: this.details,
      },
    };
  }
}

export class BadRequestError extends AppError {
  constructor(message = "Bad Request", details?: any) {
    super(400, message, "BAD_REQUEST", details);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized", details?: any) {
    super(401, message, "UNAUTHORIZED", details);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden", details?: any) {
    super(403, message, "FORBIDDEN", details);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found", details?: any) {
    super(404, message, "NOT_FOUND", details);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource already exists", details?: any) {
    super(409, message, "CONFLICT", details);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: any) {
    super(422, message, "VALIDATION_ERROR", details);
  }
}

export class InternalServerError extends AppError {
  constructor(message = "Internal server error", details?: any) {
    super(500, message, "INTERNAL_SERVER_ERROR", details);
  }
}

export class RateLimitError extends AppError {
  constructor(message = "Too many requests", details?: any) {
    super(429, message, "RATE_LIMIT_EXCEEDED", details);
  }
}
