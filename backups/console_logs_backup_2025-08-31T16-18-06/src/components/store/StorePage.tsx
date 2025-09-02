import React, { useEffect, useCallback, useMemo, useRef } from 'react';
import SEOHead from './SEOHead';
import StoreLayout from './StoreLayout';
import StoreComponentRenderer from './StoreComponentRenderer';
import { useStorePageData } from '@/hooks/useStorePageData';
import { useGlobalLoading } from './GlobalLoadingManager';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';
import { useTenant } from '@/context/TenantContext';

interface StorePageProps {
  // إزالة prop storeData لأننا نستخدم النظام المركزي الآن
}

// 🔥 تحسين: استخدام React.memo مع مقارنة مناسبة لمنع إعادة الإنشاء
const StorePage: React.FC<StorePageProps> = React.memo(() => {
  console.log('🚀 StorePage: بدء التهيئة');
  
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const isInitialized = useRef(false);
  
  // استخدام Hook لضمان تحديث العنوان والأيقونة
  useDynamicTitle();
  
  // الحصول على حالة TenantContext
  const { isLoading: tenantLoading, currentOrganization } = useTenant();
  
  console.log('🔍 StorePage: حالة TenantContext', { 
    tenantLoading, 
    currentOrganization: currentOrganization ? { id: currentOrganization.id, name: currentOrganization.name } : null 
  });
  
  // استخدام الـ hook المخصص لجلب جميع البيانات
  const {
    // بيانات أساسية
    storeInfo,
    organizationSettings,
    storeName,
    logoUrl,
    centralOrgId,
    
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

  console.log('🔍 StorePage: بيانات المتجر', { 
    storeInfo: storeInfo ? { id: storeInfo.id, name: storeInfo.name } : null,
    organizationSettings: organizationSettings ? { id: organizationSettings.id, site_name: organizationSettings.site_name } : null,
    storeName,
    logoUrl,
    centralOrgId,
    componentsToRender: componentsToRender?.length || 0,
    categories: categories?.length || 0,
    featuredProducts: featuredProducts?.length || 0,
    unifiedLoading: {
      shouldShowGlobalLoader: unifiedLoading.shouldShowGlobalLoader,
      getLoadingProgress: unifiedLoading.getLoadingProgress()
    },
    isAppReady
  });

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase, updateProgress, isLoaderVisible } = useGlobalLoading();

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
    console.log('✅ StorePage: تم التهيئة');
  }, []);

  // إدارة مؤشر التحميل المركزي
  useEffect(() => {
    console.log('📊 StorePage: إدارة مؤشر التحميل', {
      shouldShowLoader: unifiedLoading.shouldShowGlobalLoader,
      tenantLoading,
      hasCurrentOrganization: !!currentOrganization,
      hasStoreInfo: !!storeInfo,
      isLoaderVisible
    });
    
    // 🔥 تحسين: استدعاء مباشر بدلاً من الاعتماد على handleLoaderVisibility
    const shouldShowLoader = unifiedLoading.shouldShowGlobalLoader || tenantLoading || (!currentOrganization && !storeInfo);
    
    if (shouldShowLoader) {
      console.log('📊 StorePage: إظهار مؤشر التحميل');
      // إظهار مؤشر التحميل مع معلومات المتجر
      showLoader({
        storeName: storeName || 'جاري تحميل المتجر...',
        logoUrl,
        primaryColor: organizationSettings?.theme_primary_color || '#fc5a3e',
        progress: unifiedLoading.getLoadingProgress(),
      });

      // تحديد المرحلة بناءً على التقدم
      const progress = unifiedLoading.getLoadingProgress();
      if (tenantLoading) {
        setPhase('system');
      } else if (progress < 30) {
        setPhase('system');
      } else if (progress < 70) {
        setPhase('store');
      } else if (progress < 100) {
        setPhase('content');
      } else {
        setPhase('complete');
      }
    } else if (isLoaderVisible) {
      console.log('📊 StorePage: إخفاء مؤشر التحميل');
      // إخفاء مؤشر التحميل عند اكتمال التحميل
      hideLoader();
    }
  }, [
    unifiedLoading.shouldShowGlobalLoader,
    tenantLoading,
    currentOrganization,
    storeInfo,
    storeName,
    logoUrl,
    organizationSettings?.theme_primary_color,
    isLoaderVisible,
    showLoader,
    hideLoader,
    setPhase,
    unifiedLoading
  ]);

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
    hasOrganization: !!currentOrganization,
    hasStoreInfo: !!storeInfo,
    storeName
  }), [
    unifiedLoading.shouldShowGlobalLoader,
    tenantLoading,
    currentOrganization,
    storeInfo,
    storeName
  ]);

  // 🔥 تحسين: قرار عرض المؤشر محسن
  const shouldShowLoader = useMemo(() => {
    return unifiedLoading.shouldShowGlobalLoader || tenantLoading || (!currentOrganization && !storeInfo);
  }, [unifiedLoading.shouldShowGlobalLoader, tenantLoading, currentOrganization, storeInfo]);

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
    seoSettings,
    centralOrgId,
    categories,
    footerSettings,
    componentsToRender,
    featuredProducts,
    organizationSettings,
    unifiedLoading
  ]);

  // 🔥 إصلاح: عرض مؤشر التحميل بدلاً من null لمنع الشاشة البيضاء
  if (shouldShowLoader) {
    console.log('⏳ StorePage: عرض مؤشر التحميل', { shouldShowLoader });
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {storeName || 'جاري تحميل المتجر...'}
          </h2>
          <p className="text-muted-foreground">نحن نحضر لك تجربة تسوق مميزة</p>
        </div>
      </div>
    );
  }

  // إذا كان مؤشر التحميل مرئي، لا تعرض محتوى
  if (isLoaderVisible) {
    console.log('⏳ StorePage: إرجاع null - مؤشر التحميل مرئي', { isLoaderVisible });
    return null;
  }

  // البيانات جاهزة، عرض المتجر
  console.log('✅ StorePage: عرض المتجر - البيانات جاهزة', {
    storeName,
    centralOrgId,
    componentsCount: componentsToRender?.length || 0,
    categoriesCount: categories?.length || 0,
    productsCount: featuredProducts?.length || 0
  });
  
  return memoizedStoreContent;
});

// 🔥 تحسين: إضافة displayName للتطوير
StorePage.displayName = 'StorePage';

export default StorePage;
