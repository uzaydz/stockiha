import { useEffect, useMemo, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StoreComponent, ComponentType } from '@/types/store-editor';
import { useSharedStoreDataContext } from '@/context/SharedStoreDataContext';
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';

import { getDefaultFooterSettings, mergeFooterSettings } from '@/lib/footerSettings';
import { convertDatabaseProductToStoreProduct } from '@/components/store/productUtils';
import { useUnifiedLoading } from './useUnifiedLoading';

// دالة لتحويل أسماء المكونات من قاعدة البيانات إلى التنسيق المتوقع
function normalizeComponentType(dbType: string): string {
  const typeMap: { [key: string]: string } = {
    'featuredproducts': 'featured_products',
    'categories': 'product_categories',
    'hero': 'hero',
    'about': 'about',
    'testimonials': 'testimonials',
    'footer': 'footer',
    'seo_settings': 'seo_settings'
  };
  
  return typeMap[dbType] || dbType;
}

export interface UseStorePageDataReturn {
  // بيانات أساسية
  storeInfo: any;
  organizationSettings: any;
  storeName: string;
  logoUrl: string;
  centralOrgId: string;
  currentOrganization: any;
  
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
  hasStoreError: boolean;
  isLoadingStoreData: boolean;
  
  // وظائف
  refreshData: () => void;
}

export const useStorePageData = (): UseStorePageDataReturn => {
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
  // إضافة state لإجبار إعادة التقييم عند وصول البيانات المحقونة
  const [bazaarContextReady, setBazaarContextReady] = useState<number>(0);
  
  // Lightweight subdomain detection (avoids heavy AuthContext on store)
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const currentSubdomain = useMemo(() => extractSubdomainFromHostname(hostname), [hostname]);
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
  
  // 🔥 إصلاح: منع إعادة التقييم المتكرر
  const hasProcessedContextReady = useRef(false);

  // مراقبة وصول البيانات المحقونة - مرة واحدة فقط
  useEffect(() => {
    if (hasProcessedContextReady.current) {
      return;
    }

    const handleBazaarContextReady = () => {
      if (!hasProcessedContextReady.current) {
        hasProcessedContextReady.current = true;
        setBazaarContextReady(prev => prev + 1);
      }
    };

    window.addEventListener('bazaarStoreContextReady', handleBazaarContextReady);

    return () => {
      window.removeEventListener('bazaarStoreContextReady', handleBazaarContextReady);
    };
  }, []);

  // البيانات الأساسية من useSharedStoreDataContext
  const { organizationSettings: sharedOrgSettings, organization: sharedOrg } = useSharedStoreDataContext();
  const organizationSettings = sharedOrgSettings;
  
  // إزالة logging للإنتاج

  // 🔥 تحسين: استخدام useMemo لاستخراج البيانات المطلوبة مع fallback لـ window object
  const extractedData = useMemo(() => {
    let storeName = organizationSettings?.site_name || sharedOrg?.name || '';
    let logoUrl = organizationSettings?.logo_url || sharedOrg?.logo_url || null;
    let centralOrgId = sharedOrg?.id || null;

    // fallback: إذا لم تكن البيانات متوفرة، ابحث في window object مباشرة
    if (!storeName || !centralOrgId) {
      try {
        const win: any = typeof window !== 'undefined' ? window : {};
        
        // التحقق من البيانات المحقونة مباشرة
        const bazaarContext = win.__BAZAAR_STORE_CONTEXT__;
        if (bazaarContext && (bazaarContext.organization || bazaarContext.organizationSettings)) {
          if (bazaarContext.organization?.id && !centralOrgId) {
            centralOrgId = bazaarContext.organization.id;
          }
          if (!storeName) {
            storeName = bazaarContext.organizationSettings?.site_name || bazaarContext.organization?.name || '';
          }
          if (!logoUrl) {
            logoUrl = bazaarContext.organizationSettings?.logo_url || bazaarContext.organization?.logo_url || null;
          }
        }
        
        // fallback للطريقة القديمة
        const windowData = win.__EARLY_STORE_DATA__?.data ||
                           win.__CURRENT_STORE_DATA__ ||
                           win.__PREFETCHED_STORE_DATA__ ||
                           null;
        
        if (windowData) {
          const orgDetails = windowData.organization_details || windowData.organization;
          const orgSettings = windowData.organization_settings || windowData.organizationSettings;
          
          if (orgDetails && !centralOrgId) {
            centralOrgId = orgDetails.id;
          }
          if ((orgSettings?.site_name || orgDetails?.name) && !storeName) {
            storeName = orgSettings?.site_name || orgDetails?.name || '';
          }
          if ((orgSettings?.logo_url || orgDetails?.logo_url) && !logoUrl) {
            logoUrl = orgSettings?.logo_url || orgDetails?.logo_url || null;
          }
          
          // إزالة logging للإنتاج
        }
      } catch (error) {
        // تجاهل الأخطاء
      }
    }

    return { storeName, logoUrl, centralOrgId };
  }, [organizationSettings, sharedOrg, bazaarContextReady]);
  
  const { storeName, logoUrl, centralOrgId } = extractedData;
  
  // 🔥 تحسين: إنشاء storeInfo محسن للـ components
  const enhancedStoreInfo = useMemo(() => {
    if (centralOrgId && (organizationSettings || sharedOrg)) {
      return {
        id: centralOrgId,
        name: organizationSettings?.site_name || sharedOrg?.name || '',
        subdomain: sharedOrg?.subdomain || currentSubdomain,
        logo_url: organizationSettings?.logo_url || sharedOrg?.logo_url || null
      };
    }

    return null;
  }, [centralOrgId, organizationSettings, currentSubdomain, sharedOrg]);
  
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
    error: sharedDataError,
    refreshData: refreshSharedData
  } = useSharedStoreDataContext();

  const hasSharedDataError = Boolean(sharedDataError);

  // 🔥 إصلاح: إذا لم نحصل على مكونات من useSharedStoreDataContext، فجرب البحث في window object مباشرة
  // إصلاح: استخدام sharedComponents.length بدلاً من sharedComponents لتقليل إعادة الحساب
  const fallbackComponents = useMemo(() => {
    if (sharedComponents && sharedComponents.length > 0) {
      return sharedComponents;
    }

    // جرب البحث في window object
    try {
      const win: any = typeof window !== 'undefined' ? window : {};
      const windowData = win.__EARLY_STORE_DATA__?.data ||
                         win.__CURRENT_STORE_DATA__ ||
                         win.__PREFETCHED_STORE_DATA__ ||
                         null;
      if (windowData?.store_layout_components && windowData.store_layout_components.length > 0) {
        return windowData.store_layout_components;
      }
    } catch (error) {
      console.warn('⚠️ خطأ في قراءة مكونات window object:', error);
    }

    return sharedComponents || [];
  }, [sharedComponents?.length]); // استخدام length بدلاً من الكامل array لتقليل re-calculations

  // إزالة console.log المتكرر لتحسين الأداء

  // إزالة الاستدعاء المكرر - البيانات تأتي من useSharedStoreData
  
  // حالات محلية
  const unifiedLoadingRef = useRef(unifiedLoading);
  unifiedLoadingRef.current = unifiedLoading;

  const componentsCacheRef = useRef<{ key: string; data: StoreComponent[] }>({ key: 'loading', data: [] });
  const featuredCacheRef = useRef<{ key: string; data: any[] }>({ key: 'empty', data: [] });
  const categoriesCacheRef = useRef<{ key: string; data: any[] }>({ key: 'empty', data: [] });
  
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
  
  const componentsToRender = useMemo(() => {
    if (!centralOrgId && !hasSharedDataError) {
      if (componentsCacheRef.current.key !== 'awaiting-org') {
        componentsCacheRef.current = { key: 'awaiting-org', data: [] };
      }
      return componentsCacheRef.current.data;
    }

    if (sharedDataLoading) {
      if (componentsCacheRef.current.key !== 'loading') {
        componentsCacheRef.current = { key: 'loading', data: [] };
      }
      return componentsCacheRef.current.data;
    }

    const hasFallback = Array.isArray(fallbackComponents) && fallbackComponents.length > 0;
    const fallbackHasOnlyPlaceholders = hasFallback &&
      fallbackComponents!.every((comp: any) => comp?.id?.startsWith('fallback-'));

    const resolvedComponents =
      sharedComponents && sharedComponents.length > 0
        ? sharedComponents
        : (hasFallback && !fallbackHasOnlyPlaceholders)
          ? fallbackComponents
          : null;

    if (resolvedComponents && resolvedComponents.length > 0) {
      const signature = resolvedComponents
        .map((comp: any) => {
          const id = comp?.id || '';
          const updated = comp?.updated_at || comp?.updatedAt || '';
          const active = comp?.is_active ?? comp?.isActive ?? true;
          const order = comp?.order_index ?? comp?.orderIndex ?? 0;
          return `${id}:${updated}:${active ? 1 : 0}:${order}`;
        })
        .join('|');

      if (componentsCacheRef.current.key === signature) {
        return componentsCacheRef.current.data;
      }

      const normalized = resolvedComponents
        .filter((comp: any) => comp && (comp.isActive ?? comp.is_active ?? true))
        .map((comp: any) => {
          let normalizedType = normalizeComponentType(comp.type || comp.component_type).toLowerCase();
          if (normalizedType === 'categories') normalizedType = 'product_categories';
          if (normalizedType === 'featuredproducts') normalizedType = 'featured_products';

          return {
            id: comp.id,
            type: normalizedType as ComponentType,
            settings: comp.settings || {},
            isActive: comp.isActive ?? comp.is_active ?? true,
            orderIndex: comp.orderIndex ?? comp.order_index ?? 0
          };
        })
        .filter(component => component.isActive && component.type !== 'seo_settings' as ComponentType)
        .sort((a, b) => a.orderIndex - b.orderIndex);

      componentsCacheRef.current = { key: signature, data: normalized };
      return componentsCacheRef.current.data;
    }

    if (
      !sharedDataLoading &&
      centralOrgId &&
      Array.isArray(sharedComponents) &&
      sharedComponents.length === 0 &&
      (!hasFallback || fallbackHasOnlyPlaceholders)
    ) {
      if (componentsCacheRef.current.key !== 'default') {
        componentsCacheRef.current = { key: 'default', data: defaultStoreComponents };
      }
      return componentsCacheRef.current.data;
    }

    if (componentsCacheRef.current.key !== 'empty') {
      componentsCacheRef.current = { key: 'empty', data: [] };
    }
    return componentsCacheRef.current.data;
  }, [sharedComponents, fallbackComponents, sharedDataLoading, defaultStoreComponents, centralOrgId, hasSharedDataError]);

  const componentsCount = componentsToRender.length;
  useEffect(() => {
    if (unifiedLoadingRef.current) {
      unifiedLoadingRef.current.setTotalComponents(componentsCount);
    }
  }, [componentsCount]);
  
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
  
  const featuredProducts = useMemo(() => {
    if (!Array.isArray(sharedFeaturedProducts) || sharedFeaturedProducts.length === 0) {
      if (featuredCacheRef.current.key !== 'empty') {
        featuredCacheRef.current = { key: 'empty', data: [] };
      }
      return featuredCacheRef.current.data;
    }

    const signature = sharedFeaturedProducts
      .map((prod: any) => `${prod?.id ?? ''}:${prod?.updated_at ?? prod?.updatedAt ?? ''}:${prod?.price ?? ''}`)
      .join('|');

    if (featuredCacheRef.current.key === signature) {
      return featuredCacheRef.current.data;
    }

    const converted = sharedFeaturedProducts.map((dbProd: any) => {
      try {
        return convertDatabaseProductToStoreProduct(dbProd);
      } catch {
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

    featuredCacheRef.current = { key: signature, data: converted };
    return featuredCacheRef.current.data;
  }, [sharedFeaturedProducts]);

  const footerSettings = useMemo(() => {
    if (sharedFooterSettings) {
      return sharedFooterSettings;
    }

    const candidate = (sharedComponents && sharedComponents.length > 0 ? sharedComponents : fallbackComponents) || [];
    const footerComp = candidate.find((c: any) => normalizeComponentType(c?.type || c?.component_type) === 'footer');
    return footerComp?.settings || null;
  }, [sharedFooterSettings, sharedComponents, fallbackComponents]);

  const categories = useMemo(() => {
    if (!Array.isArray(sharedCategories) || sharedCategories.length === 0) {
      if (categoriesCacheRef.current.key !== 'empty') {
        categoriesCacheRef.current = { key: 'empty', data: [] };
      }
      return categoriesCacheRef.current.data;
    }

    const signature = sharedCategories
      .map((cat: any, index: number) => `${cat?.id ?? cat?.slug ?? index}:${cat?.updated_at ?? cat?.updatedAt ?? ''}:${cat?.name ?? ''}`)
      .join('|');

    if (categoriesCacheRef.current.key === signature) {
      return categoriesCacheRef.current.data;
    }

    categoriesCacheRef.current = { key: signature, data: sharedCategories };
    return categoriesCacheRef.current.data;
  }, [sharedCategories]);

  const customComponents = componentsToRender;
  
  // تحديث عنوان الصفحة وفافيكون المتجر
  useEffect(() => {
    if (storeName && organizationSettings) {
      // اجعل العنوان خاصاً بالمتجر فقط لتفادي تغيّر العنوان لاحقاً وفقدان الثبات البصري
      document.title = `${storeName}`;
      
      // 🔥 إصلاح: تحديث الفافيكون فوراً عند تحميل البيانات
      try {
        const faviconUrl = organizationSettings.favicon_url;
        const logoUrl = organizationSettings.logo_url || sharedOrg?.logo_url;
        
        if (faviconUrl || logoUrl) {
          // إزالة الفافيكون الموجود
          document.querySelectorAll('link[rel*="icon"]').forEach(el => el.remove());
          
          // إنشاء فافيكون جديد
          const favicon = document.createElement('link');
          favicon.rel = 'icon';
          favicon.type = 'image/x-icon';
          favicon.href = (faviconUrl || logoUrl) + '?v=' + Date.now();
          
          document.head.appendChild(favicon);
          
          // حفظ للاستخدام السريع
          const subdomain = currentSubdomain;
          if (subdomain) {
            try {
              sessionStorage.setItem(`favicon_${subdomain}`, faviconUrl || logoUrl);
              sessionStorage.setItem(`store_${subdomain}`, JSON.stringify({
                name: storeName,
                favicon_url: faviconUrl,
                logo_url: logoUrl,
                timestamp: Date.now()
              }));
            } catch (e) {
              // تجاهل أخطاء التخزين
            }
          }
        }
      } catch (error) {
        console.warn('خطأ في تحديث الفافيكون:', error);
      }
    }
  }, [storeName, organizationSettings, sharedOrg, currentSubdomain]);
  
  // تحديد ما إذا كان التطبيق جاهز للعرض
  const isAppReady = enhancedStoreInfo && organizationSettings && centralOrgId && storeName;
  
  // تحديث حالة تحميل الصفحة - إصلاح dependency issue مع timeout أمان
  useEffect(() => {
    
    // إعداد timeout أمان لإيقاف التحميل حتى لو لم تكن الشروط مكتملة
    const safetyTimer = setTimeout(() => {
      if (unifiedLoadingRef.current) {
        unifiedLoadingRef.current.setPageLoading(false);
        unifiedLoadingRef.current.setDataLoading(false);
      }
    }, 5000); // ✅ زيادة الوقت إلى 5 ثوانٍ لحل مشكلة التحميل السريع جداً
    
    if (isAppReady && !sharedDataLoading) {
      // إعطاء وقت قصير للمكونات الأساسية للتحميل
      const timer = setTimeout(() => {
        if (unifiedLoadingRef.current) {
          unifiedLoadingRef.current.setPageLoading(false);
          unifiedLoadingRef.current.setDataLoading(false); // ✅ إضافة إيقاف dataLoading
        }
        clearTimeout(safetyTimer);
      }, 1000); // ✅ زيادة الوقت إلى ثانية واحدة لحل مشكلة التحميل السريع جداً
      
      return () => {
        clearTimeout(timer);
        clearTimeout(safetyTimer);
      };
    }
    
    // إذا كان هناك خطأ في التحميل، أوقف المؤشر
    if (!sharedDataLoading && !isAppReady) {
      const errorTimer = setTimeout(() => {
        if (unifiedLoadingRef.current) {
          unifiedLoadingRef.current.setPageLoading(false);
          unifiedLoadingRef.current.setDataLoading(false);
        }
        clearTimeout(safetyTimer);
      }, 3000); // ✅ زيادة الوقت إلى 3 ثوانٍ لحل مشكلة التحميل السريع جداً
      
      return () => {
        clearTimeout(errorTimer);
        clearTimeout(safetyTimer);
      };
    }
    
    return () => clearTimeout(safetyTimer);
  }, [isAppReady, sharedDataLoading]);

  // 🔥 إضافة: إيقاف dataLoading عندما تكون البيانات جاهزة من useSharedStoreData
  useEffect(() => {
    if (unifiedLoadingRef.current && !sharedDataLoading) {
      unifiedLoadingRef.current.setDataLoading(false);
    }
  }, [sharedDataLoading]);
  
  // دمج إعدادات الفوتر
  const mergedFooterSettings = useMemo(() => {
    const defaultFooterSettings = getDefaultFooterSettings(
      storeName, 
      { organization_details: { name: storeName } }, 
      t
    );
    return mergeFooterSettings(defaultFooterSettings, footerSettings);
  }, [storeName, footerSettings, t]);
  
  const lastReturnValueRef = useRef<{ key: string; value: UseStorePageDataReturn } | null>(null);

  const componentsSignature = componentsCacheRef.current.key;
  const categoriesSignature = categoriesCacheRef.current.key;
  const featuredSignature = featuredCacheRef.current.key;
  const mergedFooterSignature = mergedFooterSettings ? JSON.stringify(mergedFooterSettings) : 'null';
  const seoSignature = seoSettings
    ? `${seoSettings.title || ''}|${seoSettings.description || ''}|${seoSettings.keywords || ''}|${seoSettings.ogImage || ''}`
    : 'null';
  const isLoadingStoreData = sharedDataLoading ||
    unifiedLoading.shouldShowGlobalLoader ||
    unifiedLoading.loadingState.isPageLoading ||
    unifiedLoading.loadingState.isDataLoading;
  const hasStoreError = Boolean(sharedDataError);
  const unifiedSignature = `${unifiedLoading.shouldShowGlobalLoader ? 1 : 0}:` +
    `${unifiedLoading.loadingState.isPageLoading ? 1 : 0}:` +
    `${unifiedLoading.loadingState.isDataLoading ? 1 : 0}:` +
    `${unifiedLoading.loadingState.loadedComponents.size}:` +
    `${unifiedLoading.loadingState.totalComponents}:` +
    `${hasStoreError ? 'err' : 'ok'}:${isLoadingStoreData ? 'load' : 'idle'}`;
  const appReadyFlag = isAppReady ? '1' : '0';

  const returnKey = [
    enhancedStoreInfo?.id ?? '',
    organizationSettings?.id ?? '',
    storeName || '',
    logoUrl || '',
    centralOrgId || '',
    sharedOrg?.id ?? '',
    componentsSignature,
    categoriesSignature,
    featuredSignature,
    mergedFooterSignature,
    seoSignature,
    unifiedSignature,
    appReadyFlag
  ].join('|');

  const shouldCreateNewValue =
    !lastReturnValueRef.current ||
    lastReturnValueRef.current.key !== returnKey ||
    lastReturnValueRef.current.value.refreshData !== refreshSharedData ||
    lastReturnValueRef.current.value.unifiedLoading !== unifiedLoading;

  if (shouldCreateNewValue) {
    console.log('🧪 [useStorePageData] recomputing return value', {
      storeName,
      centralOrgId,
      componentsCount: componentsToRender?.length ?? 0,
      categoriesCount: categories?.length ?? 0,
      featuredCount: featuredProducts?.length ?? 0,
      hasStoreError,
      isAppReady: Boolean(isAppReady),
      sharedDataLoading,
      unifiedLoadingState: {
        globalLoader: unifiedLoading.shouldShowGlobalLoader,
        pageLoading: unifiedLoading.loadingState.isPageLoading,
        dataLoading: unifiedLoading.loadingState.isDataLoading,
        componentsLoading: unifiedLoading.loadingState.isComponentsLoading,
        loadedComponents: unifiedLoading.loadingState.loadedComponents.size,
        totalComponents: unifiedLoading.loadingState.totalComponents
      }
    });
    lastReturnValueRef.current = {
      key: returnKey,
      value: {
        storeInfo: enhancedStoreInfo,
        organizationSettings,
        storeName,
        logoUrl,
        centralOrgId,
        currentOrganization: sharedOrg,
        componentsToRender,
        customComponents,
        categories,
        featuredProducts,
        footerSettings: mergedFooterSettings,
        seoSettings,
        unifiedLoading,
        isAppReady: Boolean(isAppReady),
        hasStoreError,
        isLoadingStoreData,
        refreshData: refreshSharedData
      }
    };
  }

  return lastReturnValueRef.current!.value;
};
