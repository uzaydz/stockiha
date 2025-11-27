import { useEffect, useState, useCallback } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';
import { connectionState } from '@/lib/sync/delta/ConnectionState';

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
  /** 🆕 عدد الفشل المتتالي (من ConnectionState) */
  consecutiveFailures: number;
  /** 🆕 آخر وقت نجاح */
  lastSuccessTime: number | null;
  /** 🆕 آخر خطأ */
  lastError: string | null;
}

/**
 * ⚡ فحص الاتصال باستخدام ConnectionState الذكي
 * 
 * الآن يعتمد على ConnectionState كمصدر أساسي للحقيقة:
 * - ConnectionState يتتبع نجاح/فشل الطلبات الفعلية
 * - 2 فشل متتالي = Offline
 * - 1 نجاح = Online
 * 
 * @returns وعد بوليان يشير إلى حالة الاتصال الحقيقية
 */
const checkInternetConnection = async (): Promise<boolean> => {
  // ⚡ استخدام ConnectionState كمصدر أساسي للحقيقة
  // هذا أدق من navigator.onLine لأنه يعتمد على نتائج الطلبات الفعلية
  const connectionStatus = connectionState.isOnline();
  
  // إذا كان ConnectionState يقول أننا offline، ثق به
  if (!connectionStatus) {
    console.log('[useOfflineStatus] ⚡ ConnectionState says OFFLINE');
    return false;
  }
  
  // إذا كان ConnectionState يقول أننا online، تحقق إضافي اختياري
  // (ConnectionState يُحدّث تلقائياً من supabase-unified و NetworkQuality)
  return true;
};

/**
 * ⚡ Hook محسّن للتعامل مع حالة الاتصال بالإنترنت
 * 
 * يستخدم ConnectionState كمصدر أساسي للحقيقة:
 * - يتتبع نجاح/فشل الطلبات الفعلية
 * - 2 فشل متتالي = Offline
 * - 1 نجاح = Online
 * 
 * @returns معلومات شاملة عن حالة الاتصال بالإنترنت
 */
export const useOfflineStatus = (): OfflineStatus => {
  // ⚡ الحالة الأساسية من ConnectionState
  const [connectionStatus, setConnectionStatus] = useState(() => connectionState.getState());
  
  // تتبع ما إذا كان المستخدم غير متصل سابقًا وعاد للاتصال
  const [wasOffline, setWasOffline] = useState<boolean>(false);

  // ⚡ الاشتراك في تغييرات ConnectionState
  useEffect(() => {
    const unsubscribe = connectionState.subscribe((newStatus) => {
      // تتبع إذا كنا offline ثم عدنا online
      if (newStatus.isOnline && !connectionStatus.isOnline) {
        setWasOffline(true);
      }
      setConnectionStatus(newStatus);
      
      // مزامنة مع networkStatusManager للتوافق مع الكود القديم
      networkStatusManager.setStatus(newStatus.isOnline);
    });
    
    return unsubscribe;
  }, [connectionStatus.isOnline]);

  // ⚡ الاستماع أيضاً لـ connection-state-change event للتوافق
  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      const { isOnline: newIsOnline } = event.detail;
      if (newIsOnline && !connectionStatus.isOnline) {
        setWasOffline(true);
      }
    };
    
    window.addEventListener('connection-state-change', handleConnectionChange as EventListener);
    return () => {
      window.removeEventListener('connection-state-change', handleConnectionChange as EventListener);
    };
  }, [connectionStatus.isOnline]);

  // وظيفة لإعادة تعيين حالة wasOffline
  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline: connectionStatus.isOnline,
    isOffline: !connectionStatus.isOnline,
    wasOffline,
    resetWasOffline,
    // ⚡ معلومات إضافية من ConnectionState
    consecutiveFailures: connectionStatus.consecutiveFailures,
    lastSuccessTime: connectionStatus.lastSuccessTime,
    lastError: connectionStatus.lastError
  };
};
