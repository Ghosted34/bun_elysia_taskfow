/**
 * Auth Routes
 * Authentication endpoints - register, login, refresh, logout
 */

import { Elysia, t } from "elysia";
import { AuthService } from "./auth.service";
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from "./auth.schema";
import { authenticate } from "@/shared/middleware/auth";

const authService = new AuthService();

export const authRoutes = new Elysia({ prefix: "/auth" })
  /**
   * POST /auth/register
   * Register a new user account
   */
  .post(
    "/register",
    async ({ body }) => {
      const validated = registerSchema.parse(body);
      const result = await authService.register(validated);

      return {
        message: "Registration successful",
        data: result,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
        name: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Register new user",
        description: "Create a new user account with email and password",
      },
    },
  )

  /**
   * POST /auth/login
   * Login with email and password
   */
  .post(
    "/login",
    async ({ body }) => {
      const validated = loginSchema.parse(body);
      const result = await authService.login(validated);

      return {
        message: "Login successful",
        data: result,
      };
    },
    {
      body: t.Object({
        email: t.String(),
        password: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Login user",
        description: "Authenticate user with email and password",
      },
    },
  )

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  .post(
    "/refresh",
    async ({ body }) => {
      const validated = refreshTokenSchema.parse(body);
      const result = await authService.refreshAccessToken(
        validated.refreshToken,
      );

      return {
        message: "Token refreshed successfully",
        data: result,
      };
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description: "Get a new access token using a valid refresh token",
      },
    },
  )

  /**
   * POST /auth/logout
   * Logout and revoke refresh token
   */
  .post(
    "/logout",
    async ({ body }) => {
      const validated = refreshTokenSchema.parse(body);
      await authService.logout(validated.refreshToken);

      return {
        message: "Logout successful",
      };
    },
    {
      body: t.Object({
        refreshToken: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Logout user",
        description: "Revoke refresh token and logout user",
      },
    },
  )

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  .get(
    "/me",
    async ({ request }) => {
      const user = await authenticate({ request } as any);

      return {
        message: "User retrieved successfully",
        data: user,
      };
    },
    {
      detail: {
        tags: ["Auth"],
        summary: "Get current user",
        description: "Get the currently authenticated user details",
      },
    },
  )

  /**
   * POST /auth/change-password
   * Change user password
   */
  .post(
    "/change-password",
    async ({ request, body }) => {
      const user = await authenticate({ request } as any);
      const validated = changePasswordSchema.parse(body);

      await authService.changePassword(
        user.id,
        validated.currentPassword,
        validated.newPassword,
      );

      return {
        message: "Password changed successfully",
      };
    },
    {
      body: t.Object({
        currentPassword: t.String(),
        newPassword: t.String(),
      }),
      detail: {
        tags: ["Auth"],
        summary: "Change password",
        description: "Change the authenticated user's password",
      },
    },
  );
