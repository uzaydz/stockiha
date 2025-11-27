/**
 * ⚡ Hook لإجراءات المزامنة
 */

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { deltaSyncEngine, outboxManager, batchSender } from '@/lib/sync/delta';
import { repairSync } from '@/lib/sync/TauriSyncService';

const isDev = process.env.NODE_ENV === 'development';

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

export function useSyncActions({ 
  organizationId, 
  isOnline, 
  onSyncComplete 
}: UseSyncActionsOptions): UseSyncActionsResult {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFullSyncing, setIsFullSyncing] = useState(false);
  const [isForceSending, setIsForceSending] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  
  // ⚡ حفظ واسترجاع lastSyncAt من localStorage
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(() => {
    if (typeof window === 'undefined') return null;
    const saved = localStorage.getItem('navbarSync_lastSyncAt');
    return saved ? Number(saved) : null;
  });

  const syncingRef = useRef(false);

  // حفظ lastSyncAt عند التغيير
  const updateLastSyncAt = useCallback((time: number) => {
    setLastSyncAt(time);
    localStorage.setItem('navbarSync_lastSyncAt', String(time));
  }, []);

  // ⚡ مزامنة عادية
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

    // ⚡ التحقق من تهيئة Delta Sync قبل المزامنة
    try {
      const status = await deltaSyncEngine.getStatus();
      if (!status.isInitialized) {
        if (isDev) {
          console.log('[useSyncActions] ⏳ Delta Sync not initialized yet, skipping...');
        }
        return;
      }
    } catch {
      // تجاهل أخطاء التحقق - سنحاول المزامنة على أي حال
    }

    syncingRef.current = true;
    setIsSyncing(true);
    setLastSyncError(null);
    
    // ⚡ إرسال حدث بدء المزامنة (لمنع قراءة الإحصائيات أثناء الكتابة)
    window.dispatchEvent(new Event('sync-started'));

    try {
      if (isDev) {
        console.log('[useSyncActions] ⚡ Starting Delta Sync...');
      }

      await deltaSyncEngine.fullSync();

      updateLastSyncAt(Date.now());

      if (origin === 'manual') {
        const deltaInfo = await deltaSyncEngine.getStatus();
        const totalPending = deltaInfo.pendingOutboxCount || 0;

        if (totalPending === 0) {
          toast.success('تمت المزامنة بنجاح', {
            description: '⚡ جميع البيانات محدثة'
          });
        } else {
          toast.message(`لا تزال هناك ${totalPending} عناصر معلقة`);
        }
      }

      onSyncComplete?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل في مزامنة البيانات';
      
      // ⚡ تجاهل أخطاء التهيئة - ستُحل تلقائياً عند اكتمال التهيئة
      if (message.includes('Not initialized') || message.includes('Database not initialized')) {
        if (isDev) {
          console.log('[useSyncActions] ⏳ Ignoring init error, will retry later');
        }
        return;
      }
      
      setLastSyncError(message);

      if (origin === 'manual') {
        toast.error('تعذر إكمال المزامنة', { description: message });
      }
    } finally {
      syncingRef.current = false;
      setIsSyncing(false);
    }
  }, [organizationId, isOnline, updateLastSyncAt, onSyncComplete]);

  // ⚡ إصلاح المزامنة
  const runFullSync = useCallback(async () => {
    if (!organizationId) {
      toast.error('لا يمكن المزامنة', { description: 'لم يتم تحديد المنظمة بعد' });
      return;
    }

    if (!isOnline) {
      toast.error('غير متصل بالإنترنت', { description: 'يرجى الاتصال بالإنترنت أولاً' });
      return;
    }

    if (isFullSyncing || isSyncing) {
      toast.info('المزامنة جارية بالفعل');
      return;
    }

    // ⚡ التحقق من تهيئة Delta Sync
    try {
      const status = await deltaSyncEngine.getStatus();
      if (!status.isInitialized) {
        toast.info('جارٍ تهيئة النظام...', { description: 'يرجى الانتظار قليلاً ثم إعادة المحاولة' });
        return;
      }
    } catch {
      // تجاهل أخطاء التحقق
    }

    setIsFullSyncing(true);
    setLastSyncError(null);
    
    // ⚡ إرسال حدث بدء المزامنة
    window.dispatchEvent(new Event('sync-started'));

    const loadingToast = toast.loading('جارٍ إصلاح المزامنة...', {
      description: 'يتم إعادة ضبط البيانات المحلية'
    });

    try {
      const result = await repairSync(organizationId);

      if (result.success) {
        await deltaSyncEngine.fullSync();

        toast.dismiss(loadingToast);
        toast.success('تم إصلاح المزامنة بنجاح', {
          description: result.message || '⚡ البيانات محدثة'
        });

        updateLastSyncAt(Date.now());
        onSyncComplete?.();
      } else {
        throw new Error(result.message || 'فشل إصلاح المزامنة');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل في إصلاح المزامنة';
      
      // ⚡ تجاهل أخطاء التهيئة
      if (message.includes('Not initialized') || message.includes('Database not initialized')) {
        toast.dismiss(loadingToast);
        toast.info('جارٍ تهيئة النظام...', { description: 'يرجى الانتظار ثم إعادة المحاولة' });
        return;
      }
      
      setLastSyncError(message);

      toast.dismiss(loadingToast);
      toast.error('فشل إصلاح المزامنة', { description: message });
    } finally {
      setIsFullSyncing(false);
    }
  }, [organizationId, isOnline, isFullSyncing, isSyncing, updateLastSyncAt, onSyncComplete]);

  // ⚡ إرسال العمليات المعلقة
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
      description: 'يتم معالجة الطلبات مباشرة'
    });

    try {
      // إعادة العمليات العالقة
      const requeuedStuck = await outboxManager.requeueStuck();
      const requeuedFailed = await outboxManager.requeueFailed();

      if (isDev && (requeuedStuck > 0 || requeuedFailed > 0)) {
        console.log('[useSyncActions] 📤 Requeued:', { stuck: requeuedStuck, failed: requeuedFailed });
      }

      // إرسال الدفعة
      const result = await batchSender.sendNow();

      toast.dismiss(loadingToast);

      if (result.processedCount > 0) {
        toast.success(`تم إرسال ${result.processedCount} عملية بنجاح`, {
          description: result.failedCount > 0
            ? `فشلت ${result.failedCount} عملية`
            : 'جميع العمليات تمت بنجاح'
        });
      } else if (result.failedCount > 0) {
        toast.error(`فشل إرسال ${result.failedCount} عملية`, {
          description: result.errors[0]?.error || 'خطأ غير معروف'
        });
      } else {
        toast.info('لا توجد عمليات معلقة للإرسال');
      }

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

  // ⚡ حذف العمليات المعلقة
  const clearPendingOutbox = useCallback(async () => {
    try {
      const statsBefore = await outboxManager.getStats();
      await outboxManager.clear();
      const statsAfter = await outboxManager.getStats();

      if (statsAfter.total === 0) {
        toast.success('تم حذف العمليات المعلقة بنجاح', {
          description: `تم حذف ${statsBefore.total} عملية`
        });
      } else {
        toast.warning('تم الحذف جزئياً', {
          description: `بقيت ${statsAfter.total} عملية`
        });
      }

      onSyncComplete?.();
    } catch (error) {
      toast.error('فشل حذف العمليات المعلقة', {
        description: error instanceof Error ? error.message : 'خطأ غير معروف'
      });
    }
  }, [onSyncComplete]);

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
