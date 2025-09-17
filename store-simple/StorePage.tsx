import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import SEOHead from './SEOHead';
import StoreLayout from './StoreLayout';
import StoreComponentRenderer from './StoreComponentRenderer';
import { useStorePageData } from '@/hooks/useStorePageData';
import { useGlobalLoading } from './GlobalLoadingManager';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import SafeHydrate from '@/components/common/SafeHydrate';

interface StorePageProps {
  // إزالة prop storeData لأننا نستخدم النظام المركزي الآن
}

// 🔥 تحسين: استخدام React.memo مع مقارنة مناسبة لمنع إعادة الإنشاء
const StorePage: React.FC<StorePageProps> = React.memo(() => {
  const storePageStartTime = useRef(performance.now());
  const renderCount = useRef(0);
  renderCount.current++;

  // تقليل رسائل التصحيح لتحسين الأداء - عرض كل 10 renders فقط
  const shouldLogRender = renderCount.current === 1 || renderCount.current % 10 === 0;
  if (shouldLogRender) {
    console.log('🏪 [STORE-PAGE] تهيئة صفحة المتجر', {
      renderCount: renderCount.current,
      startTime: storePageStartTime.current,
      url: window.location.href,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
      } : 'غير متوفر'
    });
  }

  // تحذير للـ renders المتكررة جداً
  if (renderCount.current > 20) {
    console.warn('⚠️ [STORE-PAGE] عدد renders مرتفع جداً:', renderCount.current);
  }
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
  // استخدام Hook لضمان تحديث العنوان والأيقونة
  useDynamicTitle();
  
  // لا نستخدم TenantContext في المتجر العام لتقليل الاعتمادات الثقيلة
  const tenantLoading = false;

  // استخدام الـ hook المخصص لجلب جميع البيانات
  const {
    // بيانات أساسية
    storeInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    currentOrganization,

    // بيانات المكونات
    componentsToRender,

    // بيانات الفئات والمنتجات
    categories,
    featuredProducts,

    // إعدادات
    footerSettings,
    seoSettings,

    // حالات التحميل - موحدة
    unifiedLoading,
    isAppReady,
  } = useStorePageData();

  // 🔍 DEBUG: تحليل البيانات المستلمة - عرض كل 5 renders فقط
  const shouldLogDataAnalysis = renderCount.current === 1 || renderCount.current % 5 === 0;
  if (shouldLogDataAnalysis) {
    console.log('🔍 [StorePage] تحليل البيانات من useStorePageData:', {
      renderCount: renderCount.current,
      storeName,
      centralOrgId,
      componentsToRenderCount: componentsToRender?.length || 0,
      categoriesCount: categories?.length || 0,
      featuredProductsCount: featuredProducts?.length || 0,
      storeInfo: !!storeInfo,
      organizationSettings: !!organizationSettings,
      isAppReady,
      unifiedLoading: {
        shouldShowGlobalLoader: unifiedLoading?.shouldShowGlobalLoader
      }
    });
  }

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase, updateProgress, isLoaderVisible } = useGlobalLoading();
  
  // 🔥 إصلاح: إزالة forceRender لمنع إعادة render المتكررة
  // البيانات تأتي الآن مباشرة من useStorePageData دون حاجة لإجبار re-render

  // 🔥 إصلاح: منع إعادة الإنشاء المتكرر مع تحسين الـ hydration
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);
  
  // 🔥 إصلاح: منع re-renders غير ضرورية أثناء الـ hydration
  const isHydrating = useRef(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      isHydrating.current = false;
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // إدارة مؤشر التحميل المركزي — عطّلناه في صفحة المتجر لاختصار الشاشات
  // نكتفي بالمؤشر الخفيف داخل الصفحة لتفادي الطبقات المتعددة

  // 🔥 تحسين: استخدام useMemo لتخزين البيانات المحسنة
  const enhancedStoreData = useMemo(() => ({
    storeInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    componentsToRender,
    categories,
    featuredProducts,
    footerSettings,
    seoSettings
  }), [
    storeInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    componentsToRender,
    categories,
    featuredProducts,
    footerSettings,
    seoSettings
  ]);

  // 🔥 تحسين: استخدام useMemo لتخزين حالة التحميل
  const loadingState = useMemo(() => ({
    unifiedLoading: unifiedLoading.shouldShowGlobalLoader,
    tenantLoading,
    hasOrganization: !!centralOrgId,
    hasStoreInfo: !!storeInfo,
    storeName
  }), [
    unifiedLoading.shouldShowGlobalLoader,
    tenantLoading,
    centralOrgId,
    storeInfo?.id,
    storeName
  ]);

  // 🔥 تحسين: حساب البيانات الصحيحة خارج useMemo
  const hasBasicData = !!(
    storeInfo ||
    currentOrganization ||
    organizationSettings ||
    (componentsToRender && componentsToRender.length > 0)
  );

  const windowData = (window as any);
  const hasWindowData = !!(
    windowData.__EARLY_STORE_DATA__?.data ||
    windowData.__SHARED_STORE_DATA__ ||
    windowData.__CURRENT_STORE_DATA__ ||
    windowData.__PREFETCHED_STORE_DATA__
  );

  const hasValidData = hasBasicData || (hasWindowData && componentsToRender && componentsToRender.length > 0 &&
    !componentsToRender.every(comp => comp?.id?.startsWith('fallback-')));

  // 🔥 تحسين: قرار عرض المؤشر مبسط ومحسن مع فحص المكونات
  const shouldShowLoader = useMemo(() => {
    // فحص مبسط: إذا كان النظام الموحد يطلب loader، أظهره
    if (unifiedLoading.shouldShowGlobalLoader) {
      return true;
    }

    // 🔥 إصلاح حاسم: إظهار loader إذا لم تكن هناك مكونات للعرض
    // هذا يضمن عدم عرض صفحة فارغة أثناء انتظار get_store_init_data
    const hasComponentsToRender = componentsToRender && componentsToRender.length > 0;
    
    // أظهر loader إذا:
    // 1. لا توجد بيانات أساسية
    // 2. لا توجد بيانات صحيحة 
    // 3. لا توجد مكونات للعرض (جديد)
    const shouldShow = !hasBasicData && (!hasValidData || !hasComponentsToRender);

    // تقليل رسائل التصحيح - عرض كل 10 renders فقط
    if (process.env.NODE_ENV === 'development' && renderCount.current % 10 === 0) {
      console.log('🎯 [StorePage] shouldShowLoader:', {
        renderCount: renderCount.current,
        unifiedLoading: unifiedLoading.shouldShowGlobalLoader,
        hasBasicData,
        hasWindowData,
        hasValidData,
        hasComponentsToRender,
        componentsToRenderCount: componentsToRender?.length || 0,
        shouldShow
      });
    }

    return shouldShow;
  }, [
    unifiedLoading.shouldShowGlobalLoader,
    hasBasicData,
    hasValidData,
    componentsToRender?.length
  ]);

  // 🔥 تحسين: استخدام useMemo للمكون الرئيسي لمنع إعادة الإنشاء
  const memoizedStoreContent = useMemo(() => {
    // تقليل رسائل التصحيح - عرض كل 3 renders فقط
    const shouldLogMemo = renderCount.current === 1 || renderCount.current % 3 === 0;
    if (shouldLogMemo) {
      console.log('🔍 [StorePage] إنشاء memoizedStoreContent:', {
        renderCount: renderCount.current,
        storeName,
        centralOrgId,
        componentsToRenderLength: componentsToRender?.length || 0,
        categoriesLength: categories?.length || 0,
        featuredProductsLength: featuredProducts?.length || 0
      });
    }

    return (
      <>
        {/* SEO Head */}
        <SEOHead
          storeName={storeName}
          seoSettings={seoSettings}
          organizationId={centralOrgId}
        />

        {/* Store Layout */}
        <StoreLayout
          storeName={storeName}
          categories={categories}
          footerSettings={footerSettings}
          centralOrgId={centralOrgId}
          organizationSettings={organizationSettings}
          logoUrl={logoUrl}
        >
          {/* Store Component Renderer */}
          <StoreComponentRenderer
            components={componentsToRender}
            centralOrgId={centralOrgId}
            storeName={storeName}
            categories={categories}
            featuredProducts={featuredProducts}
            organizationSettings={organizationSettings}
            unifiedLoading={unifiedLoading}
          />
        </StoreLayout>
      </>
    );
  }, [
    storeName,
    centralOrgId,
    componentsToRender?.length,
    unifiedLoading.shouldShowGlobalLoader
  ]);

  // تقليل رسائل التصحيح لتجنب التأثير على الأداء - عرض كل 8 renders فقط
  if (process.env.NODE_ENV === 'development' && renderCount.current % 8 === 0) {
    console.log('🎯 [StorePage] Rendering decision:', {
      renderCount: renderCount.current,
      shouldShowLoader,
      isLoaderVisible,
      willRenderContent: !shouldShowLoader && !isLoaderVisible
    });
  }

  // 🔥 إصلاح: إظهار مؤشر خفيف جداً فقط لتجنب نصوص متغيرة وفلاشينغ
  if (shouldShowLoader) {
    // تقليل رسائل التصحيح - عرض كل 5 renders فقط
    if (process.env.NODE_ENV === 'development' && renderCount.current % 5 === 0) {
      console.log('🎯 [StorePage] Showing loader due to shouldShowLoader', {
        renderCount: renderCount.current,
        shouldShowLoader
      });
    }
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <span className="sr-only">جار التحميل...</span>
        <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      </div>
    );
  }

  // إذا كان مؤشر التحميل مرئي، لا تعرض محتوى
  if (isLoaderVisible) {
    // تقليل رسائل التصحيح - عرض كل 5 renders فقط
    if (process.env.NODE_ENV === 'development' && renderCount.current % 5 === 0) {
      console.log('🎯 [StorePage] Hiding content due to isLoaderVisible', {
        renderCount: renderCount.current,
        isLoaderVisible
      });
    }
    return null;
  }

  // البيانات جاهزة، عرض المتجر مع SafeHydrate لمنع مشاكل الـ hydration
  // تقليل رسائل التصحيح - عرض كل 4 renders فقط
  if (renderCount.current % 4 === 0) {
    console.log('🔍 [StorePage] قرار العرض النهائي:', {
      renderCount: renderCount.current,
      willShowLoader: false,
      willShowContent: true,
      componentsToRenderCount: componentsToRender?.length || 0,
      isAppReady,
      storeName,
      renderTime: performance.now() - storePageStartTime.current + 'ms'
    });
  }

  return (
    <SafeHydrate>
      {memoizedStoreContent}
    </SafeHydrate>
  );
});

// 🔥 تحسين: إضافة displayName للتطوير
StorePage.displayName = 'StorePage';

export default StorePage;
