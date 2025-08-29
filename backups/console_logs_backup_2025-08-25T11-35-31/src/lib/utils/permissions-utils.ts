// دوال محسنة للتحقق من الصلاحيات بدون API calls
import { EmployeePermissions } from '@/types/employee';

/**
 * دالة محسنة للتحقق من صلاحيات المستخدم بدون API calls
 * تعتمد على البيانات الموجودة في user object من AuthContext
 */
export const checkUserPermissionsLocal = (
  user: any, 
  requiredPermission: keyof EmployeePermissions,
  userProfile?: any
): boolean => {
  console.log('🔍 [checkUserPermissionsLocal] Checking permission:', requiredPermission);
  console.log('🔍 [checkUserPermissionsLocal] User:', user);
  
  if (!user) {
    console.log('🚫 [checkUserPermissionsLocal] No user');
    return false;
  }
  
  // التحقق من أن المستخدم نشط
  const isActive = 
    user.is_active !== false && 
    user.user_metadata?.is_active !== false && 
    user.app_metadata?.is_active !== false;
    
  console.log('🔍 [checkUserPermissionsLocal] isActive:', isActive);
    
  if (!isActive) {
    console.log('🚫 [checkUserPermissionsLocal] User not active');
    return false;
  }
  
  // التحقق من الأدوار الإدارية - تحسين الفحص
  const isSuperAdmin = 
    user.is_super_admin === true || 
    user.user_metadata?.is_super_admin === true || 
    user.app_metadata?.is_super_admin === true ||
    user.role === 'super_admin';
    
  const isOrgAdmin = 
    userProfile?.role === 'org_admin' ||  // من جدول users
    user.is_org_admin === true || 
    user.user_metadata?.is_org_admin === true || 
    user.app_metadata?.is_org_admin === true ||
    user.role === 'org_admin';
  
  console.log('🔍 [checkUserPermissionsLocal] isSuperAdmin:', isSuperAdmin);
  console.log('🔍 [checkUserPermissionsLocal] isOrgAdmin:', isOrgAdmin);
  
  // استخراج الدور - تحسين الفحص مع userProfile
  const userRole = 
    userProfile?.role ||  // من جدول users
    user.role || 
    user.user_metadata?.role || 
    user.app_metadata?.role || 
    '';
  
  console.log('🔍 [checkUserPermissionsLocal] userProfile:', userProfile);
  console.log('🔍 [checkUserPermissionsLocal] userRole:', userRole);
  
  // المدير العام له صلاحية كاملة
  if (isSuperAdmin) {
    console.log('✅ [checkUserPermissionsLocal] User is super admin');
    return true;
  }
  
  // مدير المؤسسة له صلاحية كاملة
  if (isOrgAdmin) {
    console.log('✅ [checkUserPermissionsLocal] User is org admin');
    return true;
  }
  
  // المدير والمالك لهما صلاحية كاملة
  if (userRole === 'admin' || userRole === 'owner') {
    console.log('✅ [checkUserPermissionsLocal] User is admin/owner');
    return true;
  }


  
  // البحث عن الصلاحيات المحددة
  let permissions = {};
  
  if (user.user_metadata?.permissions) {
    permissions = user.user_metadata.permissions;
  } else if (user.app_metadata?.permissions) {
    permissions = user.app_metadata.permissions;
  } else if (user.permissions) {
    permissions = user.permissions;
  }
  
  console.log('🔍 [checkUserPermissionsLocal] permissions:', permissions);
  console.log('🔍 [checkUserPermissionsLocal] requiredPermission:', requiredPermission);
  console.log('🔍 [checkUserPermissionsLocal] permissions[requiredPermission]:', permissions[requiredPermission]);
  
  // التحقق من الصلاحية المطلوبة
  const result = Boolean(permissions[requiredPermission]);
  console.log('🔍 [checkUserPermissionsLocal] Final result:', result);
  
  return result;
};

/**
 * دالة للتحقق من دور المستخدم
 */
export const getUserRole = (user: any, userProfile?: any): string => {
  if (!user) return '';
  
  return userProfile?.role ||  // من جدول users
         user.role || 
         user.user_metadata?.role || 
         user.app_metadata?.role || 
         '';
};

/**
 * دالة للتحقق من كون المستخدم مدير
 */
export const isUserAdmin = (user: any, userProfile?: any): boolean => {
  if (!user) return false;
  
  const role = getUserRole(user, userProfile);
  const isOrgAdmin = 
    userProfile?.role === 'org_admin' ||
    user.is_org_admin === true || 
    user.user_metadata?.is_org_admin === true || 
    user.app_metadata?.is_org_admin === true;
  const isSuperAdmin = 
    userProfile?.role === 'super_admin' ||
    user.is_super_admin === true || 
    user.user_metadata?.is_super_admin === true || 
    user.app_metadata?.is_super_admin === true;
  
  return role === 'admin' || role === 'owner' || isOrgAdmin || isSuperAdmin;
};

/**
 * دالة للحصول على جميع صلاحيات المستخدم
 */
export const getUserPermissions = (user: any, userProfile?: any): Record<string, boolean> => {
  if (!user) return {};
  
  // إذا كان مدير، له جميع الصلاحيات
  if (isUserAdmin(user, userProfile)) {
    return {
      manageProducts: true,
      manageServices: true,
      manageOrders: true,
      manageUsers: true,
      manageEmployees: true,
      viewReports: true,
      accessPOS: true,
      processPayments: true,
      viewInventory: true,
      manageInventory: true,
      manageCustomers: true,
      manageSuppliers: true,
      viewAnalytics: true,
      manageSettings: true
    };
  }
  
  // استخراج الصلاحيات من مصادر مختلفة
  const permissions = 
    user.user_metadata?.permissions || 
    user.app_metadata?.permissions || 
    user.permissions || 
    {};
  
  return permissions;
};

/**
 * Hook للحصول على صلاحيات المستخدم مع تحسين الأداء
 */
export const useUserPermissions = (user: any, userProfile?: any) => {
  const permissions = getUserPermissions(user, userProfile);
  const isAdmin = isUserAdmin(user, userProfile);
  const role = getUserRole(user, userProfile);
  
  const hasPermission = (permission: keyof EmployeePermissions): boolean => {
    return checkUserPermissionsLocal(user, permission, userProfile);
  };
  
  return {
    permissions,
    isAdmin,
    role,
    hasPermission
  };
};
