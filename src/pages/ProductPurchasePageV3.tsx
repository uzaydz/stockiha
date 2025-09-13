import React, { Suspense } from 'react';

const LazyContainer = React.lazy(() => import('./product-v3/ProductPurchasePageV3Container'));

// Minimal, ultra-light fallback to avoid heavy animations/scripts
const MinimalFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
    جاري التحميل...
  </div>
);

const ProductPurchasePageV3: React.FC = () => (
  <Suspense fallback={<MinimalFallback />}> 
    <LazyContainer />
  </Suspense>
);

export default ProductPurchasePageV3;
