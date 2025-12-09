/**
 * useDeltaSyncStatus - Hook لمراقبة حالة PowerSync
 *
 * يوفر:
 * - حالة المزامنة الحالية
 * - عدد العمليات المعلقة
 * - وظائف للمزامنة اليدوية
 */

import { useState, useEffect, useCallback } from 'react';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface DeltaSyncStatus {
  isOnline: boolean;
  isInitialized: boolean;
  pendingOutboxCount: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
}

export interface UseDeltaSyncStatusResult {
  /** حالة المزامنة الكاملة */
  status: DeltaSyncStatus | null;
  /** هل النظام متصل */
  isOnline: boolean;
  /** هل تم التهيئة */
  isInitialized: boolean;
  /** عدد العمليات المعلقة في الـ outbox */
  pendingCount: number;
  /** آخر وقت مزامنة */
  lastSyncAt: string | null;
  /** تحميل الحالة */
  isLoading: boolean;
  /** خطأ إن وجد */
  error: string | null;
  /** تحديث الحالة يدوياً */
  refresh: () => Promise<void>;
  /** مزامنة كاملة */
  fullSync: () => Promise<void>;
  /** هل توجد عمليات معلقة */
  hasPendingOperations: boolean;
}

export function useDeltaSyncStatus(
  refreshInterval: number = 5000
): UseDeltaSyncStatusResult {
  const [status, setStatus] = useState<DeltaSyncStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      // ⚡ استخدام PowerSync مباشرة
      const hasPending = await powerSyncService.hasPendingUploads();
      const syncStatus = powerSyncService.syncStatus;

      const currentStatus: DeltaSyncStatus = {
        isOnline: syncStatus?.connected || navigator.onLine,
        isInitialized: true, // ⚡ PowerSync متاح دائماً
        pendingOutboxCount: hasPending ? 1 : 0,
        lastSyncAt: syncStatus?.lastSyncedAt || null,
        isSyncing: syncStatus?.connected && !syncStatus?.hasSynced // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
      };

      setStatus(currentStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStatus();
  }, [fetchStatus]);

  const fullSync = useCallback(async () => {
    try {
      setIsLoading(true);
      // ⚡ استخدام PowerSync مباشرة
      await powerSyncService.forceSync();
      await fetchStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  }, [fetchStatus]);

  // جلب الحالة عند التهيئة
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // تحديث دوري للحالة
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(fetchStatus, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchStatus, refreshInterval]);

  // الاستماع لأحداث الشبكة والمزامنة من PowerSync
  useEffect(() => {
    const handleOnline = () => fetchStatus();
    const handleOffline = () => fetchStatus();
    const handleStatusChange = () => fetchStatus();
    const handleUploadsChange = () => fetchStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('powersync-status-changed', handleStatusChange as EventListener);
    window.addEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('powersync-status-changed', handleStatusChange as EventListener);
      window.removeEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);
    };
  }, [fetchStatus]);

  return {
    status,
    isOnline: status?.isOnline ?? navigator.onLine,
    isInitialized: status?.isInitialized ?? false,
    pendingCount: status?.pendingOutboxCount ?? 0,
    lastSyncAt: status?.lastSyncAt ?? null,
    isLoading,
    error,
    refresh,
    fullSync,
    hasPendingOperations: (status?.pendingOutboxCount ?? 0) > 0
  };
}

/**
 * Hook مبسط للحصول على عدد العمليات المعلقة فقط
 */
export function usePendingOperationsCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        // ⚡ استخدام PowerSync مباشرة
        const hasPending = await powerSyncService.hasPendingUploads();
        setCount(hasPending ? 1 : 0);
      } catch {
        // تجاهل الأخطاء
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 3000);

    return () => clearInterval(interval);
  }, []);

  return count;
}
