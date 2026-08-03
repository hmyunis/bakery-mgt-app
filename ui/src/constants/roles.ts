/**
 * Valid user roles matching the backend User.ROLE_CHOICES
 * @see api/users/models.py
 */
export const VALID_ROLES = ["admin", "staff"] as const;

export type UserRole = (typeof VALID_ROLES)[number];

export const PAGE_PERMISSIONS = [
    "dashboard",
    "sales",
    "treasury",
    "production",
    "inventory",
    "users",
    "employees",
    "hr",
    "audit_logs",
    "settings",
] as const;

export type PagePermission = (typeof PAGE_PERMISSIONS)[number];

export function hasPagePermission(
    role: UserRole | undefined,
    permissions: PagePermission[] | undefined,
    permission: PagePermission
) {
    return role === "admin" || !!permissions?.includes(permission);
}

const PERMISSION_PATHS: Record<PagePermission, string> = {
    dashboard: "/app/dashboard",
    sales: "/app/sales",
    treasury: "/app/treasury",
    production: "/app/production",
    inventory: "/app/inventory",
    users: "/app/users",
    employees: "/app/employees",
    hr: "/app/hr",
    audit_logs: "/app/audit-logs",
    settings: "/app/settings",
};

export function getDefaultAppPath(role: UserRole | undefined, permissions: PagePermission[] = []) {
    if (role === "admin") return PERMISSION_PATHS.dashboard;
    const permission = permissions.find((value) => PAGE_PERMISSIONS.includes(value));
    return permission ? PERMISSION_PATHS[permission] : "/access-denied";
}

/**
 * Check if a string is a valid role
 */
export function isValidRole(role: string | undefined | null): role is UserRole {
    return role !== undefined && role !== null && VALID_ROLES.includes(role as UserRole);
}

/**
 * Get a valid role or return undefined
 */
export function getValidRole(role: string | undefined | null): UserRole | undefined {
    return isValidRole(role) ? role : undefined;
}

/**
 * Get the chip color for a role
 * Maps each role to a HeroUI Chip color variant
 */
export function getRoleColor(
    role: string
): "primary" | "secondary" | "success" | "warning" | "danger" | "default" {
    switch (role.toLowerCase()) {
        case "admin":
            return "danger"; // Red for admin (highest authority)
        case "staff":
            return "primary";
        default:
            return "default";
    }
}
