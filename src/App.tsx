import React, { Suspense, useRef, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Import core components (lightweight)
import SmartProviderWrapper from './components/routing/SmartProviderWrapper';
import EarlyDomainDetector from './components/routing/EarlyDomainDetector';
import StorePage from './components/store/StorePage';
import NetworkErrorHandler from './components/NetworkErrorHandler';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load non-critical components
const LocalStorageMonitor = React.lazy(() => import('./components/auth/LocalStorageMonitor').then(module => ({ default: module.LocalStorageMonitor })));

// Import app components
import { AppCore, CategoryRedirect } from './app-components/AppComponents';
import { DashboardRoutes } from './app-components/DashboardRoutes';

// Lazy load all route components
const PublicRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.PublicRoutes })));
const SuperAdminRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.SuperAdminRoutes })));
const CallCenterRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.CallCenterRoutes })));
// عزل POS إلى ملف مستقل لتقليل احتمال الدمج مع مسارات عامة
const POSRoutes = React.lazy(() => import('./app-components/POSRoutesStandalone'));

// Import lazy routes and auth components directly
import * as LazyRoutes from './app-components/LazyRoutes';
const PublicRoute = React.lazy(() => import('./components/auth/PublicRoute'));
const RoleBasedRedirect = React.lazy(() => import('./components/auth/RoleBasedRedirect'));

// 🚀 Import optimized lazy loading components
import { LazyComponents } from './components/lazy/LazyHeavyComponents';
import { LazyLoadingWrapper } from './components/ui/LazyLoadingWrapper';
// import { ConsoleRemover } from './components/ui/ConsoleRemover';

// 🎯 مكون تحميل محسن للتطبيق - يعرض المتجر مباشرة عند الكشف المبكر
const AppLoader = () => {
  // 🔥 الكشف المبكر للنطاق
  const detectDomainEarly = () => {
    try {
      const hostname = window.location.hostname;
      
      // فحص النطاقات العامة
      const isPublicDomain = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'].includes(hostname);
      
      if (!isPublicDomain && !hostname.includes('localhost')) {
        // نطاق مخصص أو subdomain - عرض المتجر مباشرة
        return <StorePage />;
      }
    } catch (error) {
      // خطأ في الكشف المبكر للنطاق
    }
    
    // شاشة التحميل العامة - محسنة
    return (
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
  };
  
  // تشغيل الكشف فوراً
  return detectDomainEarly();
};

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

// Import cleanup hook
const useAuthStateCleanup = () => {
  React.useEffect(() => {
    // تطهير البيانات المتضاربة عند بدء التطبيق
    const keysToClean = ['lastLoginRedirect', 'loginRedirectCount', 'authErrorCount'];
    keysToClean.forEach(key => sessionStorage.removeItem(key));
  }, []);
};

// 🚀 المكون الرئيسي للتطبيق
const App = () => {
  // 🔥 استخدام useRef لمنع إعادة الإنشاء المتكرر
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  
  // تطهير الحالة القديمة عند بدء التطبيق
  useAuthStateCleanup();

  renderCount.current++;

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

  // معالج الكشف المبكر للنطاق
  const handleDomainDetected = React.useCallback((domainInfo: any) => {
    
    // إذا كان نطاق مخصص، يمكننا تحسين التحميل
    if (domainInfo.isCustomDomain) {
      // تحديث عنوان الصفحة مبكراً
      if (domainInfo.subdomain) {
        document.title = `متجر ${domainInfo.subdomain} - سطوكيها`;
      }
      
      // إرسال event للكشف عن النطاق
      window.dispatchEvent(new CustomEvent('bazaar:domain-detected', {
        detail: domainInfo
      }));
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <EarlyDomainDetector onDomainDetected={handleDomainDetected}>
          {/* <ConsoleRemover /> */}
          <SmartProviderWrapper>
          <AppCore>
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
              <Route path="/forgot-password" element={
                <Suspense fallback={<PageLoader message="جاري تحميل صفحة نسيت كلمة المرور..." />}>
                  <PublicRoute>
                    <LazyRoutes.ForgotPasswordForm />
                  </PublicRoute>
                </Suspense>
              } />
              <Route path="/reset-password" element={
                <Suspense fallback={<PageLoader message="جاري تحميل صفحة إعادة تعيين كلمة المرور..." />}>
                  <PublicRoute>
                    <LazyRoutes.ResetPasswordForm />
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
              <Route path="/setup-organization" element={
                <Suspense fallback={<PageLoader message="جاري تحميل إعداد المؤسسة..." />}>
                  <LazyRoutes.SetupOrganization />
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
              
              {/* مسار نقطة البيع - محسن */}
              <Route path="/pos/*" element={
                <LazyLoadingWrapper message="جاري تحميل نقطة البيع...">
                  <POSRoutes />
                </LazyLoadingWrapper>
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
          </AppCore>
        </SmartProviderWrapper>
      </EarlyDomainDetector>
    </NetworkErrorHandler>
  </ErrorBoundary>
  );
};

export default App;
