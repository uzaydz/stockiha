import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import { useTranslation } from 'react-i18next';
import { getSupabaseClient } from '@/lib/supabase';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { useStoreInfo, useOrganizationSettings } from '@/hooks/useAppInitData';
import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';
import { convertDatabaseProductToStoreProduct } from '@/components/store/productUtils';
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
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const { t } = useTranslation();

  // النظام الموحد للتحميل
  const unifiedLoading = useUnifiedLoading();

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

  // البيانات الأساسية
  const storeInfo = useStoreInfo();
  const organizationSettingsFromInit = useOrganizationSettings();
  
  // 🔥 أولوية: إعدادات المؤسسة من الـ RPC (SharedStoreDataContext) ثم من AppInit
  const { organizationSettings: sharedOrgSettings, organization: sharedOrg } = useSharedStoreDataContext();
  const organizationSettings = sharedOrgSettings || organizationSettingsFromInit;
  
  // 🔥 تحسين: استخدام useMemo لاستخراج البيانات المطلوبة
  const extractedData = useMemo(() => {
    const storeName = organizationSettings?.site_name || storeInfo?.name || currentOrganization?.name || 'المتجر';
    const logoUrl = organizationSettings?.logo_url || storeInfo?.logo_url || null;
    const centralOrgId = storeInfo?.id || currentOrganization?.id || sharedOrg?.id || null;
    
    return { storeName, logoUrl, centralOrgId };
  }, [organizationSettings, storeInfo, currentOrganization, sharedOrg]);
  
  const { storeName, logoUrl, centralOrgId } = extractedData;
  
  // 🔥 تحسين: إنشاء storeInfo محسن للـ components
  const enhancedStoreInfo = useMemo(() => {
    if (storeInfo) return storeInfo; // إذا كان متوفر من useStoreInfo
    
    // إنشاء storeInfo من البيانات المتوفرة للنطاقات المخصصة
    if (centralOrgId && (currentOrganization || organizationSettings || sharedOrg)) {
      return {
        id: centralOrgId,
        name: organizationSettings?.site_name || currentOrganization?.name || sharedOrg?.name || 'المتجر',
        subdomain: currentOrganization?.subdomain || currentSubdomain,
        logo_url: organizationSettings?.logo_url || sharedOrg?.logo_url || null
      };
    }
    
    return null;
  }, [storeInfo, centralOrgId, currentOrganization, organizationSettings, currentSubdomain, sharedOrg]);
  
  // 🔥 تحسين: تطبيق الثيم باستخدام useCallback
  const applyTheme = useCallback(async () => {
    if (organizationSettings && centralOrgId) {
      try {
        const { forceApplyOrganizationTheme } = await import('@/lib/themeManager');
        
        forceApplyOrganizationTheme(centralOrgId, {
          theme_primary_color: organizationSettings.theme_primary_color,
          theme_secondary_color: organizationSettings.theme_secondary_color,
          theme_mode: organizationSettings.theme_mode,
          custom_css: organizationSettings.custom_css
        });
      } catch (error) {
        console.warn('فشل في تطبيق الثيم:', error);
      }
    }
  }, [organizationSettings, centralOrgId]);
  
  // 🔥 تطبيق الثيم عندما نحصل على إعدادات المؤسسة
  useEffect(() => {
    applyTheme();
  }, [applyTheme]);
  
  // البيانات المشتركة
  const {
    categories: sharedCategories,
    featuredProducts: sharedFeaturedProducts,
    components: sharedComponents,
    footerSettings: sharedFooterSettings,
    seoMeta: sharedSeoMeta,
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
  
  // إعدادات SEO (أولوية: seoMeta القادمة من RPC)
  const seoSettings = useMemo(() => {
    if (sharedSeoMeta) {
      return {
        title: sharedSeoMeta.title || storeName || 'المتجر الإلكتروني',
        description: sharedSeoMeta.description || `متجر ${storeName} - أفضل المنتجات بأفضل الأسعار`,
        keywords: sharedSeoMeta.keywords || '',
        ogImage: sharedSeoMeta.image || logoUrl || ''
      };
    }
    let settings = null;
    try {
      if (organizationSettings?.custom_js) {
        const customJsData = JSON.parse(organizationSettings.custom_js);
        settings = customJsData?.seoSettings;
      }
    } catch {}
    return {
      title: settings?.title || organizationSettings?.seo_store_title || storeName || 'المتجر الإلكتروني',
      description: settings?.description || organizationSettings?.seo_meta_description || `متجر ${storeName} - أفضل المنتجات بأفضل الأسعار`,
      keywords: settings?.keywords || '',
      ogImage: settings?.default_image_url || logoUrl || ''
    };
  }, [organizationSettings, storeName, logoUrl, sharedSeoMeta]);
  
  // تحديث حالة تحميل البيانات - إصلاح dependency issue
  useEffect(() => {
    if (unifiedLoadingRef.current) {
      unifiedLoadingRef.current.setDataLoading(sharedDataLoading);
    }
  }, [sharedDataLoading]); // إزالة unifiedLoading من dependencies
  
  // جلب المكونات المخصصة والمنتجات المميزة مع الاعتماد على بيانات السياق أولاً
  useEffect(() => {
    if (!centralOrgId) return;

    // 1) المكوّنات: استخدم القادمة من الـ RPC إن توفرت
    if (sharedComponents && sharedComponents.length > 0) {
      const convertedComponents: StoreComponent[] = sharedComponents
        .filter((comp: any) => comp?.isActive !== false)
        .map((comp: any) => ({
          id: comp.id,
          type: (comp.type || comp.component_type) as ComponentType,
          settings: comp.settings || {},
          isActive: comp.isActive ?? comp.is_active ?? true,
          orderIndex: comp.orderIndex ?? comp.order_index ?? 0
        }))
        .sort((a, b) => a.orderIndex - b.orderIndex);
      setCustomComponents(convertedComponents);
    } else {
      // fallback خفيف: لا نطلق أي نداء هنا إذا لم تتوفر بيانات RPC. يمكن ترك المكوّنات الافتراضية
    }

    // 2) المنتجات المميزة: استخدم القادمة من الـ RPC إن توفرت
    if (sharedFeaturedProducts && sharedFeaturedProducts.length > 0) {
      const convertedProducts = sharedFeaturedProducts.map((dbProd: any) => {
        try {
          return convertDatabaseProductToStoreProduct(dbProd);
        } catch {
          // fallback بسيط إذا فشل التحويل
          return {
            id: dbProd.id,
            name: dbProd.name,
            description: dbProd.description || '',
            price: Number(dbProd.price || 0),
            discount_price: dbProd.compare_at_price ? Number(dbProd.compare_at_price) : undefined,
            imageUrl: dbProd.thumbnail_url || dbProd.thumbnail_image || dbProd.imageUrl || '',
            category: dbProd.product_categories?.name || dbProd.category || '',
            is_new: !!dbProd.is_new,
            stock_quantity: Number(dbProd.stock_quantity || 0),
            slug: dbProd.slug || dbProd.id,
            rating: 4.5
          };
        }
      });
      setFeaturedProducts(convertedProducts);
    }
  }, [centralOrgId, sharedComponents, sharedFeaturedProducts]);
  
  // جلب إعدادات الفوتر دون شبكة إذا توفرت من RPC أو من المكوّنات
  useEffect(() => {
    if (!centralOrgId) return;
    // 1) استخدم footerSettings القادمة من RPC إن توفرت
    if (sharedFooterSettings) {
      setFooterSettings(sharedFooterSettings);
      return;
    }
    // 2) حاول استخراج الفوتر من sharedComponents إن وُجد
    if (sharedComponents && sharedComponents.length > 0) {
      const footerComp = sharedComponents.find((c: any) => (c.type || c.component_type) === 'footer');
      if (footerComp?.settings) {
        setFooterSettings(footerComp.settings);
        return;
      }
    }
    // وإلا اترك الإعدادات الافتراضية (سيتم توليد Footer افتراضي في StoreLayout)
  }, [centralOrgId, sharedComponents, sharedFooterSettings]);
  
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
    }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
    
    if (isAppReady && !sharedDataLoading) {
      // إعطاء وقت قصير للمكونات الأساسية للتحميل
      const timer = setTimeout(() => {
        if (unifiedLoadingRef.current) {
          // console.log('✅ إيقاف التحميل - التطبيق جاهز');
          unifiedLoadingRef.current.setPageLoading(false);
        }
        clearTimeout(safetyTimer);
      }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
      
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
      }, 0); // ✅ إزالة التأخير لحل مشكلة عرض المتجر
      
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
  
  // 🔥 تحسين: استخدام useMemo للقيمة المرجعة لمنع إعادة الإنشاء
  const returnValue = useMemo(() => ({
    // بيانات أساسية
    storeInfo: enhancedStoreInfo,
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
  }), [
    enhancedStoreInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    componentsToRender,
    customComponents,
    sharedCategories,
    featuredProducts,
    mergedFooterSettings,
    seoSettings,
    unifiedLoading,
    isAppReady,
    refreshSharedData
  ]);

  return returnValue;
};
