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

  const initializeData = async () => {
    // منع التشغيل المتكرر
    if (isInitializedRef.current) {
      console.log('🚀 [AppWrapper] تم تجاهل التشغيل المتكرر');
      return;
    }
    
    try {
      console.log('🚀 [AppWrapper] === بدء تهيئة التطبيق ===');
      setHasError(false);
      
      // فحص البيانات المحفوظة أولاً
      if (isAppInitDataValid()) {
        const savedData = getAppInitData();
        if (savedData && mountedRef.current) {
          console.log('🚀 [AppWrapper] استخدام البيانات المحفوظة');
          isInitializedRef.current = true;
          setIsReady(true);
          return;
        }
      }

      // جلب بيانات جديدة إذا لم توجد
      console.log('🚀 [AppWrapper] جلب بيانات جديدة');
      const data = await initializeApp();

      if (data && mountedRef.current) {
        console.log('🚀 [AppWrapper] تم تحميل البيانات بنجاح');
        isInitializedRef.current = true;
        setIsReady(true);
      } else if (mountedRef.current) {
        console.error('🚀 [AppWrapper] فشل في تحميل البيانات');
        setHasError(true);
      }
    } catch (error) {
      console.error('🚀 [AppWrapper] خطأ في التهيئة:', error);
      if (mountedRef.current) {
        setHasError(true);
      }
    }
  };

  const handleRetry = () => {
    isInitializedRef.current = false;
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
  console.log('🚀 [AppWrapper] === عرض المحتوى ===');
  return <>{children}</>;
};

export default AppWrapper; 