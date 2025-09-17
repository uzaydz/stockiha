import React, { createContext, useContext } from 'react';
import { useProductPageData, ProductPageContextType } from './useProductPageData';

const ProductPageContext = createContext<ProductPageContextType | null>(null);

interface ProductPageProviderProps {
  children: React.ReactNode;
  organizationId: string;
  productId?: string;
}

// Provider للبيانات المُجمعة
export const ProductPageProvider: React.FC<ProductPageProviderProps> = ({
  children,
  organizationId,
  productId
}) => {
  const productPageData = useProductPageData({ organizationId, productId });

  return (
    <ProductPageContext.Provider value={productPageData}>
      {children}
    </ProductPageContext.Provider>
  );
};

// Hook لاستخدام بيانات صفحة المنتج
export const useProductPageContext = () => {
  const context = useContext(ProductPageContext);
  if (!context) {
    throw new Error('useProductPageContext must be used within ProductPageProvider');
  }
  return context;
};
