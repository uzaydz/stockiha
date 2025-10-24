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
  console.log('🔍 [checkUserPermissionsLocal] بدء التحقق من الصلاحية:', {
    requiredPermission,
    hasUser: !!user,
    hasUserProfile: !!userProfile,
    userRole: userProfile?.role || user?.role,
    userProfilePermissions: userProfile?.permissions,
    userMetadataPermissions: user?.user_metadata?.permissions,
  });
  
  if (!user) {
    console.log('❌ [checkUserPermissionsLocal] لا يوجد user');
    return false;
  }
  
  // التحقق من أن المستخدم نشط
  const isActive = 
    user.is_active !== false && 
    user.user_metadata?.is_active !== false && 
    user.app_metadata?.is_active !== false;

  if (!isActive) {
    console.log('❌ [checkUserPermissionsLocal] المستخدم غير نشط');
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

  // استخراج الدور - تحسين الفحص مع userProfile
  const userRole = 
    userProfile?.role ||  // من جدول users
    user.role || 
    user.user_metadata?.role || 
    user.app_metadata?.role || 
    '';

  console.log('👤 [checkUserPermissionsLocal] معلومات المستخدم:', {
    userRole,
    isSuperAdmin,
    isOrgAdmin,
  });

  // المدير العام له صلاحية كاملة
  if (isSuperAdmin) {
    console.log('✅ [checkUserPermissionsLocal] super admin - له جميع الصلاحيات');
    return true;
  }
  
  // مدير المؤسسة له صلاحية كاملة
  if (isOrgAdmin) {
    console.log('✅ [checkUserPermissionsLocal] org admin - له جميع الصلاحيات');
    return true;
  }
  
  // المدير والمالك لهما صلاحية كاملة
  if (userRole === 'admin' || userRole === 'owner') {
    console.log('✅ [checkUserPermissionsLocal] admin/owner - له جميع الصلاحيات');
    return true;
  }

  // البحث عن الصلاحيات المحددة (مع إضافة userProfile.permissions)
  let permissions = {};
  let permissionsSource = 'none';
  
  if (userProfile?.permissions) {
    // الأولوية لـ userProfile.permissions (من قاعدة البيانات)
    permissions = userProfile.permissions;
    permissionsSource = 'userProfile.permissions';
  } else if (user.user_metadata?.permissions) {
    permissions = user.user_metadata.permissions;
    permissionsSource = 'user.user_metadata.permissions';
  } else if (user.app_metadata?.permissions) {
    permissions = user.app_metadata.permissions;
    permissionsSource = 'user.app_metadata.permissions';
  } else if (user.permissions) {
    permissions = user.permissions;
    permissionsSource = 'user.permissions';
  }

  console.log('📋 [checkUserPermissionsLocal] الصلاحيات:', {
    permissionsSource,
    permissions,
    requiredPermission,
    hasPermission: permissions[requiredPermission],
  });

  // التحقق من الصلاحية المطلوبة
  const result = Boolean(permissions[requiredPermission]);
  
  console.log(result ? '✅' : '❌', '[checkUserPermissionsLocal] النتيجة:', result);
  
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
  
  // استخراج الصلاحيات من مصادر مختلفة (مع إضافة userProfile.permissions)
  const permissions = 
    userProfile?.permissions ||  // الأولوية لـ userProfile (من قاعدة البيانات)
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
