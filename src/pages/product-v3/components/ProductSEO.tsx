import React from 'react';
import { ProductSEOHead } from '@/components/product-page/ProductSEOHead';

interface Props {
  product: any;
  organization: any;
  organizationSettings: any;
  productId?: string;
  priceInfo?: any;
  availableStock?: any;
}

const ProductSEO: React.FC<Props> = React.memo((props) => {
  return <ProductSEOHead {...props} />;
});

ProductSEO.displayName = 'ProductSEO';

export default ProductSEO;

