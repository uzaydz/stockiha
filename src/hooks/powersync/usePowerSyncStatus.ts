/**
 * 🎣 usePowerSyncStatus Hook
 * React Hook لمراقبة حالة المزامنة
 */

import { useEffect, useState } from 'react';
import { usePowerSync } from './usePowerSync';
import type { SyncStatus } from '@powersync/web';

export function usePowerSyncStatus() {
  // حماية من أي أخطاء غير متوقعة أثناء الحصول على سياق PowerSync
  let db: any = null;
  let isReady = false;
  try {
    const ctx = usePowerSync();
    db = ctx.db;
    isReady = ctx.isReady;
  } catch (error) {
    console.warn('[usePowerSyncStatus] PowerSync context unavailable:', error);
    // نعيد قيم افتراضية آمنة لاحقاً
  }
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [pendingUploads, setPendingUploads] = useState(0);

  useEffect(() => {
    if (!db || !isReady) return;

    let isCancelled = false;

    // الاستماع لتغيرات الحالة
    const handleStatusChange = (event: CustomEvent) => {
      const newStatus = event.detail as SyncStatus;
      setStatus(newStatus);
      setIsConnected(newStatus.connected || false);
      setHasSynced(newStatus.hasSynced || false);
    };

    const handleUploadsChange = (event: CustomEvent) => {
      setPendingUploads(event.detail.count || 0);
    };

    window.addEventListener('powersync-status-changed', handleStatusChange as EventListener);
    window.addEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);

    // جلب الحالة الأولية
    try {
      const initialStatus = (db as any)?.currentStatus as SyncStatus | undefined | null;
      if (initialStatus) {
        setStatus(initialStatus);
        setIsConnected(initialStatus.connected || false);
        setHasSynced(initialStatus.hasSynced || false);
      } else {
        // إذا لم تكن هناك حالة متاحة بعد، حافظ على القيم الآمنة
        setStatus(null);
        setIsConnected(false);
        setHasSynced(false);
      }
    } catch (error) {
      console.warn('[usePowerSyncStatus] Failed to read initial status', error);
      setStatus(null);
      setIsConnected(false);
      setHasSynced(false);
    }

    return () => {
      window.removeEventListener('powersync-status-changed', handleStatusChange as EventListener);
      window.removeEventListener('powersync-uploads-changed', handleUploadsChange as EventListener);
      isCancelled = true;
    };
  }, [db, isReady]);

  return {
    status,
    isConnected,
    hasSynced,
    isOnline: isConnected,
    isOffline: !isConnected,
    isSyncing: status?.dataFlowStatus?.downloading || status?.dataFlowStatus?.uploading || false,
    pendingUploads,
    lastSyncedAt: status?.lastSyncedAt || null,
  };
}
