/**
 * useDeltaSyncStatus - Hook لمراقبة حالة Delta Sync
 *
 * يوفر:
 * - حالة المزامنة الحالية
 * - عدد العمليات المعلقة
 * - وظائف للمزامنة اليدوية
 */

import { useState, useEffect, useCallback } from 'react';
import { deltaSyncEngine, DeltaSyncStatus } from '@/lib/sync/delta';

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
      const currentStatus = await deltaSyncEngine.getStatus();
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
      await deltaSyncEngine.fullSync();
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

  // الاستماع لأحداث الشبكة
  useEffect(() => {
    const handleOnline = () => fetchStatus();
    const handleOffline = () => fetchStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
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
        const status = await deltaSyncEngine.getStatus();
        setCount(status.pendingOutboxCount);
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
