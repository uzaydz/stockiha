import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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

  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI?.updater;

  useEffect(() => {
    if (!isElectron) return;

    // جلب الإصدار الحالي
    (window as any).electronAPI.updater.getVersion().then((version: string) => {
      setCurrentVersion(version);
    });

    // الاستماع للأحداث
    const unsubscribeChecking = (window as any).electronAPI.updater.onCheckingForUpdate(() => {
      setUpdateStatus('checking');
      setLastCheckTime(new Date());
    });

    const unsubscribeAvailable = (window as any).electronAPI.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      toast.success(`تحديث جديد متاح: ${info.version}`, { icon: '🎉' });
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
      toast.success('تم تنزيل التحديث! انقر للتثبيت', { 
        icon: '✅',
        duration: 5000 
      });
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
    
    try {
      setUpdateStatus('checking');
      await (window as any).electronAPI.updater.checkForUpdates();
    } catch (error) {
      setUpdateStatus('error');
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

  // تحديد الأيقونة والألوان حسب الحالة
  const getStatusIcon = () => {
    switch (updateStatus) {
      case 'checking':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'available':
        return <Download className="h-4 w-4 animate-bounce" />;
      case 'downloading':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'downloaded':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'not-available':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <RefreshCw className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (updateStatus) {
      case 'available':
        return 'text-blue-400 hover:bg-blue-500/20';
      case 'downloading':
        return 'text-yellow-400 hover:bg-yellow-500/20';
      case 'downloaded':
        return 'text-green-400 hover:bg-green-500/20';
      case 'error':
        return 'text-red-400 hover:bg-red-500/20';
      default:
        return 'text-white/90 hover:bg-white/15';
    }
  };

  const hasUpdate = updateStatus === 'available' || updateStatus === 'downloaded';

  return (
    <div className="relative">
      {/* زر التحديثات */}
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
        
        {/* نقطة التنبيه */}
        {hasUpdate && (
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-blue-500 rounded-full animate-pulse border border-slate-900" />
        )}
      </button>

      {/* القائمة المنسدلة */}
      {showDropdown && (
        <>
          {/* خلفية شفافة للإغلاق */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowDropdown(false)}
            style={{ WebkitAppRegion: 'no-drag' } as any}
          />
          
          {/* القائمة */}
          <div 
            className="absolute left-0 mt-2 w-72 bg-slate-800/98 backdrop-blur-xl rounded-lg shadow-2xl border border-white/10 overflow-hidden z-50"
            style={{ WebkitAppRegion: 'no-drag' } as any}
          >
            {/* الرأس */}
            <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-white/10 px-4 py-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white">التحديثات</h3>
                <span className="text-xs text-white/60">v{currentVersion}</span>
              </div>
            </div>

            {/* المحتوى */}
            <div className="p-4 space-y-3">
              {/* حالة التحقق */}
              {updateStatus === 'checking' && (
                <div className="flex items-center gap-3 text-sm text-white/80">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                  <span>جاري التحقق من التحديثات...</span>
                </div>
              )}

              {/* تحديث متاح */}
              {updateStatus === 'available' && updateInfo && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Download className="h-5 w-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">تحديث جديد متاح!</p>
                      <p className="text-xs text-white/60 mt-0.5">الإصدار {updateInfo.version}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleDownload();
                      setShowDropdown(false);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    تنزيل التحديث
                  </button>
                </div>
              )}

              {/* جاري التنزيل */}
              {updateStatus === 'downloading' && downloadProgress && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white/80">جاري التنزيل...</span>
                    <span className="text-white font-medium">{Math.round(downloadProgress.percent)}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                      style={{ width: `${downloadProgress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 text-center">
                    {(downloadProgress.transferred / 1024 / 1024).toFixed(1)} MB / {(downloadProgress.total / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>
              )}

              {/* تم التنزيل */}
              {updateStatus === 'downloaded' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white">التحديث جاهز!</p>
                      <p className="text-xs text-white/60 mt-0.5">سيتم تثبيته عند إعادة التشغيل</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      handleInstall();
                      setShowDropdown(false);
                    }}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    تثبيت الآن
                  </button>
                </div>
              )}

              {/* لا توجد تحديثات */}
              {updateStatus === 'not-available' && (
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">أنت محدث!</p>
                    <p className="text-xs text-white/60 mt-0.5">تستخدم أحدث إصدار</p>
                  </div>
                </div>
              )}

              {/* خطأ */}
              {updateStatus === 'error' && (
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white">حدث خطأ</p>
                    <p className="text-xs text-white/60 mt-0.5">فشل التحقق من التحديثات</p>
                  </div>
                </div>
              )}

              {/* معلومات إضافية */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60">آخر تحقق:</span>
                  <span className="text-white/80">{formatTime(lastCheckTime)}</span>
                </div>
                
                {/* زر التحقق اليدوي */}
                {updateStatus !== 'checking' && updateStatus !== 'downloading' && (
                  <button
                    onClick={() => {
                      handleCheckForUpdates();
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>التحقق من التحديثات</span>
                  </button>
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
