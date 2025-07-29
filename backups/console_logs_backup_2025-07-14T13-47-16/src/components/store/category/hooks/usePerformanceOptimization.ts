import { useEffect, useCallback, useRef, useMemo } from 'react';
import type { PerformanceSettings } from '../types';

/**
 * Hook لتحسينات الأداء المتقدمة
 * يتضمن throttling, debouncing, وإدارة الذاكرة
 */
export const usePerformanceOptimization = (settings: PerformanceSettings = {}) => {
  const {
    enableImagePreloading = true,
    maxConcurrentImages = 5,
    cacheSize = 100,
    enableIntersectionObserver = true,
    throttleDelay = 100,
    debounceDelay = 300
  } = settings;

  const throttleTimers = useRef(new Map<string, NodeJS.Timeout>());
  const debounceTimers = useRef(new Map<string, NodeJS.Timeout>());
  const imageLoadQueue = useRef<string[]>([]);
  const currentlyLoading = useRef(new Set<string>());

  // تنظيف المؤقتات عند إلغاء المكون
  useEffect(() => {
    return () => {
      throttleTimers.current.forEach(timer => clearTimeout(timer));
      debounceTimers.current.forEach(timer => clearTimeout(timer));
      throttleTimers.current.clear();
      debounceTimers.current.clear();
    };
  }, []);

  // دالة throttling محسّنة
  const throttle = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    delay: number = throttleDelay
  ): T => {
    return ((...args: Parameters<T>) => {
      if (throttleTimers.current.has(key)) return;

      func(...args);
      
      const timer = setTimeout(() => {
        throttleTimers.current.delete(key);
      }, delay);
      
      throttleTimers.current.set(key, timer);
    }) as T;
  }, [throttleDelay]);

  // دالة debouncing محسّنة
  const debounce = useCallback(<T extends (...args: any[]) => any>(
    func: T,
    key: string,
    delay: number = debounceDelay
  ): T => {
    return ((...args: Parameters<T>) => {
      const existingTimer = debounceTimers.current.get(key);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const timer = setTimeout(() => {
        func(...args);
        debounceTimers.current.delete(key);
      }, delay);
      
      debounceTimers.current.set(key, timer);
    }) as T;
  }, [debounceDelay]);

  // إدارة طابور تحميل الصور
  const addToImageQueue = useCallback((imageUrl: string) => {
    if (!enableImagePreloading) return;
    
    if (!imageLoadQueue.current.includes(imageUrl) && 
        !currentlyLoading.current.has(imageUrl)) {
      imageLoadQueue.current.push(imageUrl);
      processImageQueue();
    }
  }, [enableImagePreloading]);

  // معالجة طابور الصور
  const processImageQueue = useCallback(() => {
    if (currentlyLoading.current.size >= maxConcurrentImages || 
        imageLoadQueue.current.length === 0) return;

    const imageUrl = imageLoadQueue.current.shift();
    if (!imageUrl) return;

    currentlyLoading.current.add(imageUrl);

    const img = new Image();
    img.onload = img.onerror = () => {
      currentlyLoading.current.delete(imageUrl);
      // معالجة العنصر التالي
      setTimeout(processImageQueue, 10);
    };
    img.src = imageUrl;
  }, [maxConcurrentImages]);

  // مراقب التقاطع المحسّن
  const createIntersectionObserver = useCallback((
    callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {}
  ) => {
    if (!enableIntersectionObserver || typeof IntersectionObserver === 'undefined') {
      // fallback للمتصفحات التي لا تدعم IntersectionObserver
      return {
        observe: () => {},
        unobserve: () => {},
        disconnect: () => {}
      };
    }

    const defaultOptions: IntersectionObserverInit = {
      threshold: 0.1,
      rootMargin: '50px',
      ...options
    };

    return new IntersectionObserver(callback, defaultOptions);
  }, [enableIntersectionObserver]);

  // تحسين استهلاك الذاكرة
  const memoryOptimization = useMemo(() => ({
    // تنظيف الكاش عند الحاجة
    cleanupCache: (cache: Map<string, any>) => {
      if (cache.size > cacheSize) {
        const entries = Array.from(cache.entries());
        const toDelete = entries.slice(0, Math.floor(cache.size * 0.3));
        toDelete.forEach(([key]) => cache.delete(key));
      }
    },

    // مراقبة استهلاك الذاكرة
    monitorMemory: () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedMB = memInfo.usedJSHeapSize / 1048576;
        const limitMB = memInfo.jsHeapSizeLimit / 1048576;
        
        return {
          used: Math.round(usedMB),
          limit: Math.round(limitMB),
          percentage: Math.round((usedMB / limitMB) * 100)
        };
      }
      return null;
    }
  }), [cacheSize]);

  // دالة لقياس الأداء
  const measurePerformance = useCallback((name: string, fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    // تعطيل رسائل الأداء المتكررة لتقليل الضوضاء
    // if (process.env.NODE_ENV === 'development') {
    //   console.log(`Performance [${name}]: ${(end - start).toFixed(2)}ms`);
    // }
    
    return end - start;
  }, []);

  // تحسين الرسم (requestAnimationFrame)
  const optimizeRender = useCallback((callback: () => void) => {
    return requestAnimationFrame(callback);
  }, []);

  return {
    throttle,
    debounce,
    addToImageQueue,
    createIntersectionObserver,
    memoryOptimization,
    measurePerformance,
    optimizeRender,
    
    // معلومات الحالة
    stats: {
      queueLength: imageLoadQueue.current.length,
      currentlyLoading: currentlyLoading.current.size,
      maxConcurrent: maxConcurrentImages
    }
  };
}; 