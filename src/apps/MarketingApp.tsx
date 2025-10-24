import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { Loader2 } from 'lucide-react';

console.log('📦 [MarketingApp] بدء تحميل ملف MarketingApp.tsx');

// 🚀 LandingPage مباشرة بدون أي تأخير أو شاشات تحميل
const SimpleLandingPage = React.memo(() => {
  console.log('🏠 [SimpleLandingPage] بدء render');
  const startTime = performance.now();

  React.useEffect(() => {
    document.title = 'سطوكيها | منصة إدارة المتاجر الذكية';

    // بدء تحميل المكونات الثانوية مسبقاً لتجنب أي loading
    const preloadComponents = async () => {
      try {
        console.log('🔄 [SimpleLandingPage] بدء تحميل المكونات مسبقاً');

        // تحميل المكونات الثانوية في الخلفية
        const promises = [
          import('@/components/landing/AllInOneSection'),
          import('@/components/landing/CoursesSection'),
          import('@/components/landing/TestimonialsSection'),
          import('@/components/landing/CTASection')
        ];

        await Promise.all(promises);
        console.log('✅ [SimpleLandingPage] تم تحميل جميع المكونات مسبقاً');
      } catch (error) {
        console.warn('⚠️ [SimpleLandingPage] خطأ في التحميل المسبق:', error);
      }
    };

    // تحميل فوري
    preloadComponents();
  }, []);

  // عرض LandingPage مباشرة بدون Suspense - المكونات ستكون محملة مسبقاً
  console.log('📄 [SimpleLandingPage] عرض الصفحة الكاملة مباشرة');
  const result = <LandingPageDirect />;

  console.log('✅ [SimpleLandingPage] انتهى render في', performance.now() - startTime, 'ms');
  return result;
});

import LandingPageDirect from '@/pages/landing/LandingPage';
const LandingPage = lazy(() => import('@/pages/landing/LandingPage'));
const FeaturesPage = lazy(() => import('@/pages/landing/FeaturesPage'));
const OfflineFeatures = lazy(() => import('@/pages/OfflineFeatures'));
const POSFeaturesPage = lazy(() => import('@/pages/POSFeaturesPage'));
const OnlineStorePage = lazy(() => import('@/pages/features/OnlineStorePage'));
const AdvancedAnalyticsFeaturesPage = lazy(() => import('@/pages/AdvancedAnalyticsFeaturesPage'));
const PricingPage = lazy(() => import('@/pages/PricingPage'));
const ContactLandingPage = lazy(() => import('@/pages/landing/ContactPage'));
const ContactPage = lazy(() => import('@/pages/ContactPage'));
const CustomDomainsDocPage = lazy(() => import('@/pages/docs/CustomDomainsDocPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

const PageLoader: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center justify-center min-h-[50vh] bg-background">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{message || 'جاري تحميل الصفحة...'}</p>
    </div>
  </div>
);

// مسارات Admin التي يجب إعادة توجيهها
const ADMIN_PATH_PREFIXES = [
  '/dashboard',
  '/pos',
  '/call-center',
  '/super-admin',
  '/login',
  '/forgot-password',
  '/reset-password',
  '/tenant/signup',
  '/admin/signup',
  '/setup-organization',
  '/redirect',
  '/super-admin/login'
];

const AppRouter: React.FC = () => {
  console.log('🛣️ [AppRouter] بدء render AppRouter');
  const startTime = performance.now();

  const location = useLocation();
  console.log('📍 [AppRouter] المسار الحالي:', location.pathname, 'في', performance.now() - startTime, 'ms');

  // التحقق من وجود مسار admin - فقط للمسارات الإدارية المباشرة
  const isAdminPath = ADMIN_PATH_PREFIXES.some(prefix =>
    location.pathname.startsWith(prefix)
  );

  // إذا كان مسار admin، أعد التوجيه مع المحافظة على المسار - بدون تأخير
  if (isAdminPath) {
    console.log('🔄 [AppRouter] إعادة توجيه إلى admin');
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('app', 'admin');
    window.location.replace(newUrl.toString());
    return null;
  }

  console.log('🏠 [AppRouter] تحميل صفحة الهبوط');
  const routesStart = performance.now();

  // 🚀 تحميل فوري للصفحة الرئيسية مع lazy loading للباقي
  const routes = (
    <Routes>
      {/* الصفحة الرئيسية تحمل فوراً بدون Suspense */}
      <Route path="/" element={<SimpleLandingPage />} />

      {/* باقي الصفحات مع lazy loading */}
      <Route path="/full-landing" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <LandingPage />
        </Suspense>
      } />
      <Route path="/features" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <FeaturesPage />
        </Suspense>
      } />
      <Route path="/offline-features" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <OfflineFeatures />
        </Suspense>
      } />
      <Route path="/features/pos" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <POSFeaturesPage />
        </Suspense>
      } />
      <Route path="/features/online-store" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <OnlineStorePage />
        </Suspense>
      } />
      <Route path="/features/advanced-analytics" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <AdvancedAnalyticsFeaturesPage />
        </Suspense>
      } />
      <Route path="/pricing" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <PricingPage />
        </Suspense>
      } />
      <Route path="/contact" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <ContactLandingPage />
        </Suspense>
      } />
      <Route path="/contact-old" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <ContactPage />
        </Suspense>
      } />
      <Route path="/docs/custom-domains" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <CustomDomainsDocPage />
        </Suspense>
      } />
      <Route path="*" element={
        <Suspense fallback={<PageLoader message="جاري تحميل الصفحة..." />}>
          <NotFoundPage />
        </Suspense>
      } />
    </Routes>
  );

  console.log('✅ [AppRouter] تم إنشاء Routes في', performance.now() - routesStart, 'ms');
  console.log('✅ [AppRouter] انتهى render AppRouter في', performance.now() - startTime, 'ms');

  return routes;
};

// 🚀 صفحة هبوط مبسطة جداً بدون أي providers معقدة - تحميل فوري
const MarketingApp: React.FC = () => {
  console.log('🎯 [MarketingApp] بدء render MarketingApp');
  const startTime = performance.now();
  
  // كشف ما إذا كان التطبيق يعمل في Electron
  const isElectron = typeof window !== 'undefined' && 
    window.navigator && 
    window.navigator.userAgent && 
    window.navigator.userAgent.includes('Electron');
  
  // في Electron، استخدم basename فارغ
  const basename = isElectron ? '' : '/';

  const result = (
    <div>
      <HelmetProvider>
        <BrowserRouter basename={basename}>
          <AppRouter />
        </BrowserRouter>
      </HelmetProvider>
    </div>
  );

  console.log('✅ [MarketingApp] انتهى render MarketingApp في', performance.now() - startTime, 'ms');
  return result;
};

export default MarketingApp;
