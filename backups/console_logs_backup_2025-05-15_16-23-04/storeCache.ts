import localforage from 'localforage';
import { supabase } from '@/lib/supabase';
import LRUCache from 'lru-cache';

// إنشاء مخزن فورج محلي للمتجر
const storeCache = localforage.createInstance({
  name: 'bazaar-store-cache',
  storeName: 'store-data'
});

// تخزين مؤقت في الذاكرة باستخدام LRU (Least Recently Used) لإدارة الذاكرة
const memoryCache = new LRUCache<string, any>({
  max: 500, // عدد أقصى من المفاتيح
  ttl: 1000 * 60 * 30, // 30 دقيقة
  allowStale: false, // لا تسمح باستخدام القيم منتهية الصلاحية
  updateAgeOnGet: true, // تحديث العمر عند الاستخدام
  updateAgeOnHas: true, // تحديث العمر عند التحقق من الوجود
});

// تعريف أنواع البيانات المخزنة مؤقتاً
interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
  accessCount?: number; // عدد مرات الوصول للتكيف مع سياسات انتهاء الصلاحية
  lastAccessed?: number; // آخر وقت تم الوصول فيه
}

// توسيع أوقات التخزين المؤقت للبيانات الثابتة نسبيًا
// المدة الافتراضية للتخزين المؤقت (بالمللي ثانية) - 30 دقيقة
const DEFAULT_CACHE_TTL = 30 * 60 * 1000;

// تخزين مؤقت طويل المدى (24 ساعة) للبيانات التي لا تتغير كثيرًا
const LONG_CACHE_TTL = 24 * 60 * 60 * 1000;

// مدة قصيرة (5 دقائق) للبيانات المتغيرة بشكل متكرر
const SHORT_CACHE_TTL = 5 * 60 * 1000;

// مفتاح نسخة التخزين المؤقت - يتم زيادته عند تحديث هيكل البيانات
const CACHE_VERSION = '1.2.0';

// حفظ الاستعلامات قيد التنفيذ لمنع الاستعلامات المتكررة المتزامنة
const pendingQueries: Record<string, Promise<any>> = {};

// تتبع إحصائيات التخزين المؤقت لتحسين الأداء
interface CacheStats {
  hits: number;
  misses: number;
  stored: number;
  deleted: number;
}

const cacheStats: CacheStats = {
  hits: 0,
  misses: 0,
  stored: 0,
  deleted: 0
};

/**
 * تحديد إذا كان يجب تمديد فترة انتهاء الصلاحية بناءً على معدل الاستخدام
 * المفاتيح المستخدمة بكثرة تحصل على فترة انتهاء صلاحية أطول
 */
function shouldExtendTtl(accessCount: number, ttl: number): boolean {
  if (accessCount >= 10) {
    return true; // تمديد الفترة للعناصر المستخدمة بكثرة
  }
  return false;
}

/**
 * الحصول على مدة انتهاء صلاحية متكيفة بناءً على استخدام العنصر
 */
function getAdaptiveTtl(accessCount: number, baseTtl: number): number {
  if (accessCount >= 20) {
    return baseTtl * 2; // مضاعفة المدة للعناصر المستخدمة بكثرة جداً
  } else if (accessCount >= 10) {
    return baseTtl * 1.5; // زيادة المدة بنسبة 50% للعناصر المستخدمة بكثرة
  }
  return baseTtl;
}

/**
 * وظيفة لتخزين البيانات في التخزين المؤقت
 */
export async function setCacheData<T>(key: string, data: T, useMemoryCache = false): Promise<void> {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION,
      accessCount: 1,
      lastAccessed: Date.now(),
    };
    
    // تخزين في ذاكرة التطبيق للوصول الأسرع
    if (useMemoryCache) {
      memoryCache.set(key, cacheItem);
    }
    
    await storeCache.setItem(key, cacheItem);
    cacheStats.stored++;
  } catch (error) {
    console.error('[Cache] خطأ في تخزين البيانات مؤقتًا:', error);
  }
}

/**
 * وظيفة للحصول على البيانات من التخزين المؤقت
 */
export async function getCacheData<T>(
  key: string, 
  ttl: number = DEFAULT_CACHE_TTL,
  useMemoryCache = false
): Promise<T | null> {
  try {
    // أولاً، التحقق من وجودها في ذاكرة التطبيق
    if (useMemoryCache && memoryCache.has(key)) {
      const cachedItem = memoryCache.get(key) as CachedData<T>;
      
      if (cachedItem && cachedItem.version === CACHE_VERSION) {
        const now = Date.now();
        const age = now - cachedItem.timestamp;
        
        // تحديث إحصائيات الوصول
        cachedItem.accessCount = (cachedItem.accessCount || 1) + 1;
        cachedItem.lastAccessed = now;
        
        // التحقق من انتهاء الصلاحية
        if (age <= ttl || shouldExtendTtl(cachedItem.accessCount, ttl)) {
          cacheStats.hits++;
          // تحديث القيمة في ذاكرة التطبيق
          memoryCache.set(key, cachedItem);
          return cachedItem.data;
        }
        
        // إذا انتهت الصلاحية، قم بإزالتها من ذاكرة التطبيق
        memoryCache.delete(key);
      }
    }
    
    const cachedItem = await storeCache.getItem<CachedData<T>>(key);
    
    // التحقق من وجود البيانات المخزنة
    if (!cachedItem) {
      cacheStats.misses++;
      return null;
    }
    
    // التحقق من نسخة البيانات
    if (cachedItem.version !== CACHE_VERSION) {
      await storeCache.removeItem(key); // إزالة البيانات القديمة
      cacheStats.deleted++;
      cacheStats.misses++;
      return null;
    }
    
    // التحقق من صلاحية البيانات
    const now = Date.now();
    const age = now - cachedItem.timestamp;
    
    // تحديث إحصائيات الوصول
    cachedItem.accessCount = (cachedItem.accessCount || 1) + 1;
    cachedItem.lastAccessed = now;
    
    // التحقق من انتهاء الصلاحية
    const adaptiveTtl = getAdaptiveTtl(cachedItem.accessCount, ttl);
    
    if (age > adaptiveTtl) {
      cacheStats.misses++;
      return null;
    }
    
    // التخزين في ذاكرة التطبيق للوصول اللاحق السريع
    if (useMemoryCache) {
      memoryCache.set(key, cachedItem);
    }
    
    // تحديث البيانات في التخزين المستديم بإحصائيات الوصول المحدثة
    await storeCache.setItem(key, cachedItem);
    
    cacheStats.hits++;
    return cachedItem.data;
  } catch (error) {
    console.error('[Cache] خطأ في جلب البيانات المخزنة مؤقتًا:', error);
    cacheStats.misses++;
    return null;
  }
}

/**
 * وظيفة لمسح التخزين المؤقت لمفتاح معين
 */
export async function clearCacheItem(key: string): Promise<void> {
  try {
    // حذف من ذاكرة التطبيق
    memoryCache.delete(key);
    
    await storeCache.removeItem(key);
    cacheStats.deleted++;
  } catch (error) {
    console.error('[Cache] خطأ في مسح البيانات المخزنة مؤقتًا:', error);
  }
}

/**
 * وظيفة لمسح جميع بيانات التخزين المؤقت
 */
export async function clearAllCache(): Promise<void> {
  try {
    // مسح ذاكرة التطبيق المؤقتة
    memoryCache.clear();
    
    await storeCache.clear();
    cacheStats.deleted += 100; // قيمة تقريبية
  } catch (error) {
    console.error('[Cache] خطأ في مسح جميع البيانات المخزنة مؤقتًا:', error);
  }
}

/**
 * وظيفة للتحقق من صلاحية التخزين المؤقت وتنفيذ وظيفة جلب البيانات عند الحاجة
 * مع التعامل مع الاستعلامات المتزامنة
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL,
  useMemoryCache = true
): Promise<T> {
  // محاولة الحصول على البيانات من التخزين المؤقت
  const cachedData = await getCacheData<T>(key, ttl, useMemoryCache);
  
  // إذا وجدت البيانات في التخزين المؤقت، أعد استخدامها
  if (cachedData !== null) {
    return cachedData;
  }
  
  // التحقق من وجود استعلام مماثل قيد التنفيذ
  if (pendingQueries[key]) {
    try {
      // انتظار الاستعلام الحالي بدلاً من إنشاء استعلام جديد
      return await pendingQueries[key];
    } catch (error) {
      // في حالة فشل الاستعلام الحالي، نسمح بإنشاء استعلام جديد
      console.error(`[Cache] فشل الاستعلام المعلق لـ ${key}:`, error);
      delete pendingQueries[key];
    }
  }
  
  // إنشاء وعد جديد للاستعلام
  const fetchPromise = fetchFn();
  
  // تسجيل الاستعلام قيد التنفيذ
  pendingQueries[key] = fetchPromise;
  
  try {
    // انتظار النتيجة
    const newData = await fetchPromise;
    
    // تخزين البيانات الجديدة في التخزين المؤقت
    // تأكد من أن البيانات قابلة للتخزين (ليست وعودًا)
    if (newData !== null && typeof newData !== 'undefined' && !(newData instanceof Promise)) {
      try {
        // تجربة تخزين البيانات
        await setCacheData(key, newData, useMemoryCache);
      } catch (error) {
        console.error(`[Cache] خطأ في تخزين البيانات لـ ${key}:`, error);
        // استمر بإرجاع البيانات حتى لو فشل التخزين المؤقت
      }
    } else {
      console.warn(`[Cache] تم تخطي تخزين بيانات غير صالحة لـ ${key}`);
    }
    
    return newData;
  } finally {
    // إزالة الاستعلام من قائمة الاستعلامات قيد التنفيذ
    delete pendingQueries[key];
  }
}

/**
 * وظيفة للحصول على إحصائيات التخزين المؤقت
 */
export function getCacheStats(): CacheStats {
  return { ...cacheStats };
}

/**
 * وظيفة للحصول على النطاق الفرعي للمؤسسة من معرفها
 * مع تحسينات تخزين مؤقت للأداء العالي
 */
export async function getSubdomainFromOrganizationId(organizationId: string): Promise<string | null> {
  if (!organizationId) {
    return null;
  }
  
  const cacheKey = `org_subdomain:${organizationId}`;
  
  return withCache<string | null>(
    cacheKey,
    async () => {
      try {
        const { data, error } = await supabase
          .from('organizations')
          .select('subdomain')
          .eq('id', organizationId)
          .single();
        
        if (error || !data?.subdomain) {
          return null;
        }
        
        return data.subdomain;
      } catch (error) {
        console.error('[Cache] خطأ غير متوقع أثناء جلب النطاق الفرعي:', error);
        return null;
      }
    },
    LONG_CACHE_TTL,
    true
  );
}

/**
 * وظيفة لمسح تخزين المتجر المؤقت باستخدام معرف المؤسسة
 */
export async function clearStoreCacheByOrganizationId(organizationId: string): Promise<void> {
  const subdomain = await getSubdomainFromOrganizationId(organizationId);
  if (subdomain) {
    const cacheKey = `store_data:${subdomain}`;
    await clearCacheItem(cacheKey);
    
    // حذف البيانات ذات الصلة أيضًا
    await clearCacheItem(`categories:${organizationId}`);
    await clearCacheItem(`products:${organizationId}`);
    await clearCacheItem(`shipping:${organizationId}`);
  }
}

// تنظيف التخزين المؤقت بشكل دوري للحفاظ على الأداء
export function setupCacheCleanup(): void {
  // تنفيذ تنظيف التخزين المؤقت كل 30 دقيقة
  setInterval(async () => {
    // الحصول على جميع المفاتيح
    const keys = await storeCache.keys();
    
    const now = Date.now();
    let cleanupCount = 0;
    
    // التحقق من كل مفتاح وحذف العناصر القديمة
    for (const key of keys) {
      try {
        const item = await storeCache.getItem<CachedData<any>>(key);
        
        if (!item) continue;
        
        // حذف العناصر القديمة (أكثر من يوم)
        if (now - item.timestamp > 24 * 60 * 60 * 1000) {
          await storeCache.removeItem(key);
          memoryCache.delete(key);
          cleanupCount++;
        }
        // حذف العناصر ذات الإصدار القديم
        else if (item.version !== CACHE_VERSION) {
          await storeCache.removeItem(key);
          memoryCache.delete(key);
          cleanupCount++;
        }
        // حذف العناصر التي لم يتم الوصول إليها لفترة طويلة (أكثر من 3 ساعات)
        else if (item.lastAccessed && now - item.lastAccessed > 3 * 60 * 60 * 1000 && item.accessCount && item.accessCount < 3) {
          await storeCache.removeItem(key);
          memoryCache.delete(key);
          cleanupCount++;
        }
      } catch (error) {
        console.error(`[Cache] خطأ أثناء تنظيف المفتاح ${key}:`, error);
      }
    }
    
    if (cleanupCount > 0) {
      console.log(`[Cache] تم تنظيف ${cleanupCount} عنصر من التخزين المؤقت`);
      cacheStats.deleted += cleanupCount;
    }
  }, 30 * 60 * 1000);
}

// Initialize cache cleanup on script load
setupCacheCleanup();

// تصدير ثوابت TTL للاستخدام في أجزاء مختلفة من التطبيق
export {
  DEFAULT_CACHE_TTL,
  LONG_CACHE_TTL,
  SHORT_CACHE_TTL
};

export default storeCache; 