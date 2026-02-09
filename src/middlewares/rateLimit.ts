/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting requests per IP/user
 */

import { Elysia } from "elysia";
import { redis } from "../../config/redis";
import { logger } from "../utils/logger";
import { RateLimitError } from "../utils/error";

export interface RateLimitConfig {
  max: number; // Maximum requests
  windowMs: number; // Time window in milliseconds
  keyPrefix?: string; // Redis key prefix
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Get client identifier (IP address or user ID)
 */
function getClientIdentifier(request: Request, user?: any): string {
  // Use user ID if authenticated
  if (user?.id) {
    return `user:${user.id}`;
  }

  // Otherwise use IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? forwarded?.split(",")[0]?.trim()
    : request.headers.get("x-real-ip") || "unknown";

  return `ip:${ip}`;
}

/**
 * Rate Limit Middleware
 *
 * Usage:
 * .use(rateLimit({ max: 100, windowMs: 60000 }))  // 100 req/min
 */
export function rateLimit(options: RateLimitConfig) {
  const {
    max = 100,
    windowMs = 60000,
    keyPrefix = "ratelimit",
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return new Elysia({ name: "rate-limit" })
    .derive(async ({ request, user }) => {
      const identifier = getClientIdentifier(request, user);
      const key = `${keyPrefix}:${identifier}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      try {
        // Use Redis sorted set to track requests in time window
        // Remove old requests outside the window
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count requests in current window
        const requestCount = await redis.zcard(key);

        // Check if limit exceeded
        if (requestCount >= max) {
          const oldestRequest = await redis.zrange(key, 0, 0, "WITHSCORES");
          const resetTime =
            oldestRequest.length > 1
              ? parseInt(oldestRequest[1]) + windowMs
              : now + windowMs;

          logger.warn(
            {
              identifier,
              requestCount,
              max,
              windowMs,
            },
            "Rate limit exceeded",
          );

          throw new RateLimitError(
            `Too many requests. Please try again in ${Math.ceil((resetTime - now) / 1000)} seconds.`,
            {
              limit: max,
              current: requestCount,
              resetAt: new Date(resetTime).toISOString(),
              retryAfter: Math.ceil((resetTime - now) / 1000),
            },
          );
        }

        // Add current request to sorted set
        await redis.zadd(key, now, `${now}-${Math.random()}`);

        // Set expiry on the key (cleanup)
        await redis.expire(key, Math.ceil(windowMs / 1000));

        // Calculate remaining requests
        const remaining = max - (requestCount + 1);

        // Return rate limit info to add to response headers
        return {
          rateLimit: {
            limit: max,
            remaining,
            reset: now + windowMs,
            identifier,
          },
        };
      } catch (error) {
        // Re-throw rate limit errors
        if (error instanceof RateLimitError) {
          throw error;
        }

        // Log Redis errors but don't block requests
        logger.error({ error }, "Rate limit Redis error");

        // Return default values if Redis fails
        return {
          rateLimit: {
            limit: max,
            remaining: max,
            reset: now + windowMs,
            identifier,
          },
        };
      }
    })
    .onAfterHandle(({ set, rateLimit }) => {
      // Add rate limit headers to response
      if (rateLimit) {
        set.headers["X-RateLimit-Limit"] = rateLimit.limit.toString();
        set.headers["X-RateLimit-Remaining"] = rateLimit.remaining.toString();
        set.headers["X-RateLimit-Reset"] = new Date(
          rateLimit.reset,
        ).toISOString();
      }
    });
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitPresets = {
  // Very strict - for sensitive operations
  strict: {
    max: 10,
    windowMs: 60000, // 10 req/min
  },

  // Standard - for most API endpoints
  standard: {
    max: 100,
    windowMs: 60000, // 100 req/min
  },

  // Relaxed - for read-heavy endpoints
  relaxed: {
    max: 300,
    windowMs: 60000, // 300 req/min
  },

  // Auth - for login/register
  auth: {
    max: 5,
    windowMs: 300000, // 5 req/5min
  },

  // Expensive operations
  expensive: {
    max: 10,
    windowMs: 3600000, // 10 req/hour
  },
};

/**
 * Skip rate limiting for certain conditions
 */
export function skipRateLimit(condition: (request: Request) => boolean) {
  return new Elysia({ name: "skip-rate-limit" }).derive(({ request }) => {
    return { skipRateLimit: condition(request) };
  });
}

/**
 * Example: Skip rate limit for admin users
 */
export const skipRateLimitForAdmin = new Elysia({
  name: "skip-rate-limit-admin",
}).derive(({ user }: any) => {
  return { skipRateLimit: user?.role === "ADMIN" };
});
