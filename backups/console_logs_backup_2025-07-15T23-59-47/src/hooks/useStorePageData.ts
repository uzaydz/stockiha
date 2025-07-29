import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '@/lib/supabase';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';
import { useUnifiedLoading } from './useUnifiedLoading';

export interface UseStorePageDataReturn {
  // بيانات أساسية
  storeInfo: any;
  organizationSettings: any;
  storeName: string;
  logoUrl: string;
  centralOrgId: string;
  
  // بيانات المكونات
  componentsToRender: StoreComponent[];
  customComponents: StoreComponent[];
  
  // بيانات الفئات والمنتجات
  categories: any[];
  featuredProducts: any[];
  
  // إعدادات
  footerSettings: any;
  seoSettings: any;
  
  // حالات التحميل - موحدة
  unifiedLoading: ReturnType<typeof useUnifiedLoading>;
  isAppReady: boolean;
  
  // وظائف
  refreshData: () => void;
}

export const useStorePageData = (): UseStorePageDataReturn => {
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { t } = useTranslation();
  
  // النظام الموحد للتحميل
  const unifiedLoading = useUnifiedLoading();
  
  // البيانات الأساسية
  const storeInfo = useStoreInfo();
  const organizationSettings = useOrganizationSettings();
  
  // استخراج البيانات المطلوبة
  const storeName = storeInfo?.name || 'المتجر';
  const logoUrl = storeInfo?.logo_url;
  const centralOrgId = storeInfo?.id;
  
  // البيانات المشتركة
  const { 
    categories: sharedCategories, 
    isLoading: sharedDataLoading, 
    refreshData: refreshSharedData 
  } = useSharedStoreDataContext();
  
  // حالات محلية
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const [customComponents, setCustomComponents] = useState<StoreComponent[]>([]);
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  
  // استخدام refs لتجنب dependency issues
  const unifiedLoadingRef = useRef(unifiedLoading);
  unifiedLoadingRef.current = unifiedLoading;
  
  // المكونات الافتراضية
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
  
  // تحديد المكونات للعرض
  const componentsToRender = useMemo(() => {
    const components = customComponents.length > 0 
      ? customComponents
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
          .sort((a, b) => a.orderIndex - b.orderIndex)
      : defaultStoreComponents;
    
    // تحديث عدد المكونات الإجمالي باستخدام ref
    if (unifiedLoadingRef.current) {
      unifiedLoadingRef.current.setTotalComponents(components.length);
    }
    
    return components;
  }, [customComponents, defaultStoreComponents]);
  
  // إعدادات SEO
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
  
  // تحديث حالة تحميل البيانات - إصلاح dependency issue
  useEffect(() => {
    if (unifiedLoadingRef.current) {
      unifiedLoadingRef.current.setDataLoading(sharedDataLoading);
    }
  }, [sharedDataLoading]); // إزالة unifiedLoading من dependencies
  
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
  
  // تحديد ما إذا كان التطبيق جاهز للعرض
  const isAppReady = storeInfo && organizationSettings && centralOrgId && storeName;
  
  // تحديث حالة تحميل الصفحة - إصلاح dependency issue مع timeout أمان
  useEffect(() => {
    // إعداد timeout أمان لإيقاف التحميل حتى لو لم تكن الشروط مكتملة
    const safetyTimer = setTimeout(() => {
      if (unifiedLoadingRef.current) {
                  // console.log('🚨 إيقاف التحميل بسبب timeout الأمان');
        unifiedLoadingRef.current.setPageLoading(false);
        unifiedLoadingRef.current.setDataLoading(false);
      }
    }, 10000); // 10 ثوان كحد أقصى
    
    if (isAppReady && !sharedDataLoading) {
      // إعطاء وقت قصير للمكونات الأساسية للتحميل
      const timer = setTimeout(() => {
        if (unifiedLoadingRef.current) {
          // console.log('✅ إيقاف التحميل - التطبيق جاهز');
          unifiedLoadingRef.current.setPageLoading(false);
        }
        clearTimeout(safetyTimer);
      }, 500);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
    
    // إذا كان هناك خطأ في التحميل، أوقف المؤشر
    if (!sharedDataLoading && !isAppReady) {
      const errorTimer = setTimeout(() => {
        if (unifiedLoadingRef.current) {
          // console.log('⚠️ إيقاف التحميل - البيانات غير مكتملة');
          unifiedLoadingRef.current.setPageLoading(false);
          unifiedLoadingRef.current.setDataLoading(false);
        }
        clearTimeout(safetyTimer);
      }, 3000); // 3 ثوان للبيانات غير المكتملة
      
      return () => {
        clearTimeout(errorTimer);
        clearTimeout(safetyTimer);
      };
    }
    
    return () => clearTimeout(safetyTimer);
  }, [isAppReady, sharedDataLoading]);
  
  // دمج إعدادات الفوتر
  const mergedFooterSettings = useMemo(() => {
    const defaultFooterSettings = getDefaultFooterSettings(
      storeName, 
      { organization_details: { name: storeName } }, 
      t
    );
    return mergeFooterSettings(defaultFooterSettings, footerSettings);
  }, [storeName, footerSettings, t]);
  
  return {
    // بيانات أساسية
    storeInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    
    // بيانات المكونات
    componentsToRender,
    customComponents,
    
    // بيانات الفئات والمنتجات
    categories: sharedCategories || [],
    featuredProducts,
    
    // إعدادات
    footerSettings: mergedFooterSettings,
    seoSettings,
    
    // حالات التحميل - موحدة
    unifiedLoading,
    isAppReady,
    
    // وظائف
    refreshData: refreshSharedData,
  };
};
