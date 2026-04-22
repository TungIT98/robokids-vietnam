/**
 * useSchoolAdminPermissions Hook
 * Fetches and manages school admin permissions
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { permissionsApi, type SchoolAdminPermissions } from '../services/permissionsApi';
import type { PermissionKey } from '../components/permissions/permissions';

interface UseSchoolAdminPermissionsReturn {
  permissions: PermissionKey[];
  isLoading: boolean;
  error: string | null;
  hasPermission: (permission: PermissionKey) => boolean;
  hasAnyPermission: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions: (permissions: PermissionKey[]) => boolean;
  refetch: () => Promise<void>;
}

/**
 * Hook to access and manage school admin permissions
 * Must be used within AuthProvider
 */
export function useSchoolAdminPermissions(): UseSchoolAdminPermissionsReturn {
  const { user, token, hasRole } = useAuth();
  const [permissions, setPermissions] = useState<PermissionKey[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    // Only fetch for school_admin role
    if (!hasRole('school_admin') || !user?.id || !user?.school_id) {
      setPermissions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await permissionsApi.getMyPermissions({ token });
      setPermissions(data.permissions as PermissionKey[]);
    } catch (err: any) {
      console.error('Failed to fetch school admin permissions:', err);
      setError(err.message || 'Không thể tải quyền hạn');
      setPermissions([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, user?.school_id, token, hasRole]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const hasPermission = useCallback(
    (permission: PermissionKey): boolean => {
      return permissions.includes(permission);
    },
    [permissions]
  );

  const hasAnyPermission = useCallback(
    (perms: PermissionKey[]): boolean => {
      return perms.some((p) => permissions.includes(p));
    },
    [permissions]
  );

  const hasAllPermissions = useCallback(
    (perms: PermissionKey[]): boolean => {
      return perms.every((p) => permissions.includes(p));
    },
    [permissions]
  );

  return {
    permissions,
    isLoading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refetch: fetchPermissions,
  };
}

export default useSchoolAdminPermissions;