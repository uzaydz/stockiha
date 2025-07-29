import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import Navbar from '@/components/Navbar';
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
import SkeletonLoader from './SkeletonLoader';
import { getSupabaseClient } from '@/lib/supabase';
import { Helmet } from 'react-helmet-async';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';

interface StorePageProps {
  // إزالة prop storeData لأننا نستخدم النظام المركزي الآن
}

const StorePage = ({}: StorePageProps) => {
  // ===== جميع الـ HOOKS في الأعلى بترتيب ثابت =====
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { t } = useTranslation();
  
  // 🚀 استخدام النظام المركزي - جميع البيانات من localStorage
  const storeInfo = useStoreInfo();
  const organizationSettings = useOrganizationSettings();
  
  // استخراج البيانات المطلوبة
  const storeName = storeInfo?.name || 'المتجر';
  const logoUrl = storeInfo?.logo_url;
  const centralOrgId = storeInfo?.id;
  
  // استخدام البيانات المشتركة للفئات
  const { 
    categories: sharedCategories, 
    isLoading: sharedDataLoading, 
    refreshData: refreshSharedData 
  } = useSharedStoreData();
  
  // حالات محلية مبسطة
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  
  // المكونات الافتراضية للمتجر - useMemo دائماً في نفس المكان
  const defaultStoreComponents: StoreComponent[] = useMemo(() => [
    { 
      id: 'banner-default', 
      type: 'hero', 
      settings: { 
        title: storeName || 'المتجر الإلكتروني', 
        subtitle: 'أفضل المنتجات بأفضل الأسعار' 
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
        title: `عن ${storeName || 'المتجر'}`, 
        content: 'مرحباً بك في متجرنا.' 
      }, 
      isActive: true, 
      orderIndex: 5 
    },
    { 
      id: 'contact-default', 
      type: 'contact', 
      settings: {}, 
      isActive: true, 
      orderIndex: 6 
    },
  ], [storeName]);
  
  // تحديد المكونات للعرض - useMemo دائماً في نفس المكان
  const componentsToRender = useMemo(() => {
    if (customComponents.length > 0) {
      return customComponents
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
    }
    return defaultStoreComponents;
  }, [customComponents, defaultStoreComponents]);
  
  // إعدادات SEO - useMemo دائماً في نفس المكان
  const seoSettings = useMemo(() => {
    let settings = null;
    try {
      if (organizationSettings?.custom_js) {
        const customJsData = JSON.parse(organizationSettings.custom_js);
        settings = customJsData?.seoSettings;
      }
    } catch (error) {
      // تجاهل أخطاء تحليل JSON
    }
    
    return {
      title: settings?.title || organizationSettings?.seo_store_title || storeName || 'المتجر الإلكتروني',
      description: settings?.description || organizationSettings?.seo_meta_description || `متجر ${storeName} - أفضل المنتجات بأفضل الأسعار`,
      keywords: settings?.keywords || '',
      ogImage: settings?.default_image_url || logoUrl || '',
      ...settings
    };
  }, [organizationSettings, storeName, logoUrl]);
  
  // ===== جلب البيانات =====
  
  // جلب المكونات المخصصة والمنتجات المميزة
  useEffect(() => {
    if (!centralOrgId) return;
    
    const fetchStoreData = async () => {
      try {
        const supabase = getSupabaseClient();
        
        // جلب المكونات المخصصة
        const { data: componentsData } = await supabase
          .from('store_settings')
          .select('*')
          .eq('organization_id', centralOrgId)
          .eq('is_active', true)
          .neq('component_type', 'footer')
          .neq('component_type', 'seo_settings')
          .order('order_index');
        
        if (componentsData) {
          // تحويل البيانات إلى النوع الصحيح
          const convertedComponents: StoreComponent[] = componentsData.map(comp => ({
            id: comp.id,
            type: comp.component_type as ComponentType,
            settings: comp.settings || {},
            isActive: comp.is_active,
            orderIndex: comp.order_index
          }));
          setCustomComponents(convertedComponents);
        }
        
        // جلب المنتجات المميزة
        setIsLoadingProducts(true);
        const { data: productsData } = await supabase
          .from('products')
          .select(`
            id, name, description, price, compare_at_price,
            thumbnail_image, slug, stock_quantity, is_new,
            product_categories(name)
          `)
          .eq('organization_id', centralOrgId)
          .eq('is_active', true)
          .eq('is_featured', true)
          .limit(8);
        
        if (productsData) {
          const convertedProducts = productsData.map(product => ({
            id: product.id,
            name: product.name,
            description: product.description || '',
            price: Number(product.price || 0),
            discount_price: product.compare_at_price ? Number(product.compare_at_price) : undefined,
            imageUrl: product.thumbnail_image || 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1470',
            category: product.product_categories?.name || '',
            is_new: !!product.is_new,
            stock_quantity: Number(product.stock_quantity || 0),
            slug: product.slug || product.id,
            rating: 4.5
          }));
          setFeaturedProducts(convertedProducts);
        }
        
      } catch (error) {
        console.error('خطأ في جلب بيانات المتجر:', error);
      } finally {
        setIsLoadingProducts(false);
      }
    };
    
    fetchStoreData();
  }, [centralOrgId]);
  
  // جلب إعدادات الفوتر
  useEffect(() => {
    if (!centralOrgId) return;
    
    const fetchFooterSettings = async () => {
      try {
      const supabase = getSupabaseClient();
        const { data: footerData } = await supabase
          .from('store_settings')
          .select('settings')
          .eq('organization_id', centralOrgId)
          .eq('component_type', 'footer')
          .eq('is_active', true)
        .maybeSingle();
        
        if (footerData?.settings) {
          setFooterSettings(footerData.settings);
        }
      } catch (error) {
        console.error('خطأ في جلب إعدادات الفوتر:', error);
      }
    };
    
    fetchFooterSettings();
  }, [centralOrgId]);
  
  // تحديث عنوان الصفحة
  useEffect(() => {
    if (storeName) {
    document.title = `${storeName} | سطوكيها - المتجر الإلكتروني`;
    }
  }, [storeName]);

  // ===== المنطق والعرض =====
  
  // تحديد ما إذا كان التطبيق جاهز للعرض
  const isAppReady = storeInfo && organizationSettings && centralOrgId && storeName;
  
  // شاشة التحميل
  if (!isAppReady) {
    return <SkeletonLoader type="banner" />;
  }

  // إذا لم يتم العثور على المؤسسة
  if (!centralOrgId) {
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

  return (
    <>
      {/* إعدادات SEO */}
      <Helmet>
        <title>{seoSettings.title}</title>
        <meta name="description" content={seoSettings.description} />
        {seoSettings.keywords && <meta name="keywords" content={seoSettings.keywords} />}
        
        {/* Open Graph Tags */}
        {seoSettings.enable_open_graph !== false && (
          <>
            <meta property="og:title" content={seoSettings.title} />
            <meta property="og:description" content={seoSettings.description} />
                <meta property="og:type" content="website" />
                <meta property="og:url" content={window.location.href} />
            {seoSettings.ogImage && <meta property="og:image" content={seoSettings.ogImage} />}
                <meta property="og:site_name" content={storeName} />
              </>
            )}
            
            {/* Twitter Cards */}
        {seoSettings.enable_twitter_cards !== false && (
              <>
                <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoSettings.title} />
            <meta name="twitter:description" content={seoSettings.description} />
            {seoSettings.ogImage && <meta name="twitter:image" content={seoSettings.ogImage} />}
              </>
            )}
            
        <meta name="robots" content="index, follow" />
              <link rel="canonical" href={window.location.href} />
      </Helmet>
      
      {/* CSS مخصص */}
      {organizationSettings?.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: organizationSettings.custom_css }} />
      )}
      
      {/* JavaScript مخصص للرأس */}
      {organizationSettings?.custom_js_header && (
        <script dangerouslySetInnerHTML={{ __html: organizationSettings.custom_js_header }} />
      )}
      
      <div className="flex flex-col min-h-screen bg-background relative">
        {/* النافبار */}
        <Navbar categories={sharedCategories?.map(cat => ({
          ...cat,
          product_count: cat.product_count || 0
        })) || []} />
        
        {/* المحتوى الرئيسي */}
        <main className="flex-1">
          {/* فحص وضع الصيانة */}
          {organizationSettings?.maintenance_mode ? (
                <div className="container py-10 text-center">
                  <h1 className="text-3xl font-bold mb-4">المتجر تحت الصيانة</h1>
                  <p className="text-xl text-muted-foreground">
                {organizationSettings.maintenance_message || 'نحن نقوم ببعض التحديثات وسنعود قريبًا. شكرًا لصبركم!'}
                  </p>
                </div>
          ) : (
            <>
              {/* تتبع المتجر */}
              {organizationSettings && <StoreTracking />}
              
              {/* عرض المكونات */}
              {componentsToRender.map((component, index) => (
                      <LazyLoad key={component.id || `component-${index}`}>
                  {component.type === 'hero' && (
                          <LazyStoreBanner heroData={component.settings as any} />
                        )}
                  
                  {component.type === 'product_categories' && (
                              <LazyProductCategories 
                                title={component.settings?.title}
                                description={component.settings?.description}
                                useRealCategories={component.settings?.useRealCategories ?? true}
                      categories={sharedCategories || []}
                                settings={component.settings}
                              />
                        )}
                  
                        {(component.type === 'featured_products' || component.type === 'featuredproducts') && (
                              <LazyFeaturedProducts 
                                {...(component.settings as any)} 
                      organizationId={centralOrgId}
                      products={featuredProducts}
                      displayCount={featuredProducts.length || component.settings?.displayCount || 4}
                    />
                  )}
                  
                  {component.type === 'testimonials' && (
                    <LazyCustomerTestimonials 
                      {...(component.settings as any)} 
                      organizationId={centralOrgId}
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
                      email={organizationSettings?.contact_email} 
                    />
                  )}
                  
                  {component.type === 'services' && (
                          <StoreServices {...(component.settings as any)} />
                        )}
                  
                  {component.type === 'countdownoffers' && (
                    <LazyComponentPreview 
                      component={{ ...component, type: component.type as ComponentType }} 
                    />
                        )}
                      </LazyLoad>
              ))}
            </>
          )}
        </main>
        
        {/* الفوتر */}
        <LazyStoreFooter {...(() => {
          const defaultFooterSettings = getDefaultFooterSettings(
            storeName, 
            { organization_details: { name: storeName } }, 
            t
          );
          return mergeFooterSettings(defaultFooterSettings, footerSettings);
        })()} />
      </div>
      
      {/* JavaScript مخصص للتذييل */}
      {organizationSettings?.custom_js_footer && (
        <script dangerouslySetInnerHTML={{ __html: organizationSettings.custom_js_footer }} />
      )}
    </>
  );
};

export default StorePage;
