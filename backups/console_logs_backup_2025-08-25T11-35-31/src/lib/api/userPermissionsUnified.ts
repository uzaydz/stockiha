/**
 * ====================================================
 * واجهة موحدة للتعامل مع بيانات المستخدم والصلاحيات
 * تستخدم دالة RPC محسنة للأداء وتقليل التكرار
 * ====================================================
 */

import { supabase } from '@/lib/supabase';
import { retrySupabaseOperation, handleError } from '@/lib/utils/errorHandler';

// ====================================================
// أنواع البيانات (Types)
// ====================================================

export interface UnifiedUserData {
  // معلومات المستخدم الأساسية
  user_id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: string;
  
  // معلومات المؤسسة
  organization_id: string | null;
  organization_name: string | null;
  organization_status: string;
  
  // صلاحيات المستخدم
  is_active: boolean;
  is_org_admin: boolean;
  is_super_admin: boolean;
  permissions: Record<string, any>;
  
  // معلومات إضافية
  user_status: string;
  last_activity_at: string | null;
  created_at: string;
  
  // صلاحيات محسوبة
  has_inventory_access: boolean;
  can_manage_products: boolean;
  can_view_reports: boolean;
  can_manage_users: boolean;
  can_manage_orders: boolean;
  can_access_pos: boolean;
  can_manage_settings: boolean;
  
  // بيانات الاشتراك
  subscription_status: string;
  subscription_tier: string;
  trial_end_date: string | null;
  subscription_active: boolean;
  
  // إحصائيات
  total_permissions_count: number;
  active_permissions_count: number;
  
  // معلومات الأمان
  two_factor_enabled: boolean;
  account_locked: boolean;
  last_login_at: string | null;
  
  // بيانات التصحيح
  debug_info: {
    query_method: string;
    execution_time_ms: number;
    user_found: boolean;
    organization_found: boolean;
    cache_friendly: boolean;
    function_version: string;
  };
}

export interface UserPermissionCheck {
  permission: string;
  hasPermission: boolean;
  reason: 'super_admin' | 'org_admin' | 'explicit_permission' | 'denied';
}

export interface BasicUserInfo {
  user_id: string;
  auth_user_id: string;
  email: string;
  name: string;
  role: string;
  organization_id: string | null;
  is_active: boolean;
  is_org_admin: boolean;
  is_super_admin: boolean;
}

export interface UseUserPermissionsOptions {
  includeSubscription?: boolean;
  calculatePermissions?: boolean;
  useCache?: boolean;
  autoRefresh?: boolean;
}

// ====================================================
// الكلاس الرئيسي للتعامل مع بيانات المستخدم
// ====================================================

class UnifiedUserPermissions {
  private static instance: UnifiedUserPermissions;
  private cachedUserData: UnifiedUserData | null = null;
  private cacheExpiry: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

  private constructor() {}

  static getInstance(): UnifiedUserPermissions {
    if (!UnifiedUserPermissions.instance) {
      UnifiedUserPermissions.instance = new UnifiedUserPermissions();
    }
    return UnifiedUserPermissions.instance;
  }

  /**
   * الحصول على بيانات المستخدم الكاملة
   */
  async getUserData(
    authUserId?: string,
    options: {
      includeSubscription?: boolean;
      calculatePermissions?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<UnifiedUserData | null> {
    const {
      includeSubscription = true,
      calculatePermissions = true,
      useCache = true
    } = options;

    // التحقق من الكاش
    if (useCache && this.isCacheValid() && this.cachedUserData) {
      console.log('🚀 [UserPermissions] استخدام البيانات المحفوظة');
      return this.cachedUserData;
    }

    try {
      console.log('🔍 [UserPermissions] جلب بيانات جديدة من قاعدة البيانات');
      
      // التأكد من وجود authUserId
      if (!authUserId) {
        console.warn('⚠️ [UserPermissions] لم يتم تمرير authUserId');
        return null;
      }
      
      // محاولة أولى: استخدام select مع auth_user_id
      let userDataRaw = null;
      let userError = null;
      
      try {
        const result = await retrySupabaseOperation(
          async () => {
            const { data, error } = await supabase
              .from('users')
              .select('*')
              .eq('auth_user_id', authUserId)
              .eq('is_active', true)
              .single();
              
            if (error) throw error;
            return data;
          },
          'getUserData_auth_user_id',
          { maxRetries: 2, baseDelay: 500 }
        );
        
        if (result) {
          userDataRaw = result;
        }
      } catch (selectError) {
        console.warn('⚠️ [UserPermissions] فشل في الاستعلام الأول:', selectError);
        userError = selectError;
        handleError(selectError, 'UserPermissions_getUserData_first_attempt');
      }
      
      // محاولة ثانية: استخدام id مباشرة إذا كان authUserId هو نفسه id
      if (!userDataRaw) {
        try {
          const result = await retrySupabaseOperation(
            async () => {
              const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUserId)
                .eq('is_active', true)
                .single();
                
              if (error) throw error;
              return data;
            },
            'getUserData_direct_id',
            { maxRetries: 2, baseDelay: 500 }
          );
          
          if (result) {
            userDataRaw = result;
            console.log('✅ [UserPermissions] تم العثور على المستخدم باستخدام id مباشر');
          }
        } catch (secondError) {
          console.warn('⚠️ [UserPermissions] فشل في الاستعلام الثاني:', secondError);
          handleError(secondError, 'UserPermissions_getUserData_second_attempt');
        }
      }
      
      // محاولة ثالثة: استخدام auth.getUser() كـ fallback
      if (!userDataRaw) {
        try {
          console.log('🔄 [UserPermissions] محاولة استخدام auth.getUser() كـ fallback');
          const { data: authData, error: authError } = await supabase.auth.getUser();
          
          if (!authError && authData?.user) {
            // إنشاء بيانات افتراضية من auth metadata
            userDataRaw = {
              id: authData.user.id,
              auth_user_id: authData.user.id,
              email: authData.user.email || '',
              name: authData.user.user_metadata?.name || authData.user.email || '',
              role: authData.user.user_metadata?.role || 'employee',
              organization_id: authData.user.user_metadata?.organization_id || null,
              is_active: true,
              is_org_admin: authData.user.user_metadata?.is_org_admin || false,
              is_super_admin: authData.user.user_metadata?.is_super_admin || false,
              permissions: authData.user.user_metadata?.permissions || {},
              status: 'active',
              created_at: authData.user.created_at || new Date().toISOString(),
              updated_at: authData.user.updated_at || new Date().toISOString()
            };
            console.log('✅ [UserPermissions] تم إنشاء بيانات افتراضية من auth metadata');
          }
        } catch (authFallbackError) {
          console.warn('⚠️ [UserPermissions] فشل في auth fallback:', authFallbackError);
        }
      }

      if (!userDataRaw) {
        console.error('❌ [UserPermissions] فشل في جلب بيانات المستخدم بعد جميع المحاولات');
        return null;
      }

      // جلب بيانات المؤسسة
      let orgData = null;
      if (userDataRaw.organization_id) {
        try {
          const result = await retrySupabaseOperation(
            async () => {
              const { data, error } = await supabase
                .from('organizations')
                .select('name, subscription_status, subscription_tier')
                .eq('id', userDataRaw.organization_id)
                .single();
                
              if (error) throw error;
              return data;
            },
            'getUserData_organization',
            { maxRetries: 2, baseDelay: 300 }
          );
          
          if (result) {
            orgData = result;
          }
        } catch (orgError) {
          console.warn('⚠️ [UserPermissions] خطأ في جلب بيانات المؤسسة:', orgError);
          handleError(orgError, 'UserPermissions_getOrganizationData');
        }
      }

      // حساب الصلاحيات
      const permissions = userDataRaw.permissions || {};
      const isOrgAdmin = userDataRaw.is_org_admin || false;
      const isSuperAdmin = userDataRaw.is_super_admin || false;

      // إنشاء UnifiedUserData من البيانات المستلمة
      const userData: UnifiedUserData = {
        user_id: userDataRaw.id,
        auth_user_id: userDataRaw.auth_user_id,
        email: userDataRaw.email,
        name: userDataRaw.name,
        role: userDataRaw.role,
        organization_id: userDataRaw.organization_id,
        organization_name: orgData?.name || '',
        organization_status: orgData?.subscription_status || 'inactive',
        is_active: userDataRaw.is_active,
        is_org_admin: isOrgAdmin,
        is_super_admin: isSuperAdmin,
        permissions: permissions as Record<string, any>,
        user_status: userDataRaw.status || 'offline',
        last_activity_at: userDataRaw.last_activity_at,
        created_at: userDataRaw.created_at,
        has_inventory_access: isSuperAdmin || isOrgAdmin || (permissions as any)?.viewInventory === true || (permissions as any)?.manageInventory === true,
        can_manage_products: isSuperAdmin || isOrgAdmin || (permissions as any)?.manageProducts === true || (permissions as any)?.addProducts === true || (permissions as any)?.editProducts === true,
        can_view_reports: isSuperAdmin || isOrgAdmin || (permissions as any)?.viewReports === true || (permissions as any)?.viewSalesReports === true || (permissions as any)?.viewFinancialReports === true,
        can_manage_users: isSuperAdmin || isOrgAdmin || (permissions as any)?.manageUsers === true || (permissions as any)?.manageEmployees === true,
        can_manage_orders: isSuperAdmin || isOrgAdmin || (permissions as any)?.manageOrders === true || (permissions as any)?.viewOrders === true || (permissions as any)?.updateOrderStatus === true,
        can_access_pos: isSuperAdmin || isOrgAdmin || (permissions as any)?.accessPOS === true || (permissions as any)?.processPayments === true,
        can_manage_settings: isSuperAdmin || isOrgAdmin || (permissions as any)?.viewSettings === true || (permissions as any)?.manageOrganizationSettings === true || (permissions as any)?.manageProfileSettings === true,
        subscription_status: orgData?.subscription_status || 'inactive',
        subscription_tier: orgData?.subscription_tier || 'free',
        trial_end_date: null,
        subscription_active: orgData?.subscription_status === 'active',
        total_permissions_count: Object.keys(permissions).length,
        active_permissions_count: Object.values(permissions).filter(Boolean).length,
        two_factor_enabled: userDataRaw.two_factor_enabled || false,
        account_locked: userDataRaw.account_locked_until ? new Date(userDataRaw.account_locked_until) > new Date() : false,
        last_login_at: userDataRaw.last_activity_at,
        debug_info: {
          query_method: userDataRaw.id === authUserId ? 'direct_id' : 'auth_user_id',
          execution_time_ms: 0,
          user_found: true,
          organization_found: !!orgData,
          cache_friendly: true,
          function_version: '2.5.0-fallback'
        }
      };
      
      console.log('📋 [UserPermissions] البيانات المستلمة:', userData);
      
      // حفظ في الكاش
      if (useCache) {
        this.cachedUserData = userData;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      }

      console.log('✅ [UserPermissions] تم جلب البيانات بنجاح:', {
        executionTime: userData.debug_info.execution_time_ms,
        method: userData.debug_info.query_method,
        permissionsCount: userData.active_permissions_count,
        hasInventoryAccess: userData.has_inventory_access
      });

      return userData;
    } catch (error) {
      console.error('❌ [UserPermissions] خطأ عام:', error);
      handleError(error, 'UserPermissions_getUserData_general');
      
      // محاولة أخيرة: إرجاع بيانات افتراضية من localStorage إذا كانت متوفرة
      try {
        const savedData = localStorage.getItem('bazaar_user_data');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.auth_user_id === authUserId) {
            console.log('🔄 [UserPermissions] استخدام البيانات المحفوظة في localStorage كـ fallback');
            return parsedData;
          }
        }
      } catch (localStorageError) {
        console.warn('⚠️ [UserPermissions] فشل في قراءة localStorage:', localStorageError);
        handleError(localStorageError, 'UserPermissions_localStorage_fallback');
      }
      
      return null;
    }
  }

  /**
   * الحصول على المعلومات الأساسية فقط (أسرع)
   */
  async getBasicUserInfo(authUserId?: string): Promise<BasicUserInfo | null> {
    try {
      const { data, error } = await supabase.rpc('get_user_basic_info' as any, {
        p_auth_user_id: authUserId || null
      });

      if (error || !data || !Array.isArray(data) || data.length === 0) {
        return null;
      }

      return data[0] as BasicUserInfo;
    } catch (error) {
      console.error('❌ [UserPermissions] خطأ في جلب المعلومات الأساسية:', error);
      return null;
    }
  }

  /**
   * فحص صلاحية واحدة بسرعة
   */
  async checkPermission(permission: string, authUserId?: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('check_user_permission_fast' as any, {
        p_permission_name: permission,
        p_auth_user_id: authUserId || null
      });

      if (error) {
        console.error('❌ [UserPermissions] خطأ في فحص الصلاحية:', error);
        return false;
      }

      return data === true;
    } catch (error) {
      console.error('❌ [UserPermissions] خطأ عام في فحص الصلاحية:', error);
      return false;
    }
  }

  /**
   * فحص عدة صلاحيات دفعة واحدة
   */
  async checkMultiplePermissions(
    permissions: string[], 
    authUserId?: string
  ): Promise<Record<string, boolean>> {
    const userData = await this.getUserData(authUserId, { 
      includeSubscription: false,
      calculatePermissions: true 
    });

    if (!userData) {
      return permissions.reduce((acc, perm) => ({ ...acc, [perm]: false }), {});
    }

    const results: Record<string, boolean> = {};
    
    for (const permission of permissions) {
      results[permission] = this.evaluatePermission(userData, permission);
    }

    return results;
  }

  /**
   * تقييم صلاحية معينة من البيانات المحفوظة
   */
  private evaluatePermission(userData: UnifiedUserData, permission: string): boolean {
    // المسؤول العام لديه جميع الصلاحيات
    if (userData.is_super_admin) return true;
    
    // مسؤول المؤسسة لديه معظم الصلاحيات
    if (userData.is_org_admin) return true;
    
    // التحقق من الصلاحية المحددة
    return userData.permissions[permission] === true;
  }

  /**
   * التحقق من صحة الكاش
   */
  private isCacheValid(): boolean {
    return Date.now() < this.cacheExpiry;
  }

  /**
   * مسح الكاش
   */
  clearCache(): void {
    this.cachedUserData = null;
    this.cacheExpiry = 0;
    console.log('🗑️ [UserPermissions] تم مسح الكاش');
  }

  /**
   * الحصول على البيانات من الكاش (إن وجدت)
   */
  getCachedData(): UnifiedUserData | null {
    return this.isCacheValid() ? this.cachedUserData : null;
  }
}

// ====================================================
// إنشاء instance واحد للاستخدام العام
// ====================================================

const userPermissionsInstance = UnifiedUserPermissions.getInstance();

// ====================================================
// دوال مساعدة للاستخدام السريع
// ====================================================

/**
 * فحص صلاحية بسرعة (دالة مختصرة)
 */
const hasPermission = async (permission: string, authUserId?: string): Promise<boolean> => {
  return userPermissionsInstance.checkPermission(permission, authUserId);
};

/**
 * الحصول على بيانات المستخدم الحالي
 */
const getCurrentUser = async (useCache = true): Promise<UnifiedUserData | null> => {
  return userPermissionsInstance.getUserData(undefined, { useCache });
};

/**
 * فحص صلاحيات متعددة
 */
const hasPermissions = async (
  permissions: string[], 
  authUserId?: string
): Promise<Record<string, boolean>> => {
  return userPermissionsInstance.checkMultiplePermissions(permissions, authUserId);
};

/**
 * التحقق من صلاحيات المخزون (الأكثر استخداماً)
 */
const canAccessInventory = async (authUserId?: string): Promise<boolean> => {
  if (!authUserId) {
    console.warn('⚠️ [canAccessInventory] لم يتم تمرير authUserId');
    return false;
  }
  
  console.log('🔍 [canAccessInventory] فحص صلاحية المخزون للمستخدم:', authUserId);
  
  // محاولة أولى مع retry
  let userData = null;
  let retryCount = 0;
  const maxRetries = 2;
  
  while (retryCount <= maxRetries && !userData) {
    try {
      userData = await userPermissionsInstance.getUserData(authUserId, { 
        calculatePermissions: true,
        includeSubscription: false
      });
      
      if (userData) {
        break;
      }
    } catch (error) {
      console.warn(`⚠️ [canAccessInventory] محاولة ${retryCount + 1} فشلت:`, error);
      retryCount++;
      
      if (retryCount <= maxRetries) {
        // انتظار قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }
  
  // إذا فشلت جميع المحاولات، جرب استخدام auth metadata مباشرة
  if (!userData) {
    try {
      console.log('🔄 [canAccessInventory] محاولة استخدام auth metadata مباشرة');
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authData?.user) {
        const permissions = authData.user.user_metadata?.permissions || {};
        const isOrgAdmin = authData.user.user_metadata?.is_org_admin || false;
        const isSuperAdmin = authData.user.user_metadata?.is_super_admin || false;
        
        const hasAccess = isSuperAdmin || isOrgAdmin || 
                         permissions.viewInventory === true || 
                         permissions.manageInventory === true;
        
        console.log('✅ [canAccessInventory] تم الحصول على النتيجة من auth metadata:', hasAccess);
        return hasAccess;
      }
    } catch (authError) {
      console.warn('⚠️ [canAccessInventory] فشل في استخدام auth metadata:', authError);
    }
  }
  
  console.log('📊 [canAccessInventory] بيانات المستخدم:', userData);
  console.log('🔑 [canAccessInventory] has_inventory_access:', userData?.has_inventory_access);
  
  const result = userData?.has_inventory_access || false;
  console.log('✅ [canAccessInventory] النتيجة النهائية:', result);
  
  return result;
};

/**
 * التحقق من صلاحيات إدارة المنتجات
 */
const canManageProducts = async (authUserId?: string): Promise<boolean> => {
  const userData = await userPermissionsInstance.getUserData(authUserId, { 
    calculatePermissions: true,
    includeSubscription: false
  });
  
  return userData?.can_manage_products || false;
};

/**
 * دالة للتصحيح واختبار الأداء
 */
const testPerformance = async (): Promise<void> => {
  try {
    const { data, error } = await supabase.rpc('test_user_function_performance' as any);
    
    if (error) {
      console.error('❌ خطأ في اختبار الأداء:', error);
      return;
    }

    console.table(data);
  } catch (error) {
    console.error('❌ خطأ عام في اختبار الأداء:', error);
  }
};

/**
 * Hook مخصص لاستخدام بيانات المستخدم في React
 */
const useUserPermissions = (options: UseUserPermissionsOptions = {}) => {
  // سيتم تنفيذ هذا في ملف منفصل للـ hooks
  // هذا مجرد تعريف للواجهة
  console.log('useUserPermissions hook - سيتم تنفيذه في ملف منفصل', options);
};

// ====================================================
// تصدير الكلاس والدوال والـ instance
// ====================================================

export default UnifiedUserPermissions;

export {
  UnifiedUserPermissions,
  userPermissionsInstance as userPermissions,
  hasPermission,
  getCurrentUser,
  hasPermissions,
  canAccessInventory,
  canManageProducts,
  testPerformance,
  useUserPermissions
};