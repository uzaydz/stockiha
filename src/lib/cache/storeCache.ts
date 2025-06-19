// =================================================================
// 🚀 STORE CACHE SYSTEM - نظام التخزين المؤقت المتقدم
// =================================================================

interface CacheItem<T = any> {
  data: T;
      timestamp: number;
      ttl: number;
  version: string;
  compressed?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

// =================================================================
// 🎯 Cache Configuration
// =================================================================
const CACHE_CONFIG = {
  // TTL values in milliseconds
  TTL: {
    STORE_DATA: 5 * 60 * 1000,      // 5 minutes
    ORGANIZATION: 10 * 60 * 1000,    // 10 minutes
    CATEGORIES: 15 * 60 * 1000,      // 15 minutes
    PRODUCTS: 5 * 60 * 1000,         // 5 minutes
    SETTINGS: 30 * 60 * 1000,        // 30 minutes
    COMPONENTS: 10 * 60 * 1000,      // 10 minutes
  },
  
  // Cache sizes
  MAX_MEMORY_SIZE: 50 * 1024 * 1024, // 50MB
  MAX_ITEMS: 1000,
  
  // Compression threshold
  COMPRESSION_THRESHOLD: 1024, // 1KB
  
  // Version for cache invalidation
  CACHE_VERSION: '2.0.0',
};

// =================================================================
// 🎯 Memory Cache Implementation
// =================================================================
class MemoryCache {
  private cache = new Map<string, CacheItem>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    size: 0,
    hitRate: 0,
  };

  // =================================================================
  // 🎯 Core Methods
  // =================================================================
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check TTL
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check version
    if (item.version !== CACHE_CONFIG.CACHE_VERSION) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    this.stats.hits++;
    this.updateHitRate();
    
    // Decompress if needed
    return item.compressed ? this.decompress(item.data) : item.data;
  }

  set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.STORE_DATA): void {
    // Check if we need to compress
    const serialized = JSON.stringify(data);
    const shouldCompress = serialized.length > CACHE_CONFIG.COMPRESSION_THRESHOLD;
    
    const item: CacheItem = {
      data: shouldCompress ? this.compress(data) : data,
      timestamp: Date.now(),
      ttl,
      version: CACHE_CONFIG.CACHE_VERSION,
      compressed: shouldCompress,
    };

    this.cache.set(key, item);
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    // Cleanup if needed
    this.cleanup();
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;
    
    // Check TTL and version
    if (Date.now() - item.timestamp > item.ttl || item.version !== CACHE_CONFIG.CACHE_VERSION) {
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }

  // =================================================================
  // 🎯 Utility Methods
  // =================================================================
  private compress<T>(data: T): T | string {
    try {
      // Simple compression using JSON + base64 with UTF-8 support
      const json = JSON.stringify(data);
      // Use encodeURIComponent to handle Unicode characters properly
      const encoded = encodeURIComponent(json);
      return btoa(encoded);
    } catch (error) {
      return data;
    }
  }

  private decompress<T>(compressed: string): T {
    try {
      const decoded = atob(compressed);
      // Use decodeURIComponent to handle Unicode characters properly
      const json = decodeURIComponent(decoded);
      return JSON.parse(json);
    } catch (error) {
      return compressed as any;
    }
  }

  private cleanup(): void {
    // Remove expired items
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl || item.version !== CACHE_CONFIG.CACHE_VERSION) {
        this.cache.delete(key);
      }
    }

    // Remove oldest items if over limit
    if (this.cache.size > CACHE_CONFIG.MAX_ITEMS) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, this.cache.size - CACHE_CONFIG.MAX_ITEMS);
      toRemove.forEach(([key]) => this.cache.delete(key));
    }

    this.stats.size = this.cache.size;
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getMemoryUsage(): number {
    let size = 0;
    for (const item of this.cache.values()) {
      size += JSON.stringify(item).length;
    }
    return size;
  }
}

// =================================================================
// 🎯 Redis Cache Implementation (للمستقبل)
// =================================================================
class RedisCache {
  private isAvailable = false;
  private client: any = null;

  constructor() {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // تحقق من توفر Redis
      if (typeof window !== 'undefined' && (window as any).redisClient) {
        this.client = (window as any).redisClient;
        this.isAvailable = true;
      }
  } catch (error) {
      this.isAvailable = false;
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isAvailable) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const parsed = JSON.parse(data);
      
      // Check version
      if (parsed.version !== CACHE_CONFIG.CACHE_VERSION) {
        await this.client.del(key);
        return null;
      }

      return parsed.compressed ? this.decompress(parsed.data) : parsed.data;
  } catch (error) {
    return null;
  }
}

  async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.STORE_DATA): Promise<void> {
    if (!this.isAvailable) return;

    try {
      const serialized = JSON.stringify(data);
      const shouldCompress = serialized.length > CACHE_CONFIG.COMPRESSION_THRESHOLD;
      
      const item = {
        data: shouldCompress ? this.compress(data) : data,
        version: CACHE_CONFIG.CACHE_VERSION,
        compressed: shouldCompress,
      };

      await this.client.setex(key, Math.floor(ttl / 1000), JSON.stringify(item));
  } catch (error) {
    }
  }

  async delete(key: string): Promise<boolean> {
    if (!this.isAvailable) return false;

    try {
      const result = await this.client.del(key);
      return result > 0;
    } catch (error) {
      return false;
    }
  }

  async clear(): Promise<void> {
    if (!this.isAvailable) return;

    try {
      await this.client.flushdb();
    } catch (error) {
    }
  }

  private compress<T>(data: T): string {
    try {
      const json = JSON.stringify(data);
      // Use encodeURIComponent to handle Unicode characters properly
      const encoded = encodeURIComponent(json);
      return btoa(encoded);
    } catch (error) {
      return data as any;
    }
  }

  private decompress<T>(compressed: string): T {
    try {
      const decoded = atob(compressed);
      // Use decodeURIComponent to handle Unicode characters properly
      const json = decodeURIComponent(decoded);
      return JSON.parse(json);
    } catch (error) {
      return compressed as any;
    }
  }
}

// =================================================================
// 🎯 Multi-Level Cache System
// =================================================================
class MultiLevelCache {
  private memoryCache = new MemoryCache();
  private redisCache = new RedisCache();

  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory Cache
    let data = this.memoryCache.get<T>(key);
    if (data !== null) {
      return data;
    }

    // Level 2: Redis Cache
    data = await this.redisCache.get<T>(key);
    if (data !== null) {
      // Store in memory cache for faster access
      this.memoryCache.set(key, data, CACHE_CONFIG.TTL.STORE_DATA);
      return data;
    }

    return null;
  }

  async set<T>(key: string, data: T, ttl: number = CACHE_CONFIG.TTL.STORE_DATA): Promise<void> {
    // Store in both levels
    this.memoryCache.set(key, data, ttl);
    await this.redisCache.set(key, data, ttl);
  }

  async delete(key: string): Promise<boolean> {
    const memoryDeleted = this.memoryCache.delete(key);
    const redisDeleted = await this.redisCache.delete(key);
    return memoryDeleted || redisDeleted;
  }

  async clear(): Promise<void> {
    this.memoryCache.clear();
    await this.redisCache.clear();
  }

  has(key: string): boolean {
    return this.memoryCache.has(key);
  }

  getStats(): CacheStats {
    return this.memoryCache.getStats();
  }

  getMemoryUsage(): number {
    return this.memoryCache.getMemoryUsage();
  }
}

// =================================================================
// 🎯 Cache Instance & Public API
// =================================================================
const storeCache = new MultiLevelCache();

// =================================================================
// 🎯 Public API Functions
// =================================================================

/**
 * Get data from cache
 */
export async function getCacheData<T>(key: string): Promise<T | null> {
  console.log('🚫 [StoreCache] DISABLED - Not returning cached data for:', key);
  return null; // Always return null - no cache
}

/**
 * Set data in cache
 */
export async function setCacheData<T>(
  key: string, 
  data: T, 
  ttl: number = CACHE_CONFIG.TTL.STORE_DATA
): Promise<void> {
  console.log('🚫 [StoreCache] DISABLED - Not caching data for:', key);
  // Do nothing - cache is disabled
}

/**
 * Delete data from cache
 */
export async function clearCacheItem(key: string): Promise<boolean> {
  return await storeCache.delete(key);
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  await storeCache.clear();
}

/**
 * Check if key exists in cache
 */
export function hasCacheData(key: string): boolean {
  return storeCache.has(key);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): CacheStats {
  return storeCache.getStats();
}

/**
 * Get memory usage
 */
export function getCacheMemoryUsage(): number {
  return storeCache.getMemoryUsage();
}

// =================================================================
// 🎯 Specialized Cache Functions
// =================================================================

/**
 * Store data cache
 */
export async function getStoreCache(subdomain: string) {
  return await getCacheData(`store:${subdomain}`);
}

export async function setStoreCache(subdomain: string, data: any) {
  await setCacheData(`store:${subdomain}`, data, CACHE_CONFIG.TTL.STORE_DATA);
}

/**
 * Organization cache
 */
export async function getOrganizationCache(orgId: string) {
  return await getCacheData(`org:${orgId}`);
}

export async function setOrganizationCache(orgId: string, data: any) {
  await setCacheData(`org:${orgId}`, data, CACHE_CONFIG.TTL.ORGANIZATION);
}

/**
 * Categories cache
 */
export async function getCategoriesCache(orgId: string) {
  return await getCacheData(`categories:${orgId}`);
}

export async function setCategoriesCache(orgId: string, data: any) {
  await setCacheData(`categories:${orgId}`, data, CACHE_CONFIG.TTL.CATEGORIES);
}

/**
 * Products cache
 */
export async function getProductsCache(orgId: string, categoryId?: string) {
  const key = categoryId ? `products:${orgId}:${categoryId}` : `products:${orgId}`;
  return await getCacheData(key);
}

export async function setProductsCache(orgId: string, data: any, categoryId?: string) {
  const key = categoryId ? `products:${orgId}:${categoryId}` : `products:${orgId}`;
  await setCacheData(key, data, CACHE_CONFIG.TTL.PRODUCTS);
}

/**
 * Settings cache
 */
export async function getSettingsCache(orgId: string) {
  return await getCacheData(`settings:${orgId}`);
}

export async function setSettingsCache(orgId: string, data: any) {
  await setCacheData(`settings:${orgId}`, data, CACHE_CONFIG.TTL.SETTINGS);
}

/**
 * Components cache
 */
export async function getComponentsCache(orgId: string) {
  return await getCacheData(`components:${orgId}`);
}

export async function setComponentsCache(orgId: string, data: any) {
  await setCacheData(`components:${orgId}`, data, CACHE_CONFIG.TTL.COMPONENTS);
}

// =================================================================
// 🎯 Cache Invalidation
// =================================================================

/**
 * Invalidate store cache
 */
export async function invalidateStoreCache(subdomain: string) {
  await clearCacheItem(`store:${subdomain}`);
}

/**
 * Invalidate organization cache
 */
export async function invalidateOrganizationCache(orgId: string) {
  const keys = [
    `org:${orgId}`,
    `categories:${orgId}`,
    `products:${orgId}`,
    `settings:${orgId}`,
    `components:${orgId}`,
  ];
  
  await Promise.all(keys.map(key => clearCacheItem(key)));
}

/**
 * Invalidate all cache for organization
 */
export async function invalidateAllOrgCache(orgId: string) {
  await invalidateOrganizationCache(orgId);
}

/**
 * Clear store cache by organization ID (alias for invalidateOrganizationCache)
 */
export async function clearStoreCacheByOrganizationId(orgId: string) {
  await invalidateOrganizationCache(orgId);
}

// =================================================================
// 🎯 Cache Warming
// =================================================================

/**
 * Warm up cache with essential data
 */
export async function warmUpCache(subdomain: string, orgId: string) {
  try {
    // يمكن إضافة منطق تحميل البيانات الأساسية هنا
  } catch (error) {
  }
}

// =================================================================
// 🎯 withCache Function for Backward Compatibility
// =================================================================
export async function withCache<T>(
  key: string,
  fetchFunction: () => Promise<T>,
  ttl: number = DEFAULT_CACHE_TTL
): Promise<T> {
  console.log('🚫 [StoreCache] DISABLED - Always fetching fresh data for:', key);
  
  // Always fetch fresh data - no caching
  const data = await fetchFunction();
  return data;
}

// =================================================================
// 🎯 TTL Constants for Backward Compatibility
// =================================================================
export const LONG_CACHE_TTL = CACHE_CONFIG.TTL.SETTINGS; // 30 minutes
export const SHORT_CACHE_TTL = CACHE_CONFIG.TTL.STORE_DATA; // 5 minutes
export const DEFAULT_CACHE_TTL = CACHE_CONFIG.TTL.ORGANIZATION; // 10 minutes

// =================================================================
// 🎯 Export Configuration
// =================================================================
export { CACHE_CONFIG };
export default storeCache;

// =================================================================
// 🎯 ENHANCED CACHE INVALIDATION - نظام مسح محسن للعمليات CRUD
// =================================================================

/**
 * مسح كامل وفوري لجميع أنواع cache المرتبطة بنوع معين من البيانات
 * يتم استدعاؤها فوراً بعد العمليات CRUD
 */
export async function forceInvalidateAllCacheTypes(
  entityType: 'categories' | 'products' | 'orders' | 'settings' | 'apps' | 'subscriptions',
  organizationId: string,
  options: { subdomain?: string; categoryId?: string } = {}
): Promise<void> {
  console.log('🧹 [Enhanced Cache Invalidation] بدء مسح شامل لجميع أنواع cache:', {
    entityType,
    organizationId,
    options,
    timestamp: new Date().toISOString()
  });

  const { subdomain, categoryId } = options;

  // 1. مسح storeCache (هذا الملف)
  const storeCacheKeys = generateStoreCacheKeys(entityType, organizationId, { subdomain, categoryId });
  console.log('🔄 [Enhanced Cache Invalidation] مسح storeCache keys:', storeCacheKeys);
  await Promise.all(storeCacheKeys.map(key => clearCacheItem(key)));

  // 2. مسح globalCache من UnifiedRequestManager
  if (typeof window !== 'undefined' && (window as any).clearUnifiedCache) {
    const unifiedKeys = generateUnifiedCacheKeys(entityType, organizationId);
    console.log('🔄 [Enhanced Cache Invalidation] مسح globalCache keys:', unifiedKeys);
    (window as any).clearUnifiedCache(unifiedKeys);
  }

  // 3. مسح centralRequestManager cache
  if (typeof window !== 'undefined' && (window as any).centralRequestManager) {
    console.log('🔄 [Enhanced Cache Invalidation] مسح centralRequestManager cache...');
    await (window as any).centralRequestManager.clearOrganizationCache(organizationId, subdomain);
  }

  // 4. مسح أي cache إضافي في الذاكرة
  if (typeof window !== 'undefined') {
    // مسح localStorage cache إذا وجد
    const localStorageKeys = [`${entityType}_${organizationId}`, `cache_${entityType}_${organizationId}`];
    localStorageKeys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // تجاهل أخطاء localStorage
      }
    });

    // مسح sessionStorage cache إذا وجد
    localStorageKeys.forEach(key => {
      try {
        sessionStorage.removeItem(key);
      } catch (error) {
        // تجاهل أخطاء sessionStorage
      }
    });
  }

  console.log('✅ [Enhanced Cache Invalidation] تم مسح جميع أنواع cache بنجاح');
}

/**
 * توليد مفاتيح storeCache للمسح
 */
function generateStoreCacheKeys(
  entityType: string,
  organizationId: string,
  options: { subdomain?: string; categoryId?: string } = {}
): string[] {
  const { subdomain, categoryId } = options;
  const keys: string[] = [];

  switch (entityType) {
    case 'categories':
      keys.push(
        `categories:${organizationId}`,
        `org:${organizationId}`,
        `components:${organizationId}`,
        `settings:${organizationId}`
      );
      if (subdomain) {
        keys.push(`store:${subdomain}`);
      }
      break;
    
    case 'products':
      keys.push(
        `products:${organizationId}`,
        `categories:${organizationId}`,
        `org:${organizationId}`
      );
      if (categoryId) {
        keys.push(`products:${organizationId}:${categoryId}`);
      }
      if (subdomain) {
        keys.push(`store:${subdomain}`);
      }
      break;
    
    case 'settings':
      keys.push(
        `settings:${organizationId}`,
        `org:${organizationId}`,
        `components:${organizationId}`
      );
      if (subdomain) {
        keys.push(`store:${subdomain}`);
      }
      break;
    
    case 'apps':
      keys.push(
        `apps:${organizationId}`,
        `org:${organizationId}`,
        `settings:${organizationId}`
      );
      break;
    
    default:
      keys.push(`${entityType}:${organizationId}`, `org:${organizationId}`);
      break;
  }

  return keys;
}

/**
 * توليد مفاتيح UnifiedRequestManager للمسح
 */
function generateUnifiedCacheKeys(entityType: string, organizationId: string): string[] {
  const keys: string[] = [];

  switch (entityType) {
    case 'categories':
      keys.push(
        `unified_categories_${organizationId}`,
        `categories_${organizationId}`,
        `subcategories_${organizationId}`
      );
      break;
    
    case 'products':
      keys.push(
        `unified_products_${organizationId}`,
        `products_${organizationId}`,
        `featured_products_${organizationId}`
      );
      break;
    
    case 'settings':
      keys.push(
        `unified_settings_${organizationId}`,
        `org_settings_${organizationId}`,
        `store_settings_${organizationId}`
      );
      break;
    
    case 'apps':
      keys.push(
        `unified_apps_${organizationId}`,
        `org_apps_${organizationId}`
      );
      break;
    
    default:
      keys.push(`unified_${entityType}_${organizationId}`);
      break;
  }

  return keys;
}

// =================================================================
// 🎯 إضافة دالة window للاستخدام العالمي
// =================================================================

if (typeof window !== 'undefined') {
  // دالة لمسح cache فوري بعد العمليات CRUD
  (window as any).forceInvalidateAllCache = forceInvalidateAllCacheTypes;
  
  // دالة مساعدة لمسح cache محدد
  (window as any).clearSpecificCache = async (keys: string[]) => {
    await Promise.all(keys.map(key => clearCacheItem(key)));
  };
}
