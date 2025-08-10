import React, { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showErrorDetails?: boolean;
  className?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class FormErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    
    this.setState({
      error,
      errorInfo
    });

    // استدعاء callback الخارجي إن وجد
    this.props.onError?.(error, errorInfo);

    // إرسال تقرير الخطأ (يمكن إضافة خدمة مراقبة هنا)
    if (process.env.NODE_ENV === 'production') {
      // مثال: Sentry.captureException(error);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  render() {
    if (this.state.hasError) {
      // إذا تم توفير fallback مخصص
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // العرض الافتراضي للخطأ
      return (
        <div className={cn("w-full", this.props.className)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
              <ExclamationTriangleIcon className="h-5 w-5" />
              <div className="flex flex-col gap-3">
                <AlertDescription className="text-sm font-medium">
                  حدث خطأ في تحميل النموذج
                </AlertDescription>
                
                <div className="text-xs text-red-600 dark:text-red-400">
                  عذراً، لا يمكن عرض النموذج في الوقت الحالي. يرجى المحاولة مرة أخرى.
                </div>

                {/* تفاصيل الخطأ (في وضع التطوير أو عند التفعيل) */}
                {(process.env.NODE_ENV === 'development' || this.props.showErrorDetails) && this.state.error && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200">
                      عرض تفاصيل الخطأ
                    </summary>
                    <div className="mt-2 p-3 bg-red-100 dark:bg-red-900/40 rounded-lg">
                      <div className="text-xs font-mono text-red-800 dark:text-red-200 whitespace-pre-wrap">
                        <strong>الخطأ:</strong> {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div className="mt-2 text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          <strong>Stack Trace:</strong>
                          {this.state.error.stack}
                        </div>
                      )}
                      {this.state.errorInfo?.componentStack && (
                        <div className="mt-2 text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap max-h-32 overflow-y-auto">
                          <strong>Component Stack:</strong>
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </div>
                  </details>
                )}

                {/* أزرار العمل */}
                <div className="flex gap-2 mt-2">
                  <Button
                    onClick={this.handleRetry}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    <ArrowPathIcon className="w-3 h-3 mr-1" />
                    إعادة المحاولة
                    {this.state.retryCount > 0 && (
                      <span className="mr-1">({this.state.retryCount + 1})</span>
                    )}
                  </Button>

                  <Button
                    onClick={() => window.location.reload()}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/40"
                  >
                    إعادة تحميل الصفحة
                  </Button>
                </div>

                {/* معلومات إضافية */}
                <div className="text-xs text-red-600 dark:text-red-400 mt-2 p-2 bg-red-100 dark:bg-red-900/40 rounded">
                  <strong>نصائح لحل المشكلة:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>تأكد من اتصالك بالإنترنت</li>
                    <li>حاول إعادة تحميل الصفحة</li>
                    <li>امسح ذاكرة التخزين المؤقت للمتصفح</li>
                    <li>إذا استمرت المشكلة، اتصل بالدعم الفني</li>
                  </ul>
                </div>
              </div>
            </Alert>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FormErrorBoundary;
