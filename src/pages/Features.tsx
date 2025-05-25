import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';

import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import FeaturesHero from '@/components/features/FeaturesHero';
import BusinessManagement from '@/components/features/BusinessManagement';
import OnlineStore from '@/components/features/OnlineStore';
import ServiceManagement from '@/components/features/ServiceManagement';
import OfflineFeatures from '@/components/features/OfflineFeatures';
import MarketplaceFeatures from '@/components/features/MarketplaceFeatures';
import FeatureComparison from '@/components/features/FeatureComparison';
import FeaturesCTA from '@/components/features/FeaturesCTA';

const Features = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>مميزات stockiha | مع سطوكيها... كلشي فبلاصتو!</title>
        <meta name="description" content="اكتشف المميزات الفريدة التي تجعل منصة بازار الخيار الأمثل لإدارة متجرك وتنمية تجارتك، من إدارة المخزون إلى متجرك الإلكتروني والعمل دون اتصال." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        <FeaturesHero />
        <BusinessManagement />
        <OnlineStore />
        <ServiceManagement />
        <MarketplaceFeatures />
        <OfflineFeatures />
        <FeatureComparison />
        <FeaturesCTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default Features; 