/**
 * Tauri Updater Hook
 * يوفر واجهة موحدة للتعامل مع نظام التحديثات في Tauri
 */

import { useCallback, useEffect, useState } from 'react';

// Types
export type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'installing'
  | 'error';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export interface DownloadProgress {
  downloaded: number;
  total: number;
  percent: number;
  bytesPerSecond: number;
}

interface UpdateEvent {
  type: 'checking' | 'available' | 'not-available' | 'progress' | 'downloaded' | 'error' | 'installing';
  info?: UpdateInfo;
  progress?: DownloadProgress;
  message?: string;
  recoverable?: boolean;
  currentVersion?: string;
}

interface CheckResult {
  available: boolean;
  info?: UpdateInfo;
  error?: string;
}

// Check if running in Tauri
const isTauri = (): boolean => {
  return typeof window !== 'undefined' && Boolean(
    (window as any).__TAURI_IPC__ ||
    (window as any).__TAURI__ ||
    (window as any).__TAURI_INTERNALS__
  );
};

// Check if running in Electron (to avoid conflicts)
const isElectron = (): boolean => {
  return typeof window !== 'undefined' && !!(window as any).electronAPI?.updater;
};

export function useTauriUpdater() {
  const [status, setStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);

  // Only use Tauri updater if in Tauri and not in Electron
  const canUse = isTauri() && !isElectron();

  // Get current version
  useEffect(() => {
    if (!canUse) return;

    const getVersion = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const version = await invoke<string>('get_version');
        setCurrentVersion(version);
      } catch (err) {
        console.warn('[TauriUpdater] Failed to get version:', err);
        // Fallback to app API
        try {
          const { getVersion } = await import('@tauri-apps/api/app');
          const version = await getVersion();
          setCurrentVersion(version);
        } catch {
          setCurrentVersion('dev');
        }
      }
    };

    getVersion();
  }, [canUse]);

  // Listen to update events from Rust
  useEffect(() => {
    if (!canUse) return;

    let unlisten: (() => void) | undefined;

    const setupListener = async () => {
      try {
        const { listen } = await import('@tauri-apps/api/event');

        unlisten = await listen<UpdateEvent>('tauri-update', (event) => {
          const { payload } = event;
          console.log('[TauriUpdater] Event received:', payload);

          switch (payload.type) {
            case 'checking':
              setStatus('checking');
              setError(null);
              break;

            case 'available':
              setStatus('available');
              setIsAvailable(true);
              if (payload.info) {
                setUpdateInfo(payload.info);
              }
              break;

            case 'not-available':
              setStatus('not-available');
              setIsAvailable(false);
              setLastCheckTime(new Date());
              break;

            case 'progress':
              setStatus('downloading');
              if (payload.progress) {
                setProgress(payload.progress);
              }
              break;

            case 'downloaded':
              setStatus('downloaded');
              if (payload.info) {
                setUpdateInfo(payload.info);
              }
              break;

            case 'installing':
              setStatus('installing');
              break;

            case 'error':
              // التعامل مع أخطاء عدم وجود الإصدار كحالة عادية
              if (payload.message?.includes('Could not fetch') ||
                  payload.message?.includes('release JSON') ||
                  payload.message?.includes('404') ||
                  payload.message?.includes('not found')) {
                setStatus('not-available');
                setIsAvailable(false);
                setLastCheckTime(new Date());
                console.log('[TauriUpdater] No releases found yet (this is normal for new apps)');
              } else {
                setStatus('error');
                setError(payload.message || 'Unknown error');
              }
              break;
          }
        });
      } catch (err) {
        console.error('[TauriUpdater] Failed to setup listener:', err);
      }
    };

    setupListener();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, [canUse]);

  // Check for updates
  const checkForUpdates = useCallback(async (): Promise<CheckResult> => {
    if (!canUse) {
      return { available: false, error: 'Not running in Tauri' };
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<CheckResult>('check_for_updates');
      setLastCheckTime(new Date());

      if (result.available && result.info) {
        setUpdateInfo(result.info);
        setIsAvailable(true);
      }

      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      setStatus('error');
      return { available: false, error: errorMsg };
    }
  }, [canUse]);

  // Download update
  const downloadUpdate = useCallback(async (): Promise<boolean> => {
    if (!canUse) return false;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const result = await invoke<boolean>('download_update');
      return result;
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      setStatus('error');
      return false;
    }
  }, [canUse]);

  // Install update (restarts the app)
  const installUpdate = useCallback(async (): Promise<void> => {
    if (!canUse) return;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('install_update');
    } catch (err: any) {
      const errorMsg = err?.message || String(err);
      setError(errorMsg);
      setStatus('error');
    }
  }, [canUse]);

  // Download and install in one step
  const downloadAndInstall = useCallback(async (): Promise<void> => {
    const success = await downloadUpdate();
    if (success) {
      await installUpdate();
    }
  }, [downloadUpdate, installUpdate]);

  // Get last check time
  const getLastCheckTime = useCallback(async (): Promise<Date | null> => {
    if (!canUse) return null;

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const time = await invoke<string | null>('get_last_check_time');
      if (time) {
        const date = new Date(time);
        setLastCheckTime(date);
        return date;
      }
      return null;
    } catch {
      return null;
    }
  }, [canUse]);

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
    isInstalling: status === 'installing',
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

export default useTauriUpdater;
