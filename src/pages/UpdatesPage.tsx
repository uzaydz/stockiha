import React, { useState, useEffect } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';

// TypeScript interfaces
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

const UpdatesPage: React.FC = () => {
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // التحقق إذا كنا في Electron
  const isElectron = typeof window !== 'undefined' && window.electronAPI;

  useEffect(() => {
    if (!isElectron) return;

    // جلب الإصدار الحالي
    window.electronAPI.updater.getVersion().then((version: string) => {
      setCurrentVersion(version);
    });

    // الاستماع للأحداث
    const unsubscribeChecking = window.electronAPI.updater.onCheckingForUpdate(() => {
      setUpdateStatus('checking');
      setErrorMessage('');
    });

    const unsubscribeAvailable = window.electronAPI.updater.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateStatus('available');
      setUpdateInfo(info);
      toast.success(`تحديث جديد متاح: الإصدار ${info.version}`);
    });

    const unsubscribeNotAvailable = window.electronAPI.updater.onUpdateNotAvailable(() => {
      setUpdateStatus('not-available');
      toast.success('أنت تستخدم أحدث إصدار');
    });

    const unsubscribeProgress = window.electronAPI.updater.onDownloadProgress((progress: DownloadProgress) => {
      setUpdateStatus('downloading');
      setDownloadProgress(progress);
    });

    const unsubscribeDownloaded = window.electronAPI.updater.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateStatus('downloaded');
      setUpdateInfo(info);
      toast.success('تم تنزيل التحديث بنجاح!');
    });

    const unsubscribeError = window.electronAPI.updater.onUpdateError((error: { message: string }) => {
      setUpdateStatus('error');
      setErrorMessage(error.message);
      toast.error('حدث خطأ أثناء التحديث');
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

  // التحقق من التحديثات
  const handleCheckForUpdates = async () => {
    if (!isElectron) {
      toast.error('نظام التحديثات غير متوفر');
      return;
    }

    try {
      setUpdateStatus('checking');
      const result = await window.electronAPI.updater.checkForUpdates();
      if (!result.success) {
        setUpdateStatus('error');
        setErrorMessage(result.message || 'فشل التحقق من التحديثات');
      }
    } catch (error) {
      setUpdateStatus('error');
      setErrorMessage('حدث خطأ غير متوقع');
      console.error('Update check error:', error);
    }
  };

  // تنزيل التحديث
  const handleDownloadUpdate = async () => {
    if (!isElectron) return;

    try {
      setUpdateStatus('downloading');
      await window.electronAPI.updater.downloadUpdate();
    } catch (error) {
      setUpdateStatus('error');
      setErrorMessage('فشل تنزيل التحديث');
      console.error('Download error:', error);
    }
  };

  // تثبيت التحديث
  const handleInstallUpdate = async () => {
    if (!isElectron) return;

    try {
      await window.electronAPI.updater.quitAndInstall();
    } catch (error) {
      console.error('Install error:', error);
      toast.error('فشل تثبيت التحديث');
    }
  };

  // تنسيق حجم الملف
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // تنسيق السرعة
  const formatSpeed = (bytesPerSecond: number): string => {
    return formatBytes(bytesPerSecond) + '/s';
  };

  if (!isElectron) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>غير متوفر</AlertTitle>
          <AlertDescription>
            نظام التحديثات متاح فقط في نسخة سطح المكتب
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      {/* معلومات الإصدار الحالي */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>معلومات التطبيق</span>
            <Badge variant="outline" className="text-lg">
              الإصدار {currentVersion}
            </Badge>
          </CardTitle>
          <CardDescription>
            تحقق من التحديثات للحصول على أحدث الميزات والإصلاحات
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleCheckForUpdates} 
            disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
            className="w-full"
          >
            {updateStatus === 'checking' ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                جاري التحقق...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                التحقق من التحديثات
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* حالة التحديث */}
      {updateStatus === 'not-available' && (
        <Alert>
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle>أنت محدث!</AlertTitle>
          <AlertDescription>
            أنت تستخدم أحدث إصدار من تطبيق سطوكيها
          </AlertDescription>
        </Alert>
      )}

      {updateStatus === 'available' && updateInfo && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700">
              <Download className="mr-2 h-5 w-5" />
              تحديث متاح
            </CardTitle>
            <CardDescription>
              إصدار جديد متاح: {updateInfo.version}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {updateInfo.releaseNotes && (
              <div className="bg-white p-4 rounded-lg">
                <h4 className="font-semibold mb-2">ما الجديد:</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {updateInfo.releaseNotes}
                </p>
              </div>
            )}
            <Button 
              onClick={handleDownloadUpdate}
              className="w-full"
              size="lg"
            >
              <Download className="mr-2 h-4 w-4" />
              تنزيل التحديث
            </Button>
          </CardContent>
        </Card>
      )}

      {updateStatus === 'downloading' && downloadProgress && (
        <Card className="border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-700">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              جاري التنزيل...
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>التقدم</span>
                <span className="font-semibold">{Math.round(downloadProgress.percent)}%</span>
              </div>
              <Progress value={downloadProgress.percent} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatBytes(downloadProgress.transferred)} / {formatBytes(downloadProgress.total)}</span>
                <span>{formatSpeed(downloadProgress.bytesPerSecond)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {updateStatus === 'downloaded' && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center text-green-700">
              <CheckCircle className="mr-2 h-5 w-5" />
              التحديث جاهز للتثبيت
            </CardTitle>
            <CardDescription>
              تم تنزيل التحديث بنجاح. سيتم تثبيته عند إعادة تشغيل التطبيق.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleInstallUpdate}
              className="w-full"
              size="lg"
            >
              إعادة التشغيل وتثبيت التحديث
            </Button>
          </CardContent>
        </Card>
      )}

      {updateStatus === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>حدث خطأ</AlertTitle>
          <AlertDescription>
            {errorMessage || 'فشل التحقق من التحديثات. يرجى المحاولة مرة أخرى.'}
          </AlertDescription>
        </Alert>
      )}

      {/* معلومات إضافية */}
      <Card>
        <CardHeader>
          <CardTitle>حول التحديثات التلقائية</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            🔄 <strong>التحقق التلقائي:</strong> يتحقق التطبيق من التحديثات تلقائياً كل 4 ساعات
          </p>
          <p>
            📥 <strong>التنزيل:</strong> يمكنك اختيار متى تريد تنزيل التحديثات
          </p>
          <p>
            ⚡ <strong>التثبيت:</strong> سيتم تثبيت التحديث عند إغلاق التطبيق أو يمكنك إعادة التشغيل فوراً
          </p>
          <p>
            💾 <strong>البيانات:</strong> جميع بياناتك آمنة ولن تتأثر بالتحديث
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default UpdatesPage;
