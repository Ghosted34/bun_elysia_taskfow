/**
 * app.ts
 * Main Elysia application with routes and middleware
 */

import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { config } from './config';
import { requestLogger } from './middlewares/logger';
import { handleError } from './middlewares/error';
import { checkDatabaseConnection } from '../config/db';
import { checkRedisConnection } from '../config/redis';
import { authRoutes } from './auth/auth.routes';
import { tasksRoutes } from './tasks/task.routes';


/**
 * Create and configure Elysia application
 */
export const app = new Elysia()
  // Swagger API Documentation
  .use(
    swagger({
      documentation: {
        info: {
          title: 'Task Management API',
          version: '1.0.0',
          description: 'REST API with Bun, Elysia, and PostgreSQL',
        },
        tags: [
          { name: 'Auth', description: 'Authentication endpoints' },
          { name: 'Tasks', description: 'Task management endpoints' },
        ],
      },
    })
  )
.derive(requestLogger.derive)
  // CORS Configuration
  .use(
    cors({
      origin: config.cors.origin,
      credentials: config.cors.credentials,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  )

  // Request Logger Middleware
  .onBeforeHandle(requestLogger.onBeforeHandle)
  .onAfterHandle(requestLogger.onAfterHandle)

  // Global Error Handler
  .onError(({ error }) => {
    return handleError(error);
  })

  // Health Check Endpoint
  .get('/health', async () => {
    const dbHealthy = await checkDatabaseConnection();
    const redisHealthy = await checkRedisConnection();

    return {
      status: dbHealthy && redisHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealthy ? 'up' : 'down',
        redis: redisHealthy ? 'up' : 'down',
      },
    };
  })

  // Root Endpoint
  .get('/', () => ({
    message: 'Task Management API',
    version: '1.0.0',
    documentation: '/swagger',
  }))

  // API Routes
  .group('/api', (app) =>
    app
      .use(authRoutes)
      .use(tasksRoutes)
  )

  // 404 Handler
  .onError(({ code, set }) => {
    if (code === 'NOT_FOUND') {
      set.status = 404;
      return {
        error: {
          message: 'Route not found',
          code: 'NOT_FOUND',
          statusCode: 404,
        },
      };
    }
  });