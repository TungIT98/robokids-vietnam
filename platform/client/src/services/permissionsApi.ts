/**
 * School Admin Permissions API
 * Fetches and manages school admin permissions from the backend
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3100';

interface ApiOptions {
  token?: string | null;
}

export interface SchoolAdminPermissions {
  school_id: string;
  user_id: string;
  permissions: string[];
  created_at?: string;
  updated_at?: string;
}

// ============================================
// PERMISSIONS API
// ============================================

export const permissionsApi = {
  /**
   * Get permissions for the current school_admin user
   */
  getMyPermissions: async (options?: ApiOptions): Promise<SchoolAdminPermissions> => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/school-admin/permissions/me`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch permissions');
    return data;
  },

  /**
   * Get permissions for a specific school_admin user
   */
  getUserPermissions: async (userId: string, schoolId: string, options?: ApiOptions): Promise<SchoolAdminPermissions> => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/school-admin/permissions/${userId}?school_id=${schoolId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to fetch user permissions');
    return data;
  },

  /**
   * Update permissions for a school_admin user
   */
  updatePermissions: async (
    userId: string,
    schoolId: string,
    permissions: string[],
    options?: ApiOptions
  ): Promise<SchoolAdminPermissions> => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/school-admin/permissions/${userId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ school_id: schoolId, permissions }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update permissions');
    return data;
  },

  /**
   * List all school_admins for a school with their permissions
   */
  listSchoolAdmins: async (schoolId: string, options?: ApiOptions): Promise<SchoolAdminPermissions[]> => {
    const { token } = options || {};
    const response = await fetch(`${API_BASE}/api/school-admin/permissions?school_id=${schoolId}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to list school admins');
    return data;
  },
};

export default permissionsApi;