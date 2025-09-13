import { Suspense, lazy, memo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

// تحميل كسول للمكونات
const FeaturesHero = lazy(() => import('@/components/features/FeaturesHero'));
const EcommerceFeatures = lazy(() => import('@/components/features/EcommerceFeatures'));
const POSFeatures = lazy(() => import('@/components/features/POSFeatures'));
const ServiceFeatures = lazy(() => import('@/components/features/ServiceFeatures'));
const ManagementFeatures = lazy(() => import('@/components/features/ManagementFeatures'));
const DeliveryFeatures = lazy(() => import('@/components/features/DeliveryFeatures'));
const AfterSalesFeatures = lazy(() => import('@/components/features/AfterSalesFeatures'));
const CustomizationFeatures = lazy(() => import('@/components/features/CustomizationFeatures'));
const OfflineFeatures = lazy(() => import('@/components/features/OfflineFeatures'));
const MobileFeatures = lazy(() => import('@/components/features/MobileFeatures'));

// مكون التحميل
const FeatureSkeleton = memo(() => (
  <div className="py-12">
    <div className="container mx-auto px-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 mx-auto animate-pulse"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

const FeaturesPage = memo(() => {
  useEffect(() => {
    document.title = 'المميزات | سطوكيها - منصة إدارة المتاجر الذكية';
  }, []);

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black">
      <Helmet>
        <title>المميزات | سطوكيها - منصة إدارة المتاجر الذكية</title>
        <meta name="description" content="اكتشف جميع مميزات منصة سطوكيها: نظام نقطة البيع، المتجر الإلكتروني، إدارة المخزون، التوصيل، وأكثر." />
        <meta name="keywords" content="مميزات سطوكيها، نقطة البيع، متجر إلكتروني، إدارة مخزون، توصيل، أتمتة" />
        <link rel="canonical" href={(typeof window !== 'undefined' ? (new URL(window.location.href)).origin : 'https://stockiha.com') + '/features'} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="المميزات | سطوكيها" />
        <meta property="og:description" content="استكشف قدرات سطوكيها لإدارة متجرك بكفاءة: POS، متجر إلكتروني، المخزون والمزيد." />
        <meta property="og:url" content={(typeof window !== 'undefined' ? (new URL(window.location.href)).origin : 'https://stockiha.com') + '/features'} />
        <meta property="og:image" content="/images/logo-new.webp" />
        <meta property="og:site_name" content="سطوكيها" />
        <meta property="og:locale" content="ar_DZ" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@stockiha" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Suspense fallback={<FeatureSkeleton />}>
          <FeaturesHero />
        </Suspense>

        {/* قسم التجارة الإلكترونية */}
        <motion.section {...fadeInUp} className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<FeatureSkeleton />}>
            <EcommerceFeatures />
          </Suspense>
        </motion.section>

        {/* قسم نقطة البيع */}
        <motion.section {...fadeInUp} className="py-20 bg-slate-50 dark:bg-slate-900">
          <Suspense fallback={<FeatureSkeleton />}>
            <POSFeatures />
          </Suspense>
        </motion.section>

        {/* قسم الخدمات */}
        <motion.section {...fadeInUp} className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<FeatureSkeleton />}>
            <ServiceFeatures />
          </Suspense>
        </motion.section>

        {/* قسم إدارة المؤسسة */}
        <motion.section {...fadeInUp} className="py-20 bg-slate-50 dark:bg-slate-900">
          <Suspense fallback={<FeatureSkeleton />}>
            <ManagementFeatures />
          </Suspense>
        </motion.section>

        {/* قسم التوصيل */}
        <motion.section {...fadeInUp} className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<FeatureSkeleton />}>
            <DeliveryFeatures />
          </Suspense>
        </motion.section>

        {/* قسم خدمة ما بعد البيع */}
        <motion.section {...fadeInUp} className="py-20 bg-slate-50 dark:bg-slate-900">
          <Suspense fallback={<FeatureSkeleton />}>
            <AfterSalesFeatures />
          </Suspense>
        </motion.section>

        {/* قسم التخصيص */}
        <motion.section {...fadeInUp} className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<FeatureSkeleton />}>
            <CustomizationFeatures />
          </Suspense>
        </motion.section>

        {/* قسم أوفلاين/أونلاين */}
        <motion.section {...fadeInUp} className="py-20 bg-slate-50 dark:bg-slate-900">
          <Suspense fallback={<FeatureSkeleton />}>
            <OfflineFeatures />
          </Suspense>
        </motion.section>

        {/* قسم تطبيق الجوال */}
        <motion.section {...fadeInUp} className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<FeatureSkeleton />}>
            <MobileFeatures />
          </Suspense>
        </motion.section>
      </main>
      
      <Footer />
    </div>
  );
});

FeaturesPage.displayName = 'FeaturesPage';

export default FeaturesPage;
