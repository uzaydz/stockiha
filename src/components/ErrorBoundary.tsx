import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Wifi, WifiOff } from 'lucide-react';
import { reportHookError, resetAndReload } from '@/lib/utils/storage-helper';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo?: React.ErrorInfo;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);
  const errorMessage = error?.message || 'خطأ غير معروف';

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // التحقق من نوع الخطأ
  const isNetworkError = !isOnline || errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('NetworkError');
  const isChunkError = errorMessage.includes('Loading chunk') || errorMessage.includes('ChunkLoadError') || errorMessage.includes('Loading CSS chunk');
  const isHookError = errorMessage.includes('hooks') || errorMessage.includes('Rendered fewer hooks');
  const isRenderError = errorMessage.includes('Cannot read properties of undefined') || errorMessage.includes('Cannot access before initialization');

  // تقرير الخطأ بدون hooks
  if (error) {
    try {
      reportHookError(error);
    } catch (reportError) {
      console.warn('Failed to report error:', reportError);
    }
  }

  const handleReset = () => {
    if (isHookError || isRenderError) {
      // للأخطاء الخطيرة، نظف كل شيء وأعد التحميل
      resetAndReload();
    } else if (isChunkError || isNetworkError) {
      // للأخطاء المتعلقة بالشبكة أو التحميل، أعد تحميل الصفحة
      window.location.reload();
    } else {
      // للأخطاء العادية، جرب إعادة التعيين العادي
      resetError();
    }
  };

  const getErrorTitle = () => {
    if (isNetworkError) return 'مشكلة في الاتصال بالإنترنت';
    if (isChunkError) return 'مشكلة في تحميل الموقع';
    if (isHookError) return 'مشكلة في البيانات';
    return 'عذراً! حدث خطأ ما';
  };

  const getErrorDescription = () => {
    if (isNetworkError) {
      return 'يبدو أن هناك مشكلة في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
    }
    if (isChunkError) {
      return 'فشل في تحميل جزء من الموقع. سيتم إعادة تحميل الصفحة تلقائياً.';
    }
    if (isHookError) {
      return 'حدث خطأ في تحميل البيانات. سيتم تنظيف البيانات المؤقتة وإعادة تحميل الصفحة.';
    }
    return 'نعتذر عن هذا الخطأ. يمكنك محاولة إعادة تحميل الصفحة أو العودة للصفحة الرئيسية.';
  };

  const getButtonText = () => {
    if (isNetworkError) return 'إعادة المحاولة';
    if (isChunkError) return 'إعادة تحميل الصفحة';
    if (isHookError) return 'إعادة تعيين وتحميل';
    return 'حاول مرة أخرى';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md p-8 bg-card rounded-lg shadow-lg border text-center">
        {/* أيقونة الخطأ */}
        <div className="flex justify-center mb-6">
          <div className="relative">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
              {isNetworkError ? (
                <WifiOff className="h-8 w-8 text-red-500" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-red-500" />
              )}
            </div>
          </div>
        </div>

        {/* العنوان */}
        <h2 className="mb-4 text-2xl font-bold text-destructive">
          {getErrorTitle()}
        </h2>

        {/* الوصف */}
        <p className="mb-6 text-muted-foreground">
          {getErrorDescription()}
        </p>

        {/* تفاصيل الخطأ في وضع التطوير */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
              تفاصيل الخطأ (للمطورين)
            </summary>
            <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-32 text-left" dir="ltr">
              {errorMessage}
            </pre>
          </details>
        )}

        {/* الأزرار */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleReset}
            className="flex-1 inline-flex items-center justify-center px-4 py-2 text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            {getButtonText()}
          </button>
          
          {!isNetworkError && (
            <button
              onClick={() => window.location.href = '/'}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 text-muted-foreground bg-secondary rounded-md hover:bg-secondary/90 transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              الصفحة الرئيسية
            </button>
          )}
        </div>

        {/* معلومات إضافية للمطورين */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 p-3 bg-muted rounded text-xs text-left" dir="ltr">
            <div><strong>Error Type:</strong> {isNetworkError ? 'Network' : isChunkError ? 'Chunk Load' : isHookError ? 'Hook' : 'General'}</div>
            <div><strong>Online:</strong> {isOnline ? 'Yes' : 'No'}</div>
            <div><strong>Timestamp:</strong> {new Date().toLocaleString()}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = [];
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, retryCount: 0 };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الخطأ في الكونسول
    console.error('🚨 Error Boundary caught an error:', error);
    console.error('🚨 Error Info:', errorInfo);

    // حفظ معلومات الخطأ
    this.setState({ errorInfo });

    // معالجة خاصة للأخطاء المختلفة
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('loading chunk') || errorMessage.includes('chunkloaderror')) {
      // خطأ في تحميل Chunk - إعادة تحميل تلقائي بعد تأخير قصير
      
      const timeout = setTimeout(() => {
        window.location.reload();
      }, 2000);
      this.retryTimeouts.push(timeout);
    }
    
    // يمكن إضافة تسجيل إضافي هنا (مثل Sentry)
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Details');
      
      
      
      console.groupEnd();
    }
  }

  componentWillUnmount() {
    // تنظيف المؤقتات
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
  }

  resetError = () => {
    this.setState({ hasError: false, error: null, errorInfo: undefined, retryCount: this.state.retryCount + 1 });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }
      
      return <ErrorFallback error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

// Export للتوافق مع الكود الموجود
export const SentryErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <ErrorBoundary>{children}</ErrorBoundary>;
};

export default ErrorBoundary;
