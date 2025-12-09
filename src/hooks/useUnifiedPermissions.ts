/**
 * useUnifiedPermissions - Hook موحد للصلاحيات
 * 
 * يوحد بين:
 * - PermissionsContext (صلاحيات المستخدم الرئيسي/Admin)
 * - StaffSessionContext (صلاحيات الموظف)
 * 
 * الأولوية:
 * 1. وضع المدير (isAdminMode) → صلاحيات كاملة
 * 2. موظف مسجل (currentStaff) → صلاحيات الموظف
 * 3. مستخدم رئيسي (PermissionsContext) → صلاحيات المستخدم
 */

import { useCallback, useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { useStaffSession } from '@/context/StaffSessionContext';
import { useAuth } from '@/context/AuthContext';
import {
  checkPermissionWithAliases,
  checkAnyPermission,
  checkAllPermissions,
  isAdminRole,
  toStaffPermissionName,
} from '@/lib/utils/permission-normalizer';
import type { StaffPermissions } from '@/types/staff';

const isDev = process.env.NODE_ENV === 'development';

// ⚡ منع تكرار الـ logs - Set عالمي خارج المكوّن
const loggedPermissions = new Set<string>();

export interface UnifiedPermissionsResult {
  /**
   * التحقق من صلاحية واحدة
   */
  has: (permission: string) => boolean;
  
  /**
   * التحقق من أي صلاحية من القائمة
   */
  anyOf: (permissions: string[]) => boolean;
  
  /**
   * التحقق من جميع الصلاحيات في القائمة
   */
  allOf: (permissions: string[]) => boolean;
  
  /**
   * هل المستخدم في وضع المدير؟
   */
  isAdminMode: boolean;
  
  /**
   * هل هناك موظف مسجل دخول؟
   */
  isStaffMode: boolean;
  
  /**
   * هل المستخدم مدير المؤسسة؟
   */
  isOrgAdmin: boolean;
  
  /**
   * هل المستخدم Super Admin؟
   */
  isSuperAdmin: boolean;
  
  /**
   * دور المستخدم الحالي
   */
  role: string | null;
  
  /**
   * اسم المستخدم/الموظف الحالي
   */
  displayName: string;
  
  /**
   * هل النظام جاهز؟
   */
  ready: boolean;
  
  /**
   * هل يتم التحميل؟
   */
  loading: boolean;
  
  /**
   * صلاحيات الموظف الخام (إذا كان موظف)
   */
  staffPermissions: StaffPermissions | null;
  
  /**
   * إعادة تحميل الصلاحيات
   */
  refresh: () => Promise<void>;
  
  /**
   * مدة الجلسة بالدقائق
   */
  sessionDuration: number;
  
  /**
   * هل الجلسة نشطة؟
   */
  isSessionActive: boolean;
  
  /**
   * مسح الجلسة الحالية
   */
  clearSession: () => void;
}

export function useUnifiedPermissions(): UnifiedPermissionsResult {
  // سياقات الصلاحيات
  const permContext = usePermissions();
  const staffSession = useStaffSession();
  const { userProfile } = useAuth();
  
  // استخراج البيانات من السياقات
  const { 
    currentStaff, 
    isAdminMode, 
    sessionDuration, 
    isSessionActive,
    clearSession 
  } = staffSession;
  const {
    data: permData,
    isOrgAdmin: permIsOrgAdmin,
    isSuperAdmin: permIsSuperAdmin,
    ready: permReady,
    loading: permLoading,
    refresh: permRefresh,
    role: permRole,
  } = permContext;
  
  // تحديد الوضع الحالي
  const isStaffMode = useMemo(() => {
    return !isAdminMode && !!currentStaff;
  }, [isAdminMode, currentStaff]);
  
  // هل المستخدم admin حتى لو لم يكن في وضع Admin?
  const isUserAdmin = useMemo(() => {
    // تحقق من userProfile
    if (isAdminRole(userProfile?.role)) return true;
    // تحقق من permData
    if (permIsOrgAdmin || permIsSuperAdmin) return true;
    if (isAdminRole(permRole)) return true;
    return false;
  }, [userProfile?.role, permIsOrgAdmin, permIsSuperAdmin, permRole]);
  
  // دور المستخدم الحالي
  const role = useMemo(() => {
    if (isAdminMode) return 'admin';
    if (isStaffMode && currentStaff) return 'staff';
    return permRole || userProfile?.role || null;
  }, [isAdminMode, isStaffMode, currentStaff, permRole, userProfile?.role]);
  
  // اسم المستخدم للعرض
  const displayName = useMemo(() => {
    if (isStaffMode && currentStaff) {
      return currentStaff.staff_name || 'موظف';
    }
    return userProfile?.name || userProfile?.email || 'مستخدم';
  }, [isStaffMode, currentStaff, userProfile]);
  
  // صلاحيات الموظف الخام
  const staffPermissions = useMemo(() => {
    if (isStaffMode && currentStaff?.permissions) {
      return currentStaff.permissions;
    }
    return null;
  }, [isStaffMode, currentStaff]);
  
  /**
   * التحقق من صلاحية واحدة
   */
  const has = useCallback((permission: string): boolean => {
    // ⚡ Helper لتسجيل الصلاحية مرة واحدة فقط (يستخدم Set عالمي)
    const logOnce = (msg: string, data?: object) => {
      if (!isDev) return;
      const key = `${permission}-${msg}`;
      if (!loggedPermissions.has(key)) {
        loggedPermissions.add(key);
        if (data) {
          console.log(`[useUnifiedPermissions] ${msg}`, data);
        } else {
          console.log(`[useUnifiedPermissions] ${msg}`);
        }
      }
    };

    // 1. وضع المدير = صلاحيات كاملة
    if (isAdminMode) {
      logOnce(`✅ ${permission} - وضع المدير`);
      return true;
    }

    // 2. إذا كان المستخدم admin/owner = صلاحيات كاملة
    if (isUserAdmin) {
      logOnce(`✅ ${permission} - مستخدم إداري`);
      return true;
    }

    // 3. إذا موظف مسجل → فحص صلاحيات الموظف
    if (isStaffMode && currentStaff?.permissions) {
      const staffPerms = currentStaff.permissions as Record<string, boolean | undefined>;
      const hasIt = checkPermissionWithAliases(permission, staffPerms);
      logOnce(`👤 ${permission} - موظف: ${hasIt ? '✅' : '❌'}`, {
        staffName: currentStaff.staff_name,
      });
      return hasIt;
    }

    // 4. فحص صلاحيات المستخدم الرئيسي من PermissionsContext
    if (permData?.permissions) {
      return checkPermissionWithAliases(permission, permData.permissions);
    }

    // 5. فحص صلاحيات المستخدم من userProfile
    if (userProfile?.permissions) {
      return checkPermissionWithAliases(
        permission,
        userProfile.permissions as Record<string, boolean | undefined>
      );
    }

    return false;
  }, [isAdminMode, isUserAdmin, isStaffMode, currentStaff, permData, userProfile]);
  
  /**
   * التحقق من أي صلاحية من القائمة
   */
  const anyOf = useCallback((permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    
    // وضع المدير أو admin = true
    if (isAdminMode || isUserAdmin) return true;
    
    return permissions.some(p => has(p));
  }, [isAdminMode, isUserAdmin, has]);
  
  /**
   * التحقق من جميع الصلاحيات
   */
  const allOf = useCallback((permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    
    // وضع المدير أو admin = true
    if (isAdminMode || isUserAdmin) return true;
    
    return permissions.every(p => has(p));
  }, [isAdminMode, isUserAdmin, has]);
  
  /**
   * إعادة تحميل الصلاحيات
   */
  const refresh = useCallback(async () => {
    await permRefresh();
  }, [permRefresh]);
  
  // حالة الجاهزية
  const ready = useMemo(() => {
    // إذا كان وضع المدير أو موظف مسجل، نعتبره جاهز
    if (isAdminMode) return true;
    if (isStaffMode && currentStaff) return true;
    // وإلا ننتظر permContext
    return permReady;
  }, [isAdminMode, isStaffMode, currentStaff, permReady]);
  
  return {
    has,
    anyOf,
    allOf,
    isAdminMode,
    isStaffMode,
    isOrgAdmin: isAdminMode || permIsOrgAdmin,
    isSuperAdmin: isAdminMode || permIsSuperAdmin,
    role,
    displayName,
    ready,
    loading: permLoading,
    staffPermissions,
    refresh,
    sessionDuration,
    isSessionActive,
    clearSession,
  };
}

/**
 * Hook مختصر للتحقق السريع من صلاحية واحدة
 */
export function useHasPermission(permission: string): boolean {
  const { has, ready } = useUnifiedPermissions();
  return ready && has(permission);
}

/**
 * Hook للتحقق من عدة صلاحيات
 */
export function useHasAnyPermission(permissions: string[]): boolean {
  const { anyOf, ready } = useUnifiedPermissions();
  return ready && anyOf(permissions);
}

export default useUnifiedPermissions;
