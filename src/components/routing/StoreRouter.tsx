import { useEffect, useState } from 'react';
// import { Navigate } from 'react-router-dom'; // Navigate غير مستخدمة حاليًا
import { getOrganizationByDomain, getOrganizationBySubdomain } from '@/lib/api/subdomain';
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';
import StorePage from '@/components/store/StorePage';
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
      console.log("[StoreRouter] Checking hostname:", hostname);

      // التحقق من النطاقات المحلية
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        console.log("[StoreRouter] Hostname is localhost, setting isStore to false.");
        setIsStore(false);
        setIsLoading(false);
        return;
      }

      // التحقق من النطاقات العامة
      if (PUBLIC_DOMAINS.includes(hostname)) {
        console.log("[StoreRouter] Hostname is a public domain, showing landing page.");
        setIsStore(false);
        setIsLoading(false);
        return;
      }
      
      const subdomain = extractSubdomainFromHostname(hostname);
      console.log("[StoreRouter] Extracted subdomain:", subdomain);
      let orgDetails = null;
      let effectiveSubdomain: string | null = null;

      if (subdomain && subdomain !== 'www') {
        console.log("[StoreRouter] Attempting getOrganizationBySubdomain for:", subdomain);
        orgDetails = await getOrganizationBySubdomain(subdomain);
        console.log("[StoreRouter] Result from getOrganizationBySubdomain:", orgDetails);
        if (orgDetails) {
          effectiveSubdomain = subdomain;
          localStorage.setItem('bazaar_organization_id', orgDetails.id);
          localStorage.setItem('bazaar_current_subdomain', subdomain);
          console.log("[StoreRouter] Found by subdomain. Effective subdomain:", effectiveSubdomain);
        }
      }
      
      if (!orgDetails) { 
        console.log("[StoreRouter] Not found by subdomain or no subdomain. Attempting getOrganizationByDomain for hostname:", hostname);
        orgDetails = await getOrganizationByDomain(hostname);
        console.log("[StoreRouter] Result from getOrganizationByDomain:", orgDetails);
        if (orgDetails) {
          effectiveSubdomain = orgDetails.subdomain; 
          localStorage.setItem('bazaar_organization_id', orgDetails.id);
          localStorage.setItem('bazaar_current_subdomain', orgDetails.subdomain || '');
          console.log("[StoreRouter] Found by domain. Effective subdomain:", effectiveSubdomain);
        }
      }
      
      console.log("[StoreRouter] Final check before getStoreDataFast. orgDetails:", orgDetails, "effectiveSubdomain:", effectiveSubdomain);

      if (orgDetails && effectiveSubdomain) {
        console.log("[StoreRouter] orgDetails and effectiveSubdomain ARE valid. Calling getStoreDataFast.");
        try {
          // استخدام getStoreDataFast
          const result = await getStoreDataFast(effectiveSubdomain);
          console.log("[StoreRouter] Result from getStoreDataFast:", JSON.stringify(result));
          if (result.data && !result.data.error) {
            console.log("[StoreRouter] Setting storeData with NEW structure. organization_details?.id:", result.data.organization_details?.id);
            setStoreData(result.data);
            setIsStore(true);
          } else {
            // إذا كان هناك خطأ من getStoreDataFast أو لا توجد بيانات
            console.error('StoreRouter: Error fetching store data or no data:', result.data?.error || 'No data returned');
            setStoreData(null); // تأكد من تعيينها إلى null في حالة الخطأ
            setIsStore(false); // يمكن أن تقرر هنا عرض صفحة خطأ مخصصة أو العودة إلى LandingPage
          }
        } catch (error) {
          console.error('StoreRouter: Exception while fetching store data:', error);
          setStoreData(null);
          setIsStore(false);
        }
      } else {
        console.log("[StoreRouter] orgDetails or effectiveSubdomain is NOT valid. Setting isStore to false.");
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
    return <StorePage storeData={storeData} />;
  }
  
  return <LandingPage />;
};

export default StoreRouter;
