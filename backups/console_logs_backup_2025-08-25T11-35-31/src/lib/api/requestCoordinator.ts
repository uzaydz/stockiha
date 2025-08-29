/**
 * نظام تنسيق الطلبات بين الـ Contexts
 * يمنع تكرار الطلبات لنفس البيانات من contexts مختلفة
 */

// نوع البيانات المطلوبة
type DataType = 'organization' | 'organization_settings' | 'products' | 'product_categories' | 'users' | 'customer_testimonials' | 'store_settings';

// نوع الطلب
interface RequestInfo {
  promise: Promise<any>;
  timestamp: number;
  params: any;
  context: string; // أي context طلب البيانات
}

// Registry للطلبات الجارية
const activeRequests = new Map<string, RequestInfo>();

// Registry للبيانات المحفوظة
const dataRegistry = new Map<string, {
  data: any;
  timestamp: number;
  expiresAt: number;
}>();

// مدة صلاحية البيانات (5 دقائق)
const DATA_TTL = 5 * 60 * 1000;

/**
 * إنشاء مفتاح فريد للطلب
 */
function createRequestKey(dataType: DataType, params: any): string {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((obj, key) => {
      obj[key] = params[key];
      return obj;
    }, {} as any);
  
  return `${dataType}:${JSON.stringify(sortedParams)}`;
}

/**
 * فحص صحة البيانات المحفوظة
 */
function isDataValid(cacheEntry: any): boolean {
  return cacheEntry && Date.now() < cacheEntry.expiresAt;
}

/**
 * تسجيل طلب جديد أو إرجاع الطلب الموجود
 */
export function coordinateRequest<T = any>(
  dataType: DataType,
  params: any,
  requestFn: () => Promise<T>,
  contextName: string
): Promise<T> {
  const requestKey = createRequestKey(dataType, params);

  // 1. فحص البيانات المحفوظة أولاً
  const cachedData = dataRegistry.get(requestKey);
  if (isDataValid(cachedData)) {
    return Promise.resolve(cachedData!.data);
  }
  
  // 2. فحص الطلبات الجارية
  const activeRequest = activeRequests.get(requestKey);
  if (activeRequest) {
    return activeRequest.promise;
  }
  
  // 3. إنشاء طلب جديد
  
  const promise = requestFn()
    .then((data) => {
      // حفظ البيانات
      dataRegistry.set(requestKey, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + DATA_TTL
      });

      return data;
    })
    .catch((error) => {
      throw error;
    })
    .finally(() => {
      // إزالة من الطلبات الجارية
      activeRequests.delete(requestKey);
    });
  
  // تسجيل الطلب
  activeRequests.set(requestKey, {
    promise,
    timestamp: Date.now(),
    params,
    context: contextName
  });
  
  return promise;
}

/**
 * إزالة البيانات المنتهية الصلاحية
 */
export function cleanupExpiredData(): void {
  const now = Date.now();
  for (const [key, entry] of dataRegistry.entries()) {
    if (now >= entry.expiresAt) {
      dataRegistry.delete(key);
    }
  }
}

/**
 * مسح جميع البيانات (للاختبار)
 */
export function clearAllData(): void {
  activeRequests.clear();
  dataRegistry.clear();
}

/**
 * إحصائيات الطلبات
 */
export function getRequestStats() {
  return {
    activeRequests: activeRequests.size,
    cachedEntries: dataRegistry.size,
    cacheEntries: Array.from(dataRegistry.entries()).map(([key, entry]) => ({
      key,
      age: Date.now() - entry.timestamp,
      expiresIn: entry.expiresAt - Date.now()
    }))
  };
}

// تنظيف دوري كل دقيقة
if (typeof window !== 'undefined') {
  setInterval(cleanupExpiredData, 60 * 1000);
}
