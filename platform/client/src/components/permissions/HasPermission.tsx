/**
 * HasPermission Component
 * Conditionally renders children based on user permissions
 * Works with school_admin role to check granular permissions
 */

import { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import type { PermissionKey } from './permissions';

interface HasPermissionProps {
  /** Permission key(s) to check */
  permission: PermissionKey | PermissionKey[];
  /** How to check multiple permissions - any (OR) or all (AND) */
  mode?: 'any' | 'all';
  /** Children to render if permission check passes */
  children: ReactNode;
  /** Optional fallback to render if permission check fails */
  fallback?: ReactNode;
  /** If true, show no fallback and return null on failure (hides the content) */
  hideOnUnauthorized?: boolean;
}

/**
 * Check if user has the required permission(s)
 */
function checkPermission(
  userPermissions: string[] | null | undefined,
  requiredPermissions: PermissionKey | PermissionKey[],
  mode: 'any' | 'all'
): boolean {
  // If no permissions loaded yet, deny by default
  if (!userPermissions) return false;

  const permissions = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  if (mode === 'any') {
    return permissions.some((perm) => userPermissions.includes(perm));
  } else {
    return permissions.every((perm) => userPermissions.includes(perm));
  }
}

/**
 * HasPermission - Conditional rendering based on permissions
 *
 * @example
 * // Single permission
 * <HasPermission permission="students:write">
 *   <AddStudentButton />
 * </HasPermission>
 *
 * @example
 * // Multiple permissions (any = OR)
 * <HasPermission permission={['students:write', 'teachers:write']} mode="any">
 *   <AddButton />
 * </HasPermission>
 *
 * @example
 * // Multiple permissions (all = AND)
 * <HasPermission permission={['billing:read', 'reports:read']} mode="all">
 *   <AnalyticsPanel />
 * </HasPermission>
 */
export function HasPermission({
  permission,
  mode = 'any',
  children,
  fallback = null,
  hideOnUnauthorized = false,
}: HasPermissionProps) {
  const { user, hasRole } = useAuth();

  // Only school_admin uses granular permissions
  // For other roles, fall back to role-based check
  if (!hasRole('school_admin')) {
    // For non-school_admin roles, we don't have granular permissions
    // The parent RequireRole should handle this, so we show children
    return <>{children}</>;
  }

  // Get school admin permissions from user metadata
  // These are loaded separately and stored in user object
  const userPermissions = user?.permissions as string[] | null | undefined;

  const hasRequiredPermission = checkPermission(userPermissions, permission, mode);

  if (hasRequiredPermission) {
    return <>{children}</>;
  }

  if (hideOnUnauthorized) {
    return null;
  }

  return <>{fallback}</>;
}

export default HasPermission;