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
  
  console.log('🏪 [STORE-PAGE] تهيئة صفحة المتجر', {
    renderCount: renderCount.current,
    startTime: storePageStartTime.current,
    url: window.location.href,
    memoryUsage: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
    } : 'غير متوفر'
  });
  
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

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase, updateProgress, isLoaderVisible } = useGlobalLoading();
  
  // 🚨 إضافة حالة لإجبار re-render عند وصول البيانات - محسنة لتقليل التكرار
  const [forceRender, setForceRender] = React.useState(0);
  const lastDataReadyTime = useRef(0);
  
  // 🚨 استماع لأحداث البيانات لإجبار re-calculation - محسن لتجنب التكرار المفرط
  useEffect(() => {
    const handleDataReady = () => {
      const now = Date.now();
      // منع إعادة الرسم المتكرر خلال 100ms
      if (now - lastDataReadyTime.current > 100) {
        lastDataReadyTime.current = now;
        if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
          console.log('🚨 [StorePage] Data ready event received, forcing re-render');
        }
        setForceRender(prev => prev + 1);
      }
    };

    window.addEventListener('storeDataReady', handleDataReady);
    window.addEventListener('storeInitDataReady', handleDataReady);

    return () => {
      window.removeEventListener('storeDataReady', handleDataReady);
      window.removeEventListener('storeInitDataReady', handleDataReady);
    };
  }, []);

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
    storeInfo?.id,
    organizationSettings?.id,
    storeName,
    logoUrl,
    centralOrgId,
    componentsToRender?.length,
    categories?.length,
    featuredProducts?.length,
    footerSettings?.id,
    seoSettings?.id
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

  // 🔥 تحسين: قرار عرض المؤشر محسن مع فحص البيانات المتقدم
  const shouldShowLoader = useMemo(() => {
    // 🚨 فحص إضافي: البيانات من مصادر مختلفة
    const windowEarlyData = (window as any).__EARLY_STORE_DATA__;
    const windowSharedData = (window as any).__SHARED_STORE_DATA__;
    const windowCurrentStoreData = (window as any).__CURRENT_STORE_DATA__;
    
    // فحص وجود البيانات في أي من المصادر
    const hasWindowData = !!(windowEarlyData?.data || windowSharedData || windowCurrentStoreData);
    
    // فحص البيانات الأساسية للمتجر
    const hasOrganizationData = !!(
      windowEarlyData?.data?.organization_details ||
      windowSharedData?.organization ||
      windowCurrentStoreData?.organization ||
      currentOrganization
    );
    
    const hasOrganizationSettings = !!(
      windowEarlyData?.data?.organization_settings ||
      windowSharedData?.organizationSettings ||
      windowCurrentStoreData?.organizationSettings
    );
    
    // إذا كانت البيانات متوفرة، لا نحتاج loader
    const hasValidStoreData = hasOrganizationData || hasOrganizationSettings || storeInfo;
    
    // منطق محسن للتحديد
    let result = false;
    
    // أظهر loader فقط إذا:
    // 1. النظام الموحد يطلب ذلك
    // 2. أو إذا كان tenant loading ولا توجد بيانات صالحة
    // 3. أو إذا لم توجد أي بيانات للمتجر
    if (unifiedLoading.shouldShowGlobalLoader) {
      result = true;
    } else if (tenantLoading && !hasValidStoreData) {
      result = true;
    } else if (!hasValidStoreData && !hasWindowData) {
      result = true;
    }
    
    // 🚀 إجبار عدم إظهار loader إذا كانت البيانات متوفرة
    if (hasValidStoreData || hasWindowData) {
      result = false;
    }
    
    // تقليل رسائل التصحيح لتجنب التأثير على الأداء
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) { // 5% فقط
      console.log('🎯 [StorePage] shouldShowLoader calculation:', {
        unifiedLoadingShouldShow: unifiedLoading.shouldShowGlobalLoader,
        tenantLoading,
        hasCurrentOrganization: !!currentOrganization,
        hasStoreInfo: !!storeInfo,
        hasWindowData,
        hasOrganizationData,
        hasOrganizationSettings,
        hasValidStoreData,
        finalResult: result,
        dataBreakdown: {
          windowEarlyData: !!windowEarlyData?.data,
          windowSharedData: !!windowSharedData,
          windowCurrentStoreData: !!windowCurrentStoreData,
          currentOrganization: !!currentOrganization,
          storeInfo: !!storeInfo
        }
      });
    }
    
    return result;
  }, [unifiedLoading.shouldShowGlobalLoader, tenantLoading, currentOrganization?.id, storeInfo?.id, forceRender]);

  // 🔥 تحسين: استخدام useMemo للمكون الرئيسي لمنع إعادة الإنشاء
  const memoizedStoreContent = useMemo(() => (
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
  ), [
    storeName,
    seoSettings?.id,
    centralOrgId,
    categories?.length,
    footerSettings?.id,
    componentsToRender?.length,
    featuredProducts?.length,
    organizationSettings?.id,
    unifiedLoading.shouldShowGlobalLoader
  ]);

  // تقليل رسائل التصحيح لتجنب التأثير على الأداء
  if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
    console.log('🎯 [StorePage] Rendering decision:', {
      shouldShowLoader,
      isLoaderVisible,
      willRenderContent: !shouldShowLoader && !isLoaderVisible
    });
  }

  // 🔥 إصلاح: إظهار مؤشر خفيف جداً فقط لتجنب نصوص متغيرة وفلاشينغ
  if (shouldShowLoader) {
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🎯 [StorePage] Showing loader due to shouldShowLoader');
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
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.1) {
      console.log('🎯 [StorePage] Hiding content due to isLoaderVisible');
    }
    return null;
  }

  // البيانات جاهزة، عرض المتجر مع SafeHydrate لمنع مشاكل الـ hydration
  return (
    <SafeHydrate>
      {memoizedStoreContent}
    </SafeHydrate>
  );
});

// 🔥 تحسين: إضافة displayName للتطوير
StorePage.displayName = 'StorePage';

export default StorePage;
