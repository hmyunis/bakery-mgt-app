/**
 * Valid user roles matching the backend User.ROLE_CHOICES
 * @see api/users/models.py
 */
export const VALID_ROLES = ["admin", "storekeeper", "chef", "cashier"] as const;

export type UserRole = (typeof VALID_ROLES)[number];

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
export function getRoleColor(role: string): "primary" | "secondary" | "success" | "warning" | "danger" | "default" {
  switch (role.toLowerCase()) {
    case "admin":
      return "danger"; // Red for admin (highest authority)
    case "storekeeper":
      return "primary"; // Primary color for storekeeper
    case "chef":
      return "warning"; // Orange/yellow for chef
    case "cashier":
      return "success"; // Green for cashier
    default:
      return "default";
  }
}

