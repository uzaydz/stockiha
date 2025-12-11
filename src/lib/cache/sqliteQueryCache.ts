/**
 * نظام Caching ذكي لاستعلامات SQLite
 * يقلل الاستعلامات المتكررة من 80+ إلى <10
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
}

class SQLiteQueryCache {
  private cache = new Map<string, CacheEntry<any>>();
  private pending = new Map<string, PendingRequest<any>>();
  private stats = {
    hits: 0,
    misses: 0,
    deduped: 0,
    queries: 0
  };

  // ⚡ v3.0: زيادة حجم الكاش من 50 إلى 500 لتحسين الأداء
  private MAX_CACHE_SIZE = 500;

  /**
   * TTL افتراضي حسب نوع الجدول (بالميلي ثانية)
   * ⚡ v3.0: تحسين TTL لتقليل الاستعلامات المتكررة
   */
  private TTL_MAP: Record<string, number> = {
    // جداول ثابتة جداً - cache طويل جداً (30 دقيقة)
    'product_categories': 30 * 60 * 1000,
    'product_subcategories': 30 * 60 * 1000,
    'employees': 30 * 60 * 1000,
    'user_permissions': 30 * 60 * 1000,
    'pos_settings': 30 * 60 * 1000,
    'organizations': 30 * 60 * 1000,

    // جداول متغيرة - cache متوسط (10 دقائق)
    'products': 10 * 60 * 1000,
    'inventory': 5 * 60 * 1000,
    'customers': 10 * 60 * 1000,
    'product_colors': 10 * 60 * 1000,
    'product_sizes': 10 * 60 * 1000,

    // جداول متغيرة جداً - cache قصير (دقيقة واحدة)
    'orders': 60 * 1000,
    'order_items': 60 * 1000,
    'transactions': 60 * 1000,
    'sync_queue': 30 * 1000,

    // افتراضي (5 دقائق)
    'default': 5 * 60 * 1000
  };

  /**
   * إنشاء مفتاح cache فريد من query + params
   */
  private createKey(
    operation: 'count' | 'get' | 'where' | 'toArray',
    tableName: string,
    params: any
  ): string {
    const paramsStr = JSON.stringify(params || {});
    return `${operation}:${tableName}:${paramsStr}`;
  }

  /**
   * الحصول على TTL للجدول
   */
  private getTTL(tableName: string, customTTL?: number): number {
    if (customTTL !== undefined) return customTTL;
    return this.TTL_MAP[tableName] || this.TTL_MAP.default;
  }

  /**
   * استعلام مع caching
   */
  async query<T>(
    operation: 'count' | 'get' | 'where' | 'toArray',
    tableName: string,
    queryFn: () => Promise<T>,
    params?: any,
    options: {
      ttl?: number;
      force?: boolean; // تجاهل cache
    } = {}
  ): Promise<T> {
    const key = this.createKey(operation, tableName, params);
    const ttl = this.getTTL(tableName, options.ttl);
    const now = Date.now();

    // 🔒 إذا كان force=true، تجاهل cache وحذف أي pending
    if (options.force) {
      this.cache.delete(key);
      this.pending.delete(key);
    }

    // ✅ 1. فحص Cache
    const cached = this.cache.get(key);
    if (cached && (now - cached.timestamp) < cached.ttl) {
      this.stats.hits++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SQLiteCache] 🎯 HIT ${operation}:${tableName}`, {
          age: Math.floor((now - cached.timestamp) / 1000) + 's',
          hits: this.stats.hits
        });
      }
      return cached.data;
    }

    // ⏳ 2. فحص Pending Request (Deduplication)
    const pending = this.pending.get(key);
    if (pending) {
      this.stats.deduped++;
      if (process.env.NODE_ENV === 'development') {
        console.log(`[SQLiteCache] ⏳ DEDUPED ${operation}:${tableName}`, {
          deduped: this.stats.deduped
        });
      }
      return pending.promise;
    }

    // 🔄 3. تنفيذ Query جديد
    this.stats.misses++;
    this.stats.queries++;

    if (process.env.NODE_ENV === 'development') {
      console.log(`[SQLiteCache] 🔄 MISS ${operation}:${tableName}`, {
        misses: this.stats.misses,
        queries: this.stats.queries
      });
    }

    const promise = queryFn();
    
    // حفظ Promise للـ deduplication
    this.pending.set(key, { promise, timestamp: now });

    try {
      const result = await promise;
      
      // ⚡ LRU: إذا تجاوز الحد الأقصى، احذف الأقدم
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value;
        if (firstKey) this.cache.delete(firstKey);
      }

      // حفظ في Cache
      this.cache.set(key, {
        data: result,
        timestamp: now,
        ttl
      });

      this.pending.delete(key);
      return result;
    } catch (error) {
      this.pending.delete(key);
      console.error(`[SQLiteCache] ❌ Error in ${operation}:${tableName}:`, error);
      throw error;
    }
  }

  /**
   * مسح cache لجدول معين
   */
  clearTable(tableName: string) {
    let cleared = 0;
    for (const [key] of this.cache.entries()) {
      if (key.includes(`:${tableName}:`)) {
        this.cache.delete(key);
        cleared++;
      }
    }
    // عرض log فقط إذا تم مسح شيء بالفعل وفي development mode
    if (cleared > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[SQLiteCache] 🗑️ Cleared ${cleared} entries for table: ${tableName}`);
    }
  }

  /**
   * مسح جميع الـ cache
   */
  clearAll() {
    const size = this.cache.size;
    this.cache.clear();
    this.pending.clear();
    console.log(`[SQLiteCache] 🗑️ Cleared all cache (${size} entries)`);
  }

  /**
   * إحصائيات الأداء
   */
  getStats() {
    const hitRate = this.stats.queries > 0 
      ? ((this.stats.hits / this.stats.queries) * 100).toFixed(1) + '%'
      : '0%';
    
    return {
      ...this.stats,
      hitRate,
      cacheSize: this.cache.size,
      pendingSize: this.pending.size,
      tables: this.getTableStats()
    };
  }

  /**
   * إحصائيات لكل جدول
   */
  private getTableStats() {
    const stats: Record<string, number> = {};
    for (const [key] of this.cache.entries()) {
      const tableName = key.split(':')[1];
      stats[tableName] = (stats[tableName] || 0) + 1;
    }
    return stats;
  }

  /**
   * تنظيف العناصر المنتهية
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // تنظيف pending requests القديمة (أكثر من دقيقة)
    for (const [key, req] of this.pending.entries()) {
      if ((now - req.timestamp) > 60000) {
        this.pending.delete(key);
      }
    }

    if (cleaned > 0 && process.env.NODE_ENV === 'development') {
      console.log(`[SQLiteCache] 🧹 Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * عرض الإحصائيات في Console
   */
  logStats() {
    if (process.env.NODE_ENV === 'development') {
      const stats = this.getStats();
      console.log('[SQLiteCache] 📊 Performance Stats:', stats);
    }
  }
}

// Singleton instance
export const sqliteCache = new SQLiteQueryCache();

// ⚡ v4.0: إدارة intervals مع إمكانية التنظيف
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
let statsIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * بدء التنظيف الدوري
 */
export function startCacheCleanup(): void {
  if (typeof window === 'undefined') return;

  // تجنب إنشاء intervals متعددة
  if (cleanupIntervalId) return;

  // تنظيف كل 5 دقائق
  cleanupIntervalId = setInterval(() => {
    sqliteCache.cleanup();
  }, 5 * 60 * 1000);

  // عرض إحصائيات في dev mode فقط
  if (import.meta.env.DEV && !statsIntervalId) {
    statsIntervalId = setInterval(() => {
      sqliteCache.logStats();
    }, 5 * 60 * 1000);
  }
}

/**
 * إيقاف التنظيف الدوري (مفيد عند unmount أو cleanup)
 */
export function stopCacheCleanup(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
  if (statsIntervalId) {
    clearInterval(statsIntervalId);
    statsIntervalId = null;
  }
}

// بدء التنظيف تلقائياً عند التحميل
if (typeof window !== 'undefined') {
  startCacheCleanup();
}

/**
 * Helper functions للاستخدام المباشر
 */
export const cachedSQLiteQuery = {
  /**
   * Cache count query
   */
  count: <T = number>(
    tableName: string,
    queryFn: () => Promise<T>,
    params?: any,
    ttl?: number
  ) => sqliteCache.query('count', tableName, queryFn, params, { ttl }),

  /**
   * Cache get query (single record)
   */
  get: <T>(
    tableName: string,
    queryFn: () => Promise<T>,
    params?: any,
    ttl?: number
  ) => sqliteCache.query('get', tableName, queryFn, params, { ttl }),

  /**
   * Cache where query
   */
  where: <T>(
    tableName: string,
    queryFn: () => Promise<T>,
    params?: any,
    ttl?: number
  ) => sqliteCache.query('where', tableName, queryFn, params, { ttl }),

  /**
   * Cache toArray query
   */
  toArray: <T>(
    tableName: string,
    queryFn: () => Promise<T>,
    params?: any,
    ttl?: number
  ) => sqliteCache.query('toArray', tableName, queryFn, params, { ttl })
};

export default sqliteCache;
