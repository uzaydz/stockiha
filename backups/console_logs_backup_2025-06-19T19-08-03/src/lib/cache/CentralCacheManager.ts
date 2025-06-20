import LRUCache from 'lru-cache';

// Types
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag?: string;
  dependencies?: string[];
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  staleWhileRevalidate?: number; // Time to serve stale data while revalidating
  dependencies?: string[]; // Other cache keys this entry depends on
}

interface CacheConfig {
  maxSize: number; // Maximum number of items
  maxAge: number; // Default TTL in milliseconds
  updateAgeOnGet?: boolean;
  updateAgeOnHas?: boolean;
  stale?: boolean; // Allow stale data
}

// Cache layers
enum CacheLayer {
  MEMORY = 'memory',
  SESSION = 'session',
  LOCAL = 'local',
  INDEXED_DB = 'indexedDB'
}

// Default configurations for different data types
const CACHE_CONFIGS: Record<string, Partial<CacheConfig>> = {
  // Static data - long TTL
  organizations: { maxAge: 30 * 60 * 1000 }, // 30 minutes
  users: { maxAge: 15 * 60 * 1000 }, // 15 minutes
  categories: { maxAge: 60 * 60 * 1000 }, // 1 hour
  subcategories: { maxAge: 60 * 60 * 1000 }, // 1 hour
  shipping_providers: { maxAge: 60 * 60 * 1000 }, // 1 hour
  
  // Dynamic data - shorter TTL
  orders: { maxAge: 30 * 1000 }, // 30 seconds
  products: { maxAge: 5 * 60 * 1000 }, // 5 minutes
  services: { maxAge: 5 * 60 * 1000 }, // 5 minutes
  customers: { maxAge: 5 * 60 * 1000 }, // 5 minutes
  
  // Real-time data - very short TTL
  pos_orders: { maxAge: 15 * 1000 }, // 15 seconds
  stats: { maxAge: 30 * 1000 }, // 30 seconds
  notifications: { maxAge: 10 * 1000 }, // 10 seconds
};

class CentralCacheManager {
  private static instance: CentralCacheManager;
  private memoryCache: LRUCache<string, CacheEntry<unknown>>;
  private pendingRequests: Map<string, Promise<unknown>> = new Map();
  private revalidationQueue: Set<string> = new Set();
  private cacheStats = {
    hits: 0,
    misses: 0,
    staleHits: 0,
    revalidations: 0,
  };

  private constructor() {
    this.memoryCache = new LRUCache<string, CacheEntry<unknown>>({
      max: 500, // Maximum 500 items
      maxSize: 50 * 1024 * 1024, // 50MB
      sizeCalculation: (value) => {
        return JSON.stringify(value).length;
      },
      ttl: 5 * 60 * 1000, // Default 5 minutes
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      allowStale: true, // Allow stale data (updated from deprecated 'stale' option)
      noDeleteOnStaleGet: true,
      fetchMethod: async (key: string) => {
        // This will be overridden per request
        return null;
      },
    });

    // Periodic cleanup
    setInterval(() => this.cleanup(), 60 * 1000); // Every minute
  }

  static getInstance(): CentralCacheManager {
    if (!CentralCacheManager.instance) {
      CentralCacheManager.instance = new CentralCacheManager();
    }
    return CentralCacheManager.instance;
  }

  /**
   * Get data with automatic caching and deduplication
   * 🚫 CACHE DISABLED - Always fetch fresh data
   */
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<T> {
    console.log('🚫 [CacheManager] DISABLED - Fetching fresh data for:', key);
    
    // Always fetch fresh data - no caching
    try {
      const data = await fetcher();
      console.log('✅ [CacheManager] Fresh data fetched for:', key);
      return data;
    } catch (error) {
      console.error('❌ [CacheManager] Error fetching data for:', key, error);
      throw error;
    }
  }

  /**
   * Set data in cache
   * 🚫 CACHE DISABLED - No data will be cached
   */
  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    console.log('🚫 [CacheManager] DISABLED - Not caching data for:', key);
    // Do nothing - cache is disabled
  }

  /**
   * Invalidate cache entries
   * 🚫 CACHE DISABLED - No cache to invalidate
   */
  invalidate(patterns: string | string[]): void {
    console.log('🚫 [CacheManager] DISABLED - No cache to invalidate for patterns:', patterns);
    // Do nothing - cache is disabled
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.memoryCache.clear();
    this.pendingRequests.clear();
    this.revalidationQueue.clear();
    
    // Clear storage
    if (typeof window !== 'undefined') {
      sessionStorage.clear();
      localStorage.removeItem('cache_index');
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      ...this.cacheStats,
      size: this.memoryCache.size,
      maxSize: this.memoryCache.max,
      hitRate: this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) || 0,
    };
  }

  /**
   * Batch multiple requests
   */
  async batch<T>(
    requests: Array<{
      key: string;
      fetcher: () => Promise<T>;
      options?: CacheOptions;
    }>
  ): Promise<T[]> {
    return Promise.all(
      requests.map(({ key, fetcher, options }) => 
        this.get(key, fetcher, options)
      )
    );
  }

  /**
   * Prefetch data
   */
  async prefetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    // Only prefetch if not already cached
    if (!this.memoryCache.has(key)) {
      await this.get(key, fetcher, options);
    }
  }

  // Private methods

  private getDefaultTTL(key: string): number {
    // Extract data type from key (e.g., "orders_123" -> "orders")
    const dataType = key.split('_')[0];
    const config = CACHE_CONFIGS[dataType];
    return config?.maxAge || 5 * 60 * 1000; // Default 5 minutes
  }

  private async revalidateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    // Avoid duplicate revalidations
    if (this.revalidationQueue.has(key)) {
      return;
    }

    this.revalidationQueue.add(key);
    this.cacheStats.revalidations++;

    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
    } finally {
      this.revalidationQueue.delete(key);
    }
  }

  private invalidateDependents(key: string): void {
    for (const [cacheKey, entry] of this.memoryCache.entries()) {
      if (entry.dependencies?.includes(key)) {
        this.memoryCache.delete(cacheKey);
      }
    }
  }

  private persistToStorage(key: string, entry: CacheEntry<unknown>, layer: CacheLayer): void {
    if (typeof window === 'undefined') return;

    try {
      const serialized = JSON.stringify(entry);
      
      switch (layer) {
        case CacheLayer.SESSION:
          sessionStorage.setItem(`cache_${key}`, serialized);
          break;
        case CacheLayer.LOCAL:
          localStorage.setItem(`cache_${key}`, serialized);
          this.updateStorageIndex(key);
          break;
      }
    } catch (error) {
    }
  }

  private removeFromStorage(key: string): void {
    if (typeof window === 'undefined') return;

    sessionStorage.removeItem(`cache_${key}`);
    localStorage.removeItem(`cache_${key}`);
    this.updateStorageIndex(key, true);
  }

  private updateStorageIndex(key: string, remove = false): void {
    try {
      const index = JSON.parse(localStorage.getItem('cache_index') || '[]');
      
      if (remove) {
        const newIndex = index.filter((k: string) => k !== key);
        localStorage.setItem('cache_index', JSON.stringify(newIndex));
      } else if (!index.includes(key)) {
        index.push(key);
        localStorage.setItem('cache_index', JSON.stringify(index));
      }
    } catch (error) {
    }
  }

  private cleanup(): void {
    // Clean up expired entries from storage
    if (typeof window === 'undefined') return;

    try {
      const index = JSON.parse(localStorage.getItem('cache_index') || '[]');
      const now = Date.now();
      const validKeys: string[] = [];

      for (const key of index) {
        const cached = localStorage.getItem(`cache_${key}`);
        if (cached) {
          const entry = JSON.parse(cached) as CacheEntry<unknown>;
          const ttl = this.getDefaultTTL(key);
          
          if (now - entry.timestamp < ttl) {
            validKeys.push(key);
          } else {
            localStorage.removeItem(`cache_${key}`);
          }
        }
      }

      localStorage.setItem('cache_index', JSON.stringify(validKeys));
    } catch (error) {
    }
  }
}

// Export singleton instance
export const cacheManager = CentralCacheManager.getInstance();

// Export types
export type { CacheOptions, CacheEntry };
export { CacheLayer };
