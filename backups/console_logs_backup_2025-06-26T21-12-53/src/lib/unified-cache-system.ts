import LRUCache from 'lru-cache';

interface CacheConfig {
  maxSize: number;
  ttl: number; // بالمللي ثانية
  staleWhileRevalidate: number;
  compressionEnabled: boolean;
  persistToStorage: boolean;
  storageKey: string;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  size: number;
  compressed?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  memoryUsage: number;
  hitRate: number;
  compressionRatio: number;
}

class UnifiedCacheSystem {
  private static instance: UnifiedCacheSystem;
  private caches: Map<string, LRUCache<string, CacheEntry<any>>> = new Map();
  private stats: Map<string, CacheStats> = new Map();
  private compressionWorker?: Worker;
  private persistenceTimer?: NodeJS.Timeout;

  // إعدادات افتراضية للأنواع المختلفة
  private readonly presets: Record<string, CacheConfig> = {
    'api-cache': {
      maxSize: 1000,
      ttl: 5 * 60 * 1000, // 5 دقائق
      staleWhileRevalidate: 2 * 60 * 1000,
      compressionEnabled: true,
      persistToStorage: true,
      storageKey: 'api_cache'
    },
    'query-cache': {
      maxSize: 500,
      ttl: 10 * 60 * 1000, // 10 دقائق
      staleWhileRevalidate: 5 * 60 * 1000,
      compressionEnabled: true,
      persistToStorage: true,
      storageKey: 'query_cache'
    },
    'memory-cache': {
      maxSize: 200,
      ttl: 2 * 60 * 1000, // 2 دقيقة
      staleWhileRevalidate: 30 * 1000,
      compressionEnabled: false,
      persistToStorage: false,
      storageKey: 'memory_cache'
    },
    'session-cache': {
      maxSize: 100,
      ttl: 30 * 60 * 1000, // 30 دقيقة
      staleWhileRevalidate: 10 * 60 * 1000,
      compressionEnabled: false,
      persistToStorage: true,
      storageKey: 'session_cache'
    }
  };

  private constructor() {
    this.initializeWorker();
    this.startPeriodicCleanup();
    this.loadFromStorage();
    
    // تسجيل للتنظيف عند إغلاق الصفحة
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.saveToStorage());
    }
  }

  static getInstance(): UnifiedCacheSystem {
    if (!this.instance) {
      this.instance = new UnifiedCacheSystem();
    }
    return this.instance;
  }

  // إنشاء أو الحصول على cache
  getCache(name: string, config?: Partial<CacheConfig>): CacheInterface {
    if (!this.caches.has(name)) {
      this.createCache(name, config);
    }

    return new CacheInterface(name, this);
  }

  private createCache(name: string, customConfig?: Partial<CacheConfig>) {
    // دمج الإعدادات
    const preset = this.presets[name] || this.presets['memory-cache'];
    const config = { ...preset, ...customConfig };

    // إنشاء LRU cache
    const cache = new LRUCache<string, CacheEntry<any>>({
      max: config.maxSize,
      ttl: config.ttl,
      updateAgeOnGet: true,
      allowStale: true,
      noDeleteOnStaleGet: false,
      dispose: (value, key) => {
        this.updateStats(name, 'evictions', 1);
      }
    });

    this.caches.set(name, cache);
    
    // إنشاء إحصائيات
    this.stats.set(name, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRate: 0,
      compressionRatio: 1
    });

    console.log(`✅ إنشاء cache جديد: ${name} (${config.maxSize} عناصر, TTL: ${config.ttl}ms)`);
  }

  // واجهة داخلية للـ cache
  get<T>(cacheName: string, key: string): T | null {
    const cache = this.caches.get(cacheName);
    if (!cache) return null;

    const entry = cache.get(key);
    if (!entry) {
      this.updateStats(cacheName, 'misses', 1);
      return null;
    }

    // فحص انتهاء الصلاحية
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      this.updateStats(cacheName, 'misses', 1);
      return null;
    }

    entry.accessCount++;
    this.updateStats(cacheName, 'hits', 1);
    
    // إرجاع البيانات (مع إلغاء الضغط إذا لزم)
    return entry.compressed ? this.decompress(entry.data) as T : entry.data;
  }

  set<T>(cacheName: string, key: string, data: T, customTtl?: number): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    const config = this.getConfig(cacheName);
    const ttl = customTtl || config.ttl;
    
    // ضغط البيانات إذا مطلوب
    let processedData = data;
    let compressed = false;
    let size = this.estimateSize(data);

    if (config.compressionEnabled && size > 1024) { // ضغط للبيانات أكبر من 1KB
      try {
        processedData = this.compress(data);
        compressed = true;
        const newSize = this.estimateSize(processedData);
        this.updateCompressionRatio(cacheName, size, newSize);
      } catch (error) {
        console.warn(`فشل في ضغط البيانات للمفتاح ${key}:`, error);
      }
    }

    const entry: CacheEntry<T> = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      size,
      compressed
    };

    cache.set(key, entry);
    this.updateStats(cacheName, 'sets', 1);
    this.updateMemoryUsage(cacheName);
  }

  delete(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    if (!cache) return false;

    const deleted = cache.delete(key);
    if (deleted) {
      this.updateStats(cacheName, 'deletes', 1);
      this.updateMemoryUsage(cacheName);
    }
    return deleted;
  }

  clear(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    cache.clear();
    this.resetStats(cacheName);
    console.log(`🧹 تم مسح cache: ${cacheName}`);
  }

  // مسح جميع caches
  clearAll(): void {
    console.log(`🧹 مسح جميع caches (${this.caches.size})`);
    for (const [name, cache] of this.caches) {
      cache.clear();
      this.resetStats(name);
    }
  }

  // الحصول على إحصائيات
  getStats(cacheName?: string) {
    if (cacheName) {
      return this.stats.get(cacheName) || null;
    }

    // إحصائيات شاملة
    const allStats = Array.from(this.stats.entries());
    const combined = allStats.reduce((acc, [name, stats]) => {
      acc.hits += stats.hits;
      acc.misses += stats.misses;
      acc.sets += stats.sets;
      acc.deletes += stats.deletes;
      acc.evictions += stats.evictions;
      acc.memoryUsage += stats.memoryUsage;
      return acc;
    }, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRate: 0,
      compressionRatio: 0
    });

    combined.hitRate = combined.hits / (combined.hits + combined.misses) || 0;
    
    return {
      combined,
      byCacheName: Object.fromEntries(allStats)
    };
  }

  // تحسين الذاكرة
  optimizeMemory(): void {
    console.log('🔧 بدء تحسين الذاكرة...');
    
    for (const [name, cache] of this.caches) {
      const config = this.getConfig(name);
      const currentSize = cache.size;
      
      if (currentSize > config.maxSize * 0.8) {
        // إزالة العناصر الأقل استخداماً
        this.evictLeastUsed(name, Math.floor(currentSize * 0.2));
      }
      
      // إزالة العناصر منتهية الصلاحية
      this.removeExpired(name);
    }
    
    // تشغيل garbage collection إن أمكن
    if (typeof window !== 'undefined' && 'gc' in window) {
      (window as any).gc();
    }
  }

  // دوال مساعدة خاصة
  private getConfig(cacheName: string): CacheConfig {
    return this.presets[cacheName] || this.presets['memory-cache'];
  }

  private compress(data: any): any {
    try {
      return JSON.stringify(data); // يمكن تحسينها لاحقاً بضغط حقيقي
    } catch {
      return data;
    }
  }

  private decompress(data: string): any {
    try {
      return JSON.parse(data);
    } catch {
      return data;
    }
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // تقدير تقريبي بالبايت
    } catch {
      return 0;
    }
  }

  private updateStats(cacheName: string, metric: keyof CacheStats, value: number): void {
    const stats = this.stats.get(cacheName);
    if (!stats) return;

    (stats[metric] as number) += value;
    
    // تحديث hit rate
    if (metric === 'hits' || metric === 'misses') {
      stats.hitRate = stats.hits / (stats.hits + stats.misses) || 0;
    }
  }

  private updateMemoryUsage(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    const stats = this.stats.get(cacheName);
    if (!cache || !stats) return;

    let totalSize = 0;
    cache.forEach((entry) => {
      totalSize += entry.size;
    });

    stats.memoryUsage = totalSize;
  }

  private updateCompressionRatio(cacheName: string, originalSize: number, compressedSize: number): void {
    const stats = this.stats.get(cacheName);
    if (!stats) return;

    const ratio = compressedSize / originalSize;
    stats.compressionRatio = (stats.compressionRatio + ratio) / 2; // متوسط متحرك
  }

  private resetStats(cacheName: string): void {
    this.stats.set(cacheName, {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      memoryUsage: 0,
      hitRate: 0,
      compressionRatio: 1
    });
  }

  private evictLeastUsed(cacheName: string, count: number): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    const entries: Array<[string, CacheEntry<any>]> = [];
    cache.forEach((value, key) => {
      entries.push([key, value]);
    });

    // ترتيب حسب accessCount (الأقل استخداماً أولاً)
    entries.sort((a, b) => a[1].accessCount - b[1].accessCount);

    for (let i = 0; i < Math.min(count, entries.length); i++) {
      cache.delete(entries[i][0]);
    }

    console.log(`🗑️ إزالة ${Math.min(count, entries.length)} عناصر من ${cacheName}`);
  }

  private removeExpired(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    if (!cache) return;

    const now = Date.now();
    const toDelete: string[] = [];

    cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        toDelete.push(key);
      }
    });

    toDelete.forEach(key => cache.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`⏰ إزالة ${toDelete.length} عناصر منتهية الصلاحية من ${cacheName}`);
    }
  }

  private startPeriodicCleanup(): void {
    this.persistenceTimer = setInterval(() => {
      this.optimizeMemory();
      this.saveToStorage();
    }, 5 * 60 * 1000); // كل 5 دقائق
  }

  private initializeWorker(): void {
    // يمكن إضافة Web Worker للضغط لاحقاً
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      for (const [name, cache] of this.caches) {
        const config = this.getConfig(name);
        if (!config.persistToStorage) continue;

        const data: any[] = [];
        cache.forEach((entry, key) => {
          // حفظ العناصر غير منتهية الصلاحية فقط
          if (Date.now() - entry.timestamp < entry.ttl) {
            data.push({ key, entry });
          }
        });

        if (data.length > 0) {
          localStorage.setItem(config.storageKey, JSON.stringify(data));
        }
      }
    } catch (error) {
      console.warn('فشل في حفظ cache إلى localStorage:', error);
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      for (const [name, config] of Object.entries(this.presets)) {
        if (!config.persistToStorage) continue;

        const stored = localStorage.getItem(config.storageKey);
        if (!stored) continue;

        const data = JSON.parse(stored);
        const cache = this.getCache(name);

        data.forEach(({ key, entry }: any) => {
          // التحقق من انتهاء الصلاحية
          if (Date.now() - entry.timestamp < entry.ttl) {
            cache.set(key, entry.data, entry.ttl);
          }
        });

        console.log(`📥 تحميل ${data.length} عناصر من localStorage لـ ${name}`);
      }
    } catch (error) {
      console.warn('فشل في تحميل cache من localStorage:', error);
    }
  }

  // تنظيف عند الإغلاق
  destroy(): void {
    if (this.persistenceTimer) {
      clearInterval(this.persistenceTimer);
    }
    this.saveToStorage();
    this.clearAll();
  }
}

// واجهة سهلة للاستخدام
class CacheInterface {
  constructor(private cacheName: string, private system: UnifiedCacheSystem) {}

  get<T>(key: string): T | null {
    return this.system.get<T>(this.cacheName, key);
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.system.set(this.cacheName, key, data, ttl);
  }

  delete(key: string): boolean {
    return this.system.delete(this.cacheName, key);
  }

  clear(): void {
    this.system.clear(this.cacheName);
  }

  getStats() {
    return this.system.getStats(this.cacheName);
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  // دالة مساعدة للـ cache with function
  async getOrSet<T>(
    key: string,
    fetcher: () => Promise<T> | T,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(key, data, ttl);
    return data;
  }
}

// إنشاء instance واحد
const unifiedCache = UnifiedCacheSystem.getInstance();

// دوال global للتشخيص
if (typeof window !== 'undefined') {
  (window as any).cacheSystem = {
    stats: () => unifiedCache.getStats(),
    clear: (name?: string) => name ? unifiedCache.clear(name) : unifiedCache.clearAll(),
    optimize: () => unifiedCache.optimizeMemory(),
    get: (name: string) => unifiedCache.getCache(name)
  };
}

export { unifiedCache, type CacheConfig, type CacheStats };
export default unifiedCache; 