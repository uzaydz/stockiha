// نظام إدارة الكاش المركزي لتحسين الأداء
class CacheManager {
  private static instance: CacheManager;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  private constructor() {}

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // الحصول على البيانات من الكاش
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  // حفظ البيانات في الكاش
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // حذف عنصر من الكاش
  delete(key: string): void {
    this.cache.delete(key);
  }

  // تنظيف الكاش القديم
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // تنظيف كامل للكاش
  clear(): void {
    this.cache.clear();
  }

  // الحصول على إحصائيات الكاش
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// نظام الكاش العام
export const globalCache = CacheManager.getInstance();

// دوال مساعدة للكاش المحلي
export const localCache = {
  // حفظ في localStorage مع TTL
  set: (key: string, data: any, ttl: number = 30 * 60 * 1000) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء localStorage
    }
  },

  // الحصول من localStorage
  get: <T>(key: string): T | null => {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      if (parsed.timestamp && parsed.ttl && (now - parsed.timestamp) > parsed.ttl) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      return null;
    }
  },

  // حذف من localStorage
  delete: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      // تجاهل الأخطاء
    }
  }
};

// دوال مساعدة للكاش في sessionStorage
export const sessionCache = {
  // حفظ في sessionStorage مع TTL
  set: (key: string, data: any, ttl: number = 10 * 60 * 1000) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl
      };
      sessionStorage.setItem(key, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  },

  // الحصول من sessionStorage
  get: <T>(key: string): T | null => {
    try {
      const cached = sessionStorage.getItem(key);
      if (!cached) return null;

      const parsed = JSON.parse(cached);
      const now = Date.now();

      if (parsed.timestamp && parsed.ttl && (now - parsed.timestamp) > parsed.ttl) {
        sessionStorage.removeItem(key);
        return null;
      }

      return parsed.data as T;
    } catch (error) {
      return null;
    }
  },

  // حذف من sessionStorage
  delete: (key: string) => {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      // تجاهل الأخطاء
    }
  }
};

// دوال للتحقق من صحة الكاش
export const cacheUtils = {
  // التحقق من صحة البيانات المحفوظة
  isValid: (timestamp: number, ttl: number): boolean => {
    return Date.now() - timestamp < ttl;
  },

  // تنظيف جميع الكاشات القديمة
  cleanupAll: () => {
    // تنظيف الكاش العام
    globalCache.cleanup();

    // تنظيف localStorage
    try {
      const keys = Object.keys(localStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.includes('cache') || key.includes('temp')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.timestamp && parsed.ttl && !cacheUtils.isValid(parsed.timestamp, parsed.ttl)) {
                localStorage.removeItem(key);
              }
            }
          } catch (error) {
            // تجاهل الأخطاء
          }
        }
      });
    } catch (error) {
      // تجاهل أخطاء localStorage
    }

    // تنظيف sessionStorage
    try {
      const keys = Object.keys(sessionStorage);
      const now = Date.now();

      keys.forEach(key => {
        if (key.includes('cache') || key.includes('temp')) {
          try {
            const value = sessionStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.timestamp && parsed.ttl && !cacheUtils.isValid(parsed.timestamp, parsed.ttl)) {
                sessionStorage.removeItem(key);
              }
            }
          } catch (error) {
            // تجاهل الأخطاء
          }
        }
      });
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  }
};

// تنظيف دوري للكاش القديمة
if (typeof window !== 'undefined') {
  // تنظيف كل 10 دقائق
  setInterval(() => {
    cacheUtils.cleanupAll();
  }, 10 * 60 * 1000);
}
