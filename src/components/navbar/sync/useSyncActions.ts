/**
 * ⚡ Hook لإجراءات المزامنة المحسّن
 * @version 2.0.0
 * 
 * المميزات:
 * - تكامل مباشر مع PowerSync
 * - معالجة أخطاء محسّنة
 * - إشعارات واضحة
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const isDev = process.env.NODE_ENV === 'development';

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 Types
// ═══════════════════════════════════════════════════════════════════════════════

interface UseSyncActionsOptions {
  organizationId: string | undefined;
  isOnline: boolean;
  onSyncComplete?: () => void;
}

interface UseSyncActionsResult {
  isSyncing: boolean;
  isFullSyncing: boolean;
  isForceSending: boolean;
  lastSyncAt: number | null;
  lastSyncError: string | null;
  runSync: (origin?: 'auto' | 'manual') => Promise<void>;
  runFullSync: () => Promise<void>;
  forceSendPending: () => Promise<void>;
  clearPendingOutbox: () => Promise<void>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 Hook
// ═══════════════════════════════════════════════════════════════════════════════

export function useSyncActions({
  organizationId,
  isOnline,
  onSyncComplete
}: UseSyncActionsOptions): UseSyncActionsResult {
  
  // ⚡ الحالات
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [isForceSending, setIsForceSending] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('navbarSync_lastSyncAt');
    return saved ? Number(saved) : null;
  });

  const syncingRef = useRef(false);

  // ⚡ تحديث وقت آخر مزامنة
  const updateLastSyncAt = useCallback((time: number) => {
    setLastSyncAt(time);
    localStorage.setItem('navbarSync_lastSyncAt', String(time));
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔹 مزامنة عادية
  // ═══════════════════════════════════════════════════════════════════════════

  const runSync = useCallback(async (origin: 'auto' | 'manual' = 'auto') => {
    if (!organizationId) return;

    if (!isOnline) {
      if (origin === 'manual') {
        toast.error('غير متصل بالإنترنت', {
          description: 'يرجى الاتصال بالإنترنت أولاً للمزامنة'
        });
      }
      return;
    }

    if (syncingRef.current) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);

    try {
      if (isDev) {
        console.log('[useSyncActions] ⚡ Starting PowerSync...');
      }

      // ⚡ التحقق من التهيئة
      const isReady = await powerSyncService.waitForInitialization(5000);
      if (!isReady) {
        if (origin === 'manual') {
          toast.info('جارٍ تهيئة النظام...', {
            description: 'يرجى الانتظار ثم إعادة المحاولة'
          });
        }
        return;
      }

      // ⚡ تشغيل المزامنة
      await powerSyncService.forceSync();

      updateLastSyncAt(Date.now());

      if (origin === 'manual') {
        toast.success('تمت المزامنة بنجاح', {
          description: '⚡ جميع البيانات محدثة'
        });
      }

      onSyncComplete?.();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل في مزامنة البيانات';

      // ⚡ تجاهل أخطاء التهيئة
      if (message.includes('Not initialized') || message.includes('Database not initialized')) {
        if (isDev) {
          console.log('[useSyncActions] ⏳ Not initialized, will retry later');
        }
        return;
      }

      setLastSyncError(message);

      if (origin === 'manual') {
        toast.error('تعذر إكمال المزامنة', { 
          description: getErrorMessageAr(message)
        });
      }

      if (isDev) {
        console.error('[useSyncActions] Error:', error);
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [organizationId, isOnline, updateLastSyncAt, onSyncComplete]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔹 إصلاح المزامنة (إعادة تحميل كاملة)
  // ═══════════════════════════════════════════════════════════════════════════

  const runFullSync = useCallback(async () => {
    if (!organizationId) {
      toast.error('لا يمكن المزامنة', { 
        description: 'لم يتم تحديد المنظمة بعد' 
      });
      return;
    }

    if (!isOnline) {
      toast.error('غير متصل بالإنترنت', { 
        description: 'يرجى الاتصال بالإنترنت أولاً' 
      });
      return;
    }

    if (isFullSyncing || isSyncing) {
      toast.info('المزامنة جارية بالفعل');
      return;
    }

    setIsFullSyncing(true);
    setLastSyncError(null);

    const loadingToast = toast.loading('جارٍ إصلاح المزامنة...', {
      description: 'يتم إعادة تحميل البيانات من السيرفر'
    });

    try {
      // ⚡ التحقق من التهيئة
      const isReady = await powerSyncService.waitForInitialization(10000);
      if (!isReady) {
        toast.dismiss(loadingToast);
        toast.info('جارٍ تهيئة النظام...', { 
          description: 'يرجى الانتظار ثم إعادة المحاولة' 
        });
        return;
      }

      // ⚡ إجبار المزامنة الكاملة
      await powerSyncService.forceSync();

      toast.dismiss(loadingToast);
      toast.success('تم إصلاح المزامنة بنجاح', {
        description: '⚡ البيانات محدثة بالكامل'
      });

      updateLastSyncAt(Date.now());
      onSyncComplete?.();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل في إصلاح المزامنة';

      setLastSyncError(message);

      toast.dismiss(loadingToast);
      toast.error('فشل إصلاح المزامنة', { 
        description: getErrorMessageAr(message)
      });

      if (isDev) {
        console.error('[useSyncActions] Full sync error:', error);
      }
    } finally {
      setIsFullSyncing(false);
    }
  }, [organizationId, isOnline, isFullSyncing, isSyncing, updateLastSyncAt, onSyncComplete]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔹 إرسال العمليات المعلقة
  // ═══════════════════════════════════════════════════════════════════════════

  const forceSendPending = useCallback(async () => {
    if (!isOnline) {
      toast.error('غير متصل بالإنترنت', {
        description: 'يرجى الاتصال بالإنترنت أولاً'
      });
      return;
    }

    if (isForceSending) {
      toast.info('الإرسال جارٍ بالفعل');
      return;
    }

    setIsForceSending(true);
    const loadingToast = toast.loading('جارٍ إرسال العمليات المعلقة...', {
      description: 'يتم رفع البيانات إلى السيرفر'
    });

    try {
      await powerSyncService.forceSync();

      toast.dismiss(loadingToast);
      toast.success('تم إرسال العمليات بنجاح', {
        description: '✅ جميع العمليات المعلقة تم رفعها'
      });

      onSyncComplete?.();
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error('فشل في إرسال العمليات', {
        description: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    } finally {
      setIsForceSending(false);
    }
  }, [isOnline, isForceSending, onSyncComplete]);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔹 حذف العمليات المعلقة
  // ═══════════════════════════════════════════════════════════════════════════

  const clearPendingOutbox = useCallback(async () => {
    toast.info('هذه الميزة غير متوفرة', {
      description: 'PowerSync يدير العمليات المعلقة تلقائياً'
    });
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // 🔹 Return
  // ═══════════════════════════════════════════════════════════════════════════

  return {
    isSyncing,
    isFullSyncing,
    isForceSending,
    lastSyncAt,
    lastSyncError,
    runSync,
    runFullSync,
    forceSendPending,
    clearPendingOutbox
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 🔹 مساعدات
// ═══════════════════════════════════════════════════════════════════════════════

function getErrorMessageAr(error: string): string {
  if (error.includes('PSYNC_S2002')) {
    return 'Sync Rules غير منشورة - يرجى نشرها من PowerSync Dashboard';
  }
  if (error.includes('network') || error.includes('fetch')) {
    return 'خطأ في الشبكة - تحقق من اتصالك بالإنترنت';
  }
  if (error.includes('auth') || error.includes('token')) {
    return 'خطأ في المصادقة - يرجى تسجيل الدخول مرة أخرى';
  }
  if (error.includes('timeout')) {
    return 'انتهت مهلة الاتصال - يرجى المحاولة مرة أخرى';
  }
  return error;
}
