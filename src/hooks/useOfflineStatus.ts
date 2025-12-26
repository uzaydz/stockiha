import { useEffect, useState, useCallback, useRef } from 'react';
import { networkStatusManager } from '@/lib/events/networkStatusManager';

/**
 * ⚡ إعدادات فحص الاتصال
 */
const HEALTH_CHECK_CONFIG = {
  /** فاصل فحص صحة الاتصال (بالميلي ثانية) */
  INTERVAL: 30000, // 30 ثانية
  /** مهلة فحص الاتصال (بالميلي ثانية) */
  TIMEOUT: 5000, // 5 ثوانٍ
  /** الحد الأقصى لعدد الفشل المتتالي قبل اعتبار الاتصال منقطعاً */
  MAX_FAILURES: 3,
  /** تأخير بين محاولات إعادة الفحص عند الفشل */
  RETRY_DELAY: 2000, // 2 ثانية
};

interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  wasOffline: boolean;
  resetWasOffline: () => void;
  /** عدد الفشل المتتالي في فحص الاتصال */
  consecutiveFailures: number;
  /** آخر وقت نجاح للفحص */
  lastSuccessTime: number | null;
  /** آخر خطأ حدث */
  lastError: string | null;
  /** هل يتم فحص الاتصال حالياً */
  isChecking: boolean;
  /** فرض فحص الاتصال يدوياً */
  forceCheck: () => Promise<boolean>;
}

/**
 * ⚡ فحص الاتصال بالخادم
 * يستخدم Supabase health endpoint أو fetch بسيط
 */
async function checkServerConnectivity(): Promise<boolean> {
  const isElectron =
    typeof window !== 'undefined' &&
    ((window as any).electronAPI !== undefined ||
      window.navigator?.userAgent?.includes('Electron'));
  const disableInBrowser =
    !isElectron &&
    String(import.meta.env.VITE_DISABLE_OFFLINE_STATUS_WEB ?? 'true') !== 'false';

  // في المتصفح: تعطيل الفحوصات النشطة لتجنب CSP والطلبات الخارجية
  if (disableInBrowser) {
    return typeof navigator !== 'undefined' ? navigator.onLine !== false : false;
  }

  // navigator.onLine قد يكون true حتى مع مشاكل DNS/Proxy، لكن لو كان false فهذا مؤشر قوي
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return false;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_CONFIG.TIMEOUT);

  try {
    // محاولة الوصول للـ Supabase API
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

      // ✅ prefer /auth/v1/health (أكثر استقراراً من /rest/v1/ وقد يرجع 404/401 حسب الإعدادات)
      let response: Response | null = null;
      try {
        response = await fetch(`${supabaseUrl}/auth/v1/health`, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            ...(apikey ? { apikey } : {}),
          },
        });
      } catch {
        // fallback below
      }

      if (!response) {
        response = await fetch(`${supabaseUrl}/rest/v1/`, {
          // Supabase قد لا يسمح بـ HEAD على بعض المسارات عبر CORS، نستخدم GET خفيف
          method: 'GET',
          signal: controller.signal,
          headers: {
            'Cache-Control': 'no-cache',
            ...(apikey ? { apikey } : {}),
          },
        });
      }
      clearTimeout(timeoutId);
      // أي رد HTTP (حتى 401/403/404) يعني أن الخادم reachable؛ الفشل الحقيقي هو network error/timeout
      return response.status >= 200 && response.status < 600;
    }

    // fallback: فحص اتصال عام
    await fetch(location.origin, { method: 'GET', cache: 'no-store', signal: controller.signal });
    clearTimeout(timeoutId);
    return true;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      return false; // timeout
    }
    return false;
  }
}

/**
 * ⚡ Hook محسّن للتعامل مع حالة الاتصال بالإنترنت
 *
 * التحسينات في v2.0:
 * - فحص صحة نشط للخادم
 * - تتبع عدد الفشل المتتالي
 * - تتبع آخر وقت نجاح
 * - تتبع آخر خطأ
 * - دعم الفحص اليدوي
 */
export const useOfflineStatus = (): OfflineStatus => {
  const isElectron =
    typeof window !== 'undefined' &&
    ((window as any).electronAPI !== undefined ||
      window.navigator?.userAgent?.includes('Electron'));
  const disableActiveChecksInBrowser =
    !isElectron &&
    String(import.meta.env.VITE_DISABLE_OFFLINE_STATUS_WEB ?? 'true') !== 'false';

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState<boolean>(false);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [lastSuccessTime, setLastSuccessTime] = useState<number | null>(
    navigator.onLine ? Date.now() : null
  );
  const [lastError, setLastError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // refs لتجنب closure issues
  const isOnlineRef = useRef(isOnline);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // تحديث ref عند تغيير isOnline
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  /**
   * ⚡ فحص الاتصال الفعلي بالخادم
   */
  const performHealthCheck = useCallback(async (): Promise<boolean> => {
    if (!isMountedRef.current) return isOnlineRef.current;

    // في المتصفح: لا تنفّذ فحوصات نشطة، فقط اعتمد على navigator.onLine
    if (disableActiveChecksInBrowser) {
      const nowOnline = navigator.onLine;
      if (nowOnline !== isOnlineRef.current) {
        setIsOnline(nowOnline);
        networkStatusManager.setStatus(nowOnline);
      }
      return nowOnline;
    }

    // لا تفحص إذا كان المتصفح يقول أننا غير متصلين
    if (!navigator.onLine) {
      if (isOnlineRef.current) {
        setIsOnline(false);
        networkStatusManager.setStatus(false);
      }
      return false;
    }

    setIsChecking(true);

    try {
      const isConnected = await checkServerConnectivity();

      if (!isMountedRef.current) return isConnected;

      if (isConnected) {
        // نجاح
        setConsecutiveFailures(0);
        setLastSuccessTime(Date.now());
        setLastError(null);

        if (!isOnlineRef.current) {
          setWasOffline(true);
          setIsOnline(true);
          networkStatusManager.setStatus(true);
        }
      } else {
        // فشل
        setConsecutiveFailures((prev) => {
          const newCount = prev + 1;
          if (newCount >= HEALTH_CHECK_CONFIG.MAX_FAILURES && isOnlineRef.current) {
            setIsOnline(false);
            networkStatusManager.setStatus(false);
            setLastError('فشل الاتصال بالخادم بعد عدة محاولات');
          }
          return newCount;
        });
      }

      setIsChecking(false);
      return isConnected;
    } catch (error: any) {
      if (!isMountedRef.current) return false;

      setLastError(error.message || 'خطأ غير معروف');
      setConsecutiveFailures((prev) => prev + 1);
      setIsChecking(false);
      return false;
    }
  }, []);

  /**
   * ⚡ فحص يدوي للاتصال
   */
  const forceCheck = useCallback(async (): Promise<boolean> => {
    return performHealthCheck();
  }, [performHealthCheck]);

  useEffect(() => {
    isMountedRef.current = true;

    const handleOnline = () => {
      // navigator.onLine أصبح true
      // نتحقق من الاتصال الفعلي
      performHealthCheck();
    };

    const handleOffline = () => {
      if (isOnlineRef.current) {
        setWasOffline(false); // سنعيد تعيينها عند العودة
      }
      setIsOnline(false);
      networkStatusManager.setStatus(false);
      setLastError('انقطع الاتصال بالإنترنت');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // الاشتراك في networkStatusManager للتحديثات من مصادر أخرى
    const unsubscribe = networkStatusManager.subscribe((status) => {
      if (status.isOnline !== isOnlineRef.current) {
        if (status.isOnline && !isOnlineRef.current) {
          setWasOffline(true);
        }
        setIsOnline(status.isOnline);
      }
    });

    // فحص أولي عند التحميل
    if (!disableActiveChecksInBrowser && navigator.onLine) {
      performHealthCheck();
    }

    // فحص دوري
    if (!disableActiveChecksInBrowser) {
      checkIntervalRef.current = setInterval(() => {
        if (navigator.onLine) {
          performHealthCheck();
        }
      }, HEALTH_CHECK_CONFIG.INTERVAL);
    }

    return () => {
      isMountedRef.current = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribe();
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [performHealthCheck, disableActiveChecksInBrowser]);

  // وظيفة لإعادة تعيين حالة wasOffline
  const resetWasOffline = useCallback(() => {
    setWasOffline(false);
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    wasOffline,
    resetWasOffline,
    consecutiveFailures,
    lastSuccessTime,
    lastError,
    isChecking,
    forceCheck,
  };
};

export default useOfflineStatus;
