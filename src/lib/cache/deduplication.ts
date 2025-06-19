// =================================================================
// 🚀 نظام deduplication متطور لمنع الطلبات المكررة
// =================================================================

interface DeduplicationCache {
  [key: string]: {
    promise: Promise<any>;
    timestamp: number;
    ttl: number;
  };
}

// Cache عالمي للطلبات النشطة
const activeRequestsCache: DeduplicationCache = {};

// مدة انتهاء الصلاحية الافتراضية (5 دقائق)
const DEFAULT_TTL = 5 * 60 * 1000;

/**
 * نظام Deduplication متطور يمنع تنفيذ نفس الطلب في نفس الوقت
 * @param key مفتاح فريد لتحديد الطلب
 * @param requestFn دالة الطلب المراد تنفيذها
 * @param ttl مدة البقاء في Cache (بالملي ثانية)
 * @returns Promise مع النتيجة
 */
export async function deduplicateRequest<T>(
  key: string,
  requestFn: () => Promise<T>,
  ttl: number = DEFAULT_TTL
): Promise<T> {
  console.log('🚫 [Deduplication] DISABLED - Always executing fresh request for:', key);
  
  // Always execute fresh request - no deduplication
  return await requestFn();
}

/**
 * تنظيف Cache يدوياً
 * @param pattern نمط المفاتيح المراد حذفها (اختياري)
 */
export function clearCache(pattern?: string): void {
  if (pattern) {
    const regex = new RegExp(pattern);
    Object.keys(activeRequestsCache).forEach(key => {
      if (regex.test(key)) {
        delete activeRequestsCache[key];
      }
    });
  } else {
    Object.keys(activeRequestsCache).forEach(key => {
      delete activeRequestsCache[key];
    });
  }
}

/**
 * عرض حالة Cache الحالية (للتشخيص)
 */
export function getCacheStatus(): { [key: string]: { age: number; ttl: number } } {
  const now = Date.now();
  const status: { [key: string]: { age: number; ttl: number } } = {};
  
  Object.keys(activeRequestsCache).forEach(key => {
    const entry = activeRequestsCache[key];
    status[key] = {
      age: now - entry.timestamp,
      ttl: entry.ttl
    };
  });
  
  return status;
}

/**
 * إنشاء مفتاح Cache ذكي لنقطة البيع
 */
export function createPOSCacheKey(type: string, orgId: string, ...params: string[]): string {
  return `pos-${type}-${orgId}${params.length ? '-' + params.join('-') : ''}`;
}

// تصدير default لسهولة الاستخدام
export default deduplicateRequest;
