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

// مدة انتهاء الصلاحية محسنة للأداء السريع (دقيقتان)
const DEFAULT_TTL = 2 * 60 * 1000;

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
  const now = Date.now();
  
  // تنظيف Cache من البيانات المنتهية الصلاحية
  Object.keys(activeRequestsCache).forEach(cacheKey => {
    const entry = activeRequestsCache[cacheKey];
    if (now - entry.timestamp > entry.ttl) {
      delete activeRequestsCache[cacheKey];
    }
  });

  // التحقق من وجود طلب نشط
  if (activeRequestsCache[key]) {
    const entry = activeRequestsCache[key];
    // التحقق من انتهاء الصلاحية
    if (now - entry.timestamp <= entry.ttl) {
      return entry.promise;
    } else {
      // إزالة البيانات المنتهية الصلاحية
      delete activeRequestsCache[key];
    }
  }
  
  // إنشاء طلب جديد
  const promise = requestFn()
    .finally(() => {
      // إزالة من Cache بعد انتهاء الطلب (مع تأخير قصير)
      setTimeout(() => {
        delete activeRequestsCache[key];
      }, 1000); // تأخير ثانية واحدة لضمان عدم التداخل
    });

  // حفظ في Cache
  activeRequestsCache[key] = {
    promise,
    timestamp: now,
    ttl
  };

  return promise;
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
