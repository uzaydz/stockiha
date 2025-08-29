import React, { Suspense, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoadingWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  message?: string;
}

interface LazyComponentWrapperProps {
  Component: ComponentType<any>;
  componentProps?: Record<string, any>;
  loadingMessage?: string;
}

// مكون محمل كسول محسن للمكونات الثقيلة
export const LazyComponent = React.memo(({
  Component,
  componentProps = {},
  loadingMessage = "جاري تحميل المكون..."
}: LazyComponentWrapperProps) => {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] bg-background/50 rounded-lg border">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            </div>
            <p className="text-sm text-muted-foreground">{loadingMessage}</p>
          </div>
        </div>
      }
    >
      <Component {...componentProps} />
    </Suspense>
  );
});

// Wrapper محسن للمكونات الثقيلة مع lazy loading
const LazyLoadingWrapper = React.memo(({
  children,
  fallback,
  message = "جاري تحميل المكون..."
}: LazyLoadingWrapperProps) => {
  if (fallback) {
    return (
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[200px] bg-background/50 rounded-lg border">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
            </div>
            <p className="text-sm text-muted-foreground">{message}</p>
          </div>
        </div>
      }
    >
      {children}
    </Suspense>
  );
});

export default LazyLoadingWrapper;
export { LazyLoadingWrapper };
