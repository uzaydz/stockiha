import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import CustomizableStoreFooter from '@/components/store/CustomizableStoreFooter';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';
import performanceTracking from '@/lib/performance-tracking';
import { useLocation } from 'react-router-dom';

interface StoreLayoutProps {
  children: React.ReactNode;
}

const StoreLayout: React.FC<StoreLayoutProps> = ({ children }) => {
  const { currentOrganization } = useTenant();
  const { currentSubdomain } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [footerSettings, setFooterSettings] = useState<any>(null);
  const location = useLocation();
  
  // جلب فئات المنتجات من قاعدة البيانات
  useEffect(() => {
    const fetchCategories = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: categoriesData, error } = await supabase
          .from('product_categories')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (!error && categoriesData) {
          setCategories(categoriesData);
        }
      } catch (error) {
        console.error('خطأ في جلب الفئات:', error);
      }
    };

    const fetchFooterSettings = async () => {
      if (!currentOrganization?.id) return;
      
      try {
        const supabase = getSupabaseClient();
        const { data: storeSettings, error } = await supabase
          .from('store_settings')
          .select('settings')
          .eq('organization_id', currentOrganization.id)
          .eq('component_type', 'footer')
          .eq('is_active', true)
          .maybeSingle();

        if (!error && storeSettings?.settings) {
          setFooterSettings(storeSettings.settings);
        }
      } catch (error) {
        console.error('خطأ في جلب إعدادات الفوتر:', error);
      }
    };

    fetchCategories();
    fetchFooterSettings();
  }, [currentOrganization?.id]);

  // إعدادات افتراضية للفوتر
  const defaultFooterSettings = {
    storeName: currentOrganization?.name || 'متجر stockiha',
    logoUrl: currentOrganization?.logo_url,
    description: currentOrganization?.description || 'مع سطوكيها... كلشي فبلاصتو!',
    showSocialLinks: true,
    showContactInfo: true,
    showFeatures: true,
    showNewsletter: true,
    showPaymentMethods: true,
    socialLinks: [
      { platform: 'facebook' as const, url: 'https://facebook.com/stockiha' },
      { platform: 'instagram' as const, url: 'https://instagram.com/stockiha' }
    ],
    contactInfo: {
      phone: '0540240886',
      email: 'info@stockiha.com',
      address: 'خنشلة حي النصر، الجزائر'
    },
    footerSections: [
      {
        id: '1',
        title: 'روابط سريعة',
        links: [
          { id: '1-1', text: 'الصفحة الرئيسية', url: '/', isExternal: false },
          { id: '1-2', text: 'المنتجات', url: '/products', isExternal: false },
          { id: '1-3', text: 'اتصل بنا', url: '/contact', isExternal: false }
        ]
      },
      {
        id: '2',
        title: 'خدمة العملاء',
        links: [
          { id: '2-1', text: 'مركز المساعدة', url: '/help', isExternal: false },
          { id: '2-2', text: 'سياسة الشحن', url: '/shipping-policy', isExternal: false },
          { id: '2-3', text: 'الأسئلة الشائعة', url: '/faq', isExternal: false }
        ]
      }
    ],
    features: [
      {
        id: '1',
        icon: 'Truck',
        title: 'شحن سريع',
        description: 'توصيل مجاني للطلبات +5000 د.ج'
      },
      {
        id: '2',
        icon: 'CreditCard',
        title: 'دفع آمن',
        description: 'طرق دفع متعددة 100% آمنة'
      },
      {
        id: '3',
        icon: 'Heart',
        title: 'ضمان الجودة',
        description: 'منتجات عالية الجودة معتمدة'
      },
      {
        id: '4',
        icon: 'ShieldCheck',
        title: 'دعم 24/7',
        description: 'مساعدة متوفرة طول اليوم'
      }
    ],
    newsletterSettings: {
      enabled: true,
      title: 'النشرة البريدية',
      description: 'اشترك في نشرتنا البريدية للحصول على آخر العروض والتحديثات.',
      placeholder: 'البريد الإلكتروني',
      buttonText: 'اشتراك'
    },
    paymentMethods: ['visa', 'mastercard', 'paypal'],
    legalLinks: [
      { id: 'legal-1', text: 'شروط الاستخدام', url: '/terms', isExternal: false },
      { id: 'legal-2', text: 'سياسة الخصوصية', url: '/privacy', isExternal: false }
    ]
  };

  // دمج الإعدادات المخصصة مع الافتراضية
  const finalFooterSettings = footerSettings ? { ...defaultFooterSettings, ...footerSettings } : defaultFooterSettings;

  // تتبع أداء الصفحة
  useEffect(() => {
    // تسجيل وقت تحميل الصفحة عند اكتمال التحميل
    const trackPagePerformance = () => {
      performanceTracking.trackPageLoad(
        location.pathname,
        currentOrganization?.id,
        window.location.hostname.split('.')[0]
      );
    };
    
    // Track on initial load
    window.addEventListener('load', trackPagePerformance);
    
    // Track on component mount if the page is already loaded
    if (document.readyState === 'complete') {
      trackPagePerformance();
    }
    
    return () => {
      window.removeEventListener('load', trackPagePerformance);
    };
  }, [location.pathname, currentOrganization?.id]);

  return (
    <div className="flex flex-col min-h-screen">
      {/* استخدام مكون Navbar المستخدم في باقي صفحات المتجر */}
      <Navbar categories={categories} />
      
      {/* محتوى الصفحة مع إضافة المساحة المناسبة للنافبار الثابت */}
      <main className="flex-1 pt-16">
        {children}
      </main>
      
      {/* تذييل الصفحة الجديد */}
      <CustomizableStoreFooter 
        {...finalFooterSettings}
      />
    </div>
  );
};

export default StoreLayout; 