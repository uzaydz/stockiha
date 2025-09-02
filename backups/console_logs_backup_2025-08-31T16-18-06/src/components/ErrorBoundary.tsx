import React, { Component, ReactNode } from "react";
import { reportHookError, resetAndReload } from "@/lib/utils/storage-helper";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, resetError: () => void) => ReactNode;
}

const ErrorFallback = ({ error, resetError }: { error: Error; resetError: () => void }) => {
  const errorMessage = error?.message || 'خطأ غير معروف';

  // التحقق من نوع الخطأ
  const isHookError = errorMessage.includes('hooks') || errorMessage.includes('Rendered fewer hooks');
  const isRenderError = errorMessage.includes('Cannot read properties of undefined') || errorMessage.includes('Cannot access before initialization');

  // تقرير الخطأ بدون hooks
  if (error) {
    try {
      reportHookError(error);
    } catch (reportError) {
    }
  }

  const handleReset = () => {
    if (isHookError || isRenderError) {
      // للأخطاء الخطيرة، نظف كل شيء وأعد التحميل
      resetAndReload();
    } else {
      // للأخطاء العادية، جرب إعادة التعيين العادي
      resetError();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="max-w-md p-8 bg-card rounded-lg shadow-lg border">
        <h2 className="mb-4 text-2xl font-bold text-destructive">عذراً! حدث خطأ ما</h2>
        {isHookError ? (
          <p className="mb-4 text-muted-foreground">
            حدث خطأ في تحميل البيانات. سيتم تنظيف البيانات المؤقتة وإعادة تحميل الصفحة تلقائياً.
          </p>
        ) : (
          <p className="mb-4 text-muted-foreground">
            نعتذر عن هذا الخطأ. يمكنك محاولة إعادة تحميل الصفحة أو العودة للصفحة السابقة.
          </p>
        )}
        <pre className="p-4 mb-4 text-sm bg-muted rounded">
          {errorMessage}
        </pre>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-primary-foreground bg-primary rounded hover:bg-primary/90"
          >
            {isHookError ? 'إعادة تعيين وتحميل' : 'حاول مرة أخرى'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-muted-foreground bg-secondary rounded hover:bg-secondary/90"
          >
            إعادة تحميل الصفحة
          </button>
        </div>
      </div>
    </div>
  );
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // تسجيل الخطأ في الكونسول
    
    // يمكن إضافة تسجيل إضافي هنا
    if (process.env.NODE_ENV === 'development') {
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
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
export const SentryErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary>
    {children}
  </ErrorBoundary>
);

export default ErrorBoundary;
