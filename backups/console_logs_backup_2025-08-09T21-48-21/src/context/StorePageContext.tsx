import React, { createContext, useContext, ReactNode } from 'react';
import { useSharedStoreDataContext, SharedStoreDataContext, SharedStoreDataContextType } from '@/context/SharedStoreDataContext';
import { OptimizedSharedStoreDataContext, OptimizedSharedStoreDataContextType } from '@/context/OptimizedSharedStoreDataContext';

// أنواع البيانات المطلوبة لصفحة المتجر فقط
interface StorePageProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  compare_at_price?: number;
  thumbnail_image?: string;
  images?: string[];
  stock_quantity: number;
  is_featured?: boolean;
  is_new?: boolean;
  category_id?: string;
}

interface StorePageContextType {
  // البيانات الأساسية فقط
  products: StorePageProduct[];
  featuredProducts: StorePageProduct[];
  isLoading: boolean;
  error: string | null;
  
  // دوال محدودة
  refreshProducts: () => void;
}

const StorePageContext = createContext<StorePageContextType | undefined>(undefined);

// مزود السياق المحسن لصفحات المتجر
export const StorePageProvider: React.FC<{ 
  children: ReactNode;
  organizationId?: string;
}> = ({ children, organizationId: propOrganizationId }) => {
  // محاولة القراءة من السياق المحسّن أولاً ثم العادي، وإن لم يوجد أيهما نوفّر قيمًا افتراضية لمنع الكسر داخل لوحة التحكم
  const optimized = useContext(OptimizedSharedStoreDataContext);
  const shared = useContext(SharedStoreDataContext);
  const source: (OptimizedSharedStoreDataContextType | SharedStoreDataContextType | null) = optimized || shared;

  const products = source?.products ?? [];
  const featuredProducts = (source as any)?.featuredProducts ?? [];
  const isLoading = source?.isLoading ?? false;
  const error = source?.error ?? null;
  const refreshData = source?.refreshData ?? (() => {});

  const contextValue: StorePageContextType = {
    products,
    featuredProducts,
    isLoading,
    error,
    refreshProducts: refreshData,
  };

  return (
    <StorePageContext.Provider value={contextValue}>
      {children}
    </StorePageContext.Provider>
  );
};

// Hook للاستخدام
export const useStorePage = (): StorePageContextType => {
  const context = useContext(StorePageContext);
  
  if (context === undefined) {
    throw new Error('useStorePage must be used within a StorePageProvider');
  }
  
  return context;
};
