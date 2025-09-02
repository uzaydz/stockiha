import React from 'react';

interface PerformanceConfig {
  enableMemo: boolean;
  enableVirtualization: boolean;
  maxItemsBeforeVirtualization: number;
  enableAnimationThrottling: boolean;
  animationThrottleThreshold: number;
}

interface UsePerformanceOptimizationReturn {
  shouldUseMemo: boolean;
  shouldUseVirtualization: boolean;
  shouldThrottleAnimations: boolean;
  performanceConfig: PerformanceConfig;
}

export const usePerformanceOptimization = (
  itemCount: number,
  hasAnimations: boolean = true
): UsePerformanceOptimizationReturn => {
  const [performanceConfig] = React.useState<PerformanceConfig>({
    enableMemo: true,
    enableVirtualization: itemCount > 50, // افتراضي: تفعيل virtualization عند >50 عنصر
    maxItemsBeforeVirtualization: 50,
    enableAnimationThrottling: hasAnimations,
    animationThrottleThreshold: 20
  });

  const shouldUseMemo = performanceConfig.enableMemo;
  const shouldUseVirtualization = performanceConfig.enableVirtualization && itemCount > performanceConfig.maxItemsBeforeVirtualization;
  const shouldThrottleAnimations = performanceConfig.enableAnimationThrottling &&
    (itemCount > performanceConfig.animationThrottleThreshold ||
     window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  return {
    shouldUseMemo,
    shouldUseVirtualization,
    shouldThrottleAnimations,
    performanceConfig
  };
};

// Hook لتحسين البحث مع fuzzy search
export const useOptimizedSearch = () => {
  const searchCache = React.useRef<Map<string, any[]>>(new Map());

  const optimizedFilter = React.useCallback((items: any[], query: string, searchKeys: string[]) => {
    if (!query.trim()) return items;

    const cacheKey = `${query}-${searchKeys.join(',')}-${items.length}`;

    // التحقق من الكاش
    if (searchCache.current.has(cacheKey)) {
      return searchCache.current.get(cacheKey)!;
    }

    const queryLower = query.toLowerCase();

    // تنفيذ البحث المحسن والفعال
    const filtered = items.filter(item => {
      // البحث في اسم المجموعة
      if (item.group?.toLowerCase().includes(queryLower)) {
        return true;
      }

      // البحث في العناصر
      if (item.items && Array.isArray(item.items)) {
        return item.items.some((navItem: any) =>
          navItem.title?.toLowerCase().includes(queryLower) ||
          navItem.href?.toLowerCase().includes(queryLower)
        );
      }

      return false;
    });

    // حفظ في الكاش (مع حدود للذاكرة)
    if (searchCache.current.size > 100) {
      const firstKey = searchCache.current.keys().next().value;
      searchCache.current.delete(firstKey);
    }
    searchCache.current.set(cacheKey, filtered);

    return filtered;
  }, []);

  const clearCache = React.useCallback(() => {
    searchCache.current.clear();
  }, []);

  return { optimizedFilter, clearCache };
};

// Hook للانيميشن الذكي مع throttling
export const useSmartAnimationWithThrottling = (itemCount: number, baseDelay: number = 0.1) => {
  const { shouldThrottleAnimations } = usePerformanceOptimization(itemCount, true);

  const getAnimationDelay = React.useCallback((index: number) => {
    if (shouldThrottleAnimations) {
      // تقليل التأخير للقوائم الكبيرة
      return Math.min(index * 0.05, 0.5); // حد أقصى 0.5 ثانية
    }
    return index * baseDelay;
  }, [shouldThrottleAnimations, baseDelay]);

  const getShouldAnimate = React.useCallback((index: number) => {
    if (shouldThrottleAnimations && index > 10) {
      // تعطيل الانيميشن للعناصر بعد العاشرة في القوائم الكبيرة
      return false;
    }
    return true;
  }, [shouldThrottleAnimations]);

  return {
    getAnimationDelay,
    getShouldAnimate,
    shouldThrottleAnimations
  };
};
