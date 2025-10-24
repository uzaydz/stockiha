/**
 * 🚀 Request Cache System
 * نظام تخزين مؤقت للطلبات لمنع التكرار
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum cache size
}

class RequestCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pendingRequests = new Map<string, Promise<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize = 100;

  /**
   * الحصول على البيانات من cache أو إجراء الطلب
   */
  async get<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL, maxSize = this.maxSize } = options;
    
    // التحقق من cache أولاً
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      console.log(`📦 [RequestCache] Cache hit for ${key}`);
      return cached.data;
    }

    // التحقق من الطلبات المعلقة
    if (this.pendingRequests.has(key)) {
      console.log(`⏳ [RequestCache] Waiting for pending request ${key}`);
      return this.pendingRequests.get(key)!;
    }

    // إجراء الطلب الجديد
    console.log(`🌐 [RequestCache] Making new request for ${key}`);
    const requestPromise = this.executeRequest(key, fetchFn, ttl);
    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  /**
   * تنفيذ الطلب وحفظ النتيجة في cache
   */
  private async executeRequest<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    ttl: number
  ): Promise<T> {
    try {
      const data = await fetchFn();
      const now = Date.now();
      
      // حفظ في cache
      this.cache.set(key, {
        data,
        timestamp: now,
        expiresAt: now + ttl
      });

      // تنظيف cache إذا تجاوز الحد الأقصى
      this.cleanupCache();
      
      console.log(`✅ [RequestCache] Request completed and cached for ${key}`);
      return data;
    } catch (error) {
      console.error(`❌ [RequestCache] Request failed for ${key}:`, error);
      throw error;
    }
  }

  /**
   * تنظيف cache منتهي الصلاحية
   */
  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    
    // إزالة المدخلات منتهية الصلاحية
    entries.forEach(([key, entry]) => {
      if (now >= entry.expiresAt) {
        this.cache.delete(key);
      }
    });

    // إذا كان cache كبير جداً، إزالة أقدم المدخلات
    if (this.cache.size > this.maxSize) {
      const sortedEntries = entries
        .filter(([key]) => this.cache.has(key))
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toRemove = sortedEntries.slice(0, this.cache.size - this.maxSize);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * مسح cache محدد
   */
  clear(key: string): void {
    this.cache.delete(key);
    console.log(`🗑️ [RequestCache] Cleared cache for ${key}`);
  }

  /**
   * مسح جميع cache
   */
  clearAll(): void {
    this.cache.clear();
    this.pendingRequests.clear();
    console.log(`🗑️ [RequestCache] Cleared all cache`);
  }

  /**
   * الحصول على إحصائيات cache
   */
  getStats() {
    return {
      size: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        age: Date.now() - entry.timestamp,
        expiresIn: entry.expiresAt - Date.now()
      }))
    };
  }
}

// إنشاء instance واحد للاستخدام في التطبيق
export const requestCache = new RequestCache();

/**
 * Hook لاستخدام cache في React components
 */
export function useRequestCache() {
  return {
    get: requestCache.get.bind(requestCache),
    clear: requestCache.clear.bind(requestCache),
    clearAll: requestCache.clearAll.bind(requestCache),
    getStats: requestCache.getStats.bind(requestCache)
  };
}

/**
 * دالة مساعدة لإنشاء cache key
 */
export function createCacheKey(prefix: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  
  return `${prefix}?${sortedParams}`;
}

/**
 * دالة مساعدة للطلبات الشائعة
 */
export const cachedRequests = {
  /**
   * طلب مع cache لمدة 5 دقائق
   */
  async get<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    return requestCache.get(key, fetchFn, { ttl: 5 * 60 * 1000 });
  },

  /**
   * طلب مع cache لمدة دقيقة واحدة (للطلبات الحساسة)
   */
  async getShort<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    return requestCache.get(key, fetchFn, { ttl: 60 * 1000 });
  },

  /**
   * طلب مع cache لمدة 30 ثانية (للطلبات السريعة)
   */
  async getFast<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    return requestCache.get(key, fetchFn, { ttl: 30 * 1000 });
  }
};

export default requestCache;
