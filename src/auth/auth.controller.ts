/**
 * Auth Controller
 * Handles HTTP request/response logic
 * Sits between routes and service layer
 */

import type { Context } from 'elysia';
import { AuthService } from './auth.service';
import { 
  registerSchema, 
  loginSchema, 
  refreshTokenSchema,
  changePasswordSchema 
} from './auth.schema';
import { authenticate } from '../middlewares/authentication';


const authService = new AuthService();

export class AuthController {
  /**
   * Register new user
   * POST /auth/register
   */
  async register(ctx: Context) {
    // Validate request body
    const validated = registerSchema.parse(ctx.body);
    
    // Call service layer
    const result = await authService.register(validated);
    
    // Return response
    return {
      message: 'Registration successful',
      data: result,
    };
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(ctx: Context) {
    const validated = loginSchema.parse(ctx.body);
    const result = await authService.login(validated);
    
    return {
      message: 'Login successful',
      data: result,
    };
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  async refresh(ctx: Context) {
    const validated = refreshTokenSchema.parse(ctx.body);
    const result = await authService.refreshToken(validated.refreshToken);
    
    return {
      message: 'Token refreshed successfully',
      data: result,
    };
  }

  /**
   * Logout user
   * POST /auth/logout
   */
  async logout(ctx: Context) {
    const validated = refreshTokenSchema.parse(ctx.body);
    await authService.logout(validated.refreshToken);
    
    return {
      message: 'Logout successful',
    };
  }

  /**
   * Get current authenticated user
   * GET /auth/me
   */
  async getMe(ctx: Context) {
    const user = await authenticate(ctx);
    
    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  /**
   * Change password
   * POST /auth/change-password
   */
  async changePassword(ctx: Context) {
    const user = await authenticate(ctx);
    const validated = changePasswordSchema.parse(ctx.body);
    
    await authService.changePassword(
      user.id,
      validated.currentPassword,
      validated.newPassword
    );
    
    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Logout from all devices
   * POST /auth/logout-all
   */
  async logoutAll(ctx: Context) {
    const user = await authenticate(ctx);
    await authService.logoutAll(user.id);
    
    return {
      message: 'Logged out from all devices',
    };
  }
}