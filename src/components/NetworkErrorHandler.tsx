import React, { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface NetworkErrorHandlerProps {
  children: React.ReactNode;
}

interface NetworkError {
  type: 'chunk' | 'network' | 'csp' | 'unknown';
  message: string;
  timestamp: number;
}

export const NetworkErrorHandler: React.FC<NetworkErrorHandlerProps> = ({ children }) => {
  const [error, setError] = useState<NetworkError | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // معالج أخطاء تحميل الموارد - محسن لـ Instagram
    const handleResourceError = (event: ErrorEvent | Event) => {
      const target = event.target as HTMLScriptElement | HTMLLinkElement;

      if (target && (target.tagName === 'SCRIPT' || target.tagName === 'LINK')) {
        let resourceUrl = '';
        let errorType: 'chunk' | 'network' = 'network';

        if (target.tagName === 'SCRIPT') {
          const scriptTarget = target as HTMLScriptElement;
          resourceUrl = scriptTarget.src || '';
          errorType = resourceUrl.includes('chunk') ? 'chunk' : 'network';
        } else if (target.tagName === 'LINK') {
          const linkTarget = target as HTMLLinkElement;
          resourceUrl = linkTarget.href || '';
          errorType = resourceUrl.includes('chunk') ? 'chunk' : 'network';
        }

        // تحسين كشف أخطاء Instagram in-app browser
        const isInstagramBrowser = navigator.userAgent.includes('Instagram') ||
                                  navigator.userAgent.includes('FBAN') ||
                                  navigator.userAgent.includes('FBAV');

        if (isInstagramBrowser && errorType === 'chunk') {
          console.log('🚨 Instagram browser chunk error detected, attempting recovery...');
          // إعادة تحميل الصفحة مع تأخير أقصر لـ Instagram
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        }

        setError({
          type: errorType,
          message: `فشل في تحميل ${target.tagName === 'SCRIPT' ? 'ملف JavaScript' : 'ملف CSS'}: ${resourceUrl}`,
          timestamp: Date.now()
        });
      }
    };

    // معالج الأخطاء العامة
    const handleError = (event: ErrorEvent) => {
      const message = event.message.toLowerCase();
      
      if (message.includes('loading chunk') || message.includes('chunkloaderror')) {
        setError({
          type: 'chunk',
          message: 'فشل في تحميل جزء من التطبيق',
          timestamp: Date.now()
        });
      } else if (message.includes('network') || message.includes('fetch')) {
        setError({
          type: 'network',
          message: 'مشكلة في الاتصال بالشبكة',
          timestamp: Date.now()
        });
      } else if (message.includes('content security policy') || message.includes('csp')) {
        setError({
          type: 'csp',
          message: 'مشكلة في سياسة الأمان',
          timestamp: Date.now()
        });
      }
    };

    // معالج الـ Promise المرفوضة
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.message || event.reason || 'خطأ غير معروف';
      const reasonStr = reason.toString().toLowerCase();
      
      if (reasonStr.includes('loading chunk') || reasonStr.includes('chunkloaderror')) {
        setError({
          type: 'chunk',
          message: 'فشل في تحميل جزء من التطبيق',
          timestamp: Date.now()
        });
      } else if (reasonStr.includes('network') || reasonStr.includes('fetch')) {
        setError({
          type: 'network',
          message: 'مشكلة في الاتصال بالشبكة',
          timestamp: Date.now()
        });
      }
    };

    // إضافة المستمعين
    window.addEventListener('error', handleError);
    window.addEventListener('error', handleResourceError, true); // capture phase
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('error', handleError);
      window.removeEventListener('error', handleResourceError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // إعادة المحاولة التلقائية لأخطاء التحميل
  useEffect(() => {
    if (error && error.type === 'chunk' && retryCount < 3) {
      const timeout = setTimeout(() => {
        console.log(`🔄 Auto-retry ${retryCount + 1}/3 for chunk loading error`);
        window.location.reload();
      }, 2000 + retryCount * 1000); // تأخير متزايد

      return () => clearTimeout(timeout);
    }
  }, [error, retryCount]);

  const handleRetry = () => {
    setError(null);
    setRetryCount(prev => prev + 1);
    
    if (error?.type === 'chunk' || error?.type === 'network') {
      window.location.reload();
    }
  };

  const handleClearCache = () => {
    // مسح الكاش والبيانات المحفوظة
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    localStorage.clear();
    sessionStorage.clear();
    window.location.reload();
  };

  // عرض رسالة الخطأ
  if (error) {
    const getErrorIcon = () => {
      if (!isOnline) return <WifiOff className="h-8 w-8 text-red-500" />;
      return <AlertTriangle className="h-8 w-8 text-red-500" />;
    };

    const getErrorTitle = () => {
      if (!isOnline) return 'لا يوجد اتصال بالإنترنت';
      if (error.type === 'chunk') return 'مشكلة في تحميل الموقع';
      if (error.type === 'network') return 'مشكلة في الاتصال';
      if (error.type === 'csp') return 'مشكلة في الأمان';
      return 'حدث خطأ غير متوقع';
    };

    const getErrorDescription = () => {
      if (!isOnline) {
        return 'يبدو أن جهازك غير متصل بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
      }
      if (error.type === 'chunk') {
        return 'فشل في تحميل جزء من الموقع. هذا قد يحدث بسبب مشكلة مؤقتة في الشبكة أو تحديث في الموقع.';
      }
      if (error.type === 'network') {
        return 'حدثت مشكلة في الاتصال بالخادم. يرجى التحقق من اتصالك بالإنترنت.';
      }
      if (error.type === 'csp') {
        return 'تم حظر تحميل بعض الموارد بسبب سياسة الأمان. يرجى المحاولة مرة أخرى.';
      }
      return 'حدث خطأ أثناء تحميل الموقع. يرجى المحاولة مرة أخرى.';
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
        <div className="max-w-md w-full p-6 bg-card rounded-lg shadow-lg border text-center">
          {/* أيقونة الخطأ */}
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              {getErrorIcon()}
            </div>
          </div>

          {/* العنوان */}
          <h2 className="mb-3 text-xl font-bold text-destructive">
            {getErrorTitle()}
          </h2>

          {/* الوصف */}
          <p className="mb-6 text-sm text-muted-foreground">
            {getErrorDescription()}
          </p>

          {/* معلومات إضافية في وضع التطوير */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mb-4 p-3 bg-muted rounded text-xs text-left" dir="ltr">
              <div><strong>Error Type:</strong> {error.type}</div>
              <div><strong>Message:</strong> {error.message}</div>
              <div><strong>Online:</strong> {isOnline ? 'Yes' : 'No'}</div>
              <div><strong>Retry Count:</strong> {retryCount}/3</div>
              <div><strong>Timestamp:</strong> {new Date(error.timestamp).toLocaleString()}</div>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRetry}
              disabled={!isOnline && error.type === 'network'}
              className="inline-flex items-center justify-center px-4 py-2 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {!isOnline ? 'في انتظار الاتصال...' : 'إعادة المحاولة'}
            </button>
            
            {(error.type === 'chunk' || retryCount >= 2) && (
              <button
                onClick={handleClearCache}
                className="inline-flex items-center justify-center px-4 py-2 text-muted-foreground bg-secondary rounded-md hover:bg-secondary/90 transition-colors"
              >
                مسح الكاش وإعادة التحميل
              </button>
            )}
          </div>

          {/* رسالة التشجيع */}
          {!isOnline && (
            <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <div className="flex items-center justify-center text-yellow-700 dark:text-yellow-300">
                <Wifi className="w-4 h-4 mr-2" />
                <span className="text-sm">سيتم إعادة المحاولة تلقائياً عند عودة الاتصال</span>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default NetworkErrorHandler;
