import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  getStoreDataProgressive, 
  forceReloadStoreData, 
  StoreInitializationData, 
} from '@/api/optimizedStoreDataService';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import React from 'react';

// =================================================================
// 🚀 Lazy Components - تحميل مؤجل محسن
// =================================================================
const LazyStoreBannerComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyStoreBanner }))
);
const LazyProductCategoriesComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyProductCategories }))
);
const LazyFeaturedProductsComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyFeaturedProducts }))
);
const LazyTestimonialsComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyCustomerTestimonials }))
);
const LazyAboutComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyStoreAbout }))
);
const LazyContactComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyStoreContact }))
);
const LazyFooterComponent = lazy(() => 
  import('./LazyStoreComponents').then(module => ({ default: module.LazyStoreFooter }))
);
const LazyTrackingComponent = lazy(() => import('./StoreTracking'));
const LazyServicesComponent = lazy(() => import('./StoreServices'));

// =================================================================
// 🎯 مكون Intersection Observer محسن
// =================================================================
const InViewSection = React.memo(({ 
  children, 
  fallback = <div className="min-h-[300px] animate-pulse bg-gray-100 rounded-lg" />,
  threshold = 0.1,
  rootMargin = "150px",
  minHeight = "min-h-[300px]"
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  minHeight?: string;
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={ref} className={minHeight}>
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

InViewSection.displayName = 'InViewSection';

// =================================================================
// 🚀 مكون الخطأ المحسن
// =================================================================
const ErrorMessage = React.memo(({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void; 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center">
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-red-600 mb-4">⚠️ حدث خطأ</h1>
      <p className="text-muted-foreground mb-6 leading-relaxed">{error}</p>
      <Button 
        onClick={onRetry}
        aria-label="إعادة المحاولة"
        className="min-w-[140px] bg-red-600 hover:bg-red-700 text-white"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        حاول مرة أخرى
      </Button>
    </div>
  </div>
));

ErrorMessage.displayName = 'ErrorMessage';

// =================================================================
// 🎯 الواجهة
// =================================================================
interface PerformanceOptimizedStorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

// =================================================================
// 🚀 المكون الرئيسي المحسن للأداء
// =================================================================
const PerformanceOptimizedStorePage = React.memo(({ 
  storeData: initialStoreData = {} 
}: PerformanceOptimizedStorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  
  // =================================================================
  // 🎯 State Management محسن
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
  
  // Refs for performance
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // =================================================================
  // 🎯 Memoized Values - تحسين الأداء
  // =================================================================
  
  // Store name optimized
  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = storeSettings?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeSettings?.site_name, currentSubdomain]);
  
  // Categories optimized
  const extendedCategories = useMemo(() => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      return [];
    }
    
    return storeData.categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder',
      color: 'from-blue-500 to-indigo-600'
    }));
  }, [storeData?.categories]);
  
  // Store components optimized
  const layoutComponents = useMemo(() => 
    initialStoreData?.store_layout_components || [], 
    [initialStoreData?.store_layout_components]
  );
  
  // Default components optimized
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
  
  // Components to render optimized
  const componentsToRender = useMemo(() => {
    const filteredComponents = layoutComponents
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

    return filteredComponents.length > 0 ? filteredComponents : defaultStoreComponents;
  }, [layoutComponents, defaultStoreComponents]);
  
  // Footer props optimized
  const footerProps = useMemo(() => {
    const defaultFooterSettings = {
      storeName,
      logoUrl: storeData?.organization_details?.logo_url,
      description: storeData?.organization_details?.description,
      showSocialLinks: true,
      showContactInfo: true,
      showFeatures: true,
      showNewsletter: true,
      showPaymentMethods: true,
      socialLinks: [
        { platform: 'facebook', url: 'https://facebook.com' },
        { platform: 'instagram', url: 'https://instagram.com' }
      ],
      contactInfo: {
        phone: '+213 123 456 789',
        email: storeData?.organization_details?.contact_email || 'info@store.com',
        address: '123 شارع المتجر، الجزائر العاصمة، الجزائر'
      },
      footerSections: [
        {
          id: '1',
          title: 'روابط سريعة',
          links: [
            { id: '1-1', text: 'الصفحة الرئيسية', url: '/', isExternal: false },
            { id: '1-2', text: 'المنتجات', url: '/products', isExternal: false },
            { id: '1-3', text: 'اتصل بنا', url: '/contact', isExternal: false }
          ]
        }
      ],
      features: [
        {
          id: '1',
          icon: 'Truck',
          title: 'شحن سريع',
          description: 'توصيل مجاني للطلبات +5000 د.ج'
        },
        {
          id: '2',
          icon: 'CreditCard', 
          title: 'دفع آمن',
          description: 'طرق دفع متعددة 100% آمنة'
        }
      ],
      paymentMethods: ['visa', 'mastercard', 'paypal'],
      legalLinks: [
        { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
        { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false }
      ]
    };

    return footerSettings 
      ? { ...defaultFooterSettings, ...footerSettings } 
      : defaultFooterSettings;
  }, [footerSettings, storeName, storeData?.organization_details]);
  
  // =================================================================
  // 🎯 Functions محسنة مع useCallback
  // =================================================================
  
  const applyOrganizationTheme = useCallback((orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => {
    updateOrganizationTheme(orgId, settings);
  }, []);
  
  const checkCustomDomainAndLoadData = useCallback(async (signal?: AbortSignal) => {
    try {
      const hostname = window.location.hostname;
      if (hostname.includes('localhost') || !currentSubdomain) {
        return false;
      }
      
      const supabase = getSupabaseClient();
      const { data: orgData, error } = await supabase
        .from('organizations')
        .select('id, name, domain, subdomain')
        .eq('domain', hostname)
        .neq('subdomain', currentSubdomain)
        .abortSignal(signal!)
        .maybeSingle();
      
      if (error || signal?.aborted) return false;
      
      if (orgData?.subdomain) {
        localStorage.setItem('bazaar_organization_id', orgData.id);
        localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
        return orgData.subdomain;
      }
    } catch (error: any) {
      if (!signal?.aborted) {
      }
    }
    return false;
  }, [currentSubdomain]);
  
  const handleReload = useCallback(async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (!subdomainToReload) return;
    
    // Cancel any previous operations
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;
    
    setDataLoading(true);
    setDataError(null);
    dataFetchAttempted.current = false;
    
    try {
      const result = await forceReloadStoreData(subdomainToReload);
      
      if (controller.signal.aborted) return;
      
      if (result.data?.error) {
        setDataError(result.data.error);
        setStoreData(null);
        setStoreSettings(null);
      } else if (result.data) {
        setStoreData(result.data);
        setStoreSettings(result.data.organization_settings || null);
        
        if (result.data.organization_settings && currentOrganization?.id) {
          applyOrganizationTheme(currentOrganization.id, {
            theme_primary_color: result.data.organization_settings.theme_primary_color,
            theme_secondary_color: result.data.organization_settings.theme_secondary_color,
            theme_mode: (result.data.organization_settings as any).theme_mode,
            custom_css: result.data.organization_settings.custom_css
          });
        }
      } else {
        setDataError("فشل إعادة تحميل البيانات.");
        setStoreData(null);
        setStoreSettings(null);
      }
    } catch (error: any) {
      if (!controller.signal.aborted) {
        setDataError(error.message || "خطأ أثناء إعادة التحميل.");
        setStoreData(null);
        setStoreSettings(null);
      }
    } finally {
      if (!controller.signal.aborted) {
        setDataLoading(false);
      }
    }
  }, [currentSubdomain, currentOrganization?.id, applyOrganizationTheme]);
  
  // =================================================================
  // 🚀 Effects محسنة
  // =================================================================
  
  // Main data loading
  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current) return;
      
      // Use existing data if available
      if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setDataLoading(false);
        dataFetchAttempted.current = true;
        
        if (initialStoreData.organization_settings && currentOrganization?.id) {
          applyOrganizationTheme(currentOrganization.id, {
            theme_primary_color: initialStoreData.organization_settings.theme_primary_color,
            theme_secondary_color: initialStoreData.organization_settings.theme_secondary_color,
            theme_mode: (initialStoreData.organization_settings as any).theme_mode,
            custom_css: initialStoreData.organization_settings.custom_css
          });
        }
        return;
      }
      
      dataFetchAttempted.current = true;
      setDataLoading(true);
      setDataError(null);
      
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      try {
        let subdomainToUse = currentSubdomain;
        
        const customDomainSubdomain = await checkCustomDomainAndLoadData(controller.signal);
        if (typeof customDomainSubdomain === 'string') {
          subdomainToUse = customDomainSubdomain;
        }
        
        if (!subdomainToUse || controller.signal.aborted) {
          if (!controller.signal.aborted) {
            setDataLoading(false);
            setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
          }
          return;
        }
        
        const result = await getStoreDataProgressive(subdomainToUse);
        
        if (controller.signal.aborted) return;
        
        if (result.data?.error) {
          setDataError(result.data.error);
          setStoreData(null);
          setStoreSettings(null);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          
          if (result.data.organization_settings && currentOrganization?.id) {
            applyOrganizationTheme(currentOrganization.id, {
              theme_primary_color: result.data.organization_settings.theme_primary_color,
              theme_secondary_color: result.data.organization_settings.theme_secondary_color,
              theme_mode: (result.data.organization_settings as any).theme_mode,
              custom_css: result.data.organization_settings.custom_css
            });
          }
        } else {
          setDataError("لم يتم العثور على بيانات للمتجر.");
          setStoreData(null);
          setStoreSettings(null);
        }
      } catch (error: any) {
        if (!controller.signal.aborted) {
          setDataError(error.message || "خطأ أثناء تحميل البيانات.");
          setStoreData(null);
          setStoreSettings(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDataLoading(false);
        }
      }
    };
    
    loadStoreData();
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [currentSubdomain, initialStoreData, currentOrganization?.id, applyOrganizationTheme, checkCustomDomainAndLoadData]);
  
  // Update page title
  useEffect(() => {
    document.title = `${storeName} | سطوكيها - المتجر الإلكتروني`;
  }, [storeName]);
  
  // Timer to limit loading time
  useEffect(() => {
    if (dataLoading) {
      forceTimerRef.current = setTimeout(() => {
        if (dataLoading) {
          setDataLoading(false);
          if (!storeData && !dataError) {
            setDataError("استغرق تحميل البيانات وقتاً طويلاً. يرجى المحاولة مرة أخرى.");
          }
        }
      }, 7000); // 7 seconds timeout
    } else if (forceTimerRef.current) {
      clearTimeout(forceTimerRef.current);
      forceTimerRef.current = null;
    }
    
    return () => {
      if (forceTimerRef.current) {
        clearTimeout(forceTimerRef.current);
      }
    };
  }, [dataLoading, storeData, dataError]);
  
  // Load footer settings
  useEffect(() => {
    const fetchFooterSettings = async () => {
      if (!storeData?.organization_details?.id) return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: footerData, error } = await supabase
          .from('store_settings')
          .select('settings')
          .eq('organization_id', storeData.organization_details.id)
          .eq('component_type', 'footer')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && footerData?.settings) {
          setFooterSettings(footerData.settings);
        }
      } catch (error) {
      }
    };

    fetchFooterSettings();
  }, [storeData?.organization_details?.id]);
  
  // =================================================================
  // 🚀 Rendering
  // =================================================================
  
  // Loading State
  if (dataLoading && (!storeData || Object.keys(storeData).length === 0)) {
    return <SkeletonLoader type="banner" />;
  }

  // Error State
  if (dataError && !storeData?.organization_details?.id) {
    return <ErrorMessage error={dataError} onRetry={handleReload} />;
  }

  // Not Found State
  if (!dataLoading && !storeData?.organization_details?.id && !dataError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="max-w-md">
          <h1 className="text-3xl font-bold mb-4">🏪 المتجر غير موجود</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            لم نتمكن من العثور على المتجر المطلوب. يرجى التحقق من الرابط أو المحاولة لاحقاً.
          </p>
          <Link to="/">
            <Button 
              aria-label="العودة إلى الصفحة الرئيسية"
              className="min-w-[200px]"
            >
              العودة إلى الصفحة الرئيسية
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{storeSettings?.seo_store_title || storeName}</title>
        {storeSettings?.seo_meta_description && (
          <meta name="description" content={storeSettings.seo_meta_description} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        
        {/* Performance optimizations */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="//cdnjs.cloudflare.com" />
        
        {/* Critical CSS inlining */}
        <style>{`
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .skeleton { background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%); background-size: 200% 100%; animation: loading 1.5s infinite; }
          @keyframes loading { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        `}</style>
      </Helmet>
      
      {storeSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: storeSettings.custom_css }} />
      )}
      
      <div className="flex flex-col min-h-screen bg-background">
        {/* Navigation */}
        <Navbar 
          categories={storeData?.categories?.map(cat => ({
            ...cat,
            product_count: cat.product_count || 0
          }))} 
        />
        
        {/* Reload button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-6 right-6 z-50 bg-white shadow-lg hover:shadow-xl transition-all duration-300 print:hidden"
          onClick={handleReload}
          aria-label="إعادة تحميل صفحة المتجر"
          disabled={dataLoading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
          إعادة تحميل
        </Button>
        
        {/* Main content */}
        <main className="flex-1 pt-16">
          {storeData?.organization_details && (
            <>
              {/* Maintenance mode */}
              {storeSettings?.maintenance_mode ? (
                <div className="container py-20 text-center">
                  <div className="max-w-2xl mx-auto">
                    <h1 className="text-4xl font-bold mb-6">🔧 المتجر تحت الصيانة</h1>
                    <p className="text-xl text-muted-foreground leading-relaxed">
                      {storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريباً. شكراً لصبركم!'}
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Store tracking */}
                  {storeSettings && (
                    <InViewSection 
                      fallback={<div className="h-0" />}
                      minHeight="h-0"
                    >
                      <LazyTrackingComponent />
                    </InViewSection>
                  )}
                  
                  {/* Store components */}
                  {componentsToRender.map((component, index) => {
                    const isFirstComponent = index === 0;
                    const fallbackHeight = isFirstComponent ? "min-h-[70vh]" : "min-h-[50vh]";
                    
                    return (
                      <InViewSection 
                        key={component.id || `component-${index}`}
                        fallback={
                          <div className={`${fallbackHeight} skeleton mx-4 mb-6 rounded-xl`} />
                        }
                        threshold={isFirstComponent ? 0 : 0.05}
                        rootMargin={isFirstComponent ? "0px" : "300px"}
                        minHeight={fallbackHeight}
                      >
                        {/* Hero Banner */}
                        {component.type === 'hero' && (
                          <LazyStoreBannerComponent heroData={component.settings as any} />
                        )}
                        
                        {/* Product Categories */}
                        {component.type === 'product_categories' && (
                          <LazyProductCategoriesComponent 
                            title={component.settings?.title}
                            description={component.settings?.description}
                            useRealCategories={component.settings?.useRealCategories ?? true}
                            categories={extendedCategories}
                            settings={component.settings}
                          />
                        )}
                        
                        {/* Featured Products */}
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                          <LazyFeaturedProductsComponent 
                            {...(component.settings as any)} 
                            organizationId={storeData.organization_details?.id} 
                          />
                        )}
                        
                        {/* Testimonials */}
                        {component.type === 'testimonials' && (
                          <LazyTestimonialsComponent 
                            {...(component.settings as any)} 
                            organizationId={storeData?.organization_details?.id}
                            // ✅ تفعيل جلب البيانات من قاعدة البيانات تلقائياً
                            useDbTestimonials={component.settings?.useDbTestimonials !== undefined ? component.settings.useDbTestimonials : !!storeData?.organization_details?.id}
                          />
                        )}
                        
                        {/* About */}
                        {component.type === 'about' && (
                          <LazyAboutComponent 
                            {...(component.settings as any)} 
                            storeName={storeName} 
                          />
                        )}
                        
                        {/* Contact */}
                        {component.type === 'contact' && (
                          <LazyContactComponent 
                            {...(component.settings as any)} 
                            email={storeData.organization_details?.contact_email} 
                          />
                        )}
                        
                        {/* Services */}
                        {component.type === 'services' && (
                          <LazyServicesComponent {...(component.settings as any)} />
                        )}
                      </InViewSection>
                    );
                  })}
                </>
              )}
            </>
          )}
        </main>
        
        {/* Footer */}
        <InViewSection 
          fallback={<div className="h-80 skeleton" />}
          threshold={0.05}
          rootMargin="200px"
          minHeight="min-h-[200px]"
        >
          <LazyFooterComponent {...footerProps} />
        </InViewSection>
      </div>
      
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
});

PerformanceOptimizedStorePage.displayName = 'PerformanceOptimizedStorePage';

export default PerformanceOptimizedStorePage;
