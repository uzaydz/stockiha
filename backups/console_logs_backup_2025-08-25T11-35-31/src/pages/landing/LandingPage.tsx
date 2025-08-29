import { useEffect, Suspense, lazy, memo } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/landing/Footer';
import SimpleHeroSection from '@/components/landing/SimpleHeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import Navbar from '@/components/landing/Navbar';
import '@/styles/landing-background.css';

// تحميل كسول محسن للمكونات غير الأساسية
const AllInOneSection = lazy(() => 
  import('@/components/landing/AllInOneSection').then(module => ({ default: module.default }))
);
const TestimonialsSection = lazy(() => 
  import('@/components/landing/TestimonialsSection').then(module => ({ default: module.default }))
);
const CoursesSection = lazy(() => 
  import('@/components/landing/CoursesSection').then(module => ({ default: module.default }))
);
const CTASection = lazy(() => 
  import('@/components/landing/CTASection').then(module => ({ default: module.default }))
);

// مكون تحميل محسن وبسيط - Tailwind CSS فقط
const SectionSkeleton = memo(() => (
  <div className="relative py-16 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
    <div className="container mx-auto px-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-lg w-2/3 mx-auto animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mx-auto animate-pulse"></div>
        <div className="grid gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
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
  }, []);

  return (
    <div className="relative flex flex-col min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 font-[Tajawal] antialiased scroll-smooth transform-gpu">
      {/* خلفية مطابقة لـ SimpleHeroSection */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {/* تأثيرات خلفية متدرجة ومتحركة */}
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-20 left-1/4 w-96 h-96 bg-gradient-to-r from-[#fc5d41]/10 via-purple-500/10 to-blue-500/10 rounded-full blur-3xl"
        />

        <motion.div
          animate={{
            scale: [1.1, 1, 1.1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-20 right-1/4 w-80 h-80 bg-gradient-to-l from-[#fc5d41]/8 via-teal-500/8 to-indigo-500/8 rounded-full blur-3xl"
        />

        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-br from-[#fc5d41]/6 to-purple-500/6 rounded-full blur-2xl"
        />

        {/* شبكة هندسية متطورة */}
        <div className="absolute inset-0 opacity-30">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(circle at 25% 25%, rgba(252,93,65,0.1) 0%, transparent 50%),
                radial-gradient(circle at 75% 75%, rgba(147,51,234,0.08) 0%, transparent 50%),
                linear-gradient(135deg, transparent 0%, rgba(252,93,65,0.05) 50%, transparent 100%)
              `
            }}
          />
        </div>

        {/* خطوط هندسية ديناميكية */}
        <div className="absolute inset-0">
          <motion.div
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 6, repeat: Infinity }}
            className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#fc5d41]/30 to-transparent"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.25, 0.1] }}
            transition={{ duration: 8, repeat: Infinity, delay: 1 }}
            className="absolute bottom-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-purple-500/25 to-transparent"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 10, repeat: Infinity, delay: 2 }}
            className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-[#fc5d41]/20 to-transparent"
          />
          <motion.div
            animate={{ opacity: [0.1, 0.2, 0.1] }}
            transition={{ duration: 7, repeat: Infinity, delay: 3 }}
            className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-blue-500/20 to-transparent"
          />
        </div>

        {/* نقاط زخرفية متحركة */}
        <motion.div
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-24 right-24 w-3 h-3 bg-[#fc5d41]/50 rounded-full"
        />

        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1
          }}
          className="absolute top-48 left-32 w-2 h-2 bg-purple-500/50 rounded-full"
        />

        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
          className="absolute bottom-32 right-1/3 w-2.5 h-2.5 bg-blue-500/40 rounded-full"
        />

        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 3
          }}
          className="absolute bottom-24 left-24 w-2 h-2 bg-teal-500/40 rounded-full"
        />

        {/* أشكال هندسية إضافية */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-16 left-16 w-12 h-12 border border-[#fc5d41]/20 rounded-lg"
        />

        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-16 right-16 w-8 h-8 border border-purple-500/20 rounded-full"
        />
      </div>
      
      <Helmet>
        <title>سطوكيها | منصة إدارة المتاجر الذكية</title>
        <meta name="description" content="منصة شاملة لإدارة المتاجر تجمع بين نقطة البيع والمتجر الإلكتروني وإدارة المخزون. ابدأ مجاناً اليوم!" />
        <meta name="keywords" content="إدارة متجر، نقطة بيع، متجر إلكتروني، POS، إدارة مخزون، سطوكيها" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
      </Helmet>
      
      <div className="landing-section-content">
        <Navbar />
        
        <main className="flex-1 transform-gpu">
          {/* المحتوى الأساسي - يحمل فوراً */}
          <SimpleHeroSection />
          <FeaturesSection />
          
          {/* المكونات الثانوية - تحميل كسول */}
          <Suspense fallback={<SectionSkeleton />}>
            <AllInOneSection />
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton />}>
            <TestimonialsSection />
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton />}>
            <CoursesSection />
          </Suspense>
          
          <Suspense fallback={<SectionSkeleton />}>
            <CTASection />
          </Suspense>
        </main>
        
        <Footer />
      </div>
    </div>
  );
});

LandingPage.displayName = 'LandingPage';

export default LandingPage;
