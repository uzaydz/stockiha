import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
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
    refreshData: refreshSharedData
  } = useSharedStoreDataContext();

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
  
  // تحديد المكونات للعرض - إصلاح محسن للنطاقات المخصصة مع منع العرض المبكر
  const componentsToRender = useMemo(() => {
    console.log('🔍 [componentsToRender] بدء تحديد المكونات للعرض:', {
      customComponentsLength: customComponents?.length || 0,
      sharedComponentsLength: sharedComponents?.length || 0,
      fallbackComponentsLength: fallbackComponents?.length || 0,
      isLoading: sharedDataLoading,
      customComponents,
      sharedComponents,
      fallbackComponents
    });

    // 🔥 إصلاح حاسم: لا تعرض المكونات الافتراضية إذا كان التحميل جارياً
    // هذا يمنع عرض المكونات الافتراضية قبل اكتمال get_store_init_data
    if (sharedDataLoading) {
      console.log('⏳ [componentsToRender] التحميل جاري، انتظار اكتمال get_store_init_data');
      return []; // إرجاع مصفوفة فارغة لإجبار الـ loader على البقاء
    }

    // 🔥 إصلاح: تحقق من البيانات المخصصة أولاً من sharedComponents و fallbackComponents
    const hasSharedComponents = sharedComponents && sharedComponents.length > 0;
    const hasFallbackComponents = fallbackComponents && fallbackComponents.length > 0;
    const hasValidCustomComponents = customComponents && customComponents.length > 0;

    // 🔥 إصلاح: تحقق من أن fallbackComponents تحتوي على بيانات حقيقية وليست مجرد fallback
    const isFallbackOnly = fallbackComponents?.length > 0 &&
      fallbackComponents.every(comp => comp?.id?.startsWith('fallback-'));

    console.log('🔍 [componentsToRender] حالة المكونات:', {
      hasValidCustomComponents,
      hasSharedComponents,
      hasFallbackComponents,
      isFallbackOnly,
      sharedComponentsCount: sharedComponents?.length || 0,
      fallbackComponentsCount: fallbackComponents?.length || 0,
      isLoading: sharedDataLoading
    });

    // 🔥 إصلاح: إعطاء الأولوية للمكونات من قاعدة البيانات (sharedComponents أو fallbackComponents)
    if (hasSharedComponents || (hasFallbackComponents && !isFallbackOnly)) {
      console.log('🎯 [componentsToRender] استخدام المكونات من قاعدة البيانات');

      // استخدم sharedComponents إذا كانت متوفرة، وإلا استخدم fallbackComponents
      const componentsToUse = sharedComponents && sharedComponents.length > 0
        ? sharedComponents
        : fallbackComponents;

      if (componentsToUse && componentsToUse.length > 0) {
        const convertedComponents: StoreComponent[] = componentsToUse
          .filter((comp: any) => {
            // 🔥 إصلاح: تحقق من حالة النشاط بشكل أفضل
            const isActive = comp?.isActive !== false && comp?.is_active !== false;
            console.log('🔍 [componentsToRender] فحص مكون من قاعدة البيانات:', {
              id: comp?.id,
              type: comp?.type || comp?.component_type,
              isActive: comp?.isActive,
              is_active: comp?.is_active,
              willInclude: isActive
            });
            return isActive;
          })
          .map((comp: any) => ({
            id: comp.id,
            type: normalizeComponentType(comp.type || comp.component_type) as ComponentType,
            settings: comp.settings || {},
            isActive: comp.isActive ?? comp.is_active ?? true,
            orderIndex: comp.orderIndex ?? comp.order_index ?? 0
          }))
          .filter(component => {
            const normalizedType = component.type.toLowerCase();
            // 🔥 إصلاح: استبعاد seo_settings فقط
            return normalizedType !== 'seo_settings' && component.isActive;
          })
          .map(component => {
            let normalizedType = component.type.toLowerCase();
            if (normalizedType === 'categories') {
              normalizedType = 'product_categories';
            }
            if (normalizedType === 'featuredproducts') {
              normalizedType = 'featured_products';
            }
            return {
              ...component,
              type: normalizedType as ComponentType
            };
          })
          .sort((a, b) => a.orderIndex - b.orderIndex);

        if (convertedComponents.length > 0) {
          console.log('✅ [componentsToRender] تم تحويل المكونات من قاعدة البيانات:', {
            count: convertedComponents.length,
            types: convertedComponents.map(c => c.type),
            ids: convertedComponents.map(c => c.id)
          });

          // تحديث عدد المكونات الإجمالي باستخدام ref
          if (unifiedLoadingRef.current) {
            unifiedLoadingRef.current.setTotalComponents(convertedComponents.length);
          }
          return convertedComponents;
        }
      }
    }

    // 🔥 إصلاح: استخدم المكونات المخصصة المحولة إذا كانت متوفرة
    if (hasValidCustomComponents) {
      console.log('🎯 [componentsToRender] استخدام المكونات المخصصة المحولة');
      const components = customComponents
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

      // تحديث عدد المكونات الإجمالي باستخدام ref
      if (unifiedLoadingRef.current) {
        unifiedLoadingRef.current.setTotalComponents(components.length);
      }

      return components;
    }

    // 🔥 إصلاح: استخدم المكونات الافتراضية كآخر خيار فقط
    console.log('⚠️ [componentsToRender] استخدام المكونات الافتراضية كآخر خيار');
    console.log('🔍 [componentsToRender] المكونات الافتراضية:', defaultStoreComponents);

    // تحديث عدد المكونات الإجمالي باستخدام ref
    if (unifiedLoadingRef.current) {
      unifiedLoadingRef.current.setTotalComponents(defaultStoreComponents.length);
    }

    console.log('✅ [componentsToRender] إرجاع المكونات النهائية:', {
      count: defaultStoreComponents.length,
      types: defaultStoreComponents.map(c => c.type),
      components: defaultStoreComponents
    });

    return defaultStoreComponents;
  }, [customComponents, defaultStoreComponents, sharedComponents, fallbackComponents, sharedDataLoading]);
  
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
  
  // جلب المكونات المخصصة والمنتجات المميزة مع الاعتماد على بيانات السياق أولاً - إصلاح للإنتاج
  useEffect(() => {
    if (!centralOrgId) return;

    // 1) المكوّنات: استخدم القادمة من الـ RPC إن توفرت
    console.log('🔍 [useStorePageData] فحص sharedComponents:', {
      hasSharedComponents: !!sharedComponents,
      sharedComponentsLength: sharedComponents?.length || 0,
      sharedComponentsData: sharedComponents,
      sharedComponentsType: typeof sharedComponents,
      isArray: Array.isArray(sharedComponents),
      hasFallbackComponents: !!fallbackComponents,
      fallbackComponentsLength: fallbackComponents?.length || 0
    });

    const componentsToProcess = fallbackComponents?.length > 0 ? fallbackComponents : sharedComponents;

    if (componentsToProcess && componentsToProcess.length > 0) {
      console.log('🎯 [useStorePageData] تحويل المكونات من RPC:', componentsToProcess.length);

      const convertedComponents: StoreComponent[] = componentsToProcess
        .filter((comp: any) => {
          const isActive = comp?.isActive !== false && comp?.is_active !== false;
          console.log('🔍 [useStorePageData] فحص مكون:', {
            id: comp?.id,
            type: comp?.type || comp?.component_type,
            isActive: comp?.isActive,
            is_active: comp?.is_active,
            willInclude: isActive
          });
          return isActive;
        })
        .map((comp: any) => {
          const normalizedType = normalizeComponentType(comp.type || comp.component_type);
          const convertedComponent = {
            id: comp.id,
            type: normalizedType as ComponentType,
            settings: comp.settings || {},
            isActive: comp.isActive ?? comp.is_active ?? true,
            orderIndex: comp.orderIndex ?? comp.order_index ?? 0
          };

          console.log('🔍 [useStorePageData] تم تحويل مكون:', {
            originalType: comp.type || comp.component_type,
            normalizedType,
            id: comp.id,
            settings: comp.settings
          });

          return convertedComponent;
        })
        .sort((a, b) => a.orderIndex - b.orderIndex);

      console.log('✅ [useStorePageData] تم تحويل المكونات:', convertedComponents.length);
      console.log('🔍 [useStorePageData] المكونات المحولة:', convertedComponents);

      setCustomComponents(convertedComponents);
    } else {
      console.log('⚠️ [useStorePageData] لا توجد مكونات من RPC، استخدام الافتراضية');
      console.log('🔍 [useStorePageData] sharedComponents details:', {
        sharedComponents,
        type: typeof sharedComponents,
        isArray: Array.isArray(sharedComponents)
      });

      // في الإنتاج، قد تكون البيانات غير متوفرة بعد، لذلك لا نعيد تعيين customComponents
      // سنعتمد على منطق componentsToRender لحل هذا
    }

    // 2) المنتجات المميزة: استخدم المنتجات المميزة من RPC فقط
    if (sharedFeaturedProducts && sharedFeaturedProducts.length > 0) {
      console.log('🎯 [useStorePageData] تحويل المنتجات المميزة من RPC:', sharedFeaturedProducts.length);
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
      console.log('✅ [useStorePageData] تم تحويل المنتجات المميزة:', convertedProducts.length);
      setFeaturedProducts(convertedProducts);
    }
  }, [centralOrgId, sharedComponents, fallbackComponents, sharedFeaturedProducts]);
  
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
  
  // 🔥 تحسين: استخدام useMemo للقيمة المرجعة لمنع إعادة الإنشاء
  const returnValue = useMemo(() => {
    const result = {
      // بيانات أساسية
      storeInfo: enhancedStoreInfo,
      organizationSettings,
      storeName,
      logoUrl,
      centralOrgId,
      currentOrganization: sharedOrg,
      
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

    return result;
  }, [
    enhancedStoreInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    sharedOrg,
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
