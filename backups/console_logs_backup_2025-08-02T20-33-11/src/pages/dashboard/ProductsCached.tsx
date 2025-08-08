import React from 'react';
import Layout from '@/components/Layout';
import ProductsWithCache from '@/components/product/ProductsWithCache';

const ProductsCached: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-6">
        <ProductsWithCache />
      </div>
    </Layout>
  );
};

export default ProductsCached;
