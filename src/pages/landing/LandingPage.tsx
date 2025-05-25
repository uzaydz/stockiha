import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/landing/Footer';

// Nuevos componentes de la página de aterrizaje
import HeroSection from '@/components/landing/HeroSection';
import FeaturesSection from '@/components/landing/FeaturesSection';
import AllInOneSection from '@/components/landing/AllInOneSection';
import MarketplaceSection from '@/components/landing/MarketplaceSection';
import PricingSection from '@/components/landing/PricingSection';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import LaunchOfferSection from '@/components/landing/LaunchOfferSection';
import FAQSection from '@/components/landing/FAQSection';
import CTASection from '@/components/landing/CTASection';
import Navbar from '@/components/landing/Navbar';

const LandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  // تتبع التمرير لتغيير مظهر شريط التنقل
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // ضبط عنوان الصفحة عند التحميل
  useEffect(() => {
    document.title = 'stockiha | مع سطوكيها... كلشي فبلاصتو!';
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>stockiha | مع سطوكيها... كلشي فبلاصتو!</title>
        <meta name="description" content="منصة واحدة ذكية تمكن التاجر من إدارة محله بالكامل، تقديم الخدمات باحترافية، متجر إلكتروني تلقائي، سوق إلكتروني عام، ونظام يعمل حتى بدون إنترنت." />
        <meta name="keywords" content="إدارة متجر، بازار، متجر إلكتروني، سوق إلكتروني، تاجر، نقطة بيع، POS، إدارة مخزون، إدارة خدمات، متاجر" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1 pt-16">
        <HeroSection />
        <FeaturesSection />
        <AllInOneSection />
        <MarketplaceSection />
        <PricingSection />
        <LaunchOfferSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      
      <Footer />
    </div>
  );
};

export default LandingPage;
