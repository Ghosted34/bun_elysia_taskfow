/**
 * Logger Utility
 * Structured logging with Pino for better observability
 */

import pino from "pino";
import { config } from "../config";

export const logger = pino({
  level: config.logging.level,
  transport: config.logging.pretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

/**
 * Request logger middleware
 */
export function logRequest(req: Request) {
  logger.info(
    {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
    },
    "Incoming request",
  );
}

/**
 * Response logger
 */
export function logResponse(
  req: Request,
  response: Response,
  duration: number,
) {
  logger.info(
    {
      method: req.method,
      url: req.url,
      status: response.status,
      duration: `${duration}ms`,
    },
    "Request completed",
  );
}

/**
 * Error logger
 */
export function logError(error: Error, context?: Record<string, any>) {
  logger.error(
    {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
      },
      ...context,
    },
    "Error occurred",
  );
}
