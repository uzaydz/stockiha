/**
 * مدير الطلبات المركزي لمنع التحميل المتزامن والطلبات المكررة
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
  priority: number;
}

class RequestManager {
  private static instance: RequestManager;
  private pendingRequests = new Map<string, PendingRequest>();
  private requestQueue: Array<{ key: string; priority: number; fn: () => Promise<any>; resolve: Function; reject: Function }> = [];
  private isProcessingQueue = false;
  private maxConcurrentRequests = 3; // عدد أقصى من الطلبات المتزامنة
  private currentRequests = 0;

  static getInstance(): RequestManager {
    if (!RequestManager.instance) {
      RequestManager.instance = new RequestManager();
    }
    return RequestManager.instance;
  }

  /**
   * تنفيذ طلب مع منع التكرار والأولوية
   */
  async executeRequest<T>(
    key: string, 
    requestFn: () => Promise<T>, 
    options: {
      priority?: number; // أولوية أعلى = يتم تنفيذه أولاً
      ttl?: number; // مدة صالحية الطلب المعلق
      forceNew?: boolean; // إجبار طلب جديد حتى لو كان هناك طلب معلق
    } = {}
  ): Promise<T> {
    const { priority = 5, ttl = 30000, forceNew = false } = options;
    
    // التحقق من وجود طلب معلق للنفس المفتاح
    const existingRequest = this.pendingRequests.get(key);
    if (existingRequest && !forceNew) {
      // التحقق من انتهاء صلاحية الطلب المعلق
      if (Date.now() - existingRequest.timestamp < ttl) {
        return existingRequest.promise;
      } else {
        // حذف الطلب المنتهي الصلاحية
        this.pendingRequests.delete(key);
      }
    }

    // إذا كنا في حد الطلبات المتزامنة، أضف للطابور
    if (this.currentRequests >= this.maxConcurrentRequests) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ key, priority, fn: requestFn, resolve, reject });
        // ترتيب الطابور حسب الأولوية
        this.requestQueue.sort((a, b) => b.priority - a.priority);
      });
    }

    return this.executeRequestDirectly(key, requestFn, priority);
  }

  private async executeRequestDirectly<T>(key: string, requestFn: () => Promise<T>, priority: number): Promise<T> {
    this.currentRequests++;

    const pendingRequest: PendingRequest = {
      promise: requestFn().finally(() => {
        this.currentRequests--;
        this.pendingRequests.delete(key);
        this.processQueue(); // معالجة الطابور بعد انتهاء الطلب
      }),
      timestamp: Date.now(),
      priority
    };

    this.pendingRequests.set(key, pendingRequest);
    return pendingRequest.promise;
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0 || this.currentRequests >= this.maxConcurrentRequests) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.requestQueue.length > 0 && this.currentRequests < this.maxConcurrentRequests) {
      const queuedRequest = this.requestQueue.shift();
      if (queuedRequest) {
        try {
          const result = await this.executeRequestDirectly(queuedRequest.key, queuedRequest.fn, queuedRequest.priority);
          queuedRequest.resolve(result);
        } catch (error) {
          queuedRequest.reject(error);
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * الحصول على إحصائيات الطلبات
   */
  getStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      queuedRequests: this.requestQueue.length,
      currentRequests: this.currentRequests,
      maxConcurrentRequests: this.maxConcurrentRequests
    };
  }

  /**
   * مسح جميع الطلبات المعلقة
   */
  clearAll(): void {
    this.pendingRequests.clear();
    this.requestQueue.length = 0;
    this.currentRequests = 0;
  }

  /**
   * تحديث حد الطلبات المتزامنة
   */
  setMaxConcurrentRequests(max: number): void {
    this.maxConcurrentRequests = max;
    this.processQueue(); // إعادة معالجة الطابور مع الحد الجديد
  }
}

// تصدير مدير الطلبات المركزي
export const requestManager = RequestManager.getInstance();

// إضافة للنافذة للتشخيص
if (typeof window !== 'undefined') {
  (window as any).requestManager = requestManager;
}

// مدير طلبات شامل لمنع التكرار على مستوى Supabase
import { supabase } from './supabase-client';

interface RequestCacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// خريطة cache للطلبات
const requestsCache = new Map<string, RequestCacheEntry>();

// إحصائيات التحسين
let stats = {
  totalRequests: 0,
  cachedResponses: 0,
  duplicatesPrevented: 0,
  activeInterceptions: 0
};

// إعدادات cache لكل نوع بيانات
const CACHE_CONFIG = {
  'yalidine_provinces_global': 30 * 60 * 1000, // 30 دقيقة
  'organizations': 15 * 60 * 1000, // 15 دقيقة  
  'product_categories': 20 * 60 * 1000, // 20 دقيقة
  'products': 10 * 60 * 1000, // 10 دقائق
  'services': 15 * 60 * 1000, // 15 دقيقة
  'shipping_providers': 30 * 60 * 1000, // 30 دقيقة
  'shipping_provider_clones': 10 * 60 * 1000, // 10 دقائق
  'shipping_provider_settings': 15 * 60 * 1000, // 15 دقيقة
  'users': 20 * 60 * 1000, // 20 دقيقة
  'orders': 5 * 60 * 1000, // 5 دقائق
  'customers': 10 * 60 * 1000, // 10 دقائق
  'store_settings': 20 * 60 * 1000, // 20 دقيقة
  'default': 5 * 60 * 1000 // 5 دقائق افتراضي
};

// إنشاء مفتاح cache من URL
function createCacheKey(url: string, options?: any): string {
  try {
    const urlObj = new URL(url);
    const table = extractTableName(urlObj.pathname);
    const params = urlObj.searchParams.toString();
    
    // مفتاح مبسط للطلبات المتشابهة
    const method = options?.method || 'GET';
    return `${method}:${table}:${params}`;
  } catch (error) {
    return `${url}:${JSON.stringify(options || {})}`;
  }
}

// استخراج اسم الجدول من المسار
function extractTableName(pathname: string): string {
  const match = pathname.match(/\/rest\/v1\/([^\/\?]+)/);
  return match ? match[1] : 'unknown';
}

// تحديد TTL حسب نوع البيانات
function getTTL(tableName: string): number {
  return CACHE_CONFIG[tableName] || CACHE_CONFIG.default;
}

// التحقق من صحة البيانات المخزنة
function isValidCacheEntry(entry: RequestCacheEntry): boolean {
  const now = Date.now();
  return (now - entry.timestamp) < entry.ttl;
}

// تنظيف البيانات المنتهية الصلاحية
function cleanExpiredCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of requestsCache.entries()) {
    if (!isValidCacheEntry(entry)) {
      requestsCache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
  }
}

// اعتراض fetch العادي
const originalFetch = globalThis.fetch;

async function interceptedFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input.toString();
  
  // فقط للطلبات التي تخص Supabase
  if (!url.includes('supabase.co/rest/v1/')) {
    return originalFetch(input, init);
  }
  
  stats.totalRequests++;
  const cacheKey = createCacheKey(url, init);
  const tableName = extractTableName(new URL(url).pathname);

  // التحقق من وجود البيانات في cache
  const cachedEntry = requestsCache.get(cacheKey);
  if (cachedEntry && isValidCacheEntry(cachedEntry)) {
    stats.cachedResponses++;
    stats.duplicatesPrevented++;
    
    // إنشاء Response مزيفة من البيانات المحفوظة
    return new Response(JSON.stringify(cachedEntry.data), {
      status: 200,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // تنفيذ الطلب الأصلي
  const response = await originalFetch(input, init);
  
  // حفظ النتيجة في cache إذا كان الطلب ناجحاً
  if (response.ok) {
    try {
      const responseClone = response.clone();
      const data = await responseClone.json();
      
      const ttl = getTTL(tableName);
      requestsCache.set(cacheKey, {
        data,
        timestamp: Date.now(),
        ttl
      });
      
    } catch (error) {
    }
  }
  
  return response;
}

// اعتراض Supabase client مباشرة
function interceptSupabaseClient() {
  try {
    stats.activeInterceptions++;
    
    // اعتراض العمليات الأساسية
    const originalFrom = supabase.from;
    supabase.from = function(table: string) {
      
      const query = originalFrom.call(this, table);
      
      // اعتراض select operations
      const originalSelect = query.select;
      query.select = function(columns?: string) {
        return originalSelect.call(this, columns);
      };
      
      return query;
    };
    
  } catch (error) {
  }
}

// تشغيل النظام
export function initializeRequestManager(): void {
  
  // استبدال fetch العادي
  globalThis.fetch = interceptedFetch;
  
  // اعتراض Supabase client
  interceptSupabaseClient();
  
  // تنظيف دوري للبيانات المنتهية الصلاحية
  setInterval(cleanExpiredCache, 2 * 60 * 1000); // كل دقيقتين
  
  // تعريف دوال التشخيص عالمياً
  (globalThis as any).requestManagerStats = () => {
    
    let tableStats: Record<string, number> = {};
    for (const [key] of requestsCache.entries()) {
      const table = key.split(':')[1] || 'unknown';
      tableStats[table] = (tableStats[table] || 0) + 1;
    }
  };
  
  (globalThis as any).clearRequestCache = () => {
    const size = requestsCache.size;
    requestsCache.clear();
  };
  
}

// إحصائيات سريعة
export function getRequestStats() {
  return {
    ...stats,
    cacheSize: requestsCache.size,
    hitRate: ((stats.cachedResponses / Math.max(stats.totalRequests, 1)) * 100).toFixed(2) + '%'
  };
}

export default {
  initializeRequestManager,
  getRequestStats
};
