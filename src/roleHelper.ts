import { User, UserRole } from "./types";

/**
 * Checks if a user has a specific role, either as their primary role
 * or within their secondary roles array.
 */
export const hasRole = (user: User | null | undefined, role: UserRole | string): boolean => {
  if (!user) return false;
  return user.role === role || !!user.roles?.includes(role as UserRole);
};
