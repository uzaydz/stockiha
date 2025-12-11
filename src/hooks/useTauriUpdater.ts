/**
 * Desktop Updater Hook
 * Provides a unified interface for handling auto-updates
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * @deprecated Use useElectronUpdater or @/lib/desktop/updater directly
 */

import { useCallback, useEffect, useState } from 'react';
import {
  isElectron,
  updater,
  initializeUpdaterListeners,
} from '@/lib/desktop';
import type { UpdateInfo, DownloadProgress, UpdateStatus } from '@/lib/desktop/types';

// Re-export types for backward compatibility
export type { UpdateInfo, DownloadProgress, UpdateStatus };

interface CheckResult {
  available: boolean;
  info?: UpdateInfo;
  error?: string;
}

export function useTauriUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Check if updater is available
  const canUse = isElectron() && updater.isAvailable();

  // Get current version
  useEffect(() => {
    if (!canUse) return;

    const getVersion = async () => {
      try {
        const version = await updater.getVersion();
        setCurrentVersion(version);
      } catch (err) {
        console.warn('[Updater] Failed to get version:', err);
        setCurrentVersion('dev');
      }
    };

    getVersion();
  }, [canUse]);

  // Setup event listeners
  useEffect(() => {
    if (!canUse) return;

    // Initialize listeners and subscribe to state changes
    const cleanupListeners = initializeUpdaterListeners();

    const unsubscribe = updater.subscribe((state) => {
      setStatus(state.status);

      if (state.updateInfo) {
        setUpdateInfo(state.updateInfo);
      }

      if (state.downloadProgress) {
        setProgress({
          bytesPerSecond: state.downloadProgress.bytesPerSecond,
          percent: state.downloadProgress.percent,
          downloaded: state.downloadProgress.transferred,
          total: state.downloadProgress.total,
        });
      }

      if (state.error) {
        setError(state.error);
      }

      // Update isAvailable based on status
      setIsAvailable(state.status === 'available' || state.status === 'downloaded');

      // Update lastCheckTime when check completes
      if (state.status === 'available' || state.status === 'not-available') {
        setLastCheckTime(new Date());
      }
    });

    return () => {
      unsubscribe();
      cleanupListeners();
    };
  }, [canUse]);

  // Check for updates
  const checkForUpdates = useCallback(async (): Promise<CheckResult> => {
    if (!canUse) {
      return { available: false, error: 'Not running in Electron' };
    }

    try {
      await updater.checkForUpdates();

      // Wait a bit for the state to update
      await new Promise((resolve) => setTimeout(resolve, 100));

      const state = updater.getState();
      setLastCheckTime(new Date());

      return {
        available: state.status === 'available',
        info: state.updateInfo,
        error: state.error,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('error');
      return { available: false, error: errorMsg };
    }
  }, [canUse]);

  // Download update
  const downloadUpdate = useCallback(async (): Promise<boolean> => {
    if (!canUse) return false;

    try {
      await updater.downloadUpdate();
      return true;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [canUse]);

  // Install update (restarts the app)
  const installUpdate = useCallback(async (): Promise<void> => {
    if (!canUse) return;

    try {
      // لا ننتظر النتيجة لأن quitAndInstall سيغلق التطبيق فوراً
      updater.quitAndInstall().catch(() => {
        // تجاهل الأخطاء لأن التطبيق سيغلق
      });
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setError(errorMsg);
      setStatus('error');
    }
  }, [canUse]);

  // Download and install in one step
  const downloadAndInstall = useCallback(async (): Promise<void> => {
    const success = await downloadUpdate();
    if (success) {
      // Wait for download to complete
      await new Promise((resolve) => setTimeout(resolve, 500));
      await installUpdate();
    }
  }, [downloadUpdate, installUpdate]);

  // Get last check time
  const getLastCheckTime = useCallback(async (): Promise<Date | null> => {
    return lastCheckTime;
  }, [lastCheckTime]);

  // Format bytes to human readable
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Format time ago
  const formatTimeAgo = useCallback((date: Date | null): string => {
    if (!date) return 'لم يتم التحقق';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  }, []);

  return {
    // State
    status,
    updateInfo,
    progress,
    error,
    currentVersion,
    lastCheckTime,
    isAvailable,

    // Computed
    isChecking: status === 'checking',
    isDownloading: status === 'downloading',
    isDownloaded: status === 'downloaded',
    isInstalling: false, // Electron doesn't have a separate installing state
    hasError: status === 'error',
    canUse,

    // Actions
    checkForUpdates,
    downloadUpdate,
    installUpdate,
    downloadAndInstall,
    getLastCheckTime,

    // Utilities
    formatBytes,
    formatTimeAgo,
  };
}

// Alias for backward compatibility
export const useElectronUpdater = useTauriUpdater;

export default useTauriUpdater;
