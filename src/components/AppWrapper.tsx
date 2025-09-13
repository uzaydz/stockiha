/**
 * مكون AppWrapper مُحسن - يضمن تحميل جميع البيانات قبل عرض المحتوى
 */

import React, { useEffect, useState, useRef } from 'react';
import { getAppInitData, isAppInitDataValid, initializeApp } from '@/lib/appInitializer';
import { useGlobalLoading } from '@/components/store/GlobalLoadingManager';
import { useUser } from '@/context/UserContext';

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
  const [isInitializing, setIsInitializing] = useState(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // استخدام النظام المركزي للتحميل
  const { showLoader, hideLoader, setPhase, isLoaderVisible } = useGlobalLoading();
  
  // الحصول على معرف المؤسسة من UserContext
  const { organizationId } = useUser();

  // 🔥 دالة محسنة لتهيئة البيانات
  const initializeData = async (isRetry = false, forceOrgId?: string) => {
    const startTime = performance.now();

    // منع التشغيل المتكرر
    if (isInitializing && !forceOrgId) {
      
      return;
    }

    // منع التشغيل المتوازي
    if (initializationPromiseRef.current) {
      
      return initializationPromiseRef.current;
    }

    const currentRetry = isRetry ? retryCountRef.current : 0;
    if (!isRetry) {
      retryCountRef.current = 0;
    }

    // إنشاء promise جديد للتهيئة
    initializationPromiseRef.current = (async () => {
      try {
        setIsInitializing(true);
        setHasError(false);

        // التحقق من النطاق الحالي
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');

        // ⚡ تحسين: تسريع localhost - متابعة فورية
        if (isLocalhost) {
          const localhostTime = performance.now() - startTime;
          setIsReady(true);
          return;
        }

        // ⚡ تحسين: متابعة فورية إذا كان organizationId متاحاً
        const currentOrgId = forceOrgId || organizationId;
        if (currentOrgId) {
          const orgReadyTime = performance.now() - startTime;
          setIsReady(true);
          return;
        }

        // 🔥 محاولة استخدام initializeApp إذا كان organizationId متاحاً
        if (currentOrgId) {
          const fetchStartTime = performance.now();

          // محاولة الحصول على البيانات المحفوظة أولاً
          const existingData = getAppInitData();
          if (existingData && isAppInitDataValid()) {
            const cacheTime = performance.now() - fetchStartTime;
            setIsReady(true);
            return;
          }

          // جلب البيانات الجديدة باستخدام organizationId

          const data = await initializeApp(currentOrgId);
          const fetchTime = performance.now() - fetchStartTime;

          if (data) {
            setIsReady(true);
            return;
          } else {
          }
        } else {
          
        }
        
        // إذا لم نتمكن من جلب البيانات، نتابع مع البيانات الأساسية
        setIsReady(true);

      } catch (error) {
        const errorTime = performance.now() - startTime;
        console.error('💥 [AppWrapper] خطأ في تهيئة البيانات:', {
          time: `${errorTime.toFixed(2)}ms`,
          error: error instanceof Error ? error.message : String(error),
          hostname: window.location.hostname,
          isRetry,
          currentRetry,
          maxRetries
        });

        if (mountedRef.current) {
          const hostname = window.location.hostname;
          const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
          const platformDomains = ['stockiha.com', 'www.stockiha.com', 'stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online'];
          const isPlatformDomain = platformDomains.includes(hostname);

          if (isPlatformDomain) {
            
            setHasError(true);
          } else {
            
            setIsReady(true);
          }
        }
      } finally {
        const totalTime = performance.now() - startTime;
        setIsInitializing(false);
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  };

  const handleRetry = () => {
    retryCountRef.current = 0;
    setIsReady(false);
    setHasError(false);
    initializeData(true);
  };

  // 🔥 useEffect محسن للتهيئة الأولية
  useEffect(() => {
    const mountStartTime = performance.now();

    mountedRef.current = true;

    // تشغيل التهيئة الأولية
    initializeData();

    const mountTime = performance.now() - mountStartTime;

    return () => {
      
      mountedRef.current = false;
    };
  }, []); // فقط عند mount الأول

  // 🔥 useEffect محسن لمراقبة organizationId
  useEffect(() => {
    const orgEffectStartTime = performance.now();

    // ⚡ تحسين: إذا كان organizationId متاحاً، تعيين setIsReady فوراً
    if (organizationId && !isReady) {
      const readyTime = performance.now() - orgEffectStartTime;
      setIsReady(true);
      return;
    }

    // إذا لم يكن organizationId متاحاً، تشغيل التهيئة
    if (!organizationId && !isReady && !isInitializing) {
      
      initializeData();
    }

    const orgEffectTime = performance.now() - orgEffectStartTime;
  }, [organizationId, isReady, isInitializing]);

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
