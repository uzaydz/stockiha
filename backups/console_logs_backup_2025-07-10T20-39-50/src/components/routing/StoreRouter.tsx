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

// دالة للتحقق من localhost (مع أو بدون منفذ)
const isLocalhostDomain = (hostname: string) => {
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname.startsWith('localhost:') ||
         hostname.startsWith('127.0.0.1:');
};

// دالة للتحقق من localhost بدون subdomain
const isPlainLocalhost = (hostname: string) => {
  return hostname === 'localhost' || 
         hostname === '127.0.0.1' || 
         hostname === 'localhost:8080' ||
         hostname === '127.0.0.1:8080';
};

/**
 * مكون للتوجيه المباشر إلى صفحة المتجر عند استخدام سابدومين أو دومين مخصص
 */
const StoreRouter = () => {
  const [isStore, setIsStore] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(null);
  const [hasSubdomain, setHasSubdomain] = useState(false);
  
  // التحقق الفوري من النطاق الفرعي
  const hostname = window.location.hostname;
  const subdomain = extractSubdomainFromHostname(hostname);
  const isSubdomainStore = Boolean(subdomain && subdomain !== 'www');

  // تغيير عنوان الصفحة فوراً إذا كان هناك نطاق فرعي
  if (isSubdomainStore && subdomain) {
    document.title = `متجر ${subdomain} - جاري التحميل...`;
  }

  useEffect(() => {
    const checkDomain = async () => {

      // التحقق من النطاقات المحلية الخالصة (بدون subdomain)
      if (isPlainLocalhost(hostname)) {
        setIsStore(false);
        setIsLoading(false);
        return;
      }

      // إذا كان هناك نطاق فرعي، نفترض أنه متجر ونبدأ التحميل فوراً
      // (حتى لو كان في localhost مع subdomain)
      if (isSubdomainStore && subdomain) {
        setHasSubdomain(true);
        
        try {
          // تحميل متوازي للمؤسسة وبيانات المتجر
          const [orgDetails, storeResult] = await Promise.all([
            getOrganizationBySubdomain(subdomain),
            getStoreDataFast(subdomain)
          ]);
          
          if (orgDetails && storeResult.data && !storeResult.data.error) {
            
            localStorage.setItem('bazaar_organization_id', orgDetails.id);
            localStorage.setItem('bazaar_current_subdomain', subdomain);
            
            // تحديث عنوان الصفحة
            document.title = `${orgDetails.name} - متجر إلكتروني`;
            
            setStoreData(storeResult.data);
            setIsStore(true);
            setIsLoading(false);
            return;
          } else {
          }
        } catch (error) {
        }
      }

      // النطاقات العامة - عرض صفحة الهبوط مباشرة
      if (PUBLIC_DOMAINS.includes(hostname)) {
        setIsStore(false);
        setIsLoading(false);
        return;
      }

      // التحقق من النطاق المخصص (للنطاقات التي ليس لها نطاق فرعي)
      if (!isSubdomainStore) {
        
        try {
          const orgDetails = await getOrganizationByDomain(hostname);
          
          if (orgDetails && orgDetails.subdomain) {
            
            localStorage.setItem('bazaar_organization_id', orgDetails.id);
            localStorage.setItem('bazaar_current_subdomain', orgDetails.subdomain);
            
            const result = await getStoreDataFast(orgDetails.subdomain);
            
            if (result.data && !result.data.error) {
              setStoreData(result.data);
              setIsStore(true);
              setIsLoading(false);
              return;
            }
          }
        } catch (error) {
        }
      }
      
      // إذا لم نجد أي متجر، عرض صفحة الهبوط
      setIsStore(false);
      setIsLoading(false);
    };
    
    checkDomain();
  }, []);
  
  // لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي حتى لو كان isLoading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800">
            {isSubdomainStore ? `جاري تحميل متجر ${subdomain}...` : 'جاري التحميل...'}
          </h2>
          {isSubdomainStore && (
            <p className="text-gray-600 mt-2">يرجى الانتظار، نحضر لك المتجر...</p>
          )}
          {!isSubdomainStore && (
            <p className="text-gray-600 mt-2">فحص النطاق...</p>
          )}
        </div>
      </div>
    );
  }
  
  if (isStore === true && storeData) { // التأكد من وجود storeData أيضًا
    return <StorePage />;
  }
  
  // لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي وما زلنا نحمل
  if (isSubdomainStore && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-gray-800">
            جاري تحميل متجر {subdomain}...
          </h2>
          <p className="text-gray-600 mt-2">يرجى الانتظار، نحضر لك المتجر...</p>
        </div>
      </div>
    );
  }
  
  // إذا كان هناك نطاق فرعي لكن فشل التحميل، نعرض رسالة خطأ بدلاً من صفحة الهبوط
  if (isSubdomainStore && isStore === false) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">متجر غير موجود</h2>
          <p className="text-gray-600 mb-4">
            عذراً، لم نتمكن من العثور على متجر بالاسم "{subdomain}"
          </p>
          <p className="text-sm text-gray-500">
            تأكد من صحة الرابط أو تواصل مع صاحب المتجر
          </p>
        </div>
      </div>
    );
  }
  
  return <LandingPage />;
};

export default StoreRouter;
