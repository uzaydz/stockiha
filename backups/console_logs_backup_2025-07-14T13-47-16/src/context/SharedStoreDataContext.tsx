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

// السياق المركزي
const SharedStoreDataContext = createContext<SharedStoreDataContextType | null>(null);

// مزود السياق المركزي - يستدعي useSharedStoreData مرة واحدة فقط
export const SharedStoreDataProvider: React.FC<{ children: ReactNode }> = React.memo(({ children }) => {
  // console.log('🏗️ [SharedStoreDataProvider] Initializing central data provider');
  
  // استدعاء واحد فقط لـ useSharedStoreData في كامل التطبيق
  const sharedData = useSharedStoreData();
  
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