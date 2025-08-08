/**
 * مكون AppWrapper مُبسط - يضمن تحميل جميع البيانات قبل عرض المحتوى
 */

import React, { useEffect, useState, useRef } from 'react';
import { getAppInitData, isAppInitDataValid, initializeApp } from '@/lib/appInitializer';
import { useGlobalLoading } from '@/components/store/GlobalLoadingManager';

interface AppWrapperProps {
  children: React.ReactNode;
}

// شاشة الخطأ
const ErrorScreen: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
    <div className="text-center max-w-md p-6">
      <div className="text-red-500 text-6xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
        خطأ في تحميل المتجر
      </h2>
      <p className="text-gray-600 dark:text-gray-300 mb-4">
        حدث خطأ أثناء تحميل بيانات المتجر. يرجى المحاولة مرة أخرى.
      </p>
      <button
        onClick={onRetry}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
      >
        إعادة المحاولة
      </button>
    </div>
  </div>
);

const AppWrapper: React.FC<AppWrapperProps> = ({ children }) => {
  const [isReady, setIsReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const isInitializedRef = useRef(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3; // عدد المحاولات القصوى

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase } = useGlobalLoading();

  const initializeData = async (isRetry = false) => {
    // منع التشغيل المتكرر
    if (isInitializedRef.current) {
      return;
    }
    
    const currentRetry = isRetry ? retryCountRef.current : 0;
    if (!isRetry) {
      retryCountRef.current = 0;
    }

    try {
      setHasError(false);
      
      // التحقق من النطاق الحالي
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
      const subdomain = hostname.split('.')[0];
      const hasValidSubdomain = subdomain && subdomain !== 'localhost' && subdomain !== '127';

      // ✅ النطاقات الأساسية للمنصة (console/admin)
      const platformDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
      if (platformDomains.includes(hostname)) {
        
        // إظهار مؤشر التحميل
        showLoader({
          storeName: 'سطوكيها',
          progress: 10,
          message: 'جاري تحضير النظام...',
          primaryColor: '#fc5a3e'
        });
        setPhase('system');
        
        // فحص البيانات المحفوظة أولاً
        if (isAppInitDataValid()) {
          const savedData = getAppInitData();
          if (savedData && mountedRef.current) {
            isInitializedRef.current = true;
            setIsReady(true);
            hideLoader();
            return;
          }
        }

        // جلب بيانات جديدة للمنصة
        const data = await initializeApp();

        if (data && mountedRef.current) {
          isInitializedRef.current = true;
          setIsReady(true);
          hideLoader();
        } else if (mountedRef.current) {
          isInitializedRef.current = true;
          setIsReady(true);
          hideLoader();
        }
        return;
      }
      
      // ✅ التطوير المحلي مع subdomain صالح (مثل test.localhost:3000)
      if (isLocalhost && hasValidSubdomain) {
        
        // نمنح StoreRouter وقتاً لإعداد البيانات
        const waitForStoreData = async (attempt = 0): Promise<void> => {
          const maxAttempts = 3;
          const delay = 500;
          
          await new Promise(resolve => setTimeout(resolve, delay));
          
          const storedOrgId = localStorage.getItem('bazaar_organization_id');
          if (storedOrgId && storedOrgId !== 'default-organization-id') {
            return;
          }
          
          if (attempt < maxAttempts) {
            return await waitForStoreData(attempt + 1);
          }
        };
        
        await waitForStoreData();
        isInitializedRef.current = true;
        setIsReady(true);
        return;
      }
      
      // ✅ التطوير المحلي بدون subdomain (localhost:3000)
      if (isLocalhost && !hasValidSubdomain) {
        isInitializedRef.current = true;
        setIsReady(true);
        return;
      }
      
      // 🏪 أي نطاق آخر = نطاق مخصص للمتجر (StoreRouter سيتولى الأمر)
      
      // انتظار StoreRouter ليحدد ما إذا كان متجراً صالحاً أم لا
      const waitForStoreRouter = async (attempt = 0): Promise<void> => {
        const maxAttempts = 8; // زيادة المحاولات للنطاقات المخصصة
        const delay = 400;
        
        await new Promise(resolve => setTimeout(resolve, delay));
        
        // فحص إذا كان StoreRouter قد حمل بيانات المتجر
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        const storedSubdomain = localStorage.getItem('bazaar_current_subdomain');
        
        if ((storedOrgId && storedOrgId !== 'default-organization-id') || storedSubdomain) {
          return;
        }
        
        if (attempt < maxAttempts) {
          return await waitForStoreRouter(attempt + 1);
        }
        
      };
      
      await waitForStoreRouter();
      
      // بغض النظر عن النتيجة، نتابع ونترك StoreRouter يظهر الأخطاء إن وجدت
      isInitializedRef.current = true;
      setIsReady(true);

    } catch (error) {
      
      if (mountedRef.current) {
        // للنطاقات المخصصة والمحلية، لا نعتبر الأخطاء فادحة
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
        const platformDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
        const isPlatformDomain = platformDomains.includes(hostname);
        
        if (isPlatformDomain) {
          // للنطاقات الأساسية، نعرض خطأ
          setHasError(true);
        } else {
          // للنطاقات المخصصة والمحلية، نتجاهل الخطأ
          isInitializedRef.current = true;
          setIsReady(true);
        }
      }
    }
  };

  const handleRetry = () => {
    isInitializedRef.current = false;
    retryCountRef.current = 0;
    setIsReady(false);
    setHasError(false);
    initializeData();
  };

  useEffect(() => {
    mountedRef.current = true;
    initializeData();
    
    return () => {
      mountedRef.current = false;
    };
  }, []); // فقط عند mount الأول

  // شاشة الخطأ
  if (hasError) {
    return <ErrorScreen onRetry={handleRetry} />;
  }

  // شاشة التحميل - يتم التعامل معها بواسطة النظام المركزي
  if (!isReady) {
    return null; // النظام المركزي سيعرض مؤشر التحميل
  }

  // عرض المحتوى
  return <>{children}</>;
};

export default AppWrapper;
