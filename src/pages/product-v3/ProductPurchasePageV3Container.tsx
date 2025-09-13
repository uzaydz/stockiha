import React, { useMemo, useRef, useState, lazy, Suspense, useCallback, useEffect, memo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useTenantSafe } from '@/context/tenant/useTenantSafe';
import { ProductPageProvider } from '@/context/ProductPageContext';
import { ProductErrorPage } from '@/components/product/ProductErrorPage';
import { useDeliveryCalculation } from '@/components/product-page/useDeliveryCalculation';
import { useSpecialOffers } from '@/components/product-page/useSpecialOffers';
import { useOrderHandler } from '@/components/product-page/useOrderHandler';
import useProductPurchase from '@/hooks/useProductPurchase';
import { useAbandonedCartTracking } from '@/hooks/useAbandonedCartTracking';

// ✅ تحسين: تفعيل product page optimizer
import { productPageOptimizer, enableProductAnalytics } from '@/utils/productPageOptimizer';

import ProductNavbarShell from './components/ProductNavbarShell';
import ProductMainContent from './components/ProductMainContent';
const ProductTrackers = lazy(() => import('./components/ProductTrackers'));
import ProductSEO from './components/ProductSEO';

import { isLowEndDevice } from './utils/device';
import { usePreloadedProductData } from './hooks/usePreloadedProductData';
import { useInitialQueryData } from './hooks/useInitialQueryData';
import { useUnifiedData } from './hooks/useUnifiedData';
import { useOrgCartSettings } from './hooks/useOrgCartSettings';
import { useLateComponentsReady } from './hooks/useLateComponentsReady';
import { useTracking } from './hooks/useTracking';
import { usePurchaseActions } from './hooks/usePurchaseActions';
import { updateLanguageFromSettings } from '@/lib/language/languageManager';
import { 
  isProductReadyForDisplay, 
  shouldShowLoadingScreen, 
  shouldShowTopLoader, 
  getLoadingMessage 
} from '@/utils/productLoadingFix';
import { useRenderDiagnostics } from '@/utils/renderDiagnostics';

const ProductDebugTools = lazy(() => import('@/components/product-page/ProductDebugTools').then(m => ({ default: m.ProductDebugTools })));

const ProductPurchasePageV3Container: React.FC = memo(() => {
  const isDev = process.env.NODE_ENV === 'development';
  const componentStartTime = performance.now();
  const renderCount = useRef(0);
  renderCount.current++;

  const { productId, productIdentifier } = useParams<{ productId?: string; productIdentifier?: string }>();
  const actualProductId = productIdentifier || productId;

  // 🔧 تشخيص الرندر المتكرر باستخدام الأداة المخصصة
  const diagnostics = useRenderDiagnostics('ProductPurchasePageV3Container', {
    actualProductId,
    renderCount: renderCount.current
  });
  
  // 🔍 مراقبة شاملة لصفحة المنتج - تشخيص الرندر المتكرر
  console.log('🧭 [PRODUCT-V3] تهيئة صفحة المنتج', {
    actualProductId,
    url: typeof window !== 'undefined' ? window.location.href : 'ssr',
    renderCount: renderCount.current,
    startTime: componentStartTime,
    memoryUsage: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
    } : 'غير متوفر'
  });

  // 🚨 تشخيص أسباب الرندر المتكرر مع تتبع التغييرات
  const previousValues = useRef<{
    actualProductId: string;
    organizationId: string;
    isOrganizationLoading: boolean;
    isOrganizationReady: boolean;
    lastValidRender: React.ReactElement | null;
  }>({
    actualProductId: '',
    organizationId: '',
    isOrganizationLoading: false,
    isOrganizationReady: false,
    lastValidRender: null
  });

  // 🚫 منع الرندر المتكرر المفرط
  if (renderCount.current > 15) {
    console.error(`🚫 [PRODUCT-V3] رندر متكرر مفرط تم إيقافه نهائياً - ${renderCount.current} مرات`);
    // إرجاع آخر حالة صالحة
    return previousValues.current.lastValidRender || (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">جاري إصلاح مشكلة الأداء...</p>
        </div>
      </div>
    );
  }
  
  // 🔍 Debug: معرّفات أساسية - تقليل التسجيل في الإنتاج
  if (process.env.NODE_ENV === 'development' && renderCount.current <= 3) {
    console.log('🧭 [ProductV3] init', {
      actualProductId,
      url: typeof window !== 'undefined' ? window.location.href : 'ssr',
      renderCount: renderCount.current
    });
  }
  const {
    currentOrganization: organization,
    isLoading: isOrganizationLoading,
    isOrganizationReady = false
  } = useTenantSafe();

  // 🔎 الحصول على organizationId بأسرع شكل ممكن (fallback لـ window/localStorage)
  const fastOrganizationId = useMemo(() => {
    try {
      const win: any = typeof window !== 'undefined' ? window : {};
      const early = win.__EARLY_STORE_DATA__?.data || win.__EARLY_STORE_DATA__;
      const winOrg = win.__TENANT_CONTEXT_ORG__;
      const fromWindow = early?.organization_details?.id || early?.organization?.id || winOrg?.id || null;
      if (fromWindow) return String(fromWindow);
      const fromLS = localStorage.getItem('bazaar_organization_id');
      if (fromLS && fromLS.length > 10) return fromLS;
    } catch {}
    return null;
  }, []);

  // 🔇 تقليل ضوضاء التشخيص في التطوير فقط وبدون مؤقتات
  if (process.env.NODE_ENV === 'development' && renderCount.current === 6) {
    console.warn('🚨 [PRODUCT-V3] رندر متكرر (مرة 6)');
  }

  // تحديث القيم المرجعية
  previousValues.current = {
    actualProductId: actualProductId || '',
    organizationId: organization?.id || '',
    isOrganizationLoading,
    isOrganizationReady,
    lastValidRender: previousValues.current.lastValidRender // الحفاظ على القيمة السابقة
  };

  // 🔍 مراقبة تغييرات المؤسسة
  if (renderCount.current <= 5) {
    console.log('🏢 [PRODUCT-V3] organization state', {
      renderCount: renderCount.current,
      hasOrganization: !!organization,
      organizationId: organization?.id,
      isLoading: isOrganizationLoading,
      isReady: isOrganizationReady
    });
  }
  const [searchParams] = useSearchParams();
  const disableTracking = (searchParams.get('notrack') === '1') || (searchParams.get('fast') === '1');
  const organizationId = organization?.id || fastOrganizationId || null;
  const lowEnd = useMemo(() => isLowEndDevice(), []);
  // ✅ إصلاح: تبسيط منطق التمكين - دع الـ API يتعامل مع حالة الـ slug
  const isSlug = actualProductId && !actualProductId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  // لا نبدأ الجلب حتى يتوفر organizationId لتفادي سقوط إلى الدالة القديمة
  const shouldEnableQuery = !!(actualProductId && organizationId);

  // Component initialization tracking removed

  // UI state
  const [pageState, setPageState] = useState({
    submittedFormData: {} as Record<string, any>,
    showValidationErrors: false,
    hasTriedToSubmit: false
  });

  // 🔍 مراقبة تغييرات PageState
  if (renderCount.current <= 5) {
    console.log('📋 [PRODUCT-V3] page state', {
      renderCount: renderCount.current,
      pageState: {
        formDataKeys: Object.keys(pageState.submittedFormData),
        showValidationErrors: pageState.showValidationErrors,
        hasTriedToSubmit: pageState.hasTriedToSubmit
      }
    });
  }
  const isComponentsLoaded = useLateComponentsReady(organizationId);
  const conversionTrackerRef = useRef<any>(null);

  // Data layer
  const { preloadedData } = usePreloadedProductData(actualProductId, organizationId);
  const initialQueryData = useInitialQueryData();

  // 🔥 إصلاح: استخدم بيانات الـ preloader مع استجابة فورية وcache مستقر
  const mergedInitialData = useMemo(() => {

    const mergeStartTime = performance.now();
    let result;

    // 🔥 إصلاح: أولوية للبيانات المحملة مسبقاً من أي مصدر
    if (preloadedData && preloadedData.product) {
      const p = preloadedData.product;
      result = {
        product: p,
        organization: p?.organization || null,
        organizationSettings: null,
        visitorAnalytics: preloadedData.stats || null,
        categories: [],
        provinces: [],
        trackingData: preloadedData.stats || null,
      } as any;
    }
    // fallback للبيانات من DOM
    else if (initialQueryData) {
      result = initialQueryData;
    } 
    // 🔥 جديد: fallback للبيانات من window object إذا كانت متوفرة
    else if (typeof window !== 'undefined') {
      const windowData = (window as any).__EARLY_STORE_DATA__;
      if (windowData?.data?.organization_details) {
        result = {
          product: null, // سنحصل عليه من API
          organization: windowData.data.organization_details,
          organizationSettings: windowData.data.organization_settings,
          categories: windowData.data.categories || [],
          provinces: [],
          trackingData: null,
        } as any;
      }
    }

    const mergeTime = performance.now() - mergeStartTime;
    try {
      if (renderCount.current <= 2) { // تقليل التسجيل أكثر
        console.log('🧩 [ProductV3] mergedInitialData', {
          renderCount: renderCount.current,
          hasPreloaded: !!preloadedData,
          hasInitialQueryData: !!initialQueryData,
          hasWindowData: !!(typeof window !== 'undefined' && (window as any).__EARLY_STORE_DATA__),
          mergeTime,
          resultKeys: result ? Object.keys(result) : [],
          actualProductId
        });
      }
    } catch {}
    return result;
  }, [
    // تقليل dependencies لمنع re-computation مفرط
    actualProductId,
    preloadedData?.product?.id, // استخدام القيمة المباشرة بدلاً من Boolean
    initialQueryData?.timestamp // استخدام timestamp للتغيير الفعلي فقط
  ]);

  // Component render tracking removed

  // useUnifiedData initialization tracking removed

  // ✅ تحسين: ابدأ الجلب بمجرد توفر معرف المنتج، وسلّم organizationId إذا توفر
  const { unifiedData, effectiveData, effectiveProduct, queryLoading, queryError } = useUnifiedData({
    productId: actualProductId,
    organizationId: organizationId || undefined,
    initialData: mergedInitialData,
    enabled: shouldEnableQuery
  });

  // 🔍 مراقبة تغييرات البيانات الموحدة
  if (renderCount.current <= 5) {
    console.log('📊 [PRODUCT-V3] unified data state', {
      renderCount: renderCount.current,
      hasEffectiveProduct: !!effectiveProduct,
      queryLoading,
      hasError: !!queryError,
      initialDataPresent: !!mergedInitialData
    });
  }
  // 🔍 Debug: حالة الجلب الموحدة
  try {
    console.log('📡 [ProductV3] unifiedData status', {
      productId: actualProductId,
      organizationId,
      hasEffectiveProduct: !!effectiveProduct?.id,
      queryLoading,
      queryError
    });
  } catch {}

  // 🔥 إصلاح: استدعاء hooks مع حماية من الرندر المفرط
  const { organizationSettings, showAddToCart } = useOrgCartSettings(
    organizationId, 
    effectiveData // دائماً مرر effectiveData، الدالة تتعامل مع null داخلياً
  );

  // 🔥 إصلاح: stableParams مثبت لمنع re-render loop
  const stableParams = useMemo(() => {
    // تثبيت القيم فور توفرها لمنع التغيير المستمر
    const finalProductId = actualProductId || null;
    const finalOrgId = organizationId || null;
    
    // منطق ready بسيط وثابت
    const isReady = !!(finalProductId && finalOrgId);
    
    const params = {
      productId: isReady ? finalProductId : undefined,
      organizationId: finalOrgId || undefined,
      dataScope: 'full' as const,
      enabled: !!finalProductId // تبسيط: تمكين عند وجود productId فقط
    };

    // تسجيل مختصر فقط عند التغيير الفعلي
    if (process.env.NODE_ENV === 'development' && renderCount.current === 1) {
      console.log('⚙️ [ProductV3] stableParams initialized', {
        productId: finalProductId,
        organizationId: finalOrgId,
        enabled: params.enabled
      });
    }
    
    return params;
  }, [actualProductId, organizationId?.length]); // استخدام length لتقليل التغييرات

  // ✅ إصلاح: إزالة شرط isDev لأن المكون يحتاج للعمل في الإنتاج أيضًا
  const [state, actions] = useProductPurchase({
    ...stableParams,
    preloadedProduct: effectiveProduct
  });

  // 🔍 مراقبة تغييرات حالة الشراء
  if (renderCount.current <= 5) {
    console.log('🛒 [PRODUCT-V3] purchase state', {
      renderCount: renderCount.current,
      hasState: !!state,
      quantity: state?.quantity,
      selectedColor: state?.selectedColor?.id,
      selectedSize: state?.selectedSize?.id,
      canPurchase: state?.canPurchase
    });
  }

  // ✅ إصلاح: إزالة شرط isDev
  const { deliveryCalculation, summaryData } = useDeliveryCalculation({
    organizationId,
    product: effectiveProduct,
    formData: pageState.submittedFormData,
    quantity: state.quantity
  });

  // ✅ إصلاح: إزالة شرط isDev
  const {
    selectedOffer,
    setSelectedOffer,
    isQuantityUpdatedByOffer,
    setIsQuantityUpdatedByOffer,
    finalPriceCalculation
  } = useSpecialOffers({ product: effectiveProduct, quantity: state.quantity, priceInfo: state.priceInfo });

  // ✅ إصلاح: إزالة شرط isDev
  const [isSavingCart, abandonedCartActions] = useAbandonedCartTracking({
    productId: actualProductId,
    productColorId: state.selectedColor?.id,
    productSizeId: state.selectedSize?.id,
    quantity: state.quantity,
    subtotal: state.priceInfo?.price || 0,
    deliveryFee: deliveryCalculation?.deliveryFee || 0,
    discountAmount: state.priceInfo?.discount || 0,
    organizationId,
    enabled: !!actualProductId && !!organizationId,
    saveInterval: 5,
    minPhoneLength: 8
  });

  // ✅ إصلاح: إزالة شرط isDev
  const productTracking = useTracking(actualProductId, organizationId, effectiveProduct);

  const { handleFormChange, handleQuantityChange } = usePurchaseActions({
    canPurchase: state.canPurchase,
    pageState,
    setPageState,
    actions,
    effectiveProduct,
    productTracking,
    priceInfo: state.priceInfo,
    selectedColor: state.selectedColor,
    selectedSize: state.selectedSize
  });

  // ✅ إصلاح: إزالة شرط isDev
  const { handleFormSubmit, handleBuyNow: handleBuyNowBase } = useOrderHandler({
    product: effectiveProduct,
    organizationId,
    quantity: state.quantity,
    priceInfo: state.priceInfo,
    deliveryCalculation,
    selectedColor: state.selectedColor,
    selectedSize: state.selectedSize,
    selectedOffer,
    productTracking,
    abandonedCartActions,
    conversionTrackerRef
  });

  // 🔥 إصلاح: useCallback محسن لمنع re-render غير ضروري مع dependencies مثبتة
  const handleBuyNow = useCallback(() => {
    handleBuyNowBase(
      state.canPurchase,
      pageState.submittedFormData,
      (v: boolean) => setPageState(prev => ({ ...prev, hasTriedToSubmit: v })),
      (v: boolean) => setPageState(prev => ({ ...prev, showValidationErrors: v }))
    );
  }, [handleBuyNowBase, state.canPurchase, pageState.submittedFormData?.length]);

  // 🔥 إصلاح: منطق تحميل محسن للاستجابة الفورية للبيانات
  const shouldShowLoading = useMemo(() => {
    // أولوية عالية: إذا وصل المنتج من أي مصدر، أوقف التحميل فوراً
    const hasEffectiveProduct = !!(effectiveProduct?.id);
    const hasPreloadedProduct = !!(mergedInitialData?.product?.id);
    
    if (hasEffectiveProduct || hasPreloadedProduct) {
      return false; // فورياً أوقف التحميل
    }
    
    // إذا كان هناك خطأ أو لا نحمل، لا نظهر التحميل
    if (queryError || !queryLoading) {
      return false;
    }
    
    // نظهر التحميل فقط إذا كنا نحمل بدون بيانات أو أخطاء
    return true;
  }, [effectiveProduct?.id, mergedInitialData?.product?.id, queryLoading, queryError]);

  // 🔥 إصلاح: رسالة تحميل محسنة مع تفاصيل التقدم
  const loadingMessage = useMemo(() => {
    // إذا كان المنتج موجود، لا نحتاج رسالة تحميل
    if (effectiveProduct?.id) return null;
    
    // رسائل تقدمية بناءً على المرحلة
    if (queryError) return 'فشل في تحميل المنتج';
    if (queryLoading) {
      // رسائل متدرجة بناءً على الوقت
      return renderCount.current <= 2 ? 'جاري الاتصال...' : 'جاري تحميل المنتج...';
    }
    
    return null;
  }, [effectiveProduct?.id, queryLoading, queryError, renderCount.current]);

  const shouldShowUnifiedLoading = useMemo(() => {
    // تبسيط المنطق: فقط أظهر التحميل إذا لم يكن لدينا منتج ونحن نحمل
    return shouldShowLoading && !effectiveProduct?.id && renderCount.current <= 5;
  }, [shouldShowLoading, effectiveProduct?.id]);
  try {
    console.log('⏳ [ProductV3] loading gates', {
      shouldShowLoading,
      isReadyForDisplay: isProductReadyForDisplay(effectiveProduct, mergedInitialData, queryLoading),
      hasProduct: !!effectiveProduct?.id,
      loadingMessage
    });
  } catch {}

  // Disable smooth-scroll and animations on low-end devices, restore on unmount
  useEffect(() => {
    try {
      const html = document.documentElement;
      const body = document.body;
      const prevHtmlScroll = html.style.scrollBehavior;
      const prevBodyScroll = body.style.scrollBehavior;

      if (lowEnd) {
        html.classList.add('no-motion', 'no-smooth');
        body.classList.add('no-motion', 'no-smooth');
        html.style.scrollBehavior = 'auto';
        body.style.scrollBehavior = 'auto';
      }

      return () => {
        if (lowEnd) {
          html.classList.remove('no-motion', 'no-smooth');
          body.classList.remove('no-motion', 'no-smooth');
          html.style.scrollBehavior = prevHtmlScroll;
          body.style.scrollBehavior = prevBodyScroll;
        }
      };
    } catch {}
  }, [lowEnd]);

  // ✅ تحسين: تفعيل product page optimizer
  useEffect(() => {
    // تفعيل analytics فقط إذا كان لدينا منتج ومؤسسة
    if (effectiveProduct?.id && organizationId && !disableTracking) {
      enableProductAnalytics();
    }

    // تنظيف عند إلغاء mount
    return () => {
      productPageOptimizer.cleanup();
    };
  }, [effectiveProduct?.id, organizationId, disableTracking]);

  // Ensure org theme and language are applied once settings are available
  useEffect(() => {
    if (!organizationId || !organizationSettings) return;

    const run = () => {
      // Apply theme colors/mode based on org settings (deferred)
      import('@/lib/themeManager')
        .then(({ forceApplyOrganizationTheme }) => {
          try {
            forceApplyOrganizationTheme(organizationId, {
              theme_primary_color: (organizationSettings as any)?.theme_primary_color,
              theme_secondary_color: (organizationSettings as any)?.theme_secondary_color,
              theme_mode: (organizationSettings as any)?.theme_mode,
              custom_css: (organizationSettings as any)?.custom_css,
            });
          } catch {}
        })
        .catch(() => {});

      // Apply organization default language if present
      try {
        const lang = (organizationSettings as any)?.default_language;
        if (lang && ['ar', 'en', 'fr'].includes(lang)) {
          updateLanguageFromSettings(lang);
        }
      } catch {}
    };

    try {
      if (typeof (window as any).requestIdleCallback === 'function') {
        (window as any).requestIdleCallback(run, { timeout: 1200 });
      } else {
        setTimeout(run, 300);
      }
    } catch {
      setTimeout(run, 300);
    }
  }, [organizationId, organizationSettings]);

  // 🔥 إصلاح: شريط تحميل محسن مع dependencies مقللة
  const showTopLoader = useMemo(() => {
    // منع إعادة الحساب إذا كان هناك رندر مفرط
    if (renderCount.current > 5) return false;
    
    // لا نظهر شريط التحميل إذا كان لدينا منتج أو بيانات مبدئية
    const hasProductData = !!(effectiveProduct?.id || mergedInitialData?.product?.id);
    if (hasProductData) return false;
    
    // نظهر شريط التحميل فقط إذا كنا نحمل ولمدة قصيرة
    return queryLoading && !isOrganizationLoading;
  }, [effectiveProduct?.id, mergedInitialData?.product?.id, queryLoading, isOrganizationLoading, renderCount.current > 5]); // إضافة شرط للرندر المتكرر

  // Loading / Error gates - استخدام المُحسَّن والموحد

  // ✅ إصلاح جذري: لا مزيد من شاشات التحميل على الإطلاق!
  // نعرض الصفحة فوراً مع skeleton UI أو البيانات المتاحة
  
  // فقط في حالات الخطأ الحرجة نعرض شاشة تحميل
  const isCriticalError = !actualProductId;
  
  if (isCriticalError && shouldShowUnifiedLoading) {
    if (isDev) 
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">جاري التحضير...</p>
        </div>
      </div>
    );
  }
  if (queryError) {
    try {
      console.error('💥 [ProductV3] query error:', {
        error: String(queryError),
        productId: actualProductId,
        organizationId
      });
    } catch {}
    if (isDev) console.error('💥 [ProductPurchasePageV3Container] عرض صفحة الخطأ:', {
      error: String(queryError),
      productId: actualProductId,
      organizationId
    });
    return (
      <>
        <ProductSEO product={effectiveProduct} organization={organization} organizationSettings={organizationSettings} productId={actualProductId} />
        <ProductErrorPage error={queryError} onRetry={() => unifiedData.refetch?.()} productId={actualProductId!} organizationId={organizationId!} />
      </>
    );
  }

  const totalRenderTime = performance.now() - componentStartTime;

  // حفظ آخر حالة رندر صالحة للطوارئ
  previousValues.current.lastValidRender = null; // سيتم تحديثها بعد الرندر

  const renderResult = (
    <>
      {/* شريط تحميل صغير في الأعلى - بدلاً من شاشة تحميل كاملة */}
      {showTopLoader && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-primary/95 backdrop-blur-sm">
          <div className="flex items-center justify-center py-1.5 text-xs text-white font-medium">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className="w-2.5 h-2.5 border border-white border-t-transparent rounded-full animate-spin"></div>
              <span>{loadingMessage || 'جاري التحديث...'}</span>
            </div>
          </div>
          {/* شريط تقدم مبسط */}
          <div className="h-0.5 bg-white/20">
            <div 
              className="h-full bg-white transition-all duration-300 ease-out"
              style={{ 
                width: effectiveProduct?.id ? '100%' : '60%'
              }}
            ></div>
          </div>
        </div>
      )}

      <ProductSEO
        product={effectiveProduct}
        organization={organization}
        organizationSettings={organizationSettings}
        productId={actualProductId}
        priceInfo={state.priceInfo}
        availableStock={state.availableStock}
      />

      <ProductPageProvider>
        <div 
          className={`min-h-screen bg-background ${lowEnd ? 'transition-none' : 'transition-colors duration-300'}`}
          style={{ paddingTop: showTopLoader ? '2.5rem' : '0', transition: 'padding-top 0.3s ease' }}
        >
          {/* Restore store-style navbar for consistency */}
          <ProductNavbarShell lowEnd={lowEnd} hideCategories={true} />

          <ProductMainContent
            lowEnd={lowEnd}
            product={effectiveProduct || mergedInitialData?.product} // ✅ استخدام البيانات المبدئية كـ fallback
            state={state}
            actions={actions}
            formData={state.formData}
            formStrategy={state.formStrategy}
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
            setShowValidationErrors={(v: boolean) => setPageState(prev => ({ ...prev, showValidationErrors: v }))}
            setHasTriedToSubmit={(v: boolean) => setPageState(prev => ({ ...prev, hasTriedToSubmit: v }))}
            updateCurrentFormData={(data: Record<string, any>) => setPageState(prev => ({ ...prev, submittedFormData: { ...prev.submittedFormData, ...data } }))}
            showAddToCart={showAddToCart}
          />

          <Suspense fallback={null}>
            <ProductTrackers
              enabled={!!(isComponentsLoaded && actualProductId && organizationId && !disableTracking)}
              productId={actualProductId!}
              organizationId={organizationId!}
              product={effectiveProduct}
              selectedColor={state.selectedColor}
              selectedSize={state.selectedSize}
              quantity={state.quantity}
              productTracking={productTracking}
              conversionTrackerRef={conversionTrackerRef}
            />
          </Suspense>
        </div>

        {process.env.NODE_ENV === 'development' && isComponentsLoaded && (
          <Suspense fallback={null}>
            <ProductDebugTools productId={actualProductId!} organizationId={organizationId!} productTracking={productTracking} />
          </Suspense>
        )}
      </ProductPageProvider>
    </>
  );

  // حفظ النتيجة كآخر حالة صالحة
  previousValues.current.lastValidRender = renderResult;

  return renderResult;
});

ProductPurchasePageV3Container.displayName = 'ProductPurchasePageV3Container';

export default ProductPurchasePageV3Container;
