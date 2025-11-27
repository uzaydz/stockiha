import React, { useEffect, useState, useRef, useCallback, useMemo, Suspense } from 'react';
import { block } from 'million/react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useStore } from '@/context/StoreContext';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import PerformanceOptimizedImage from '@/components/ui/PerformanceOptimizedImage';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';

// استيراد UltraFastStorePage الجديد
import UltraFastStorePage from './UltraFastStorePage';

// =================================================================
// 🚀 FAST STORE PAGE - نسخة محسنة مع دعم النظام القديم
// =================================================================

// 🚨 إضافة نظام تتبع الأداء
const STORE_PAGE_DEBUG = true;
const STORE_PERFORMANCE_METRICS = {
  totalRenders: 0,
  loadDataCalls: 0,
  themeApplications: 0,
  warnings: [] as string[]
};

const logStorePerformanceIssue = (type: string, data: any) => {
  if (!STORE_PAGE_DEBUG) return;

  STORE_PERFORMANCE_METRICS.warnings.push(`${type}: ${JSON.stringify(data)}`);
};

// Lazy imports للمكونات الثقيلة (للتوافق مع النظام القديم)
const LazyStoreBanner = React.lazy(() => import('./StoreBanner'));
const LazyProductCategories = React.lazy(() => import('./ProductCategoriesOptimized'));
const LazyFeaturedProducts = React.lazy(() => import('./FeaturedProducts'));
const LazyCustomerTestimonials = React.lazy(() => import('./CustomerTestimonials'));
const LazyStoreAbout = React.lazy(() => import('./StoreAbout'));
const LazyStoreContact = React.lazy(() => import('./StoreContact'));
const LazyStoreFooter = React.lazy(() => import('./CustomizableStoreFooter'));
const StoreTracking = React.lazy(() => import('./StoreTracking'));
const StoreServices = React.lazy(() => import('./StoreServices'));

// =================================================================
// 🎯 Legacy Support Component
// =================================================================
const LegacyFastStorePage: React.FC<FastStorePageProps> = ({
  storeData: initialStoreData = {}
}) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { state, loadStoreData } = useStore();

  // 🚨 تتبع تحميل البيانات
  STORE_PERFORMANCE_METRICS.totalRenders++;

  // تحميل البيانات باستخدام النظام الجديد
  useEffect(() => {
    const loadStartTime = performance.now();

    if (currentSubdomain && !state.organizationData && !state.isLoading) {
      STORE_PERFORMANCE_METRICS.loadDataCalls++;

      loadStoreData(currentSubdomain);

      const loadEndTime = performance.now();
      const loadDuration = loadEndTime - loadStartTime;

      if (loadDuration > 100) {
        logStorePerformanceIssue('SLOW_LOAD_DATA_CALL', {
          duration: loadDuration,
          subdomain: currentSubdomain
        });
      }
    } else {
      const reasons = [];
      if (!currentSubdomain) reasons.push('لا يوجد subdomain');
      if (state.organizationData) reasons.push('البيانات موجودة بالفعل');
      if (state.isLoading) reasons.push('التحميل جاري');

    }
  }, [currentSubdomain, state.organizationData, state.isLoading, loadStoreData]);

  // تطبيق الثيم
  useEffect(() => {
    const themeStartTime = performance.now();

    if (state.storeSettings && state.organizationData?.id) {
      STORE_PERFORMANCE_METRICS.themeApplications++;

      updateOrganizationTheme(state.organizationData.id, {
        theme_primary_color: state.storeSettings.theme_primary_color,
        theme_secondary_color: state.storeSettings.theme_secondary_color,
        theme_mode: state.storeSettings.theme_mode,
        custom_css: state.storeSettings.custom_css
      });

      const themeEndTime = performance.now();
      const themeDuration = themeEndTime - themeStartTime;

      if (themeDuration > 50) {
        logStorePerformanceIssue('SLOW_THEME_APPLICATION', {
          duration: themeDuration,
          organizationId: state.organizationData.id
        });
      }
    } else {
    }
  }, [state.storeSettings, state.organizationData?.id]);

  // إذا كانت البيانات متوفرة من النظام الجديد، استخدمها
  if (state.organizationData || state.isLoading || state.error) {
    return <UltraFastStorePage />;
  }

  // إذا كانت البيانات الأولية متوفرة، استخدم النظام القديم
  if (initialStoreData && Object.keys(initialStoreData).length > 0) {
    return <LegacyStorePageRenderer storeData={initialStoreData} />;
  }

  // حالة التحميل الافتراضية
  return (
    <div className="flex flex-col items-center justify-center min-h-screen" role="status" aria-label="جاري تحميل المتجر">
      <div className="w-12 h-12 border-3 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
      <p className="text-lg text-muted-foreground">جاري تحميل المتجر...</p>
    </div>
  );
};

// =================================================================
// 🎯 Legacy Store Page Renderer (للتوافق مع النظام القديم)
// =================================================================
interface LegacyStorePageRendererProps {
  storeData: any;
}

const LegacyStorePageRenderer: React.FC<LegacyStorePageRendererProps> = ({ storeData }) => {
  const { currentSubdomain } = useAuth();
  const [storeSettings, setStoreSettings] = useState<any>(storeData.organization_settings || null);
  const [customComponents, setCustomComponents] = useState<any[]>(storeData.store_layout_components || []);

  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = storeSettings?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeSettings?.site_name, currentSubdomain]);

  const extendedCategories = useMemo(() => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      return [];
    }
    return storeData.categories.map((category: any) => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder',
      color: 'from-blue-500 to-indigo-600'
    }));
  }, [storeData?.categories]);

  const defaultStoreComponents = useMemo(() => [
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
      .filter((component: any) => {
        const normalizedType = component.type.toLowerCase();
        return normalizedType !== 'seo_settings' && component.isActive;
      })
      .map((component: any) => {
        let normalizedType = component.type.toLowerCase();
        if (normalizedType === 'categories') {
          normalizedType = 'product_categories';
        }
        return {
          ...component,
          type: normalizedType
        };
      })
      .sort((a: any, b: any) => a.orderIndex - b.orderIndex);

    return filteredCustomComponents.length > 0 ? filteredCustomComponents : defaultStoreComponents;
  }, [customComponents, defaultStoreComponents]);

  return (
    <>
      <Helmet>
        <title>{storeSettings?.seo_store_title || storeName}</title>
        {storeSettings?.seo_meta_description && (
          <meta name="description" content={storeSettings.seo_meta_description} />
        )}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* <link rel="preconnect" href="https://fonts.googleapis.com/css2" /> */}
        {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> */}
      </Helmet>

      {storeSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: storeSettings.custom_css }} />
      )}

      <div className="flex flex-col min-h-screen bg-background relative">
        <Navbar
          categories={storeData?.categories?.map((cat: any) => ({
            ...cat,
            product_count: cat.product_count || 0
          }))}
        />

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
                    <Suspense fallback={<div className="h-0" />}>
                      <StoreTracking />
                    </Suspense>
                  )}

                  {componentsToRender.map((component: any, index: number) => {
                    const isFirstComponent = index === 0;
                    const fallbackHeight = isFirstComponent ? "min-h-[60vh]" : "min-h-[40vh]";

                    return (
                      <Suspense
                        key={component.id || `component-${index}`}
                        fallback={
                          <div className={`${fallbackHeight} animate-pulse bg-gray-100 rounded-lg mx-4 mb-4`} />
                        }
                      >
                        {component.type === 'hero' && (
                          <LazyStoreBanner heroData={component.settings} />
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
                            {...(component.settings || {})}
                            organizationId={storeData.organization_details?.id}
                          />
                        )}

                        {component.type === 'testimonials' && (
                          <LazyCustomerTestimonials
                            {...(component.settings || {})}
                            organizationId={storeData?.organization_details?.id}
                          />
                        )}

                        {component.type === 'about' && (
                          <LazyStoreAbout
                            {...(component.settings || {})}
                            storeName={storeName}
                          />
                        )}

                        {component.type === 'contact' && (
                          <LazyStoreContact
                            {...(component.settings || {})}
                            organizationData={storeData?.organization_details}
                          />
                        )}

                        {component.type === 'services' && (
                          <StoreServices
                            {...(component.settings || {})}
                          />
                        )}
                      </Suspense>
                    );
                  })}

                  <Suspense fallback={<div className="h-20 bg-gray-100 animate-pulse" />}>
                    <LazyStoreFooter
                      organizationData={storeData?.organization_details}
                      storeSettings={storeSettings}
                    />
                  </Suspense>
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
};

// =================================================================
// 🚀 MAIN COMPONENT
// =================================================================

interface FastStorePageProps {
  storeData?: any;
}

const FastStorePage: React.FC<FastStorePageProps> = (props) => {
  // استخدام النظام الجديد بشكل افتراضي
  const USE_ULTRA_FAST = true;

  if (USE_ULTRA_FAST) {
    return <UltraFastStorePage />;
  }

  // النظام القديم للتوافق
  return <LegacyFastStorePage {...props} />;
};

FastStorePage.displayName = 'FastStorePage';

// 🚀 MILLION.JS OPTIMIZATION: تحسين المكون الرئيسي
const OptimizedFastStorePage = React.memo(FastStorePage);

export default OptimizedFastStorePage;
