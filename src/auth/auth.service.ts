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
  BadRequestError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from "../utils/error";
import type { User } from "../../config/db/schema";
import { signToken, verifyToken } from "./jwt";
import { config } from "../config";

const authRepo = new AuthRepo();

export class AuthService {
  /**
   * Register new user
   */
  async register(input: RegisterInput) {
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
    const user = await authRepo.findOne({
      field: "email",
      value: input.email,
      select: ["id", "email", "password", "full_name"],
    });

    if (!user) {
      throw new NotFoundError("Invalid credentials");
    }

    // Verify password
    const isValidPassword = await this.verifyPassword(
      input.password,
      user.password,
    );

    if (!isValidPassword) {
      throw new UnauthorizedError("Invalid credentials");
    }

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
  async refreshToken(token:string) {
    // Verify refresh token
    const payload = await verifyToken({
      token,
      secret: config.jwt.refreshSecret,
    });

    // Check if token exists and is not revoked
    const cachedRefresh = await cache.get(
      `refreshToken:${payload.sub}:${payload.device}`,
    );

    if (!cachedRefresh) {
      throw new UnauthorizedError("Please Log In");
    }

    // Get user
    const user = await authRepo.findOneById({
      id: payload.sub,
      select: ["id", "role"],
    });

    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    // Generate new access token
    const accessToken = await signToken({
      payload: { sub: user.id, role: user.role || "", device:payload.device, type: "access" },
      time: 900,
      secret: config.jwt.secret,
    });

    return { accessToken };
  }

  /**
   * Logout (revoke access and refresh token)
   */
  async logout(token: string) {
    const payload = await verifyToken({ token, secret: config.jwt.secret });

    const refreshKey = `refreshToken:${payload.sub}:${payload.device}`;
    // Check if token exists and is not revoked
    const cachedRefresh = await cache.get(refreshKey);

    if (!cachedRefresh) {
      throw new UnauthorizedError("Please Log In");
    }
    await Promise.all([
      cache.set(`blacklisted:${token}`, `Blacklisted!!!`, 900),
      cache.delete(refreshKey),
    ]);
    return { message: "Logged Out" };
  }

  /**
   * LogoutAll (revoke access and refresh tokens for all devices)
   */
  async logoutAll(id: string) {
    await this.clearAllTokens(id);
    return { message: "Logged Out" };
  }

  /**
   * Change password
   */
  async changePassword(
    id: string,
    currentPassword: string,
    newPassword: string,
  ) {
    // Get user
    const cached = await authRepo.findOneById({ id, select: ["password"] });

    if (!cached) {
      throw new NotFoundError("User not found");
    }

    // Verify current password
    const isValidPassword = await this.verifyPassword(
      currentPassword,
      cached.password,
    );

    if (!isValidPassword) {
      throw new BadRequestError("Current password is incorrect");
    }

    // Hash new password
    const hashedPassword = await this.hashPassword(newPassword);

    // Update password
    await authRepo.update({
      id,
      data: { password: hashedPassword },
      select: ["id", "full_name", "role"],
    });
    await this.clearAllTokens(id);

    return { message: "Password changed. Please Log In Again" };
  }

  private async clearAllTokens(id: string) {
    const pattern = `refreshToken:${id}:*`;

    await Promise.all([
      cache.deletePattern(pattern),
      cache.set(`access:${id}`, Date.now(), 900),
    ]);
    return;
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
    const accessToken = await signToken({
      payload: { ...tokenPayload, type: "access", device },
      secret: config.jwt.secret,
      time: config.jwt.expiry as StringValue,
    });
    const refreshToken = await signToken({
      payload: { ...tokenPayload, type: "refresh", device },
      secret: config.jwt.refreshSecret,
      time: config.jwt.refreshExpiry as StringValue,
    });

    // cache refresh token in redis with expiry
    const refreshTokenExpiry = 60 * 60 * 24 * 1;

    await cache.set(
      `refreshToken:${tokenPayload.sub}:${device}`,
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
