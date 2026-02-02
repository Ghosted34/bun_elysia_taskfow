console.log("Hello via Bun!");/**
 * server.ts
 * Server startup and lifecycle management
 */


import { app } from './src/app';
import { closeRedisConnection } from './config/redis';
import { validateConfig } from './src/config';
import { logger } from './src/utils/logger';
import { closeDatabaseConnection } from './config/db';

/**
 * Validate configuration on startup
 */
validateConfig();

/**
 * Start the server
 */
const server = app.listen(Bun.env.PORT!);

/**
 * Startup Message
 */
logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🚀 Task Management API                                      ║
║                                                               ║
║   Environment:  ${Bun.env.NODE_ENV!.padEnd(47)}║
║   Port:         ${Bun.env.PORT!.toString().padEnd(47)}║
║   Documentation: http://localhost:${Bun.env.PORT!}/swagger${' '.repeat(22)}║
║   Health:       http://localhost:${Bun.env.PORT!}/health${' '.repeat(23)}║
║                                                               ║
║   📊 Performance Optimizations:                               ║
║   ✓ Connection Pooling (Max: 10})${' '.repeat(28)}║
║   ✓ Redis Caching                                            ║
║   ✓ Database Indexes                                         ║
║   ✓ Response Compression                                     ║
║   ✓ Query Optimization                                       ║
║                                                               ║
║   🔐 Security Features:                                       ║
║   ✓ JWT Authentication (Access + Refresh)                    ║
║   ✓ RBAC (4 Roles, 12 Permissions)                           ║
║   ✓ Bcrypt Password Hashing                                  ║
║                                                               ║
║   📦 Message Queues:                                          ║
║   ✓ Email Queue (BullMQ)                                     ║
║   ✓ Notification Queue                                       ║
║   ✓ Background Processing                                    ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

/**
 * Graceful Shutdown Handler
 */
async function gracefulShutdown(signal: string) {
  logger.info(`🛑 Received ${signal}, shutting down gracefully...`);
  
  try {
    // Close database connections
    await closeDatabaseConnection();
    logger.info('✅ Database connections closed');
    
    // Close Redis connections
    await closeRedisConnection();
    logger.info('✅ Redis connections closed');
    
    logger.info('✅ Shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, '❌ Error during shutdown');
    process.exit(1);
  }
}

/**
 * Register shutdown handlers
 */
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Handle uncaught errors
 */
process.on('uncaughtException', (error) => {
  logger.error({ error }, '❌ Uncaught Exception');
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '❌ Unhandled Promise Rejection');
  gracefulShutdown('unhandledRejection');
});

/**
 * Export server instance
 */
export default server;