/**
 * Request Logger Middleware
 * Logs all incoming requests and responses
 */

import { Elysia } from 'elysia';
import { logger } from '../utils/logger';

export const requestLogger = new Elysia({ name: 'request-logger' })
  .derive(({ request }) => {
    // Store start time in a way that persists through the request lifecycle
    return {
      requestStartTime: Date.now()
    };
  })
  .onBeforeHandle(({ request }) => {
    logger.info({
      method: request.method,
      url: request.url,
      userAgent: request.headers.get('user-agent'),
    }, 'Incoming request');
  })
  .onAfterHandle(({ request, requestStartTime, set }) => {
    const duration = Date.now() - requestStartTime;
    
    logger.info({
      method: request.method,
      url: request.url,
      duration: `${duration}ms`,
    }, 'Request completed');
    
    // Add response time header
    set.headers['x-response-time'] = `${duration}ms`;
  });