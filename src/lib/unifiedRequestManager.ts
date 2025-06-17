/**
 * مدير الطلبات الموحد - حل نهائي للطلبات المكررة
 * يوحد جميع طلبات API في مكان واحد مع cache ذكي
 */

import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// اختبار فوري لـ Supabase - تم إزالة console.log

// معلومات البيئة - تم إزالة console.log

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
 * إنشاء Promise مع timeout
 */
function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 30000): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });
  
  return Promise.race([
    promise.then(result => {
      clearTimeout(timeoutId);
      return result;
    }).catch(error => {
      clearTimeout(timeoutId);
      throw error;
    }),
    timeoutPromise
  ]);
}

/**
 * إنشاء طلب REST API مباشر لتجنب مشاكل Supabase client
 */
const createDirectRestRequest = async (key: string): Promise<any> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase configuration');
  }

  let endpoint = '';
  let params = '';

  // تحديد نوع الطلب والمعاملات
  if (key.includes('categories') && !key.includes('subcategories')) {
    const orgId = key.split('_').pop();
    endpoint = 'product_categories';
    params = `?organization_id=eq.${orgId}&is_active=eq.true&order=name`;
  } else if (key.includes('subcategories')) {
    // استخراج orgId من key إذا كان متوفر
    const keyParts = key.split('_');
    if (keyParts.length > 2 && keyParts[keyParts.length - 1] !== 'all') {
      const orgId = keyParts[keyParts.length - 1];
      endpoint = 'product_subcategories';
      params = `?organization_id=eq.${orgId}&is_active=eq.true&order=name`;
    } else {
      // للحصول على جميع subcategories
      endpoint = 'product_subcategories';
      params = `?is_active=eq.true&order=name`;
    }
  } else if (key.includes('apps')) {
    const orgId = key.split('_').pop();
    endpoint = 'organization_apps';
    params = `?organization_id=eq.${orgId}&order=created_at.desc`;
  } else if (key.includes('settings')) {
    const orgId = key.split('_').pop();
    endpoint = 'organization_settings';
    params = `?organization_id=eq.${orgId}&limit=1`;
  } else if (key.includes('subscriptions')) {
    const orgId = key.split('_').pop();
    endpoint = 'organization_subscriptions';
    params = `?organization_id=eq.${orgId}&status=in.(active,trial)&order=created_at.desc&limit=1`;
  }

  const url = `${supabaseUrl}/rest/v1/${endpoint}${params}`;

  try {
    // محاولة الحصول على التوكن من المستخدم المسجل
    let authToken = supabaseKey;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        authToken = session.access_token;
      } else {
      }
    } catch (e) {
    }

    const response = await fetch(url, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      // معالجة خاصة للجداول غير الموجودة أو عدم وجود صلاحيات
      if (response.status === 400 || response.status === 404) {
        return [];
      } else if (response.status === 401 || response.status === 403) {
        return [];
      }
      throw new Error(`REST API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    
    if (endpoint === 'organization_apps') {
    }
    
    return data;
  } catch (error) {
    return [];
  }
};

/**
 * تنفيذ طلب مع إدارة Cache والطلبات المكررة
 */
const executeRequest = async <T>(
  key: string,
  requestFunction: () => Promise<T>,
  timeout: number = 30000
): Promise<T> => {
  
  // التحقق من الكاش أولاً
  if (globalCache.has(key)) {
    const cached = globalCache.get(key)!;
    if ((Date.now() - cached.timestamp) < cached.ttl) {
      return cached.data;
    }
  }

  // التحقق من الطلبات النشطة
  if (globalActiveRequests.has(key)) {
    return globalActiveRequests.get(key)!;
  }

  // 🔧 استخدام REST API مباشر بدلاً من Supabase client للطلبات المعطلة
  if (key.includes('categories') || key.includes('apps') || key.includes('settings') || key.includes('subscriptions')) {
    
    const promise = createDirectRestRequest(key);
    globalActiveRequests.set(key, promise);
    
    try {
      const result = await promise;
      
      // حفظ في الكاش
      globalCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      });
      
      globalActiveRequests.delete(key);
      return result;
    } catch (error) {
      globalActiveRequests.delete(key);
      throw error;
    }
  }

  // للطلبات الأخرى، استخدم الطريقة العادية
  const promise = withTimeout(requestFunction(), timeout)
    .then(result => {
      
      // حفظ في الكاش
      globalCache.set(key, {
        data: result,
        timestamp: Date.now(),
        ttl: 5 * 60 * 1000
      });
      
      return result;
    })
    .catch(error => {
      throw error;
    })
    .finally(() => {
      globalActiveRequests.delete(key);
    });
  
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
    
    if (!orgId) {
      return [];
    }
    
    return executeRequest(
      `unified_categories_${orgId}`,
      async () => {
        
        try {
          
          // اختبار بسيط للاتصال
          
          // اختبار المصادقة
          try {
            const authStartTime = performance.now();
            const { data: authData, error: authError } = await supabase.auth.getUser();
            const authDuration = performance.now() - authStartTime;
          } catch (authErr) {
          }
          
          // معلومات الشبكة
          
          const query = supabase
            .from('product_categories')
            .select('*')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('name');

          // قياس وقت الاستعلام
          const startTime = performance.now();
          
          const result = await query;
          
          const endTime = performance.now();
          const duration = endTime - startTime;

          const { data, error } = result;
          
          if (error) {
            throw error;
          }
          
          return data || [];
          
        } catch (error) {
          throw error;
        }
      },
      10 * 60 * 1000 // 10 دقائق
    );
  }
  
  /**
   * جلب إعدادات المنظمة - موحد مع نظام fallback محسن
   */
  static async getOrganizationSettings(orgId: string) {
    
    return executeRequest(
      `unified_org_settings_${orgId}`,
      async () => {
        
        try {
          // استخدام .maybeSingle() بدلاً من .single() لتجنب أخطاء عدم وجود البيانات
          const { data, error } = await supabase
            .from('organization_settings')
            .select('*')
            .eq('organization_id', orgId)
            .maybeSingle();

          if (error) {
            return null;
          }
          
          if (!data) {
            return null;
          }
          
          // التأكد من أن البيانات كائن وليس مصفوفة
          let settingsData = data;
          if (Array.isArray(data)) {
            settingsData = data[0];
          }
          
          return settingsData;
          
        } catch (exception) {
          return null;
        }
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
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (error) {
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
