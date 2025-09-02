/**
 * 🌟 نظام الكاش الموحد - يحل جميع مشاكل التصادم
 * Version: 2.0.0 - النظام النهائي لإدارة الكاش
 */

import { QueryClient } from '@tanstack/react-query';

// أنواع البيانات المختلفة للكاش
export type CacheType = 'api' | 'ui' | 'user' | 'static' | 'session' | 'persistent';

// إعدادات الكاش لكل نوع
const CACHE_CONFIGS = {
  api: {
    maxAge: 5 * 60 * 1000, // 5 دقائق
    storage: 'memory',
    priority: 'high',
    syncWithServiceWorker: true
  },
  ui: {
    maxAge: 30 * 60 * 1000, // 30 دقيقة
    storage: 'sessionStorage',
    priority: 'medium',
    syncWithServiceWorker: false
  },
  user: {
    maxAge: 60 * 60 * 1000, // ساعة
    storage: 'localStorage',
    priority: 'high',
    syncWithServiceWorker: false
  },
  static: {
    maxAge: 24 * 60 * 60 * 1000, // يوم
    storage: 'persistent',
    priority: 'low',
    syncWithServiceWorker: true
  },
  session: {
    maxAge: 24 * 60 * 60 * 1000, // يوم (لكن يمسح عند إغلاق المتصفح)
    storage: 'sessionStorage',
    priority: 'medium',
    syncWithServiceWorker: false
  },
  persistent: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // أسبوع
    storage: 'indexedDB',
    priority: 'high',
    syncWithServiceWorker: true
  }
};

// واجهة إدخال الكاش
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  type: CacheType;
  key: string;
  metadata?: {
    size?: number;
    lastAccessed?: number;
    accessCount?: number;
    expiresAt?: number;
  };
}

// مدير الكاش الموحد
export class UnifiedCacheManager {

  private static instance: UnifiedCacheManager;
  private memoryCache = new Map<string, CacheEntry>();
  private queryClient: QueryClient | null = null;
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.initialize();
  }

  static getInstance(): UnifiedCacheManager {
    if (!UnifiedCacheManager.instance) {
      UnifiedCacheManager.instance = new UnifiedCacheManager();
    }
    return UnifiedCacheManager.instance;
  }

  private initialize() {
    // ربط مع React Query
    this.setupReactQueryIntegration();

    // بدء التنظيف التلقائي
    this.startCleanupInterval();

    // الاستماع لأحداث التطبيق
    this.setupEventListeners();

  }

  private setupReactQueryIntegration() {
    // الحصول على QueryClient من الـ window إذا كان متوفراً
    if (typeof window !== 'undefined' && (window as any).queryClient) {
      this.queryClient = (window as any).queryClient;
    }
  }

  private startCleanupInterval() {
    // تنظيف كل 5 دقائق
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined') {
      // تنظيف عند إغلاق الصفحة
      window.addEventListener('beforeunload', () => {
        this.saveToPersistentStorage();
      });

      // تنظيف عند فقدان التركيز
      window.addEventListener('blur', () => {
        this.saveToPersistentStorage();
      });

      // استعادة عند التركيز
      window.addEventListener('focus', () => {
        this.loadFromPersistentStorage();
      });
    }
  }

  /**
   * تخزين بيانات في الكاش
   */
  set<T>(
    key: string,
    data: T,
    type: CacheType = 'api',
    customTtl?: number
  ): void {
    const config = CACHE_CONFIGS[type];
    const ttl = customTtl || config.maxAge;
    const expiresAt = Date.now() + ttl;

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      type,
      key,
      metadata: {
        size: this.calculateSize(data),
        lastAccessed: Date.now(),
        accessCount: 1,
        expiresAt
      }
    };

    // تخزين في الذاكرة
    this.memoryCache.set(key, entry);

    // تخزين في التخزين المناسب
    this.persistToStorage(key, entry, config.storage);

    // مزامنة مع React Query إذا كان متاحاً
    this.syncWithReactQuery(key, data, type);

    // مزامنة مع Service Worker إذا لزم الأمر
    if (config.syncWithServiceWorker) {
      this.syncWithServiceWorker(key, data);
    }

    if (import.meta.env.DEV) {
    }
  }

  /**
   * استرجاع بيانات من الكاش
   */
  get<T>(key: string): T | null {
    // البحث في الذاكرة أولاً
    let entry = this.memoryCache.get(key) as CacheEntry<T> | undefined;

    // البحث في التخزين الدائم إذا لم يوجد في الذاكرة
    if (!entry) {
      entry = this.loadFromStorage(key);
      if (entry) {
        // إعادة تحميل في الذاكرة
        this.memoryCache.set(key, entry);
      }
    }

    if (!entry) {
      return null;
    }

    // التحقق من انتهاء الصلاحية
    if (this.isExpired(entry)) {
      this.delete(key);
      return null;
    }

    // تحديث metadata
    if (entry.metadata) {
      entry.metadata.lastAccessed = Date.now();
      entry.metadata.accessCount = (entry.metadata.accessCount || 0) + 1;
    }

    if (import.meta.env.DEV) {
    }

    return entry.data;
  }

  /**
   * حذف من الكاش
   */
  delete(key: string): boolean {
    // حذف من الذاكرة
    const deletedFromMemory = this.memoryCache.delete(key);

    // حذف من جميع أنواع التخزين
    this.deleteFromStorage(key, 'localStorage');
    this.deleteFromStorage(key, 'sessionStorage');
    this.deleteFromStorage(key, 'indexedDB');

    // حذف من React Query
    this.deleteFromReactQuery(key);

    // حذف من Service Worker
    this.deleteFromServiceWorker(key);

    if (import.meta.env.DEV) {
    }

    return deletedFromMemory;
  }

  /**
   * مسح جميع البيانات من نوع معين
   */
  clearByType(type: CacheType): void {
    const keysToDelete: string[] = [];

    // جمع المفاتيح المراد حذفها
    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.type === type) {
        keysToDelete.push(key);
      }
    }

    // حذف المفاتيح
    keysToDelete.forEach(key => this.delete(key));

  }

  /**
   * مسح جميع الكاش
   */
  clearAll(): void {
    // مسح الذاكرة
    this.memoryCache.clear();

    // مسح جميع أنواع التخزين
    this.clearStorage('localStorage');
    this.clearStorage('sessionStorage');
    this.clearStorage('indexedDB');

    // مسح React Query
    this.clearReactQuery();

    // مسح Service Worker
    this.clearServiceWorker();

  }

  /**
   * الحصول على إحصائيات الكاش
   */
  getStats() {
    const stats = {
      memory: {
        entries: this.memoryCache.size,
        types: {} as Record<string, number>,
        totalSize: 0
      },
      storage: {
        localStorage: this.getStorageStats('localStorage'),
        sessionStorage: this.getStorageStats('sessionStorage'),
        indexedDB: this.getStorageStats('indexedDB')
      },
      reactQuery: this.getReactQueryStats(),
      serviceWorker: null as any
    };

    // إحصائيات الأنواع في الذاكرة
    for (const entry of this.memoryCache.values()) {
      stats.memory.types[entry.type] = (stats.memory.types[entry.type] || 0) + 1;
      stats.memory.totalSize += entry.metadata?.size || 0;
    }

    // إحصائيات Service Worker
    if (typeof window !== 'undefined' && (window as any).serviceWorkerCache) {
      stats.serviceWorker = (window as any).serviceWorkerCache.getStats();
    }

    return stats;
  }

  // ============ دوال مساعدة ============

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 0;
    }
  }

  private isExpired(entry: CacheEntry): boolean {
    if (!entry.metadata?.expiresAt) {
      return false;
    }
    return Date.now() > entry.metadata.expiresAt;
  }

  private persistToStorage(key: string, entry: CacheEntry, storage: string): void {
    try {
      const data = JSON.stringify(entry);

      switch (storage) {
        case 'localStorage':
          if (typeof window !== 'undefined') {
            localStorage.setItem(`ucm_${key}`, data);
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(`ucm_${key}`, data);
          }
          break;
        case 'indexedDB':
          // سيتم تنفيذه لاحقاً إذا لزم الأمر
          break;
      }
    } catch (error) {
    }
  }

  private loadFromStorage(key: string): CacheEntry | null {
    try {
      // البحث في localStorage
      if (typeof window !== 'undefined') {
        const localData = localStorage.getItem(`ucm_${key}`);
        if (localData) {
          return JSON.parse(localData);
        }

        // البحث في sessionStorage
        const sessionData = sessionStorage.getItem(`ucm_${key}`);
        if (sessionData) {
          return JSON.parse(sessionData);
        }
      }
    } catch (error) {
    }

    return null;
  }

  private deleteFromStorage(key: string, storage: string): void {
    try {
      switch (storage) {
        case 'localStorage':
          if (typeof window !== 'undefined') {
            localStorage.removeItem(`ucm_${key}`);
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(`ucm_${key}`);
          }
          break;
        case 'indexedDB':
          // سيتم تنفيذه لاحقاً
          break;
      }
    } catch (error) {
    }
  }

  private clearStorage(storage: string): void {
    try {
      switch (storage) {
        case 'localStorage':
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            keys.filter(key => key.startsWith('ucm_')).forEach(key => {
              localStorage.removeItem(key);
            });
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined') {
            const keys = Object.keys(sessionStorage);
            keys.filter(key => key.startsWith('ucm_')).forEach(key => {
              sessionStorage.removeItem(key);
            });
          }
          break;
        case 'indexedDB':
          // سيتم تنفيذه لاحقاً
          break;
      }
    } catch (error) {
    }
  }

  private getStorageStats(storage: string): any {
    try {
      switch (storage) {
        case 'localStorage':
          if (typeof window !== 'undefined') {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith('ucm_'));
            return { entries: cacheKeys.length };
          }
          break;
        case 'sessionStorage':
          if (typeof window !== 'undefined') {
            const keys = Object.keys(sessionStorage);
            const cacheKeys = keys.filter(key => key.startsWith('ucm_'));
            return { entries: cacheKeys.length };
          }
          break;
      }
    } catch (error) {
      return { error: error.message };
    }

    return { entries: 0 };
  }

  private syncWithReactQuery(key: string, data: any, type: CacheType): void {
    if (!this.queryClient) return;

    try {
      // محاولة تحديث React Query cache
      this.queryClient.setQueryData([key], data);
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private deleteFromReactQuery(key: string): void {
    if (!this.queryClient) return;

    try {
      this.queryClient.removeQueries({ queryKey: [key] });
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private clearReactQuery(): void {
    if (!this.queryClient) return;

    try {
      this.queryClient.clear();
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private getReactQueryStats(): any {
    if (!this.queryClient) {
      return { available: false };
    }

    try {
      const cache = this.queryClient.getQueryCache();
      return {
        available: true,
        queries: cache.getAll().length
      };
    } catch (error) {
      return { available: true, error: error.message };
    }
  }

  private syncWithServiceWorker(key: string, data: any): void {
    if (typeof window === 'undefined') return;

    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_UPDATE',
          key,
          data
        });
      }
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private deleteFromServiceWorker(key: string): void {
    if (typeof window === 'undefined') return;

    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_DELETE',
          key
        });
      }
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private clearServiceWorker(): void {
    if (typeof window === 'undefined') return;

    try {
      if (navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_CACHE'
        });
      }
    } catch (error) {
      // تجاهل الأخطاء
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    // البحث عن المدخلات المنتهية الصلاحية
    for (const [key, entry] of this.memoryCache.entries()) {
      if (this.isExpired(entry)) {
        expiredKeys.push(key);
      }
    }

    // حذف المدخلات المنتهية الصلاحية
    expiredKeys.forEach(key => {
      this.memoryCache.delete(key);
    });

    // تنظيف التخزين الدائم
    this.cleanupPersistentStorage();

    if (expiredKeys.length > 0) {
    }
  }

  private cleanupPersistentStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      // تنظيف localStorage
      const localKeys = Object.keys(localStorage);
      localKeys.filter(key => key.startsWith('ucm_')).forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key)!);
          if (data.metadata?.expiresAt && Date.now() > data.metadata.expiresAt) {
            localStorage.removeItem(key);
          }
        } catch {
          // حذف البيانات التالفة
          localStorage.removeItem(key);
        }
      });

      // تنظيف sessionStorage
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.filter(key => key.startsWith('ucm_')).forEach(key => {
        try {
          const data = JSON.parse(sessionStorage.getItem(key)!);
          if (data.metadata?.expiresAt && Date.now() > data.metadata.expiresAt) {
            sessionStorage.removeItem(key);
          }
        } catch {
          // حذف البيانات التالفة
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
    }
  }

  private saveToPersistentStorage(): void {
    // حفظ أهم البيانات في localStorage
    const importantEntries: Record<string, CacheEntry> = {};

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.type === 'user' || entry.type === 'persistent') {
        importantEntries[key] = entry;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('ucm_backup', JSON.stringify(importantEntries));
      } catch (error) {
      }
    }
  }

  private loadFromPersistentStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const backup = localStorage.getItem('ucm_backup');
      if (backup) {
        const data = JSON.parse(backup);
        for (const [key, entry] of Object.entries(data)) {
          if (!this.memoryCache.has(key)) {
            this.memoryCache.set(key, entry as CacheEntry);
          }
        }
      }
    } catch (error) {
    }
  }

  // دوال عامة للاستخدام الخارجي
  static set<T>(key: string, data: T, type: CacheType = 'api', ttl?: number): void {
    UnifiedCacheManager.getInstance().set(key, data, type, ttl);
  }

  static get<T>(key: string): T | null {
    return UnifiedCacheManager.getInstance().get<T>(key);
  }

  static delete(key: string): boolean {
    return UnifiedCacheManager.getInstance().delete(key);
  }

  static clearByType(type: CacheType): void {
    UnifiedCacheManager.getInstance().clearByType(type);
  }

  static clearAll(): void {
    UnifiedCacheManager.getInstance().clearAll();
  }

  static getStats() {
    return UnifiedCacheManager.getInstance().getStats();
  }
}

// إضافة للـ window للاستخدام العام
if (typeof window !== 'undefined') {
  (window as any).UnifiedCache = UnifiedCacheManager;
}

export default UnifiedCacheManager;
