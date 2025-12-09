/**
 * ⚡ useSyncStatus - Hook لحالة المزامنة
 * 
 * يوفر:
 * - حالة الاتصال (Online/Offline)
 * - حالة PowerSync
 * - عدد العمليات المعلقة
 * - آخر وقت مزامنة
 * - أدوات المزامنة اليدوية
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ========================================
// 📦 Types
// ========================================

export type ConnectionStatus = 'online' | 'offline' | 'connecting' | 'syncing';

export interface SyncStatusInfo {
  // Connection
  isOnline: boolean;
  connectionStatus: ConnectionStatus;
  
  // PowerSync
  isInitialized: boolean;
  isConnected: boolean;
  hasSynced: boolean;
  
  // Pending operations
  pendingUploadCount: number;
  hasPendingUploads: boolean;
  
  // Timing
  lastSyncedAt: Date | null;
  lastSyncedAtFormatted: string;
  timeSinceLastSync: string;
  
  // Actions
  sync: () => Promise<void>;
  forceSync: () => Promise<void>;
  reconnect: () => Promise<void>;
  
  // State
  isSyncing: boolean;
  syncError: Error | null;
}

// ========================================
// 🔧 Hook Implementation
// ========================================

export function useSyncStatus(): SyncStatusInfo {
  // Connection state
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('online');
  
  // PowerSync state
  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  
  // Pending operations
  const [pendingUploadCount, setPendingUploadCount] = useState(0);
  
  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<Error | null>(null);

  // ⚡ Update connection status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setConnectionStatus('online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setConnectionStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // ⚡ Monitor PowerSync status
  useEffect(() => {
    const updatePowerSyncStatus = async () => {
      try {
        setIsInitialized(powerSyncService.isInitialized);
        
        const status = powerSyncService.syncStatus;
        if (status) {
          setIsConnected(status.connected || false);
          setHasSynced(status.hasSynced || false);
          
          if (status.lastSyncedAt) {
            setLastSyncedAt(new Date(status.lastSyncedAt));
          }
        }

        // Check pending uploads
        const hasPending = await powerSyncService.hasPendingUploads();
        if (hasPending) {
          const count = await powerSyncService.getPendingUploadCount();
          setPendingUploadCount(count);
        } else {
          setPendingUploadCount(0);
        }
      } catch (error) {
        console.error('[useSyncStatus] Error updating status:', error);
      }
    };

    // Initial update
    updatePowerSyncStatus();

    // Poll for updates
    const intervalId = setInterval(updatePowerSyncStatus, 5000);

    // Listen for PowerSync events
    const handleStatusChange = () => {
      updatePowerSyncStatus();
    };

    window.addEventListener('powersync-status-changed', handleStatusChange);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('powersync-status-changed', handleStatusChange);
    };
  }, []);

  // ⚡ Sync action
  const sync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);
    setSyncError(null);
    setConnectionStatus('syncing');

    try {
      await powerSyncService.forceSync();
      setLastSyncedAt(new Date());
      setConnectionStatus(isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('[useSyncStatus] Sync error:', error);
      setSyncError(error instanceof Error ? error : new Error('Sync failed'));
      setConnectionStatus(isOnline ? 'online' : 'offline');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  // ⚡ Force sync action
  const forceSync = useCallback(async () => {
    if (!isOnline) {
      console.log('[useSyncStatus] Cannot force sync while offline');
      return;
    }
    await sync();
  }, [isOnline, sync]);

  // ⚡ Reconnect action
  const reconnect = useCallback(async () => {
    setConnectionStatus('connecting');
    
    try {
      await powerSyncService.reconnect();
      setConnectionStatus(isOnline ? 'online' : 'offline');
    } catch (error) {
      console.error('[useSyncStatus] Reconnect error:', error);
      setConnectionStatus(isOnline ? 'online' : 'offline');
    }
  }, [isOnline]);

  // ⚡ Computed values
  const lastSyncedAtFormatted = useMemo(() => {
    if (!lastSyncedAt) return 'لم تتم المزامنة بعد';
    
    return lastSyncedAt.toLocaleString('ar-DZ', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    });
  }, [lastSyncedAt]);

  const timeSinceLastSync = useMemo(() => {
    if (!lastSyncedAt) return 'غير معروف';
    
    const seconds = Math.floor((Date.now() - lastSyncedAt.getTime()) / 1000);
    
    if (seconds < 60) return 'الآن';
    if (seconds < 3600) return `منذ ${Math.floor(seconds / 60)} دقيقة`;
    if (seconds < 86400) return `منذ ${Math.floor(seconds / 3600)} ساعة`;
    return `منذ ${Math.floor(seconds / 86400)} يوم`;
  }, [lastSyncedAt]);

  const hasPendingUploads = pendingUploadCount > 0;

  return {
    isOnline,
    connectionStatus,
    isInitialized,
    isConnected,
    hasSynced,
    pendingUploadCount,
    hasPendingUploads,
    lastSyncedAt,
    lastSyncedAtFormatted,
    timeSinceLastSync,
    sync,
    forceSync,
    reconnect,
    isSyncing,
    syncError
  };
}

// ========================================
// 🔧 Simplified Online Status Hook
// ========================================

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

// ========================================
// 🔧 Pending Uploads Hook
// ========================================

export function usePendingUploads() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const checkPending = useCallback(async () => {
    setLoading(true);
    try {
      const pendingCount = await powerSyncService.getPendingUploadCount();
      setCount(pendingCount);
    } catch (error) {
      console.error('[usePendingUploads] Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkPending();
    
    const intervalId = setInterval(checkPending, 10000);
    
    return () => clearInterval(intervalId);
  }, [checkPending]);

  return { count, hasPending: count > 0, loading, refresh: checkPending };
}

export default useSyncStatus;

