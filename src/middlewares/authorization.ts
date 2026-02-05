import type { AuthUser } from "./authentication";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
  type Role,
} from "../utils/permissions";
import { ForbiddenError } from "../utils/error";
import type { Context } from "elysia";

/**
 * Require specific permission
 * Use this to protect routes that need specific permissions
 */
export function requirePermission(permission: Permission) {
  return (ctx: Context) => {
    if (!hasPermission(ctx.user.role as Role, permission)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required: ${permission}`,
        { required: permission, userRole: ctx.user.role },
      );
    }
  };
}

/**
 * Require any of the specified permissions
 */
export function requireAnyPermission(permissions: Permission[]) {
  return (user: AuthUser) => {
    if (!hasAnyPermission(user.role as Role, permissions)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required one of: ${permissions.join(", ")}`,
        { required: permissions, userRole: user.role },
      );
    }
  };
}

/**
 * Require specific role
 */
export function requireRole(role: Role) {
  return (user: AuthUser) => {
    if (user.role !== role) {
      throw new ForbiddenError(`Insufficient role. Required: ${role}`, {
        required: role,
        userRole: user.role,
      });
    }
  };
}

/**
 * Require any of the specified roles
 */
export function requireAnyRole(roles: Role[]) {
  return (user: AuthUser) => {
    if (!roles.includes(user.role as Role)) {
      throw new ForbiddenError(
        `Insufficient role. Required one of: ${roles.join(", ")}`,
        { required: roles, userRole: user.role },
      );
    }
  };
}

/**
 * Check if user owns resource
 * Useful for allowing users to edit their own content
 */
export function requireOwnership(resourceOwnerId: string) {
  return (user: AuthUser) => {
    if (user.id !== resourceOwnerId && user.role !== "ADMIN") {
      throw new ForbiddenError("You can only modify your own resources", {
        resourceOwnerId,
        userId: user.id,
      });
    }
  };
}
