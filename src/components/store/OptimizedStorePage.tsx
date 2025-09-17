import React, { useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';

// Import our new components
import {
  StoreErrorBoundary,
  StoreLoader,
  StoreNotFound,
  StoreLazySection
} from './common';
import { StoreComponentsRenderer } from './StoreComponentsRenderer';
import { LazyStoreFooter } from './LazyStoreComponents';

// Import our custom hook
import { useStoreData } from '@/hooks';

// Import existing components
import Navbar from '@/components/Navbar';
import { StoreInitializationData } from '@/api/optimizedStoreDataService';

interface OptimizedStorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

// =================================================================
// 🚀 المكون الرئيسي المحسن - مبسط ومنظم
// =================================================================
const OptimizedStorePage = React.memo(({
  storeData: initialStoreData = {}
}: OptimizedStorePageProps) => {
  const { t } = useTranslation();

  // Use our custom hook to manage all store data
  const {
    storeSettings,
    dataLoading,
    storeData,
    dataError,
    footerSettings,
    storeName,
    extendedCategories,
    componentsToRender,
    handleReload
  } = useStoreData({ initialStoreData });

  // =================================================================
  // Page Title Effect
  // =================================================================
  useEffect(() => {
    if (storeName) document.title = `${storeName}`;
  }, [storeName]);

  // =================================================================
  // Render Conditions
  // =================================================================

  // Show loader when data is loading and no store data exists
  if (dataLoading && (!storeData || Object.keys(storeData).length === 0)) {
    return <StoreLoader dataLoading={dataLoading} storeData={storeData} />;
  }

  // Show error boundary if there's an error and no store data
  if (dataError && !storeData?.organization_details?.id) {
    return <StoreErrorBoundary error={dataError} onRetry={handleReload} />;
  }

  // Show not found page if no store data and no error
  // 🔥 إصلاح: التحقق من وجود أي بيانات وليس فقط organization_details.id
  if (!dataLoading && !storeData?.organization_details?.id &&
      !storeData?.categories?.length && !storeData?.store_layout_components?.length && !dataError) {
    return <StoreNotFound />;
  }

  // =================================================================
  // Main Render
  // =================================================================

  return (
    <>
      <Helmet>
        <title>{storeSettings?.seo_store_title || storeName}</title>
        {storeSettings?.seo_meta_description && (
          <meta name="description" content={storeSettings.seo_meta_description} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </Helmet>

      {storeSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: storeSettings.custom_css }} />
      )}

      <div className="flex flex-col min-h-screen bg-background relative">
        <Navbar
          categories={storeData?.categories?.map(cat => ({
            ...cat,
            product_count: cat.product_count || 0
          }))}
        />

        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 right-4 z-[100] bg-primary/10 hover:bg-primary/20 print:hidden transition-all duration-200"
          onClick={handleReload}
          aria-label="إعادة تحميل صفحة المتجر"
          disabled={dataLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          إعادة تحميل
        </Button>

        <main className="flex-1 pt-16">
          {storeData?.organization_details && (
            <StoreComponentsRenderer
              componentsToRender={componentsToRender}
              storeData={storeData}
              extendedCategories={extendedCategories}
              storeName={storeName}
              storeSettings={storeSettings}
            />
          )}
        </main>

        <StoreLazySection
          fallback={<div className="h-64 bg-gray-100" />}
          threshold={0.1}
          rootMargin="100px"
        >
          {React.useMemo(() => {
            // Default footer settings using shared function
            const defaultFooterSettings = getDefaultFooterSettings(storeName, storeData, t);

            // Merge custom settings with defaults
            const finalFooterSettings = mergeFooterSettings(defaultFooterSettings, footerSettings);

            return <LazyStoreFooter {...finalFooterSettings} />;
          }, [footerSettings, storeName, storeData, t])}
        </StoreLazySection>
      </div>

      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
});

OptimizedStorePage.displayName = 'OptimizedStorePage';

export default OptimizedStorePage;
