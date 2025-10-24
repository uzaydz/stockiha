import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2, RefreshCw, ArrowDownCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

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

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.updater;

  useEffect(() => {
    if (!isElectron) return;

    (window as any).electronAPI.updater.getVersion().then((version: string) => {
      setCurrentVersion(version);
    }).catch(() => {
      setCurrentVersion('dev');
      setIsDevMode(true);
    });

    const unsubscribeChecking = (window as any).electronAPI.updater.onCheckingForUpdate(() => {
      setUpdateStatus('checking');
      setLastCheckTime(new Date());
    });

    const unsubscribeAvailable = (window as any).electronAPI.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      toast.success(`تحديث جديد: ${info.version}`, { icon: '🎉' });
    });

    const unsubscribeNotAvailable = (window as any).electronAPI.updater.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      setLastCheckTime(new Date());
    });

    const unsubscribeProgress = (window as any).electronAPI.updater.onDownloadProgress((progress: DownloadProgress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(progress);
    });

    const unsubscribeDownloaded = (window as any).electronAPI.updater.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateStatus('downloaded');
      setUpdateInfo(info);
      toast.success('تم تنزيل التحديث!', { icon: '✅' });
    });

    const unsubscribeError = (window as any).electronAPI.updater.onUpdateError(() => {
      setUpdateStatus('error');
    });

    return () => {
      unsubscribeChecking();
      unsubscribeAvailable();
      unsubscribeNotAvailable();
      unsubscribeProgress();
      unsubscribeDownloaded();
      unsubscribeError();
    };
  }, [isElectron]);

  const handleCheckForUpdates = async () => {
    if (!isElectron) return;
    
    if (isDevMode) {
      toast('التحديثات متاحة في النسخة المبنية', { icon: '💡', duration: 3000 });
      return;
    }
    
    try {
      setUpdateStatus('checking');
      const result = await (window as any).electronAPI.updater.checkForUpdates();
      if (!result || !result.success) {
        setUpdateStatus('not-available');
        setIsDevMode(true);
        toast('التحديثات متاحة في النسخة المبنية', { icon: '💡', duration: 3000 });
      }
    } catch (error: any) {
      setUpdateStatus('not-available');
      setIsDevMode(true);
    }
  };

  const handleDownload = async () => {
    if (!isElectron || updateStatus !== 'available') return;
    
    try {
      await (window as any).electronAPI.updater.downloadUpdate();
    } catch (error) {
      toast.error('فشل تنزيل التحديث');
    }
  };

  const handleInstall = async () => {
    if (!isElectron || updateStatus !== 'downloaded') return;
    
    try {
      await (window as any).electronAPI.updater.quitAndInstall();
    } catch (error) {
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

  if (!isElectron) return null;

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
    <div className="relative">
      <button
        type="button"
        onClick={() => setShowDropdown(!showDropdown)}
        className={cn(
          "flex items-center justify-center h-6 w-6 lg:h-7 lg:w-7 rounded-md transition-all duration-200 active:scale-95 relative",
          getStatusColor()
        )}
        aria-label="التحديثات"
        title="التحديثات"
      >
        {getStatusIcon()}
        
        {hasUpdate && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse border border-slate-900" />
        )}
      </button>

      {showDropdown && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
            style={{ WebkitAppRegion: 'no-drag' } as any}
          />
          
          <div 
            className="absolute left-0 mt-2 w-64 bg-slate-800/95 backdrop-blur-md rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50"
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
          </div>
        </>
      )}
    </div>
  );
};

export default UpdateButton;
