import React, { Suspense, lazy, useMemo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import NetworkErrorHandler from '@/components/NetworkErrorHandler';
import ErrorBoundary from '@/components/ErrorBoundary';
import LayoutShiftPrevention from '@/components/performance/LayoutShiftPrevention';
import LazyLoadingWrapper from '@/components/ui/LazyLoadingWrapper';
import { AppCore } from '@/app-components/AppComponents';
import { DashboardRoutes } from '@/app-components/DashboardRoutes';
import { CallCenterRoutes, SuperAdminRoutes, PageLoader as SharedPageLoader } from '@/app-components/RouteComponents';
import POSRoutes from '@/app-components/POSRoutesStandalone';
import { enableAuthInterception } from '@/lib/authInterceptorV2';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import { ConfirmationProvider } from '@/context/ConfirmationContext';
import { SyncManagerWrapper } from '@/app-components/AppComponents';
import { SuperUnifiedDataProvider } from '@/context/SuperUnifiedDataContext';
import SnowEffect from '@/components/effects/SnowEffect';

const LocalStorageMonitor = lazy(() =>
  import('@/components/auth/LocalStorageMonitor').then(module => ({ default: module.LocalStorageMonitor }))
);
const PublicRoute = lazy(() => import('@/components/auth/PublicRoute'));
const RoleBasedRedirect = lazy(() => import('@/components/auth/RoleBasedRedirect'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));
const StaffLogin = lazy(() => import('@/pages/StaffLogin'));
const POSDashboard = lazy(() => import('@/pages/POSDashboard'));

import * as LazyRoutes from '@/app-components/LazyRoutes.enhanced';

enableAuthInterception();

const AppLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      </div>
      <div className="text-center">
        <h3 className="text-lg font-semibold text-foreground mb-2">سطوكيها</h3>
        <p className="text-sm text-muted-foreground">{message || 'جاري تحميل النظام...'}</p>
      </div>
    </div>
  </div>
);

const SuspenseRoute: React.FC<{ fallback?: React.ReactNode; children: React.ReactNode }> = ({ fallback, children }) => (
  <Suspense fallback={fallback ?? <AppLoader />}>{children}</Suspense>
);

const AdminApp: React.FC = () => {
  const fallback = useMemo(() => <AppLoader />, []);

  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <LayoutShiftPrevention>
          <AppCore>
            <SuperUnifiedDataProvider>
              {typeof window !== 'undefined' && localStorage.getItem('ui:snow') === '1' && (
                <SnowEffect className="fixed inset-0 z-[9999] pointer-events-none opacity-40" />
              )}
              <SyncManagerWrapper />
                <Routes>
                  <Route
                    path="/dashboard/*"
                    element={
                      <SuspenseRoute fallback={<SharedPageLoader message="جاري تحميل لوحة التحكم..." />}>
                        <DashboardRoutes />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/call-center/*"
                    element={
                      <SuspenseRoute fallback={<SharedPageLoader message="جاري تحميل مركز الاتصال..." />}>
                        <CallCenterRoutes />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/pos/*"
                    element={
                      <Suspense fallback={<AppLoader message="جاري تحميل نقطة البيع..." />}>
                        <LazyLoadingWrapper message="جاري تحميل نقطة البيع...">
                          <POSRoutes />
                        </LazyLoadingWrapper>
                      </Suspense>
                    }
                  />

                  <Route
                    path="/super-admin/*"
                    element={
                      <SuspenseRoute fallback={<SharedPageLoader message="جاري تحميل لوحة الإدارة العليا..." />}>
                        <SuperAdminRoutes />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/login"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل صفحة الدخول..." />}>
                        <PublicRoute>
                          <LazyRoutes.LoginForm />
                        </PublicRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/staff-login"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل تسجيل دخول الموظف..." />}>
                        <ProtectedRoute>
                          <StaffLogin />
                        </ProtectedRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/forgot-password"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل صفحة نسيت كلمة المرور..." />}>
                        <PublicRoute>
                          <LazyRoutes.ForgotPasswordForm />
                        </PublicRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/reset-password"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل صفحة إعادة تعيين كلمة المرور..." />}>
                        <PublicRoute>
                          <LazyRoutes.ResetPasswordForm />
                        </PublicRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/admin/signup"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل التسجيل..." />}>
                        <PublicRoute>
                          <LazyRoutes.AdminSignup />
                        </PublicRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/tenant/signup"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل التسجيل..." />}>
                        <PublicRoute>
                          <LazyRoutes.TenantSignup />
                        </PublicRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/setup-organization"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل إعداد المؤسسة..." />}>
                        <LazyRoutes.SetupOrganization />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/program-landing"
                    element={
                      <SuspenseRoute fallback={<AppLoader message="جاري تحميل صفحة البرنامج..." />}>
                        <ProtectedRoute>
                          <LazyRoutes.ProgramLandingPage />
                        </ProtectedRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/redirect"
                    element={
                      <SuspenseRoute fallback={fallback}>
                        <RoleBasedRedirect />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/super-admin/login"
                    element={
                      <SuspenseRoute fallback={fallback}>
                        <LazyRoutes.SuperAdminLogin />
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/confirmation/workspace"
                    element={
                      <SuspenseRoute fallback={<SharedPageLoader message="جاري تحميل مساحة موظف التأكيد..." />}>
                        <ProtectedRoute allowedRoles={['confirmation_agent']}>
                          <ConfirmationProvider>
                            <LazyRoutes.ConfirmationAgentWorkspace />
                          </ConfirmationProvider>
                        </ProtectedRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="/confirmation"
                    element={<Navigate to="/confirmation/workspace" replace />}
                  />

                  <Route
                    path="/"
                    element={<Navigate to="/login" replace />}
                  />

                  <Route
                    path="/desktop"
                    element={
                      <SuspenseRoute fallback={<SharedPageLoader message="جاري تحميل لوحة التحكم..." />}>
                        <ProtectedRoute>
                          <POSDashboard />
                        </ProtectedRoute>
                      </SuspenseRoute>
                    }
                  />

                  <Route
                    path="*"
                    element={
                      <SuspenseRoute fallback={fallback}>
                        <NotFoundPage />
                      </SuspenseRoute>
                    }
                  />
                </Routes>

                {import.meta.env.DEV && (
                  <Suspense fallback={null}>
                    <LocalStorageMonitor />
                  </Suspense>
                )}
            </SuperUnifiedDataProvider>
          </AppCore>
        </LayoutShiftPrevention>
      </NetworkErrorHandler>
    </ErrorBoundary>
  );
};

export default AdminApp;
