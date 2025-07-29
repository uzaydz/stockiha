/**
 * مكون AppWrapper مُبسط - يضمن تحميل جميع البيانات قبل عرض المحتوى
 */

import React, { useEffect, useState, useRef } from 'react';
import { getAppInitData, isAppInitDataValid, initializeApp } from '@/lib/appInitializer';

interface AppWrapperProps {
  children: React.ReactNode;
}

// شاشة التحميل المخصصة
const LoadingScreen: React.FC = () => (
  <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-gray-600 dark:text-gray-300">جاري تحميل المتجر...</p>
    </div>
  </div>
);

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

  const initializeData = async (isRetry = false) => {
    // منع التشغيل المتكرر
    if (isInitializedRef.current) {
      return;
    }
    
    const currentRetry = isRetry ? retryCountRef.current : 0;
    if (!isRetry) {
      retryCountRef.current = 0;
    }
    
    console.log(`🔄 [AppWrapper] بدء التهيئة - المحاولة ${currentRetry + 1}/${maxRetries + 1}`);
    
    try {
      setHasError(false);
      
      // التحقق من أننا في التطوير المحلي بدون subdomain
      const hostname = window.location.hostname;
      const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
      const subdomain = hostname.split('.')[0];
      const hasValidSubdomain = subdomain && subdomain !== 'localhost' && subdomain !== '127';
      
      console.log('🔍 [AppWrapper] فحص البيئة:', {
        hostname,
        isLocalhost,
        subdomain,
        hasValidSubdomain,
        storedOrgId: localStorage.getItem('bazaar_organization_id'),
        retry: currentRetry
      });
      
      // فحص النطاقات العامة أولاً (للإنتاج)
      if (!isLocalhost) {
        const publicDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
        if (publicDomains.includes(hostname)) {
          console.log('✅ [AppWrapper] نطاق عام، لا نحتاج لتهيئة البيانات');
          isInitializedRef.current = true;
          setIsReady(true);
          return;
        }
      }
      
      // في التطوير المحلي (مع أو بدون subdomain)
      if (isLocalhost) {
        const storedOrgId = localStorage.getItem('bazaar_organization_id');
        
        // إذا لم يوجد معرف مؤسسة، نحاول الانتظار أولاً
        if (!storedOrgId) {
          // في حالة عدم وجود orgId، نحاول مرة أخرى قبل الاستسلام
          if (currentRetry < maxRetries) {
            console.log(`⏳ [AppWrapper] المحاولة ${currentRetry + 1}: localhost بدون orgId، انتظار ${(currentRetry + 1) * 500}ms...`);
            retryCountRef.current = currentRetry + 1;
            
            setTimeout(() => {
              if (mountedRef.current && !isInitializedRef.current) {
                initializeData(true);
              }
            }, (currentRetry + 1) * 500); // تأخير متزايد: 500ms, 1000ms, 1500ms
            return;
          }
          
          // بعد المحاولات، إذا لم يكن هناك subdomain صالح، نعتبرها صفحة عامة
          if (!hasValidSubdomain) {
            console.log('✅ [AppWrapper] التطوير المحلي: صفحة عامة، عدم الحاجة لتهيئة البيانات (بعد المحاولات)');
            isInitializedRef.current = true;
            setIsReady(true);
            return;
          }
        }
      }
      
      // فحص البيانات المحفوظة أولاً
      if (isAppInitDataValid()) {
        const savedData = getAppInitData();
        if (savedData && mountedRef.current) {
          console.log('✅ [AppWrapper] تم العثور على بيانات محفوظة صالحة');
          isInitializedRef.current = true;
          setIsReady(true);
          return;
        }
      }

      console.log('🔄 [AppWrapper] جلب بيانات جديدة من appInitializer...');
      
      // جلب بيانات جديدة إذا لم توجد
      const data = await initializeApp();

      if (data && mountedRef.current) {
        console.log('✅ [AppWrapper] تم تحميل البيانات بنجاح');
        isInitializedRef.current = true;
        setIsReady(true);
      } else if (mountedRef.current) {
        console.log('⚠️ [AppWrapper] لم يتم إرجاع بيانات من appInitializer');
        
        // محاولة مرة أخرى في localhost أو إظهار خطأ في الإنتاج
        if (isLocalhost) {
          // محاولة مرة أخرى قبل الاستسلام
          if (currentRetry < maxRetries) {
            console.log(`⏳ [AppWrapper] المحاولة ${currentRetry + 1}: فشل تحميل البيانات في localhost، انتظار ${(currentRetry + 1) * 500}ms...`);
            retryCountRef.current = currentRetry + 1;
            
            setTimeout(() => {
              if (mountedRef.current && !isInitializedRef.current) {
                initializeData(true);
              }
            }, (currentRetry + 1) * 500);
            return;
          }
          
          // بعد المحاولات، إذا لم يكن هناك subdomain صالح، نتابع بدون بيانات
          if (!hasValidSubdomain) {
            console.log('✅ [AppWrapper] التطوير المحلي: لا توجد بيانات مؤسسة، المتابعة بدون تهيئة (بعد المحاولات)');
            isInitializedRef.current = true;
            setIsReady(true);
          } else {
            console.log('❌ [AppWrapper] localhost مع subdomain: فشل تحميل البيانات - عرض شاشة الخطأ');
            setHasError(true);
          }
        } else {
          console.log('❌ [AppWrapper] الإنتاج: فشل في تحميل البيانات - عرض شاشة الخطأ');
          setHasError(true);
        }
      }
    } catch (error) {
      console.error('💥 [AppWrapper] خطأ في initializeData:', error);
      
      if (mountedRef.current) {
        // في التطوير المحلي، لا نعتبر عدم وجود البيانات خطأ
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
        const subdomain = hostname.split('.')[0];
        const hasValidSubdomain = subdomain && subdomain !== 'localhost' && subdomain !== '127';
        
        if (isLocalhost && !hasValidSubdomain) {
          // محاولة مرة أخرى في حالة الخطأ
          if (currentRetry < maxRetries) {
            console.log(`⏳ [AppWrapper] المحاولة ${currentRetry + 1}: خطأ في التهيئة، انتظار ${(currentRetry + 1) * 500}ms...`);
            retryCountRef.current = currentRetry + 1;
            
            setTimeout(() => {
              if (mountedRef.current && !isInitializedRef.current) {
                initializeData(true);
              }
            }, (currentRetry + 1) * 500);
            return;
          }
          
          console.log('✅ [AppWrapper] التطوير المحلي: خطأ في التهيئة، لكن المتابعة للصفحة العامة (بعد المحاولات)');
          isInitializedRef.current = true;
          setIsReady(true);
        } else {
          console.log('❌ [AppWrapper] خطأ حقيقي - عرض شاشة الخطأ');
          setHasError(true);
        }
      }
    }
  };

  const handleRetry = () => {
    console.log('🔄 [AppWrapper] إعادة المحاولة يدوياً - إعادة تعيين العدادات');
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

  // شاشة التحميل
  if (!isReady) {
    return <LoadingScreen />;
  }

  // عرض المحتوى
  return <>{children}</>;
};

export default AppWrapper;
