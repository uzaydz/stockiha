/**
 * مدير الطلبات الموحد - حل نهائي للطلبات المكررة
 * يوحد جميع طلبات API في مكان واحد مع cache ذكي
 */

import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';

// اختبار فوري لـ Supabase - تم إزالة console.log

// معلومات البيئة - تم إزالة console.log

// Global Cache للبيانات - محسن ومطور
const globalCache = new Map<string, CacheEntry<any>>();
const globalActiveRequests = new Map<string, Promise<any>>();

// إضافة نظام تنظيف Cache تلقائي
const CACHE_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 دقائق
const CACHE_MAX_SIZE = 100; // حد أقصى لعدد العناصر في cache

// Global request deduplication - نسخة محسنة
const globalRequestDeduplication = new Map<string, {
  promise: Promise<any>;
  timestamp: number;
}>();

// Cache عالمي للبيانات مع TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * دالة مساعدة لتنظيف Cache المنتهي الصلاحية
 */
function cleanExpiredCache() {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of globalCache.entries()) {
    if ((now - entry.timestamp) > entry.ttl) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => globalCache.delete(key));
  
  // تنظيف الطلبات القديمة أيضاً
  for (const [key, entry] of globalRequestDeduplication.entries()) {
    if ((now - entry.timestamp) > 60000) { // إزالة الطلبات الأقدم من دقيقة
      globalRequestDeduplication.delete(key);
    }
  }
  
  // الحفاظ على حد أقصى للـ cache size
  if (globalCache.size > CACHE_MAX_SIZE) {
    const entriesToDelete = globalCache.size - CACHE_MAX_SIZE;
    const keysToDelete = Array.from(globalCache.keys()).slice(0, entriesToDelete);
    keysToDelete.forEach(key => globalCache.delete(key));
  }
  
  if (import.meta.env.DEV) {
    console.log(`🧹 Cache cleanup: Removed ${expiredKeys.length} expired entries, Cache size: ${globalCache.size}`);
  }
}

// تشغيل تنظيف Cache بشكل دوري
if (typeof window !== 'undefined') {
  setInterval(cleanExpiredCache, CACHE_CLEANUP_INTERVAL);
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
  } else if (key.includes('users')) {
    const orgId = key.split('_').pop();
    endpoint = 'users';
    params = `?organization_id=eq.${orgId}&order=created_at.desc`;
  } else if (key.startsWith('unified_user_')) {
    const userId = key.replace('unified_user_', '');
    endpoint = 'users';
    params = `?id=eq.${userId}&select=*`;
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
    
    // معالجة خاصة للمستخدم الواحد
    if (key.startsWith('unified_user_') && Array.isArray(data) && data.length > 0) {
      return data[0]; // إرجاع المستخدم الأول إذا كان الطلب لمستخدم واحد
    }
    
    return data;
  } catch (error) {
    // لطلبات المستخدم الواحد، إرجاع null بدلاً من array فارغ
    if (key.startsWith('unified_user_')) {
      return null;
    }
    return [];
  }
};

/**
 * تنفيذ طلب مع إدارة Cache والطلبات المكررة - محسن
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
      if (import.meta.env.DEV) {
        console.log(`🎯 Cache hit for: ${key}`);
      }
      return cached.data;
    } else {
      // إزالة البيانات منتهية الصلاحية
      globalCache.delete(key);
    }
  }

  // التحقق من الطلبات المكررة - نسخة محسنة
  if (globalRequestDeduplication.has(key)) {
    const existingRequest = globalRequestDeduplication.get(key)!;
    // التحقق من أن الطلب ليس قديماً جداً
    if ((Date.now() - existingRequest.timestamp) < 30000) { // 30 ثانية
      if (import.meta.env.DEV) {
        console.log(`⚡ Request deduplication for: ${key}`);
      }
      return existingRequest.promise;
    } else {
      // إزالة الطلب القديم
      globalRequestDeduplication.delete(key);
    }
  }

  // التحقق من الطلبات النشطة القديمة
  if (globalActiveRequests.has(key)) {
    if (import.meta.env.DEV) {
      console.log(`🔄 Using active request for: ${key}`);
    }
    return globalActiveRequests.get(key)!;
  }

  // 🔧 استخدام REST API مباشر بدلاً من Supabase client للطلبات المعطلة
  if (key.includes('categories') || key.includes('apps') || key.includes('settings') || key.includes('subscriptions') || key.includes('users')) {
    
    const promise = createDirectRestRequest(key)
      .then(result => {
        // حفظ في الكاش
        globalCache.set(key, {
          data: result,
          timestamp: Date.now(),
          ttl: key.includes('users') ? 15 * 60 * 1000 : 5 * 60 * 1000 // 15 دقيقة للمستخدمين، 5 دقائق للآخرين
        });
        
        if (import.meta.env.DEV) {
          console.log(`✅ Direct REST request completed for: ${key}, result size: ${Array.isArray(result) ? result.length : typeof result}`);
        }
        
        return result;
      })
      .catch(error => {
        if (import.meta.env.DEV) {
          console.error(`❌ Direct REST request failed for: ${key}`, error);
        }
        throw error;
      })
      .finally(() => {
        globalActiveRequests.delete(key);
        globalRequestDeduplication.delete(key);
      });
    
    // تسجيل الطلب في كلا النظامين
    globalActiveRequests.set(key, promise);
    globalRequestDeduplication.set(key, {
      promise,
      timestamp: Date.now()
    });
    
    return promise;
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
      
      if (import.meta.env.DEV) {
        console.log(`✅ Standard request completed for: ${key}`);
      }
      
      return result;
    })
    .catch(error => {
      if (import.meta.env.DEV) {
        console.error(`❌ Standard request failed for: ${key}`, error);
      }
      throw error;
    })
    .finally(() => {
      globalActiveRequests.delete(key);
      globalRequestDeduplication.delete(key);
    });
  
  // تسجيل الطلب في كلا النظامين
  globalActiveRequests.set(key, promise);
  globalRequestDeduplication.set(key, {
    promise,
    timestamp: Date.now()
  });
  
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
   * جلب إعدادات المنظمة - موحد ومحسن مع cache أطول
   */
  static async getOrganizationSettings(orgId: string) {
    if (!orgId) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ getOrganizationSettings: No orgId provided');
      }
      return null;
    }
    
    return executeRequest(
      `unified_org_settings_${orgId}`,
      async () => {
        if (import.meta.env.DEV) {
          console.log(`🔍 Making DB query for org settings: ${orgId}`);
        }
        
        const { data, error } = await supabase
          .from('organization_settings')
          .select('*')
          .eq('organization_id', orgId)
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching organization settings:', error);
          throw error;
        }

        return data;
      },
      30000, // 30 second timeout
      10 * 60 * 1000 // 10 minutes cache
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
   * جلب تطبيقات المنظمة - موحد ومحسن مع cache أطول
   */
  static async getOrganizationApps(orgId: string) {
    if (!orgId) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ getOrganizationApps: No orgId provided');
      }
      return [];
    }
    
    return executeRequest(
      `unified_org_apps_${orgId}`,
      async () => {
        if (import.meta.env.DEV) {
          console.log(`🔍 Making DB query for org apps: ${orgId}`);
        }
        
        // @ts-ignore - جدول organization_apps موجود في قاعدة البيانات
        const { data, error } = await supabase
          .from('organization_apps' as any)
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching organization apps:', error);
          return [];
        }
        
        if (import.meta.env.DEV) {
          console.log(`✅ DB query result for org apps: ${data?.length || 0} items`);
        }
        
        return data || [];
      },
      30 * 60 * 1000 // 30 دقيقة cache للتطبيقات
    );
  }
  
  /**
   * جلب مستخدم بالمعرف - موحد مع cache أطول
   */
  static async getUserById(userId: string) {
    if (!userId) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ getUserById: No userId provided');
      }
      return null;
    }
    
    return executeRequest(
      `unified_user_${userId}`,
      async () => {
        if (import.meta.env.DEV) {
          console.log(`🔍 Making DB query for user: ${userId}`);
        }
        
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching user:', error);
          return null;
        }
        
        if (import.meta.env.DEV) {
          console.log(`✅ DB query result for user: ${data ? 'found' : 'not found'}`);
        }
        
        return data;
      },
      15 * 60 * 1000 // 15 دقيقة cache للمستخدمين
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
      // حذف الطلبات الجارية أيضاً
      for (const key of globalActiveRequests.keys()) {
        if (key.includes(pattern)) {
          globalActiveRequests.delete(key);
        }
      }
      for (const key of globalRequestDeduplication.keys()) {
        if (key.includes(pattern)) {
          globalRequestDeduplication.delete(key);
        }
      }
    } else {
      // حذف كل Cache
      globalCache.clear();
      globalActiveRequests.clear();
      globalRequestDeduplication.clear();
    }
    
    if (import.meta.env.DEV) {
      console.log(`🧹 Cache cleared${pattern ? ` for pattern: ${pattern}` : ' completely'}`);
    }
  }
  
  /**
   * معلومات Cache للتصحيح
   */
  static getCacheInfo() {
    return {
      cacheSize: globalCache.size,
      activeRequests: globalActiveRequests.size,
      deduplicationRequests: globalRequestDeduplication.size,
      cacheKeys: Array.from(globalCache.keys()),
      activeKeys: Array.from(globalActiveRequests.keys()),
      deduplicationKeys: Array.from(globalRequestDeduplication.keys())
    };
  }

  /**
   * جلب فئات المنتجات مع عدد المنتجات - محسن مع cache وdeduplication
   */
  static async getProductCategoriesWithCount(orgId: string) {
    if (!orgId) {
      if (import.meta.env.DEV) {
        console.warn('⚠️ getProductCategoriesWithCount: No orgId provided');
      }
      return [];
    }
    
    return executeRequest(
      `unified_categories_with_count_${orgId}`,
      async () => {
        if (import.meta.env.DEV) {
          console.log(`🔍 Making DB query for categories with count: ${orgId}`);
        }
        
        // أولاً: جلب الفئات
        const categories = await UnifiedRequestManager.getProductCategories(orgId);
        
        if (!categories || categories.length === 0) {
          return [];
        }
        
        // ثانياً: جلب إحصائيات المنتجات للفئات
        try {
          const { data: productCounts, error: countError } = await supabase
            .rpc('get_product_counts_by_category', { org_id: orgId });
            
          if (!countError && productCounts) {
            // تحديث عدد المنتجات لكل فئة
            productCounts.forEach((item: {category_id: string, count: number}) => {
              const category = categories.find(c => c.id === item.category_id);
              if (category) {
                (category as any).product_count = item.count;
              }
            });
          } else {
            // خطة بديلة - جلب عدد المنتجات بطريقة أخرى
            const { data: allProducts, error: productsError } = await supabase
              .from('products')
              .select('id, category_id')
              .eq('organization_id', orgId)
              .eq('is_active', true);
              
            if (!productsError && allProducts && allProducts.length > 0) {
              const categoryCounter: Record<string, number> = {};
              
              allProducts.forEach(product => {
                if (product.category_id) {
                  categoryCounter[product.category_id] = (categoryCounter[product.category_id] || 0) + 1;
                }
              });
              
              categories.forEach(category => {
                (category as any).product_count = categoryCounter[category.id] || 0;
              });
            } else {
              // إضافة product_count صفر لجميع الفئات
              categories.forEach(category => {
                (category as any).product_count = 0;
              });
            }
          }
        } catch (countError) {
          if (import.meta.env.DEV) {
            console.log('Failed to get product counts, using zero counts');
          }
          // إضافة product_count صفر لجميع الفئات
          categories.forEach(category => {
            (category as any).product_count = 0;
          });
        }
        
        return categories;
      },
      30000, // 30 second timeout
      10 * 60 * 1000 // 10 minutes cache لأن هذا استعلام ثقيل
    );
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
    staleTime: 30 * 60 * 1000, // 30 دقيقة cache أطول
    gcTime: 45 * 60 * 1000, // 45 دقيقة
    enabled: !!orgId,
  });
};

export const useUnifiedUser = (userId: string) => {
  return useQuery({
    queryKey: ['unified_user', userId],
    queryFn: () => UnifiedRequestManager.getUserById(userId),
    staleTime: 15 * 60 * 1000, // 15 دقيقة
    gcTime: 30 * 60 * 1000, // 30 دقيقة
    enabled: !!userId,
  });
};

// تصدير المدير للاستخدام المباشر
export default UnifiedRequestManager;

// =================================================================
// 🎯 ENHANCED CACHE MANAGEMENT - إدارة cache محسنة
// =================================================================

/**
 * مسح مفاتيح محددة من globalCache
 */
export const clearGlobalCacheKeys = (keys: string[]): void => {
  console.log('🧹 [UnifiedRequestManager] مسح globalCache keys:', keys);
  keys.forEach(key => {
    if (globalCache.has(key)) {
      globalCache.delete(key);
      console.log(`✅ [UnifiedRequestManager] تم مسح key: ${key}`);
    }
    globalActiveRequests.delete(key);
    globalRequestDeduplication.delete(key);
  });
  console.log('✅ [UnifiedRequestManager] تم مسح جميع المفاتيح المحددة من globalCache');
};

/**
 * مسح جميع مفاتيح cache المرتبطة بمؤسسة معينة
 */
export const clearOrganizationGlobalCache = (organizationId: string): void => {
  console.log('🧹 [UnifiedRequestManager] مسح cache المؤسسة:', organizationId);
  
  const keysToDelete: string[] = [];
  
  // البحث عن جميع المفاتيح المرتبطة بالمؤسسة
  for (const key of globalCache.keys()) {
    if (key.includes(organizationId)) {
      keysToDelete.push(key);
    }
  }
  
  // مسح المفاتيح المكتشفة
  keysToDelete.forEach(key => {
    globalCache.delete(key);
    globalActiveRequests.delete(key);
    globalRequestDeduplication.delete(key);
  });
  
  console.log(`✅ [UnifiedRequestManager] تم مسح ${keysToDelete.length} مفاتيح للمؤسسة ${organizationId}`);
};

// =================================================================
// 🎯 إضافة دوال window للاستخدام العالمي
// =================================================================

if (typeof window !== 'undefined') {
  // دالة لمسح مفاتيح محددة من globalCache
  (window as any).clearUnifiedCache = clearGlobalCacheKeys;
  
  // دالة لمسح جميع cache المؤسسة
  (window as any).clearOrganizationUnifiedCache = clearOrganizationGlobalCache;
  
  // دالة للحصول على حالة globalCache للتشخيص
  (window as any).getUnifiedCacheStats = () => {
    return {
      size: globalCache.size,
      keys: Array.from(globalCache.keys()),
      activeRequests: globalActiveRequests.size,
      activeRequestKeys: Array.from(globalActiveRequests.keys()),
      deduplicationRequests: globalRequestDeduplication.size,
      deduplicationKeys: Array.from(globalRequestDeduplication.keys())
    };
  };
  
  // دالة لتنظيف cache يدوياً
  (window as any).cleanUnifiedCache = cleanExpiredCache;
}