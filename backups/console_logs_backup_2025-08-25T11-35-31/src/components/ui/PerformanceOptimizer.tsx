import React, { useCallback, useMemo, useRef, memo } from 'react';

// مكون للتحميل الكسول عند التمرير (مبسط)
export const LazyLoadOnScroll = memo(({
  children,
  rootMargin = '100px'
}: {
  children: React.ReactNode;
  rootMargin?: string;
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin]);

  if (!isVisible) {
    return <div ref={ref} className="min-h-[200px] bg-muted/20 rounded-lg" />;
  }

  return <div ref={ref}>{children}</div>;
});

// مكون لتحسين الصور مع lazy loading
export const OptimizedImage = memo(({
  src,
  alt,
  className = '',
  width,
  height,
  priority = false,
  placeholder = 'blur'
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  placeholder?: 'blur' | 'empty';
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
  }, []);

  if (error) {
    return (
      <div
        className={`${className} bg-muted flex items-center justify-center`}
        style={{ width, height }}
      >
        <span className="text-muted-foreground text-sm">خطأ في تحميل الصورة</span>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      {!isLoaded && (
        <div
          className={`${className} bg-muted animate-pulse`}
          style={{ width, height }}
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
});

// Hook للتحكم في التكرار
export const useDebouncedCallback = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);
};

// Hook للتحكم في التكرار السريع
export const useThrottledCallback = (callback: Function, delay: number) => {
  const lastExecRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout>();

  return useCallback((...args: any[]) => {
    const now = Date.now();

    if (now - lastExecRef.current >= delay) {
      callback(...args);
      lastExecRef.current = now;
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
        lastExecRef.current = Date.now();
      }, delay - (now - lastExecRef.current));
    }
  }, [callback, delay]);
};

// مكون لتحسين الـ lists الكبيرة
export const VirtualizedList = memo(({
  items,
  itemHeight = 50,
  containerHeight = 400,
  renderItem,
  className = ''
}: {
  items: any[];
  itemHeight?: number;
  containerHeight?: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  className?: string;
}) => {
  const [scrollTop, setScrollTop] = React.useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const startIndex = Math.floor(scrollTop / itemHeight);
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const endIndex = Math.min(startIndex + visibleItems + 1, items.length);

  const visibleItemsArray = useMemo(() => {
    return items.slice(startIndex, endIndex).map((item, index) =>
      renderItem(item, startIndex + index)
    );
  }, [items, startIndex, endIndex, renderItem]);

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: items.length * itemHeight, position: 'relative' }}>
        <div
          style={{
            position: 'absolute',
            top: startIndex * itemHeight,
            width: '100%'
          }}
        >
          {visibleItemsArray}
        </div>
      </div>
    </div>
  );
});

// Hook لمراقبة الأداء
export const usePerformanceMonitor = () => {
  const metricsRef = useRef<{
    renderCount: number;
    lastRenderTime: number;
    totalRenderTime: number;
  }>({
    renderCount: 0,
    lastRenderTime: 0,
    totalRenderTime: 0
  });

  const measureRender = useCallback(() => {
    const startTime = performance.now();
    metricsRef.current.renderCount++;

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      metricsRef.current.lastRenderTime = renderTime;
      metricsRef.current.totalRenderTime += renderTime;
    };
  }, []);

  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      averageRenderTime: metricsRef.current.totalRenderTime / metricsRef.current.renderCount
    };
  }, []);

  return { measureRender, getMetrics };
};
