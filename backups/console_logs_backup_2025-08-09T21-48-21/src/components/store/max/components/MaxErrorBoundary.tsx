import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Mail, ArrowLeft } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
  errorId?: string;
}

export class MaxErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substr(2, 9)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: Math.random().toString(36).substr(2, 9)
    });

    // تسجيل الخطأ
    
    // استدعاء callback إذا كان متوفراً
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // إرسال تقرير الخطأ (يمكن تطويره لاحقاً)
    this.reportError(error, errorInfo);
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // يمكن إرسال تقرير الخطأ إلى خدمة مراقبة الأخطاء
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      errorId: this.state.errorId
    };

    // مثال: إرسال إلى خدمة مراقبة
    // sendErrorReport(errorReport);
    
  };

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({ hasError: false, error: undefined, errorInfo: undefined });
      
      // إعادة تحميل الصفحة بعد محاولات متعددة
      if (this.retryCount === this.maxRetries) {
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } else {
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReportBug = () => {
    const subject = encodeURIComponent(`خطأ في المتجر - ${this.state.errorId}`);
    const body = encodeURIComponent(`
تفاصيل الخطأ:
- رسالة الخطأ: ${this.state.error?.message}
- معرف الخطأ: ${this.state.errorId}
- الوقت: ${new Date().toLocaleString('ar-DZ')}
- الصفحة: ${window.location.href}
- المتصفح: ${navigator.userAgent}

يرجى وصف ما كنت تفعله عند حدوث الخطأ:
[وصف المشكلة هنا]
    `);
    
    window.open(`mailto:support@example.com?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      // عرض fallback مخصص إذا كان متوفراً
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // عرض صفحة الخطأ الافتراضية
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-2xl w-full text-center">
            {/* أيقونة الخطأ */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="h-12 w-12 text-red-500" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-bold">!</span>
                </div>
              </div>
            </div>

            {/* رسالة الخطأ */}
            <div className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                عذراً، حدث خطأ غير متوقع
              </h1>
              <p className="text-lg text-muted-foreground mb-6">
                نعتذر عن هذا الإزعاج. فريقنا التقني يعمل على حل المشكلة.
              </p>
              
              {/* تفاصيل الخطأ للمطورين */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold text-red-800 mb-2">تفاصيل الخطأ (وضع التطوير):</h3>
                  <pre className="text-sm text-red-700 overflow-auto">
                    {this.state.error.message}
                  </pre>
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-red-600 hover:text-red-800">
                        عرض التفاصيل الكاملة
                      </summary>
                      <pre className="text-xs text-red-600 mt-2 overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* معرف الخطأ */}
              <div className="bg-muted/50 border border-border rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  معرف الخطأ: <span className="font-mono font-semibold">{this.state.errorId}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  يرجى الاحتفاظ بهذا المعرف عند التواصل مع الدعم الفني
                </p>
              </div>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button
                onClick={this.handleRetry}
                className="group inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <RefreshCw className="ml-2 h-5 w-5 transition-transform group-hover:rotate-180" />
                إعادة المحاولة
                {this.retryCount > 0 && (
                  <span className="mr-2 text-sm opacity-75">
                    ({this.retryCount}/{this.maxRetries})
                  </span>
                )}
              </button>

              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center px-6 py-3 border-2 border-primary text-primary rounded-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Home className="ml-2 h-5 w-5" />
                العودة للرئيسية
              </button>

              <button
                onClick={this.handleReportBug}
                className="inline-flex items-center px-6 py-3 bg-muted text-muted-foreground rounded-lg font-semibold hover:bg-muted/80 transition-all duration-300"
              >
                <Mail className="ml-2 h-5 w-5" />
                إبلاغ عن المشكلة
              </button>
            </div>

            {/* نصائح للمستخدم */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold text-blue-800 mb-3">نصائح لحل المشكلة:</h3>
              <ul className="text-sm text-blue-700 space-y-2 text-right">
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>تأكد من اتصالك بالإنترنت</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>جرب تحديث الصفحة (F5 أو Ctrl+R)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>امسح ذاكرة التخزين المؤقت للمتصفح</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>جرب استخدام متصفح آخر</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>تواصل مع فريق الدعم الفني إذا استمرت المشكلة</span>
                </li>
              </ul>
            </div>

            {/* معلومات إضافية */}
            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">
                إذا كنت تواجه هذه المشكلة بشكل متكرر، يرجى التواصل مع فريق الدعم الفني
              </p>
              <div className="flex justify-center items-center gap-4 mt-4">
                <a
                  href="/contact"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  تواصل معنا
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href="/help"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  مركز المساعدة
                </a>
                <span className="text-muted-foreground">|</span>
                <a
                  href="/faq"
                  className="text-primary hover:text-primary/80 transition-colors"
                >
                  الأسئلة الشائعة
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook للاستخدام في المكونات الوظيفية
export const useErrorHandler = () => {
  const handleError = (error: Error, errorInfo?: ErrorInfo) => {
    
    // يمكن إضافة منطق إضافي هنا
    // مثل إرسال تقرير الخطأ أو عرض إشعار
  };

  return handleError;
};

// مكون wrapper للاستخدام السهل
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export const ErrorBoundaryWrapper: React.FC<ErrorBoundaryWrapperProps> = ({
  children,
  fallback,
  onError
}) => {
  return (
    <MaxErrorBoundary fallback={fallback} onError={onError}>
      {children}
    </MaxErrorBoundary>
  );
};
