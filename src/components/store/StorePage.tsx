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
import SkeletonLoader, { SkeletonLoaderProps } from './SkeletonLoader';
import { updateOrganizationTheme } from '@/lib/themeManager';
import { getSupabaseClient } from '@/lib/supabase';
// استيراد الخدمة المحسنة
import { 
  getStoreDataProgressive, 
  forceReloadStoreData, 
  StoreInitializationData, 
  Product as StoreProduct
} from '@/api/optimizedStoreDataService';
// الاحتفاظ بالخدمة القديمة كـ fallback
import { 
  getStoreDataFast as getStoreDataFallback
} from '@/api/storeDataService';
import type { OrganizationSettings } from '@/types/settings';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';

interface StorePageProps {
  storeData?: Partial<StoreInitializationData>;
}

const StorePage = ({ storeData: initialStoreData = {} }: StorePageProps) => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { t } = useTranslation();
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(initialStoreData && Object.keys(initialStoreData).length > 0 ? initialStoreData : null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const dataFetchAttempted = useRef(false);
  const forceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // PERFORMANCE OPTIMIZATION: Memoized store name calculation
  const storeName = useMemo(() => {
    const nameFromDetails = storeData?.organization_details?.name;
    const nameFromSettings = storeSettings?.site_name;
    return nameFromDetails || nameFromSettings || currentSubdomain || 'المتجر الإلكتروني';
  }, [storeData?.organization_details?.name, storeSettings?.site_name, currentSubdomain]);
  
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

  // PERFORMANCE OPTIMIZATION: Memoized categories calculation
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

  // تطبيق ثيم المؤسسة مع منع التطبيق المتكرر
  const applyOrganizationThemeWithRetry = useCallback((orgId: string, settings: {
    theme_primary_color?: string;
    theme_secondary_color?: string;
    theme_mode?: 'light' | 'dark' | 'auto';
    custom_css?: string;
  }) => {
    // تطبيق الثيم مرة واحدة فقط
    updateOrganizationTheme(orgId, {
      theme_primary_color: settings.theme_primary_color,
      theme_secondary_color: settings.theme_secondary_color,
      theme_mode: settings.theme_mode,
      custom_css: settings.custom_css
    });
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
      // تجنب التحميل المتكرر
      if (dataFetchAttempted.current) return;
      
      // إذا كانت البيانات موجودة مسبقاً، استخدمها مباشرة
      if (initialStoreData && Object.keys(initialStoreData).length > 0) {
        setStoreData(initialStoreData);
        setStoreSettings(initialStoreData.organization_settings || null);
        setCustomComponents(initialStoreData.store_layout_components || []);
        setDataLoading(false); 
        dataFetchAttempted.current = true;
        
        // تطبيق الثيم إذا كان متاحاً
        if (initialStoreData.organization_settings && currentOrganization?.id) {
          applyOrganizationThemeWithRetry(currentOrganization.id, {
            theme_primary_color: initialStoreData.organization_settings.theme_primary_color,
            theme_secondary_color: initialStoreData.organization_settings.theme_secondary_color,
            theme_mode: (initialStoreData.organization_settings as any).theme_mode,
            custom_css: initialStoreData.organization_settings.custom_css
          });
        }
        return;
      }

      // بدء تحميل جديد للبيانات
      dataFetchAttempted.current = true;
      setDataLoading(true);
      setDataError(null);

      let subdomainToUse = currentSubdomain;

      // تحقق من النطاق المخصص
      const customDomainSubdomain = await checkCustomDomainAndLoadData();
      if (typeof customDomainSubdomain === 'string') {
        subdomainToUse = customDomainSubdomain;
      }

      if (!subdomainToUse) {
        setDataLoading(false);
        setDataError("لم يتم تحديد المتجر. يرجى التحقق من الرابط.");
        return;
      }
      
      try {
        // استخدام الخدمة المحسنة مباشرة
        const result = await getStoreDataProgressive(subdomainToUse);

        if (result.data?.error) {
          setDataError(result.data.error);
          setStoreData(null); 
          setStoreSettings(null);
          setCustomComponents([]);
        } else if (result.data) {
          setStoreData(result.data);
          setStoreSettings(result.data.organization_settings || null);
          setCustomComponents(result.data.store_layout_components || []);
          
          // تطبيق الثيم مرة واحدة فقط
          if (result.data.organization_settings && currentOrganization?.id) {
            applyOrganizationThemeWithRetry(currentOrganization.id, {
              theme_primary_color: result.data.organization_settings.theme_primary_color,
              theme_secondary_color: result.data.organization_settings.theme_secondary_color,
              theme_mode: (result.data.organization_settings as any).theme_mode,
              custom_css: result.data.organization_settings.custom_css
            });
          }
        } else {
          setDataError("لم يتم العثور على بيانات للمتجر أو قد تكون البيانات فارغة.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } catch (error: any) {
        // في حالة فشل الخدمة المحسنة، استخدم الخدمة القديمة كـ fallback
        try {
          const fallbackResult = await getStoreDataFallback(subdomainToUse);
          if (fallbackResult.data?.error) {
            setDataError(fallbackResult.data.error);
            setStoreData(null);
            setStoreSettings(null);
            setCustomComponents([]);
          } else if (fallbackResult.data) {
            setStoreData(fallbackResult.data);
            setStoreSettings(fallbackResult.data.organization_settings || null);
            setCustomComponents(fallbackResult.data.store_layout_components || []);
          }
        } catch (fallbackError: any) {
          setDataError(fallbackError.message || "خطأ غير معروف أثناء تحميل البيانات.");
          setStoreData(null);
          setStoreSettings(null);
          setCustomComponents([]);
        }
      } finally {
        setDataLoading(false);
      }
    };
    
          loadStoreData();
  }, [currentSubdomain]);
  
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
                theme_mode: (result.data.organization_settings as any).theme_mode,
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

  // تحميل إعدادات الفوتر من قاعدة البيانات مع مراقبة التغييرات
  useEffect(() => {
    if (!storeData?.organization_details?.id) return;

    const initializeFooterSettings = async () => {
      const supabase = await getSupabaseClient();
      
      const fetchFooterSettings = async () => {
        try {
          const { data: footerData, error } = await supabase
            .from('store_settings')
            .select('settings')
            .eq('organization_id', storeData.organization_details.id)
            .eq('component_type', 'footer')
            .eq('is_active', true)
            .maybeSingle();

          if (!error && footerData?.settings) {
            setFooterSettings(footerData.settings);
          } else {
          }
        } catch (error) {
        }
      };

      // جلب الإعدادات للمرة الأولى
      await fetchFooterSettings();


      // إعداد مراقب للتغييرات في الوقت الفعلي مع error handling
      let subscription: any = null;
      
      try {
        subscription = supabase
          .channel('footer-settings-changes')
          .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'store_settings',
            filter: `organization_id=eq.${storeData.organization_details.id} AND component_type=eq.footer`
          }, (payload) => {
            // إعادة جلب الإعدادات عند حدوث تغيير
            fetchFooterSettings();
          })
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              console.log('✅ اشتراك Realtime نجح للفوتر');
            } else if (status === 'CHANNEL_ERROR') {
              console.warn('⚠️ خطأ في اشتراك Realtime للفوتر، سيتم تجاهل التحديثات المباشرة');
            } else if (status === 'TIMED_OUT') {
              console.warn('⏱️ انتهت مهلة اشتراك Realtime للفوتر');
            } else if (status === 'CLOSED') {
              console.log('🔌 تم إغلاق اشتراك Realtime للفوتر');
            }
          });
      } catch (error) {
        console.warn('⚠️ فشل في إعداد Realtime subscription للفوتر:', error);
        // في حالة فشل الـ realtime، يمكن إضافة polling كبديل
        // setInterval(fetchFooterSettings, 30000); // تحديث كل 30 ثانية
      }

      // إرجاع دالة التنظيف
      return () => {
        if (subscription) {
          try {
            subscription.unsubscribe();
          } catch (error) {
            console.warn('تحذير: فشل في إلغاء اشتراك Realtime:', error);
          }
        }
      };
    };

    let cleanup: (() => void) | undefined;
    
    initializeFooterSettings().then((cleanupFn) => {
      cleanup = cleanupFn;
    }).catch((error) => {
      console.warn('فشل في تهيئة إعدادات الفوتر:', error);
    });

    // تنظيف المراقب عند انتهاء المكون
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
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
                      categoriesForProps = extendedCategories;
                    }

                    return (
                      <LazyLoad key={component.id || `component-${index}`}>
                        {(component.type === 'hero') && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                        {(component.type === 'product_categories') && (
                          (() => {
                            return (
                              <LazyProductCategories 
                                title={component.settings?.title}
                                description={component.settings?.description}
                                useRealCategories={component.settings?.useRealCategories ?? true}
                                categories={categoriesForProps}
                                settings={component.settings}
                              />
                            );
                          })()
                        )}
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                          (() => {
                            // تحويل البيانات الخام من قاعدة البيانات إلى تنسيق المنتجات للواجهة
                            const convertDatabaseProductToStoreProduct = (dbProduct: any) => {
                              let categoryName = '';
                              if (dbProduct.category) {
                                if (typeof dbProduct.category === 'object' && dbProduct.category.name) {
                                  categoryName = dbProduct.category.name;
                                } else if (typeof dbProduct.category === 'string') {
                                  categoryName = dbProduct.category;
                                }
                              } else if (dbProduct.category_name) {
                                categoryName = dbProduct.category_name;
                              }
                              
                              // معالجة روابط الصور
                              let imageUrl = '';
                              if (dbProduct.thumbnail_url) {
                                imageUrl = dbProduct.thumbnail_url.trim();
                              } else if (dbProduct.thumbnail_image) {
                                imageUrl = dbProduct.thumbnail_image.trim();
                              }
                              
                              // تصحيح الرابط إذا لزم الأمر
                              if (imageUrl) {
                                if (imageUrl.startsWith('"') && imageUrl.endsWith('"')) {
                                  imageUrl = imageUrl.substring(1, imageUrl.length - 1);
                                }
                                if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
                                  if (imageUrl.startsWith('//')) {
                                    imageUrl = `https:${imageUrl}`;
                                  } else if (imageUrl.startsWith('/')) {
                                    const baseUrl = window.location.origin;
                                    imageUrl = `${baseUrl}${imageUrl}`;
                                  } else {
                                    imageUrl = `https://${imageUrl}`;
                                  }
                                }
                                imageUrl = imageUrl.replace(/\s+/g, '%20');
                              } else {
                                imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470';
                              }

                              return {
                                id: dbProduct.id,
                                name: dbProduct.name,
                                description: dbProduct.description || '',
                                price: Number(dbProduct.price || 0),
                                discount_price: dbProduct.compare_at_price ? Number(dbProduct.compare_at_price) : undefined,
                                imageUrl: imageUrl,
                                category: categoryName,
                                is_new: !!dbProduct.is_new,
                                stock_quantity: Number(dbProduct.stock_quantity || 0),
                                slug: typeof dbProduct.slug === 'string' ? dbProduct.slug : dbProduct.id,
                                rating: 4.5
                              };
                            };

                            // تحديد المنتجات بناءً على طريقة الاختيار
                            let convertedProducts = [];

                            // إذا كان الاختيار يدوياً واحتوت الإعدادات على منتجات محددة
                            if (component.settings?.selectionMethod === 'manual' && component.settings?.selectedProducts?.length > 0) {
                              // تمرير قائمة فارغة - سيقوم مكون FeaturedProducts بجلب المنتجات المحددة يدوياً بنفسه
                              convertedProducts = [];
                            } else {
                              // استخدام المنتجات المميزة الافتراضية
                              const rawFeaturedProducts = storeData?.featured_products || [];
                              convertedProducts = rawFeaturedProducts.map(convertDatabaseProductToStoreProduct);
                            }

                            // تحديد معرف المؤسسة الصحيح
                            const getOrganizationId = () => {
                              // 1. محاولة الحصول عليه من storeData
                              if (storeData?.organization_details?.id) {
                                return storeData.organization_details.id;
                              }
                              
                              // 2. محاولة الحصول عليه من localStorage
                              const storedOrgId = localStorage.getItem('bazaar_organization_id');
                              if (storedOrgId) {
                                return storedOrgId;
                              }
                              
                              // 3. إذا كان النطاق الفرعي "asraycollection"، استخدم المعرف المعروف
                              const hostname = window.location.hostname;
                              if (hostname.includes('asraycollection')) {
                                return '560e2c06-d13c-4853-abcf-d41f017469cf';
                              }
                              
                              return null;
                            };

                            const finalOrgId = getOrganizationId();

                            return (
                              <LazyFeaturedProducts 
                                {...(component.settings as any)} 
                                organizationId={finalOrgId}
                                products={convertedProducts}
                                displayCount={convertedProducts.length || component.settings?.displayCount || 4}
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
          // إعدادات افتراضية للفوتر باستخدام الدالة المشتركة
          const defaultFooterSettings = getDefaultFooterSettings(storeName, storeData, t);

          // دمج الإعدادات المخصصة مع الافتراضية
          const finalFooterSettings = mergeFooterSettings(defaultFooterSettings, footerSettings);

          return (
            <LazyStoreFooter {...finalFooterSettings} />
          );
        }, [footerSettings, storeName, storeData, t])}
      </div>
      {storeSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: storeSettings.custom_js_footer }} />
      )}
    </>
  );
};

export default StorePage;
