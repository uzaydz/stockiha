/**
 * ====================================================
 * واجهة موحدة للتعامل مع بيانات المستخدم والصلاحيات
 * تستخدم دالة RPC محسنة للأداء وتقليل التكرار
 * ====================================================
 */

import { supabase } from '@/lib/supabase';
import { retrySupabaseOperation, handleError } from '@/lib/utils/errorHandler';
import { inventoryDB } from '@/database/localDb';

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
      return this.cachedUserData;
    }

    try {
      
      // التأكد من وجود authUserId
      if (!authUserId) {
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
          }
        } catch (secondError) {
          handleError(secondError, 'UserPermissions_getUserData_second_attempt');
        }
      }
      
      // محاولة ثالثة: استخدام auth.getUser() كـ fallback
      if (!userDataRaw) {
        try {
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
          }
        } catch (authFallbackError) {
        }
      }

      if (!userDataRaw) {
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

      // مرآة إلى SQLite (user_permissions) لاستخدام الأوفلاين
      try {
        const key = `${userData.auth_user_id}:${userData.organization_id || 'global'}`;
        const now = new Date().toISOString();
        await inventoryDB.userPermissions.put({
          id: key,
          auth_user_id: userData.auth_user_id,
          user_id: userData.user_id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          organization_id: userData.organization_id,
          is_active: userData.is_active,
          is_org_admin: userData.is_org_admin,
          is_super_admin: userData.is_super_admin,
          permissions: userData.permissions,
          has_inventory_access: userData.has_inventory_access,
          can_manage_products: userData.can_manage_products,
          can_view_reports: userData.can_view_reports,
          can_manage_users: userData.can_manage_users,
          can_manage_orders: userData.can_manage_orders,
          can_access_pos: userData.can_access_pos,
          can_manage_settings: userData.can_manage_settings,
          created_at: userData.created_at,
          updated_at: now,
          last_updated: now
        } as any);
      } catch {}

      // حفظ في الكاش
      if (useCache) {
        this.cachedUserData = userData;
        this.cacheExpiry = Date.now() + this.CACHE_DURATION;
      }

      return userData;
    } catch (error) {
      handleError(error, 'UserPermissions_getUserData_general');

      // فallback أوفلاين من SQLite user_permissions
      try {
        const orgId = (typeof localStorage !== 'undefined' && (localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id'))) || null;
        let row: any | undefined;
        if (authUserId && orgId) {
          const rows = await inventoryDB.userPermissions.where({ auth_user_id: authUserId, organization_id: orgId }).toArray();
          row = rows?.[0];
        }
        if (!row && authUserId) {
          const rowsAnyOrg = await inventoryDB.userPermissions.where({ auth_user_id: authUserId }).toArray();
          row = rowsAnyOrg?.[0];
        }
        if (row) {
          const perms = typeof row.permissions === 'string' ? (() => { try { return JSON.parse(row.permissions); } catch { return {}; } })() : (row.permissions || {});
          const offline: UnifiedUserData = {
            user_id: row.user_id || row.auth_user_id,
            auth_user_id: row.auth_user_id,
            email: row.email || '',
            name: row.name || '',
            role: row.role || 'employee',
            organization_id: row.organization_id || null,
            organization_name: '',
            organization_status: 'unknown',
            is_active: row.is_active !== false,
            is_org_admin: !!row.is_org_admin,
            is_super_admin: !!row.is_super_admin,
            permissions: perms,
            user_status: 'offline',
            last_activity_at: null,
            created_at: row.created_at || new Date().toISOString(),
            has_inventory_access: !!row.has_inventory_access,
            can_manage_products: !!row.can_manage_products,
            can_view_reports: !!row.can_view_reports,
            can_manage_users: !!row.can_manage_users,
            can_manage_orders: !!row.can_manage_orders,
            can_access_pos: !!row.can_access_pos,
            can_manage_settings: !!row.can_manage_settings,
            subscription_status: 'unknown',
            subscription_tier: 'free',
            trial_end_date: null,
            subscription_active: false,
            total_permissions_count: Object.keys(perms || {}).length,
            active_permissions_count: Object.values(perms || {}).filter(Boolean).length,
            two_factor_enabled: false,
            account_locked: false,
            last_login_at: null,
            debug_info: {
              query_method: 'sqlite_fallback',
              execution_time_ms: 0,
              user_found: true,
              organization_found: !!row.organization_id,
              cache_friendly: true,
              function_version: '2.5.0-sqlite'
            }
          };
          return offline;
        }
      } catch (sqliteErr) {
        handleError(sqliteErr, 'UserPermissions_sqlite_fallback');
      }

      // محاولة أخيرة: إرجاع بيانات من localStorage إذا كانت متوفرة
      try {
        const savedData = localStorage.getItem('bazaar_user_data');
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          if (parsedData.auth_user_id === authUserId) {
            return parsedData;
          }
        }
      } catch (localStorageError) {
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
        return false;
      }

      return data === true;
    } catch (error) {
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
    return false;
  }

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
      const { data: authData, error: authError } = await supabase.auth.getUser();
      
      if (!authError && authData?.user) {
        const permissions = authData.user.user_metadata?.permissions || {};
        const isOrgAdmin = authData.user.user_metadata?.is_org_admin || false;
        const isSuperAdmin = authData.user.user_metadata?.is_super_admin || false;
        
        const hasAccess = isSuperAdmin || isOrgAdmin || 
                         permissions.viewInventory === true || 
                         permissions.manageInventory === true;
        
        return hasAccess;
      }
    } catch (authError) {
    }
  }

  const result = userData?.has_inventory_access || false;
  
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
      return;
    }

  } catch (error) {
  }
};

/**
 * Hook مخصص لاستخدام بيانات المستخدم في React
 */
const useUserPermissions = (options: UseUserPermissionsOptions = {}) => {
  // سيتم تنفيذ هذا في ملف منفصل للـ hooks
  // هذا مجرد تعريف للواجهة
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
