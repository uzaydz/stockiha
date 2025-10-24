import React from 'react';
import Layout from '@/components/Layout';
import ProductsWithCache from '@/components/product/ProductsWithCache';
import { POSSharedLayoutControls } from '@/components/pos-layout/types';

interface ProductsCachedProps extends POSSharedLayoutControls {}

const ProductsCached: React.FC<ProductsCachedProps> = ({
  useStandaloneLayout = true,
  onRegisterRefresh,
  onLayoutStateChange
}) => {
  const renderWithLayout = (node: React.ReactElement) => (
    useStandaloneLayout ? <Layout>{node}</Layout> : node
  );

  const pageContent = (
    <div className="container mx-auto px-4 py-6">
      <ProductsWithCache />
    </div>
  );

  return renderWithLayout(pageContent);
};

export default ProductsCached;
