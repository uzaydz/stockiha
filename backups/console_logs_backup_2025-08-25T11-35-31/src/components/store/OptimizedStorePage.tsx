import { useEffect, useState, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import type { NavbarProps } from '@/components/Navbar';
// سيتم استيراد هذه المكونات في الأسفل
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  getStoreDataProgressive, 
  forceReloadStoreData, 
  StoreInitializationData, 
  Product as StoreProduct
} from '@/api/optimizedStoreDataService';
import type { OrganizationSettings } from '@/types/settings';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';

interface OptimizedStorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

// =================================================================
// 🚀 Lazy Imports المحسنة - تحميل عند الطلب فقط
// =================================================================

// استيراد المكونات الموجودة من LazyStoreComponents
import { 
  LazyStoreBanner, 
  LazyProductCategories, 
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact,
  LazyStoreFooter,
  StoreComponentLoader
} from './LazyStoreComponents';

// خدمات إضافية - تحميل عند الطلب
const StoreTracking = lazy(() => import('./StoreTracking'));
const StoreServices = lazy(() => import('./StoreServices'));

// =================================================================
// 🎯 مكون Intersection Observer محسن للتحميل المؤجل
// =================================================================
const LazySection = React.memo(({ 
  children, 
  fallback = <div className="min-h-[200px] animate-pulse bg-gray-100 rounded-lg" />,
  threshold = 0.1,
  rootMargin = "100px"
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
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
    <div ref={ref}>
      {isVisible ? (
        <div className="flex-1">
          <Suspense fallback={fallback}>
            {children}
          </Suspense>
        </div>
      ) : (
        fallback
      )}
    </div>
  );
});

LazySection.displayName = 'LazySection';

// =================================================================
// 🚀 مكون الخطأ المحسن
// =================================================================
const ErrorBoundary = React.memo(({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void; 
}) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh] p-4 text-center">
    <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
    <p className="text-muted-foreground mb-4 max-w-md">{error}</p>
    <Button 
      onClick={onRetry}
      aria-label="إعادة المحاولة"
      className="min-w-[120px]"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      حاول مرة أخرى
    </Button>
  </div>
));

ErrorBoundary.displayName = 'ErrorBoundary';

// =================================================================
// 🚀 المكون الرئيسي المحسن
// =================================================================
const OptimizedStorePage = React.memo(({ 
  storeData: initialStoreData = {} 
}: OptimizedStorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { t } = useTranslation();
  
  // =================================================================
  // State Management محسن
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
  
  // بيانات إضافية تُحمل بشكل مؤجل
  const [additionalDataLoaded, setAdditionalDataLoaded] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);
  
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const storeNameFromDetails = storeData?.organization_details?.name;
  const storeNameFromSettings = storeSettings?.site_name;
  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = storeSettings?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeSettings?.site_name, currentSubdomain]);

  // =================================================================
  // Optimized Data Loading
  // =================================================================
  
  // 1. جلب البيانات الأساسية (سريع)
  const loadBasicStoreData = useCallback(async (subdomain: string) => {
    try {
      setDataLoading(true);
      setDataError(null);

      const supabase = getSupabaseClient();
      
      // جلب البيانات الأساسية فقط (المؤسسة والإعدادات)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select(`
          id, name, description, logo_url, subdomain, domain, settings,
          organization_settings!inner (
            id, site_name, theme_primary_color, theme_secondary_color, 
            theme_mode, custom_css, enable_public_site, maintenance_mode,
            custom_js_header, custom_js_footer, seo_store_title, 
            seo_meta_description, favicon_url, default_language
          )
        `)
        .eq('subdomain', subdomain)
        .single();

      if (orgError || !orgData) {
        setDataError(orgError?.message || 'المتجر غير موجود');
        setDataLoading(false);
        return;
      }

      const basicStoreData: Partial<StoreInitializationData> = {
        organization_details: {
          id: orgData.id,
          name: orgData.name,
          description: orgData.description,
          logo_url: orgData.logo_url,
          subdomain: orgData.subdomain,
          domain: orgData.domain,
          contact_email: (orgData.settings as any)?.contact_email || null,
          created_at: null,
          updated_at: null,
          currency: null,
          language: (orgData.settings as any)?.language || null,
          default_country: (orgData.settings as any)?.default_country || null,
          is_active: true,
          industry: (orgData.settings as any)?.industry || null,
          business_type: (orgData.settings as any)?.business_type || null,
          timezone: (orgData.settings as any)?.timezone || null
        },
        organization_settings: Array.isArray(orgData.organization_settings) 
          ? orgData.organization_settings[0] 
          : orgData.organization_settings,
        categories: [],
        featured_products: [],
        store_layout_components: [],
        shipping_info: {
          has_shipping_providers: false,
          default_shipping_zone_id: null,
          default_shipping_zone_details: null
        }
      };

      setStoreData(basicStoreData);
      setStoreSettings(basicStoreData.organization_settings);
      setDataLoading(false);

      // بدء التحميل المؤجل للبيانات الإضافية
      loadAdditionalData(orgData.id);

      // تطبيق الثيم
      if (basicStoreData.organization_settings && currentOrganization?.id) {
        applyOrganizationTheme(currentOrganization.id, {
          theme_primary_color: basicStoreData.organization_settings.theme_primary_color,
          theme_secondary_color: basicStoreData.organization_settings.theme_secondary_color,
          theme_mode: basicStoreData.organization_settings.theme_mode as any,
          custom_css: basicStoreData.organization_settings.custom_css
        });
      }

    } catch (error: any) {
      setDataError(error.message || 'خطأ غير معروف');
      setDataLoading(false);
    }
  }, [currentOrganization?.id]);

  // 2. تحميل البيانات الإضافية بشكل مؤجل
  const loadAdditionalData = useCallback(async (orgId: string) => {
    try {
      const supabase = getSupabaseClient();

      // تحميل البيانات بالتوازي
      const [categoriesResult, productsResult, componentsResult] = await Promise.all([
        // الفئات (محدودة ب 6)
        supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('name')
          .limit(6),

        // المنتجات المميزة (محدودة ب 4)
        supabase
          .from('products')
          .select(`
            id, name, description, price, compare_at_price, sku, slug,
            thumbnail_image, stock_quantity, is_featured, created_at,
            product_categories!inner(name, slug)
          `)
          .eq('organization_id', orgId)
          .eq('is_featured', true)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(4),

        // مكونات المتجر
        supabase
          .from('store_settings')
          .select('id, component_type, settings, is_active, order_index')
          .eq('organization_id', orgId)
          .eq('is_active', true)
          .order('order_index')
      ]);

      // معالجة النتائج
      const processedCategories = (categoriesResult.data || []).map(cat => ({
        ...cat,
        product_count: 0, // سيتم حسابه لاحقاً إذا لزم الأمر
        imageUrl: cat.image_url || '',
        productsCount: 0,
        icon: cat.icon || 'folder',
        color: 'from-blue-500 to-indigo-600'
      }));

      const processedProducts = (productsResult.data || []).map(product => ({
        ...product,
        thumbnail_url: product.thumbnail_image,
        category_name: product.product_categories?.name || null,
        category_slug: product.product_categories?.slug || null
      }));

      const processedComponents = (componentsResult.data || []).map(item => ({
        id: item.id,
        type: item.component_type as ComponentType,
        settings: item.settings || {},
        isActive: item.is_active,
        orderIndex: item.order_index || 0
      }));

      // تحديث الحالة
      setCategories(processedCategories);
      setFeaturedProducts(processedProducts);
      setCustomComponents(processedComponents);
      setAdditionalDataLoaded(true);

      // تحديث storeData مع البيانات الجديدة
      setStoreData(prev => prev ? {
        ...prev,
        categories: processedCategories,
        featured_products: processedProducts,
        store_layout_components: processedComponents
      } : null);

    } catch (error) {
    }
  }, []);

  // =================================================================
  // Theme Management
  // =================================================================
  const applyOrganizationTheme = useCallback((orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => {
    updateOrganizationTheme(orgId, settings);
  }, []);

  // =================================================================
  // Effects
  // =================================================================
  
  // التحقق من النطاق المخصص وتحميل البيانات
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
        .abortSignal(signal)
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

  // تحميل البيانات الرئيسي
  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current) return;
      
      // استخدام البيانات الموجودة إذا كانت متاحة
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

  // تحديث عنوان الصفحة
  useEffect(() => {
    document.title = `${storeName} | سطوكيها - المتجر الإلكتروني`;
  }, [storeName]);

  // جلب إعدادات الفوتر
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

  // مؤقت الإجبار على الإنهاء
  useEffect(() => {
    if (dataLoading) {
      forceTimerRef.current = setTimeout(() => {
        if (dataLoading) {
          setDataLoading(false);
          if (!storeData && !dataError) {
            setDataError("استغرق تحميل بيانات المتجر وقتًا طويلاً. يرجى المحاولة مرة أخرى.");
          }
        }
      }, 3000); // ⚡ تم تقليل Timeout من 8 إلى 3 ثوان لتحسين الأداء
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

  // =================================================================
  // Event Handlers
  // =================================================================
  
  const handleReload = useCallback(async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (!subdomainToReload) return;
    
    // إلغاء أي عمليات سابقة
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
  // Memoized Values
  // =================================================================
  
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
  
  // customComponents already defined as state above - using that instead
  
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
  // Render Conditions
  // =================================================================
  
  if (dataLoading && (!storeData || Object.keys(storeData).length === 0)) {
    return <SkeletonLoader type="banner" />;
  }

  if (dataError && !storeData?.organization_details?.id) {
    return <ErrorBoundary error={dataError} onRetry={handleReload} />;
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
        
        <LazySection 
          fallback={<div className="h-64 bg-gray-100" />}
          threshold={0.1}
          rootMargin="100px"
        >
          {React.useMemo(() => {
            // إعدادات افتراضية للفوتر باستخدام الدالة المشتركة
            const defaultFooterSettings = getDefaultFooterSettings(storeName, storeData, t);

            // دمج الإعدادات المخصصة مع الافتراضية
            const finalFooterSettings = mergeFooterSettings(defaultFooterSettings, footerSettings);

            return <LazyStoreFooter {...finalFooterSettings} />;
          }, [footerSettings, storeName, storeData, t])}
        </LazySection>
      </div>
      
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
});

OptimizedStorePage.displayName = 'OptimizedStorePage';

export default OptimizedStorePage;
