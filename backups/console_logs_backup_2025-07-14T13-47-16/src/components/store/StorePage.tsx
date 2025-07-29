import React, { useEffect } from 'react';
import SEOHead from './SEOHead';
import StoreLayout from './StoreLayout';
import StoreComponentRenderer from './StoreComponentRenderer';
import { useStorePageData } from '@/hooks/useStorePageData';
import { useGlobalLoading } from './GlobalLoadingManager';

interface StorePageProps {
  // إزالة prop storeData لأننا نستخدم النظام المركزي الآن
}

const StorePage: React.FC<StorePageProps> = () => {
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

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase, updateProgress, isLoaderVisible } = useGlobalLoading();

  // إدارة مؤشر التحميل المركزي
  useEffect(() => {
    if (unifiedLoading.shouldShowGlobalLoader) {
      // إظهار مؤشر التحميل مع معلومات المتجر
      showLoader({
        storeName,
        logoUrl,
        primaryColor: organizationSettings?.theme_primary_color || '#fc5a3e',
        progress: unifiedLoading.getLoadingProgress(),
      });

      // تحديد المرحلة بناءً على التقدم
      const progress = unifiedLoading.getLoadingProgress();
      if (progress < 30) {
        setPhase('system');
      } else if (progress < 70) {
        setPhase('store');
      } else if (progress < 100) {
        setPhase('content');
      } else {
        setPhase('complete');
      }
    } else if (isLoaderVisible) {
      // إخفاء مؤشر التحميل عند اكتمال التحميل
      console.log('🔄 إخفاء مؤشر التحميل - التحميل مكتمل');
      hideLoader();
    }
  }, [
    unifiedLoading.shouldShowGlobalLoader,
    unifiedLoading.getLoadingProgress,
    storeName,
    logoUrl,
    organizationSettings?.theme_primary_color,
    showLoader,
    hideLoader,
    setPhase,
    isLoaderVisible
  ]);

  // تحديث التقدم
  useEffect(() => {
    if (isLoaderVisible) {
      updateProgress(unifiedLoading.getLoadingProgress());
    }
  }, [unifiedLoading.getLoadingProgress, updateProgress, isLoaderVisible]);

  // إضافة timeout أمان لإخفاء المؤشر
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      if (isLoaderVisible) {
        console.log('🚨 إخفاء مؤشر التحميل بسبب timeout الأمان');
        hideLoader();
      }
    }, 12000); // 12 ثانية كحد أقصى

    return () => clearTimeout(safetyTimer);
  }, [isLoaderVisible, hideLoader]);

  // إخفاء المؤشر عند توفر البيانات الأساسية
  useEffect(() => {
    if (isAppReady && !unifiedLoading.shouldShowGlobalLoader && isLoaderVisible) {
      console.log('✅ إخفاء مؤشر التحميل - البيانات جاهزة');
      hideLoader();
    }
  }, [isAppReady, unifiedLoading.shouldShowGlobalLoader, isLoaderVisible, hideLoader]);

  // عدم عرض أي شيء إذا كان مؤشر التحميل المركزي مرئي
  if (isLoaderVisible) {
    return null;
  }

  // إخفاء المؤشر تلقائياً إذا كان مرئياً ولكن البيانات جاهزة
  if (isLoaderVisible && isAppReady && !unifiedLoading.shouldShowGlobalLoader) {
    console.log('🔧 إخفاء مؤشر التحميل تلقائياً - البيانات جاهزة');
    hideLoader();
  }

  return (
    <>
      {/* إعدادات SEO والـ Head */}
      <SEOHead
        seoSettings={seoSettings}
        storeName={storeName}
        customCSS={organizationSettings?.custom_css}
        customJSHeader={organizationSettings?.custom_js_header}
      />
      
      {/* Layout الرئيسي */}
      <StoreLayout
        categories={categories}
        footerSettings={footerSettings}
        centralOrgId={centralOrgId}
        storeName={storeName}
        customJSFooter={organizationSettings?.custom_js_footer}
      >
              {/* عرض المكونات */}
        <StoreComponentRenderer
          components={componentsToRender}
          centralOrgId={centralOrgId}
                      storeName={storeName} 
          categories={categories}
          featuredProducts={featuredProducts}
          organizationSettings={organizationSettings}
          contactEmail={organizationSettings?.contact_email}
          unifiedLoading={unifiedLoading}
        />
      </StoreLayout>
    </>
  );
};

export default StorePage;
