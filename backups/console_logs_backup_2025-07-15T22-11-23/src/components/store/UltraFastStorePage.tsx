import React, { useEffect, useMemo, Suspense, useState, useCallback } from 'react';
import { useStore } from '@/context/StoreContext';
import { useAuth } from '@/context/AuthContext';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { cn } from '@/lib/utils';

// استيراد المكونات المحسنة من ImprovedStoreEditor
// import { useImprovedStoreEditor } from '@/components/store-editor/improved/hooks/useImprovedStoreEditor';
// import { optimizedStoreService } from '@/services/OptimizedStoreService';

// =================================================================
// 🚀 ULTRA FAST STORE PAGE - صفحة المتجر فائقة السرعة المحسنة
// =================================================================

// تحميل المكونات الأساسية فقط
const Navbar = React.lazy(() => import('@/components/Navbar'));

// مكونات المتجر المحسنة - تحميل تدريجي
const LazyStoreBanner = React.lazy(() => import('./StoreBanner'));
const LazyProductCategories = React.lazy(() => import('./ProductCategoriesOptimized'));
const LazyFeaturedProducts = React.lazy(() => import('./FeaturedProducts'));
const LazyStoreFooter = React.lazy(() => import('./CustomizableStoreFooter'));

// مكونات اختيارية - تحميل عند الحاجة فقط
const LazyCustomerTestimonials = React.lazy(() => 
  import('./CustomerTestimonials').catch(() => ({ default: () => null }))
);
const LazyStoreAbout = React.lazy(() => 
  import('./StoreAbout').catch(() => ({ default: () => null }))
);
const LazyStoreContact = React.lazy(() => 
  import('./StoreContact').catch(() => ({ default: () => null }))
);
const LazyStoreServices = React.lazy(() => 
  import('./StoreServices').catch(() => ({ default: () => null }))
);

// لا نحتاج لاستيراد المحرر في صفحة المتجر
// المحرر منفصل عن المتجر

// =================================================================
// 🎯 مكون Skeleton محسن
// =================================================================
const ComponentSkeleton: React.FC<{ height?: string }> = ({ height = "min-h-[30vh]" }) => (
  <div className={`animate-pulse bg-gray-100 dark:bg-gray-800 rounded-lg ${height} mb-4`}>
    <div className="p-6 space-y-4">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
    </div>
  </div>
);

// =================================================================
// 🎯 Intersection Observer محسن للتحميل التدريجي
// =================================================================
const useProgressiveLoading = (itemCount: number) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: Math.min(2, itemCount - 1) });
  const [loadedComponents, setLoadedComponents] = useState(new Set([0, 1]));
  
  const observerRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = parseInt(entry.target.getAttribute('data-index') || '0');
            setLoadedComponents(prev => new Set([...prev, index]));
            setVisibleRange(prev => ({
              start: Math.min(prev.start, Math.max(0, index - 1)),
              end: Math.max(prev.end, Math.min(itemCount - 1, index + 1))
            }));
          }
        });
      },
      { 
        threshold: 0.1, 
        rootMargin: '300px 0px' // تحميل مسبق أكبر
      }
    );
    
    observer.observe(node);
    return () => observer.disconnect();
  }, [itemCount]);

  return { visibleRange, loadedComponents, observerRef };
};

// =================================================================
// 🎯 مكون عرض الأخطاء المحسن
// =================================================================
const StoreErrorFallback: React.FC<{ error?: string; resetError?: () => void }> = ({ 
  error, 
  resetError 
}) => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
    <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
    <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ في تحميل المتجر</h1>
    <p className="text-muted-foreground mb-6 max-w-md">
      {error || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
    </p>
    {resetError && (
      <Button onClick={resetError} className="min-w-[120px]">
        <RefreshCw className="w-4 h-4 mr-2" />
        حاول مرة أخرى
      </Button>
    )}
  </div>
);

// =================================================================
// 🎯 مكون عرض المكونات المحسن مع دعم المحرر المحسن
// =================================================================
const OptimizedComponentRenderer: React.FC<{
  component: any;
  organizationData: any;
  categories: any[];
  featuredProducts: any[];
  index: number;
  isLoaded: boolean;
  observerRef?: (node: HTMLDivElement | null) => void;
}> = ({ component, organizationData, categories, featuredProducts, index, isLoaded, observerRef }) => {
  
  // معالج ref آمن
  const handleRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef && typeof observerRef === 'function') {
      observerRef(node);
    }
  }, [observerRef]);
  
  // إذا لم يكن المكون محملاً، عرض skeleton
  if (!isLoaded) {
    return (
      <div 
        ref={handleRef}
        data-index={index}
        className="component-container"
      >
        <ComponentSkeleton />
      </div>
    );
  }

  return (
    <div 
      ref={handleRef}
      data-index={index}
      className="component-container"
      data-component-type={component.type}
    >
      <Suspense fallback={<ComponentSkeleton />}>
        {component.type === 'hero' && (
          <LazyStoreBanner heroData={component.settings} />
        )}
        
        {component.type === 'product_categories' && (
          <LazyProductCategories 
            title={component.settings?.title || 'تسوق حسب الفئة'}
            description={component.settings?.description}
            useRealCategories={component.settings?.useRealCategories ?? true}
            categories={categories}
            settings={component.settings}
          />
        )}
        
        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
          <LazyFeaturedProducts 
            {...(component.settings || {})} 
            organizationId={organizationData?.id}
            products={featuredProducts}
          />
        )}
        
        {component.type === 'testimonials' && isLoaded && (
          <LazyCustomerTestimonials 
            {...(component.settings || {})} 
            organizationId={organizationData?.id}
          />
        )}
        
        {component.type === 'about' && isLoaded && (
          <LazyStoreAbout 
            {...(component.settings || {})} 
            storeName={organizationData?.name || 'المتجر الإلكتروني'}
          />
        )}
        
        {component.type === 'contact' && isLoaded && (
          <LazyStoreContact 
            {...(component.settings || {})} 
            organizationData={organizationData}
          />
        )}
        
        {component.type === 'services' && isLoaded && (
          <LazyStoreServices 
            {...(component.settings || {})} 
          />
        )}
      </Suspense>
    </div>
  );
};

// =================================================================
// 🚀 MAIN COMPONENT - UltraFastStorePage المحسن
// =================================================================
const UltraFastStorePage: React.FC = () => {
  const { currentSubdomain } = useAuth();
  const { state, loadStoreData, getCacheStats } = useStore();
  const { loadedComponents, observerRef } = useProgressiveLoading(state.components.length);
  
  // =================================================================
  // 🎯 تحميل البيانات مرة واحدة فقط - محسن
  // =================================================================
  useEffect(() => {
    if (currentSubdomain && !state.organizationData && !state.isLoading) {
      loadStoreData(currentSubdomain);
    }
  }, [currentSubdomain, loadStoreData, state.organizationData, state.isLoading]);

  // =================================================================
  // 🎯 تطبيق الثيم عند تحميل البيانات
  // =================================================================
  useEffect(() => {
    if (state.storeSettings && state.organizationData?.id) {
      updateOrganizationTheme(state.organizationData.id, {
        theme_primary_color: state.storeSettings.theme_primary_color,
        theme_secondary_color: state.storeSettings.theme_secondary_color,
        theme_mode: state.storeSettings.theme_mode,
        custom_css: state.storeSettings.custom_css
      });
    }
  }, [state.storeSettings, state.organizationData?.id]);

  // =================================================================
  // 🎯 المكونات للعرض (دائماً من قاعدة البيانات)
  // =================================================================
  const componentsToRender = useMemo(() => {
    return state.components || [];
  }, [state.components]);

  // =================================================================
  // 🎯 المكونات الأساسية فقط (تحميل سريع)
  // =================================================================
  const essentialComponents = useMemo(() => {
    if (!componentsToRender.length) return [];
    
    // تحميل المكونات الأساسية فقط في البداية
    return componentsToRender.filter(component => 
      ['hero', 'product_categories', 'featured_products', 'featuredproducts'].includes(component.type)
    ).slice(0, 3); // أول 3 مكونات أساسية فقط
  }, [componentsToRender]);

  // =================================================================
  // 🎯 المكونات الإضافية (تحميل تدريجي)
  // =================================================================
  const additionalComponents = useMemo(() => {
    if (!componentsToRender.length) return [];
    
    return componentsToRender.filter(component => 
      !['hero', 'product_categories', 'featured_products', 'featuredproducts'].includes(component.type)
    );
  }, [componentsToRender]);

  // =================================================================
  // 🎯 معلومات SEO محسنة
  // =================================================================
  const seoData = useMemo(() => {
    const storeName = state.organizationData?.name || currentSubdomain || 'المتجر الإلكتروني';
    const storeDescription = state.organizationData?.description || 
                           state.storeSettings?.seo_meta_description || 
                           `تسوق من ${storeName} - أفضل المنتجات بأفضل الأسعار`;
    
    return {
      title: state.storeSettings?.seo_store_title || `${storeName} - متجر إلكتروني`,
      description: storeDescription,
      favicon: state.storeSettings?.favicon_url,
      customCSS: state.storeSettings?.custom_css,
      customJS: state.storeSettings?.custom_js_header,
    };
  }, [state.organizationData, state.storeSettings, currentSubdomain]);

  // =================================================================
  // 🎯 معالج إعادة التحميل
  // =================================================================
  const handleReload = useCallback(async () => {
    if (currentSubdomain) {
      await loadStoreData(currentSubdomain, true); // force reload
      getCacheStats(); // تحديث إحصائيات الكاش
    }
  }, [currentSubdomain, loadStoreData, getCacheStats]);

  // =================================================================
  // 🎯 حالات التحميل والأخطاء
  // =================================================================
  if (state.isLoading && !state.organizationData) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <div className="h-16 bg-gray-100 animate-pulse mb-4" />
        <div className="flex-1 space-y-4 p-4">
          <ComponentSkeleton height="min-h-[60vh]" />
          <ComponentSkeleton height="min-h-[40vh]" />
        </div>
      </div>
    );
  }

  if (state.error && !state.organizationData) {
    return <StoreErrorFallback error={state.error} resetError={handleReload} />;
  }

  if (!state.organizationData) {
    return (
      <StoreErrorFallback 
        error="لم يتم العثور على المتجر المطلوب" 
        resetError={handleReload} 
      />
    );
  }

  // =================================================================
  // 🚀 MAIN RENDER - محسن للأداء مع دعم المكونات المحسنة
  // =================================================================
  return (
    <div>
      <Helmet>
        <title>{seoData.title}</title>
        <meta name="description" content={seoData.description} />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {seoData.favicon && <link rel="icon" href={seoData.favicon} />}
        {seoData.customJS && <script dangerouslySetInnerHTML={{ __html: seoData.customJS }} />}
      </Helmet>
      
      {seoData.customCSS && (
        <style dangerouslySetInnerHTML={{ __html: seoData.customCSS }} />
      )}
      
      <div className="flex flex-col min-h-screen bg-background relative">
        {/* Navbar محسن */}
        <Suspense fallback={<div className="h-16 bg-gray-100 animate-pulse" />}>
          <Navbar 
            categories={state.categories?.slice(0, 8)?.map(cat => ({
              ...cat,
              product_count: cat.product_count || 0
            }))} 
          />
        </Suspense>
        
        <main className="flex-1 pt-16">
          {/* وضع الصيانة */}
          {state.storeSettings?.maintenance_mode ? (
            <div className="container py-20 text-center">
              <h1 className="text-4xl font-bold mb-6">المتجر تحت الصيانة</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {state.storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
              </p>
            </div>
          ) : (
            <>
              {/* رسالة عندما لا توجد مكونات */}
              {componentsToRender.length === 0 && !state.isLoading && (
                <div className="container py-20 text-center">
                  <h2 className="text-2xl font-bold mb-4">هذا المتجر فارغ حالياً</h2>
                  <p className="text-muted-foreground mb-6">
                    صاحب المتجر لم يقم بإضافة أي محتوى بعد.
                  </p>
                </div>
              )}

              {/* المكونات الأساسية - تحميل فوري */}
              {essentialComponents.map((component, index) => (
                <OptimizedComponentRenderer
                  key={component.id || `essential-${index}`}
                  component={component}
                  organizationData={state.organizationData}
                  categories={state.categories}
                  featuredProducts={state.featuredProducts}
                  index={index}
                  isLoaded={true}
                  observerRef={observerRef}
                />
              ))}
              
              {/* المكونات الإضافية - تحميل تدريجي */}
              {additionalComponents.map((component, index) => {
                const actualIndex = essentialComponents.length + index;
                return (
                  <OptimizedComponentRenderer
                    key={component.id || `additional-${index}`}
                    component={component}
                    organizationData={state.organizationData}
                    categories={state.categories}
                    featuredProducts={state.featuredProducts}
                    index={actualIndex}
                    isLoaded={loadedComponents.has(actualIndex)}
                    observerRef={observerRef}
                  />
                );
              })}
              
              {/* Footer - تحميل مؤجل */}
              <Suspense fallback={<ComponentSkeleton height="min-h-[20vh]" />}>
                <LazyStoreFooter 
                  storeName={state.organizationData?.name}
                  logoUrl={state.storeSettings?.logo_url}
                  description={state.organizationData?.description}
                  copyrightText={state.storeSettings?.footer_copyright}
                />
              </Suspense>
            </>
          )}
        </main>
      </div>
    </div>
  );
};

UltraFastStorePage.displayName = 'UltraFastStorePage';

export default React.memo(UltraFastStorePage);
