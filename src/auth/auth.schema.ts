/**
 * Auth Validation Schemas
 * Request/Response validation for authentication endpoints
 */

import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must not exceed 100 characters"),
  full_name: z
    .string()
    .min(1, "Name is required")
    .max(255, "Name must not exceed 255 characters"),
  role: z.enum(["manager", "admin", "editor", "viewer"], {
    errorMap: () => ({
      message: "Role must be either 'manager', 'admin', 'editor', or 'viewer'",
    }),
  }),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
  role: z
    .enum(["manager", "admin", "editor", "viewer"], {
      errorMap: () => ({
        message:
          "Role must be either 'manager', 'admin', 'editor', or 'viewer'",
      }),
    })
    .default("viewer"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "New password must be at least 8 characters")
    .max(100, "New password must not exceed 100 characters"),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
