/**
 * Auth Service
 * Business logic for authentication and authorization
 */

import type { StringValue } from "ms";
import crypto from "crypto";
import { cache } from "../../config/redis";
import type { RegisterInput, LoginInput } from "./auth.schema";
import { AuthRepo } from "./auth.repository";
import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/error";
import type { User } from "../../config/db/schema";
import { signToken } from "./jwt";
import { config } from "../config";

const authRepo = new AuthRepo();

export class AuthService {
  /**
   * Register new user
   */
  async register(input: RegisterInput) {
    // Check if user already exists

    const existingUser = await authRepo.findOne({
      field: "email",
      value: input.email,
      select: ["id", "email"],
    });

    if (existingUser) {
      throw new ConflictError("Email already registered");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(input.password);

    const [user] = await authRepo.create({
      data: {
        email: input.email,
        password: hashedPassword,
        name: input.full_name,
        role: "viewer",
      },
      select: ["id", "email", "full_name", "role"],
    });

    // Generate tokens
    const tokens = await this.generateTokenPair(user as User);

    return {
      user,
      ...tokens,
    };
  }

  /**
   * Login user
   */
  async login(input: LoginInput) {
    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, input.email),
    });

    if (!user) {
      throw new NotFoundError("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(input.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // Update last login timestamp
    await db
      .update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, user.id));

    // Generate tokens
    const tokens = await this.generateTokenPair(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(token: string) {
    // Verify refresh token
    const payload = verifyRefreshToken(token);

    // Check if token exists and is not revoked
    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.id, payload.tokenId),
        eq(refreshTokens.isRevoked, false),
      ),
    });

    if (!storedToken) {
      throw new UnauthorizedError("Invalid refresh token");
    }

    // Check expiration
    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedError("Refresh token expired");
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId),
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { accessToken };
  }

  /**
   * Logout (revoke refresh token)
   */
  async logout(token: string) {
    const payload = verifyRefreshToken(token);

    // Revoke the refresh token
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.id, payload.tokenId));

    // Invalidate user cache
    await cache.delete(`user:${payload.userId}`);
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllTokens(userId: string) {
    await db
      .update(refreshTokens)
      .set({ isRevoked: true })
      .where(eq(refreshTokens.userId, userId));

    // Invalidate user cache
    await cache.delete(`user:${userId}`);
  }

  /**
   * Change password
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Get user
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      throw new NotFoundError("User not found");
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new BadRequestError("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, config.bcrypt.rounds);

    // Update password
    await db
      .update(users)
      .set({ password: hashedPassword, updatedAt: new Date() })
      .where(eq(users.id, userId));

    // Revoke all refresh tokens (force re-login on all devices)
    await this.revokeAllTokens(userId);

    // Invalidate user cache
    await cache.delete(`user:${userId}`);
  }

  /**
   * Generate access and refresh token pair
   */
  private async generateTokenPair(user: User) {
    const tokenPayload = {
      sub: user.id,
      role: user.role || undefined,
    };
    const device = this.generateDeviceId();

    // Generate access token
    const accessToken = signToken({
      payload: { ...tokenPayload, type: "access", deviceId: device },
      secret: config.jwt.secret,
      time: config.jwt.expiry as StringValue,
    });
    const refreshToken = signToken({
      payload: { ...tokenPayload, type: "refresh", deviceId: device },
      secret: config.jwt.refreshSecret,
      time: config.jwt.refreshExpiry as StringValue,
    });

    // cache refresh token in redis with expiry
    const refreshTokenExpiry =
      typeof config.jwt.refreshExpiry === "string"
        ? parseInt(config.jwt.refreshExpiry)
        : config.jwt.refreshExpiry;

    await cache.set(
      `refreshToken:${tokenPayload.sub}`,
      refreshToken,
      refreshTokenExpiry,
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  private async hashPassword(password: string) {
    return await Bun.password.hash(password, {
      algorithm: "bcrypt",
      cost: 10,
    });
  }

  private async verifyPassword(password: string, hash: string) {
    return await Bun.password.verify(password, hash);
  }

  private generateDeviceId() {
    return crypto.randomBytes(16).toString("hex");
  }
}
