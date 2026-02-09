import type { Context } from "elysia";
import type { AuthUser } from "./authentication";
import {
  hasAnyPermission,
  hasPermission,
  type Permission,
  type Role,
} from "../utils/permissions";
import { ForbiddenError } from "../utils/error";

/**
 * Internal helper
 */
function getUser(ctx: Context): AuthUser {
  if (!ctx.user) {
    throw new ForbiddenError("Unauthenticated");
  }
  return ctx.user;
}

/**
 * Require a specific permission
 */
export const requirePermission =
  (permission: Permission) => async (ctx: Context) => {
    const user = getUser(ctx);

    if (!hasPermission(user.role as Role, permission)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required: ${permission}`,
        {
          required: permission,
          userRole: user.role,
        },
      );
    }
  };

/**
 * Require ANY of the specified permissions
 */
export const requireAnyPermission =
  (permissions: Permission[]) => async (ctx: Context) => {
    const user = getUser(ctx);

    if (!hasAnyPermission(user.role as Role, permissions)) {
      throw new ForbiddenError(
        `Insufficient permissions. Required one of: ${permissions.join(", ")}`,
        {
          required: permissions,
          userRole: user.role,
        },
      );
    }
  };

/**
 * Require a specific role
 */
export const requireRole = (role: Role) => async (ctx: Context) => {
  const user = getUser(ctx);

  if (user.role !== role) {
    throw new ForbiddenError(`Insufficient role. Required: ${role}`, {
      required: role,
      userRole: user.role,
    });
  }
};

/**
 * Require ANY of the specified roles
 */
export const requireAnyRole = (roles: Role[]) => async (ctx: Context) => {
  const user = getUser(ctx);

  if (!roles.includes(user.role as Role)) {
    throw new ForbiddenError(
      `Insufficient role. Required one of: ${roles.join(", ")}`,
      {
        required: roles,
        userRole: user.role,
      },
    );
  }
};

/**
 * Require ownership of a resource
 * (Admins bypass automatically)
 */
export const requireOwnership =
  (resourceOwnerId: string) => async (ctx: Context) => {
    const user = getUser(ctx);

    if (user.id !== resourceOwnerId && user.role !== "ADMIN") {
      throw new ForbiddenError("You can only modify your own resources", {
        resourceOwnerId,
        userId: user.id,
      });
    }
  };
