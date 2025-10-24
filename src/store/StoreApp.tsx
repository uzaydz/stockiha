import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';

import { ProductsPageProvider } from '@/context/ProductsPageContext';
import { CategoryRedirect } from '@/app-components/AppComponents';
import StorePage from '@/components/store/StorePage';
import { Loader2 } from 'lucide-react';

import * as LazyRoutes from '@/app-components/LazyRoutes.optimized';

const Loader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="min-h-[50vh] bg-background flex items-center justify-center p-4">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  </div>
);

const StoreApp: React.FC = () => {
  const RedirectToV3: React.FC = () => {
    const { productId = '' } = useParams();
    return <Navigate to={`/product-purchase-max-v3/${productId}`} replace />;
  };

  return (
    <Routes>
      <Route path="/" element={<StorePage />} />

      <Route path="/category/:categoryId" element={<CategoryRedirect />} />

      {/* Legacy product routes redirect to v3 */}
      <Route path="/product-purchase-max-v2/:productId" element={<RedirectToV3 />} />
      <Route path="/product-purchase-max/:productId" element={<RedirectToV3 />} />
      <Route path="/product-max/:productId" element={<RedirectToV3 />} />

      {/* Product pages */}
      <Route
        path="/product-purchase-max-v3/:productId"
        element={
          <Suspense fallback={<Loader message="جاري تحميل صفحة المنتج..." />}>
            <LazyRoutes.ProductPurchasePageV3 />
          </Suspense>
        }
      />
      <Route
        path="/product/:productIdentifier"
        element={
          <Suspense fallback={<Loader message="جاري تحميل المنتج..." />}>
            <LazyRoutes.ProductPurchasePageV3 />
          </Suspense>
        }
      />
      <Route
        path="/product/*"
        element={
          <Suspense fallback={<Loader message="جاري تحميل المنتج..." />}>
            <LazyRoutes.ProductPurchasePageV3 />
          </Suspense>
        }
      />
      <Route
        path="/products/details/:productId"
        element={
          <Suspense fallback={<Loader message="جاري تحميل تفاصيل المنتج..." />}>
            <LazyRoutes.ProductDetails />
          </Suspense>
        }
      />
      <Route
        path="/products/:slug"
        element={
          <Suspense fallback={<Loader message="جاري تحميل المنتج..." />}>
            <LazyRoutes.ProductPurchase />
          </Suspense>
        }
      />
      <Route
        path="/product-public/:productId"
        element={
          <Suspense fallback={<Loader message="جاري تحميل المنتج..." />}>
            <LazyRoutes.ProductPurchasePageMaxPublic />
          </Suspense>
        }
      />

      {/* Products listing */}
      <Route
        path="/products"
        element={
          <Suspense fallback={<Loader message="جاري تحميل المنتجات..." />}>
            <ProductsPageProvider>
              <LazyRoutes.StoreProducts />
            </ProductsPageProvider>
          </Suspense>
        }
      />

      {/* Cart */}
      <Route
        path="/cart"
        element={
          <Suspense fallback={<Loader message="جاري تحميل السلة..." />}>
            <LazyRoutes.CartPage />
          </Suspense>
        }
      />
      <Route
        path="/cart/checkout"
        element={
          <Suspense fallback={<Loader message="جاري تجهيز الدفع..." />}>
            <LazyRoutes.CartCheckoutPage />
          </Suspense>
        }
      />

      {/* Thank you page */}
      <Route
        path="/thank-you"
        element={
          <Suspense fallback={<Loader message="جاري التحميل..." />}>
            <LazyRoutes.ThankYouPage />
          </Suspense>
        }
      />

      {/* Services */}
      <Route
        path="/service-tracking/:trackingId"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الخدمة..." />}>
            <LazyRoutes.PublicServiceTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/service-tracking-public"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الخدمة..." />}>
            <LazyRoutes.PublicServiceTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/services"
        element={
          <Suspense fallback={<Loader message="جاري تحميل الخدمات..." />}>
            <LazyRoutes.PublicServiceTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/repair-tracking"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الصيانة..." />}>
            <LazyRoutes.RepairTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/repair-tracking/:trackingCode"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الصيانة..." />}>
            <LazyRoutes.RepairTrackingPage />
          </Suspense>
        }
      />
      <Route
        path="/repair-complete/:orderId"
        element={
          <Suspense fallback={<Loader message="جاري التحميل..." />}>
            <LazyRoutes.RepairComplete />
          </Suspense>
        }
      />

      {/* Games */}
      <Route
        path="/games"
        element={
          <Suspense fallback={<Loader message="جاري تحميل الألعاب..." />}>
            <LazyRoutes.PublicGameStorePage />
          </Suspense>
        }
      />
      <Route
        path="/games/:organizationId"
        element={
          <Suspense fallback={<Loader message="جاري تحميل الألعاب..." />}>
            <LazyRoutes.PublicGameStorePage />
          </Suspense>
        }
      />
      <Route
        path="/game-tracking"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الطلب..." />}>
            <LazyRoutes.PublicGameTracking />
          </Suspense>
        }
      />
      <Route
        path="/game-tracking/:trackingNumber"
        element={
          <Suspense fallback={<Loader message="جاري تتبع الطلب..." />}>
            <LazyRoutes.PublicGameTracking />
          </Suspense>
        }
      />
      <Route
        path="/game-download-start/:orderId"
        element={
          <Suspense fallback={<Loader message="جاري التحميل..." />}>
            <LazyRoutes.GameDownloadStart />
          </Suspense>
        }
      />
      <Route
        path="/game-complete/:orderId"
        element={
          <Suspense fallback={<Loader message="جاري التحميل..." />}>
            <LazyRoutes.GameOrderComplete />
          </Suspense>
        }
      />

      {/* Custom pages */}
      <Route
        path="/page/:slug"
        element={
          <Suspense fallback={<Loader message="جاري تحميل الصفحة..." />}>
            <LazyRoutes.CustomPageView />
          </Suspense>
        }
      />
      <Route
        path="/:slug"
        element={
          <Suspense fallback={<Loader message="جاري تحميل الصفحة..." />}>
            <LazyRoutes.LandingPageView />
          </Suspense>
        }
      />

      {/* Fallback to dynamic store layout */}
      <Route path="*" element={<StorePage />} />
    </Routes>
  );
};

export default StoreApp;
