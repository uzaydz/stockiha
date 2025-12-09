/**
 * CentralCacheManager - نظام تخزين مؤقت محسّن مع LRU
 *
 * التحسينات:
 * - LRU (Least Recently Used): يحذف الأقدم استخداماً بدلاً من مسح الكل
 * - TTL: مدة صلاحية لكل عنصر
 * - إحصائيات hits/misses للمراقبة
 * - تنظيف دوري للعناصر المنتهية الصلاحية
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  lastAccess: number;
  ttl: number;
}

interface CacheOptions {
  /** مدة البقاء بالميلي ثانية (افتراضي: 2 دقائق) */
  ttl?: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  evictions: number;
  hitRate: string;
}

export class CentralCacheManager {
  private static instance: CentralCacheManager;
  private memoryCache: Map<string, CacheEntry<unknown>> = new Map();
  private readonly maxCacheSize: number;
  private readonly defaultTTL: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // إحصائيات الأداء
  private stats = {
    hits: 0,
    misses: 0,
    evictions: 0
  };

  private constructor(maxSize: number = 30, defaultTTL: number = 2 * 60 * 1000) {
    // ⚡ تقليل الحد الأقصى من 100 إلى 30 لتوفير الذاكرة
    this.maxCacheSize = maxSize;
    this.defaultTTL = defaultTTL;

    // ⚡ تنظيف كل 2 دقيقة بدلاً من 5
    this.cleanupInterval = setInterval(() => this.cleanup(), 2 * 60 * 1000);
  }

  static getInstance(): CentralCacheManager {
    if (!CentralCacheManager.instance) {
      CentralCacheManager.instance = new CentralCacheManager();
    }
    return CentralCacheManager.instance;
  }

  /**
   * جلب بيانات من الكاش أو من المصدر
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    const { ttl = this.defaultTTL } = options;
    const now = Date.now();

    const cached = this.memoryCache.get(key);

    // التحقق من وجود البيانات وصلاحيتها
    if (cached && (now - cached.timestamp) < cached.ttl) {
      // تحديث وقت آخر استخدام (LRU)
      cached.lastAccess = now;
      this.stats.hits++;
      return cached.data as T;
    }

    // البيانات غير موجودة أو منتهية الصلاحية
    this.stats.misses++;

    // جلب البيانات الجديدة
    const data = await fetcher();

    // إضافة للكاش
    this.setInternal(key, data, ttl);

    return data;
  }

  /**
   * حفظ بيانات مباشرة في الكاش
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { ttl = this.defaultTTL } = options;
    this.setInternal(key, data, ttl);
  }

  /**
   * الحفظ الداخلي مع LRU eviction
   */
  private setInternal<T>(key: string, data: T, ttl: number): void {
    const now = Date.now();

    // إذا الكاش ممتلئ، احذف الأقدم استخداماً (LRU)
    if (this.memoryCache.size >= this.maxCacheSize && !this.memoryCache.has(key)) {
      this.evictLeastRecentlyUsed();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: now,
      lastAccess: now,
      ttl
    });
  }

  /**
   * حذف العنصر الأقل استخداماً (LRU)
   */
  private evictLeastRecentlyUsed(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    for (const [key, entry] of this.memoryCache) {
      if (entry.lastAccess < oldestAccess) {
        oldestAccess = entry.lastAccess;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * إزالة مفتاح محدد
   */
  invalidate(key: string): void {
    this.memoryCache.delete(key);
  }

  /**
   * إزالة مفاتيح تطابق pattern
   */
  invalidatePattern(pattern: string | RegExp): number {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    let count = 0;

    for (const key of this.memoryCache.keys()) {
      if (regex.test(key)) {
        this.memoryCache.delete(key);
        count++;
      }
    }

    return count;
  }

  /**
   * مسح جميع البيانات
   */
  clear(): void {
    this.memoryCache.clear();
    this.stats.hits = 0;
    this.stats.misses = 0;
    this.stats.evictions = 0;
  }

  /**
   * تدمير المثيل وإيقاف التنظيف الدوري
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.memoryCache.clear();
  }

  /**
   * تنظيف البيانات المنتهية الصلاحية
   */
  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.memoryCache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Cache] Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * الحصول على إحصائيات الكاش
   */
  getStats(): CacheStats {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? ((this.stats.hits / total) * 100).toFixed(1) + '%' : '0%';

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      size: this.memoryCache.size,
      maxSize: this.maxCacheSize,
      evictions: this.stats.evictions,
      hitRate
    };
  }

  /**
   * التحقق من وجود مفتاح (بدون تحديث lastAccess)
   */
  has(key: string): boolean {
    const cached = this.memoryCache.get(key);
    if (!cached) return false;

    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  /**
   * جلب عدة عناصر بالتوازي
   */
  async batch<T>(
    requests: Array<{ key: string; fetcher: () => Promise<T>; options?: CacheOptions }>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(req => this.get(req.key, req.fetcher, req.options))
    );
  }

  /**
   * تحميل مسبق للبيانات
   */
  async prefetch<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<void> {
    // تحميل فقط إذا لم تكن موجودة
    if (!this.has(key)) {
      await this.get(key, fetcher, options);
    }
  }

  /**
   * الحصول على جميع المفاتيح
   */
  keys(): string[] {
    return Array.from(this.memoryCache.keys());
  }

  /**
   * الحصول على حجم الكاش الحالي
   */
  get size(): number {
    return this.memoryCache.size;
  }
}

// Export singleton instance
export const cacheManager = CentralCacheManager.getInstance();

// إتاحة CacheManager في window object للتطوير والاختبار
if (typeof window !== 'undefined') {
  (window as any).cacheManager = cacheManager;
}

// Export types
export type { CacheOptions, CacheEntry, CacheStats };
