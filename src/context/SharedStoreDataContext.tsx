import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useSharedStoreData } from '@/hooks/useSharedStoreData';

// نوع البيانات المشتركة
interface SharedStoreDataContextType {
  organization: any | null;
  organizationSettings: any | null;
  products: any[];
  categories: any[];
  featuredProducts: any[];
  isLoading: boolean;
  error: string | null;
  refreshData: () => void;
}

// دالة آمنة لاستخدام useSharedStoreData مع معالجة الأخطاء
function useSharedStoreDataSafe() {
  try {
    // استخدام الخيارات الافتراضية الموفرة للموارد
    return useSharedStoreData({
      includeCategories: true,
      includeProducts: true,
      includeFeaturedProducts: true
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
}

// السياق المركزي
const SharedStoreDataContext = createContext<SharedStoreDataContextType | null>(null);

// مزود السياق المركزي - يستدعي useSharedStoreData مرة واحدة فقط
export const SharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // console.log('🏗️ [SharedStoreDataProvider] Initializing central data provider');
  
  // استدعاء آمن لـ useSharedStoreData في كامل التطبيق
  const sharedData = useSharedStoreDataSafe();
  
  // تحسين الأداء مع useMemo لمنع إعادة الإنشاء غير الضرورية
  const contextValue = useMemo(() => sharedData, [
    sharedData.products?.length,
    sharedData.categories?.length,
    sharedData.featuredProducts?.length,
    sharedData.isLoading,
    sharedData.error,
    sharedData.organization?.id,
    sharedData.organizationSettings?.id
  ]);
  
  // console.log('📋 [SharedStoreDataProvider] Providing data to all children:', {
  //   productsCount: contextValue.products?.length || 0,
  //   categoriesCount: contextValue.categories?.length || 0,
  //   isLoading: contextValue.isLoading,
  //   hasError: !!contextValue.error
  // });

  return (
    <SharedStoreDataContext.Provider value={contextValue}>
      {children}
    </SharedStoreDataContext.Provider>
  );
});

// Hook لاستخدام البيانات المشتركة - بدلاً من useSharedStoreData مباشرة
export const useSharedStoreDataContext = (): SharedStoreDataContextType => {
  const context = useContext(SharedStoreDataContext);
  
  if (!context) {
    throw new Error('useSharedStoreDataContext must be used within a SharedStoreDataProvider');
  }
  
  return context;
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
  
  // تحسين الأداء مع useMemo لمنع إعادة الإنشاء غير الضرورية
  const contextValue = useMemo(() => sharedData, [
    sharedData.isLoading,
    sharedData.error,
    sharedData.organization?.id,
    sharedData.organizationSettings?.id
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
