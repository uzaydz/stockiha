/**
 * ProductDataCache - إدارة التخزين المؤقت لبيانات المنتج
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

import type { 
  UnifiedProductPageData, 
  ProductCacheItem, 
  ProductCacheKey 
} from './ProductDataTypes';

/**
 * ثوابت Cache
 */
const CACHE_CONSTANTS = {
  DURATION: 5 * 60 * 1000, // 5 دقائق
  MAX_SIZE: 100, // أقصى عدد من العناصر
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 دقائق
} as const;

/**
 * Cache عالمي لمنع الطلبات المتكررة
 */
class ProductDataCache {
  private cache = new Map<ProductCacheKey, ProductCacheItem>();
  private activeRequests = new Map<ProductCacheKey, Promise<UnifiedProductPageData>>();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startCleanupInterval();
  }

  /**
   * بدء فترات التنظيف التلقائي
   */
  private startCleanupInterval() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, CACHE_CONSTANTS.CLEANUP_INTERVAL);
  }

  /**
   * تنظيف Cache منتهي الصلاحية
   */
  private cleanup() {
    const now = Date.now();
    const expiredKeys: ProductCacheKey[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > CACHE_CONSTANTS.DURATION) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // تنظيف الطلبات النشطة القديمة
    this.activeRequests.clear();

    if (process.env.NODE_ENV === 'development') {
      console.log(`🧹 [ProductDataCache] تم تنظيف ${expiredKeys.length} عنصر منتهي الصلاحية`);
    }
  }

  /**
   * الحصول على بيانات من Cache
   */
  get(key: ProductCacheKey): UnifiedProductPageData | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > CACHE_CONSTANTS.DURATION) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * حفظ بيانات في Cache
   */
  set(key: ProductCacheKey, data: UnifiedProductPageData): void {
    // التحقق من حجم Cache
    if (this.cache.size >= CACHE_CONSTANTS.MAX_SIZE) {
      this.evictOldest();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * إزالة أقدم عنصر من Cache
   */
  private evictOldest(): void {
    let oldestKey: ProductCacheKey | null = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      if (item.timestamp < oldestTime) {
        oldestTime = item.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * التحقق من وجود طلب نشط
   */
  hasActiveRequest(key: ProductCacheKey): boolean {
    return this.activeRequests.has(key);
  }

  /**
   * الحصول على طلب نشط
   */
  getActiveRequest(key: ProductCacheKey): Promise<UnifiedProductPageData> | undefined {
    return this.activeRequests.get(key);
  }

  /**
   * تعيين طلب نشط
   */
  setActiveRequest(key: ProductCacheKey, request: Promise<UnifiedProductPageData>): void {
    this.activeRequests.set(key, request);
  }

  /**
   * إزالة طلب نشط
   */
  removeActiveRequest(key: ProductCacheKey): void {
    this.activeRequests.delete(key);
  }

  /**
   * مسح Cache لمنتج محدد
   */
  clearForProduct(productId: string): void {
    const keysToDelete: ProductCacheKey[] = [];

    for (const key of this.cache.keys()) {
      if (key.includes(productId)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    this.activeRequests.clear();

    if (process.env.NODE_ENV === 'development') {
      console.log(`🗑️ [ProductDataCache] تم مسح Cache لـ ${keysToDelete.length} عنصر للمنتج ${productId}`);
    }
  }

  /**
   * مسح جميع Cache
   */
  clearAll(): void {
    this.cache.clear();
    this.activeRequests.clear();

    if (process.env.NODE_ENV === 'development') {
      console.log('🗑️ [ProductDataCache] تم مسح جميع Cache');
    }
  }

  /**
   * الحصول على إحصائيات Cache
   */
  getStats() {
    return {
      size: this.cache.size,
      activeRequests: this.activeRequests.size,
      maxSize: CACHE_CONSTANTS.MAX_SIZE,
      duration: CACHE_CONSTANTS.DURATION
    };
  }

  /**
   * تنظيف الموارد
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.cache.clear();
    this.activeRequests.clear();
  }
}

// إنشاء instance واحد من Cache
export const productDataCache = new ProductDataCache();

/**
 * دوال مساعدة للـ Cache
 */
export const createCacheKey = (productId: string, organizationId?: string): ProductCacheKey => {
  return `unified_product_${productId}_${organizationId || 'no_org'}`;
};

export const clearUnifiedProductCache = (productId?: string) => {
  if (productId) {
    productDataCache.clearForProduct(productId);
  } else {
    productDataCache.clearAll();
  }
};
