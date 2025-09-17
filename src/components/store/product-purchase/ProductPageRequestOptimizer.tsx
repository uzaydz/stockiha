import React from 'react';
import { ProductPageProvider } from './hooks/ProductPageProvider';

interface ProductPageRequestOptimizerProps {
  children: React.ReactNode;
  organizationId: string;
  productId?: string;
}

// مدير طلبات صفحة المنتج المحسن - الإصدار المُعاد هيكلته
export const ProductPageRequestOptimizer: React.FC<ProductPageRequestOptimizerProps> = ({
  children,
  organizationId,
  productId
}) => {
  return (
    <ProductPageProvider
      organizationId={organizationId}
      productId={productId}
    >
      {children}
    </ProductPageProvider>
  );
};

// Re-export hooks from the new modular structure
export { useProductPageContext as useProductPageData } from './hooks/ProductPageProvider';
export { useOptimizedProvinces } from './hooks/useOptimizedProvinces';
export { useOptimizedShippingProviders, useOptimizedShippingClones } from './hooks/useOptimizedShipping';
export { useOptimizedProductConfig, useOptimizedServices } from './hooks/useOptimizedProduct';

export default ProductPageRequestOptimizer;
