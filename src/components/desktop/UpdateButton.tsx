import React, { useState, useEffect, useRef } from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useElectronUpdater } from '@/hooks/useTauriUpdater';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
  bytesPerSecond: number;
}

type UpdateStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'not-available'
  | 'downloading'
  | 'downloaded'
  | 'error';

const UpdateButton: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastCheckTime, setLastCheckTime] = useState<Date | null>(null);
  const [isDevMode, setIsDevMode] = useState(false);
  const checkingTimeoutRef = useRef<number | null>(null);

  // Electron Updater Hook
  const electronUpdater = useElectronUpdater();

  // Check for Electron
  const isElectron = typeof window !== 'undefined' && (
    (window as any).electronAPI?.updater ||
    (window as any).electronAPI ||
    (window as any).__ELECTRON__ ||
    (window as any).electron?.isElectron
  );

  // Desktop app is Electron only (Tauri removed)
  const isDesktopApp = isElectron;

  // Electron: Sync state from hook
  useEffect(() => {
    if (!isElectron) return;

    // Update version from hook
    if (electronUpdater.currentVersion) {
      setCurrentVersion(electronUpdater.currentVersion);
    }

    // Update status from hook
    if (electronUpdater.status !== 'idle') {
      setUpdateStatus(electronUpdater.status as UpdateStatus);
    }

    // Update progress
    if (electronUpdater.progress) {
      setDownloadProgress({
        percent: electronUpdater.progress.percent,
        transferred: electronUpdater.progress.downloaded,
        total: electronUpdater.progress.total,
        bytesPerSecond: electronUpdater.progress.bytesPerSecond,
      });
    }

    // Update info
    if (electronUpdater.updateInfo) {
      setUpdateInfo({
        version: electronUpdater.updateInfo.version,
        releaseNotes: electronUpdater.updateInfo.body,
      });
    }

    // Update last check time
    if (electronUpdater.lastCheckTime) {
      setLastCheckTime(electronUpdater.lastCheckTime);
    }

    // Check dev mode
    if (electronUpdater.hasError && electronUpdater.error?.includes('not configured')) {
      setIsDevMode(true);
    }
  }, [
    isElectron,
    electronUpdater.status,
    electronUpdater.progress,
    electronUpdater.updateInfo,
    electronUpdater.lastCheckTime,
    electronUpdater.hasError,
    electronUpdater.error,
    electronUpdater.currentVersion,
  ]);

  useEffect(() => {
    if (!isElectron) return;

    const api = (window as any).electronAPI;
    if (!api?.updater) return;

    console.log('[UpdateButton] Initializing updater UI.');
    api.updater.getVersion().then((version: string) => {
      console.log('[UpdateButton] Current app version:', version);
      setCurrentVersion(version);
    }).catch((error: any) => {
      console.warn('[UpdateButton] getVersion failed, switching to dev mode:', error?.message || error);
      setCurrentVersion('dev');
      setIsDevMode(true);
    });

    const unsubscribeChecking = api.updater.onCheckingForUpdate(() => {
      console.log('[UpdateButton] Event: checking-for-update');
      setUpdateStatus('checking');
      setLastCheckTime(new Date());
    });

    const unsubscribeAvailable = api.updater.onUpdateAvailable((info: UpdateInfo) => {
      console.log('[UpdateButton] Event: update-available', info);
      setUpdateStatus('available');
      setUpdateInfo(info);
      toast.success(`تحديث جديد: ${info.version}`, { icon: '🎉' });
    });

    const unsubscribeNotAvailable = api.updater.onUpdateNotAvailable(() => {
      console.log('[UpdateButton] Event: update-not-available');
      setUpdateStatus('not-available');
      setLastCheckTime(new Date());
    });

    const unsubscribeProgress = api.updater.onDownloadProgress((progress: DownloadProgress) => {
      console.log('[UpdateButton] Event: download-progress', {
        percent: Math.round(progress.percent),
        transferredMB: (progress.transferred / 1024 / 1024).toFixed(2),
        totalMB: (progress.total / 1024 / 1024).toFixed(2),
        speedMBps: (progress.bytesPerSecond / 1024 / 1024).toFixed(2)
      });
      setUpdateStatus('downloading');
      setDownloadProgress(progress);
    });

    const unsubscribeDownloaded = api.updater.onUpdateDownloaded((info: UpdateInfo) => {
      console.log('[UpdateButton] Event: update-downloaded', info);
      setUpdateStatus('downloaded');
      setUpdateInfo(info);
      toast.success('تم تنزيل التحديث!', { icon: '✅' });
    });

    const unsubscribeError = api.updater.onUpdateError((error: any) => {
      console.error('[UpdateButton] Event: update-error', error);
      setUpdateStatus('error');
      setLastCheckTime(new Date());
    });

    return () => {
      unsubscribeChecking?.();
      unsubscribeAvailable?.();
      unsubscribeNotAvailable?.();
      unsubscribeProgress?.();
      unsubscribeDownloaded?.();
      unsubscribeError?.();
    };
  }, [isElectron]);

  // Watchdog: avoid staying in 'checking' forever if no events are received
  useEffect(() => {
    if (updateStatus === 'checking') {
      // Clear previous timer first
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }

      // Create new timer
      if (process.env.NODE_ENV === 'development') {
        console.log('[UpdateButton] Watchdog: start 12s timer for checking state');
      }

      checkingTimeoutRef.current = window.setTimeout(() => {
        // Check state before changing to avoid race conditions
        setUpdateStatus(prev => {
          if (prev === 'checking') {
            if (process.env.NODE_ENV === 'development') {
              console.warn('[UpdateButton] Watchdog: no updater event within 12s → reset to not-available');
            }
            setLastCheckTime(new Date());
            return 'not-available';
          }
          return prev;
        });
      }, 12000);
    } else {
      // Clean timer if state changed
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }
    }

    return () => {
      if (checkingTimeoutRef.current) {
        clearTimeout(checkingTimeoutRef.current);
        checkingTimeoutRef.current = null;
      }
    };
  }, [updateStatus]);

  const handleCheckForUpdates = async () => {
    if (isDevMode) {
      toast('التحديثات متاحة في النسخة المبنية', { icon: '💡', duration: 3000 });
      return;
    }

    // Electron updater
    if (!isElectron) return;

    const api = (window as any).electronAPI;
    if (!api?.updater) {
      setIsDevMode(true);
      toast('التحديثات متاحة في النسخة المبنية', { icon: '💡', duration: 3000 });
      return;
    }

    try {
      console.log('[UpdateButton] Action: checkForUpdates clicked');
      setUpdateStatus('checking');
      const result = await api.updater.checkForUpdates();
      console.log('[UpdateButton] checkForUpdates result:', result);

      if (!result || !result.success) {
        setUpdateStatus('not-available');
        setIsDevMode(true);
        toast('التحديثات متاحة في النسخة المبنية', { icon: '💡', duration: 3000 });
      }
    } catch (error: any) {
      console.error('[UpdateButton] checkForUpdates threw:', error);
      setUpdateStatus('not-available');
      setIsDevMode(true);
    } finally {
      // Always update last check time
      setLastCheckTime(new Date());
    }
  };

  const handleDownload = async () => {
    if (!isElectron || updateStatus !== 'available') return;

    const api = (window as any).electronAPI;
    if (!api?.updater) return;

    try {
      await api.updater.downloadUpdate();
    } catch (error) {
      toast.error('فشل تنزيل التحديث');
    }
  };

  const handleInstall = async () => {
    if (!isElectron || updateStatus !== 'downloaded') return;

    const api = (window as any).electronAPI;
    if (!api?.updater) return;

    try {
      // لا ننتظر النتيجة لأن quitAndInstall سيغلق التطبيق فوراً
      // استخدام Promise.resolve للتأكد من عدم حدوث خطأ بعد الإغلاق
      api.updater.quitAndInstall().catch(() => {
        // تجاهل الأخطاء لأن التطبيق سيغلق
      });
    } catch (error) {
      // في حالة حدوث خطأ قبل الإغلاق
      toast.error('فشل تثبيت التحديث');
    }
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'لم يتم التحقق';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    return `منذ ${Math.floor(hours / 24)} يوم`;
  };

  // Hide in browser - show only in Desktop (Electron)
  if (!isDesktopApp) return null;

  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return <Loader2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" />;
      case 'available':
        return <ArrowDownCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
      case 'downloading':
        return <Download className="h-3.5 w-3.5 lg:h-4 lg:w-4 animate-pulse" />;
      case 'downloaded':
        return <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
      case 'not-available':
        return <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
      case 'error':
        return <AlertCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
      default:
        return <ArrowDownCircle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (updateStatus) {
      case 'available':
        return 'text-blue-400 hover:bg-white/15';
      case 'downloading':
        return 'text-yellow-400 hover:bg-white/15';
      case 'downloaded':
        return 'text-green-400 hover:bg-white/15';
      case 'error':
        return 'text-red-400 hover:bg-white/15';
      default:
        return 'text-white/90 hover:bg-white/15';
    }
  };

  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';

  return (
    <Popover open={showDropdown} onOpenChange={setShowDropdown}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 active:scale-95 relative",
            getStatusColor()
          )}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          aria-label="التحديثات"
          title="التحديثات"
        >
          {getStatusIcon()}

          {hasUpdate && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse border border-slate-900 shadow-[0_0_4px_rgba(59,130,246,0.8)]" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-64 bg-slate-800/95 backdrop-blur-md border border-white/10 p-0 overflow-hidden"
        style={{ WebkitAppRegion: 'no-drag' } as any}
      >
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownCircle className="h-4 w-4 text-white/70" />
              <h3 className="text-sm font-semibold text-white">التحديثات</h3>
            </div>
            <span className="text-xs text-white/60">v{currentVersion}</span>
          </div>
        </div>

        <div className="py-2">
          {isDevMode && (
            <div className="px-4 py-2.5 bg-yellow-500/5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white">وضع التطوير</p>
                  <p className="text-xs text-white/60 mt-0.5">التحديثات متاحة في النسخة المبنية</p>
                </div>
              </div>
            </div>
          )}

          {updateStatus === 'checking' && !isDevMode && (
            <div className="px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm text-white/90">
                <Loader2 className="h-4 w-4 animate-spin text-white/70" />
                <span>جاري التحقق...</span>
              </div>
            </div>
          )}

          {updateStatus === 'available' && updateInfo && (
            <>
              <div className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <Download className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">تحديث متاح</p>
                    <p className="text-xs text-white/60 mt-0.5">الإصدار {updateInfo.version}</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-2">
                <button
                  onClick={() => {
                    handleDownload();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>تنزيل التحديث</span>
                </button>
              </div>
            </>
          )}

          {updateStatus === 'downloading' && downloadProgress && (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/90">جاري التنزيل...</span>
                <span className="text-white font-semibold">{Math.round(downloadProgress.percent)}%</span>
              </div>
              <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${downloadProgress.percent}%` }}
                />
              </div>
              <p className="text-xs text-white/60 text-center">
                {(downloadProgress.transferred / 1024 / 1024).toFixed(1)} / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
              </p>
            </div>
          )}

          {updateStatus === 'downloaded' && (
            <>
              <div className="px-4 py-2.5">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">التحديث جاهز</p>
                    <p className="text-xs text-white/60 mt-0.5">سيتم تثبيته عند إعادة التشغيل</p>
                  </div>
                </div>
              </div>
              <div className="px-4 pb-2">
                <button
                  onClick={() => {
                    handleInstall();
                    setShowDropdown(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>إعادة التشغيل الآن</span>
                </button>
              </div>
            </>
          )}

          {updateStatus === 'not-available' && !isDevMode && (
            <div className="px-4 py-2.5">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">أنت محدث</p>
                  <p className="text-xs text-white/60 mt-0.5">تستخدم أحدث إصدار</p>
                </div>
              </div>
            </div>
          )}

          {updateStatus === 'error' && (
            <div className="px-4 py-2.5">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">حدث خطأ</p>
                  <p className="text-xs text-white/60 mt-0.5">فشل التحقق من التحديثات</p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t border-white/10 mt-2">
            <div className="px-4 py-2 text-xs">
              <div className="flex items-center justify-between text-white/60">
                <span>آخر تحقق</span>
                <span>{formatTime(lastCheckTime)}</span>
              </div>
            </div>

            {updateStatus !== 'checking' && updateStatus !== 'downloading' && (
              <div className="px-4 pb-2">
                <button
                  onClick={handleCheckForUpdates}
                  disabled={isDevMode}
                  className={cn(
                    "w-full flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
                    isDevMode
                      ? "bg-white/5 text-white/40 cursor-not-allowed"
                      : "bg-white/5 hover:bg-white/10 text-white/90 hover:text-white"
                  )}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>{isDevMode ? 'غير متاح' : 'التحقق من التحديثات'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default UpdateButton;
