import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PerformanceOptimizedImage from '@/components/ui/PerformanceOptimizedImage';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';

// =================================================================
// 🚀 PERFORMANCE IMPORTS - Dynamic Loading Only
// =================================================================
import { 
  getStoreDataProgressive, 
  forceReloadStoreData, 
  StoreInitializationData 
} from '@/api/optimizedStoreDataService';
import { StoreComponent, ComponentType } from '@/types/store-editor';

// Lazy imports للمكونات الثقيلة
const LazyStoreBanner = React.lazy(() => import('./StoreBanner'));
const LazyProductCategories = React.lazy(() => import('./ProductCategories'));
const LazyFeaturedProducts = React.lazy(() => import('./FeaturedProducts'));
const LazyCustomerTestimonials = React.lazy(() => import('./CustomerTestimonials'));
const LazyStoreAbout = React.lazy(() => import('./StoreAbout'));
const LazyStoreContact = React.lazy(() => import('./StoreContact'));
const LazyStoreFooter = React.lazy(() => import('./CustomizableStoreFooter'));

// Dynamic imports للخدمات
const StoreTracking = React.lazy(() => import('./StoreTracking'));
const StoreServices = React.lazy(() => import('./StoreServices'));

// =================================================================
// 🎯 OPTIMIZED COMPONENTS
// =================================================================

// High-performance loading component
const OptimizedLoader = React.memo(() => (
  <div className="flex items-center justify-center py-8" role="status" aria-label="جاري التحميل">
    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
    <span className="sr-only">جاري التحميل...</span>
  </div>
));

// Intersection Observer Hook للتحميل المؤجل
const useIntersectionObserver = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const targetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px',
        ...options,
      }
    );

    if (targetRef.current) {
      observer.observe(targetRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return [targetRef, isIntersecting] as const;
};

// Optimized Section Component
const LazySection = React.memo<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
}>(({ 
  children, 
  fallback = <OptimizedLoader />,
  threshold = 0.1,
  rootMargin = "100px"
}) => {
  const [ref, isVisible] = useIntersectionObserver({ threshold, rootMargin });

  return (
    <div ref={ref}>
      {isVisible ? (
        <Suspense fallback={fallback}>
          {children}
        </Suspense>
      ) : (
        fallback
      )}
    </div>
  );
});

// =================================================================
// 🚀 MAIN COMPONENT
// =================================================================

interface FastStorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

const FastStorePage = React.memo<FastStorePageProps>(({ 
  storeData: initialStoreData = {} 
}) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();

  // =================================================================
  // 🎯 OPTIMIZED STATE MANAGEMENT
  // =================================================================
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(
    useMemo(() => 
      initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null,
      [initialStoreData]
    )
  );
  const [dataError, setDataError] = useState<string | null>(null);
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);

  const dataFetchAttempted = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // =================================================================
  // 🎯 MEMOIZED CALCULATIONS
  // =================================================================
  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = storeSettings?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeSettings?.site_name, currentSubdomain]);

  const extendedCategories = useMemo(() => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      return [];
    }
    return storeData.categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: (category.icon as any) || 'folder',
      color: 'from-blue-500 to-indigo-600'
    }));
  }, [storeData?.categories]);

  // =================================================================
  // 🎯 DEFAULT COMPONENTS CONFIGURATION
  // =================================================================
  const defaultStoreComponents = useMemo((): StoreComponent[] => [
    { 
      id: 'banner-default', 
      type: 'hero', 
      settings: { 
        title: storeName, 
        subtitle: storeData?.organization_details?.description || 'أفضل المنتجات بأفضل الأسعار' 
      }, 
      isActive: true, 
      orderIndex: 0 
    },
    { 
      id: 'categories-default', 
      type: 'product_categories', 
      settings: { title: 'تسوق حسب الفئة' }, 
      isActive: true, 
      orderIndex: 1 
    },
    { 
      id: 'featured-default', 
      type: 'featured_products', 
      settings: { title: 'منتجات مميزة' }, 
      isActive: true, 
      orderIndex: 2 
    },
    { 
      id: 'services-default', 
      type: 'services', 
      settings: {}, 
      isActive: true, 
      orderIndex: 3 
    },
    { 
      id: 'testimonials-default', 
      type: 'testimonials', 
      settings: {}, 
      isActive: true, 
      orderIndex: 4 
    },
    { 
      id: 'about-default', 
      type: 'about', 
      settings: { 
        title: `عن ${storeName}`, 
        content: storeData?.organization_details?.description || 'مرحباً بك في متجرنا.' 
      }, 
      isActive: true, 
      orderIndex: 5 
    },
    { 
      id: 'contact-default', 
      type: 'contact', 
      settings: { email: storeData?.organization_details?.contact_email }, 
      isActive: true, 
      orderIndex: 6 
    },
  ], [storeName, storeData?.organization_details]);

  const componentsToRender = useMemo(() => {
    const filteredCustomComponents = customComponents
      .filter(component => {
        const normalizedType = component.type.toLowerCase();
        return normalizedType !== 'seo_settings' && component.isActive;
      })
      .map(component => {
        let normalizedType = component.type.toLowerCase();
        if (normalizedType === 'categories') {
          normalizedType = 'product_categories';
        }
        return {
          ...component,
          type: normalizedType as ComponentType
        };
      })
      .sort((a, b) => a.orderIndex - b.orderIndex);

    return filteredCustomComponents.length > 0 ? filteredCustomComponents : defaultStoreComponents;
  }, [customComponents, defaultStoreComponents]);

  // =================================================================
  // 🎯 OPTIMIZED DATA LOADING
  // =================================================================
  const loadStoreData = useCallback(async () => {
    if (dataFetchAttempted.current || !currentSubdomain) return;
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    dataFetchAttempted.current = true;
    setDataLoading(true);
    setDataError(null);

    try {
             const result = await getStoreDataProgressive(currentSubdomain);

       if (result.data && !result.isLoading) {
        setStoreData(result.data);
        setStoreSettings(result.data.organization_settings || null);
        setCustomComponents(result.data.store_layout_components || []);
        
        // Apply theme if available
        if (result.data.organization_settings && currentOrganization?.id) {
          updateOrganizationTheme(currentOrganization.id, {
            theme_primary_color: result.data.organization_settings.theme_primary_color,
            theme_secondary_color: result.data.organization_settings.theme_secondary_color,
            theme_mode: (result.data.organization_settings as any).theme_mode,
            custom_css: result.data.organization_settings.custom_css
          });
        }
      } else {
                 setDataError('فشل في تحميل بيانات المتجر');
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setDataError(error.message || 'حدث خطأ في تحميل البيانات');
      }
    } finally {
      setDataLoading(false);
    }
  }, [currentSubdomain, currentOrganization?.id]);

  // =================================================================
  // 🎯 EFFECTS
  // =================================================================
  useEffect(() => {
    if (initialStoreData && Object.keys(initialStoreData).length > 0) {
      setStoreData(initialStoreData);
      setStoreSettings(initialStoreData.organization_settings || null);
      setCustomComponents(initialStoreData.store_layout_components || []);
      setDataLoading(false);
      dataFetchAttempted.current = true;
    } else {
      loadStoreData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadStoreData, initialStoreData]);

  const handleReload = useCallback(async () => {
    dataFetchAttempted.current = false;
    if (currentSubdomain) {
      await forceReloadStoreData(currentSubdomain);
      await loadStoreData();
    }
  }, [currentSubdomain, loadStoreData]);

  // =================================================================
  // 🎯 RENDER CONDITIONS
  // =================================================================
  if (dataLoading && (!storeData || Object.keys(storeData).length === 0)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen" role="status" aria-label="جاري تحميل المتجر">
        <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <p className="text-lg text-muted-foreground">جاري تحميل المتجر...</p>
      </div>
    );
  }

  if (dataError && !storeData?.organization_details?.id) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
        <p className="text-muted-foreground mb-4 max-w-md">{dataError}</p>
        <Button 
          onClick={handleReload}
          aria-label="إعادة تحميل صفحة المتجر"
          className="min-w-[120px]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          حاول مرة أخرى
        </Button>
      </div>
    );
  }
  
  if (!dataLoading && !storeData?.organization_details?.id && !dataError) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
        <p className="text-muted-foreground mb-4 max-w-md">
          لم نتمكن من العثور على المتجر المطلوب. يرجى التحقق من الرابط أو المحاولة لاحقًا.
        </p>
        <Link to="/">
          <Button aria-label="العودة إلى الصفحة الرئيسية">
            العودة إلى الصفحة الرئيسية
          </Button>
        </Link>
      </div>
    );
  }

  // =================================================================
  // 🚀 MAIN RENDER
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
            <>
              {storeSettings?.maintenance_mode ? (
                <div className="container py-10 text-center">
                  <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
                  </p>
                </div>
              ) : (
                <>
                  {storeSettings && (
                    <LazySection fallback={<div className="h-0" />}>
                      <StoreTracking />
                    </LazySection>
                  )}
                  
                  {componentsToRender.map((component, index) => {
                    const isFirstComponent = index === 0;
                    const fallbackHeight = isFirstComponent ? "min-h-[60vh]" : "min-h-[40vh]";
                    
                    return (
                      <LazySection 
                        key={component.id || `component-${index}`}
                        fallback={
                          <div className={`${fallbackHeight} animate-pulse bg-gray-100 rounded-lg mx-4 mb-4`} />
                        }
                        threshold={isFirstComponent ? 0 : 0.1}
                        rootMargin={isFirstComponent ? "0px" : "200px"}
                      >
                        {component.type === 'hero' && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                        
                        {component.type === 'product_categories' && (
                          <LazyProductCategories 
                            title={component.settings?.title}
                            description={component.settings?.description}
                            useRealCategories={component.settings?.useRealCategories ?? true}
                            categories={extendedCategories}
                            settings={component.settings}
                          />
                        )}
                        
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                          <LazyFeaturedProducts 
                            {...(component.settings as any)} 
                            organizationId={storeData.organization_details?.id} 
                          />
                        )}
                        
                        {component.type === 'testimonials' && (
                          <LazyCustomerTestimonials 
                            {...(component.settings as any)} 
                            organizationId={storeData?.organization_details?.id}
                          />
                        )}
                        
                        {component.type === 'about' && (
                          <LazyStoreAbout 
                            {...(component.settings as any)} 
                            storeName={storeName} 
                          />
                        )}
                        
                        {component.type === 'contact' && (
                          <LazyStoreContact 
                            {...(component.settings as any)} 
                            email={storeData.organization_details?.contact_email} 
                          />
                        )}
                        
                        {component.type === 'services' && (
                          <StoreServices {...(component.settings as any)} />
                        )}
                      </LazySection>
                    );
                  })}
                </>
              )}
            </>
          )}
        </main>
        
        {/* Footer مع تحسينات */}
        <LazySection fallback={<div className="h-64 bg-gray-100 animate-pulse" />}>
                     <LazyStoreFooter />
        </LazySection>
      </div>
      
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
});

FastStorePage.displayName = 'FastStorePage';

export default FastStorePage; 