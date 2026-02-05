/**
 * Request Logger Middleware
 * Logs all incoming requests and responses
 */
import { logger } from '../utils/logger';

// requestLogger.ts
export const requestLogger = {
  // Attach per-request state
  derive: ({ request }: { request: Request }) => ({
    requestStartTime: Date.now()
  }),

  // Logs request info before handling
  onBeforeHandle: ({ request }: { request: Request }) => {
    logger.info(
      {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
      },
      'Incoming request'
    );
  },

  // Logs request completion and adds X-Response-Time header
  onAfterHandle: ({
    request,
    requestStartTime,
    set,
  }: {
    request: Request;
    requestStartTime: number;
    set: { headers: Record<string, string> };
  }) => {
    const duration = Date.now() - requestStartTime;

    logger.info(
      {
        method: request.method,
        url: request.url,
        duration: `${duration}ms`,
      },
      'Request completed'
    );

    // Add response time header
    set.headers['x-response-time'] = `${duration}ms`;
  },
};
