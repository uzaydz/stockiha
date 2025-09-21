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

  if (renderCount.current === 1) {
    console.log('🏪 [STORE-PAGE] تهيئة صفحة المتجر', {
      url: window.location.href,
      startTime: storePageStartTime.current,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
      } : 'غير متوفر'
    });
  }

  if (renderCount.current > 12) {
    console.warn('⚠️ [STORE-PAGE] عدد renders مرتفع جداً:', renderCount.current);
  }
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
  // استخدام Hook لضمان تحديث العنوان والأيقونة
  useDynamicTitle();
  
  // لا نستخدم TenantContext في المتجر العام لتقليل الاعتمادات الثقيلة
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
    hasStoreError,
    isLoadingStoreData,
  } = useStorePageData();

  const { isLoaderVisible } = useGlobalLoading();
  
  // 🔥 إصلاح: إزالة forceRender لمنع إعادة render المتكررة
  // البيانات تأتي الآن مباشرة من useStorePageData دون حاجة لإجبار re-render

  // 🔥 إصلاح: منع إعادة الإنشاء المتكرر مع تحسين الـ hydration
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);
  
  const hasComponents = componentsToRender && componentsToRender.length > 0;
  const isCheckingStore = !hasStoreError && (!isAppReady || isLoadingStoreData);

  const shouldShowLoader = useMemo(() => {
    if (isLoadingStoreData) {
      return true;
    }
    if (!isAppReady && !hasStoreError) {
      return true;
    }
    if (!hasComponents && !hasStoreError) {
      return true;
    }
    return false;
  }, [hasComponents, hasStoreError, isAppReady, isLoadingStoreData]);

  // 🔥 تحسين: استخدام useMemo للمكون الرئيسي لمنع إعادة الإنشاء
  const memoizedStoreContent = useMemo(() => {
    if (renderCount.current === 1) {
      console.log('🔍 [StorePage] إنشاء memoizedStoreContent', {
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
          isCheckingStore={isCheckingStore}
          hasStoreError={hasStoreError}
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
    seoSettings?.id,
    centralOrgId,
    categories?.length,
    footerSettings?.id,
    componentsToRender?.length,
    featuredProducts?.length,
    organizationSettings?.id,
    unifiedLoading.shouldShowGlobalLoader
  ]);

  // 🔥 إصلاح: إظهار مؤشر خفيف جداً فقط لتجنب نصوص متغيرة وفلاشينغ
  if (shouldShowLoader) {
    if (renderCount.current === 1) {
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
    if (renderCount.current === 1) {
      console.log('🎯 [StorePage] Hiding content due to isLoaderVisible');
    }
    return null;
  }

  // البيانات جاهزة، عرض المتجر مع SafeHydrate لمنع مشاكل الـ hydration
  // تقليل رسائل التصحيح - عرض كل 4 renders فقط
  if (renderCount.current === 1) {
    console.log('🔍 [StorePage] قرار العرض النهائي:', {
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
