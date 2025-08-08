/**
 * 🚀 محسن الطلبات - مكتبة لتحسين إدارة الطلبات ومنع التكرار
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface RequestCache {
  data: any;
  timestamp: number;
  isPending: boolean;
}

interface RequestOptions {
  cacheKey: string;
  cacheDuration?: number;
  debounceTime?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

class RequestOptimizer {
  private cache = new Map<string, RequestCache>();
  private pendingRequests = new Map<string, Promise<any>>();
  private debounceTimers = new Map<string, NodeJS.Timeout>();

  /**
   * تنفيذ طلب مع تحسينات متعددة
   */
  async executeRequest<T>(
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> {
    const {
      cacheKey,
      cacheDuration = 5 * 60 * 1000, // 5 دقائق افتراضياً
      debounceTime = 1000, // ثانية واحدة افتراضياً
      retryAttempts = 3,
      retryDelay = 1000
    } = options;

    // التحقق من الكاش أولاً
    const cached = this.cache.get(cacheKey);
    if (cached && !cached.isPending) {
      const now = Date.now();
      if ((now - cached.timestamp) < cacheDuration) {
        return cached.data;
      }
    }

    // التحقق من الطلبات المعلقة
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // تطبيق debouncing
    if (debounceTime > 0) {
      return new Promise((resolve, reject) => {
        if (this.debounceTimers.has(cacheKey)) {
          clearTimeout(this.debounceTimers.get(cacheKey)!);
        }

        this.debounceTimers.set(cacheKey, setTimeout(async () => {
          try {
            const result = await this.executeWithRetry(requestFn, retryAttempts, retryDelay);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        }, debounceTime));
      });
    }

    // تنفيذ الطلب مباشرة
    return this.executeWithRetry(requestFn, retryAttempts, retryDelay);
  }

  /**
   * تنفيذ طلب مع إعادة المحاولة
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    maxAttempts: number,
    delay: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await requestFn();
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }

    throw lastError!;
  }

  /**
   * تنظيف الكاش القديم
   */
  cleanupCache(maxAge: number = 10 * 60 * 1000) {
    const now = Date.now();
    for (const [key, cache] of this.cache.entries()) {
      if ((now - cache.timestamp) > maxAge) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * مسح كاش محدد
   */
  clearCache(cacheKey: string) {
    this.cache.delete(cacheKey);
    this.pendingRequests.delete(cacheKey);
    
    const timer = this.debounceTimers.get(cacheKey);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(cacheKey);
    }
  }

  /**
   * مسح جميع الكاش
   */
  clearAllCache() {
    this.cache.clear();
    this.pendingRequests.clear();
    
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }
}

// إنشاء نسخة عامة
export const requestOptimizer = new RequestOptimizer();

/**
 * Hook لتحسين الطلبات في React
 */
export function useRequestOptimizer() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeRequest = useCallback(async <T>(
    requestFn: () => Promise<T>,
    options: RequestOptions
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestOptimizer.executeRequest(requestFn, options);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearCache = useCallback((cacheKey?: string) => {
    if (cacheKey) {
      requestOptimizer.clearCache(cacheKey);
    } else {
      requestOptimizer.clearAllCache();
    }
  }, []);

  return {
    executeRequest,
    clearCache,
    isLoading,
    error
  };
}

/**
 * Hook لتحسين useEffect مع منع التكرار
 */
export function useOptimizedEffect(
  effect: () => void | (() => void),
  deps: React.DependencyList,
  options: {
    debounceTime?: number;
    skipFirstRun?: boolean;
  } = {}
) {
  const { debounceTime = 100, skipFirstRun = false } = options;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (skipFirstRun && isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      const cleanup = effect();
      return cleanup;
    }, debounceTime);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);
}

/**
 * Hook لتحسين الطلبات المتكررة
 */
export function useDebouncedRequest<T>(
  requestFn: () => Promise<T>,
  deps: React.DependencyList,
  options: {
    debounceTime?: number;
    cacheKey?: string;
    cacheDuration?: number;
  } = {}
) {
  const { debounceTime = 1000, cacheKey, cacheDuration = 5 * 60 * 1000 } = options;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const executeRequest = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await requestOptimizer.executeRequest(requestFn, {
          cacheKey: cacheKey || 'default',
          cacheDuration,
          debounceTime: 0 // لا نريد debounce إضافي هنا
        });
        setData(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    }, debounceTime);
  }, [requestFn, cacheKey, cacheDuration, debounceTime]);

  useEffect(() => {
    executeRequest();

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, deps);

  return { data, isLoading, error, refetch: executeRequest };
} 