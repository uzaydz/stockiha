/**
 * محسن الطلبات - لتقليل الاستدعاءات المتكررة وتحسين الأداء
 */

interface RequestConfig {
  endpoint: string;
  cacheTime: number;
  deduplicationTime: number;
  maxRetries: number;
  timeout: number;
}

interface CachedRequest {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class RequestOptimizer {
  private cache = new Map<string, CachedRequest>();
  private activeRequests = new Map<string, Promise<any>>();
  private requestCounts = new Map<string, number>();
  private lastRequestTimes = new Map<string, number>();

  /**
   * تنفيذ طلب محسن مع cache و deduplication
   */
  async executeRequest<T>(
    endpoint: string,
    requestFn: () => Promise<T>,
    config: Partial<RequestConfig> = {}
  ): Promise<T> {
    const {
      cacheTime = 5 * 60 * 1000, // 5 دقائق
      deduplicationTime = 30 * 1000, // 30 ثانية
      maxRetries = 3,
      timeout = 30000
    } = config;

    const cacheKey = endpoint;
    const now = Date.now();

    // التحقق من الكاش
    const cached = this.cache.get(cacheKey);
    if (cached && now < cached.expiresAt) {
      return cached.data;
    }

    // التحقق من الطلبات النشطة
    if (this.activeRequests.has(cacheKey)) {
      return this.activeRequests.get(cacheKey)!;
    }

    // التحقق من الاستدعاءات المتكررة
    const lastRequestTime = this.lastRequestTimes.get(cacheKey) || 0;
    if (now - lastRequestTime < deduplicationTime) {
      console.warn(`⚠️ [RequestOptimizer] استدعاء متكرر لـ ${endpoint} بعد ${now - lastRequestTime}ms`);
    }

    // إنشاء الطلب
    const requestPromise = this.createRequestWithRetry(requestFn, maxRetries, timeout);
    
    // تسجيل الطلب النشط
    this.activeRequests.set(cacheKey, requestPromise);
    this.lastRequestTimes.set(cacheKey, now);

    try {
      const result = await requestPromise;
      
      // حفظ في الكاش
      this.cache.set(cacheKey, {
        data: result,
        timestamp: now,
        expiresAt: now + cacheTime
      });

      return result;
    } finally {
      // إزالة من الطلبات النشطة
      this.activeRequests.delete(cacheKey);
    }
  }

  /**
   * إنشاء طلب مع إعادة المحاولة
   */
  private async createRequestWithRetry<T>(
    requestFn: () => Promise<T>,
    maxRetries: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`Request timeout after ${timeout}ms`)), timeout);
        });

        const result = await Promise.race([requestFn(), timeoutPromise]);
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }

        // انتظار قبل إعادة المحاولة
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    throw lastError!;
  }

  /**
   * مسح الكاش
   */
  clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * الحصول على إحصائيات
   */
  getStats() {
    const now = Date.now();
    const activeRequests = Array.from(this.activeRequests.keys());
    const cachedRequests = Array.from(this.cache.entries())
      .filter(([_, cached]) => now < cached.expiresAt)
      .map(([key, cached]) => ({
        key,
        age: now - cached.timestamp,
        expiresIn: cached.expiresAt - now
      }));

    return {
      activeRequests,
      cachedRequests,
      cacheSize: this.cache.size,
      activeRequestsCount: this.activeRequests.size
    };
  }

  /**
   * تنظيف الكاش المنتهي الصلاحية
   */
  cleanup() {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now >= cached.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// إنشاء مثيل عالمي
export const requestOptimizer = new RequestOptimizer();

// دالة مساعدة لتنظيف الكاش تلقائياً
if (typeof window !== 'undefined') {
  setInterval(() => {
    requestOptimizer.cleanup();
  }, 60000); // كل دقيقة
}

// إضافة للـ window للاستخدام في console
if (typeof window !== 'undefined') {
  (window as any).requestOptimizer = requestOptimizer;
} 