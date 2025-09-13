import React, { Suspense, lazy, memo } from 'react';

// Lightweight loading component
const QuickLoader = memo(() => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
));

// Error boundary for lazy components
class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ComponentType },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ComponentType }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('LazyComponent error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const Fallback = this.props.fallback || (() => <div>حدث خطأ في التحميل</div>);
      return <Fallback />;
    }

    return this.props.children;
  }
}

// Higher-order component for lazy loading with optimizations
export function createLazyComponent<T = any>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  options: {
    loader?: React.ComponentType;
    errorFallback?: React.ComponentType;
    preload?: boolean;
  } = {}
) {
  const LazyComponent = lazy(importFn);
  
  // Optional preloading
  if (options.preload && typeof window !== 'undefined') {
    // Preload after idle time
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(() => importFn().catch(() => {}));
    } else {
      setTimeout(() => importFn().catch(() => {}), 1000);
    }
  }

  return memo((props: T) => (
    <LazyErrorBoundary fallback={options.errorFallback}>
      <Suspense fallback={options.loader ? <options.loader /> : <QuickLoader />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyErrorBoundary>
  ));
}

// Example usage - commented out to avoid import errors
// export const LazyFeatures = {
//   // Charts (large bundle)
//   Analytics: createLazyComponent(
//     () => import('../../pages/dashboard/Analytics'),
//     { preload: false }
//   ),
//   
//   // Store Editor (very large)
//   StoreEditor: createLazyComponent(
//     () => import('../../pages/admin/StoreEditor'),
//     { preload: false }
//   ),
//   
//   // PDF generation
//   QuickBarcodePrint: createLazyComponent(
//     () => import('../../pages/dashboard/QuickBarcodePrintPage'),
//     { preload: false }
//   ),
//   
//   // Heavy forms
//   ProductForm: createLazyComponent(
//     () => import('../../pages/ProductForm'),
//     { preload: false }
//   ),
//   
//   // POS (can be large)
//   POSAdvanced: createLazyComponent(
//     () => import('../../pages/POSAdvanced'),
//     { preload: false }
//   ),
//   
//   // Landing page builder
//   LandingPageBuilder: createLazyComponent(
//     () => import('../../pages/LandingPageBuilder'),
//     { preload: false }
//   )
// };

export default createLazyComponent;
