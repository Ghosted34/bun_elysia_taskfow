/**
 * RBAC Permissions System
 * Define roles and their associated permissions
 */

export type Role = "admin" | "manager" | "editor" | "viewer";

export type Permission =
  // Task permissions
  | "tasks:read"
  | "tasks:create"
  | "tasks:update"
  | "tasks:delete"
  // Project permissions
  | "projects:read"
  | "projects:create"
  | "projects:update"
  | "projects:delete"
  // User permissions
  | "users:read"
  | "users:create"
  | "users:update"
  | "users:delete";

/**
 * Role-Permission mapping
 * Defines which permissions each role has
 */
export const rolePermissions: Record<Role, Permission[]> = {
  admin: [
    // Full access to everything
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
  ],

  manager: [
    // Can manage tasks and projects, read users
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "tasks:delete",
    "projects:read",
    "projects:create",
    "projects:update",
    "projects:delete",
    "users:read",
  ],

  editor: [
    // Can create and edit tasks/projects, read users
    "tasks:read",
    "tasks:create",
    "tasks:update",
    "projects:read",
    "projects:create",
    "projects:update",
    "users:read",
  ],

  viewer: [
    // Read-only access
    "tasks:read",
    "projects:read",
    "users:read",
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has ALL of the specified permissions
 */
export function hasAllPermissions(
  role: Role,
  permissions: Permission[],
): boolean {
  const rolePerms = rolePermissions[role] ?? [];
  return permissions.every((p) => rolePerms.includes(p));
}

/**
 * Check if a role has ANY of the specified permissions
 */
export function hasAnyPermission(
  role: Role,
  permissions: Permission[],
): boolean {
  const rolePerms = rolePermissions[role] ?? [];
  return permissions.some((p) => rolePerms.includes(p));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}
