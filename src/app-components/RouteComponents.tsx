import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
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
import StoreRouter from '../components/routing/StoreRouter';
import RoleBasedRedirect from '../components/auth/RoleBasedRedirect';
import POSOrdersWrapper from '../components/pos/POSOrdersWrapper';

// Import lazy routes
import * as LazyRoutes from './LazyRoutes';

// 🚀 مكون تحميل محسن
export const PageLoader = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[50vh] bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {message || 'جاري تحميل الصفحة...'}
      </p>
    </div>
  </div>
);

// ============ المسارات العامة ============
export const PublicRoutes = () => (
  <Routes>
    {/* الصفحة الرئيسية */}
    <Route path="/" element={<StoreRouter />} />
    
    {/* صفحات الهبوط */}
    <Route path="/features" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.FeaturesPage />
      </Suspense>
    } />
    <Route path="/offline-features" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.OfflineFeatures />
      </Suspense>
    } />
    <Route path="/features/pos" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.POSFeaturesPage />
      </Suspense>
    } />
    <Route path="/features/online-store" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.OnlineStorePage />
      </Suspense>
    } />
    <Route path="/features/advanced-analytics" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.AdvancedAnalyticsFeaturesPage />
      </Suspense>
    } />
    <Route path="/pricing" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PricingPage />
      </Suspense>
    } />
    <Route path="/contact" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ContactLandingPage />
      </Suspense>
    } />
    <Route path="/contact-old" element={
      <Suspense fallback={<PageLoader />}>
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
      <Suspense fallback={<PageLoader message="جاري تحميل المنتجات..." />}>
        <LazyRoutes.StoreProducts />
      </Suspense>
    } />
    <Route path="/products/details/:productId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductDetails />
      </Suspense>
    } />
    <Route path="/products/:slug" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchase />
      </Suspense>
    } />
    <Route path="/product-max/:productId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchasePageMax />
      </Suspense>
    } />
    <Route path="/product-purchase-max/:productId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchasePageMax />
      </Suspense>
    } />
    <Route path="/product-purchase-max-v2/:productId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchasePageV3 />
      </Suspense>
    } />
    {/* دعم slug بالإضافة إلى ID */}
    <Route path="/product/:productIdentifier" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchasePageV3 />
      </Suspense>
    } />
    <Route path="/product-public/:productId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ProductPurchasePageMaxPublic />
      </Suspense>
    } />
    
    {/* صفحة الشكر */}
    <Route path="/thank-you" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.ThankYouPage />
      </Suspense>
    } />
    
    {/* صفحات الخدمات العامة */}
    <Route path="/service-tracking/:trackingId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicServiceTrackingPage />
      </Suspense>
    } />
    <Route path="/service-tracking-public" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicServiceTrackingPage />
      </Suspense>
    } />
    <Route path="/services" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicServiceTrackingPage />
      </Suspense>
    } />
    <Route path="/repair-tracking" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.RepairTrackingPage />
      </Suspense>
    } />
    <Route path="/repair-tracking/:trackingCode" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.RepairTrackingPage />
      </Suspense>
    } />
    <Route path="/repair-complete/:orderId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.RepairComplete />
      </Suspense>
    } />
    
    {/* صفحات الألعاب العامة */}
    <Route path="/games" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicGameStorePage />
      </Suspense>
    } />
    <Route path="/games/:organizationId" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicGameStorePage />
      </Suspense>
    } />
    <Route path="/game-tracking" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicGameTracking />
      </Suspense>
    } />
    <Route path="/game-tracking/:trackingNumber" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.PublicGameTracking />
      </Suspense>
    } />
    
    {/* صفحات QR للألعاب */}
    <Route path="/game-download-start/:orderId" element={
      <Suspense fallback={<PageLoader message="جاري تحميل بدء التحميل..." />}>
        <LazyRoutes.GameDownloadStart />
      </Suspense>
    } />
    <Route path="/game-complete/:orderId" element={
      <Suspense fallback={<PageLoader message="جاري تحميل إتمام الطلب..." />}>
        <LazyRoutes.GameOrderComplete />
      </Suspense>
    } />
    
    {/* الصفحات المخصصة */}
    <Route path="/page/:slug" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.CustomPageView />
      </Suspense>
    } />
    <Route path="/:slug" element={
      <Suspense fallback={<PageLoader />}>
        <LazyRoutes.LandingPageView />
      </Suspense>
    } />
  </Routes>
);

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
      <Route path="/super-admin" element={
        <Suspense fallback={<PageLoader message="جاري تحميل لوحة الإدارة العليا..." />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/organizations" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminOrganizations />
        </Suspense>
      } />
      <Route path="/super-admin/organizations/requests" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminOrganizations />
        </Suspense>
      } />
      <Route path="/super-admin/subscriptions" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminSubscriptions />
        </Suspense>
      } />
      <Route path="/super-admin/payment-methods" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminPaymentMethods />
        </Suspense>
      } />
      <Route path="/super-admin/activation-codes" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.ActivationCodesPage />
        </Suspense>
      } />
      <Route path="/super-admin/yalidine-sync" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.YalidineSyncPage />
        </Suspense>
      } />
      <Route path="/super-admin/seo" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminSEO />
        </Suspense>
      } />
      <Route path="/super-admin/courses" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminCourses />
        </Suspense>
      } />
      <Route path="/super-admin/users" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/admins" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/settings" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/analytics" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/payments" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/logs" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
        </Suspense>
      } />
      <Route path="/super-admin/permissions" element={
        <Suspense fallback={<PageLoader />}>
          <LazyRoutes.SuperAdminDashboard />
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
    <Route path="/dashboard" element={
      <SubscriptionCheck>
        <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
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
        <Suspense fallback={<PageLoader message="جاري تحميل المخزون..." />}>
          <LazyRoutes.Inventory />
        </Suspense>
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
    <Route path="/dashboard/sales" element={
      <SubscriptionCheck>
        <Suspense fallback={<PageLoader message="جاري تحميل المبيعات..." />}>
          <LazyRoutes.OptimizedSales />
        </Suspense>
      </SubscriptionCheck>
    } />
    
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
