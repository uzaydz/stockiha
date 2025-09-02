import React, { useMemo, useState, useEffect, useCallback, useRef, Suspense, lazy, startTransition } from 'react';
import { useParams } from 'react-router-dom';
import { ProductPageSkeleton } from '@/components/product/ProductPageSkeleton';
import { ProductErrorPage } from '@/components/product/ProductErrorPage';
import { ProductPageProvider } from '@/context/ProductPageContext';

// تحميل مكونات ثقيلة بشكل متأخر
const SmartNavbar = lazy(() => import('@/components/navbar/SmartNavbar').then(module => ({ default: module.SmartNavbar })));
const ProductTrackingContainer = lazy(() => import('@/components/product-page/ProductTrackingContainer').then(module => ({ default: module.ProductTrackingContainer })));
const ProductMainSection = lazy(() => import('@/components/product-page/ProductMainSection').then(module => ({ default: module.ProductMainSection })));
const ProductDebugTools = lazy(() => import('@/components/product-page/ProductDebugTools').then(module => ({ default: module.ProductDebugTools })));

// المكونات الأساسية - تحميل فوري
import { ProductSEOHead } from '@/components/product-page/ProductSEOHead';
import { useDeliveryCalculation } from '@/components/product-page/useDeliveryCalculation';
import { useOrderHandler } from '@/components/product-page/useOrderHandler';
import { useSpecialOffers } from '@/components/product-page/useSpecialOffers';

// الـ Hooks والسياق - محسنة
import useProductPurchase from '@/hooks/useProductPurchase';
import { useTenant } from '@/context/TenantContext';
import { useSharedOrgSettingsOnly } from '@/context/SharedStoreDataContext';
import { useUnifiedProductPageData } from '@/hooks/useUnifiedProductPageData';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';
import { useProductTracking } from '@/hooks/useProductTracking';

// Hook لاستخدام البيانات المحملة مسبقاً
import { getCachedProductPageResult, isProductPagePreloading } from '@/utils/productPagePreloader';

// كشف الأجهزة الضعيفة
const isLowEndDevice = () => {
  if (typeof window === 'undefined') return false;
  
  // فحص معايير الجهاز الضعيف
  const deviceMemory = (navigator as any).deviceMemory;
  const hardwareConcurrency = navigator.hardwareConcurrency;
  const connection = (navigator as any).connection;
  
  return (
    deviceMemory && deviceMemory <= 2 ||
    hardwareConcurrency && hardwareConcurrency <= 2 ||
    connection && (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') ||
    window.innerWidth < 768
  );
};

// مكون تحميل خفيف للنافبار
const NavbarFallback = React.memo(() => (
  <div className="h-16 bg-background/95 backdrop-blur-sm border-b border-border/20">
    <div className="h-full flex items-center justify-between px-4">
      <div className="w-32 h-8 bg-muted rounded animate-pulse"></div>
      <div className="w-24 h-8 bg-muted rounded animate-pulse"></div>
    </div>
  </div>
));

// مكون تحميل للمحتوى الرئيسي محسن
const MainContentFallback = React.memo(() => {
  const isLowEnd = isLowEndDevice();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 ${isLowEnd ? '' : 'animate-pulse'}`}>
        <div className="aspect-square bg-muted rounded-lg"></div>
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded w-3/4"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-12 bg-muted rounded"></div>
        </div>
      </div>
    </div>
  );
});

const ProductPurchasePageV3: React.FC = React.memo(() => {
  const { productId, productIdentifier } = useParams<{ productId?: string; productIdentifier?: string }>();
  const actualProductId = productIdentifier || productId;
  const { currentOrganization: organization, isLoading: isOrganizationLoading } = useTenant();
  
  // حالات المكون مجمعة لتقليل re-renders
  const [pageState, setPageState] = useState({
    submittedFormData: {} as Record<string, any>,
    isOrganizationReady: true,
    showValidationErrors: false,
    hasTriedToSubmit: false,
    isComponentsLoaded: false
  });

  // إضافة حالة إضافية لتتبع حالة التحميل - تحريكها لأعلى
  const [isDataFullyLoaded, setIsDataFullyLoaded] = useState(false);

  // مرجع لمتتبع التحويل
  const conversionTrackerRef = useRef<any>(null);
  const mountedRef = useRef(true);

  const organizationId = organization?.id || null;

  // Hook لاستخدام البيانات المحملة مسبقاً
  const usePreloadedProductData = () => {
    const [preloadedData, setPreloadedData] = useState<any>(null);
    const [isPreloaded, setIsPreloaded] = useState(false);

    useEffect(() => {
      if (!actualProductId || !organizationId) return;

      // فحص البيانات المحملة مسبقاً فوراً
      const checkForPreloadedData = () => {
        const cached = getCachedProductPageResult(actualProductId, organizationId);
        if (cached && cached.success && cached.data) {
          setPreloadedData(cached.data);
          setIsPreloaded(true);
          return true;
        }
        return false;
      };

      // فحص فوراً أولاً
      if (!checkForPreloadedData()) {
        // إذا لم توجد البيانات، فحص ما إذا كان preload قيد التشغيل
        if (isProductPagePreloading(actualProductId, organizationId)) {

          // انتظار اكتمال preload مع timeout
          let attempts = 0;
          const maxAttempts = 300; // 30 ثانية كحد أقصى
          const checkPreloadComplete = () => {
            attempts++;
            if (attempts > maxAttempts) {
              return;
            }

            if (checkForPreloadedData()) {
              return; // تم العثور على البيانات
            }

            if (isProductPagePreloading(actualProductId, organizationId)) {
              // استمر في الانتظار
              setTimeout(checkPreloadComplete, 100);
            } else {
            }
          };

          setTimeout(checkPreloadComplete, 100);
        }
      }
    }, [actualProductId, organizationId]);

    return { preloadedData, isPreloaded };
  };

  const { preloadedData, isPreloaded } = usePreloadedProductData();

  // فحص ما إذا كان preload قيد التشغيل حالياً
  const isCurrentlyPreloading = useMemo(() => {
    return !!actualProductId && !!organizationId && isProductPagePreloading(actualProductId, organizationId);
  }, [actualProductId, organizationId]);

  // استخدام Hook موحد لجلب جميع البيانات مع منع التكرار
  const unifiedData = useUnifiedProductPageData({
    productId: actualProductId,
    organizationId: organizationId,
    enabled: !!actualProductId && !!organizationId && !isPreloaded && !isCurrentlyPreloading, // تعطيل إذا كانت البيانات محملة مسبقاً أو قيد التحميل
    dataScope: 'ultra' // الاعتماد على ultra فقط
  });

  // دمج البيانات المحملة مسبقاً مع البيانات العادية - تحريكه لأعلى
  const effectiveData = useMemo(() => {
    if (isPreloaded && preloadedData) {
      const enhancedPreloadedData = {
        ...unifiedData,
        product: preloadedData.product || unifiedData.product,
        organization: preloadedData.organization || unifiedData.organization,
        organizationSettings: preloadedData.organizationSettings || unifiedData.organizationSettings,
        categories: preloadedData.categories || unifiedData.categories,
        provinces: preloadedData.provinces || unifiedData.provinces,
        visitorAnalytics: preloadedData.visitorAnalytics || unifiedData.visitorAnalytics,
        trackingData: preloadedData.trackingData || unifiedData.trackingData,
        isLoading: false, // البيانات محملة مسبقاً
        error: null
      };

      // التحقق من اكتمال البيانات المحملة مسبقاً - تحسين المنطق
      if (preloadedData.product) {
        const product = preloadedData.product;
        // نعتبر البيانات مكتملة إذا كانت تحتوي على البيانات الأساسية
        // المتغيرات يمكن أن تأتي لاحقاً من البيانات الفعلية
        const hasBasicData = !!(
          product.description &&
          product.images
        );

        if (!hasBasicData) {

          // إذا كانت البيانات الأساسية مفقودة، استخدم البيانات العادية
          return unifiedData;
        }

        // إذا كانت البيانات الأساسية موجودة، سجل معلومات للمتابعة فقط
        if (process.env.NODE_ENV === 'development') {
        }
      }

      return enhancedPreloadedData;
    }
    return unifiedData;
  }, [isPreloaded, preloadedData, unifiedData]);

  // تحديد isDataFullyLoaded فوراً للبيانات المحملة مسبقاً - تحسين المنطق
  useEffect(() => {
    if (isPreloaded && preloadedData && preloadedData.product && !isDataFullyLoaded) {
      const product = preloadedData.product;
      // نعتبر البيانات مكتملة إذا كانت تحتوي على البيانات الأساسية فقط
      const hasBasicData = !!(
        product.description &&
        product.images
      );

      if (hasBasicData) {
        setIsDataFullyLoaded(true);
        return;
      }
    }

    // أيضاً تحقق من effectiveData إذا كانت مكتملة
    if (!isPreloaded && effectiveData.product && !effectiveData.isLoading &&
        effectiveData.product.description && effectiveData.product.images && !isDataFullyLoaded) {
      setIsDataFullyLoaded(true);
    }
  }, [isPreloaded, preloadedData, effectiveData.product, effectiveData.isLoading, isDataFullyLoaded]);

  // إضافة debug log لمعرفة حالة effectiveData
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [actualProductId, organizationId, effectiveData.isLoading, effectiveData.product, effectiveData.data, effectiveData.error, isPreloaded]);

  // إعدادات المؤسسة محسنة
  const { organizationSettings: sharedOrgSettings } = useSharedOrgSettingsOnly();
  const organizationSettings = useMemo(() => 
    effectiveData.organizationSettings || sharedOrgSettings, 
    [effectiveData.organizationSettings, sharedOrgSettings]
  );

  // تحسين معالجة الأخطاء - إضافة retry logic
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // إضافة تأخير إضافي قبل عرض الخطأ
  const [showError, setShowError] = useState(false);

  // إضافة timeout للبيانات
  const [dataLoadTimeout, setDataLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  // دالة إعادة المحاولة محسنة
  const handleRetry = useCallback(async () => {
    if (retryCount >= maxRetries) {
      // إذا تم استنفاذ المحاولات، إعادة تحميل الصفحة
      window.location.reload();
      return;
    }
    
    setRetryCount(prev => prev + 1);
    setShowError(false);
    setIsDataFullyLoaded(false);
    
    // إعادة تعيين timeout
    if (dataLoadTimeout) {
      clearTimeout(dataLoadTimeout);
    }
    
    const newTimeout = setTimeout(() => {
      if (!effectiveData.product && !effectiveData.isLoading) {
        setShowError(true);
      }
    }, 8000); // 8 ثواني
    
    setDataLoadTimeout(newTimeout);
  }, [retryCount, maxRetries, effectiveData.product, effectiveData.isLoading, dataLoadTimeout]);

  // تنظيف timeout عند unmount
  useEffect(() => {
    return () => {
      if (dataLoadTimeout) {
        clearTimeout(dataLoadTimeout);
      }
    };
  }, [dataLoadTimeout]);

  // إضافة timeout للبيانات
  useEffect(() => {
    if (dataLoadTimeout) {
      clearTimeout(dataLoadTimeout);
    }
    
    // انتظار 8 ثواني قبل عرض الخطأ
    const timeout = setTimeout(() => {
      if (!effectiveData.product && !effectiveData.isLoading && !isDataFullyLoaded) {
        setShowError(true);
      }
    }, 8000);
    
    setDataLoadTimeout(timeout);
    
    return () => clearTimeout(timeout);
  }, [effectiveData.product, effectiveData.isLoading, isDataFullyLoaded]);

  // تحسين منطق تحديد اكتمال البيانات - إضافة فحوصات أكثر تفصيلاً
  useEffect(() => {
    // إذا كانت البيانات محملة مسبقاً وتحتوي على البيانات الأساسية، اعتبرها مكتملة
    if (isPreloaded && preloadedData && preloadedData.product) {
      const product = preloadedData.product;
      const hasBasicData = !!(
        product.description &&
        product.images
      );

      if (hasBasicData && !isDataFullyLoaded) {
        setIsDataFullyLoaded(true);

        // إلغاء timeout إذا تم تحميل البيانات
        if (dataLoadTimeout) {
          clearTimeout(dataLoadTimeout);
          setDataLoadTimeout(null);
        }
      }
      return;
    }

    // للبيانات العادية، تحقق من اكتمال جميع البيانات
    const allDataReady = !!(
      organizationId &&
      !isOrganizationLoading &&
      organizationSettings &&
      effectiveData.product && // تأكد من وجود المنتج
      effectiveData.product.description && // تأكد من وجود الوصف
      effectiveData.product.images && // تأكد من وجود الصور
      !effectiveData.isLoading && // تأكد من عدم وجود تحميل
      !effectiveData.error // تأكد من عدم وجود أخطاء
    );

    if (allDataReady && !isDataFullyLoaded) {
      setIsDataFullyLoaded(true);

      // إلغاء timeout إذا تم تحميل البيانات
      if (dataLoadTimeout) {
        clearTimeout(dataLoadTimeout);
        setDataLoadTimeout(null);
      }
    }
  }, [
    organizationId,
    isOrganizationLoading,
    organizationSettings,
    effectiveData.product,
    effectiveData.isLoading,
    effectiveData.error,
    isDataFullyLoaded,
    dataLoadTimeout,
    isPreloaded,
    preloadedData
  ]);

  // استخدام hook المنتج مع تمرير البيانات المحملة مسبقاً - منع التكرار
  const stableParams = useMemo(() => {
    const hasRequiredData = !!organizationId && !!actualProductId && !isOrganizationLoading;
    const hasUnifiedData = !!effectiveData.product; // التحقق من توفر البيانات في effectiveData
    
    // إضافة debug log لمعرفة سبب عدم التعطيل
    if (process.env.NODE_ENV === 'development') {
    }
    
    return {
      productId: hasRequiredData ? actualProductId : undefined,
      organizationId: hasRequiredData ? organizationId : undefined,
      dataScope: 'ultra' as const, // تغيير إلى 'ultra' لضمان جلب جميع البيانات المطلوبة
      enabled: hasRequiredData && !hasUnifiedData && !isCurrentlyPreloading // تعطيل إذا كانت البيانات متوفرة أو preload قيد التشغيل
    };
  }, [organizationId, actualProductId, isOrganizationLoading, effectiveData.product, isCurrentlyPreloading]);
  
  const [state, actions] = useProductPurchase({
    ...stableParams,
    preloadedProduct: effectiveData.product || effectiveData.data?.product, // تمرير البيانات المحملة مسبقاً
  });

  // الحل الجديد: استخدام البيانات مباشرة من effectiveData إذا لم تكن متوفرة في state
  const effectiveProduct = effectiveData.product || effectiveData.data?.product; // الاعتماد فقط على effectiveData
  const effectiveLoading = effectiveData.isLoading; // الاعتماد فقط على effectiveData
  const effectiveError = effectiveData.error ? String(effectiveData.error) : null; // الاعتماد فقط على effectiveData

  // إضافة retry logic محسن للبيانات
  useEffect(() => {
    if (effectiveData.error && !showError && retryCount < maxRetries) {

      // محاولة إعادة التحميل بعد تأخير
      const retryTimer = setTimeout(() => {
        if (effectiveData.refetch) {
          effectiveData.refetch().catch(error => {
          });
        }
      }, 2000 * (retryCount + 1)); // تأخير متزايد

      return () => clearTimeout(retryTimer);
    }
  }, [effectiveData.error, showError, retryCount, maxRetries, effectiveData.refetch]);

  // إضافة مراقبة إضافية لحالة البيانات
  useEffect(() => {
    if (effectiveProduct && !effectiveProduct.description) {
      
      // محاولة إعادة تحميل البيانات إذا كان الوصف مفقود
      if (effectiveData.refetch && !effectiveData.isLoading) {
        setTimeout(() => {
          effectiveData.refetch().catch(error => {
          });
        }, 1000);
      }
    }
  }, [effectiveProduct, effectiveData.refetch, effectiveData.isLoading]);

  // إضافة مراقبة إضافية للبيانات
  useEffect(() => {
    if (effectiveData.isLoading) {
    } else if (effectiveData.product && !effectiveData.isLoading) {
    }
  }, [effectiveData.isLoading, effectiveData.product]);

  // إضافة مراقبة إضافية للبيانات
  useEffect(() => {
    if (effectiveProduct && !state.product) {
    }
  }, [effectiveProduct, state.product]);

  // تحميل المكونات بشكل متأخر بعد التحميل الأولي
  useEffect(() => {
    if (!pageState.isComponentsLoaded && organizationId) {
      // استخدام startTransition لتحسين الأداء
      startTransition(() => {
        setPageState(prev => ({ ...prev, isComponentsLoaded: true }));
      });
    }
  }, [organizationId, pageState.isComponentsLoaded]);

  // تطبيق ثيم المؤسسة مع debouncing
  useEffect(() => {
    if (!organizationSettings || !organization?.id) {
      return;
    }
    
    const applyTheme = async () => {
      try {
        // تحميل متأخر للثيم لتجنب blocking التحميل الأولي
        const { forceApplyOrganizationTheme } = await import('@/lib/themeManager');
        
        if (!mountedRef.current) return;
        
        await forceApplyOrganizationTheme(organization.id, {
          theme_primary_color: organizationSettings.theme_primary_color,
          theme_secondary_color: organizationSettings.theme_secondary_color,
          theme_mode: (organizationSettings as any).theme_mode || 'light',
          custom_css: (organizationSettings as any).custom_css
        });
        
      } catch (error) {
        // خطأ في تطبيق الثيم - تجاهل صامت
      }
    };
    
    // تأخير تطبيق الثيم لتحسين الأداء الأولي
    const timer = setTimeout(applyTheme, 100);
    return () => clearTimeout(timer);
  }, [
    organizationSettings?.theme_primary_color, 
    organizationSettings?.theme_secondary_color, 
    organization?.id
  ]);

  // إضافة مراقبة إضافية للبيانات
  useEffect(() => {
    // إذا كانت البيانات متوفرة في unifiedData ولكن ليس في state
    if (effectiveData.product && !state.product && !state.loading) {
      
      // إعادة تعيين الحالة
      setPageState(prev => ({ ...prev, isComponentsLoaded: false }));
    }
  }, [effectiveData.product, state.product, state.loading]);

  // إضافة debug logs لمعرفة سبب المشكلة
  useEffect(() => {
  }, [actualProductId, organizationId, isOrganizationLoading, isDataFullyLoaded, unifiedData, state, showError]);

  // الحل الجديد: استخدام البيانات مباشرة من unifiedData إذا لم تكن متوفرة في state
  // const effectiveProduct = state.product || unifiedData.product || unifiedData.data?.product;
  // const effectiveLoading = state.loading || unifiedData.isLoading;
  // const effectiveError = state.error || (unifiedData.error ? String(unifiedData.error) : null);

  const {
    selectedColor,
    selectedSize,
    quantity,
    buyingNow,
    availableStock,
    canPurchase,
    priceInfo,
    formData,
    formStrategy
  } = state;

  // إضافة تأخير إضافي قبل عرض الخطأ
  useEffect(() => {
    if (isDataFullyLoaded && (effectiveError || !effectiveProduct) && !effectiveData.isLoading) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 1500); // انتظار 1.5 ثانية إضافية
      
      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [isDataFullyLoaded, effectiveError, effectiveProduct, effectiveData.isLoading]);

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
  } = actions;

  // تنظيف المكونات عند unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // إعادة تعيين حالة التحقق مع تحسين
  useEffect(() => {
    if (pageState.hasTriedToSubmit && (selectedColor || selectedSize)) {
      setPageState(prev => ({
        ...prev,
        showValidationErrors: false,
        hasTriedToSubmit: false
      }));
    }
  }, [selectedColor?.id, selectedSize?.id, pageState.hasTriedToSubmit]);

  // تحسين السكرول والأداء للهواتف الضعيفة
  useEffect(() => {
    const isLowEnd = isLowEndDevice();
    
    // استخدام scrollTo محسن للأجهزة الضعيفة
    window.scrollTo({ 
      top: 0, 
      behavior: isLowEnd ? 'auto' : 'smooth' 
    });
    
    // تحسين الأداء للأجهزة الضعيفة
    if (isLowEnd) {
      // تقليل انيميشنز CSS
      document.documentElement.style.setProperty('--animation-duration', '0.1s');
      document.documentElement.style.setProperty('--transition-duration', '0.1s');
    }
    
    // تنظيف preload links بشكل متأخر
    const cleanupTimer = setTimeout(() => {
      const oldLinks = document.querySelectorAll('link[rel="preload"][as="image"]');
      oldLinks.forEach(link => {
        if (link.parentNode) {
          link.remove();
        }
      });
    }, isLowEnd ? 2000 : 1000); // تأخير أكبر للأجهزة الضعيفة
    
    return () => clearTimeout(cleanupTimer);
  }, [actualProductId]);

  // استخدام hook حساب التوصيل مع تحسين
  const { deliveryCalculation, isCalculatingDelivery, summaryData } = useDeliveryCalculation({
    organizationId,
    product: effectiveProduct,
    formData: pageState.submittedFormData, // استخدام submittedFormData فقط لأنه يحتوي على البيانات المملوءة
    quantity
  });

  // إضافة console logs لفهم البيانات
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [ProductPurchasePageV3] useDeliveryCalculation data:', {
        organizationId,
        hasProduct: !!effectiveProduct,
        formData: pageState.submittedFormData,
        formDataKeys: Object.keys(pageState.submittedFormData || {}),
        submittedFormDataKeys: Object.keys(pageState.submittedFormData || {}),
        quantity,
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
    }
  }, [organizationId, effectiveProduct, pageState.submittedFormData, quantity]);

  // استخدام hook العروض الخاصة
  const {
    selectedOffer,
    setSelectedOffer,
    isQuantityUpdatedByOffer,
    setIsQuantityUpdatedByOffer,
    finalPriceCalculation
  } = useSpecialOffers({
    product: effectiveProduct,
    quantity,
    priceInfo
  });

  // hook الطلبات المتروكة مع تحسين
  const [isSavingCart, abandonedCartActions] = useAbandonedCartTracking({
    productId: actualProductId,
    productColorId: selectedColor?.id,
    productSizeId: selectedSize?.id,
    quantity,
    subtotal: priceInfo?.price || 0,
    deliveryFee: deliveryCalculation?.deliveryFee || 0,
    discountAmount: priceInfo?.discount || 0,
    organizationId: organizationId,
    enabled: !!actualProductId && !!organizationId, // تحسين الشرط
    saveInterval: 5, // زيادة الفترة لتقليل الطلبات
    minPhoneLength: 8
  });

  // Hook التتبع مع تحسين
  const productTracking = useProductTracking({
    productId: actualProductId!,
    organizationId: organizationId,
    autoLoadSettings: true, // تغيير إلى true لضمان تحميل الإعدادات
    enableDebugMode: process.env.NODE_ENV === 'development' // إعادة تفعيل debug في التطوير
  });

  // تحميل إعدادات التتبع يدوياً إذا لم تكن متوفرة
  useEffect(() => {
    if (effectiveProduct && !productTracking.isReady && !productTracking.isLoading) {
      // محاولة استخراج الإعدادات من المنتج
      const success = productTracking.setSettingsFromProduct(effectiveProduct as any);
      
      if (!success && process.env.NODE_ENV === 'development') {
      }
    }
  }, [effectiveProduct?.id, productTracking.isReady, productTracking.isLoading, productTracking.setSettingsFromProduct]);

  // مراقبة حالة productTracking.isReady
  useEffect(() => {
    if (productTracking.isReady && !isDataFullyLoaded) {
      // إذا كان productTracking جاهز، تأكد من أن جميع البيانات الأخرى جاهزة أيضاً
      const allDataReady = !!(
        organizationId && 
        !isOrganizationLoading && 
        organizationSettings && 
        (effectiveData.data || effectiveData.product) &&
        !effectiveData.isLoading
      );

      if (allDataReady) {
        setIsDataFullyLoaded(true);
      }
    }
  }, [productTracking.isReady, isDataFullyLoaded, organizationId, isOrganizationLoading, organizationSettings, effectiveData.data, effectiveData.product, effectiveData.isLoading]);

  // دالة تحديث الكمية مع التتبع
  const handleQuantityChange = useCallback((newQuantity: number) => {
    const oldQuantity = quantity;
    setQuantity(newQuantity);
    
    // تتبع إضافة إلى السلة عند زيادة الكمية
    if (newQuantity > oldQuantity && effectiveProduct && productTracking?.isReady) {
      const quantityDiff = newQuantity - oldQuantity;
      productTracking.trackAddToCart({
        name: effectiveProduct.name,
        price: priceInfo?.price || 0,
        quantity: quantityDiff,
        image: effectiveProduct.images?.thumbnail_image || effectiveProduct.images?.additional_images?.[0]?.url,
        selectedColor: selectedColor?.name,
        selectedSize: selectedSize?.size_name
      });
    }
  }, [quantity, setQuantity, effectiveProduct, productTracking, priceInfo, selectedColor, selectedSize]);

  // تم نقل تتبع عرض المحتوى إلى ProductConversionTracker لتجنب التكرار

  const handleFormChange = useCallback((data: Record<string, any>) => {
    // إضافة console logs لفهم البيانات
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [ProductPurchasePageV3] handleFormChange called with:', {
        data,
        dataKeys: Object.keys(data || {}),
        hasProvince: !!data.province,
        hasMunicipality: !!data.municipality,
        province: data.province,
        municipality: data.municipality,
        userAgent: navigator.userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      });
    }
    
    // الحفاظ على البيانات الموجودة مسبقاً (province و municipality)
    setPageState(prev => {
      const newData = { ...prev.submittedFormData, ...data };
      
      // إذا كانت البيانات الجديدة لا تحتوي على province أو municipality، احتفظ بالقيم القديمة
      if (!newData.province && prev.submittedFormData.province) {
        newData.province = prev.submittedFormData.province;
      }
      if (!newData.municipality && prev.submittedFormData.municipality) {
        newData.municipality = prev.submittedFormData.municipality;
      }
      
      return { ...prev, submittedFormData: newData };
    });
    
    // حفظ مؤجل للطلب المتروك مع تحسين
    if (data.phone && data.phone.length >= 8 && abandonedCartActions.debouncedSave) {
      abandonedCartActions.debouncedSave(data);
    }
  }, [abandonedCartActions]);

  // استخدام hook معالجة الطلبيات
  const { handleFormSubmit, handleBuyNow: handleBuyNowBase } = useOrderHandler({
    product: effectiveProduct,
    organizationId,
    quantity,
    priceInfo,
    deliveryCalculation,
    selectedColor,
    selectedSize,
    selectedOffer,
    productTracking,
    abandonedCartActions,
    conversionTrackerRef
  });

  const handleBuyNow = useCallback(() => {
    handleBuyNowBase(
      canPurchase,
      pageState.submittedFormData,
      (value: boolean) => setPageState(prev => ({ ...prev, hasTriedToSubmit: value })),
      (value: boolean) => setPageState(prev => ({ ...prev, showValidationErrors: value }))
    );
  }, [handleBuyNowBase, canPurchase, pageState.submittedFormData]);

  // حالة التحميل - تأكد من اكتمال تحميل جميع البيانات المطلوبة
  // تحسين: التعامل مع البيانات المحملة مسبقاً بشكل أفضل وإزالة الاعتماد على productTracking
  const shouldShowLoading = (() => {
    // إذا كانت البيانات محملة مسبقاً ومكتملة، لا تعرض التحميل
    if (isPreloaded && preloadedData && isDataFullyLoaded) {
      return false;
    }

    // إذا كانت البيانات محملة مسبقاً وتحتوي على البيانات الأساسية، لا تعرض التحميل
    if (isPreloaded && preloadedData && preloadedData.product &&
        preloadedData.product.description && preloadedData.product.images) {
      return false;
    }

    // إذا كانت unifiedData مكتملة، لا تعرض التحميل
    if (effectiveData.product && effectiveData.product.description &&
        effectiveData.product.images && !effectiveData.isLoading) {
      return false;
    }

    // في الحالات العادية، تحقق من الشروط المعتادة
    return effectiveLoading || !isDataFullyLoaded || effectiveData.isLoading || !effectiveProduct;
  })();

  if (shouldShowLoading) {
    return <ProductPageSkeleton />;
  }

  // التحقق من اكتمال البيانات الأساسية - تحسين الشروط
  // إذا كانت البيانات محملة مسبقاً أو مكتملة، تجاهل هذا التحقق الصارم
  if (!isPreloaded && (!effectiveProduct.description || !effectiveProduct.images)) {

    // انتظار إضافي للبيانات الأساسية فقط
    return (
      <>
        <ProductSEOHead
          productId={actualProductId}
          organizationSettings={organizationSettings}
          organization={organization}
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل تفاصيل المنتج...</p>
            <p className="text-sm text-muted-foreground mt-2">يرجى الانتظار...</p>
          </div>
        </div>
      </>
    );
  }

  // التحقق من إعدادات المؤسسة
  if (!organizationSettings || !organization?.id) {
    return (
      <>
        <ProductSEOHead 
          productId={actualProductId}
          organizationSettings={organizationSettings}
          organization={organization}
        />
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">جاري تحميل المنتج...</p>
          </div>
        </div>
      </>
    );
  }

  // حالة الخطأ - تأكد من أن البيانات تم تحميلها بالكامل
  if (showError) {
    return (
      <>
        <ProductSEOHead 
          productId={actualProductId}
          organizationSettings={organizationSettings}
          organization={organization}
        />
        <ProductErrorPage 
          error={effectiveError}
          onRetry={handleRetry}
          retryCount={retryCount}
          maxRetries={maxRetries}
          productId={actualProductId}
          organizationId={organizationId}
        />
      </>
    );
  }

  return (
    <>
      {/* SEO Head للمنتج */}
      <ProductSEOHead 
        product={effectiveProduct}
        organization={organization}
        organizationSettings={organizationSettings}
        productId={actualProductId}
        priceInfo={priceInfo}
        availableStock={availableStock}
      />
      
      <ProductPageProvider>
        <div className={`min-h-screen bg-background ${isLowEndDevice() ? 'transition-none' : 'transition-colors duration-300'}`}>
          {/* النافبار مع lazy loading محسن */}
          <Suspense fallback={<NavbarFallback />}>
            <SmartNavbar 
              className={`bg-background/95 border-b border-border/20 ${
                isLowEndDevice() ? 'backdrop-blur-sm' : 'backdrop-blur-md'
              }`}
              hideCategories={true}
            />
          </Suspense>

          {/* المحتوى الرئيسي مع lazy loading */}
          <Suspense fallback={<MainContentFallback />}>
            <ProductMainSection
              product={effectiveProduct}
              state={state}
              actions={actions}
              formData={formData}
              formStrategy={formStrategy}
              summaryData={summaryData}
              finalPriceCalculation={finalPriceCalculation}
              selectedOffer={selectedOffer}
              isQuantityUpdatedByOffer={isQuantityUpdatedByOffer}
              showValidationErrors={pageState.showValidationErrors}
              hasTriedToSubmit={pageState.hasTriedToSubmit}
              submittedFormData={pageState.submittedFormData}
              isSavingCart={isSavingCart}
              onFormChange={handleFormChange}
              onFormSubmit={handleFormSubmit}
              onBuyNow={handleBuyNow}
              onQuantityChange={handleQuantityChange}
              setSelectedOffer={setSelectedOffer}
              setIsQuantityUpdatedByOffer={setIsQuantityUpdatedByOffer}
              setShowValidationErrors={(value: boolean) => 
                setPageState(prev => ({ ...prev, showValidationErrors: value }))
              }
              setHasTriedToSubmit={(value: boolean) => 
                setPageState(prev => ({ ...prev, hasTriedToSubmit: value }))
              }
              updateCurrentFormData={(data: Record<string, any>) => {
                // تحديث بيانات النموذج الحالية
                setPageState(prev => ({ 
                  ...prev, 
                  submittedFormData: { ...prev.submittedFormData, ...data } 
                }));
              }}
            />
          </Suspense>

          {/* مكونات التتبع - تحميل متأخر */}
          {pageState.isComponentsLoaded && actualProductId && organizationId && (
            <Suspense fallback={null}>
              <ProductTrackingContainer
                ref={conversionTrackerRef}
                productId={actualProductId}
                organizationId={organizationId}
                product={effectiveProduct}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                quantity={quantity}
                productTracking={productTracking}
              />
            </Suspense>
          )}
        </div>

        {/* أدوات التشخيص - تحميل متأخر فقط في التطوير */}
        {process.env.NODE_ENV === 'development' && pageState.isComponentsLoaded && (
          <Suspense fallback={null}>
            <ProductDebugTools
              productId={actualProductId!}
              organizationId={organizationId!}
              productTracking={productTracking}
            />
          </Suspense>
        )}
      </ProductPageProvider>
    </>
  );
});

ProductPurchasePageV3.displayName = 'ProductPurchasePageV3';

export default ProductPurchasePageV3;
