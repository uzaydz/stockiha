import { useEffect, Suspense, lazy, memo } from 'react';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/landing/Footer';
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import Navbar from '@/components/landing/Navbar';

// تحميل كسول محسن للمكونات غير الأساسية
const AllInOneSection = lazy(() => 
  import('@/components/landing/AllInOneSection').then(module => ({ default: module.default }))
);
const PricingSection = lazy(() => 
  import('@/components/landing/PricingSection').then(module => ({ default: module.default }))
);
const TestimonialsSection = lazy(() => 
  import('@/components/landing/TestimonialsSection').then(module => ({ default: module.default }))
);
const FAQSection = lazy(() => 
  import('@/components/landing/FAQSection').then(module => ({ default: module.default }))
);
const CTASection = lazy(() => 
  import('@/components/landing/CTASection').then(module => ({ default: module.default }))
);

// مكون تحميل محسن وبسيط
const SectionSkeleton = memo(() => (
  <div className="landing-section py-16">
    <div className="container mx-auto px-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-lg w-2/3 mx-auto"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/2 mx-auto"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

SectionSkeleton.displayName = 'SectionSkeleton';

const LandingPage = memo(() => {
  // ضبط عنوان الصفحة عند التحميل
  useEffect(() => {
    document.title = 'سطوكيها | منصة إدارة المتاجر الذكية';
    
    // تحسين الأداء - استخدام خط احتياطي لتجنب مشاكل CSP
    document.body.classList.add('font-arabic-fallback');
    
    // تنظيف الفئة عند إلغاء التحميل
    return () => {
      document.body.classList.remove('font-arabic-fallback');
    };
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background will-change-auto landing-page-optimized smooth-scroll">
      <Helmet>
        <title>سطوكيها | منصة إدارة المتاجر الذكية</title>
        <meta name="description" content="منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. ابدأ مجاناً اليوم!" />
        <meta name="keywords" content="إدارة متجر، نقطة بيع، متجر إلكتروني، POS، إدارة مخزون، سطوكيها" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1 will-change-auto">
        {/* المحتوى الأساسي - يحمل فوراً */}
        <HeroSection />
        <FeaturesSection />
        
        {/* المكونات الثانوية - تحميل كسول */}
        <Suspense fallback={<SectionSkeleton />}>
          <AllInOneSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <PricingSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <TestimonialsSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <FAQSection />
        </Suspense>
        
        <Suspense fallback={<SectionSkeleton />}>
          <CTASection />
        </Suspense>
      </main>
      
      <Footer />
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
