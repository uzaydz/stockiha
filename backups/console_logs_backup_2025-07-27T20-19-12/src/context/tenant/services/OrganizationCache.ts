/**
 * نظام Cache محسن للمؤسسات
 * يوفر تخزين مؤقت ذكي مع انتهاء صلاحية وتنظيف تلقائي
 */

import { coordinateRequest } from '@/lib/api/requestCoordinator';

export interface CachedOrganization {
  data: any;
  timestamp: number;
  type: 'byId' | 'byDomain' | 'bySubdomain';
  expiresAt: number;
}

export interface OrganizationCacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of cached entries
  debug?: boolean;
}

export class OrganizationCache {
  private cache = new Map<string, CachedOrganization>();
  private readonly config: OrganizationCacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<OrganizationCacheConfig> = {}) {
    this.config = {
      ttl: 10 * 60 * 1000, // 10 minutes default
      maxSize: 50,
      debug: process.env.NODE_ENV === 'development',
      ...config
    };

    this.startCleanupInterval();
    this.setupGlobalCache();
  }

  /**
   * إعداد Cache عالمي للتوافق مع الكود الموجود
   */
  private setupGlobalCache() {
    if (typeof window !== 'undefined') {
      window.organizationCache = this.cache;
    }
  }

  /**
   * جلب المؤسسة من Cache أو إنشاء طلب جديد
   */
  async get(
    key: string,
    fetchFn: () => Promise<any>,
    contextName: string = 'OrganizationCache'
  ): Promise<any> {
    // فحص Cache أولاً
    const cached = this.cache.get(key);
    if (cached && this.isValid(cached)) {
      this.log('📋 Cache Hit', { key, age: Date.now() - cached.timestamp });
      return cached.data;
    }

    // إذا كان Cache منتهي الصلاحية، أزله
    if (cached && !this.isValid(cached)) {
      this.cache.delete(key);
      this.log('🗑️ Cache Expired', { key });
    }

    // استخدام نظام التنسيق للطلبات
    const data = await coordinateRequest(
      'organization',
      { cacheKey: key },
      fetchFn,
      contextName
    );

    // حفظ في Cache
    if (data) {
      this.set(key, data, 'byId'); // Default type
    }

    return data;
  }

  /**
   * حفظ بيانات في Cache
   */
  set(key: string, data: any, type: CachedOrganization['type'] = 'byId'): void {
    // فحص حد الحجم الأقصى
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const now = Date.now();
    const cacheEntry: CachedOrganization = {
      data,
      timestamp: now,
      type,
      expiresAt: now + this.config.ttl
    };

    this.cache.set(key, cacheEntry);
    this.log('💾 Cache Set', { key, type, size: this.cache.size });

    // حفظ نفس البيانات بمفاتيح مختلفة للوصول السريع
    if (data?.id && key !== `org-id-${data.id}`) {
      this.cache.set(`org-id-${data.id}`, { ...cacheEntry, type: 'byId' });
    }
    if (data?.subdomain && key !== `org-subdomain-${data.subdomain}`) {
      this.cache.set(`org-subdomain-${data.subdomain}`, { ...cacheEntry, type: 'bySubdomain' });
    }
    if (data?.domain && key !== `org-domain-${data.domain}`) {
      this.cache.set(`org-domain-${data.domain}`, { ...cacheEntry, type: 'byDomain' });
    }
  }

  /**
   * فحص صحة Cache entry
   */
  private isValid(entry: CachedOrganization): boolean {
    return Date.now() < entry.expiresAt;
  }

  /**
   * إزالة أقدم entry عند الوصول للحد الأقصى
   */
  private evictOldest(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.log('🗑️ Cache Evicted', { key: oldestKey });
    }
  }

  /**
   * تنظيف Cache من البيانات منتهية الصلاحية
   */
  cleanup(): number {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      this.log('🧹 Cache Cleanup', { removed: keysToDelete.length, remaining: this.cache.size });
    }

    return keysToDelete.length;
  }

  /**
   * بدء تنظيف دوري
   */
  private startCleanupInterval(): void {
    if (typeof window === 'undefined') return;

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 2 * 60 * 1000); // كل دقيقتين
  }

  /**
   * إيقاف تنظيف دوري
   */
  stopCleanupInterval(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * مسح جميع البيانات
   */
  clear(): void {
    this.cache.clear();
    this.log('🧹 Cache Cleared');
  }

  /**
   * إحصائيات Cache
   */
  getStats() {
    const now = Date.now();
    let validEntries = 0;
    let expiredEntries = 0;

    for (const entry of this.cache.values()) {
      if (this.isValid(entry)) {
        validEntries++;
      } else {
        expiredEntries++;
      }
    }

    return {
      total: this.cache.size,
      valid: validEntries,
      expired: expiredEntries,
      hitRate: '0%', // يمكن تحسينه لاحقاً
      config: this.config
    };
  }

  /**
   * طباعة رسائل Debug
   */
  private log(message: string, data?: any): void {
    if (this.config.debug) {
      console.log(`[OrganizationCache] ${message}`, data || '');
    }
  }

  /**
   * تنظيف الموارد
   */
  destroy(): void {
    this.stopCleanupInterval();
    this.clear();
  }
}

// إنشاء instance مشترك
export const organizationCache = new OrganizationCache({
  ttl: 10 * 60 * 1000, // 10 دقائق
  maxSize: 100,
  debug: true
}); 