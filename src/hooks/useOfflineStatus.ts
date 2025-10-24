import { useEffect, useState } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';

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
  try {
    const timeout = 3000;
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    
    // إذا كان navigator.onLine يقول أننا أونلاين، نثق به مباشرة
    const navigatorOnline = typeof navigator !== 'undefined' && navigator.onLine === true;
    if (navigatorOnline) {
      return true;
    }

    // Electron IPC path (فقط إذا كان navigator يقول أوفلاين)
    const electronAPI: any = (window as any).electronAPI;
    if (electronAPI?.makeRequest && supabaseUrl) {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const url = `${supabaseUrl}/rest/v1/`;
        const result = await Promise.race([
          electronAPI.makeRequest({ method: 'HEAD', url }),
          new Promise((_, reject) => {
            (controller.signal as AbortSignal).addEventListener('abort', () => reject(new Error('timeout')));
          })
        ]);
        clearTimeout(id);
        return !!(result && result.success === true);
      } catch (error) {
        clearTimeout(id);
      }
    }

    // Browser fetch fallback
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
      const target = supabaseUrl ? `${supabaseUrl}/rest/v1/` : '/';
      const res = await fetch(target, { method: 'HEAD', signal: controller.signal as AbortSignal, cache: 'no-store' });
      clearTimeout(id);
      return res.ok || res.status < 500;
    } catch (error) {
      clearTimeout(id);
      return false; // إذا فشل كل شيء، نعتبره أوفلاين
    }
  } catch (outerError) {
    return false;
  }
};

/**
 * Hook للتعامل مع حالة الاتصال بالإنترنت
 * @returns معلومات عن حالة الاتصال بالإنترنت
 */
export const useOfflineStatus = (): OfflineStatus => {
  const [networkStatus, setNetworkStatus] = useState(() => {
    const status = networkStatusManager.getStatus();
    // افتراض أننا أونلاين بشكل افتراضي إذا كان navigator.onLine صحيحاً
    if (typeof navigator !== 'undefined' && navigator.onLine && !status.isOnline) {
      return { isOnline: true, timestamp: Date.now() };
    }
    return status;
  });
  const isOnline = networkStatus.isOnline;
  
  // تتبع ما إذا كان المستخدم غير متصل سابقًا وعاد للاتصال
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // إجراء فحص نشط للاتصال عند التحميل
  useEffect(() => {
    let isActive = true;
    
    const verifyConnection = async () => {
      if (!isActive) return;
      
      const isReallyConnected = await checkInternetConnection();
      
      if (!isActive) return;
      
      if (isReallyConnected !== networkStatus.isOnline) {
        if (!isReallyConnected && networkStatus.isOnline) {
          setWasOffline(true);
        }
        // بث الحالة مركزياً
        networkStatusManager.setStatus(isReallyConnected);
      }
    };
    
    // فحص الاتصال عند تحميل المكون
    verifyConnection();
    
    // إعادة فحص الاتصال كل 30 ثانية (زيادة لتقليل الضغط)
    const intervalId = setInterval(verifyConnection, 30000);
    
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, []); // dependency array فارغة لتجنب infinite loop

  useEffect(() => {
    // وظيفة التعامل مع حدث الاتصال
    return networkStatusManager.subscribe(status => {
      if (status.isOnline && !networkStatus.isOnline) {
        setWasOffline(true);
      }
      setNetworkStatus(status);
    });
  }, [networkStatus.isOnline]);

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
