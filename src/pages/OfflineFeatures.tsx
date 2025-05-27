import { Helmet } from 'react-helmet-async';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import OfflineHero from '@/components/offline/OfflineHero';
import LocalDatabase from '@/components/offline/LocalDatabase';
import OfflineSalesSystem from '@/components/offline/OfflineSalesSystem';
import OfflineFAQ from '@/components/offline/OfflineFAQ';
import OfflineCTA from '@/components/offline/OfflineCTA';

const OfflineFeatures = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>العمل دون اتصال بالإنترنت | بازار - إدارة متجرك حتى بدون إنترنت</title>
        <meta name="description" content="اكتشف كيف يمكنك إدارة متجرك ومبيعاتك والمخزون بشكل كامل حتى عندما لا يكون هناك اتصال بالإنترنت مع منصة بازار المتكاملة." />
      </Helmet>

      <Navbar />
      
      <main className="flex-1 pt-16">
        <OfflineHero />
        <LocalDatabase />
        <OfflineSalesSystem />
        <OfflineFAQ />
        <OfflineCTA />
      </main>
      
      <Footer />
    </div>
  );
};

export default OfflineFeatures;
