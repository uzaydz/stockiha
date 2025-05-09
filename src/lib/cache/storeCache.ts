import localforage from 'localforage';
import { supabase } from '@/lib/supabase';

// إنشاء مخزن فورج محلي للمتجر
const storeCache = localforage.createInstance({
  name: 'bazaar-store-cache',
  storeName: 'store-data'
});

// تخزين مؤقت للذاكرة للاستعلامات الشائعة جدًا
const memoryCache: Record<string, any> = {};

// تعريف أنواع البيانات المخزنة مؤقتاً
interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

// توسيع أوقات التخزين المؤقت للبيانات الثابتة نسبيًا
// المدة الافتراضية للتخزين المؤقت (بالمللي ثانية) - 30 دقيقة
const DEFAULT_CACHE_TTL = 30 * 60 * 1000;

// تخزين مؤقت طويل المدى (24 ساعة) للبيانات التي لا تتغير كثيرًا
const LONG_CACHE_TTL = 24 * 60 * 60 * 1000;

// مدة قصيرة (5 دقائق) للبيانات المتغيرة بشكل متكرر
const SHORT_CACHE_TTL = 5 * 60 * 1000;

// مفتاح نسخة التخزين المؤقت - يتم زيادته عند تحديث هيكل البيانات
const CACHE_VERSION = '1.1.0';

// حفظ الاستعلامات قيد التنفيذ لمنع الاستعلامات المتكررة المتزامنة
const pendingQueries: Record<string, Promise<any>> = {};

/**
 * وظيفة لتخزين البيانات في التخزين المؤقت
 */
export async function setCacheData<T>(key: string, data: T, useMemoryCache = false): Promise<void> {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    // تخزين في ذاكرة التطبيق للوصول الأسرع
    if (useMemoryCache) {
      memoryCache[key] = cacheItem;
    }
    
    await storeCache.setItem(key, cacheItem);
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
    if (useMemoryCache && memoryCache[key]) {
      const cachedItem = memoryCache[key] as CachedData<T>;
      const now = Date.now();
      const age = now - cachedItem.timestamp;
      
      if (age <= ttl && cachedItem.version === CACHE_VERSION) {
        return cachedItem.data;
      }
    }
    
    const cachedItem = await storeCache.getItem<CachedData<T>>(key);
    
    // التحقق من وجود البيانات المخزنة
    if (!cachedItem) {
      return null;
    }
    
    // التحقق من نسخة البيانات
    if (cachedItem.version !== CACHE_VERSION) {
      await storeCache.removeItem(key); // إزالة البيانات القديمة
      return null;
    }
    
    // التحقق من صلاحية البيانات
    const now = Date.now();
    const age = now - cachedItem.timestamp;
    
    if (age > ttl) {
      return null;
    }
    
    // التخزين في ذاكرة التطبيق للوصول اللاحق السريع
    if (useMemoryCache) {
      memoryCache[key] = cachedItem;
    }
    
    return cachedItem.data;
  } catch (error) {
    console.error('[Cache] خطأ في جلب البيانات المخزنة مؤقتًا:', error);
    return null;
  }
}

/**
 * وظيفة لمسح التخزين المؤقت لمفتاح معين
 */
export async function clearCacheItem(key: string): Promise<void> {
  try {
    // حذف من ذاكرة التطبيق
    if (memoryCache[key]) {
      delete memoryCache[key];
    }
    
    await storeCache.removeItem(key);
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
    Object.keys(memoryCache).forEach(key => {
      delete memoryCache[key];
    });
    
    await storeCache.clear();
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
    return pendingQueries[key];
  }
  
  // جلب البيانات الجديدة
  try {
    // تسجيل الاستعلام قيد التنفيذ
    pendingQueries[key] = fetchFn();
    
    // انتظار النتيجة
    const newData = await pendingQueries[key];
    
    // تخزين البيانات الجديدة في التخزين المؤقت
    await setCacheData(key, newData, useMemoryCache);
    
    return newData;
  } finally {
    // إزالة الاستعلام من قائمة الاستعلامات قيد التنفيذ
    delete pendingQueries[key];
  }
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
    await clearCacheItem(`settings:${organizationId}`);
    
    // مسح ذاكرة التطبيق المؤقتة للبيانات ذات الصلة
    Object.keys(memoryCache).forEach(key => {
      if (key.includes(organizationId) || key.includes(subdomain)) {
        delete memoryCache[key];
      }
    });
  }
}

// تصدير ثوابت TTL للاستخدام في أجزاء مختلفة من التطبيق
export {
  DEFAULT_CACHE_TTL,
  LONG_CACHE_TTL,
  SHORT_CACHE_TTL
};

export default storeCache; 