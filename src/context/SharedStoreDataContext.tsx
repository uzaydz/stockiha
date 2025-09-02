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
    
    return useSharedStoreData({
      includeCategories: true,
      includeProducts: false,
      includeFeaturedProducts: true,
      enabled: true // دائماً مفعل لضمان ظهور المنتجات المميزة
    });
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
  const contextValue = useMemo(() => sharedData, [
    // 🔥 إصلاح: استخدام قيم مستقرة بدلاً من الدوال
    sharedData.organization?.id ?? null,
    sharedData.organizationSettings?.id ?? null,
    sharedData.products?.length ?? 0,
    sharedData.categories?.length ?? 0,
    sharedData.featuredProducts?.length ?? 0,
    sharedData.isLoading,
    sharedData.error
    // 🔥 إصلاح: إزالة refreshData من dependencies لتجنب إعادة الإنشاء
  ]);

  // إضافة useEffect لمنع الاستدعاءات المكررة
  useEffect(() => {
    // تنظيف cache قديم عند تغيير المؤسسة
    if (sharedData.organization?.id) {
      const cacheKey = `store-data-${sharedData.organization.id}`;
      // الاحتفاظ بالبيانات الحالية فقط
      if (process.env.NODE_ENV === 'development') {
      }
    }
  }, [sharedData.organization?.id ?? null]);

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

  // 🔥 تحسين: استخدام useMemo مع dependencies محسنة
  return useMemo(() => {
    if (sharedContext) return sharedContext;

    if (optimizedContext) {
      return {
        organization: optimizedContext.organization,
        organizationSettings: optimizedContext.organizationSettings,
        products: optimizedContext.products,
        categories: optimizedContext.categories,
        featuredProducts: optimizedContext.featuredProducts,
        components: [],
        footerSettings: null,
        testimonials: [],
        seoMeta: null,
        isLoading: optimizedContext.isLoading,
        error: optimizedContext.error,
        refreshData: optimizedContext.refreshData,
      };
    }

    throw new Error('useSharedStoreDataContext must be used within a SharedStoreDataProvider or OptimizedSharedStoreDataProvider');
  }, [
    sharedContext,
    // 🔥 إصلاح: استخدام قيم مستقرة بدلاً من الدوال
    optimizedContext?.organization?.id ?? null,
    optimizedContext?.organizationSettings?.id ?? null,
    optimizedContext?.products?.length ?? 0,
    optimizedContext?.categories?.length ?? 0,
    optimizedContext?.featuredProducts?.length ?? 0,
    optimizedContext?.isLoading,
    optimizedContext?.error
    // 🔥 إصلاح: إزالة refreshData من dependencies
  ]);
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
  try {
    return useSharedStoreData({
      includeCategories: false,
      includeProducts: false,
      includeFeaturedProducts: false
    });
  } catch (error) {
    // إذا كان الخطأ متعلق بـ TenantProvider، أرجع قيم افتراضية
    if (error instanceof Error && error.message.includes('useTenant must be used within a TenantProvider')) {
      return {
        organization: null,
        organizationSettings: null,
        products: [],
        categories: [],
        featuredProducts: [],
        isLoading: false,
        error: 'TenantProvider غير متاح',
        refreshData: () => {}
      };
    }
    // إعادة رمي الأخطاء الأخرى
    throw error;
  }
};
