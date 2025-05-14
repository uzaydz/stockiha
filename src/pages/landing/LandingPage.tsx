import { useEffect, useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import Footer from '@/components/landing/Footer';
import { useAuth } from '@/context/AuthContext';
import { getFullStoreData, StoreData, getProductCategories, Category } from '@/api/store';
import StorePage from '@/components/store/StorePage';
import { useTenant } from '@/context/TenantContext';
import { Wifi, WifiOff } from 'lucide-react';
import { getSupabaseClient } from '@/lib/supabase';

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
  const { currentSubdomain } = useAuth();
  const { currentOrganization } = useTenant();
  const [storeData, setStoreData] = useState<StoreData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchParams] = useSearchParams();
  const [showStore, setShowStore] = useState<boolean | null>(null);
  const dataFetchedRef = useRef(false);
  
  console.log('LandingPage: النطاق الحالي =', window.location.hostname);
  
  // تحديد ما إذا كان يجب عرض المتجر أو صفحة الهبوط
  useEffect(() => {
    if (showStore === null) {
      const hostname = window.location.hostname;
      
      // التحقق من النطاق المخصص
      const checkCustomDomain = async () => {
        try {
          const supabase = getSupabaseClient();
          const { data: orgData } = await supabase
            .from('organizations')
            .select('id, domain, subdomain')
            .eq('domain', hostname)
            .single();
          
          if (orgData) {
            console.log('تم العثور على نطاق مخصص:', hostname);
            // تحديث التخزين المحلي مباشرة
            localStorage.setItem('bazaar_organization_id', orgData.id);
            localStorage.setItem('bazaar_current_subdomain', orgData.subdomain);
            
            // بدء تحميل بيانات المتجر فورًا
            if (!dataFetchedRef.current) {
              fetchStoreDataForSubdomain(orgData.subdomain);
            }
            
            setShowStore(true);
            return;
          }
        } catch (error) {
          console.error('خطأ في التحقق من النطاق المخصص:', error);
        }
      };
      
      // التحقق من النطاق المخصص أولاً - للنطاقات المخصصة، نتخطى باقي الفحوصات
      if (!hostname.includes('localhost')) {
        checkCustomDomain();
        return; // انتظار نتيجة الفحص
      }
      
      // التحقق من النطاق الفرعي
      if (currentSubdomain) {
        setShowStore(true);
        return;
      }
      
      // التحقق من النطاق الفرعي في localhost
      if (hostname.includes('.localhost')) {
        const parts = hostname.split('.');
        if (parts.length > 1 && parts[0] !== 'www' && parts[0] !== 'localhost') {
          console.log('اكتشاف يدوي للسابدومين على localhost:', parts[0]);
          setShowStore(true);
          return;
        }
      }
      
      // إذا وصلنا إلى هنا، نعرض صفحة الهبوط
      setShowStore(false);
    }
  }, [currentSubdomain, showStore]);

  // حل مشكلة اكتشاف السابدومين على localhost
  useEffect(() => {
    // التحقق من السابدومين يدويًا على localhost
    const hostname = window.location.hostname;
    if (!currentSubdomain && hostname.includes('.localhost')) {
      const parts = hostname.split('.');
      if (parts.length > 1) {
        console.log('اكتشاف يدوي للسابدومين على localhost:', parts[0]);
        // قد نحتاج إلى معالجة خاصة هنا لعرض صفحة المتجر
        // يمكن استخدام تحديث الصفحة لجعل TenantContext يلتقط السابدومين بشكل صحيح
        if (!localStorage.getItem('attempted_subdomain_fix')) {
          localStorage.setItem('attempted_subdomain_fix', 'true');
          // تحديث الصفحة مرة واحدة فقط لتجنب الحلقات اللانهائية
          setTimeout(() => {
            window.location.reload();
          }, 200);
        }
      }
    }
  }, [currentSubdomain]);

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

  // دالة مساعدة لتحميل بيانات المتجر لنطاق فرعي محدد
  const fetchStoreDataForSubdomain = async (subdomain: string) => {
    if (!subdomain) return;
    
    dataFetchedRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('تحميل بيانات المتجر للنطاق الفرعي:', subdomain);
      const data = await getFullStoreData(subdomain);
      
      if (data) {
        setStoreData(data);
      } else {
        console.error('لم يتم العثور على بيانات للنطاق الفرعي:', subdomain);
        setError('لم نتمكن من العثور على متجر بهذا الاسم');
      }
    } catch (err) {
      console.error('خطأ في تحميل بيانات المتجر:', err);
      setError('حدث خطأ أثناء تحميل بيانات المتجر');
    } finally {
      setIsLoading(false);
    }
  };

  // الدالة الأصلية لتحميل بيانات المتجر
  const fetchStoreData = async () => {
    if (!currentSubdomain) return;
    
    // منع تحميل البيانات مرتين
    if (isLoading || dataFetchedRef.current) return;
    
    fetchStoreDataForSubdomain(currentSubdomain);
  };

  // جلب فئات المنتجات من قاعدة البيانات
  const fetchCategories = async () => {
    if (!currentOrganization?.id) return;

    try {
      const categoriesData = await getProductCategories(currentOrganization.id);
      if (categoriesData && categoriesData.length > 0) {
        setCategories(categoriesData);
      }
    } catch (err) {
      console.error('Error fetching product categories:', err);
    }
  };

  // Fetch store data only once when showStore is true and we have a subdomain
  useEffect(() => {
    if (showStore && currentSubdomain && !dataFetchedRef.current) {
      fetchStoreData();
    }
  }, [showStore, currentSubdomain]);

  useEffect(() => {
    // Add a short debounce to avoid too frequent calls
    const fetchTimeout = setTimeout(() => {
      if (currentOrganization?.id) {
        fetchCategories();
      }
    }, 300);
    
    return () => clearTimeout(fetchTimeout);
  }, [currentOrganization?.id]);

  // ضبط عنوان الصفحة عند التحميل
  useEffect(() => {
    document.title = currentSubdomain 
      ? `${currentSubdomain} - منصة التجارة الذكية` 
      : 'بازار | منصة واحدة ذكية لإدارة وتنمية تجارتك';
  }, [currentSubdomain]);
  
  // Use the stable showStore state instead of calculating it on every render
  if (showStore) {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold">جاري تحميل المتجر...</h2>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center max-w-md mx-auto p-6 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">عذراً!</h2>
            <p className="text-lg text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      );
    }

    // Once we've decided to show the store page, keep showing it with the most recent data
    return <StorePage storeData={storeData || undefined} />;
  }

  // Only render the landing page if showStore is explicitly false
  if (showStore === false) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Helmet>
          <title>بازار | منصة واحدة ذكية لإدارة وتنمية تجارتك</title>
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
  }
  
  // Return a loading state while determining whether to show store or landing page
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-2xl font-bold">جاري التحميل...</h2>
      </div>
    </div>
  );
};

export default LandingPage;
