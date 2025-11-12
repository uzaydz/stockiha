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

  /**
   * TTL افتراضي حسب نوع الجدول (بالميلي ثانية)
   */
  private TTL_MAP: Record<string, number> = {
    // جداول ثابتة نسبياً - cache طويل
    'product_categories': 10 * 60 * 1000, // 10 دقائق
    'product_subcategories': 10 * 60 * 1000,
    'employees': 5 * 60 * 1000, // 5 دقائق
    'user_permissions': 5 * 60 * 1000,
    'pos_settings': 5 * 60 * 1000,
    
    // جداول متغيرة - cache متوسط
    'products': 2 * 60 * 1000, // دقيقتان
    'inventory': 2 * 60 * 1000,
    'customers': 2 * 60 * 1000,
    
    // جداول متغيرة جداً - cache قصير
    'pos_orders': 30 * 1000, // 30 ثانية
    'pos_order_items': 30 * 1000,
    'transactions': 30 * 1000,
    'sync_queue': 10 * 1000, // 10 ثوان
    
    // افتراضي
    'default': 60 * 1000 // دقيقة واحدة
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
      console.log(`[SQLiteCache] 🎯 HIT ${operation}:${tableName}`, {
        age: Math.floor((now - cached.timestamp) / 1000) + 's',
        hits: this.stats.hits
      });
      return cached.data;
    }

    // ⏳ 2. فحص Pending Request (Deduplication)
    const pending = this.pending.get(key);
    if (pending) {
      this.stats.deduped++;
      console.log(`[SQLiteCache] ⏳ DEDUPED ${operation}:${tableName}`, {
        deduped: this.stats.deduped
      });
      return pending.promise;
    }

    // 🔄 3. تنفيذ Query جديد
    this.stats.misses++;
    this.stats.queries++;
    
    console.log(`[SQLiteCache] 🔄 MISS ${operation}:${tableName}`, {
      misses: this.stats.misses,
      queries: this.stats.queries
    });

    const promise = queryFn();
    
    // حفظ Promise للـ deduplication
    this.pending.set(key, { promise, timestamp: now });

    try {
      const result = await promise;
      
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
    // عرض log فقط إذا تم مسح شيء بالفعل
    if (cleared > 0) {
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

    if (cleaned > 0) {
      console.log(`[SQLiteCache] 🧹 Cleaned ${cleaned} expired entries`);
    }
  }

  /**
   * عرض الإحصائيات في Console
   */
  logStats() {
    const stats = this.getStats();
    console.log('[SQLiteCache] 📊 Performance Stats:', stats);
  }
}

// Singleton instance
export const sqliteCache = new SQLiteQueryCache();

// تنظيف دوري كل 5 دقائق
if (typeof window !== 'undefined') {
  setInterval(() => {
    sqliteCache.cleanup();
  }, 5 * 60 * 1000);

  // عرض إحصائيات كل دقيقة (في dev mode فقط)
  if (import.meta.env.DEV) {
    setInterval(() => {
      sqliteCache.logStats();
    }, 60 * 1000);
  }
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
