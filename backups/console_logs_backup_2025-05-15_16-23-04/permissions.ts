/**
 * واجهة للتحقق من صلاحيات المستخدمين في الواجهة الأمامية
 */

import { supabase } from '@/lib/supabase';
import { EmployeePermissions } from '@/types/employee';
import { 
  cachePermissions, 
  getCachedPermissions, 
  clearPermissionsCache,
  hasCachedPermissions
} from '@/lib/PermissionsCache';

/**
 * تحديث بيانات المستخدم من Supabase
 */
export const refreshUserData = async (userId: string) => {
  // أولاً تحقق من التخزين المؤقت
  const cachedPermissions = getCachedPermissions();
  if (cachedPermissions) {
    console.log('استخدام بيانات المستخدم من التخزين المؤقت');
    return cachedPermissions;
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('خطأ في تحديث بيانات المستخدم:', error);
      return null;
    }
    
    // تخزين بيانات المستخدم في التخزين المؤقت
    if (data) {
      cachePermissions(data);
    }
    
    return data;
  } catch (error) {
    console.error('خطأ غير متوقع في تحديث بيانات المستخدم:', error);
    return null;
  }
};

/**
 * التحقق من صلاحية تعديل منتج معين
 */
export const canEditProduct = async (productId: string): Promise<boolean> => {
  try {
    // استخدام دالة RPC التي تم إنشاؤها في قاعدة البيانات
    const { data, error } = await supabase
      .rpc('can_edit_product', { product_id: productId });

    if (error) {
      console.error('خطأ في التحقق من صلاحية تعديل المنتج:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من صلاحية تعديل المنتج:', error);
    return false;
  }
};

/**
 * التحقق من صلاحية حذف منتج معين
 */
export const canDeleteProduct = async (productId: string): Promise<boolean> => {
  try {
    // استخدام دالة RPC التي تم إنشاؤها في قاعدة البيانات
    const { data, error } = await supabase
      .rpc('can_delete_product', { product_id: productId });

    if (error) {
      console.error('خطأ في التحقق من صلاحية حذف المنتج:', error);
      return false;
    }

    return data === true;
  } catch (error) {
    console.error('خطأ غير متوقع في التحقق من صلاحية حذف المنتج:', error);
    return false;
  }
};

/**
 * التحقق من صلاحيات المستخدم من البيانات الوصفية
 * هذه الدالة أسرع لأنها لا تحتاج استعلامًا من قاعدة البيانات
 */
export const checkUserPermissions = async (
  user: any, 
  requiredPermission: keyof EmployeePermissions
): Promise<boolean> => {
  if (!user) {
    console.log('لا يوجد مستخدم للتحقق من الصلاحيات');
    return false;
  }
  
  // التحقق من التخزين المؤقت أولاً
  const cachedPermissions = getCachedPermissions();
  if (cachedPermissions) {
    // منطق التحقق نفسه ولكن باستخدام البيانات المخزنة مؤقتاً
    console.log('استخدام البيانات المخزنة مؤقتاً للتحقق من الصلاحيات:', requiredPermission);
    
    // تفقد البيانات المخزنة على أنها تحتوي على كل المعلومات الضرورية
    const isActive = 
      cachedPermissions.is_active !== false && 
      cachedPermissions.user_metadata?.is_active !== false && 
      cachedPermissions.app_metadata?.is_active !== false;
      
    const isSuperAdmin = 
      cachedPermissions.is_super_admin === true || 
      cachedPermissions.user_metadata?.is_super_admin === true || 
      cachedPermissions.app_metadata?.is_super_admin === true;
      
    const isOrgAdmin = 
      cachedPermissions.is_org_admin === true || 
      cachedPermissions.user_metadata?.is_org_admin === true || 
      cachedPermissions.app_metadata?.is_org_admin === true;
    
    // استخراج الدور من البيانات المخزنة
    const userRole = 
      cachedPermissions.role || 
      cachedPermissions.user_metadata?.role || 
      cachedPermissions.app_metadata?.role || 
      '';
      
    // التحقق من أن المستخدم نشط أولاً
    if (!isActive) {
      console.log('المستخدم غير نشط (من التخزين المؤقت)');
      return false;
    }
    
    // المستخدم هو مدير عام
    if (isSuperAdmin) {
      console.log('المستخدم هو مدير عام (من التخزين المؤقت)');
      return true;
    }
    
    // المستخدم هو مدير المؤسسة
    if (isOrgAdmin) {
      console.log('المستخدم هو مدير المؤسسة (من التخزين المؤقت)');
      return true;
    }
    
    // المستخدم له دور مدير أو مالك
    if (userRole === 'admin' || userRole === 'owner') {
      console.log('المستخدم هو مدير أو مالك (من التخزين المؤقت)');
      return true;
    }
    
    // البحث عن الصلاحيات في المكانين المحتملين
    let permissions = {};
    
    if (cachedPermissions.user_metadata?.permissions) {
      permissions = cachedPermissions.user_metadata.permissions;
    } else if (cachedPermissions.app_metadata?.permissions) {
      permissions = cachedPermissions.app_metadata.permissions;
    } else if (cachedPermissions.permissions) {
      permissions = cachedPermissions.permissions;
    }
    
    // التحقق من الصلاحية المطلوبة في الأذونات المخزنة
    if (permissions && (permissions[requiredPermission] === true || permissions[requiredPermission] === 'true')) {
      console.log(`المستخدم لديه الصلاحية ${requiredPermission} (من التخزين المؤقت)`);
      return true;
    }
    
    console.log(`المستخدم ليس لديه الصلاحية ${requiredPermission} (من التخزين المؤقت)`);
    return false;
  }
  
  // محاولة تحديث بيانات المستخدم من قاعدة البيانات للحصول على أحدث الصلاحيات
  const updatedUser = await refreshUserData(user.id);
  const userToCheck = updatedUser || user;
  
  // طباعة معلومات المستخدم للتصحيح
  console.log('بيانات المستخدم للتحقق من الصلاحيات:', {
    id: userToCheck.id,
    email: userToCheck.email,
    role: userToCheck.role || userToCheck.user_metadata?.role,
    isOrgAdmin: userToCheck.is_org_admin || userToCheck.user_metadata?.is_org_admin,
    isSuperAdmin: userToCheck.is_super_admin || userToCheck.user_metadata?.is_super_admin,
    permissions: userToCheck.permissions || userToCheck.user_metadata?.permissions,
    requiredPermission
  });

  // البحث عن الصلاحيات في مكانين محتملين اعتمادًا على هيكل بيانات المستخدم
  let permissions = {};
  
  // الطريقة 1: البيانات الوصفية في الكائن user.user_metadata
  if (userToCheck.user_metadata?.permissions) {
    permissions = userToCheck.user_metadata.permissions;
    console.log('وجدت الصلاحيات في user_metadata', permissions);
  } 
  // الطريقة 2: البيانات الوصفية في الكائن user.app_metadata
  else if (userToCheck.app_metadata?.permissions) {
    permissions = userToCheck.app_metadata.permissions;
    console.log('وجدت الصلاحيات في app_metadata', permissions);
  }
  // الطريقة 3: مباشرة في الكائن user
  else if (userToCheck.permissions) {
    permissions = userToCheck.permissions;
    console.log('وجدت الصلاحيات مباشرة في كائن المستخدم', permissions);
  }
  
  console.log('الصلاحيات المستخرجة:', permissions);
  
  // البحث عن الأدوار والصلاحيات الخاصة في مكانين محتملين
  const isActive = 
    userToCheck.is_active !== false && 
    userToCheck.user_metadata?.is_active !== false && 
    userToCheck.app_metadata?.is_active !== false;
    
  const isSuperAdmin = 
    userToCheck.is_super_admin === true || 
    userToCheck.user_metadata?.is_super_admin === true || 
    userToCheck.app_metadata?.is_super_admin === true;
    
  const isOrgAdmin = 
    userToCheck.is_org_admin === true || 
    userToCheck.user_metadata?.is_org_admin === true || 
    userToCheck.app_metadata?.is_org_admin === true;
  
  // استخراج الدور من أي مكان ممكن
  const userRole = 
    userToCheck.role || 
    userToCheck.user_metadata?.role || 
    userToCheck.app_metadata?.role || 
    '';
  
  console.log('الصلاحيات المستخرجة بعد التحليل:', {
    isActive,
    isSuperAdmin,
    isOrgAdmin,
    userRole
  });
  
  // تخزين معلومات الصلاحيات في التخزين المؤقت للمرات القادمة
  cachePermissions(userToCheck);
  
  // التحقق من أن المستخدم نشط أولاً
  if (!isActive) {
    console.log('المستخدم غير نشط');
    return false;
  }
  
  // المستخدم هو مدير عام
  if (isSuperAdmin) {
    console.log('المستخدم هو مدير عام، لديه جميع الصلاحيات');
    return true;
  }
  
  // المستخدم هو مدير المؤسسة
  if (isOrgAdmin) {
    console.log('المستخدم هو مدير المؤسسة، لديه جميع صلاحيات المؤسسة');
    return true;
  }
  
  // المستخدم له دور مدير أو مالك
  if (userRole === 'admin' || userRole === 'owner') {
    console.log('المستخدم هو مدير أو مالك، لديه جميع الصلاحيات');
    return true;
  }
  
  // التحقق من صلاحية مشاهدة المخزون - نقوم بترتيبها في الأعلى لأنها الأكثر أهمية في هذه الحالة
  if (requiredPermission === 'viewInventory') {
    // المكان الأول للتحقق: في كائن البيانات الوصفية للمستخدم
    if (userToCheck.user_metadata?.permissions?.viewInventory === true) {
      console.log('المستخدم لديه صلاحية viewInventory في البيانات الوصفية للمستخدم');
      return true;
    }
    
    // المكان الثاني للتحقق: في كائن permissions
    if (permissions && 
       (permissions['viewInventory'] === true || 
        permissions['manageInventory'] === true || 
        permissions['manageProducts'] === true)) {
      console.log('المستخدم لديه صلاحية viewInventory أو manageInventory أو manageProducts في كائن permissions');
      return true;
    }
    
    // التحقق في المستخدم مباشرة للحالات الاستثنائية
    if (userToCheck.viewInventory === true || userToCheck.manageInventory === true || userToCheck.manageProducts === true) {
      console.log('المستخدم لديه صلاحية viewInventory أو manageInventory أو manageProducts بشكل مباشر');
      return true;
    }
    
    // للتأكد من عدم وجود خطأ في تحويل النوع، نقوم بالتحقق من القيم كنصوص أيضًا
    if (permissions && 
       (permissions['viewInventory'] === 'true' || 
        permissions['manageInventory'] === 'true' || 
        permissions['manageProducts'] === 'true')) {
      console.log('المستخدم لديه صلاحية viewInventory أو manageInventory أو manageProducts كقيمة نصية في كائن permissions');
      return true;
    }
    
    console.log('المستخدم ليس لديه صلاحية viewInventory بعد كل عمليات التحقق');
    return false;
  }
  
  // التحقق من صلاحية تعديل المخزون
  if (requiredPermission === 'manageInventory') {
    // المكان الأول للتحقق: في كائن البيانات الوصفية للمستخدم
    if (userToCheck.user_metadata?.permissions?.manageInventory === true) {
      console.log('المستخدم لديه صلاحية manageInventory في البيانات الوصفية للمستخدم');
      return true;
    }
    
    // المكان الثاني للتحقق: في كائن permissions
    if (permissions && 
       (permissions['manageInventory'] === true || 
        permissions['manageProducts'] === true)) {
      console.log('المستخدم لديه صلاحية manageInventory أو manageProducts في كائن permissions');
      return true;
    }
    
    // التحقق في المستخدم مباشرة للحالات الاستثنائية
    if (userToCheck.manageInventory === true || userToCheck.manageProducts === true) {
      console.log('المستخدم لديه صلاحية manageInventory أو manageProducts بشكل مباشر');
      return true;
    }
    
    // للتأكد من عدم وجود خطأ في تحويل النوع، نقوم بالتحقق من القيم كنصوص أيضًا
    if (permissions && 
       (permissions['manageInventory'] === 'true' || 
        permissions['manageProducts'] === 'true')) {
      console.log('المستخدم لديه صلاحية manageInventory أو manageProducts كقيمة نصية في كائن permissions');
      return true;
    }
    
    console.log('المستخدم ليس لديه صلاحية manageInventory بعد كل عمليات التحقق');
    return false;
  }
  
  // التحقق من صلاحيات المنتجات المخصصة
  if (requiredPermission === 'editProducts') {
    const canEdit = 
      Boolean(permissions['editProducts']) || 
      Boolean(permissions['manageProducts']);
      
    console.log(`التحقق من صلاحية تعديل المنتجات: ${canEdit}`);
    return canEdit;
  }
  
  if (requiredPermission === 'deleteProducts') {
    const canDelete = 
      Boolean(permissions['deleteProducts']) || 
      Boolean(permissions['manageProducts']);
      
    console.log(`التحقق من صلاحية حذف المنتجات: ${canDelete}`);
    return canDelete;
  }
  
  // التحقق من الصلاحية المباشرة
  const hasPermission = Boolean(permissions[requiredPermission as keyof typeof permissions]);
  console.log(`التحقق من الصلاحية ${requiredPermission}: ${hasPermission}`);
  
  return hasPermission;
}; 