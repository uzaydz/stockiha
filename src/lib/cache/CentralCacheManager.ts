// 🚫 CACHE SYSTEM DISABLED - تم تعطيل نظام التخزين المؤقت المركزي
// السبب: يسبب ارتفاع مستمر في كاش المتصفح

// نظام تخزين مؤقت مبسط جداً للضرورة فقط
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheOptions {
  ttl?: number; // مدة البقاء بالميلي ثانية
}

export class CentralCacheManager {
  private static instance: CentralCacheManager;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private maxCacheSize = 50; // حد أقصى 50 عنصر فقط

  private constructor() {
    // تنظيف كل 5 دقائق
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  static getInstance(): CentralCacheManager {
    if (!CentralCacheManager.instance) {
      CentralCacheManager.instance = new CentralCacheManager();
    }
    return CentralCacheManager.instance;
  }

  /**
   * حفظ بيانات بسيط - بدون تعقيد
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = 2 * 60 * 1000 } = options; // افتراضي: دقيقتان فقط

    const cached = this.memoryCache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data as T;
    }

    // جلب البيانات
    const data = await fetcher();
    
    // تنظيف الكاش إذا امتلأ
    if (this.memoryCache.size >= this.maxCacheSize) {
      this.memoryCache.clear();
    }
    
    // حفظ البيانات الجديدة
    this.memoryCache.set(key, { data, timestamp: now });
    
    return data;
  }

  /**
   * حفظ بيانات مباشر
   */
  set<T>(key: string, data: T): void {
    if (this.memoryCache.size >= this.maxCacheSize) {
      this.memoryCache.clear();
    }
    this.memoryCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * إزالة مفتاح محدد
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * مسح جميع البيانات
   */
  clear(): void {
    this.memoryCache.clear();
  }

  /**
   * تنظيف البيانات القديمة
   */
  private cleanup(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 دقائق
    
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.memoryCache.delete(key);
      }
    }
  }

  // باقي الوظائف معطلة لتقليل التعقيد
  getStats() {
    return {
      hits: 0,
      misses: 0,
      size: this.memoryCache.size,
      maxSize: this.maxCacheSize
    };
  }

  async batch<T>(requests: Array<{ key: string; fetcher: () => Promise<T>; options?: CacheOptions }>): Promise<T[]> {
    return Promise.all(requests.map(req => this.get(req.key, req.fetcher, req.options)));
  }

  async prefetch<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<void> {
    await this.get(key, fetcher, options);
  }
}

// Export singleton instance
export const cacheManager = CentralCacheManager.getInstance();

// إتاحة CacheManager في window object للتطوير والاختبار
if (typeof window !== 'undefined') {
  (window as any).cacheManager = cacheManager;
}

// Export types
export type { CacheOptions, CacheEntry };
