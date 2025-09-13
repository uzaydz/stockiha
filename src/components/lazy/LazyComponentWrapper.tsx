import React, { Suspense, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  loadingMessage?: string;
  minLoadTime?: number; // Minimum loading time to prevent flash
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

// Enhanced loading spinner with smooth animation
const DefaultLoadingSpinner = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[200px] w-full">
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/10"></div>
      </div>
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">
          {message}
        </p>
      )}
    </div>
  </div>
);

// Error boundary for lazy components
const DefaultErrorFallback = ({ error, retry }: { error: Error; retry?: () => void }) => (
  <div className="flex items-center justify-center min-h-[200px] w-full">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="text-destructive">
        <svg className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.502 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">خطأ في تحميل المكون</h3>
        <p className="text-sm text-muted-foreground mb-4">حدث خطأ أثناء تحميل هذا المكون. يرجى المحاولة مرة أخرى.</p>
        {retry && (
          <button 
            onClick={retry}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            إعادة المحاولة
          </button>
        )}
      </div>
    </div>
  </div>
);

// Enhanced lazy component wrapper with error boundary and loading states
export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback,
  errorFallback,
  loadingMessage = "جاري التحميل...",
  minLoadTime = 150, // Minimum 150ms to prevent flash
  onLoad,
  onError
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [showContent, setShowContent] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setShowContent(true);
      onLoad?.();
    }, minLoadTime);

    return () => clearTimeout(timer);
  }, [minLoadTime, onLoad, retryKey]);

  const handleError = (error: Error) => {
    setError(error);
    setIsLoading(false);
    onError?.(error);
  };

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    setShowContent(false);
    setRetryKey(prev => prev + 1);
  };

  if (error) {
    return errorFallback || <DefaultErrorFallback error={error} retry={handleRetry} />;
  }

  const loadingComponent = fallback || <DefaultLoadingSpinner message={loadingMessage} />;

  return (
    <div className="w-full">
      {isLoading && loadingComponent}
      {showContent && (
        <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
          <ErrorBoundary onError={handleError} key={retryKey}>
            <Suspense fallback={loadingComponent}>
              {children}
            </Suspense>
          </ErrorBoundary>
        </div>
      )}
    </div>
  );
};

// Simple error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyComponentWrapper Error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return <DefaultErrorFallback error={this.state.error!} />;
    }

    return this.props.children;
  }
}

// Hook for lazy loading with preloading support
export const useLazyLoad = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  preload = false
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = React.useCallback(async () => {
    if (Component || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const module = await importFn();
      setComponent(() => module.default);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [Component, isLoading, importFn]);

  useEffect(() => {
    if (preload) {
      loadComponent();
    }
  }, [preload, loadComponent]);

  return {
    Component,
    isLoading,
    error,
    load: loadComponent
  };
};

// Preload utility for warming up components
export const preloadComponent = <T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>
): Promise<T> => {
  return importFn().then(module => module.default);
};

// Route-based preloader
export const useRoutePreloader = (routes: string[]) => {
  useEffect(() => {
    const preloadRoutes = async () => {
      // Preload route components when user is idle
      const preloadPromises = routes.map(route => {
        // This would be mapped to actual component imports
        // Implementation depends on your routing structure
        return new Promise(resolve => setTimeout(resolve, 100));
      });
      
      await Promise.allSettled(preloadPromises);
    };

    // Use requestIdleCallback if available, otherwise setTimeout
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(preloadRoutes, { timeout: 5000 });
    } else {
      setTimeout(preloadRoutes, 2000);
    }
  }, [routes]);
};

export default LazyComponentWrapper;
