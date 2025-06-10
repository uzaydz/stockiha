import { useEffect, useState } from 'react';
// import { Navigate } from 'react-router-dom'; // Navigate غير مستخدمة حاليًا
import { getOrganizationByDomain, getOrganizationBySubdomain } from '@/lib/api/subdomain';
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';
import FastStorePage from '@/components/store/FastStorePage';
import LandingPage from '@/pages/landing/LandingPage';
// إزالة getFullStoreData واستيراد الخدمات الجديدة
// import { getFullStoreData } from '@/api/store'; 
import { getStoreDataFast, StoreInitializationData } from '@/api/storeDataService';

// قائمة النطاقات العامة التي تعرض صفحة الهبوط وليس متجر
const PUBLIC_DOMAINS = [
  'ktobi.online',
  'www.ktobi.online',
  'stockiha.com',
  'www.stockiha.com'
];

/**
 * مكون للتوجيه المباشر إلى صفحة المتجر عند استخدام سابدومين أو دومين مخصص
 */
const StoreRouter = () => {
  const [isStore, setIsStore] = useState<boolean | null>(null);
  // setOrganizationId غير مستخدمة بشكل مباشر لتحديد العرض، يمكن إزالتها إذا لم تكن هناك استخدامات أخرى مخطط لها
  // const [organizationId, setOrganizationId] = useState<string | null>(null); 
  const [isLoading, setIsLoading] = useState(true);
  // تحديث نوع storeData
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(null);

  useEffect(() => {
    const checkDomain = async () => {
      setIsLoading(true);
      const hostname = window.location.hostname;

      // التحقق من النطاقات المحلية
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        setIsStore(false);
        setIsLoading(false);
        return;
      }

      // التحقق من النطاقات العامة
      if (PUBLIC_DOMAINS.includes(hostname)) {
        setIsStore(false);
        setIsLoading(false);
        return;
      }
      
      const subdomain = extractSubdomainFromHostname(hostname);
      let orgDetails = null;
      let effectiveSubdomain: string | null = null;

      if (subdomain && subdomain !== 'www') {
        orgDetails = await getOrganizationBySubdomain(subdomain);
        if (orgDetails) {
          effectiveSubdomain = subdomain;
          localStorage.setItem('bazaar_organization_id', orgDetails.id);
          localStorage.setItem('bazaar_current_subdomain', subdomain);
        }
      }
      
      if (!orgDetails) { 
        orgDetails = await getOrganizationByDomain(hostname);
        if (orgDetails) {
          effectiveSubdomain = orgDetails.subdomain; 
          localStorage.setItem('bazaar_organization_id', orgDetails.id);
          localStorage.setItem('bazaar_current_subdomain', orgDetails.subdomain || '');
        }
      }

      if (orgDetails && effectiveSubdomain) {
        try {
          // استخدام getStoreDataFast
          const result = await getStoreDataFast(effectiveSubdomain);
          if (result.data && !result.data.error) {
            setStoreData(result.data);
            setIsStore(true);
          } else {
            // إذا كان هناك خطأ من getStoreDataFast أو لا توجد بيانات
            setStoreData(null); // تأكد من تعيينها إلى null في حالة الخطأ
            setIsStore(false); // يمكن أن تقرر هنا عرض صفحة خطأ مخصصة أو العودة إلى LandingPage
          }
        } catch (error) {
          setStoreData(null);
          setIsStore(false);
        }
      } else {
        setIsStore(false);
      }
      
      setIsLoading(false);
    };
    
    checkDomain();
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold">جاري التحميل...</h2>
        </div>
      </div>
    );
  }
  
  if (isStore === true && storeData) { // التأكد من وجود storeData أيضًا
    return <FastStorePage storeData={storeData} />;
  }
  
  return <LandingPage />;
};

export default StoreRouter;
