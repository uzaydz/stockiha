/**
 * نقطة التصدير الرئيسية لنظام الصلاحيات
 */

// الخدمات
export { permissionService, default as PermissionService } from './PermissionService';
export { permissionSyncService, default as PermissionSyncService } from './PermissionSyncService';

// الأنواع والثوابت من types/permissions.ts
export {
  // Enums
  Permission,
  UserRole,

  // خرائط الصلاحيات
  PERMISSION_HIERARCHY,
  ROLE_PERMISSIONS,
  PERMISSION_DISPLAY_NAMES,

  // الأنواع
  type UserPermissionData,
  type PermissionCheckResult,

  // الدوال المساعدة
  isAdminRole,
  getInheritedPermissions,
  getParentPermission,
  expandPermissions,
  permissionsArrayToObject,
  getDefaultPermissionsForRole,
  getPermissionDisplayName
} from '@/types/permissions';
