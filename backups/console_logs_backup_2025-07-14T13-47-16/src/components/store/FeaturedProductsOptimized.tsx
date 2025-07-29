import React, { memo, Suspense, lazy } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { Loader2 } from 'lucide-react';
import { Product } from '@/api/store';
import { useTranslation } from 'react-i18next';

// Lazy loading للمكونات غير الأساسية
const FeaturedProducts = lazy(() => import('./FeaturedProducts'));

interface FeaturedProductsOptimizedProps {
  title?: string;
  description?: string;
  products?: Product[];
  selectionMethod?: 'automatic' | 'manual';
  selectionCriteria?: 'featured' | 'best_selling' | 'newest' | 'discounted';
  selectedProducts?: string[];
  displayCount?: number;
  displayType?: 'grid' | 'list';
  organizationId?: string;
  priority?: boolean;
}

// مكون التحميل المحسن
const FeaturedProductsLoader = memo(() => {
  const { t } = useTranslation();
  
  return (
    <div className="py-16 md:py-20 lg:py-24 relative overflow-hidden bg-background">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-6">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
          <h3 className="text-lg font-medium mb-2">{t('featuredProducts.loading')}</h3>
          <p className="text-muted-foreground">{t('featuredProducts.loadingMessage')}</p>
        </div>
      </div>
    </div>
  );
});

FeaturedProductsLoader.displayName = 'FeaturedProductsLoader';

// مكون معالجة الأخطاء
const ErrorFallback = memo(({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) => {
  const { t } = useTranslation();
  
  return (
    <div className="py-16 md:py-20 lg:py-24 relative overflow-hidden bg-background">
      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center py-20 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/20 dark:to-red-900/20 rounded-3xl border-2 border-dashed border-red-200 dark:border-red-800">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full mb-6">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="text-2xl font-bold mb-3 text-red-800 dark:text-red-200">
            {t('featuredProducts.error')}
          </h3>
          <p className="text-red-600 dark:text-red-300 text-lg max-w-md mx-auto mb-6">
            {error.message || t('featuredProducts.errorMessage')}
          </p>
          <button
            onClick={resetErrorBoundary}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            {t('featuredProducts.retry')}
          </button>
        </div>
      </div>
    </div>
  );
});

ErrorFallback.displayName = 'ErrorFallback';

// المكون الرئيسي المحسن
const FeaturedProductsOptimized = memo(({
  priority = false,
  ...props
}: FeaturedProductsOptimizedProps) => {
  // إذا كان المكون له أولوية، حمّله فوراً
  if (priority) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <FeaturedProducts {...props} />
      </ErrorBoundary>
    );
  }

  // وإلا استخدم Lazy loading
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<FeaturedProductsLoader />}>
        <FeaturedProducts {...props} />
      </Suspense>
    </ErrorBoundary>
  );
});

FeaturedProductsOptimized.displayName = 'FeaturedProductsOptimized';

export default FeaturedProductsOptimized; 