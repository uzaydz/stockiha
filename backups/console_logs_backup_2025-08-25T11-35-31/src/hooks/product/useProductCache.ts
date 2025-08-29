import { useCallback, useRef } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  organizationId?: string;
}

interface CacheManager {
  get: (key: string) => CacheEntry | null;
  set: (key: string, data: any, organizationId?: string) => void;
  has: (key: string) => boolean;
  clear: (key?: string) => void;
  isExpired: (key: string) => boolean;
  hasActiveRequest: (key: string) => boolean;
  addActiveRequest: (key: string, request: Promise<any>) => void;
  getActiveRequest: (key: string) => Promise<any> | undefined;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق

/**
 * Hook لإدارة Cache المنتجات - محسن للأداء
 * - يستخدم Map محلي للـ cache
 * - يدير انتهاء صلاحية البيانات
 * - يمنع تكرار الطلبات
 */
export const useProductCache = (): CacheManager => {
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const activeRequestsRef = useRef<Map<string, Promise<any>>>(new Map());

  // الوصول إلى الـ cache العالمي
  const getGlobalCache = useCallback(() => {
    if (typeof window !== 'undefined' && window.productCache) {
      return window.productCache;
    }
    return new Map();
  }, []);

  // إنشاء مفتاح cache
  const createCacheKey = useCallback((productId: string, organizationId?: string) => {
    return `${productId}-${organizationId || 'public'}`;
  }, []);

  // فحص انتهاء صلاحية cache
  const isExpired = useCallback((key: string): boolean => {
    const entry = cacheRef.current.get(key);
    if (!entry) return true;
    
    const now = Date.now();
    return (now - entry.timestamp) > CACHE_DURATION;
  }, []);

  // الحصول على بيانات من cache
  const get = useCallback((key: string): CacheEntry | null => {
    // فحص cache المحلي أولاً
    const localEntry = cacheRef.current.get(key);
    if (localEntry && !isExpired(key)) {
      return localEntry;
    }

    // فحص cache العالمي
    const globalCache = getGlobalCache();
    const globalEntry = globalCache.get(key);
    if (globalEntry && !isExpired(key)) {
      // نسخ إلى cache المحلي
      cacheRef.current.set(key, globalEntry);
      return globalEntry;
    }

    return null;
  }, [isExpired, getGlobalCache]);

  // حفظ بيانات في cache
  const set = useCallback((key: string, data: any, organizationId?: string) => {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      organizationId
    };

    // حفظ في cache المحلي
    cacheRef.current.set(key, entry);

    // حفظ في cache العالمي
    const globalCache = getGlobalCache();
    globalCache.set(key, entry);
  }, [getGlobalCache]);

  // فحص وجود بيانات في cache
  const has = useCallback((key: string): boolean => {
    return cacheRef.current.has(key) && !isExpired(key);
  }, [isExpired]);

  // مسح cache
  const clear = useCallback((key?: string) => {
    if (key) {
      cacheRef.current.delete(key);
      const globalCache = getGlobalCache();
      globalCache.delete(key);
    } else {
      cacheRef.current.clear();
      const globalCache = getGlobalCache();
      globalCache.clear();
    }
  }, [getGlobalCache]);

  // فحص الطلبات النشطة
  const hasActiveRequest = useCallback((key: string): boolean => {
    return activeRequestsRef.current.has(key);
  }, []);

  // إضافة طلب نشط
  const addActiveRequest = useCallback((key: string, request: Promise<any>) => {
    activeRequestsRef.current.set(key, request);
    
    // إزالة الطلب عند الانتهاء
    request.finally(() => {
      activeRequestsRef.current.delete(key);
    });
  }, []);

  // الحصول على طلب نشط
  const getActiveRequest = useCallback((key: string): Promise<any> | undefined => {
    return activeRequestsRef.current.get(key);
  }, []);

  return {
    get,
    set,
    has,
    clear,
    isExpired,
    hasActiveRequest,
    addActiveRequest,
    getActiveRequest
  };
};
