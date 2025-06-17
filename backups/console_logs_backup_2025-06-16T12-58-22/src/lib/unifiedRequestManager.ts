/**
 * مدير الطلبات الموحد - حل نهائي للطلبات المكررة
 * يوحد جميع طلبات API في مكان واحد مع cache ذكي
 */

import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// Map عالمي للطلبات الجارية لمنع الطلبات المكررة
const globalActiveRequests = new Map<string, Promise<any>>();

// Cache عالمي للبيانات مع TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const globalCache = new Map<string, CacheEntry<any>>();

/**
 * دالة مساعدة لتنظيف Cache المنتهي الصلاحية
 */
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, entry] of globalCache.entries()) {
    if (now - entry.timestamp > entry.ttl) {
      globalCache.delete(key);
    }
  }
}

/**
 * تنفيذ طلب مع منع التكرار والـ cache
 */
async function executeRequest<T>(
  key: string, 
  requestFn: () => Promise<T>, 
  ttl: number = 5 * 60 * 1000 // 5 دقائق افتراضي
): Promise<T> {
  // تنظيف Cache المنتهي الصلاحية
  cleanExpiredCache();
  
  // فحص Cache أولاً
  const cached = globalCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < cached.ttl) {
    console.log(`✅ استخدام Cache للمفتاح: ${key}`);
    return cached.data;
  }
  
  // فحص الطلبات الجارية
  if (globalActiveRequests.has(key)) {
    console.log(`⏳ انتظار طلب جاري للمفتاح: ${key}`);
    return globalActiveRequests.get(key)!;
  }
  
  // تنفيذ الطلب الجديد
  console.log(`🚀 تنفيذ طلب جديد للمفتاح: ${key}`);
  const promise = requestFn()
    .then(result => {
      // حفظ في Cache
      globalCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl
      });
      return result;
    })
    .catch(error => {
      console.error(`❌ خطأ في الطلب ${key}:`, error);
      // إرجاع بيانات فارغة بدلاً من إيقاف التطبيق
      const emptyResult = Array.isArray([]) ? [] : null;
      return emptyResult as T;
    })
    .finally(() => {
      // إزالة من الطلبات الجارية
      globalActiveRequests.delete(key);
    });
  
  // حفظ الطلب الجاري
  globalActiveRequests.set(key, promise);
  
  return promise;
}

/**
 * مدير الطلبات الموحد
 */
export class UnifiedRequestManager {
  /**
   * جلب فئات المنتجات - موحد
   */
  static async getProductCategories(orgId: string) {
    return executeRequest(
      `unified_categories_${orgId}`,
      async () => {
        // تمرير علامة لتجنب المعترض
        const { data, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name');
        
        if (error) {
          console.warn('⚠️ خطأ في جلب product_categories:', error);
          return [];
        }
        
        return data || [];
      },
      10 * 60 * 1000 // 10 دقائق
    );
  }
  
  /**
   * جلب إعدادات المنظمة - موحد
   */
  static async getOrganizationSettings(orgId: string) {
    return executeRequest(
      `unified_org_settings_${orgId}`,
      async () => {
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', orgId)
          .single();
        
        if (error) {
          console.warn('⚠️ خطأ في جلب organization_settings:', error);
          return null;
        }
        
        return data;
      },
      15 * 60 * 1000 // 15 دقيقة
    );
  }
  
  /**
   * جلب اشتراكات المنظمة - موحد
   */
  static async getOrganizationSubscriptions(orgId: string) {
    return executeRequest(
      `unified_org_subscriptions_${orgId}`,
      async () => {
        const { data, error } = await supabase
          .from('organization_subscriptions')
          .select('*, plan:plan_id(id, name, code)')
          .eq('organization_id', orgId)
          .eq('status', 'active')
          .gt('end_date', new Date().toISOString())
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.warn('⚠️ خطأ في جلب organization_subscriptions:', error);
          return [];
        }
        
        return data || [];
      },
      30 * 60 * 1000 // 30 دقيقة
    );
  }
  
  /**
   * جلب فئات فرعية - موحد
   */
  static async getProductSubcategories() {
    return executeRequest(
      `unified_subcategories_all`,
      async () => {
        const { data, error } = await supabase
          .from('product_subcategories')
          .select('*')
          .order('name');
        
        if (error) {
          console.warn('⚠️ خطأ في جلب product_subcategories:', error);
          return [];
        }
        
        return data || [];
      },
      15 * 60 * 1000 // 15 دقيقة
    );
  }
  
  /**
   * جلب تطبيقات المنظمة - موحد
   */
  static async getOrganizationApps(orgId: string) {
    return executeRequest(
      `unified_org_apps_${orgId}`,
      async () => {
        const { data, error } = await supabase
          .from('organization_apps')
          .select('*')
          .eq('organization_id', orgId);
        
        if (error) {
          console.warn('⚠️ خطأ في جلب organization_apps:', error);
          return [];
        }
        
        return data || [];
      },
      20 * 60 * 1000 // 20 دقيقة
    );
  }
  
  /**
   * تنظيف Cache عند الحاجة
   */
  static clearCache(pattern?: string) {
    if (pattern) {
      // حذف Cache المطابق للنمط
      for (const key of globalCache.keys()) {
        if (key.includes(pattern)) {
          globalCache.delete(key);
        }
      }
    } else {
      // حذف كل Cache
      globalCache.clear();
    }
    
    // حذف الطلبات الجارية أيضاً
    if (pattern) {
      for (const key of globalActiveRequests.keys()) {
        if (key.includes(pattern)) {
          globalActiveRequests.delete(key);
        }
      }
    } else {
      globalActiveRequests.clear();
    }
  }
  
  /**
   * معلومات Cache للتصحيح
   */
  static getCacheInfo() {
    return {
      cacheSize: globalCache.size,
      activeRequests: globalActiveRequests.size,
      cacheKeys: Array.from(globalCache.keys()),
      activeKeys: Array.from(globalActiveRequests.keys())
    };
  }
}

/**
 * React Query hooks محسنة باستخدام المدير الموحد
 */

export const useUnifiedCategories = (orgId: string) => {
  return useQuery({
    queryKey: ['unified_categories', orgId],
    queryFn: () => UnifiedRequestManager.getProductCategories(orgId),
    staleTime: 10 * 60 * 1000, // 10 دقائق
    gcTime: 15 * 60 * 1000, // 15 دقيقة
    enabled: !!orgId,
  });
};

export const useUnifiedOrganizationSettings = (orgId: string) => {
  return useQuery({
    queryKey: ['unified_org_settings', orgId],
    queryFn: () => UnifiedRequestManager.getOrganizationSettings(orgId),
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 20 * 60 * 1000, // 20 دقيقة
    enabled: !!orgId,
  });
};

export const useUnifiedOrganizationSubscriptions = (orgId: string) => {
  return useQuery({
    queryKey: ['unified_org_subscriptions', orgId],
    queryFn: () => UnifiedRequestManager.getOrganizationSubscriptions(orgId),
    staleTime: 30 * 60 * 1000, // 30 دقيقة
    gcTime: 45 * 60 * 1000, // 45 دقيقة
    enabled: !!orgId,
  });
};

export const useUnifiedSubcategories = () => {
  return useQuery({
    queryKey: ['unified_subcategories'],
    queryFn: () => UnifiedRequestManager.getProductSubcategories(),
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 20 * 60 * 1000, // 20 دقيقة
  });
};

export const useUnifiedOrganizationApps = (orgId: string) => {
  return useQuery({
    queryKey: ['unified_org_apps', orgId],
    queryFn: () => UnifiedRequestManager.getOrganizationApps(orgId),
    staleTime: 20 * 60 * 1000, // 20 دقيقة
    gcTime: 25 * 60 * 1000, // 25 دقيقة
    enabled: !!orgId,
  });
};

// تصدير المدير للاستخدام المباشر
export default UnifiedRequestManager; 