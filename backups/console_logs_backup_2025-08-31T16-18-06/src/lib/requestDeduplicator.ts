/**
 * مدير إلغاء تكرار الطلبات
 * يمنع تنفيذ نفس الاستعلام عدة مرات في نفس الوقت
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  
  // مدة انتظار التخزين المؤقت محسنة للأداء السريع
  private readonly DEFAULT_TTL = 2 * 60 * 1000; // تحسين: دقيقتان بدلاً من 5 دقائق
  private readonly SHORT_TTL = 15 * 1000; // تحسين: 15 ثانية بدلاً من 30 ثانية
  private readonly LONG_TTL = 5 * 60 * 1000; // تحسين: 5 دقائق بدلاً من 15 دقيقة

  /**
   * تنفيذ طلب مع منع التكرار
   */
  async execute<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      useCache?: boolean;
    } = {}
  ): Promise<T> {
    const { ttl = this.DEFAULT_TTL, forceRefresh = false, useCache = true } = options;
    
    // التحقق من الكاش أولاً (إذا لم يتم إجبار التحديث)
    if (!forceRefresh && useCache) {
      const cached = this.getFromCache<T>(key);
      if (cached) {
        if (process.env.NODE_ENV === 'development') {
        }
        return cached;
      }
    }
    
    // التحقق من وجود طلب معلق
    const pending = this.pendingRequests.get(key);
    if (pending) {
      if (process.env.NODE_ENV === 'development') {
      }
      return pending.promise;
    }
    
    // إنشاء طلب جديد
    if (process.env.NODE_ENV === 'development') {
    }
    
    const startTime = performance.now();
    const promise = this.executeRequest(key, requestFn, ttl, useCache);
    
    // حفظ الطلب المعلق
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now()
    });
    
    // قياس الأداء
    promise.then(() => {
      const executionTime = performance.now() - startTime;
      if (process.env.NODE_ENV === 'development') {
      }
    });
    
    return promise;
  }
  
  private async executeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number,
    useCache: boolean
  ): Promise<T> {
    try {
      const result = await requestFn();
      
      // حفظ في الكاش
      if (useCache) {
        this.setCache(key, result, ttl);
      }
      
      return result;
    } catch (error) {
      throw error;
    } finally {
      // إزالة الطلب المعلق
      this.pendingRequests.delete(key);
    }
  }
  
  /**
   * الحصول على البيانات من الكاش
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * حفظ البيانات في الكاش
   */
  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }
  
  /**
   * مسح الكاش لمفتاح معين
   */
  clearCache(key: string): void {
    this.cache.delete(key);
  }
  
  /**
   * مسح جميع الكاش
   */
  clearAllCache(): void {
    this.cache.clear();
  }
  
  /**
   * الحصول على إحصائيات الكاش
   */
  getCacheStats(): {
    cacheSize: number;
    pendingRequests: number;
    cacheKeys: string[];
  } {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cacheKeys: Array.from(this.cache.keys())
    };
  }
  
  /**
   * تنظيف الكاش المنتهي الصلاحية والطلبات المعلقة القديمة
   */
  cleanup(): void {
    const now = Date.now();
    const maxPendingAge = 30 * 1000; // 30 ثانية
    
    // تنظيف الكاش المنتهي الصلاحية
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
    
    // تنظيف الطلبات المعلقة القديمة
    for (const [key, pending] of this.pendingRequests.entries()) {
      if (now - pending.timestamp > maxPendingAge) {
        this.pendingRequests.delete(key);
      }
    }
  }
  
  /**
   * الحصول على TTL قصير للبيانات التي تتغير بسرعة
   */
  getShortTTL(): number {
    return this.SHORT_TTL;
  }
  
  /**
   * الحصول على TTL طويل للبيانات المستقرة
   */
  getLongTTL(): number {
    return this.LONG_TTL;
  }
}

// إنشاء instance مشترك
export const requestDeduplicator = new RequestDeduplicator();

// تنظيف دوري للكاش
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestDeduplicator.cleanup();
  }, 5 * 60 * 1000); // كل 5 دقائق
}

export default RequestDeduplicator;
