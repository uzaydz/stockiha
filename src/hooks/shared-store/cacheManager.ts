import type { CachedStoreData, CacheConfig } from './types';

// Cache عام محسن لمنع الاستدعاءات المكررة
let globalStoreDataCache: { [key: string]: any } = {};
let globalCacheTimestamp: { [key: string]: number } = {};
let activeRequests: { [key: string]: Promise<any> } = {};

// 🔥 تحسين: إضافة deduplication أقوى
const requestDeduplication = new Map<string, Promise<any>>();

/**
 * الحصول على البيانات من cache مع دعم النطاقات مع www
 */
export const getCachedData = (key: string): any => {
  // البحث المباشر أولاً
  let cached = globalStoreDataCache[key];
  let timestamp = globalCacheTimestamp[key];

  if (cached && timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) { // 5 دقائق
    return cached;
  }

  // 🔥 جديد: إذا لم نجد البيانات، جرب مفاتيح بديلة للنطاقات مع www
  if (key.includes('store-data-unified-')) {
    const storeIdentifier = key.replace('store-data-unified-', '');

    // جرب مع www. أو بدونها
    const alternativeIdentifier = storeIdentifier.startsWith('www.')
      ? storeIdentifier.substring(4)
      : `www.${storeIdentifier}`;

    const alternativeKey = `store-data-unified-${alternativeIdentifier}`;

    cached = globalStoreDataCache[alternativeKey];
    timestamp = globalCacheTimestamp[alternativeKey];

    if (cached && timestamp && (Date.now() - timestamp) < 5 * 60 * 1000) {
      return cached;
    }
  }

  return null;
};

/**
 * حفظ البيانات في cache مع تنظيف تلقائي
 */
export const setCachedData = (key: string, data: any, ttl: number = 10 * 60 * 1000): void => {
  globalStoreDataCache[key] = data;
  globalCacheTimestamp[key] = Date.now();

  // تنظيف cache قديم تلقائياً
  setTimeout(() => {
    if (globalCacheTimestamp[key] && (Date.now() - globalCacheTimestamp[key]) > ttl) {
      delete globalStoreDataCache[key];
      delete globalCacheTimestamp[key];
    }
  }, ttl);
};

/**
 * دالة محسنة لمنع التكرار مع تسجيل أفضل
 */
export const getOrCreateRequest = (cacheKey: string, requestFn: () => Promise<any>): Promise<any> => {
  // 🔥 تحسين: فحص cache أولاً
  if (globalStoreDataCache[cacheKey]) {
    const cacheAge = Date.now() - globalCacheTimestamp[cacheKey];
    if (cacheAge < 5 * 60 * 1000) { // 5 دقائق
      return Promise.resolve(globalStoreDataCache[cacheKey]);
    }
  }

  // 🔥 تحسين: deduplication أقوى
  if (requestDeduplication.has(cacheKey)) {
    return requestDeduplication.get(cacheKey)!;
  }

  // إنشاء طلب جديد
  const request = requestFn().then(result => {
    // حفظ النتيجة في cache
    globalStoreDataCache[cacheKey] = result;
    globalCacheTimestamp[cacheKey] = Date.now();

    // إزالة من deduplication
    requestDeduplication.delete(cacheKey);

    return result;
  }).catch(error => {
    // إزالة من deduplication في حالة الخطأ
    requestDeduplication.delete(cacheKey);
    throw error;
  });

  // حفظ الطلب في deduplication
  requestDeduplication.set(cacheKey, request);

  return request;
};

/**
 * تنظيف cache محدد
 */
export const clearCache = (key: string): void => {
  delete globalStoreDataCache[key];
  delete globalCacheTimestamp[key];
};

/**
 * تنظيف جميع البيانات المخزنة
 */
export const clearAllCache = (): void => {
  globalStoreDataCache = {};
  globalCacheTimestamp = {};
  activeRequests = {};
  requestDeduplication.clear();
};

/**
 * الحصول على إحصائيات cache
 */
export const getCacheStats = () => {
  return {
    cacheSize: Object.keys(globalStoreDataCache).length,
    activeRequests: Object.keys(activeRequests).length,
    deduplicationSize: requestDeduplication.size
  };
};
