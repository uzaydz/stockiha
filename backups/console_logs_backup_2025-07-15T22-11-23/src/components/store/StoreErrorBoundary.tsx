import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class StoreErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    
    // استدعاء callback إذا تم توفيره
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // عرض fallback مخصص إذا تم توفيره
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // عرض رسالة خطأ افتراضية
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center bg-red-50 border border-red-200 rounded-lg m-4">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-red-800 mb-2">
            حدث خطأ في تحميل هذا القسم
          </h2>
          <p className="text-red-600 mb-4">
            نعتذر عن هذا الخطأ. يرجى المحاولة مرة أخرى.
          </p>
          {process.env.NODE_ENV === 'development' && (
            <details className="mb-4 text-sm text-red-700">
              <summary className="cursor-pointer">تفاصيل الخطأ (للمطورين)</summary>
              <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto max-w-md">
                {this.state.error?.stack}
              </pre>
            </details>
          )}
          <Button 
            onClick={this.handleRetry}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            إعادة المحاولة
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default StoreErrorBoundary;

// مكون Error Boundary مبسط للمكونات الصغيرة
export const SimpleErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <StoreErrorBoundary
      fallback={
        <div className="p-4 text-center text-red-600 bg-red-50 border border-red-200 rounded">
          فشل في تحميل هذا المكون
        </div>
      }
    >
      {children}
    </StoreErrorBoundary>
  );
};
