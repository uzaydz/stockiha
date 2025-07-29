import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

// REMOVED: Performance monitoring - disabled to reduce memory usage

// تفعيل اعتراض طلبات المصادقة لمنع التكرار
import { enableAuthInterception } from '@/lib/authInterceptor';
enableAuthInterception();

// Import core components (lightweight)
import SmartProviderWrapper from './components/routing/SmartProviderWrapper';
import ErrorMonitor from './components/ErrorMonitor';
import { LocalStorageMonitor } from './components/auth/LocalStorageMonitor';
import SupabaseAnalyticsPanel from './components/analytics/SupabaseAnalyticsPanel';

// Import app components
import { AppCore, CategoryRedirect } from './app-components/AppComponents';
import { 
  PublicRoutes, 
  AuthRoutes, 
  SuperAdminRoutes, 
  CallCenterRoutes, 
  POSRoutes,
  PageLoader 
} from './app-components/RouteComponents';

// Lazy load dashboard routes to reduce initial bundle
const DashboardRoutes = React.lazy(() => import('./app-components/DashboardRoutes'));

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

// 🚀 المكون الرئيسي للتطبيق
const App = () => {
  return (
    <SmartProviderWrapper>
      <AppCore>
        <ErrorMonitor />
        
        <Routes>
          {/* المسارات العامة - تحمل فوراً */}
          <PublicRoutes />
          
          {/* مسارات التوثيق - تحمل فوراً */}
          <AuthRoutes />
          
          {/* مسارات Super Admin */}
          <SuperAdminRoutes />
          
          {/* مسارات Call Center */}
          <CallCenterRoutes />
          
          {/* مسار نقطة البيع */}
          <POSRoutes />
          
          {/* مسار إعادة التوجيه للفئات */}
          <Route path="/category/:categoryId" element={<CategoryRedirect />} />
          
          {/* مسارات لوحة التحكم - Lazy Loading */}
          <Route path="/dashboard/*" element={
            <Suspense fallback={<PageLoader message="جاري تحميل لوحة التحكم..." />}>
              <DashboardRoutes />
            </Suspense>
          } />
          
          {/* مسار 404 */}
          <Route path="*" element={
            <Suspense fallback={<AppLoader />}>
              {React.createElement(React.lazy(() => import('./pages/NotFound')))}
            </Suspense>
          } />
        </Routes>
        
        {/* مكونات التطوير */}
        {import.meta.env.DEV && <LocalStorageMonitor />}
        {import.meta.env.DEV && <SupabaseAnalyticsPanel />}
      </AppCore>
    </SmartProviderWrapper>
  );
};

export default App;
