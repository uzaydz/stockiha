import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// REMOVED: Performance monitoring - disabled to reduce memory usage

// Import core components (lightweight)
import SmartProviderWrapper from './components/routing/SmartProviderWrapper';

// Lazy load non-critical components
const ErrorMonitor = React.lazy(() => import('./components/ErrorMonitor'));
const LocalStorageMonitor = React.lazy(() => import('./components/auth/LocalStorageMonitor').then(module => ({ default: module.LocalStorageMonitor })));
const SupabaseAnalyticsPanel = React.lazy(() => import('./components/analytics/SupabaseAnalyticsPanel'));

// Import app components
import { AppCore, CategoryRedirect } from './app-components/AppComponents';
import { DashboardRoutes } from './app-components/DashboardRoutes';

// Lazy load all route components
const PublicRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.PublicRoutes })));
const SuperAdminRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.SuperAdminRoutes })));
const CallCenterRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.CallCenterRoutes })));
const POSRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.POSRoutes })));

// Import lazy routes and auth components directly
import * as LazyRoutes from './app-components/LazyRoutes';
const PublicRoute = React.lazy(() => import('./components/auth/PublicRoute'));
const RoleBasedRedirect = React.lazy(() => import('./components/auth/RoleBasedRedirect'));

// 🎯 مكون تحميل خاص بالتطبيق
const AppLoader = () => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20"></div>
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">سطوكيها</h3>
        <p className="text-sm text-muted-foreground">جاري تحميل النظام...</p>
      </div>
    </div>
  </div>
);

// 🚀 مكون تحميل الصفحات
const PageLoader = ({ message }: { message?: string }) => (
  <div className="flex items-center justify-center min-h-[50vh] bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">
        {message || 'جاري تحميل الصفحة...'}
      </p>
    </div>
  </div>
);

// 🚀 المكون الرئيسي للتطبيق
const App = () => {
  return (
    <SmartProviderWrapper>
      <AppCore>
        <Suspense fallback={null}>
          <ErrorMonitor />
        </Suspense>
        
        <Routes>
          {/* مسار إعادة التوجيه للفئات */}
          <Route path="/category/:categoryId" element={<CategoryRedirect />} />
          
          {/* مسارات لوحة التحكم - Lazy Loading */}
          {DashboardRoutes()}
          
          {/* المسارات العامة - Lazy Loading */}
          <Route path="/*" element={
            <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
              <PublicRoutes />
            </Suspense>
          } />
          
          {/* مسارات التوثيق - Lazy Loading */}
          <Route path="/login" element={
            <Suspense fallback={<PageLoader message="جاري تحميل صفحة الدخول..." />}>
              <PublicRoute>
                <LazyRoutes.LoginForm />
              </PublicRoute>
            </Suspense>
          } />
          <Route path="/admin/signup" element={
            <Suspense fallback={<PageLoader message="جاري تحميل التسجيل..." />}>
              <PublicRoute>
                <LazyRoutes.AdminSignup />
              </PublicRoute>
            </Suspense>
          } />
          <Route path="/tenant/signup" element={
            <Suspense fallback={<PageLoader message="جاري تحميل التسجيل..." />}>
              <PublicRoute>
                <LazyRoutes.TenantSignup />
              </PublicRoute>
            </Suspense>
          } />
          <Route path="/redirect" element={
            <Suspense fallback={<PageLoader />}>
              <RoleBasedRedirect />
            </Suspense>
          } />
          <Route path="/super-admin/login" element={
            <Suspense fallback={<PageLoader />}>
              <LazyRoutes.SuperAdminLogin />
            </Suspense>
          } />
          
          {/* مسارات Super Admin */}
          <Route path="/super-admin/*" element={
            <Suspense fallback={<PageLoader message="جاري تحميل لوحة الإدارة العليا..." />}>
              <SuperAdminRoutes />
            </Suspense>
          } />
          
          {/* مسارات Call Center */}
          <Route path="/call-center/*" element={
            <Suspense fallback={<PageLoader message="جاري تحميل مركز الاتصال..." />}>
              <CallCenterRoutes />
            </Suspense>
          } />
          
          {/* مسار نقطة البيع */}
          <Route path="/pos" element={
            <Suspense fallback={<PageLoader message="جاري تحميل نقطة البيع..." />}>
              <POSRoutes />
            </Suspense>
          } />
          
          {/* مسار 404 */}
          <Route path="*" element={
            <Suspense fallback={<AppLoader />}>
              {React.createElement(React.lazy(() => import('./pages/NotFound')))}
            </Suspense>
          } />
        </Routes>
        
        {/* مكونات التطوير - lazy loading */}
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <LocalStorageMonitor />
          </Suspense>
        )}
        {import.meta.env.DEV && (
          <Suspense fallback={null}>
            <SupabaseAnalyticsPanel />
          </Suspense>
        )}
      </AppCore>
    </SmartProviderWrapper>
  );
};

export default App;
