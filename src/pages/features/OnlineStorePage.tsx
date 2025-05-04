import { useEffect } from 'react';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import StoreHero from '@/components/features/store/StoreHero';
import AutomatedStore from '@/components/features/store/AutomatedStore';
import ProductPages from '@/components/features/store/ProductPages';
import InventorySync from '@/components/features/store/InventorySync';
import OrderManagement from '@/components/features/store/OrderManagement';
import DeliveryIntegration from '@/components/features/store/DeliveryIntegration';
import EasyUse from '@/components/features/store/EasyUse';
import FeaturesCTA from '@/components/features/FeaturesCTA';
import { Helmet } from 'react-helmet-async';

export default function OnlineStorePage() {
  // مسح عدادات اكتشاف التكرار عند تحميل الصفحة
  useEffect(() => {
    // مسح عدادات إعادة التوجيه للمساعدة في منع حلقات إعادة التوجيه
    sessionStorage.removeItem('lastLoginRedirect');
    sessionStorage.setItem('loginRedirectCount', '0');
    
    // تأكد من أن الصفحة الحالية لن يتم استخدامها كهدف لإعادة التوجيه بعد تسجيل الدخول
    sessionStorage.removeItem('redirectAfterLogin');
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Helmet>
        <title>مميزات المتجر الإلكتروني | بازار</title>
        <meta name="description" content="اكتشف مميزات المتجر الإلكتروني المتكامل من بازار - إنشاء تلقائي، تخصيص كامل، صفحات هبوط للمنتجات، إدارة المخزون والطلبيات وتكامل مع شركات التوصيل" />
      </Helmet>
      
      <Navbar />
      
      <main className="flex-1 pt-16">
        <StoreHero />
        <AutomatedStore />
        <ProductPages />
        <InventorySync />
        <OrderManagement />
        <DeliveryIntegration />
        <EasyUse />
        <FeaturesCTA />
      </main>
      
      <Footer />
    </div>
  );
} 