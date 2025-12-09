import React, { Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Import components that don't need lazy loading (lightweight)
import ProtectedRoute from '../components/auth/ProtectedRoute';
import PublicRoute from '../components/auth/PublicRoute';
import SuperAdminRoute from '../components/auth/SuperAdminRoute';
import CallCenterRoute from '../components/auth/CallCenterRoute';
import RequireTenant from '../components/auth/RequireTenant';
import SubscriptionCheck from '../components/subscription/SubscriptionCheck';
import PermissionGuard from '../components/auth/PermissionGuard';
import ConditionalRoute from '../components/ConditionalRoute';
// import StoreRouter from '../components/routing/StoreRouter'; // Removed - store components deleted
import RoleBasedRedirect from '../components/auth/RoleBasedRedirect';
import POSOrdersWrapper from '../components/pos/POSOrdersWrapper';

// Import optimized lazy routes للأداء المحسن
import * as LazyRoutes from './LazyRoutes.optimized';

// 🚀 مكون تحميل محسن
export const PageLoader = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[50vh] bg-[#0a0f1c]">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {message || 'جاري تحميل الصفحة...'}
      </p>
    </div>
  </div>
);

// ============ المسارات العامة ============
export const PublicRoutes = () => {
  // كشف سريع إن كان المضيف هو متجر (ساب دومين أو دومين مخصص)
  const isStoreHost = (() => {
    try {
      const hostname = window.location.hostname;
      const publicDomains = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com', 'stockiha.pages.dev'];
      const isLocalhost = hostname.includes('localhost');
      if (publicDomains.includes(hostname) || isLocalhost) return false;
      const parts = hostname.split('.');
      const isSubOfStockiha = hostname.endsWith('.stockiha.com') && parts.length > 2 && parts[0] !== 'www';
      const isSubOfKtobi = hostname.endsWith('.ktobi.online') && parts.length > 2 && parts[0] !== 'www';
      const isCustomDomain = !isSubOfStockiha && !isSubOfKtobi && !publicDomains.includes(hostname);
      return isSubOfStockiha || isSubOfKtobi || isCustomDomain;
    } catch {
      return false;
    }
  })();

  return (
    <Routes>
      {/* الصفحة الرئيسية - صفحة الهبوط العامة */}
      <Route path="/" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة الرئيسية..." />}>
          <LazyRoutes.LandingPage />
        </Suspense>
      } />

      {/* صفحات الهبوط */}
      <Route path="/features" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.FeaturesPage />
        </Suspense>
      } />
      <Route path="/offline-features" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.OfflineFeatures />
        </Suspense>
      } />
      <Route path="/features/pos" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.POSFeaturesPage />
        </Suspense>
      } />
      <Route path="/features/online-store" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.OnlineStorePage />
        </Suspense>
      } />
      <Route path="/features/advanced-analytics" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.AdvancedAnalyticsFeaturesPage />
        </Suspense>
      } />
      <Route path="/pricing" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PricingPage />
        </Suspense>
      } />
      <Route path="/contact" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ContactLandingPage />
        </Suspense>
      } />
      <Route path="/contact-old" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ContactPage />
        </Suspense>
      } />

      {/* صفحات التوثيق */}
      <Route path="/docs/custom-domains" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.CustomDomainsDocPage />
        </Suspense>
      } />

      {/* صفحات المنتجات العامة */}
      <Route path="/products" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader message="جاري تحميل المنتجات..." />}>
          <LazyRoutes.StoreProducts />
        </Suspense>
      } />
      <Route path="/cart" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader message="جاري تحميل العربة..." />}>
          <LazyRoutes.CartPage />
        </Suspense>
      } />
      <Route path="/cart/checkout" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader message="جاري تحميل إتمام الطلب..." />}>
          <LazyRoutes.CartCheckoutPage />
        </Suspense>
      } />
      <Route path="/products/details/:productId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ProductDetails />
        </Suspense>
      } />
      <Route path="/products/:slug" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ProductPurchase />
        </Suspense>
      } />
      <Route path="/product-max/:productId" element={
        <Suspense fallback={null}>
          <LazyRoutes.ProductPurchasePageMax />
        </Suspense>
      } />
      <Route path="/product-purchase-max/:productId" element={
        <Suspense fallback={null}>
          <LazyRoutes.ProductPurchasePageMax />
        </Suspense>
      } />
      <Route path="/product-purchase-max-v2/:productId" element={
        <Suspense fallback={null}>
          <LazyRoutes.ProductPurchasePageV3 />
        </Suspense>
      } />
      {/* مسار صريح v3 للتوضيح والتوافق */}
      <Route path="/product-purchase-max-v3/:productId" element={
        <Suspense fallback={null}>
          <LazyRoutes.ProductPurchasePageV3 />
        </Suspense>
      } />
      {/* دعم slug بالإضافة إلى ID */}
      <Route path="/product/:productIdentifier" element={
        <Suspense fallback={null}>
          <LazyRoutes.ProductPurchasePageV3 />
        </Suspense>
      } />
      <Route path="/product-public/:productId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ProductPurchasePageMaxPublic />
        </Suspense>
      } />

      {/* صفحة الشكر */}
      <Route path="/thank-you" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.ThankYouPage />
        </Suspense>
      } />

      {/* صفحات الخدمات العامة */}
      <Route path="/service-tracking/:trackingId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicServiceTrackingPage />
        </Suspense>
      } />
      <Route path="/service-tracking-public" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicServiceTrackingPage />
        </Suspense>
      } />
      <Route path="/services" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicServiceTrackingPage />
        </Suspense>
      } />
      <Route path="/repair-tracking" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.RepairTrackingPage />
        </Suspense>
      } />
      <Route path="/repair-tracking/:trackingCode" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.RepairTrackingPage />
        </Suspense>
      } />
      <Route path="/repair-complete/:orderId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.RepairComplete />
        </Suspense>
      } />

      {/* صفحات الألعاب العامة */}
      <Route path="/games" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicGameStorePage />
        </Suspense>
      } />
      <Route path="/games/:organizationId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicGameStorePage />
        </Suspense>
      } />
      <Route path="/game-tracking" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicGameTracking />
        </Suspense>
      } />
      <Route path="/game-tracking/:trackingNumber" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.PublicGameTracking />
        </Suspense>
      } />

      {/* صفحات QR للألعاب */}
      <Route path="/game-download-start/:orderId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader message="جاري تحميل بدء التحميل..." />}>
          <LazyRoutes.GameDownloadStart />
        </Suspense>
      } />
      <Route path="/game-complete/:orderId" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader message="جاري تحميل إتمام الطلب..." />}>
          <LazyRoutes.GameOrderComplete />
        </Suspense>
      } />

      {/* الصفحات المخصصة */}
      <Route path="/page/:slug" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.CustomPageView />
        </Suspense>
      } />
      <Route path="/:slug" element={
        <Suspense fallback={isStoreHost ? null : <PageLoader />}>
          <LazyRoutes.LandingPageView />
        </Suspense>
      } />
    </Routes>
  );
};


// ============ مسارات التوثيق ============
export const AuthRoutes = () => (
  <Routes>
    <Route path="/login" element={
      <PublicRoute>
        <Suspense fallback={<PageLoader message="جاري تحميل صفحة الدخول..." />}>
          <LazyRoutes.LoginForm />
        </Suspense>
      </PublicRoute>
    } />

    <Route path="/redirect" element={<RoleBasedRedirect />} />

    <Route path="/super-admin/login" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.SuperAdminLogin />
      </Suspense>
    } />

    <Route path="/admin/signup" element={
      <PublicRoute>
        <Suspense fallback={<PageLoader message="جاري تحميل التسجيل..." />}>
          <LazyRoutes.AdminSignup />
        </Suspense>
      </PublicRoute>
    } />

    <Route path="/tenant/signup" element={
      <PublicRoute>
        <Suspense fallback={<PageLoader message="جاري تحميل التسجيل..." />}>
          <LazyRoutes.TenantSignup />
        </Suspense>
      </PublicRoute>
    } />
  </Routes>
);

// ============ مسارات Super Admin ============
export const SuperAdminRoutes = () => (
  <Routes>
    <Route element={<SuperAdminRoute />}>
      <Route index element={
        <Suspense fallback={<PageLoader message="جاري تحميل لوحة الإدارة العليا..." />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="organizations" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminOrganizations />
        </Suspense>
      } />
      <Route path="organizations/requests" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminOrganizations />
        </Suspense>
      } />
      <Route path="subscriptions" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminSubscriptions />
        </Suspense>
      } />
      <Route path="subscription-requests" element={
        <Suspense fallback={<PageLoader message="جاري تحميل طلبات الاشتراك..." />}>
          <LazyRoutes.SuperAdminSubscriptionRequests />
        </Suspense>
      } />
      <Route path="payment-methods" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminPaymentMethods />
        </Suspense>
      } />
      <Route path="activation-codes" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.ActivationCodesPage />
        </Suspense>
      } />
      <Route path="yalidine-sync" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.YalidineSyncPage />
        </Suspense>
      } />
      <Route path="seo" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminSEO />
        </Suspense>
      } />
      <Route path="courses" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminCourses />
        </Suspense>
      } />
      <Route path="users" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="admins" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="settings" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="analytics" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="payments" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="logs" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="permissions" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      {/* مسارات نظام الإحالات */}
      <Route path="referrals" element={
        <Suspense fallback={<PageLoader message="جاري تحميل لوحة الإحالات..." />}>
          <LazyRoutes.SuperAdminReferralsDashboard />
        </Suspense>
      } />
      <Route path="referrals/referrers" element={
        <Suspense fallback={<PageLoader message="جاري تحميل المُحيلين..." />}>
          <LazyRoutes.SuperAdminReferrers />
        </Suspense>
      } />
      <Route path="referrals/redemptions" element={
        <Suspense fallback={<PageLoader message="جاري تحميل طلبات الاستبدال..." />}>
          <LazyRoutes.SuperAdminRedemptions />
        </Suspense>
      } />
      <Route path="referrals/rewards" element={
        <Suspense fallback={<PageLoader message="جاري تحميل المكافآت..." />}>
          <LazyRoutes.SuperAdminRewards />
        </Suspense>
      } />
      <Route path="referrals/tiers" element={
        <Suspense fallback={<PageLoader message="جاري تحميل المستويات..." />}>
          <LazyRoutes.SuperAdminTiers />
        </Suspense>
      } />
      <Route path="referrals/transactions" element={
        <Suspense fallback={<PageLoader message="جاري تحميل سجل المعاملات..." />}>
          <LazyRoutes.SuperAdminTransactions />
        </Suspense>
      } />
    </Route>
  </Routes>
);

// ============ مسارات Call Center ============
export const CallCenterRoutes = () => (
  <Routes>
    <Route element={<CallCenterRoute />}>
      <Route path="/call-center/*" element={
        <Suspense fallback={<PageLoader message="جاري تحميل مركز الاتصال..." />}>
          <LazyRoutes.CallCenterLayout />
        </Suspense>
      }>
        <Route index element={<Navigate to="/call-center/dashboard" replace />} />
        <Route path="dashboard" element={
          <Suspense fallback={<PageLoader />}>
            <LazyRoutes.CallCenterDashboard />
          </Suspense>
        } />
        <Route path="orders" element={<Navigate to="/call-center/orders/assigned" replace />} />
        <Route path="orders/assigned" element={
          <Suspense fallback={<PageLoader />}>
            <LazyRoutes.AssignedOrders />
          </Suspense>
        } />
        <Route path="orders/pending" element={<div>Pending Orders - Coming Soon</div>} />
        <Route path="orders/completed" element={<div>Completed Orders - Coming Soon</div>} />
        <Route path="performance" element={<div>Performance Stats - Coming Soon</div>} />
        <Route path="profile" element={<div>Agent Profile - Coming Soon</div>} />
      </Route>
    </Route>

    <Route element={<CallCenterRoute requireSupervisor={true} />}>
      <Route path="/call-center/management" element={<div>Agent Management - Coming Soon</div>} />
      <Route path="/call-center/reports" element={<div>Call Center Reports - Coming Soon</div>} />
      <Route path="/call-center/settings" element={<div>Call Center Settings - Coming Soon</div>} />
      <Route path="/call-center/monitoring" element={<div>Live Monitoring - Coming Soon</div>} />
    </Route>
  </Routes>
);

// ============ مسارات نقطة البيع ============
export const POSRoutes = () => (
  <Routes>
    <Route path="/pos" element={
      <ProtectedRoute>
        <ConditionalRoute appId="pos-system">
          <PermissionGuard requiredPermissions={['accessPOS']}>
            <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}>
              <LazyRoutes.POSOptimized />
            </Suspense>
          </PermissionGuard>
        </ConditionalRoute>
      </ProtectedRoute>
    } />
  </Routes>
);

// ============ مسارات لوحة التحكم الرئيسية ============
export const DashboardMainRoutes = () => (
  <Route element={<RequireTenant />}>
    {/* لوحة تحكم نقطة البيع - الصفحة الرئيسية */}
    <Route path="/dashboard" element={
      <SubscriptionCheck>
        <PermissionGuard
          requiredPermissions={['accessPOS']}
          fallbackPath="/dashboard/main"
        >
          <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
            <LazyRoutes.POSDashboard />
          </Suspense>
        </PermissionGuard>
      </SubscriptionCheck>
    } />

    {/* لوحة التحكم الكلاسيكية */}
    <Route path="/dashboard/main" element={
      <SubscriptionCheck>
        <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم الكلاسيكية..." />}>
          <LazyRoutes.Dashboard />
        </Suspense>
      </SubscriptionCheck>
    } />

    {/* المنتجات والمخزون */}
    <Route path="/dashboard/products" element={
      <SubscriptionCheck>
        <Suspense fallback={<PageLoader message="جاري تحميل المنتجات..." />}>
          <LazyRoutes.Products />
        </Suspense>
      </SubscriptionCheck>
    } />

    <Route path="/dashboard/inventory" element={
      <SubscriptionCheck>
        <PermissionGuard requiredPermissions={['viewInventory']}>
          <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
            <LazyRoutes.Inventory />
          </Suspense>
        </PermissionGuard>
      </SubscriptionCheck>
    } />

    <Route path="/dashboard/categories" element={
      <SubscriptionCheck>
        <PermissionGuard requiredPermissions={['manageProductCategories']}>
          <Suspense fallback={<PageLoader message="جاري تحميل الفئات..." />}>
            <LazyRoutes.Categories />
          </Suspense>
        </PermissionGuard>
      </SubscriptionCheck>
    } />
  </Route>
);

// ============ مسارات المبيعات والطلبات ============
export const SalesOrderRoutes = () => (
  <Route element={<RequireTenant />}>

    <Route path="/dashboard/orders" element={
      <SubscriptionCheck>
        <Suspense fallback={<PageLoader message="جاري تحميل الطلبات..." />}>
          <LazyRoutes.Orders />
        </Suspense>
      </SubscriptionCheck>
    } />

    <Route path="/dashboard/abandoned-orders" element={
      <SubscriptionCheck>
        <PermissionGuard requiredPermissions={['viewOrders']}>
          <Suspense fallback={<PageLoader message="جاري تحميل الطلبات المهجورة..." />}>
            <LazyRoutes.AbandonedOrders />
          </Suspense>
        </PermissionGuard>
      </SubscriptionCheck>
    } />
  </Route>
);

export default {
  PublicRoutes,
  AuthRoutes,
  SuperAdminRoutes,
  CallCenterRoutes,
  POSRoutes,
  DashboardMainRoutes,
  SalesOrderRoutes,
  PageLoader
};
