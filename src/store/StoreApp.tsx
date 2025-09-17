import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

// Router that renders StorePage or Landing based on hostname
import StoreRouter from '@/components/routing/StoreRouter';

// Data providers are handled by ConditionalProviders - no need for duplicate
import { ProductsPageProvider } from '@/context/ProductsPageContext';
import { Navigate, useParams } from 'react-router-dom';

const ProductV3 = React.lazy(() => import('@/pages/product-v3/ProductPurchasePageV3Container'));
const StoreProducts = React.lazy(() => import('@/pages/StoreProducts'));
const CartPage = React.lazy(() => import('@/pages/CartPage'));
const CartCheckoutPage = React.lazy(() => import('@/pages/CartCheckoutPage'));

const Loader = () => (
  <div className="min-h-[50vh] bg-background flex items-center justify-center p-4">
    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
  </div>
);

const StoreApp: React.FC = () => {
  const RedirectToV3: React.FC = () => {
    const { productId } = useParams();
    return <Navigate to={`/product-purchase-max-v3/${productId ?? ''}`} replace />;
  };
  return (
    <Routes>
      {/* Legacy product routes redirect to v3 */}
      <Route path="/product-purchase-max-v2/:productId" element={<RedirectToV3 />} />
      <Route path="/product-purchase-max/:productId" element={<RedirectToV3 />} />
      <Route path="/product-max/:productId" element={<RedirectToV3 />} />
      {/* Product V3 explicit routes used in production links */}
      <Route path="/product-purchase-max-v3/:productId" element={
        <Suspense fallback={<Loader />}>
          <ProductV3 />
        </Suspense>
      } />
      {/* Legacy/alternative product routes */}
      <Route path="/product/:productIdentifier" element={
        <Suspense fallback={<Loader />}>
          <ProductV3 />
        </Suspense>
      } />
      <Route path="/product/*" element={
        <Suspense fallback={<Loader />}>
          <ProductV3 />
        </Suspense>
      } />
      {/* Store products page */}
      <Route path="/products" element={
        <Suspense fallback={<Loader />}>
          <ProductsPageProvider>
            <StoreProducts />
          </ProductsPageProvider>
        </Suspense>
      } />
      {/* Cart pages */}
      <Route path="/cart" element={
        <Suspense fallback={<Loader />}>
          <CartPage />
        </Suspense>
      } />
      <Route path="/cart/checkout" element={
        <Suspense fallback={<Loader />}>
          <CartCheckoutPage />
        </Suspense>
      } />
      {/* Default: store/landing router */}
      <Route path="/*" element={<StoreRouter />} />
    </Routes>
  );
};

export default StoreApp;
