/**
 * مكون AppWrapper مُحسن - يضمن تحميل جميع البيانات قبل عرض المحتوى
 */

import React, { useEffect, useState, useRef } from 'react';
import { getAppInitData, isAppInitDataValid, initializeApp } from '@/lib/appInitializer';
// Removed GlobalLoadingManager - not needed for admin only
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

const AppWrapper: React.FC<AppWrapperProps> = React.memo(({ children }) => {

  // 🔥 تحسين لصفحة الهبوط: تجنب أي تهيئة بيانات المتجر
  const isLandingPage = window.location.pathname === '/' &&
    (window.location.hostname.includes('stockiha.com') ||
     window.location.hostname.includes('ktobi.online') ||
     window.location.hostname.includes('localhost'));

  // 🔥 تحسين لمسارات الإدارة العامة: لا تنتظر أي تهيئة
  const ADMIN_PUBLIC_PATHS = new Set([
    '/login',
    '/forgot-password',
    '/reset-password',
    '/tenant/signup',
    '/admin/signup',
    '/setup-organization',
    '/redirect',
    '/super-admin/login'
  ]);
  const currentPath = window.location.pathname;
  const isAdminPublicRoute = ADMIN_PUBLIC_PATHS.has(currentPath);

  const [isReady, setIsReady] = useState(isLandingPage || isAdminPublicRoute); // فوري للهبوط ومسارات الإدارة العامة
  const [hasError, setHasError] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const mountedRef = useRef(true);
  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const initializationPromiseRef = useRef<Promise<void> | null>(null);

  // 🔎 سجلات تشخيصية مبكرة
  
  try {
    console.log('🧭 [AppWrapper] mount start', {
      path: currentPath,
      isLandingPage,
      isAdminPublicRoute,
      initialIsReady: isLandingPage || isAdminPublicRoute
    });
  } catch {}

  // Removed global loading system - admin only

  // الحصول على معرف المؤسسة من UserContext - فقط للمتاجر وليس صفحة الهبوط
  const { organizationId } = useUser();

  // 🔥 دالة محسنة لتهيئة البيانات
  const initializeData = async (isRetry = false, forceOrgId?: string) => {
    const startTime = performance.now();
    console.time('⏱️ [AppWrapper] initializeData');

    // 🚀 تحسين لصفحة الهبوط: لا تحتاج لأي تهيئة
    if (isLandingPage) {
      console.log('🏁 [AppWrapper] skip init on landing');
      setIsReady(true);
      console.timeEnd('⏱️ [AppWrapper] initializeData');
      return;
    }

    // 🚀 تحسين لمسارات الإدارة العامة: لا تحتاج لأي تهيئة
    if (isAdminPublicRoute) {
      console.log('🏁 [AppWrapper] skip init on admin public route', { path: currentPath });
      setIsReady(true);
      console.timeEnd('⏱️ [AppWrapper] initializeData');
      return;
    }

    // منع التشغيل المتكرر
    if (isInitializing && !forceOrgId) {
      console.log('⏸️ [AppWrapper] init already running');
      return;
    }

    // منع التشغيل المتوازي
    if (initializationPromiseRef.current) {
      console.log('⏳ [AppWrapper] returning existing init promise');
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
          console.log('💨 [AppWrapper] fast-path localhost', { time: `${localhostTime.toFixed(1)}ms` });
          setIsReady(true);
          return;
        }

        // ⚡ تحسين: متابعة فورية إذا كان organizationId متاحاً
        const currentOrgId = forceOrgId || organizationId;
        if (currentOrgId) {
          const orgReadyTime = performance.now() - startTime;
          console.log('✅ [AppWrapper] orgId present, ready immediately', { orgId: currentOrgId, time: `${orgReadyTime.toFixed(1)}ms` });
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
            console.log('📦 [AppWrapper] using cached app init data', { time: `${cacheTime.toFixed(1)}ms` });
            setIsReady(true);
            return;
          }

          // جلب البيانات الجديدة باستخدام organizationId

          console.time('⏱️ [AppWrapper] initializeApp');
          const data = await initializeApp(currentOrgId);
          console.timeEnd('⏱️ [AppWrapper] initializeApp');
          const fetchTime = performance.now() - fetchStartTime;

          if (data) {
            console.log('✅ [AppWrapper] init data fetched', { time: `${fetchTime.toFixed(1)}ms` });
            setIsReady(true);
            return;
          } else {
            console.warn('⚠️ [AppWrapper] init data fetch returned null');
          }
        } else {
          console.log('ℹ️ [AppWrapper] no organizationId available; proceeding baseline');
        }
        
        // إذا لم نتمكن من جلب البيانات، نتابع مع البيانات الأساسية
        console.log('➡️ [AppWrapper] proceeding without init data');
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
        console.timeEnd('⏱️ [AppWrapper] initializeData');
        console.log('🏁 [AppWrapper] init finished', { totalTime: `${totalTime.toFixed(1)}ms` });
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
    console.time('⏱️ [AppWrapper] mount effect');

    mountedRef.current = true;

    // 🚀 تحسين لصفحة الهبوط: لا تحتاج لأي تهيئة
    if (!isLandingPage && !isAdminPublicRoute) {
      // تشغيل التهيئة الأولية
      console.log('🟢 [AppWrapper] starting initializeData on mount');
      initializeData();
    }

    const mountTime = performance.now() - mountStartTime;
    console.timeEnd('⏱️ [AppWrapper] mount effect');
    console.log('📈 [AppWrapper] mount effect done', { time: `${mountTime.toFixed(1)}ms` });

    return () => {

      mountedRef.current = false;
    };
  }, []); // إزالة dependencies لتجنب re-renders غير ضرورية

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
  }, [organizationId]); // تحسين dependencies لتجنب re-renders

  // شاشة الخطأ
  if (hasError) {
    console.warn('🛑 [AppWrapper] rendering ErrorScreen');
    return <ErrorScreen onRetry={handleRetry} />;
  }

  // شاشة التحميل - يتم التعامل معها بواسطة النظام المركزي
  if (!isReady) {
    console.log('⏳ [AppWrapper] not ready yet -> returning null');
    return null; // النظام المركزي سيعرض مؤشر التحميل
  }

  // عرض المحتوى
  console.log('🎉 [AppWrapper] ready -> rendering children');
  return <>{children}</>;
});

AppWrapper.displayName = 'AppWrapper';

// مقارنة مخصصة لمنع إعادة الرسم غير الضرورية
const areEqual = (prevProps: AppWrapperProps, nextProps: AppWrapperProps) => {
  // مقارنة بسيطة للأطفال - إذا لم يتغيروا، لا تعيد الرسم
  return prevProps.children === nextProps.children;
};

export default React.memo(AppWrapper, areEqual);
