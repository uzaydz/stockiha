import React from 'react';

/**
 * Global Cache Manager - إدارة شاملة للتخزين المؤقت
 * يقلل من استدعاءات قاعدة البيانات ويحسن الأداء
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in milliseconds
}

class GlobalCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly DEFAULT_TTL = 15 * 60 * 1000; // 15 دقيقة افتراضياً
  private readonly ORGANIZATION_TTL = 10 * 60 * 1000; // 10 دقائق للبيانات الأساسية للمؤسسة
  private readonly USER_TTL = 20 * 60 * 1000; // 20 دقيقة للبيانات الأساسية للمستخدم
  private readonly SUBSCRIPTION_TTL = 30 * 60 * 1000; // 30 دقيقة للبيانات الاشتراك
  // ⚡ إضافة حد أقصى للكاش لمنع تسرب الذاكرة
  private readonly MAX_CACHE_SIZE = 50;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  // تنظيف الكاش المنتهي الصلاحية دورياً
  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000); // كل 5 دقائق
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // الحصول على بيانات من الكاش
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // حفظ بيانات في الكاش
  set<T>(key: string, data: T, ttl?: number): void {
    // ⚡ LRU eviction - حذف الأقدم إذا امتلأ الكاش
    if (this.cache.size >= this.MAX_CACHE_SIZE && !this.cache.has(key)) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.getDefaultTTL(key)
    });
  }

  // ⚡ حذف أقدم عنصر في الكاش
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  // الحصول على TTL الافتراضي بناءً على نوع البيانات
  private getDefaultTTL(key: string): number {
    if (key.includes('organization') || key.includes('org')) {
      return this.ORGANIZATION_TTL;
    }
    if (key.includes('user') || key.includes('profile')) {
      return this.USER_TTL;
    }
    if (key.includes('subscription') || key.includes('trial')) {
      return this.SUBSCRIPTION_TTL;
    }
    return this.DEFAULT_TTL;
  }

  // حذف بيانات من الكاش
  delete(key: string): void {
    this.cache.delete(key);
  }

  // مسح الكاش بالكامل
  clear(): void {
    this.cache.clear();
  }

  // مسح الكاش بناءً على pattern
  clearPattern(pattern: string): void {
    const keysToDelete: string[] = [];
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  // معلومات عن الكاش
  getStats(): { size: number; keys: string[]; maxSize: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      maxSize: this.MAX_CACHE_SIZE
    };
  }

  // ⚡ تدمير الكاش وتنظيف الموارد
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
  }

  // دالة مساعدة لإنشاء مفتاح كاش موحد
  static createKey(type: string, id?: string, extra?: string): string {
    return [type, id, extra].filter(Boolean).join('_');
  }
}

// إنشاء instance عالمي
export const globalCache = new GlobalCacheManager();

// دوال مساعدة للاستخدام الشائع
export const CacheKeys = {
  ORGANIZATION: (id: string) => GlobalCacheManager.createKey('organization', id),
  USER: (id: string) => GlobalCacheManager.createKey('user', id),
  USER_PROFILE: (id: string) => GlobalCacheManager.createKey('user_profile', id),
  ORGANIZATION_SETTINGS: (id: string) => GlobalCacheManager.createKey('org_settings', id),
  SUBSCRIPTION_DETAILS: (id: string) => GlobalCacheManager.createKey('subscription_details', id),
  TRIAL_DATA: (id: string) => GlobalCacheManager.createKey('trial_data', id),
  MERCHANT_TYPE: (id: string) => GlobalCacheManager.createKey('merchant_type', id),
  CATEGORIES: (orgId: string) => GlobalCacheManager.createKey('categories', orgId),
  SUBCATEGORIES: () => GlobalCacheManager.createKey('subcategories'),
  APPS: (orgId: string) => GlobalCacheManager.createKey('apps', orgId)
};

// Hook لاستخدام الكاش في React components
export const useGlobalCache = <T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): { data: T | null; loading: boolean; error: Error | null; refetch: () => Promise<void> } => {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const fetchData = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // محاولة الحصول من الكاش أولاً
      const cachedData = globalCache.get<T>(key);
      if (cachedData) {
        setData(cachedData);
        setLoading(false);
        return;
      }

      // جلب البيانات من المصدر
      const freshData = await fetcher();

      // حفظ في الكاش
      globalCache.set(key, freshData, ttl);

      setData(freshData);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [key, fetcher, ttl]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const refetch = React.useCallback(async () => {
    globalCache.delete(key);
    await fetchData();
  }, [key, fetchData]);

  return { data, loading, error, refetch };
};
