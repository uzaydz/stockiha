import { Suspense, lazy, memo, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';

// تحميل كسول للمكونات
const ContactHero = lazy(() => import('@/components/contact/ContactHero'));
const ContactForm = lazy(() => import('@/components/contact/ContactForm'));
const ContactInfo = lazy(() => import('@/components/contact/ContactInfo'));
const ContactMap = lazy(() => import('@/components/contact/ContactMap'));
const ContactFAQ = lazy(() => import('@/components/contact/ContactFAQ'));

// مكون التحميل
const ContactSkeleton = memo(() => (
  <div className="py-12">
    <div className="container mx-auto px-6">
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 mx-auto animate-pulse"></div>
        <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mx-auto animate-pulse"></div>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 bg-slate-200 dark:bg-slate-700 rounded-xl animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  </div>
));

const ContactPage = memo(() => {
  useEffect(() => {
    document.title = 'تواصل معنا | سطوكيها - منصة إدارة المتاجر الذكية';
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-black">
      <Helmet>
        <title>تواصل معنا | سطوكيها - منصة إدارة المتاجر الذكية</title>
        <meta name="description" content="تواصل مع فريق سطوكيها للحصول على الدعم والمساعدة. نحن هنا لخدمتك على مدار الساعة." />
        <meta name="keywords" content="تواصل معنا، دعم سطوكيها، خدمة العملاء، الدعم الفني" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section */}
        <Suspense fallback={<ContactSkeleton />}>
          <ContactHero />
        </Suspense>

        {/* Contact Form & Info Section */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Form */}
              <Suspense fallback={<ContactSkeleton />}>
                <ContactForm />
              </Suspense>

              {/* Contact Info */}
              <Suspense fallback={<ContactSkeleton />}>
                <ContactInfo />
              </Suspense>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-20 bg-slate-50 dark:bg-slate-900">
          <Suspense fallback={<ContactSkeleton />}>
            <ContactMap />
          </Suspense>
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-white dark:bg-slate-950">
          <Suspense fallback={<ContactSkeleton />}>
            <ContactFAQ />
          </Suspense>
        </section>
      </main>
      
      <Footer />
    </div>
  );
});

ContactPage.displayName = 'ContactPage';

export default ContactPage;
