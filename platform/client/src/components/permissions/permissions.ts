/**
 * Permission constants for School Admin Role-Based Access Control (RBAC)
 * These permissions are checked against the school_admin's assigned permissions in the database
 */

// Permission definitions with labels and descriptions
export const PERMISSION_DEFINITIONS = {
  // Student permissions
  'students:read': { label: 'Xem danh sách học sinh', description: 'Cho phép xem danh sách học sinh' },
  'students:write': { label: 'Tạo/Sửa học sinh', description: 'Cho phép tạo mới và chỉnh sửa thông tin học sinh' },
  'students:delete': { label: 'Xóa học sinh', description: 'Cho phép xóa học sinh khỏi trường' },

  // Teacher permissions
  'teachers:read': { label: 'Xem danh sách giáo viên', description: 'Cho phép xem danh sách giáo viên' },
  'teachers:write': { label: 'Quản lý giáo viên', description: 'Cho phép thêm, sửa thông tin giáo viên' },

  // Curriculum permissions
  'curriculum:read': { label: 'Xem giáo trình', description: 'Cho phép xem nội dung giáo trình' },
  'curriculum:write': { label: 'Tạo/Sửa giáo trình', description: 'Cho phép tạo mới và chỉnh sửa giáo trình' },

  // Billing permissions
  'billing:read': { label: 'Xem hóa đơn', description: 'Cho phép xem thông tin thanh toán và hóa đơn' },

  // Reports/Analytics permissions
  'reports:read': { label: 'Xem báo cáo', description: 'Cho phép xem báo cáo phân tích và thống kê' },

  // Settings permissions
  'settings:write': { label: 'Cài đặt trường', description: 'Cho phép thay đổi cài đặt của trường' },

  // Dashboard access
  'dashboard:read': { label: 'Truy cập dashboard', description: 'Cho phép truy cập trang quản lý chính' },
} as const;

// Type for permission keys
export type PermissionKey = keyof typeof PERMISSION_DEFINITIONS;

// All permission keys as array for iteration
export const ALL_PERMISSIONS: PermissionKey[] = Object.keys(PERMISSION_DEFINITIONS) as PermissionKey[];

// Default permissions for a new school admin (minimal access)
export const DEFAULT_SCHOOL_ADMIN_PERMISSIONS: PermissionKey[] = [
  'dashboard:read',
  'students:read',
  'teachers:read',
  'curriculum:read',
];

// Permission groups for UI organization
export const PERMISSION_GROUPS = {
  'Học sinh': ['students:read', 'students:write', 'students:delete'],
  'Giáo viên': ['teachers:read', 'teachers:write'],
  'Giáo trình': ['curriculum:read', 'curriculum:write'],
  'Thanh toán': ['billing:read'],
  'Báo cáo': ['reports:read'],
  'Cài đặt': ['settings:write'],
  'Dashboard': ['dashboard:read'],
} as const;

// Helper to check if a permission string is valid
export function isValidPermission(permission: string): permission is PermissionKey {
  return permission in PERMISSION_DEFINITIONS;
}