/**
 * Auth Routes (Refactored)
 * Pure route definitions - delegates to controller
 */

import { Elysia, t } from 'elysia';
import { AuthController } from './auth.controller';

const authController = new AuthController();

export const authRoutes = new Elysia({ prefix: '/auth' })
  /**
   * POST /auth/register
   * Register a new user account
   */
  .post('/register', (ctx) => authController.register(ctx), {
    body: t.Object({
      email: t.String(),
      password: t.String(),
      name: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Register new user',
      description: 'Create a new user account with email and password',
    },
  })

  /**
   * POST /auth/login
   * Login with email and password
   */
  .post('/login', (ctx) => authController.login(ctx), {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Login user',
      description: 'Authenticate user with email and password',
    },
  })

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  .post('/refresh', (ctx) => authController.refresh(ctx), {
    body: t.Object({
      refreshToken: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Refresh access token',
      description: 'Get a new access token using a valid refresh token',
    },
  })

  /**
   * POST /auth/logout
   * Logout and revoke refresh token (single device)
   */
  .post('/logout', (ctx) => authController.logout(ctx), {
    body: t.Object({
      refreshToken: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Logout user',
      description: 'Revoke refresh token and logout from current device',
    },
  })

  /**
   * POST /auth/logout-all
   * Logout from all devices
   */
  .post('/logout-all', (ctx) => authController.logoutAll(ctx), {
    detail: {
      tags: ['Auth'],
      summary: 'Logout from all devices',
      description: 'Revoke all refresh tokens and logout from all devices',
    },
  })

  /**
   * GET /auth/me
   * Get current authenticated user
   */
  .get('/me', (ctx) => authController.getMe(ctx), {
    detail: {
      tags: ['Auth'],
      summary: 'Get current user',
      description: 'Get the currently authenticated user details',
    },
  })

  /**
   * POST /auth/change-password
   * Change user password
   */
  .post('/change-password', (ctx) => authController.changePassword(ctx), {
    body: t.Object({
      currentPassword: t.String(),
      newPassword: t.String(),
    }),
    detail: {
      tags: ['Auth'],
      summary: 'Change password',
      description: 'Change the authenticated user\'s password',
    },
  });