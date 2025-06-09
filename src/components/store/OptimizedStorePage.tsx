import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
import type { NavbarProps } from '@/components/Navbar';
import { 
  LazyLoad, 
  LazyStoreBanner, 
  LazyProductCategories, 
  LazyFeaturedProducts,
  LazyCustomerTestimonials,
  LazyStoreAbout,
  LazyStoreContact,
  LazyStoreFooter,
  LazyComponentPreview
} from './LazyStoreComponents';
import StoreTracking from './StoreTracking';
import StoreServices from './StoreServices';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, RefreshCw } from 'lucide-react';
import SkeletonLoader from './SkeletonLoader';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  getStoreDataFast, 
  forceReloadStoreData, 
  StoreInitializationData, 
  Product as StoreProduct
} from '@/api/storeDataService';
import type { OrganizationSettings } from '@/types/settings';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import React from 'react';

interface OptimizedStorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

const OptimizedStorePage = ({ storeData: initialStoreData = {} }: OptimizedStorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  
  // =================================================================
  // State Management محسن
  // =================================================================
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(
    initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null
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
  
  const storeNameFromDetails = storeData?.organization_details?.name;
  const storeNameFromSettings = storeSettings?.site_name;
  const storeName = storeNameFromDetails || storeNameFromSettings || currentSubdomain || 'المتجر الإلكتروني';

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
        applyOrganizationThemeWithRetry(currentOrganization.id, {
          theme_primary_color: basicStoreData.organization_settings.theme_primary_color,
          theme_secondary_color: basicStoreData.organization_settings.theme_secondary_color,
          theme_mode: basicStoreData.organization_settings.theme_mode as any,
          custom_css: basicStoreData.organization_settings.custom_css
        });
      }

    } catch (error: any) {
      console.error('خطأ في تحميل البيانات الأساسية:', error);
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
      console.error('خطأ في تحميل البيانات الإضافية:', error);
    }
  }, []);

  // =================================================================
  // Theme Management
  // =================================================================
  const applyOrganizationThemeWithRetry = useCallback((orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => {
    updateOrganizationTheme(orgId, settings);
    
    setTimeout(() => {
      updateOrganizationTheme(orgId, settings);
      setTimeout(() => {
        updateOrganizationTheme(orgId, settings);
      }, 500);
    }, 100);
  }, []);

  // =================================================================
  // Effects
  // =================================================================
  
  // التحقق من النطاق المخصص وتحميل البيانات
  const checkCustomDomainAndLoadData = useCallback(async () => {
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
        .maybeSingle();
      
      if (error || !orgData?.subdomain) {
        return false;
      }
      
      localStorage.setItem('bazaar_organization_id', orgData.id);
      localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
      return orgData.subdomain;
    } catch (error) {
      return false;
    }
  }, [currentSubdomain]);

  // تحميل البيانات الرئيسي
  useEffect(() => {
    if (dataFetchAttempted.current && !(initialStoreData && Object.keys(initialStoreData).length > 0)) {
      return;
    }

    const loadData = async () => {
      if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) {
        dataFetchAttempted.current = true;
      }

      let subdomainToUse = currentSubdomain;

      // التحقق من النطاق المخصص
      const customDomainSubdomain = await checkCustomDomainAndLoadData();
      if (typeof customDomainSubdomain === 'string') {
        subdomainToUse = customDomainSubdomain;
      }

      if (!subdomainToUse) {
        setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
        setDataLoading(false);
        return;
      }

      // استخدام البيانات الأولية إذا كانت متوفرة
      if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setCustomComponents(initialStoreData.store_layout_components || []);
        setDataLoading(false);
        
        if (initialStoreData.categories) setCategories(initialStoreData.categories);
        if (initialStoreData.featured_products) setFeaturedProducts(initialStoreData.featured_products);
        
        if (initialStoreData.organization_settings && currentOrganization?.id) {
          applyOrganizationThemeWithRetry(currentOrganization.id, {
            theme_primary_color: initialStoreData.organization_settings.theme_primary_color,
            theme_secondary_color: initialStoreData.organization_settings.theme_secondary_color,
            theme_mode: initialStoreData.organization_settings.theme_mode as any,
            custom_css: initialStoreData.organization_settings.custom_css
          });
        }
      } else {
        // تحميل البيانات من قاعدة البيانات
        await loadBasicStoreData(subdomainToUse);
      }
    };

    loadData();
  }, [currentSubdomain, initialStoreData, loadBasicStoreData, checkCustomDomainAndLoadData, applyOrganizationThemeWithRetry, currentOrganization?.id]);

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
        console.error('خطأ في جلب إعدادات الفوتر:', error);
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
            setDataError("استغرق تحميل بيانات المتجر وقتًا طويلاً.");
          }
        }
      }, 10000);
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
  
  const handleReload = async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (subdomainToReload) {
      setDataLoading(true);
      setDataError(null);
      setFooterSettings(null);
      setAdditionalDataLoaded(false);
      dataFetchAttempted.current = false;
      
      await loadBasicStoreData(subdomainToReload);
    }
  };

  // =================================================================
  // Memoized Values
  // =================================================================
  
  const getExtendedCategories = useMemo(() => {
    if (!categories || categories.length === 0) {
      return [];
    }
    return categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder',
      color: 'from-blue-500 to-indigo-600'
    }));
  }, [categories]);

  const defaultStoreComponents: StoreComponent[] = useMemo(() => [
    { id: 'banner-default', type: 'hero', settings: { title: storeName, subtitle: storeData?.organization_details?.description || 'أفضل المنتجات بأفضل الأسعار' }, isActive: true, orderIndex: 0 },
    { id: 'categories-default', type: 'product_categories', settings: { title: 'تسوق حسب الفئة'}, isActive: true, orderIndex: 1 },
    { id: 'featured-default', type: 'featured_products', settings: { title: 'منتجات مميزة' }, isActive: true, orderIndex: 2 },
    { id: 'services-default', type: 'services', settings: {}, isActive: true, orderIndex: 3 },
    { id: 'testimonials-default', type: 'testimonials', settings: {}, isActive: true, orderIndex: 4 },
    { id: 'about-default', type: 'about', settings: { title: `عن ${storeName}`, content: storeData?.organization_details?.description || 'مرحباً بك في متجرنا.' }, isActive: true, orderIndex: 5 },
    { id: 'contact-default', type: 'contact', settings: { email: storeData?.organization_details?.contact_email }, isActive: true, orderIndex: 6 },
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
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
        <p className="text-muted-foreground mb-4">{dataError}</p>
        <Button onClick={handleReload}>
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
        <p className="text-muted-foreground mb-4">
          لم نتمكن من العثور على المتجر المطلوب. يرجى التحقق من الرابط أو المحاولة لاحقًا.
        </p>
        <Link to="/">
          <Button>العودة إلى الصفحة الرئيسية</Button>
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
        {storeSettings?.seo_meta_description && <meta name="description" content={storeSettings.seo_meta_description} />}
      </Helmet>
      
      {storeSettings?.custom_js_header && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_header }} />
      )}
      
      {storeSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: storeSettings.custom_css }} />
      )}
      
      <div className="flex flex-col min-h-screen bg-background relative">
        <Navbar categories={getExtendedCategories} />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 right-4 z-[100] bg-primary/10 hover:bg-primary/20 print:hidden"
          onClick={handleReload}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          إعادة تحميل
        </Button>
        
        <main className="flex-1 pt-16">
          {storeData?.organization_details && (
            <>
              {storeSettings?.maintenance_mode && (
                <div className="container py-10 text-center">
                  <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
                  <p className="text-xl text-muted-foreground">
                    {storeSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
                  </p>
                </div>
              )}
              
              {!storeSettings?.maintenance_mode && (
                <>
                  {storeSettings && <StoreTracking />}
                  
                  {componentsToRender.map((component, index) => {
                    return (
                      <LazyLoad key={component.id || `component-${index}`}>
                        {(component.type === 'hero') && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                        
                        {(component.type === 'product_categories') && (
                          <LazyProductCategories 
                            title={component.settings?.title}
                            description={component.settings?.description}
                            useRealCategories={false}
                            categories={getExtendedCategories}
                            settings={component.settings}
                          />
                        )}
                        
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                          <LazyFeaturedProducts 
                            {...(component.settings as any)} 
                            organizationId={storeData.organization_details?.id}
                            products={featuredProducts}
                          />
                        )}
                        
                        {(component.type === 'testimonials') && (
                          <LazyCustomerTestimonials {...(component.settings as any)} organizationId={storeData?.organization_details?.id}/>
                        )}
                        
                        {(component.type === 'about') && (
                          <LazyStoreAbout {...(component.settings as any)} storeName={storeName} />
                        )}
                        
                        {(component.type === 'contact') && (
                          <LazyStoreContact {...(component.settings as any)} email={storeData.organization_details?.contact_email} />
                        )}
                        
                        {(component.type === 'services') && (
                          <StoreServices {...(component.settings as any)} />
                        )}
                        
                        {(component.type === 'countdownoffers') && (
                          <LazyComponentPreview component={{ ...component, type: component.type as ComponentType }} />
                        )}
                      </LazyLoad>
                    );
                  })}
                </>
              )}
            </>
          )}
        </main>
        
        {/* الفوتر */}
        {React.useMemo(() => {
          const defaultFooterSettings = {
            storeName: storeName,
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
              },
              {
                id: '2',
                title: 'خدمة العملاء',
                links: [
                  { id: '2-1', text: 'مركز المساعدة', url: '/help', isExternal: false },
                  { id: '2-2', text: 'سياسة الشحن', url: '/shipping-policy', isExternal: false },
                  { id: '2-3', text: 'الأسئلة الشائعة', url: '/faq', isExternal: false }
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
              },
              {
                id: '3',
                icon: 'Heart',
                title: 'ضمان الجودة',
                description: 'منتجات عالية الجودة معتمدة'
              },
              {
                id: '4',
                icon: 'ShieldCheck',
                title: 'دعم 24/7',
                description: 'مساعدة متوفرة طول اليوم'
              }
            ],
            newsletterSettings: {
              enabled: true,
              title: 'النشرة البريدية',
              description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
              placeholder: 'البريد الإلكتروني',
              buttonText: 'اشتراك'
            },
            paymentMethods: ['visa', 'mastercard', 'paypal'],
            legalLinks: [
              { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
              { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false }
            ]
          };

          const finalFooterSettings = footerSettings 
            ? { ...defaultFooterSettings, ...footerSettings } 
            : defaultFooterSettings;

          return (
            <LazyStoreFooter {...finalFooterSettings} />
          );
        }, [footerSettings, storeName, storeData?.organization_details])}
      </div>
      
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
};

export default OptimizedStorePage; 