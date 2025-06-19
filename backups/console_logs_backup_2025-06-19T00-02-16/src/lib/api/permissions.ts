/**
 * واجهة للتحقق من صلاحيات المستخدمين في الواجهة الأمامية
 */

import { supabase } from '@/lib/supabase';
import { EmployeePermissions } from '@/types/employee';
import { CallCenterPermissions, UserRole } from '@/types';
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
  console.log('🔄 [refreshUserData] بدء تحديث بيانات المستخدم...', { userId });
  
  // أولاً تحقق من التخزين المؤقت
  const cachedPermissions = getCachedPermissions();
  if (cachedPermissions) {
    console.log('📦 [refreshUserData] فحص بيانات التخزين المؤقت:', {
      role: cachedPermissions.role,
      is_org_admin: cachedPermissions.is_org_admin,
      permissions: cachedPermissions.permissions
    });
    
    // إذا كانت البيانات المخزنة تحتوي على role = 'authenticated' فقط، امسحها وأعد التحميل
    if (cachedPermissions.role === 'authenticated' && !cachedPermissions.is_org_admin && !cachedPermissions.permissions) {
      console.log('🗑️ [refreshUserData] البيانات المخزنة غير مكتملة، مسح التخزين المؤقت...');
      clearPermissionsCache();
    } else {
      console.log('📦 [refreshUserData] استخدام بيانات صحيحة من التخزين المؤقت');
      return cachedPermissions;
    }
    
    // إضافة أمر console عالمي لمسح التخزين المؤقت
    if (typeof window !== 'undefined') {
      (window as any).clearUserCache = () => {
        console.log('🗑️ [Console Command] مسح التخزين المؤقت للمستخدم...');
        clearPermissionsCache();
        console.log('✅ [Console Command] تم مسح التخزين المؤقت. قم بإعادة تحميل الصفحة.');
      };
    }
  }
  
  try {
    // محاولة الحصول على البيانات من users table أولاً
    console.log('📡 [refreshUserData] محاولة جلب من users table...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userData) {
      console.log('✅ [refreshUserData] بيانات من users table:', {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        is_org_admin: userData.is_org_admin,
        is_super_admin: userData.is_super_admin,
        permissions: userData.permissions
      });
      
      // تخزين بيانات المستخدم في التخزين المؤقت
      cachePermissions(userData);
      return userData;
    }
    
    // إذا لم توجد البيانات في users table، جرب auth.getUser()
    console.log('⚠️ [refreshUserData] لم توجد بيانات في users table، محاولة auth.getUser()...');
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('❌ [refreshUserData] خطأ في auth.getUser():', authError);
      return null;
    }
    
    if (authData?.user) {
      console.log('✅ [refreshUserData] بيانات من auth.getUser():', {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.user_metadata?.role,
        is_org_admin: authData.user.user_metadata?.is_org_admin,
        is_super_admin: authData.user.user_metadata?.is_super_admin,
        permissions: authData.user.user_metadata?.permissions
      });
      
      // تحويل بيانات auth إلى تنسيق مناسب
      const transformedData = {
        id: authData.user.id,
        email: authData.user.email,
        role: authData.user.user_metadata?.role || 'authenticated',
        is_org_admin: authData.user.user_metadata?.is_org_admin,
        is_super_admin: authData.user.user_metadata?.is_super_admin,
        permissions: authData.user.user_metadata?.permissions,
        user_metadata: authData.user.user_metadata,
        app_metadata: authData.user.app_metadata
      };
      
      // محاولة جلب البيانات الحقيقية من users table باستخدام email
      console.log('🔍 [refreshUserData] محاولة جلب البيانات باستخدام email...');
      try {
        const { data: userByEmail, error: emailError } = await supabase
          .from('users')
          .select('*')
          .eq('email', authData.user.email)
          .single();
          
        if (userByEmail && !emailError) {
          console.log('✅ [refreshUserData] بيانات حقيقية من users table:', {
            email: userByEmail.email,
            role: userByEmail.role,
            is_org_admin: userByEmail.is_org_admin,
            is_super_admin: userByEmail.is_super_admin,
            permissions: userByEmail.permissions
          });
          
          // دمج البيانات الحقيقية
          transformedData.role = userByEmail.role || transformedData.role;
          transformedData.is_org_admin = userByEmail.is_org_admin ?? transformedData.is_org_admin;
          transformedData.is_super_admin = userByEmail.is_super_admin ?? transformedData.is_super_admin;
          transformedData.permissions = userByEmail.permissions || transformedData.permissions;
        } else {
          console.log('⚠️ [refreshUserData] لم توجد بيانات في users table باستخدام email');
        }
      } catch (emailSearchError) {
        console.log('⚠️ [refreshUserData] خطأ في البحث بـ email:', emailSearchError);
      }
      
      console.log('🔄 [refreshUserData] بيانات محولة:', {
        email: transformedData.email,
        role: transformedData.role,
        is_org_admin: transformedData.is_org_admin,
        is_super_admin: transformedData.is_super_admin,
        permissions: transformedData.permissions
      });
      
      // تخزين البيانات المحولة في التخزين المؤقت
      cachePermissions(transformedData);
      return transformedData;
    }
    
    console.error('❌ [refreshUserData] لم يتم العثور على بيانات المستخدم');
    return null;
    
  } catch (error) {
    console.error('❌ [refreshUserData] خطأ غير متوقع:', error);
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
      return false;
    }

    return data === true;
  } catch (error) {
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
      return false;
    }

    return data === true;
  } catch (error) {
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
    
    return false;
  }
  
  // التحقق من التخزين المؤقت أولاً
  const cachedPermissions = getCachedPermissions();
  if (cachedPermissions) {
    // منطق التحقق نفسه ولكن باستخدام البيانات المخزنة مؤقتاً

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
      
      return false;
    }
    
    // المستخدم هو مدير عام
    if (isSuperAdmin) {
      
      return true;
    }
    
    // المستخدم هو مدير المؤسسة
    if (isOrgAdmin) {
      
      return true;
    }
    
    // المستخدم له دور مدير أو مالك
    if (userRole === 'admin' || userRole === 'owner') {
      
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
      
      return true;
    }

    return false;
  }
  
  // محاولة تحديث بيانات المستخدم من قاعدة البيانات للحصول على أحدث الصلاحيات
  const updatedUser = await refreshUserData(user.id);
  const userToCheck = updatedUser || user;
  
  // طباعة معلومات المستخدم للتصحيح

  // البحث عن الصلاحيات في مكانين محتملين اعتمادًا على هيكل بيانات المستخدم
  let permissions = {};
  
  // الطريقة 1: البيانات الوصفية في الكائن user.user_metadata
  if (userToCheck.user_metadata?.permissions) {
    permissions = userToCheck.user_metadata.permissions;
    
  } 
  // الطريقة 2: البيانات الوصفية في الكائن user.app_metadata
  else if (userToCheck.app_metadata?.permissions) {
    permissions = userToCheck.app_metadata.permissions;
    
  }
  // الطريقة 3: مباشرة في الكائن user
  else if (userToCheck.permissions) {
    permissions = userToCheck.permissions;
    
  }

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

  // تخزين معلومات الصلاحيات في التخزين المؤقت للمرات القادمة
  cachePermissions(userToCheck);
  
  // التحقق من أن المستخدم نشط أولاً
  if (!isActive) {
    
    return false;
  }
  
  // المستخدم هو مدير عام
  if (isSuperAdmin) {
    
    return true;
  }
  
  // المستخدم هو مدير المؤسسة
  if (isOrgAdmin) {
    
    return true;
  }
  
  // المستخدم له دور مدير أو مالك
  if (userRole === 'admin' || userRole === 'owner') {
    
    return true;
  }
  
  // التحقق من صلاحية مشاهدة المخزون - نقوم بترتيبها في الأعلى لأنها الأكثر أهمية في هذه الحالة
  if (requiredPermission === 'viewInventory') {
    // المكان الأول للتحقق: في كائن البيانات الوصفية للمستخدم
    if (userToCheck.user_metadata?.permissions?.viewInventory === true) {
      
      return true;
    }
    
    // المكان الثاني للتحقق: في كائن permissions
    if (permissions && 
       (permissions['viewInventory'] === true || 
        permissions['manageInventory'] === true || 
        permissions['manageProducts'] === true)) {
      
      return true;
    }
    
    // التحقق في المستخدم مباشرة للحالات الاستثنائية
    if (userToCheck.viewInventory === true || userToCheck.manageInventory === true || userToCheck.manageProducts === true) {
      
      return true;
    }
    
    // للتأكد من عدم وجود خطأ في تحويل النوع، نقوم بالتحقق من القيم كنصوص أيضًا
    if (permissions && 
       (permissions['viewInventory'] === 'true' || 
        permissions['manageInventory'] === 'true' || 
        permissions['manageProducts'] === 'true')) {
      
      return true;
    }

    return false;
  }
  
  // التحقق من صلاحية تعديل المخزون
  if (requiredPermission === 'manageInventory') {
    // المكان الأول للتحقق: في كائن البيانات الوصفية للمستخدم
    if (userToCheck.user_metadata?.permissions?.manageInventory === true) {
      
      return true;
    }
    
    // المكان الثاني للتحقق: في كائن permissions
    if (permissions && 
       (permissions['manageInventory'] === true || 
        permissions['manageProducts'] === true)) {
      
      return true;
    }
    
    // التحقق في المستخدم مباشرة للحالات الاستثنائية
    if (userToCheck.manageInventory === true || userToCheck.manageProducts === true) {
      
      return true;
    }
    
    // للتأكد من عدم وجود خطأ في تحويل النوع، نقوم بالتحقق من القيم كنصوص أيضًا
    if (permissions && 
       (permissions['manageInventory'] === 'true' || 
        permissions['manageProducts'] === 'true')) {
      
      return true;
    }

    return false;
  }
  
  // التحقق من صلاحيات المنتجات المخصصة
  if (requiredPermission === 'addProducts') {
    // التحقق من أن المستخدم مالك المؤسسة
    const isOrganizationOwner = userRole === 'owner' || userRole === 'admin';
    
    const canAdd = 
      Boolean(permissions['addProducts']) || 
      Boolean(permissions['manageProducts']) ||
      isOrganizationOwner ||
      isOrgAdmin ||
      isSuperAdmin;

    console.log('🔍 [Permissions] addProducts check:', {
      canAdd,
      hasAddProducts: Boolean(permissions['addProducts']),
      hasManageProducts: Boolean(permissions['manageProducts']),
      isOrganizationOwner,
      isOrgAdmin,
      isSuperAdmin,
      userEmail: userToCheck?.email
    });

    return canAdd;
  }
  
  if (requiredPermission === 'editProducts') {
    const canEdit = 
      Boolean(permissions['editProducts']) || 
      Boolean(permissions['manageProducts']);

    return canEdit;
  }
  
  if (requiredPermission === 'deleteProducts') {
    const canDelete = 
      Boolean(permissions['deleteProducts']) || 
      Boolean(permissions['manageProducts']);

    return canDelete;
  }
  
  // التحقق من الصلاحية المباشرة
  const hasPermission = Boolean(permissions[requiredPermission as keyof typeof permissions]);

  return hasPermission;
};

/**
 * التحقق من صلاحيات موظف مركز الاتصال
 * دالة مخصصة للتحقق من صلاحيات مركز الاتصال
 */
export const checkCallCenterPermissions = async (
  user: any,
  requiredPermission: keyof CallCenterPermissions
): Promise<boolean> => {
  if (!user) {
    return false;
  }

  // التحقق من أن المستخدم هو موظف مركز اتصال
  const userRole = 
    user.role || 
    user.user_metadata?.role || 
    user.app_metadata?.role || 
    '';

  if (userRole !== 'call_center_agent') {
    return false;
  }

  // التحقق من أن المستخدم نشط
  const isActive = 
    user.is_active !== false && 
    user.user_metadata?.is_active !== false && 
    user.app_metadata?.is_active !== false;

  if (!isActive) {
    return false;
  }

  // المشرفين لديهم جميع الصلاحيات
  const isSupervisor = 
    user.is_call_center_supervisor === true ||
    user.user_metadata?.is_call_center_supervisor === true ||
    user.app_metadata?.is_call_center_supervisor === true;

  if (isSupervisor) {
    return true;
  }

  // البحث عن صلاحيات مركز الاتصال
  let callCenterPermissions: CallCenterPermissions | null = null;

  if (user.user_metadata?.call_center_permissions) {
    callCenterPermissions = user.user_metadata.call_center_permissions;
  } else if (user.app_metadata?.call_center_permissions) {
    callCenterPermissions = user.app_metadata.call_center_permissions;
  } else if (user.call_center_permissions) {
    callCenterPermissions = user.call_center_permissions;
  }

  // إذا لم توجد صلاحيات مركز اتصال، استخدم الصلاحيات العامة
  if (!callCenterPermissions) {
    // تحويل الصلاحيات العامة إلى صلاحيات مركز اتصال
    const generalPermissions = 
      user.user_metadata?.permissions || 
      user.app_metadata?.permissions || 
      user.permissions || 
      {};

    // تحويل بعض الصلاحيات العامة إلى صلاحيات مركز اتصال
    const mappedPermissions: Partial<CallCenterPermissions> = {
      accessCallCenterDashboard: generalPermissions.accessCallCenter || false,
      viewAssignedOrders: generalPermissions.viewAssignedOrders || generalPermissions.viewOrders || false,
      updateCallStatus: generalPermissions.updateCallStatus || generalPermissions.manageOrders || false,
      addCallNotes: generalPermissions.addCallNotes || generalPermissions.manageOrders || false,
      scheduleCallbacks: generalPermissions.scheduleCallbacks || generalPermissions.manageOrders || false,
      makeOutboundCalls: generalPermissions.makeOutboundCalls || true, // افتراضي لموظفي مركز الاتصال
      receiveInboundCalls: generalPermissions.receiveInboundCalls || true, // افتراضي لموظفي مركز الاتصال
      viewOwnPerformance: generalPermissions.viewOwnPerformance || true, // افتراضي لموظفي مركز الاتصال
    };

    callCenterPermissions = mappedPermissions as CallCenterPermissions;
  }

  // التحقق من الصلاحية المطلوبة
  return Boolean(callCenterPermissions[requiredPermission]);
};

/**
 * التحقق من أن المستخدم موظف مركز اتصال
 * يتحقق من وجود سجل في جدول call_center_agents أو من الدور المباشر
 */
export const isCallCenterAgent = (user: any): boolean => {
  if (!user) return false;

  // التحقق من الدور المباشر أولاً
  const userRole = 
    user.role || 
    user.user_metadata?.role || 
    user.app_metadata?.role || 
    '';

  // إذا كان الدور مباشرة call_center_agent
  if (userRole === 'call_center_agent') {
    return true;
  }

  // التحقق من وجود معرف وكيل مركز الاتصال (يعني أن المستخدم وكيل)
  const hasAgentId = 
    user.call_center_agent_id || 
    user.user_metadata?.call_center_agent_id || 
    user.app_metadata?.call_center_agent_id;

  if (hasAgentId) {
    return true;
  }

  // التحقق من وجود بيانات وكيل مركز الاتصال
  const hasAgentData = 
    user.assigned_regions || 
    user.user_metadata?.assigned_regions || 
    user.app_metadata?.assigned_regions ||
    user.max_daily_orders ||
    user.user_metadata?.max_daily_orders ||
    user.app_metadata?.max_daily_orders ||
    user.is_call_center_available !== undefined ||
    user.is_call_center_active !== undefined;

  return Boolean(hasAgentData);
};

/**
 * التحقق من أن المستخدم موظف مركز اتصال من قاعدة البيانات
 * هذه الدالة تتحقق من وجود سجل في جدول call_center_agents
 */
export const isCallCenterAgentFromDB = async (userId: string): Promise<boolean> => {
  if (!userId) return false;

  try {
    const { supabase } = await import('@/lib/supabase');
    
    // @ts-ignore - call_center_agents table may not be in types yet
    const { data, error } = await supabase
      .from('call_center_agents')
      .select('id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      return false;
    }

    return Boolean(data);
  } catch (error) {
    return false;
  }
};

/**
 * التحقق من أن المستخدم مشرف مركز اتصال
 */
export const isCallCenterSupervisor = (user: any): boolean => {
  if (!isCallCenterAgent(user)) return false;

  return (
    user.is_call_center_supervisor === true ||
    user.user_metadata?.is_call_center_supervisor === true ||
    user.app_metadata?.is_call_center_supervisor === true
  );
};

/**
 * الحصول على معلومات موظف مركز الاتصال
 */
export const getCallCenterAgentInfo = (user: any) => {
  if (!isCallCenterAgent(user)) return null;

  return {
    agentId: user.call_center_agent_id || user.user_metadata?.call_center_agent_id || user.app_metadata?.call_center_agent_id,
    assignedRegions: user.assigned_regions || user.user_metadata?.assigned_regions || user.app_metadata?.assigned_regions || [],
    assignedStores: user.assigned_stores || user.user_metadata?.assigned_stores || user.app_metadata?.assigned_stores || [],
    maxDailyOrders: user.max_daily_orders || user.user_metadata?.max_daily_orders || user.app_metadata?.max_daily_orders || 50,
    isSupervisor: isCallCenterSupervisor(user),
  };
};
