import { RedisClient } from "bun";
import { logger } from "../src/utils/logger";

export const redis = new RedisClient();

redis.onconnect = () => {
  console.log("✅Connected to Redis server");
};

redis.onclose = (error) => {
  console.error("❌Disconnected from Redis server:", error);
};

const PREFIX = "revoked";

export async function revoke(jti: string, exp: number) {
  await redis.set(
    `${PREFIX}:${jti}`,
    `blacklisted at: ${new Date().toISOString()}`,
    "EX",
    exp,
  );
}

export async function isRevoked(jti: string) {
  return await redis.exists(`${PREFIX}:${jti}`);
}

// Health check
export async function checkRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    logger.error({ error }, "Redis health check failed");
    return false;
  }
}

// Graceful shutdown
export async function closeRedisConnection(): Promise<void> {
  await redis.close();
}

export class Cache {
  private prefix: string;

  constructor(prefix: string = "app") {
    this.prefix = prefix;
  }

  /**
   * Get cached value
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await redis.get(this.getKey(key));
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return value as T;
    }
  }

  /**
   * Set cached value with TTL
   */
  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    ttl
      ? await redis.setex(this.getKey(key), ttl, serialized)
      : await redis.set(this.getKey(key), serialized);
  }

  /**
   * Delete cached value
   */
  async delete(key: string): Promise<void> {
    await redis.del(this.getKey(key));
  }

  /**
   * Delete multiple keys matching pattern
   */
  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(this.getKey(pattern));
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    return await redis.exists(this.getKey(key));
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const value = await fetcher();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * Increment counter
   */
  async increment(key: string, ttl?: number): Promise<number> {
    const value = await redis.incr(this.getKey(key));
    if (ttl) {
      await redis.expire(this.getKey(key), ttl);
    }
    return value;
  }

  /**
   * Add to set
   */
  async addToSet(key: string, ...members: string[]): Promise<void> {
    await redis.sadd(this.getKey(key), ...members);
  }

  /**
   * Get set members
   */
  async getSetMembers(key: string): Promise<string[]> {
    return await redis.smembers(this.getKey(key));
  }

  /**
   * Remove from set
   */
  async removeFromSet(key: string, ...members: string[]): Promise<void> {
    await redis.srem(this.getKey(key), ...members);
  }

  private getKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}

// Create default cache instance
export const cache = new Cache();
