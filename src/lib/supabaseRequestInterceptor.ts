/**
 * اعتراض خاص لطلبات Supabase لمنع التكرار النهائي
 */

import { supabase } from './supabase-client';

// خريطة cache للطلبات مع معلومات مفصلة
const requestCache = new Map<string, {
  data: any;
  timestamp: number;
  status: 'pending' | 'completed' | 'error';
  promise?: Promise<any>;
}>();

// إحصائيات التحسين
let interceptorStats = {
  totalInterceptions: 0,
  cacheHits: 0,
  duplicatesPrevented: 0,
  pendingPrevented: 0
};

// مدة cache لكل نوع طلب (بالميللي ثانية)
const CACHE_DURATIONS = {
  'yalidine_provinces_global': 30 * 60 * 1000, // 30 دقيقة
  'organizations': 20 * 60 * 1000, // 20 دقيقة
  'product_categories': 20 * 60 * 1000, // 20 دقيقة
  'shipping_providers': 30 * 60 * 1000, // 30 دقيقة
  'shipping_provider_clones': 15 * 60 * 1000, // 15 دقيقة
  'shipping_provider_settings': 15 * 60 * 1000, // 15 دقيقة
  'products': 10 * 60 * 1000, // 10 دقائق
  'services': 15 * 60 * 1000, // 15 دقيقة
  'users': 20 * 60 * 1000, // 20 دقيقة
  'customers': 10 * 60 * 1000, // 10 دقائق
  'store_settings': 20 * 60 * 1000, // 20 دقيقة
  'orders': 5 * 60 * 1000, // 5 دقائق (بيانات متغيرة)
  'default': 10 * 60 * 1000 // 10 دقائق افتراضي
};

// دالة لإنشاء مفتاح cache موحد
function createCacheKey(url: string, options?: any): string {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const searchParams = parsedUrl.searchParams;
    
    // استخراج اسم الجدول
    const table = pathname.split('/').pop() || 'unknown';
    
    // تنظيم المعاملات
    const sortedParams = Array.from(searchParams.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
    
    const method = options?.method || 'GET';
    return `${method}:${table}:${sortedParams}`;
  } catch (error) {
    return `fallback:${url}:${JSON.stringify(options || {})}`;
  }
}

// دالة لاستخراج اسم الجدول من URL
function extractTableName(url: string): string {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/rest\/v1\/([^\/\?]+)/);
    return match ? match[1] : 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

// دالة للتحقق من صحة cache
function isCacheValid(entry: any, tableName: string): boolean {
  if (!entry) return false;
  
  const duration = CACHE_DURATIONS[tableName] || CACHE_DURATIONS.default;
  const age = Date.now() - entry.timestamp;
  
  return age < duration;
}

// الاعتراض الأساسي للـ fetch
const originalFetch = globalThis.fetch;

globalThis.fetch = async function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  
  // فقط اعتراض طلبات Supabase
  if (!url.includes('supabase.co/rest/v1/')) {
    return originalFetch(input, init);
  }
  
  // استثناء خاص للفئات - لا نعترض عليها أبداً
  if (url.includes('product_categories')) {
    return originalFetch(input, init);
  }
  
  interceptorStats.totalInterceptions++;
  
  const cacheKey = createCacheKey(url, init);
  const tableName = extractTableName(url);

  // التحقق من cache موجود وصالح
  const cachedEntry = requestCache.get(cacheKey);
  if (cachedEntry && isCacheValid(cachedEntry, tableName)) {
    
    // إذا كان الطلب في الانتظار، ارجع نفس Promise
    if (cachedEntry.status === 'pending' && cachedEntry.promise) {
      interceptorStats.pendingPrevented++;
      return cachedEntry.promise;
    }
    
    // إذا كان مكتمل، ارجع البيانات من cache
    if (cachedEntry.status === 'completed') {
      interceptorStats.cacheHits++;
      interceptorStats.duplicatesPrevented++;
      
      return new Response(JSON.stringify(cachedEntry.data), {
        status: 200,
        statusText: 'OK',
        headers: {
          'Content-Type': 'application/json',
          'X-Cache': 'HIT'
        }
      });
    }
  }
  
  // إنشاء طلب جديد
  
  const requestPromise = originalFetch(input, init).then(async (response) => {
    const responseClone = response.clone();
    
    try {
      if (response.ok) {
        const data = await responseClone.json();
        
        // حفظ النتيجة في cache
        requestCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          status: 'completed'
        });
        
      } else {
        // حفظ الخطأ أيضاً لمنع إعادة المحاولة
        requestCache.set(cacheKey, {
          data: null,
          timestamp: Date.now(),
          status: 'error'
        });
      }
    } catch (error) {
    }
    
    return response;
  });
  
  // حفظ الطلب المعلق
  requestCache.set(cacheKey, {
    data: null,
    timestamp: Date.now(),
    status: 'pending',
    promise: requestPromise
  });
  
  return requestPromise;
};

// تنظيف دوري للـ cache
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of requestCache.entries()) {
    const tableName = key.split(':')[1] || 'default';
    if (!isCacheValid(entry, tableName)) {
      requestCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
  }
}, 5 * 60 * 1000); // كل 5 دقائق

// اعتراض XMLHttpRequest للطلبات القديمة
const OriginalXHR = window.XMLHttpRequest;
(window.XMLHttpRequest as any) = function() {
  const xhr = new OriginalXHR();
  const originalOpen = xhr.open;
  const originalSend = xhr.send;
  
  xhr.open = function(method: string, url: string | URL, ...args: any[]) {
    const urlString = url.toString();
    
    if (urlString.includes('supabase.co/rest/v1/')) {
      const cacheKey = createCacheKey(urlString, { method });
      const tableName = extractTableName(urlString);
      const cachedEntry = requestCache.get(cacheKey);
      
      if (cachedEntry && isCacheValid(cachedEntry, tableName) && cachedEntry.status === 'completed') {
        interceptorStats.duplicatesPrevented++;
        
        // محاكاة استجابة ناجحة
        setTimeout(() => {
          Object.defineProperty(xhr, 'status', { value: 200, writable: false });
          Object.defineProperty(xhr, 'statusText', { value: 'OK', writable: false });
          Object.defineProperty(xhr, 'responseText', { 
            value: JSON.stringify(cachedEntry.data), 
            writable: false 
          });
          Object.defineProperty(xhr, 'readyState', { value: 4, writable: false });
          
          if (xhr.onreadystatechange) xhr.onreadystatechange.call(xhr, new Event('readystatechange'));
          if (xhr.onload) xhr.onload.call(xhr, new Event('load'));
        }, 0);
        
        return;
      }
    }
    
    return originalOpen.apply(this, [method, url, ...args]);
  };
  
  return xhr;
};

// دوال التشخيص العامة
(globalThis as any).supabaseInterceptorStats = () => {
  
  // تفاصيل cache حسب الجدول
  const tableStats: Record<string, number> = {};
  for (const [key] of requestCache.entries()) {
    const table = key.split(':')[1] || 'unknown';
    tableStats[table] = (tableStats[table] || 0) + 1;
  }
  
};

(globalThis as any).clearSupabaseCache = () => {
  const size = requestCache.size;
  requestCache.clear();
};

// تصدير الدوال للاستخدام الخارجي
export const interceptSupabaseRequests = () => {
};

export const getInterceptorStats = () => interceptorStats;

export default { 
  interceptSupabaseRequests, 
  getInterceptorStats,
  supabaseInterceptorStats: (globalThis as any).supabaseInterceptorStats,
  clearSupabaseCache: (globalThis as any).clearSupabaseCache
};
