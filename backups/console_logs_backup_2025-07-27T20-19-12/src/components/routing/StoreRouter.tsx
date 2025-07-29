import React, { useState, useEffect } from 'react';
// import { Navigate } from 'react-router-dom'; // Navigate غير مستخدمة حاليًا
import { getOrganizationByDomain, getOrganizationBySubdomain } from '@/lib/api/subdomain';
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';
import StorePage from '@/components/store/StorePage';
import LandingPage from '@/pages/landing/LandingPage';
// إزالة getFullStoreData واستيراد الخدمات الجديدة
// import { getFullStoreData } from '@/api/store'; 
import { getStoreDataFast, StoreInitializationData } from '@/api/storeDataService';
import { useGlobalLoading } from '@/components/store/GlobalLoadingManager';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

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

// دالة محسنة للتحقق من localhost الخالص (بدون subdomain)
const isPlainLocalhost = (hostname: string) => {
  const cleanHostname = hostname.split(':')[0]; // إزالة رقم المنفذ
  return cleanHostname === 'localhost' || cleanHostname === '127.0.0.1';
};

// دالة لإعادة المحاولة مع تأخير متدرج
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // تأخير متدرج
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('فشل في جميع المحاولات');
}

/**
 * مكون للتوجيه المباشر إلى صفحة المتجر عند استخدام سابدومين أو دومين مخصص
 */
const StoreRouter = () => {
  // استخدام Hook لضمان تحديث العنوان والأيقونة
  useDynamicTitle();
  
  const [isStore, setIsStore] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeData, setStoreData] = useState<Partial<StoreInitializationData> | null>(null);
  const [hasSubdomain, setHasSubdomain] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase } = useGlobalLoading();
  
  // التحقق الفوري من النطاق الفرعي
  const hostname = window.location.hostname;
  const subdomain = extractSubdomainFromHostname(hostname);
  const isSubdomainStore = Boolean(subdomain && subdomain !== 'www');

  // إدارة مؤشر التحميل
  useEffect(() => {
    if (isLoading) {
      if (isSubdomainStore) {
        // إظهار مؤشر تحميل للمتجر
        showLoader({
          storeName: `متجر ${subdomain}`,
          progress: 20,
          message: `جاري تحميل متجر ${subdomain}...`,
          primaryColor: '#fc5a3e'
        });
        setPhase('store');
      } else {
        // إظهار مؤشر تحميل للنظام
        showLoader({
          storeName: 'النظام',
          progress: 10,
          message: 'فحص النطاق...',
          primaryColor: '#fc5a3e'
        });
        setPhase('system');
      }
    } else {
      hideLoader();
    }
  }, [isLoading, isSubdomainStore, subdomain, showLoader, hideLoader, setPhase]);

  // دالة محسنة لجلب بيانات المتجر مع إعادة المحاولة
  const fetchStoreDataWithRetry = async (subdomainToUse: string) => {
    try {
      
      const result = await retryWithBackoff(
        () => getStoreDataFast(subdomainToUse),
        3, // 3 محاولات
        1000 // بداية بثانية واحدة
      );
      
      if (result.data && !result.data.error) {
        return result.data;
      } else {
        const errorMsg = result.data?.error || 'لم يتم العثور على بيانات المتجر';
        throw new Error(errorMsg);
      }
    } catch (error) {
      throw error;
    }
  };

  // دالة محسنة لجلب بيانات المؤسسة مع إعادة المحاولة
  const fetchOrganizationWithRetry = async (identifier: string, bySubdomain: boolean = true) => {
    try {
      
      const result = await retryWithBackoff(
        () => bySubdomain 
          ? getOrganizationBySubdomain(identifier)
          : getOrganizationByDomain(identifier),
        3,
        1000
      );
      
      if (result) {
        return result;
      } else {
        throw new Error(`لم يتم العثور على مؤسسة للمعرف: ${identifier}`);
      }
    } catch (error) {
      throw error;
    }
  };

  // دالة إعادة المحاولة اليدوية
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsLoading(true);
    setIsStore(null);
    setStoreData(null);
  };

  useEffect(() => {
    const checkDomain = async () => {
      try {

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
            // تحميل متوازي للمؤسسة وبيانات المتجر مع إعادة المحاولة
            const [orgDetails, storeResult] = await Promise.all([
              fetchOrganizationWithRetry(subdomain, true),
              fetchStoreDataWithRetry(subdomain)
            ]);
            
            if (orgDetails && storeResult) {
              
              localStorage.setItem('bazaar_organization_id', orgDetails.id);
              localStorage.setItem('bazaar_current_subdomain', subdomain);
              
              // تحديث عنوان الصفحة
              document.title = `${orgDetails.name} - متجر إلكتروني`;
              
              setStoreData(storeResult);
              setIsStore(true);
              setIsLoading(false);
              return;
            }
          } catch (error) {
            setError(`خطأ في تحميل المتجر: ${(error as Error).message}`);
            setIsLoading(false);
            return;
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
            const orgDetails = await fetchOrganizationWithRetry(hostname, false);
            
            if (orgDetails && orgDetails.subdomain) {
              
              localStorage.setItem('bazaar_organization_id', orgDetails.id);
              localStorage.setItem('bazaar_current_subdomain', orgDetails.subdomain);
              
              const result = await fetchStoreDataWithRetry(orgDetails.subdomain);
              
              if (result) {
                setStoreData(result);
                setIsStore(true);
                setIsLoading(false);
                return;
              }
            } else {
              // إذا لم نجد في النطاق المخصص، ربما يكون النطاق نفسه هو subdomain
              // مثل asraycollection.com حيث asraycollection هو subdomain
              
              // استخراج اسم النطاق الأول (قبل النقطة الأولى)
              const potentialSubdomain = hostname.split('.')[0];
              
              if (potentialSubdomain && potentialSubdomain !== 'www') {
                
                try {
                  const [orgDetails, storeResult] = await Promise.all([
                    fetchOrganizationWithRetry(potentialSubdomain, true),
                    fetchStoreDataWithRetry(potentialSubdomain)
                  ]);
                  
                  if (orgDetails && storeResult) {
                    
                    localStorage.setItem('bazaar_organization_id', orgDetails.id);
                    localStorage.setItem('bazaar_current_subdomain', potentialSubdomain);
                    
                    // تحديث عنوان الصفحة
                    document.title = `${orgDetails.name} - متجر إلكتروني`;
                    
                    setStoreData(storeResult);
                    setIsStore(true);
                    setIsLoading(false);
                    return;
                  }
                } catch (subdomainError) {
                }
              }
            }
          } catch (error) {
            // لا نعرض خطأ هنا، نحاول عرض صفحة الهبوط كبديل
          }
        }
        
        // إذا لم نجد أي متجر، عرض صفحة الهبوط
        setIsStore(false);
        setIsLoading(false);

      } catch (error) {
        setError(`خطأ في تحميل المتجر: ${(error as Error).message}`);
        setIsLoading(false);
      }
    };
    
    checkDomain();
  }, [hostname, subdomain, isSubdomainStore, retryCount]); // إضافة retryCount كـ dependency
  
  // إذا كان هناك خطأ وأزرار إعادة المحاولة
  if (error && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center bg-gradient-to-br from-red-50 to-orange-50">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">خطأ في تحميل المتجر</h1>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            {error}
          </p>
          
          {/* معلومات التشخيص */}
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left text-sm">
            <h3 className="font-semibold mb-2">🔍 معلومات التشخيص:</h3>
            <div className="space-y-1">
              <div><strong>النطاق:</strong> {hostname}</div>
              <div><strong>النطاق الفرعي المستخرج:</strong> {subdomain || 'غير موجود'}</div>
              <div><strong>نوع النطاق:</strong> {isSubdomainStore ? 'نطاق فرعي' : 'نطاق مخصص أو عام'}</div>
              <div><strong>محاولات إعادة المحاولة:</strong> {retryCount + 1}</div>
              <div><strong>معرف المؤسسة المخزن:</strong> {localStorage.getItem('bazaar_organization_id') || 'غير موجود'}</div>
              <div><strong>النطاق الفرعي المخزن:</strong> {localStorage.getItem('bazaar_current_subdomain') || 'غير موجود'}</div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground mb-6">
            المحاولة رقم: {retryCount + 1}
          </p>
          
          <div className="space-y-3">
            <button 
              onClick={handleRetry}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              <span className="mr-2">🔄</span>
              حاول مرة أخرى ({retryCount + 1})
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              <span className="mr-2">↻</span>
              إعادة تحميل الصفحة
            </button>
            <button 
              onClick={() => {
                localStorage.clear();
                window.location.reload();
              }}
              className="w-full inline-flex items-center justify-center px-6 py-3 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
            >
              <span className="mr-2">🗑️</span>
              مسح البيانات المحفوظة وإعادة المحاولة
            </button>
            {process.env.NODE_ENV === 'development' && (
              <button 
                onClick={() => {
                }}
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                <span className="mr-2">🐛</span>
                طباعة معلومات التشخيص في Console
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي حتى لو كان isLoading
  if (isLoading) {
    // إذا كان متجر، نعرض StorePage مباشرة لتتولى عرض المحتوى عند الانتهاء
    if (isSubdomainStore) {
      return <StorePage />;
    }
    
    // للنطاقات الأخرى، نعتمد على مؤشر التحميل المركزي
    return null;
  }
  
  if (isStore === true && storeData) { // التأكد من وجود storeData أيضًا
    return <StorePage />;
  }
  
  // لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي وما زلنا نحمل
  if (isSubdomainStore && isLoading) {
    return <StorePage />;
  }

  // عرض صفحة الهبوط للنطاقات العامة
  return <LandingPage />;
};

export default StoreRouter;
