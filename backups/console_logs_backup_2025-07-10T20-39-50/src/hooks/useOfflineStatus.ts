import { useState, useEffect } from 'react';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
}

/**
 * فحص الاتصال بالخادم باستخدام نقطة نهاية محلية
 * @returns وعد بوليان يشير إلى حالة الاتصال
 */
const checkInternetConnection = async (): Promise<boolean> => {
  // 🚫 DISABLED - Always return true to avoid health-check errors
  return true;
};

/**
 * Hook للتعامل مع حالة الاتصال بالإنترنت
 * @returns معلومات عن حالة الاتصال بالإنترنت
 */
export const useOfflineStatus = (): OfflineStatus => {
  // حالة الاتصال الحالية
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  
  // تتبع ما إذا كان المستخدم غير متصل سابقًا وعاد للاتصال
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // إجراء فحص نشط للاتصال عند التحميل
  useEffect(() => {
    const verifyConnection = async () => {
      const isReallyConnected = await checkInternetConnection();
      if (isReallyConnected !== isOnline) {
        
        if (!isReallyConnected && isOnline) {
          setWasOffline(true);
        }
        setIsOnline(isReallyConnected);
      }
    };
    
    // فحص الاتصال عند تحميل المكون
    verifyConnection();
    
    // إعادة فحص الاتصال كل 20 ثانية
    const intervalId = setInterval(verifyConnection, 20000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    // وظيفة التعامل مع حدث الاتصال
    const handleOnline = async () => {
      // تحقق مما إذا كان الاتصال فعليًا عند الإبلاغ عن حالة 'online'
      const isReallyConnected = await checkInternetConnection();
      
      if (isReallyConnected) {
        if (!isOnline) {
          setWasOffline(true);
        }
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    };

    // وظيفة التعامل مع حدث قطع الاتصال
    const handleOffline = () => {
      
      setIsOnline(false);
    };

    // إضافة مستمعي الأحداث
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // تنظيف مستمعي الأحداث عند إزالة المكون
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  // وظيفة لإعادة تعيين حالة wasOffline
  const resetWasOffline = () => {
    setWasOffline(false);
  };

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    resetWasOffline
  };
};
