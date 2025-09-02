import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
// import { Navigate } from 'react-router-dom'; // Navigate غير مستخدمة حاليًا
import { extractSubdomainFromHostname } from '@/lib/api/subdomain';
import StorePage from '@/components/store/StorePage';
import LandingPage from '@/pages/landing/LandingPage';
import { useGlobalLoading } from '@/components/store/GlobalLoadingManager';
import { useDynamicTitle } from '@/hooks/useDynamicTitle';

// قائمة النطاقات العامة التي تعرض صفحة الهبوط وليس متجر
const PUBLIC_DOMAINS = [
  'ktobi.online',
  'www.ktobi.online',
  'stockiha.com',
  'www.stockiha.com',
  'stockiha.pages.dev'
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
 * 🚀 مكون تحميل محسن للمتاجر - يعرض المتجر مباشرة عند الكشف المبكر
 */
const OptimizedStoreLoader = React.memo(({ subdomain, hostname }: { subdomain?: string; hostname: string }) => {
  // 🔥 عرض المتجر فوراً بدون تأخير
  return <StorePage />;
});

OptimizedStoreLoader.displayName = 'OptimizedStoreLoader';

/**
 * مكون للتوجيه المباشر إلى صفحة المتجر عند استخدام سابدومين أو دومين مخصص
 * محسن للاستفادة من الكشف المبكر للنطاق
 */
const StoreRouter = React.memo(() => {
  
  // استخدام Hook لضمان تحديث العنوان والأيقونة
  useDynamicTitle();
  
  const [isStore, setIsStore] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubdomain, setHasSubdomain] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // 🔥 إضافة مراجع لمنع التكرار
  const domainChecked = useRef(false);
  const earlyDetectionProcessed = useRef(false);
  const renderCount = useRef(0);
  const isInitialized = useRef(false);
  
  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase } = useGlobalLoading();
  
  // التحقق الفوري من النطاق الفرعي
  const hostname = useMemo(() => window.location.hostname, []);
  const subdomain = useMemo(() => extractSubdomainFromHostname(hostname), [hostname]);
  const isSubdomainStore = useMemo(() => Boolean(subdomain && subdomain !== 'www'), [subdomain]);
  const isCustomDomain = useMemo(() => !isSubdomainStore && !PUBLIC_DOMAINS.includes(hostname) && !isLocalhostDomain(hostname), [isSubdomainStore, hostname]);

  // 🔥 تحسين: فحص الكشف المبكر للنطاق
  const earlyDomainDetection = useMemo(() => {
    // 🔥 منع التكرار: التحقق من أن الكشف المبكر لم يتم معالجته
    if (earlyDetectionProcessed.current) {
      return { isEarlyDetected: false, earlySubdomain: null };
    }
    
    try {
      const isEarlyDetected = sessionStorage.getItem('bazaar_early_domain_detection') === 'true';
      const earlyHostname = sessionStorage.getItem('bazaar_early_hostname');
      const earlySubdomain = sessionStorage.getItem('bazaar_early_subdomain');

      if (isEarlyDetected && earlyHostname === hostname) {
        // ✅ إزالة console.log المفرط
        earlyDetectionProcessed.current = true; // 🔥 تمييز الكشف المبكر كمعالج
        return { isEarlyDetected: true, earlySubdomain };
      }
    } catch (e) {
    }
    return { isEarlyDetected: false, earlySubdomain: null };
  }, [hostname]);

  // 🔥 إرسال event لتتبع العرض - مرة واحدة فقط
  useEffect(() => {
    renderCount.current++;

    // إرسال event لتتبع العرض
    window.dispatchEvent(new CustomEvent('bazaar:store-router-render', {
      detail: {
        renderCount: renderCount.current,
        timestamp: Date.now()
      }
    }));
    
    // إذا كان هذا هو العرض الأول، قم بتهيئة المكون
    if (renderCount.current === 1) {
      isInitialized.current = true;
    }
  }, []);

  // 🔥 إضافة مراقب للأداء - مرة واحدة فقط
  useEffect(() => {
    
    // إرسال event بداية StoreRouter
    window.dispatchEvent(new CustomEvent('bazaar:store-router-start', {
      detail: {
        timestamp: Date.now(),
        hostname,
        subdomain,
        isSubdomainStore,
        isCustomDomain
      }
    }));
  }, [hostname, subdomain, isSubdomainStore, isCustomDomain]);

  // 🔥 منع إعادة الإنشاء المتكرر
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }
    isInitialized.current = true;
  }, []);

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

  // دالة إعادة المحاولة اليدوية
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    setError(null);
    setIsLoading(true);
    setIsStore(null);
    // 🔥 إعادة تعيين المراجع عند إعادة المحاولة
    domainChecked.current = false;
    earlyDetectionProcessed.current = false;
    isInitialized.current = false;
  }, []);

  useEffect(() => {
    // 🔥 منع التكرار: التحقق من أن النطاق لم يتم فحصه
    if (domainChecked.current) {
      return;
    }
    
    domainChecked.current = true;

    const checkDomain = async () => {
      try {
        
        // التحقق من النطاقات المحلية الخالصة (بدون subdomain)
        if (isPlainLocalhost(hostname)) {
          setIsStore(false);
          setIsLoading(false);
          domainChecked.current = true;
          return;
        }

        // إذا كان هناك نطاق فرعي، نفترض أنه متجر ونترك تحميل البيانات للمكونات المختصة
        if (isSubdomainStore && subdomain) {
          setHasSubdomain(true);
          // ضمان توافق المعرف مع النطاق الحالي: نُفرغ المعرف المخزن لتجنب جلب مكرر بالمعرف
          try {
            localStorage.removeItem('bazaar_organization_id');
            localStorage.setItem('bazaar_current_subdomain', subdomain);
          } catch (e) {
          }
          setIsStore(true);
          setIsLoading(false);
          domainChecked.current = true;
          return;
        }

        // النطاقات العامة - عرض صفحة الهبوط مباشرة
        if (PUBLIC_DOMAINS.includes(hostname)) {
          setIsStore(false);
          setIsLoading(false);
          domainChecked.current = true;
          return;
        }

        // النطاقات المخصصة بدون نطاق فرعي: اعتبرها متجر (سيتم حل المؤسسة عبر الدومين)
        if (isCustomDomain) {
          try {
            // حفظ النطاق كاملاً للنطاقات المخصصة
            localStorage.setItem('bazaar_current_subdomain', hostname);
          } catch (e) {
          }
          setIsStore(true);
          setIsLoading(false);
          domainChecked.current = true;
          return;
        }
        
        // إذا لم نجد أي متجر، عرض صفحة الهبوط
        setIsStore(false);
        setIsLoading(false);
        domainChecked.current = true;
      } catch (error) {
        setError(`خطأ في فحص النطاق: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`);
        setIsLoading(false);
        domainChecked.current = true;
      }
    };

    // بدء فحص النطاق
    checkDomain();
  }, [hostname, subdomain, isSubdomainStore, isCustomDomain, earlyDomainDetection]);

  // 🔥 منع التكرار: التحقق من أن المكون لم يتم تهيئته
  if (isInitialized.current && renderCount.current > 1) {
    return null;
  }

  // 🔥 تحسين: إذا كان هناك كشف مبكر للنطاق، اعرض المتجر مباشرة
  if (earlyDomainDetection.isEarlyDetected) {
    return (
      <OptimizedStoreLoader 
        subdomain={earlyDomainDetection.earlySubdomain || undefined}
        hostname={hostname}
      />
    );
  }

  // عرض شاشة الخطأ
  if (error) {
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
              <div><strong>الكشف المبكر للنطاق:</strong> {earlyDomainDetection.isEarlyDetected ? 'نعم' : 'لا'}</div>
              <div><strong>النطاق الفرعي المبكر:</strong> {earlyDomainDetection.earlySubdomain || 'غير موجود'}</div>
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
                sessionStorage.clear();
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
  
  // لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي أو نطاق مخصص حتى لو كان isLoading
  if (isLoading) {
    
    // 🔥 إذا كان متجر، نعرض StorePage مباشرة لتتولى عرض المحتوى عند الانتهاء
    if (isSubdomainStore || isCustomDomain) {
      return <StorePage />;
    }
    
    // للنطاقات الأخرى، نعتمد على مؤشر التحميل المركزي
    return null;
  }
  
  // 🔥 إذا كان متجر، اعرض StorePage
  if (isStore === true) {
    return <StorePage />;
  }
  
  // 🔥 لا نعرض صفحة الهبوط إذا كان هناك نطاق فرعي وما زلنا نحمل
  if (isSubdomainStore && isLoading) {
    return <StorePage />;
  }

  // 🔥 عرض صفحة الهبوط للنطاقات العامة فقط
  return <LandingPage />;
});

StoreRouter.displayName = 'StoreRouter';

export default StoreRouter;
