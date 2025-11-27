/**
 * Sidebar Permission Utils
 * 
 * ⚡ تم توحيد هذا الملف مع permission-normalizer.ts
 * جميع دوال التحقق من الصلاحيات الآن تستخدم المصدر الموحد
 */

import {
  PERMISSION_ALIASES,
  checkPermissionWithAliases,
  checkAnyPermission,
  checkAllPermissions,
  getPermissionAliases,
  normalizePermissionName,
  toStaffPermissionName,
} from '@/lib/utils/permission-normalizer';

// تصدير خريطة الصلاحيات للتوافق مع الكود القديم
export const permissionMapping = PERMISSION_ALIASES;

/**
 * دالة للتحقق من صلاحية - تستخدم الآن المصدر الموحد
 */
export const checkPermission = (
  permissionName: string | null,
  permissions: any
): boolean => {
  if (!permissionName) return true; // لا تتطلب صلاحية
  if (!permissions) return false;
  
  return checkPermissionWithAliases(permissionName, permissions);
};

/**
 * دالة للتحقق من عدة صلاحيات
 */
export const checkMultiplePermissions = (
  permissionNames: (string | null)[],
  permissions: any,
  requireAll: boolean = false
): boolean => {
  if (!permissionNames.length) return true;
  if (!permissions) return false;
  
  // تصفية القيم الفارغة
  const validPermissions = permissionNames.filter((p): p is string => p !== null);
  
  if (requireAll) {
    return checkAllPermissions(validPermissions, permissions);
  } else {
    return checkAnyPermission(validPermissions, permissions);
  }
};

/**
 * دالة للتحقق من صلاحيات المستخدم مع طباعة معلومات تشخيصية
 */
export const debugPermissions = (
  permissionName: string | null,
  permissions: any,
  userRole?: string
): { hasPermission: boolean; debugInfo: any } => {
  if (!permissionName) {
    return { hasPermission: true, debugInfo: { reason: 'No permission required' } };
  }
  
  const aliases = getPermissionAliases(permissionName);
  const normalizedName = normalizePermissionName(permissionName);
  const staffName = toStaffPermissionName(permissionName);
  
  const debugInfo = {
    permissionName,
    normalizedName,
    staffFormatName: staffName,
    userRole,
    permissions,
    directCheck: permissions?.[permissionName],
    normalizedCheck: permissions?.[normalizedName],
    staffFormatCheck: permissions?.[staffName],
    aliases,
    aliasResults: aliases.map(alias => ({
      permission: alias,
      value: permissions?.[alias]
    }))
  };
  
  const hasPermission = checkPermission(permissionName, permissions);
  
  return { hasPermission, debugInfo };
};
