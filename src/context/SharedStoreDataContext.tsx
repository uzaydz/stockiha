import React, { createContext, useContext, ReactNode, useMemo, useEffect } from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';
import { OptimizedSharedStoreDataContext, type OptimizedSharedStoreDataContextType } from '@/context/OptimizedSharedStoreDataContext';

// نوع البيانات المشتركة
export interface SharedStoreDataContextType {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  components?: any[];
  footerSettings?: any | null;
  testimonials?: any[];
  seoMeta?: any | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// دالة آمنة لاستخدام useSharedStoreData مع معالجة الأخطاء
function useSharedStoreDataSafe() {
  try {
    // استخدام خيارات أخف: فئات + منتجات مميزة فقط (بدون قائمة منتجات كاملة)
    // إزالة تعطيل جلب البيانات في صفحات المنتجات لضمان عرض المنتجات المميزة دائماً
    
    const result = useSharedStoreData({
      includeCategories: true,
      includeProducts: false,
      includeFeaturedProducts: true,
      enabled: true // دائماً مفعل لضمان ظهور المنتجات المميزة
    });
    
    // 🔥 إضافة استماع لبيانات window object إذا لم تكن البيانات متوفرة
    useEffect(() => {
      // إذا لم تكن البيانات متوفرة، جرب استخدام البيانات من window
      if (!result.organization && !result.isLoading) {
        const windowEarlyData = (window as any).__EARLY_STORE_DATA__;
        const windowSharedData = (window as any).__SHARED_STORE_DATA__;
        if (windowEarlyData?.data || windowSharedData) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('🔄 [useSharedStoreDataSafe] استخدام بيانات window بدل إعادة الجلب');
          }
          // استخدم بيانات window ضمن provider عبر refresh واحد فقط عند الحاجة
          result.refreshData?.();
        }
      }
      
      // 🎯 استماع لأحداث تحديث البيانات من main.tsx
      const handleStoreDataReady = () => {
        if (!result.organization && !result.isLoading) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('🎯 [useSharedStoreDataSafe] storeDataReady -> refresh once');
          }
          result.refreshData?.();
        }
      };
      
      const handleStoreInitDataReady = () => {
        if (!result.organization && !result.isLoading) {
          if (process.env.NODE_ENV === 'development') {
            console.debug('🎯 [useSharedStoreDataSafe] storeInitDataReady -> refresh once');
          }
          result.refreshData?.();
        }
      };
      
      window.addEventListener('storeDataReady', handleStoreDataReady);
      window.addEventListener('storeInitDataReady', handleStoreInitDataReady);
      
      return () => {
        window.removeEventListener('storeDataReady', handleStoreDataReady);
        window.removeEventListener('storeInitDataReady', handleStoreInitDataReady);
      };
    }, [result.organization, result.isLoading, result.refreshData]);
    
    // إضافة logs لتتبع البيانات
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [useSharedStoreDataSafe] البيانات المستلمة:', {
        hasOrganization: !!result.organization,
        hasOrganizationSettings: !!result.organizationSettings,
        isLoading: result.isLoading,
        error: result.error,
        organizationName: result.organization?.name
      });
    }
    
    return result;
  } catch (error) {
    // إذا كان الخطأ متعلق بـ TenantProvider، أرجع قيم افتراضية
    if (error instanceof Error && error.message.includes('useTenant must be used within a TenantProvider')) {
      return {
        organization: null,
        organizationSettings: null,
        products: [],
        categories: [],
        featuredProducts: [],
        components: [],
        footerSettings: null,
        testimonials: [],
        seoMeta: null,
        isLoading: false,
        error: 'TenantProvider غير متاح',
        refreshData: () => {}
      };
    }
    // إعادة رمي الأخطاء الأخرى
    throw error;
  }
}

// السياق المركزي
export const SharedStoreDataContext = createContext<SharedStoreDataContextType | null>(null);

// مزود السياق المركزي - يستدعي useSharedStoreData مرة واحدة فقط
export const SharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // استدعاء آمن لـ useSharedStoreData في كامل التطبيق
  const sharedData = useSharedStoreDataSafe();
  
  // 🔥 تحسين: استخدام useMemo مع dependencies محسنة لمنع إعادة الإنشاء المتكرر
  const contextValue = useMemo(() => {
    // إضافة logs لتتبع البيانات
    if (process.env.NODE_ENV === 'development') {
      console.log('🎯 [SharedStoreDataContext] contextValue created:', {
        organization: !!sharedData.organization,
        organizationSettings: !!sharedData.organizationSettings,
        isLoading: sharedData.isLoading,
        error: sharedData.error,
        organizationName: sharedData.organization?.name,
        settingsLang: sharedData.organizationSettings?.default_language
      });
    }
    return sharedData;
  }, [
    // 🔥 تبسيط dependencies لضمان التحديث
    sharedData
  ]);

  // إضافة useEffect لمنع الاستدعاءات المكررة
  useEffect(() => {
    // تنظيف cache قديم عند تغيير المؤسسة
    if (sharedData.organization?.id) {
      const cacheKey = `store-data-${sharedData.organization.id}`;
      // الاحتفاظ بالبيانات الحالية فقط
      if (process.env.NODE_ENV === 'development') {
        console.log('🎯 [SharedStoreDataContext] البيانات جاهزة:', {
          organization: !!sharedData.organization,
          organizationSettings: !!sharedData.organizationSettings,
          featuredProducts: sharedData.featuredProducts?.length || 0
        });
      }
      
      // إرسال حدث للمكونات بأن البيانات جاهزة
      window.dispatchEvent(new CustomEvent('sharedStoreDataReady', {
        detail: {
          organization: sharedData.organization,
          organizationSettings: sharedData.organizationSettings,
          timestamp: Date.now()
        }
      }));
    }
  }, [sharedData.organization?.id ?? null, sharedData.organizationSettings?.id ?? null]);

  return (
    <SharedStoreDataContext.Provider value={contextValue}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Hook لاستخدام البيانات المشتركة - محسن لمنع re-renders
export const useSharedStoreDataContext = (): SharedStoreDataContextType => {
  const sharedContext = useContext(SharedStoreDataContext);
  const optimizedContext = useContext(
    OptimizedSharedStoreDataContext as React.Context<OptimizedSharedStoreDataContextType | null>
  );

  return useMemo(() => {
    // 1) Preferred shared context (store entry)
    if (sharedContext) return sharedContext;

    // 2) Fallback to optimized context (platform entry)
    if (optimizedContext) {
      // If optimized context has data, surface it using the same shape
      if (optimizedContext.organization || optimizedContext.organizationSettings) {
        return {
          organization: optimizedContext.organization,
          organizationSettings: optimizedContext.organizationSettings,
          products: optimizedContext.products,
          categories: optimizedContext.categories,
          featuredProducts: optimizedContext.featuredProducts,
          components: optimizedContext.components || [],
          footerSettings: null,
          testimonials: [],
          seoMeta: null,
          isLoading: optimizedContext.isLoading,
          error: null,
          refreshData: optimizedContext.refreshData,
        } as SharedStoreDataContextType;
      }
    }

    // 3) Final fallback to window-injected early data
    const win: any = typeof window !== 'undefined' ? window : {};
    const data = win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || null;
    if (data) {
      return {
        organization: data.organization_details || data.organization || null,
        organizationSettings: data.organization_settings || data.organizationSettings || null,
        products: data.featured_products || [],
        categories: data.categories || [],
        featuredProducts: data.featured_products || [],
        components: data.store_layout_components || [],
        footerSettings: data.footer_settings || null,
        testimonials: data.testimonials || [],
        seoMeta: data.seo_meta || null,
        isLoading: false,
        error: null,
        refreshData: () => {},
      } as SharedStoreDataContextType;
    }

    // 4) Safe default placeholder to avoid crashes during very early boot
    return {
      organization: null,
      organizationSettings: null,
      products: [],
      categories: [],
      featuredProducts: [],
      components: [],
      footerSettings: null,
      testimonials: [],
      seoMeta: null,
      isLoading: true,
      error: null,
      refreshData: () => {}
    } as SharedStoreDataContextType;
  }, [sharedContext, optimizedContext]);
};

// مزود بديل للصفحات التي لا تحتاج TenantProvider
export const MinimalSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // بيانات افتراضية للصفحات البسيطة
  const defaultData = {
    organization: null,
    organizationSettings: null,
    products: [],
    categories: [],
    featuredProducts: [],
    components: [],
    footerSettings: null,
    testimonials: [],
    seoMeta: null,
    isLoading: false,
    error: null,
    refreshData: () => {}
  };

  return (
    <SharedStoreDataContext.Provider value={defaultData}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Provider مخصص لصفحات المنتجات - فقط إعدادات المؤسسة
export const ProductPageSharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // استدعاء useSharedStoreData مع تعطيل الفئات والمنتجات
  const sharedData = useSharedStoreData({
    includeCategories: false,
    includeProducts: false,
    includeFeaturedProducts: false
  });
  
  // 🔥 تحسين: استخدام useMemo مع dependencies محسنة
  const contextValue = useMemo(() => sharedData, [
    sharedData.isLoading,
    sharedData.error,
    sharedData.organization?.id ?? null,
    sharedData.organizationSettings?.id ?? null
    // 🔥 إصلاح: إزالة refreshData من dependencies
  ]);

  return (
    <SharedStoreDataContext.Provider value={contextValue}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Hook مخصص لصفحات المنتجات - فقط إعدادات المؤسسة بدون الفئات والمنتجات
export const useSharedOrgSettingsOnly = () => {
  // ✅ إبقاء ترتيب الـ hooks ثابت دائماً
  // - استخدم السياق الموحد الآمن الذي يتعامل مع جميع الحالات داخلياً
  // - لا تستدعِ أي hook شرطياً
  const base = useSharedStoreDataContext();

  // 🔎 قراءة مبكرة من window لتحسين زمن الإتاحة بدون كسر ترتيب الـ hooks
  const earlyWindowData = (() => {
    try {
      const win: any = typeof window !== 'undefined' ? window : {};
      return win.__EARLY_STORE_DATA__?.data || win.__CURRENT_STORE_DATA__ || null;
    } catch {
      return null;
    }
  })();

  // 🎯 أولوية البيانات: السياق ثم بيانات window
  const organization = base.organization || earlyWindowData?.organization_details || earlyWindowData?.organization || null;
  const organizationSettings = base.organizationSettings || earlyWindowData?.organization_settings || base.organizationSettings || null;

  // ⚖️ حافظ على نفس شكل الكائن المرجع لتوافق بقية الشيفرة
  return {
    organization,
    organizationSettings,
    products: [],
    categories: [],
    featuredProducts: [],
    isLoading: base.isLoading,
    error: base.error,
    refreshData: base.refreshData
  };
};
