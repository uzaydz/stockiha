// نظام Cache المتقدم للتطبيق
// Advanced Caching System

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiry: number;
  key: string;
}

interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxSize: number;
  cleanupInterval: number;
}

class AdvancedCacheSystem {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    this.config = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxSize: 1000,
      cleanupInterval: 60 * 1000, // 1 minute
      ...config,
    };

    this.startCleanup();
  }

  // إضافة بيانات إلى الـ cache
  set<T>(key: string, data: T, ttl?: number): void {
    const expiry = Date.now() + (ttl || this.config.defaultTTL);
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiry,
      key,
    });

    // تنظيف الـ cache إذا تجاوز الحد الأقصى
    if (this.cache.size > this.config.maxSize) {
      this.cleanup(true);
    }
  }

  // جلب بيانات من الـ cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  // التحقق من وجود مفتاح صالح
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  // حذف مفتاح محدد
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  // حذف جميع المفاتيح التي تبدأ بنص معين
  deleteByPrefix(prefix: string): number {
    let deleted = 0;
    for (const [key] of this.cache) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  // تنظيف البيانات المنتهية الصلاحية
  private cleanup(force = false): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now > entry.expiry) {
        toDelete.push(key);
      }
    }

    // إذا كان التنظيف إجباري، احذف أقدم البيانات
    if (force && this.cache.size > this.config.maxSize) {
      const entries = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const excessCount = this.cache.size - this.config.maxSize + toDelete.length;
      for (let i = 0; i < excessCount; i++) {
        toDelete.push(entries[i][0]);
      }
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  // بدء تنظيف دوري
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  // إيقاف تنظيف دوري
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  // مسح الـ cache بالكامل
  clear(): void {
    this.cache.clear();
  }

  // إحصائيات الـ cache
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.cache) {
      if (now > entry.expiry) {
        expiredEntries++;
      } else {
        validEntries++;
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries,
      expiredEntries,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
    };
  }

  private calculateHitRate(): number {
    // هذا يتطلب تتبع أكثر تفصيلاً للـ hits و misses
    return 0; // مؤقت
  }
}

// إنشاء instances مختلفة للـ cache
export const userCache = new AdvancedCacheSystem({
  defaultTTL: 10 * 60 * 1000, // 10 minutes للمستخدمين
  maxSize: 100,
});

export const organizationCache = new AdvancedCacheSystem({
  defaultTTL: 15 * 60 * 1000, // 15 minutes للمؤسسات
  maxSize: 50,
});

export const inventoryCache = new AdvancedCacheSystem({
  defaultTTL: 2 * 60 * 1000, // 2 minutes للمخزون (بيانات أكثر تغيراً)
  maxSize: 500,
});

export const authCache = new AdvancedCacheSystem({
  defaultTTL: 30 * 60 * 1000, // 30 minutes للمصادقة
  maxSize: 20,
});

// مساعدات للـ cache keys
export const cacheKeys = {
  user: (userId: string) => `user:${userId}`,
  userOrganization: (userId: string) => `user:org:${userId}`,
  organization: (orgId: string) => `org:${orgId}`,
  organizationSettings: (orgId: string) => `org:settings:${orgId}`,
  inventoryProducts: (orgId: string, filters: string) => `inventory:products:${orgId}:${filters}`,
  inventoryStats: (orgId: string) => `inventory:stats:${orgId}`,
  productDetails: (orgId: string, productId: string) => `product:details:${orgId}:${productId}`,
  auth: (userId: string) => `auth:${userId}`,
  categories: (orgId: string) => `categories:${orgId}`,
};

// مساعد للـ cache مع retry logic
export async function cacheWithFallback<T>(
  cacheInstance: AdvancedCacheSystem,
  key: string,
  fetchFunction: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // محاولة جلب من الـ cache أولاً
  const cached = cacheInstance.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  try {
    // جلب البيانات من المصدر
    const data = await fetchFunction();
    
    // حفظ في الـ cache
    cacheInstance.set(key, data, ttl);
    
    return data;
  } catch (error) {
    console.error(`Error fetching data for key ${key}:`, error);
    throw error;
  }
}

export default AdvancedCacheSystem; 