import React, { memo, useCallback, useMemo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => (
  <Alert variant="destructive" className="my-4">
    <AlertTriangle className="h-4 w-4" />
    <AlertTitle>حدث خطأ في تحميل الطلبات</AlertTitle>
    <AlertDescription className="mt-2">
      <p className="mb-2">{error.message}</p>
      <Button onClick={resetErrorBoundary} size="sm">
        إعادة المحاولة
      </Button>
    </AlertDescription>
  </Alert>
);

// Higher-order component for error boundary
export const withErrorBoundary = <P extends object>(Component: React.ComponentType<P>) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
      }}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

// Intersection observer hook for infinite scroll
export const useIntersectionObserver = (
  callback: () => void,
  options: IntersectionObserverInit = {}
) => {
  const targetRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          callback();
        }
      },
      { threshold: 0.1, ...options }
    );

    observer.observe(target);

    return () => {
      observer.unobserve(target);
    };
  }, [callback, options]);

  return targetRef;
};

// Loading spinner with fade animation
export const LoadingSpinner = memo(({ size = 'default' }: { size?: 'sm' | 'default' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    default: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className="flex items-center justify-center p-4">
      <Loader2 className={`${sizeClasses[size]} animate-spin text-primary`} />
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Optimized list renderer with virtualization hints
export const OptimizedList = memo(({ 
  items, 
  renderItem, 
  getItemKey 
}: { 
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  getItemKey: (item: any, index: number) => string | number;
}) => {
  const memoizedItems = useMemo(() => items, [items]);

  return (
    <div className="space-y-2">
      {memoizedItems.map((item, index) => (
        <div key={getItemKey(item, index)}>
          {renderItem(item, index)}
        </div>
      ))}
    </div>
  );
});

OptimizedList.displayName = 'OptimizedList';

// Performance monitoring hook
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = React.useRef<number>(performance.now());

  React.useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    
    if (renderTime > 100) { // Log slow renders (>100ms)
    }
  });

  const measureOperation = useCallback((operationName: string, operation: () => void) => {
    const start = performance.now();
    operation();
    const end = performance.now();
  }, [componentName]);

  return { measureOperation };
};

// Debounced search hook
export const useDebouncedValue = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Memory management hook
export const useMemoryOptimization = () => {
  const cleanup = useCallback(() => {
    // Force garbage collection in development
    if (process.env.NODE_ENV === 'development' && window.gc) {
      window.gc();
    }
  }, []);

  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return { cleanup };
};

// Component performance wrapper
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) => {
  const WrappedComponent = memo((props: P) => {
    const { measureOperation } = usePerformanceMonitor(componentName);
    const { cleanup } = useMemoryOptimization();

    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  return WrappedComponent;
};
