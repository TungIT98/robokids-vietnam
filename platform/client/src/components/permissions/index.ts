/**
 * Permissions Components Index
 * Exports all RBAC (Role-Based Access Control) components
 */

export { HasPermission, default } from './HasPermission';
export {
  PERMISSION_DEFINITIONS,
  ALL_PERMISSIONS,
  DEFAULT_SCHOOL_ADMIN_PERMISSIONS,
  PERMISSION_GROUPS,
  isValidPermission,
  type PermissionKey,
} from './permissions';
