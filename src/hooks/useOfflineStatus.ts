import { useEffect, useState, useCallback } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
  /** 🆕 عدد الفشل المتتالي (غير مدعوم حالياً) */
  consecutiveFailures: number;
  /** 🆕 آخر وقت نجاح */
  lastSuccessTime: number | null;
  /** 🆕 آخر خطأ */
  lastError: string | null;
}

/**
 * ⚡ Hook محسّن للتعامل مع حالة الاتصال بالإنترنت
 * 
 * يعتمد على navigator.onLine و networkStatusManager
 */
export const useOfflineStatus = (): OfflineStatus => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // تتبع ما إذا كان المستخدم غير متصل سابقًا وعاد للاتصال
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      if (!isOnline) setWasOffline(true);
      setIsOnline(true);
      networkStatusManager.setStatus(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
      networkStatusManager.setStatus(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // الاشتراك في networkStatusManager للتحديثات من مصادر أخرى
    const unsubscribe = networkStatusManager.subscribe((status) => {
      if (status.isOnline !== isOnline) {
        if (status.isOnline && !isOnline) setWasOffline(true);
        setIsOnline(status.isOnline);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
    };
  }, [isOnline]);

  // وظيفة لإعادة تعيين حالة wasOffline
  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    resetWasOffline,
    consecutiveFailures: 0,
    lastSuccessTime: isOnline ? Date.now() : null,
    lastError: null
  };
};
