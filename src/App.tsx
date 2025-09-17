import React, { Suspense, useRef, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// Import core components (lightweight)
import SmartProviderWrapper from './components/routing/SmartProviderWrapper';
import EarlyDomainDetector from './components/routing/EarlyDomainDetector';
import StoreRouter from './components/routing/StoreRouter';
const StorePage = React.lazy(() => import('./components/store/StorePage'));
import NetworkErrorHandler from './components/NetworkErrorHandler';
import ErrorBoundary from './components/ErrorBoundary';
import LayoutShiftPrevention from './components/performance/LayoutShiftPrevention';

// Lazy load non-critical components
const LocalStorageMonitor = React.lazy(() => import('./components/auth/LocalStorageMonitor').then(module => ({ default: module.LocalStorageMonitor })));

// Import app components
import { AppCore, CategoryRedirect } from './app-components/AppComponents';
// Lazy load dashboard routes so they don't load on public store startup
const DashboardRoutes = React.lazy(() => import('./app-components/DashboardRoutes').then(m => ({ default: m.DashboardRoutes })));

// Lazy load all route components
const PublicRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.PublicRoutes })));
const SuperAdminRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.SuperAdminRoutes })));
const CallCenterRoutes = React.lazy(() => import('./app-components/RouteComponents').then(module => ({ default: module.CallCenterRoutes })));
// عزل POS إلى ملف مستقل لتقليل احتمال الدمج مع مسارات عامة
const POSRoutes = React.lazy(() => import('./app-components/POSRoutesStandalone'));

// Import enhanced lazy routes with strategic preloading
import * as LazyRoutes from './app-components/LazyRoutes.enhanced';
const PublicRoute = React.lazy(() => import('./components/auth/PublicRoute'));
const RoleBasedRedirect = React.lazy(() => import('./components/auth/RoleBasedRedirect'));

// 🚀 Import optimized lazy loading components - deferred
// Note: avoid wrapping objects in React.lazy; each lazy must resolve to a single component
const LazyLoadingWrapper = React.lazy(() => import('./components/ui/LazyLoadingWrapper').then(m => ({ default: m.LazyLoadingWrapper })));
const NotFoundPage = React.lazy(() => import('./pages/NotFound'));
// import { ConsoleRemover } from './components/ui/ConsoleRemover';

// 🎯 مكون تحميل محسن للتطبيق - يعرض المتجر مباشرة عند الكشف المبكر
const AppLoader = () => {
  // 🔥 الكشف المبكر للنطاق
  const detectDomainEarly = () => {
    try {
      const hostname = window.location.hostname;
      
      // فحص النطاقات العامة
      const isPublicDomain = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com', 'stockiha.pages.dev'].includes(hostname);
      
      if (!isPublicDomain && !hostname.includes('localhost')) {
        // نطاق مخصص أو subdomain - عرض المتجر مباشرة
        return (
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen bg-background"><div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" /></div>}>
            <StorePage />
          </Suspense>
        );
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
  const appStartTime = useRef(performance.now());

  // تطهير الحالة القديمة عند بدء التطبيق
  useAuthStateCleanup();

  const currentRenderTime = performance.now();
  renderCount.current++;

  // تسجيل معلومات رندر التطبيق مع تفاصيل أكثر
  console.log('🎭 [APP.TSX] رندر التطبيق', {
    renderNumber: renderCount.current,
    timeSinceStart: currentRenderTime - appStartTime.current,
    url: window.location.href,
    isInitialized: isInitialized.current,
    timestamp: new Date().toISOString(),
    memory: (performance as any).memory ? {
      used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB',
      total: Math.round((performance as any).memory.totalJSHeapSize / 1024 / 1024) + 'MB'
    } : 'غير متوفر',
    currentTime: currentRenderTime
  });

  // تحذير إذا كان الرندر متكرراً جداً
  if (renderCount.current > 5) {
    console.warn('⚠️ [APP.TSX] رندر متكرر جداً!', {
      renderNumber: renderCount.current,
      warning: 'قد يؤثر على الأداء'
    });
  }

  // Component render tracking removed

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    const initTime = performance.now() - appStartTime.current;
    console.log('🚀 [APP.TSX] اكتمال التهيئة الأولى', {
      initTime: initTime,
      renderCount: renderCount.current,
      memoryUsage: (performance as any).memory ? {
        used: Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024) + 'MB'
      } : 'غير متوفر'
    });

    isInitialized.current = true;
  }, []);

  // تحديد ما إذا كان المضيف الحالي هو متجر عام (subdomain أو نطاق مخصص للمتجر)
  const isStoreHost = React.useMemo(() => {
    try {
      const hostname = window.location.hostname;
      const publicDomains = ['ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com', 'stockiha.pages.dev'];
      const isLocalhost = hostname.includes('localhost');
      if (publicDomains.includes(hostname)) return false;
      if (isLocalhost) return false;
      const parts = hostname.split('.');
      const isSubOfStockiha = hostname.endsWith('.stockiha.com') && parts.length > 2 && parts[0] !== 'www';
      const isSubOfKtobi = hostname.endsWith('.ktobi.online') && parts.length > 2 && parts[0] !== 'www';
      const isCustomDomain = !isSubOfStockiha && !isSubOfKtobi && !publicDomains.includes(hostname);
      return isSubOfStockiha || isSubOfKtobi || isCustomDomain;
    } catch {
      return false;
    }
  }, []);

  // معالج الكشف المبكر للنطاق
  const handleDomainDetected = React.useCallback((domainInfo: any) => {
    const domainDetectTime = performance.now() - appStartTime.current;

    // تسجيل بسيط في التطوير فقط لتجنب إبطاء الإنتاج
    if (process.env.NODE_ENV === 'development') {
      console.log('🌐 [APP.TSX] كشف النطاق مكتمل', {
        domainInfo: {
          hostname: domainInfo.hostname,
          subdomain: domainInfo.subdomain,
          isCustomDomain: domainInfo.isCustomDomain,
          isSubdomain: domainInfo.isSubdomain
        },
        detectionTime: domainDetectTime,
        currentTitle: document.title
      });
    }

    // إذا كان نطاق مخصص، يمكننا تحسين التحميل
    if (domainInfo.isCustomDomain) {
      // تحديث عنوان الصفحة مبكراً بدون لاحقة "متجر" لتجنب الوميض
      if (domainInfo.subdomain) {
        const cleanTitle = String(domainInfo.subdomain);
        if (document.title !== cleanTitle) {
          document.title = cleanTitle;
          console.log('📝 [APP.TSX] تحديث عنوان الصفحة', {
            oldTitle: document.title,
            newTitle: cleanTitle
          });
        }
      }

      // إرسال event للكشف عن النطاق
      console.log('📡 [APP.TSX] إرسال حدث كشف النطاق');
      window.dispatchEvent(new CustomEvent('bazaar:domain-detected', {
        detail: domainInfo
      }));
    }
  }, []);
  
  return (
    <ErrorBoundary>
      <NetworkErrorHandler>
        <EarlyDomainDetector onDomainDetected={handleDomainDetected}>
          <LayoutShiftPrevention>
            {/* <ConsoleRemover /> */}
            <SmartProviderWrapper>
          <AppCore>
            <Routes>
              {/* مسار المتجر الرئيسي بدون Lazy لتفادي أي شاشة انتظار */}
              <Route path="/" element={<StoreRouter />} />
              {/* مسار إعادة التوجيه للفئات */}
              <Route path="/category/:categoryId" element={<CategoryRedirect />} />
              
              {/* مسارات لوحة التحكم - لا يتم تحميلها عند الإقلاع في المتجر العام */}
              {!isStoreHost ? (
                <Route path="/dashboard/*" element={
                  <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
                    <DashboardRoutes />
                  </Suspense>
                } />
              ) : null}

              {/* المسارات العامة - Lazy Loading */}
              <Route path="/*" element={
                <Suspense fallback={isStoreHost ? null : <PageLoader />}>
                  <PublicRoutes />
                </Suspense>
              } />
              
              {/* مسارات التوثيق - Lazy Loading */}
              <Route path="/login" element={
                <Suspense fallback={(() => {
                  
                  return <PageLoader message="جاري تحميل صفحة الدخول..." />;
                })()}>
                  {(() => {
                    const loginLoadTime = performance.now();
                    return (
                      <PublicRoute>
                        <LazyRoutes.LoginForm />
                      </PublicRoute>
                    );
                  })()}
                </Suspense>
              } />
              <Route path="/forgot-password" element={
                <Suspense fallback={(() => {
                  
                  return <PageLoader message="جاري تحميل صفحة نسيت كلمة المرور..." />;
                })()}>
                  {(() => {
                    const forgotLoadTime = performance.now();
                    return (
                      <PublicRoute>
                        <LazyRoutes.ForgotPasswordForm />
                      </PublicRoute>
                    );
                  })()}
                </Suspense>
              } />
              <Route path="/reset-password" element={
                <Suspense fallback={(() => {
                  
                  return <PageLoader message="جاري تحميل صفحة إعادة تعيين كلمة المرور..." />;
                })()}>
                  {(() => {
                    const resetLoadTime = performance.now();
                    return (
                      <PublicRoute>
                        <LazyRoutes.ResetPasswordForm />
                      </PublicRoute>
                    );
                  })()}
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
              {!isStoreHost ? (
                <Route path="/super-admin/*" element={
                  <Suspense fallback={(() => {
                    
                    return <PageLoader message="جاري تحميل لوحة الإدارة العليا..." />;
                  })()}>
                    {(() => {
                      const superAdminLoadTime = performance.now();
                      return <SuperAdminRoutes />;
                    })()}
                  </Suspense>
                } />
              ) : null}

              {/* مسارات Call Center */}
              {!isStoreHost ? (
                <Route path="/call-center/*" element={
                  <Suspense fallback={(() => {
                    
                    return <PageLoader message="جاري تحميل مركز الاتصال..." />;
                  })()}>
                    {(() => {
                      const callCenterLoadTime = performance.now();
                      return <CallCenterRoutes />;
                    })()}
                  </Suspense>
                } />
              ) : null}
              
              {/* مسار نقطة البيع - محسن */}
              <Route path="/pos/*" element={
                <LazyLoadingWrapper message="جاري تحميل نقطة البيع...">
                  <POSRoutes />
                </LazyLoadingWrapper>
              } />
              
              {/* مسار 404 */}
              <Route path="*" element={
                <Suspense fallback={<AppLoader />}>
                  <NotFoundPage />
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
          </LayoutShiftPrevention>
        </EarlyDomainDetector>
      </NetworkErrorHandler>
    </ErrorBoundary>
  );
};

export default App;
