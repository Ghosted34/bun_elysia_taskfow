/**
 * Authentication Middleware
 * Verify JWT tokens and attach user to request context
 */

import type { Context } from "elysia";
import { eq } from "drizzle-orm";
import { UnauthorizedError } from "../utils/error";
import { db } from "../../config/db";
import { users } from "../../config/db/schema";
import { verifyToken } from "../auth/jwt";
import { config } from "../config";
import { cache } from "../../config/redis";
import type { TokenPayload } from "../auth/types";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  name: string;
}

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | null): string {
  if (!authHeader) {
    throw new UnauthorizedError("No authorization header provided");
  }

  const [scheme, token] = authHeader.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new UnauthorizedError("Invalid authorization header format");
  }

  return token;
}

/**
 * Get user from cache or database
 */
async function getUserById(userId: string): Promise<AuthUser> {
  // Try cache first (performance optimization)
  const cacheKey = `user:${userId}`;
  const cachedUser = await cache.get<AuthUser>(cacheKey);

  if (cachedUser) {
    return cachedUser;
  }

  // Fetch from database
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      id: true,
      email: true,
      role: true,
      name: true,
    },
  });

  if (!user) {
    throw new UnauthorizedError("User not found");
  }

  // Cache for future requests
  await cache.set(cacheKey, user, 3600); // 1 hour

  return user as AuthUser;
}

/**
 * Authentication middleware
 * Verifies JWT and attaches user to context
 */
export async function authenticate(context: Context): Promise<AuthUser> {
  const authHeader = context.request.headers.get("authorization");
  const token = extractToken(authHeader);

  // Verify token
  const payload = (await verifyToken({
    token,
    secret: config.jwt.secret,
  })) as TokenPayload;

  // Get user details
  const user = await getUserById(payload.sub);

  return user;
}

/**
 * Optional authentication middleware
 * Attaches user if token is present, but doesn't fail if missing
 */
export async function optionalAuthenticate(
  context: Context,
): Promise<AuthUser | null> {
  try {
    const authHeader = context.request.headers.get("authorization");
    if (!authHeader) return null;

    const token = extractToken(authHeader);
    const payload = (await verifyToken({
      token,
      secret: config.jwt.secret,
    })) as TokenPayload;
    const user = await getUserById(payload.sub);

    return user;
  } catch (error) {
    return null;
  }
}
