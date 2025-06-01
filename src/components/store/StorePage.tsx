import { useEffect, useState, useRef, useCallback } from 'react';
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
import SkeletonLoader, { SkeletonLoaderProps } from './SkeletonLoader';
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

interface StorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

const StorePage = ({ storeData: initialStoreData = {} }: StorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const storeNameFromDetails = storeData?.organization_details?.name;
  const storeNameFromSettings = storeSettings?.site_name;
  const storeName = storeNameFromDetails || storeNameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>(
    initialStoreData?.store_layout_components || []
  );

  useEffect(() => {
  }, [customComponents]);

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

  const getExtendedCategories = () => {
    if (!storeData?.categories || storeData.categories.length === 0) {
      return [];
    }
    const extended = storeData.categories.map(category => ({
      ...category,
      imageUrl: category.image_url || '',
      productsCount: category.product_count || 0,
      icon: category.icon || 'folder', 
      color: 'from-blue-500 to-indigo-600' 
    }));
    return extended;
  };

  // تطبيق ثيم المؤسسة مع محاولة إعادة تطبيق بعد التحميل
  const applyOrganizationThemeWithRetry = useCallback((orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => {
    // تطبيق أول مرة
    updateOrganizationTheme(orgId, {
      theme_primary_color: settings.theme_primary_color,
      theme_secondary_color: settings.theme_secondary_color,
      theme_mode: settings.theme_mode,
      custom_css: settings.custom_css
    });
    
    // محاولة ثانية بعد 100 ملي ثانية
    setTimeout(() => {
      updateOrganizationTheme(orgId, {
        theme_primary_color: settings.theme_primary_color,
        theme_secondary_color: settings.theme_secondary_color,
        theme_mode: settings.theme_mode,
        custom_css: settings.custom_css
      });
      
      // محاولة أخيرة بعد 500 ملي ثانية (لتغطية المكونات التي تحمل متأخرة)
      setTimeout(() => {
        updateOrganizationTheme(orgId, {
          theme_primary_color: settings.theme_primary_color,
          theme_secondary_color: settings.theme_secondary_color,
          theme_mode: settings.theme_mode,
          custom_css: settings.custom_css
        });
      }, 500);
    }, 100);
  }, []);

  useEffect(() => {
    if (currentSubdomain) {
      // Theme is now initialized in main.tsx with applyInstantTheme()
    }
  }, [currentSubdomain]);
  
  const checkCustomDomainAndLoadData = async () => {
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
      
      if (error) {
        return false;
      }
      
      if (orgData && orgData.subdomain) {
        localStorage.setItem('bazaar_organization_id', orgData.id);
        localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
        return orgData.subdomain;
      }
    } catch (error: any) {
    }
    return false;
  };
  
  useEffect(() => {
    const loadStoreData = async () => {
      if (dataFetchAttempted.current && !(initialStoreData && Object.keys(initialStoreData).length > 0) ) return;
      if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) {
        dataFetchAttempted.current = true;
        setDataLoading(true);
      }
      setDataError(null);

      let subdomainToUse = currentSubdomain;

      const customDomainSubdomain = await checkCustomDomainAndLoadData();
      if (typeof customDomainSubdomain === 'string') {
        subdomainToUse = customDomainSubdomain;
      }

      if (!subdomainToUse) {
        if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) setDataLoading(false);
        setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
        return;
      }
      
      try {
        const result = await getStoreDataFast(subdomainToUse);

        if (result.data?.error) {
          setDataError(result.data.error);
          setStoreData(null); 
          setStoreSettings(null);
          setCustomComponents([]);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          setCustomComponents(result.data.store_layout_components || []);
          if (result.data.organization_settings) {
            // Apply organization theme if settings are available
            if (result.data.organization_settings && currentOrganization?.id) {
              applyOrganizationThemeWithRetry(currentOrganization.id, {
                theme_primary_color: result.data.organization_settings.theme_primary_color,
                theme_secondary_color: result.data.organization_settings.theme_secondary_color,
                theme_mode: result.data.organization_settings.theme_mode,
                custom_css: result.data.organization_settings.custom_css
              });
            }
          }
        } else {
          setDataError("لم يتم العثور على بيانات للمتجر أو قد تكون البيانات فارغة.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } catch (error: any) {
        setDataError(error.message || "خطأ غير معروف أثناء تحميل البيانات.");
        setStoreData(null);
        setStoreSettings(null);
        setCustomComponents([]);
      } finally {
        if (!(initialStoreData && Object.keys(initialStoreData).length > 0)) setDataLoading(false);
      }
    };
    
    if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setCustomComponents(initialStoreData.store_layout_components || []);
        setDataLoading(false); 
        dataFetchAttempted.current = true;
        if (initialStoreData.organization_settings && currentSubdomain) {
            // Apply organization theme if settings are available
            if (initialStoreData.organization_settings && currentOrganization?.id) {
              applyOrganizationThemeWithRetry(currentOrganization.id, {
                theme_primary_color: initialStoreData.organization_settings.theme_primary_color,
                theme_secondary_color: initialStoreData.organization_settings.theme_secondary_color,
                theme_mode: initialStoreData.organization_settings.theme_mode,
                custom_css: initialStoreData.organization_settings.custom_css
              });
            }
        }
    } else {
        loadStoreData();
    }

  }, [currentSubdomain, initialStoreData, applyOrganizationThemeWithRetry]);
  
  useEffect(() => {
    document.title = `${storeName} | سطوكيها - المتجر الإلكتروني`;
  }, [storeName]);

  const handleReload = async () => {
    const subdomainToReload = localStorage.getItem('bazaar_current_subdomain') || currentSubdomain;
    if (subdomainToReload) {
      setDataLoading(true);
      setDataError(null);
      setFooterSettings(null);
      dataFetchAttempted.current = false;
      try {
        const result = await forceReloadStoreData(subdomainToReload);
        if (result.data?.error) {
          setDataError(result.data.error);
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          setCustomComponents(result.data.store_layout_components || []);
          if (result.data.organization_settings) {
            // Apply organization theme if settings are available
            if (result.data.organization_settings && currentOrganization?.id) {
              applyOrganizationThemeWithRetry(currentOrganization.id, {
                theme_primary_color: result.data.organization_settings.theme_primary_color,
                theme_secondary_color: result.data.organization_settings.theme_secondary_color,
                theme_mode: result.data.organization_settings.theme_mode,
                custom_css: result.data.organization_settings.custom_css
              });
            }
          }
        } else {
          setDataError("فشل إعادة تحميل البيانات.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } catch (error: any) {
        setDataError(error.message || "خطأ غير معروف أثناء إعادة التحميل.");
        setStoreData(null);
        setStoreSettings(null);
        setCustomComponents([]);
      } finally {
        setDataLoading(false);
      }
    }
  };

  const hasCustomComponents = customComponents && customComponents.length > 0;

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

  const defaultStoreComponents: StoreComponent[] = [
    { id: 'banner-default', type: 'hero', settings: { title: storeName, subtitle: storeData?.organization_details?.description || 'أفضل المنتجات بأفضل الأسعار' }, isActive: true, orderIndex: 0 },
    { id: 'categories-default', type: 'product_categories', settings: { title: 'تسوق حسب الفئة'}, isActive: true, orderIndex: 1 },
    { id: 'featured-default', type: 'featured_products', settings: { title: 'منتجات مميزة' }, isActive: true, orderIndex: 2 },
    { id: 'services-default', type: 'services', settings: {}, isActive: true, orderIndex: 3 },
    { id: 'testimonials-default', type: 'testimonials', settings: {}, isActive: true, orderIndex: 4 },
    { id: 'about-default', type: 'about', settings: { title: `عن ${storeName}`, content: storeData?.organization_details?.description || 'مرحباً بك في متجرنا.' }, isActive: true, orderIndex: 5 },
    { id: 'contact-default', type: 'contact', settings: { email: storeData?.organization_details?.contact_email }, isActive: true, orderIndex: 6 },
  ];

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

  const componentsToRender = filteredCustomComponents.length > 0 ? filteredCustomComponents : defaultStoreComponents;

  const navBarProps: NavbarProps = {
  };

  // تحميل إعدادات الفوتر من قاعدة البيانات
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
        {/* النافبار الثابت للمتجر */}
        <Navbar categories={storeData?.categories?.map(cat => ({
          ...cat,
          product_count: cat.product_count || 0
        }))} />
        
        <Button 
          variant="outline" 
          size="sm" 
          className="fixed bottom-4 right-4 z-[100] bg-primary/10 hover:bg-primary/20 print:hidden"
          onClick={handleReload}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          إعادة تحميل
        </Button>
        
        {/* إضافة المساحة المناسبة للنافبار الثابت */}
        <main className="flex-1 pt-16">
          {dataLoading && (!storeData || Object.keys(storeData).length === 0) && <SkeletonLoader type="banner" />}
          {!dataLoading && dataError && !storeData?.organization_details?.id && (
             <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
              <h1 className="text-2xl font-bold text-red-600 mb-4">حدث خطأ</h1>
              <p className="text-muted-foreground mb-4">{dataError}</p>
              <Button onClick={handleReload}><RefreshCw className="w-4 h-4 mr-2" />حاول مرة أخرى</Button>
            </div>
          )}
          {!dataLoading && !dataError && !storeData?.organization_details?.id && (
            <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)] p-4 text-center">
              <h1 className="text-2xl font-bold mb-4">المتجر غير موجود</h1>
              <p className="text-muted-foreground mb-4">لم نتمكن من العثور على المتجر. يرجى التحقق من الرابط.</p>
              <Link to="/"><Button>العودة للرئيسية</Button></Link>
            </div>
          )}

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
                  { storeSettings && <StoreTracking /> }
                  {componentsToRender.map((component, index) => {
                    let categoriesForProps: any[] = [];
                    if (component.type === 'product_categories') {
                      categoriesForProps = getExtendedCategories();
                    }

                    return (
                      <LazyLoad key={component.id || `component-${index}`}>
                        {(component.type === 'hero') && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                        {(component.type === 'product_categories') && (
                          <LazyProductCategories 
                            {...(component.settings as any)} 
                            categories={categoriesForProps}
                            allCategories={storeData?.categories || []} 
                          />
                        )}
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                          (() => {
                            return (
                              <LazyFeaturedProducts 
                                {...(component.settings as any)} 
                                organizationId={storeData.organization_details?.id} 
                              />
                            );
                          })()
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
        
        {/* الفوتر مع إعدادات ديناميكية من قاعدة البيانات */}
        {React.useMemo(() => {
          // إعدادات افتراضية للفوتر
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

          // دمج الإعدادات المخصصة مع الافتراضية
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

export default StorePage;
