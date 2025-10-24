import { networkStatusManager } from '@/lib/events/networkStatusManager';

// تهيئة lastKnownOnline عند البدء لضمان أن التطبيق يبدأ في وضع online
let lastKnownOnline = Date.now();
let forcedOfflineAt = 0;

// تهيئة فورية عند تحميل الملف
if (typeof window !== 'undefined') {
  (window as any).__lastKnownOnline = lastKnownOnline;
  (window as any).__networkForcedOffline = 0;
}

const setForcedOffline = (value: boolean) => {
  forcedOfflineAt = value ? Date.now() : 0;
  if (typeof window !== 'undefined') {
    (window as any).__networkForcedOffline = forcedOfflineAt;
  }
};

export const markNetworkOnline = () => {
  lastKnownOnline = Date.now();
  setForcedOffline(false);
  if (typeof window !== 'undefined') {
    (window as any).__lastKnownOnline = lastKnownOnline;
  }
  // بث حالة الاتصال الموحدة
  try {
    networkStatusManager.setStatus(true);
  } catch {
    // ignore
  }
};

export const markNetworkOffline = (options: { force?: boolean } = {}) => {
  const { force = false } = options;
  const now = Date.now();

  if (force) {
    setForcedOffline(true);
  } else {
    const hasNavigator = typeof navigator !== 'undefined';
    if (hasNavigator && navigator.onLine === false) {
      setForcedOffline(true);
    } else if (!forcedOfflineAt) {
      const reference =
        (typeof window !== 'undefined' && (window as any).__lastKnownOnline) ||
        lastKnownOnline;
      if (!reference || now - reference >= 30_000) {
        setForcedOffline(true);
      }
    }
  }

  if (forcedOfflineAt) {
    lastKnownOnline = 0;
    if (typeof window !== 'undefined') {
      (window as any).__lastKnownOnline = 0;
    }
  }
 
   // بث حالة الانقطاع الموحدة
   try {
     networkStatusManager.setStatus(false);
   } catch {
     // ignore
   }
};

export const isAppOnline = (): boolean => {
  // ✅ الأولوية المطلقة لـ navigator.onLine
  if (typeof navigator !== 'undefined') {
    // إذا كان navigator.onLine = true، نحن أونلاين بدون شك
    if (navigator.onLine === true) {
      // تحديث lastKnownOnline تلقائياً
      markNetworkOnline();
      return true;
    }
    // إذا كان navigator.onLine = false، نحن أوفلاين بدون شك
    if (navigator.onLine === false) {
      return false;
    }
  }

  // ✅ التحقق من الإجبار على الأوفلاين (فقط إذا لم يكن navigator.onLine متاحاً)
  const forcedOfflineTimestamp =
    (typeof window !== 'undefined' && (window as any).__networkForcedOffline) ||
    forcedOfflineAt ||
    0;

  if (forcedOfflineTimestamp) {
    // إذا مر أكثر من 30 ثانية، نلغي الإجبار
    const timeSinceForced = Date.now() - forcedOfflineTimestamp;
    if (timeSinceForced > 30_000) {
      setForcedOffline(false);
    } else {
      return false;
    }
  }

  // ✅ Fallback: التحقق من آخر اتصال معروف
  const fallbackTimestamp =
    (typeof window !== 'undefined' && (window as any).__lastKnownOnline) ||
    lastKnownOnline ||
    0;

  if (!fallbackTimestamp) {
    // إذا لم يكن هناك timestamp، نفترض أونلاين
    markNetworkOnline();
    return true;
  }

  const MAX_OFFLINE_GRACE_PERIOD = 5 * 60 * 1000;
  return Date.now() - fallbackTimestamp < MAX_OFFLINE_GRACE_PERIOD;
};
