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
  console.log('🚀 AppWrapper: بدء التهيئة');
  
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
    console.log('🔍 AppWrapper: بدء تهيئة البيانات', {
      isRetry,
      retryCount: retryCountRef.current,
      organizationId: forceOrgId || organizationId,
      isInitializing
    });

    // منع التشغيل المتكرر
    if (isInitializing && !forceOrgId) {
      console.log('⏭️ AppWrapper: التهيئة قيد التشغيل بالفعل');
      return;
    }

    // منع التشغيل المتوازي
    if (initializationPromiseRef.current) {
      console.log('⏭️ AppWrapper: التهيئة قيد التشغيل بالفعل (promise)');
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

        console.log('🔍 AppWrapper: معلومات النطاق', { hostname, isLocalhost });

        // ⚡ تحسين: تسريع localhost - متابعة فورية
        if (isLocalhost) {
          console.log('🏠 AppWrapper: localhost - متابعة فورية');
          setIsReady(true);
          return;
        }

        // ⚡ تحسين: متابعة فورية إذا كان organizationId متاحاً
        const currentOrgId = forceOrgId || organizationId;
        if (currentOrgId) {
          console.log('🏢 AppWrapper: معرف المؤسسة متاح - متابعة فورية:', currentOrgId);
          setIsReady(true);
          return;
        }

        // 🔥 محاولة استخدام initializeApp إذا كان organizationId متاحاً
        if (currentOrgId) {
          console.log('🏢 AppWrapper: نطاق أساسي للمنصة - تطبيق initializeApp:', currentOrgId);
          
          // محاولة الحصول على البيانات المحفوظة أولاً
          const existingData = getAppInitData();
          if (existingData && isAppInitDataValid()) {
            console.log('✅ AppWrapper: استخدام البيانات المحفوظة');
            setIsReady(true);
            return;
          }
          
          // جلب البيانات الجديدة باستخدام organizationId
          console.log('🔄 AppWrapper: جلب بيانات جديدة من initializeApp');
          const data = await initializeApp(currentOrgId);
          
          if (data) {
            console.log('✅ AppWrapper: تم جلب البيانات بنجاح:', data.organization.id);
            setIsReady(true);
            return;
          } else {
            console.log('⚠️ AppWrapper: لم يتم العثور على بيانات المؤسسة');
          }
        } else {
          console.log('⏳ AppWrapper: انتظار organizationId...');
        }
        
        // إذا لم نتمكن من جلب البيانات، نتابع مع البيانات الأساسية
        console.log('🔄 AppWrapper: متابعة مع البيانات الأساسية');
        setIsReady(true);

      } catch (error) {
        console.error('❌ AppWrapper: خطأ في تهيئة البيانات', error);
        
        if (mountedRef.current) {
          const hostname = window.location.hostname;
          const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('localhost');
          const platformDomains = ['stockiha.com', 'www.stockiha.com', 'ktobi.online', 'www.ktobi.online'];
          const isPlatformDomain = platformDomains.includes(hostname);
          
          if (isPlatformDomain) {
            console.log('❌ AppWrapper: عرض خطأ للنطاق الأساسي');
            setHasError(true);
          } else {
            console.log('⚠️ AppWrapper: تجاهل الخطأ للنطاق المخصص/المحلي');
            setIsReady(true);
          }
        }
      } finally {
        setIsInitializing(false);
        initializationPromiseRef.current = null;
      }
    })();

    return initializationPromiseRef.current;
  };

  const handleRetry = () => {
    console.log('🔄 AppWrapper: إعادة المحاولة');
    retryCountRef.current = 0;
    setIsReady(false);
    setHasError(false);
    initializeData(true);
  };

  // 🔥 useEffect محسن للتهيئة الأولية
  useEffect(() => {
    console.log('🔧 AppWrapper: useEffect mount');
    mountedRef.current = true;

    // تشغيل التهيئة الأولية
    initializeData();

    return () => {
      console.log('🔧 AppWrapper: useEffect cleanup');
      mountedRef.current = false;
    };
  }, []); // فقط عند mount الأول

  // 🔥 useEffect محسن لمراقبة organizationId
  useEffect(() => {
    // ⚡ تحسين: إذا كان organizationId متاحاً، تعيين setIsReady فوراً
    if (organizationId && !isReady) {
      console.log('🔧 AppWrapper: organizationId متاح، تعيين setIsReady فوراً:', organizationId);
      setIsReady(true);
      return;
    }

    // إذا لم يكن organizationId متاحاً، تشغيل التهيئة
    if (!organizationId && !isReady && !isInitializing) {
      console.log('🔧 AppWrapper: organizationId غير متاح، تشغيل التهيئة العامة');
      initializeData();
    }
  }, [organizationId, isReady, isInitializing]);

  // شاشة الخطأ
  if (hasError) {
    console.log('❌ AppWrapper: عرض شاشة الخطأ');
    return <ErrorScreen onRetry={handleRetry} />;
  }

  // شاشة التحميل - يتم التعامل معها بواسطة النظام المركزي
  if (!isReady) {
    console.log('⏳ AppWrapper: انتظار جاهزية البيانات');
    return null; // النظام المركزي سيعرض مؤشر التحميل
  }

  // عرض المحتوى
  console.log('✅ AppWrapper: عرض المحتوى - البيانات جاهزة');
  return <>{children}</>;
};

export default AppWrapper;
