import localforage from 'localforage';
import { supabase } from '@/lib/supabase';

// إنشاء مخزن فورج محلي للمتجر
const storeCache = localforage.createInstance({
  name: 'bazaar-store-cache',
  storeName: 'store-data'
});

// تعريف أنواع البيانات المخزنة مؤقتاً
interface CachedData<T> {
  data: T;
  timestamp: number;
  version: string;
}

// المدة الافتراضية للتخزين المؤقت (بالمللي ثانية) - 10 دقائق
const DEFAULT_CACHE_TTL = 10 * 60 * 1000;

// مفتاح نسخة التخزين المؤقت - يتم زيادته عند تحديث هيكل البيانات
const CACHE_VERSION = '1.0.0';

/**
 * وظيفة لتخزين البيانات في التخزين المؤقت
 */
export async function setCacheData<T>(key: string, data: T): Promise<void> {
  try {
    const cacheItem: CachedData<T> = {
      data,
      timestamp: Date.now(),
      version: CACHE_VERSION
    };
    
    await storeCache.setItem(key, cacheItem);
    console.log(`[Cache] تم تخزين البيانات مؤقتًا للمفتاح: ${key}`);
  } catch (error) {
    console.error('[Cache] خطأ في تخزين البيانات مؤقتًا:', error);
  }
}

/**
 * وظيفة للحصول على البيانات من التخزين المؤقت
 */
export async function getCacheData<T>(key: string, ttl: number = DEFAULT_CACHE_TTL): Promise<T | null> {
  try {
    const cachedItem = await storeCache.getItem<CachedData<T>>(key);
    
    // التحقق من وجود البيانات المخزنة
    if (!cachedItem) {
      console.log(`[Cache] لم يتم العثور على بيانات للمفتاح: ${key}`);
      return null;
    }
    
    // التحقق من نسخة البيانات
    if (cachedItem.version !== CACHE_VERSION) {
      console.log(`[Cache] نسخة التخزين المؤقت غير متطابقة للمفتاح: ${key}`);
      await storeCache.removeItem(key); // إزالة البيانات القديمة
      return null;
    }
    
    // التحقق من صلاحية البيانات
    const now = Date.now();
    const age = now - cachedItem.timestamp;
    
    if (age > ttl) {
      console.log(`[Cache] البيانات منتهية الصلاحية للمفتاح: ${key}, العمر: ${age}ms`);
      return null;
    }
    
    console.log(`[Cache] تم استرداد البيانات المخزنة للمفتاح: ${key}, العمر: ${age}ms`);
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
    await storeCache.removeItem(key);
    console.log(`[Cache] تم مسح البيانات المخزنة للمفتاح: ${key}`);
  } catch (error) {
    console.error('[Cache] خطأ في مسح البيانات المخزنة مؤقتًا:', error);
  }
}

/**
 * وظيفة لمسح جميع بيانات التخزين المؤقت
 */
export async function clearAllCache(): Promise<void> {
  try {
    await storeCache.clear();
    console.log('[Cache] تم مسح جميع البيانات المخزنة مؤقتًا');
  } catch (error) {
    console.error('[Cache] خطأ في مسح جميع البيانات المخزنة مؤقتًا:', error);
  }
}

/**
 * وظيفة للتحقق من صلاحية التخزين المؤقت وتنفيذ وظيفة جلب البيانات عند الحاجة
 */
export async function withCache<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  // محاولة الحصول على البيانات من التخزين المؤقت
  const cachedData = await getCacheData<T>(key, ttl);
  
  // إذا وجدت البيانات في التخزين المؤقت، أعد استخدامها
  if (cachedData !== null) {
    return cachedData;
  }
  
  // جلب البيانات الجديدة
  console.log(`[Cache] جلب بيانات جديدة للمفتاح: ${key}`);
  const newData = await fetchFn();
  
  // تخزين البيانات الجديدة في التخزين المؤقت
  await setCacheData(key, newData);
  
  return newData;
}

/**
 * وظيفة للحصول على النطاق الفرعي للمؤسسة من معرفها
 */
export async function getSubdomainFromOrganizationId(organizationId: string): Promise<string | null> {
  if (!organizationId) {
    console.error('[Cache] معرف المؤسسة غير محدد');
    return null;
  }
  
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('subdomain')
      .eq('id', organizationId)
      .single();
    
    if (error || !data?.subdomain) {
      console.error('[Cache] خطأ في جلب النطاق الفرعي للمؤسسة:', error?.message || 'لم يتم العثور على نطاق فرعي');
      return null;
    }
    
    return data.subdomain;
  } catch (error) {
    console.error('[Cache] خطأ غير متوقع أثناء جلب النطاق الفرعي:', error);
    return null;
  }
}

/**
 * وظيفة لمسح تخزين المتجر المؤقت باستخدام معرف المؤسسة
 */
export async function clearStoreCacheByOrganizationId(organizationId: string): Promise<void> {
  const subdomain = await getSubdomainFromOrganizationId(organizationId);
  if (subdomain) {
    const cacheKey = `store_data:${subdomain}`;
    await clearCacheItem(cacheKey);
    console.log(`[Cache] تم مسح تخزين المتجر المؤقت باستخدام معرف المؤسسة: ${organizationId}, النطاق الفرعي: ${subdomain}`);
  }
}

export default storeCache; 