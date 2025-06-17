/**
 * مُعترِض الطلبات - يُجبر جميع المكونات على استخدام النظام الموحد
 * يمنع جميع الطلبات المكررة نهائياً عبر اعتراض الطلبات المباشرة
 */

import { supabase } from '@/lib/supabase';
import { UnifiedRequestManager } from '@/lib/unifiedRequestManager';

// قائمة الجداول المحظورة من الطلبات المباشرة
const BLOCKED_TABLES = [
  'product_categories',
  'product_subcategories', 
  'organization_settings',
  'organization_subscriptions',
  'organization_apps'
];

// تتبع الطلبات المحظورة
const blockedRequests = new Map<string, number>();

// معرف المؤسسة الحالي
let currentOrganizationId: string | null = null;

// دالة للحصول على organization ID من مصادر متعددة
const getCurrentOrganizationId = (): string | null => {
  // أولاً: استخدم القيمة المخزنة من AuthContext
  if (currentOrganizationId) {
    return currentOrganizationId;
  }
  
  // ثانياً: محاولة الحصول على organization ID من current_organization
  try {
    const savedOrg = localStorage.getItem('current_organization');
    if (savedOrg) {
      const orgData = JSON.parse(savedOrg);
      if (orgData.id) {
        return orgData.id;
      }
    }
  } catch (error) {
    console.warn('⚠️ فشل في قراءة organization من localStorage:', error);
  }
  
  // ثالثاً: محاولة الحصول على organization ID من auth_user_data
  try {
    const savedUser = localStorage.getItem('auth_user_data');
    if (savedUser) {
      const userData = JSON.parse(savedUser);
      if (userData.organizationId) {
        return userData.organizationId;
      }
    }
  } catch (error) {
    console.warn('⚠️ فشل في قراءة organization ID من auth_user_data:', error);
  }
  
  // رابعاً: محاولة الحصول على organization ID من user profile
  try {
    const savedProfile = localStorage.getItem('current_user_profile');
    if (savedProfile) {
      const profileData = JSON.parse(savedProfile);
      if (profileData.organization_id) {
        return profileData.organization_id;
      }
    }
  } catch (error) {
    console.warn('⚠️ فشل في قراءة organization_id من user profile:', error);
  }
  
  return null;
};

/**
 * تعيين معرف المؤسسة الحالي
 */
export const setCurrentOrganizationId = (orgId: string) => {
  currentOrganizationId = orgId;
  console.log('🏢 تم تعيين معرف المؤسسة للمعترض:', orgId);
};

/**
 * اعتراض وإعادة توجيه الطلبات للنظام الموحد
 */
export const interceptAndRedirect = async (tableName: string, operation: string, params?: any) => {
  if (!BLOCKED_TABLES.includes(tableName)) {
    // السماح بالطلبات غير المحظورة
    return null;
  }

  // تسجيل الطلب المحظور
  const requestKey = `${tableName}_${operation}`;
  const count = blockedRequests.get(requestKey) || 0;
  blockedRequests.set(requestKey, count + 1);
  
  console.warn(`🚫 تم حظر طلب مكرر رقم ${count + 1} إلى ${tableName} - التحويل للنظام الموحد`);

  // إعادة توجيه للنظام الموحد
  const orgId = getCurrentOrganizationId();
  if (!orgId) {
    console.error('❌ معرف المؤسسة غير محدد للمعترض');
    return [];
  }

  try {
    switch (tableName) {
      case 'product_categories':
        return await UnifiedRequestManager.getProductCategories(orgId);
      
      case 'product_subcategories':
        return await UnifiedRequestManager.getProductSubcategories();
      
      case 'organization_settings':
        return await UnifiedRequestManager.getOrganizationSettings(orgId);
      
      case 'organization_subscriptions':
        return await UnifiedRequestManager.getOrganizationSubscriptions(orgId);
      
      case 'organization_apps':
        return await UnifiedRequestManager.getOrganizationApps(orgId);
      
      default:
        console.warn(`⚠️ جدول غير مدعوم في المعترض: ${tableName}`);
        return [];
    }
  } catch (error) {
    console.error(`❌ خطأ في المعترض لـ ${tableName}:`, error);
    return [];
  }
};

/**
 * تحديث Supabase client لاستخدام المعترض
 */
export const enableRequestInterception = () => {
  console.log('🛡️ تم تفعيل اعتراض الطلبات - لا مزيد من الطلبات المكررة!');
  
  // إعادة تعريف دالة from في supabase
  const originalFrom = supabase.from.bind(supabase);
  
  (supabase as any).from = (tableName: string) => {
    const originalTable = originalFrom(tableName);
    
    if (BLOCKED_TABLES.includes(tableName)) {
      // إعادة تعريف select للجداول المحظورة
      const originalSelect = originalTable.select.bind(originalTable);
      const originalEq = originalTable.eq?.bind(originalTable);
      const originalOrder = originalTable.order?.bind(originalTable);
      const originalSingle = originalTable.single?.bind(originalTable);
      const originalLimit = originalTable.limit?.bind(originalTable);
      const originalGt = originalTable.gt?.bind(originalTable);
      
      originalTable.select = (...args: any[]) => {
        console.warn(`🚫 تم اعتراض طلب select إلى ${tableName} - التحويل للنظام الموحد`);
        
        // إنشاء كائن وهمي يحاكي PostgrestFilterBuilder
        const mockBuilder = {
          eq: () => mockBuilder,
          order: () => mockBuilder,
          single: () => mockBuilder,
          limit: () => mockBuilder,
          gt: () => mockBuilder,
          then: async (resolve: Function, reject?: Function) => {
            try {
              const redirectedData = await interceptAndRedirect(tableName, 'select', args);
              const result = {
                data: redirectedData,
                error: null,
                count: null,
                status: 200,
                statusText: 'OK'
              };
              resolve(result);
            } catch (error) {
              if (reject) {
                reject(error);
              } else {
                resolve({ data: null, error, count: null, status: 500, statusText: 'Error' });
              }
            }
          }
        };
        
        return mockBuilder;
      };
    }
    
    return originalTable;
  };
  
  console.log('✅ تم تفعيل اعتراض الطلبات بنجاح');
};

/**
 * إظهار إحصائيات الطلبات المحظورة
 */
export const showBlockedRequestsStats = () => {
  console.log('📊 إحصائيات الطلبات المحظورة:');
  blockedRequests.forEach((count, request) => {
    console.log(`   ${request}: ${count} طلب محظور`);
  });
}; 