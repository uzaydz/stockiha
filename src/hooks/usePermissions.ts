/**
 * Hook موحد للصلاحيات
 * يدعم العمل مع PermissionsContext أو مباشرة مع PermissionService
 * تاريخ التحديث: 2025-12-10
 */

import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PermissionsContext } from '@/context/PermissionsContext';
import { permissionService } from '@/lib/permissions/PermissionService';
import { permissionSyncService } from '@/lib/permissions/PermissionSyncService';
import { Permission, UserPermissionData } from '@/types/permissions';

// ========================================
// الـ Hook الرئيسي - يستخدم Context
// ========================================
export const usePermissions = () => {
  const context = useContext(PermissionsContext);

  // إذا لم يكن PermissionsProvider متوفراً، استخدم PermissionService مباشرة
  if (!context) {
    return usePermissionsService();
  }

  return context;
};

// ========================================
// Hook بديل يستخدم PermissionService مباشرة
// ========================================
export const usePermissionsService = () => {
  const [isReady, setIsReady] = useState(permissionService.isReady());
  const [data, setData] = useState<UserPermissionData | null>(
    permissionService.getCurrentPermissions()
  );

  // الاستماع لتغييرات الصلاحيات
  useEffect(() => {
    const unsubscribe = permissionService.addListener(() => {
      setData(permissionService.getCurrentPermissions());
      setIsReady(permissionService.isReady());
    });

    return unsubscribe;
  }, []);

  // فحص صلاحية واحدة
  const has = useCallback((permission: Permission | string): boolean => {
    return permissionService.hasPermission(permission);
  }, [data]);

  // فحص أي صلاحية من قائمة
  const anyOf = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissionService.hasAnyPermission(permissions);
  }, [data]);

  // فحص جميع الصلاحيات
  const allOf = useCallback((permissions: (Permission | string)[]): boolean => {
    return permissionService.hasAllPermissions(permissions);
  }, [data]);

  // تحديث الصلاحيات من السيرفر
  const refresh = useCallback(async () => {
    await permissionSyncService.forceSync();
    setData(permissionService.getCurrentPermissions());
    setIsReady(permissionService.isReady());
  }, []);

  // القيم المحسوبة
  const isOrgAdmin = useMemo(() => data?.isOrgAdmin === true, [data]);
  const isSuperAdmin = useMemo(() => data?.isSuperAdmin === true, [data]);
  const role = useMemo(() => data?.role || null, [data]);
  const isAdmin = useMemo(() => permissionService.isAdmin(), [data]);

  return {
    loading: false,
    ready: isReady,
    error: null,
    data,
    has,
    anyOf,
    allOf,
    isOrgAdmin,
    isSuperAdmin,
    isAdmin,
    role,
    refresh
  };
};

// ========================================
// Hook للتحقق من صلاحية محددة
// ========================================
export const useHasPermission = (permission: Permission | string): boolean => {
  const { has, ready } = usePermissions();
  return ready ? has(permission) : false;
};

// ========================================
// Hook للتحقق من أي صلاحية
// ========================================
export const useHasAnyPermission = (permissions: (Permission | string)[]): boolean => {
  const { anyOf, ready } = usePermissions();
  return ready ? anyOf(permissions) : false;
};

// ========================================
// Hook للتحقق من جميع الصلاحيات
// ========================================
export const useHasAllPermissions = (permissions: (Permission | string)[]): boolean => {
  const { allOf, ready } = usePermissions();
  return ready ? allOf(permissions) : false;
};

// ========================================
// Hook للتحقق من دور المستخدم
// ========================================
export const useUserRole = () => {
  const { role, isOrgAdmin, isSuperAdmin, ready } = usePermissions();

  return {
    role,
    isOrgAdmin,
    isSuperAdmin,
    isAdmin: isOrgAdmin || isSuperAdmin || role === 'admin' || role === 'owner',
    isEmployee: role === 'employee' || role === 'staff',
    isManager: role === 'manager',
    ready
  };
};

// ========================================
// Hook للصلاحيات الفعلية (المباشرة + الموروثة)
// ========================================
export const useEffectivePermissions = () => {
  const [permissions, setPermissions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setPermissions(permissionService.getEffectivePermissions());

    const unsubscribe = permissionService.addListener(() => {
      setPermissions(permissionService.getEffectivePermissions());
    });

    return unsubscribe;
  }, []);

  return permissions;
};

// ========================================
// Hook للانتظار حتى تكون الصلاحيات جاهزة
// ========================================
export const useWaitForPermissions = (timeout = 5000): { ready: boolean; timedOut: boolean } => {
  const [timedOut, setTimedOut] = useState(false);
  const { ready } = usePermissions();

  useEffect(() => {
    if (ready) return;

    const timer = setTimeout(() => {
      if (!ready) {
        console.warn('[useWaitForPermissions] Timed out waiting for permissions');
        setTimedOut(true);
      }
    }, timeout);

    return () => clearTimeout(timer);
  }, [ready, timeout]);

  return { ready, timedOut };
};

// ========================================
// Hook للتحقق من صلاحية مع رسالة خطأ
// ========================================
export const useRequirePermission = (
  permission: Permission | string,
  options?: { redirectTo?: string; showError?: boolean }
) => {
  const { has, ready } = usePermissions();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);

  useEffect(() => {
    if (!ready) return;

    const access = has(permission);
    setHasAccess(access);

    if (!access && options?.showError) {
      console.error(`[useRequirePermission] Access denied for permission: ${permission}`);
    }
  }, [ready, permission, has, options?.showError]);

  return {
    hasAccess,
    isChecking: !ready,
    ready
  };
};

// ========================================
// تصدير افتراضي
// ========================================
export default usePermissions;
