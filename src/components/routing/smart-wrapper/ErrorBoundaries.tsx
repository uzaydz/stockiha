/**
 * 🛡️ Smart Provider Wrapper - Error Boundaries
 * حدود الأخطاء المحسنة مع التعافي الذكي
 */

import React, { 
  Component, 
  ErrorInfo, 
  ReactNode,
  memo,
  useState,
  useCallback
} from 'react';
import { useLocation } from 'react-router-dom';
import { PageType } from './types';
import { addPerformanceWarning } from './utils';

/**
 * 🚨 معلومات الخطأ المفصلة
 */
interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  pageType?: PageType;
  pathname?: string;
  timestamp: number;
  userId?: string;
  organizationId?: string;
  userAgent: string;
  url: string;
  stack?: string;
}

/**
 * 🎯 خصائص Error Boundary
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  pageType?: PageType;
  pathname?: string;
  fallback?: ReactNode;
  onError?: (errorDetails: ErrorDetails) => void;
  enableRecovery?: boolean;
  isolateError?: boolean;
}

/**
 * 🔄 حالة Error Boundary
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
  lastErrorTime: number;
}

/**
 * 🛡️ Enhanced Error Boundary Class
 */
class EnhancedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private errorRetryLimit = 3;
  private errorCooldownTime = 5000; // 5 seconds

  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorDetails: ErrorDetails = {
      error,
      errorInfo,
      pageType: this.props.pageType,
      pathname: this.props.pathname,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: error.stack
    };

    // معالجة خاصة لخطأ "Component is not a function"
    if (error.message && error.message.includes('Component is not a function')) {
      console.error('🚨 [ErrorBoundary] Component export issue detected:', {
        error: error.message,
        componentStack: errorInfo.componentStack,
        pathname: this.props.pathname,
        pageType: this.props.pageType
      });
      
      // محاولة إعادة تحميل الصفحة إذا كان الخطأ متعلقاً بتحميل المكون
      if (error.message.includes('lazy') || errorInfo.componentStack?.includes('lazy')) {
        console.warn('⚠️ [ErrorBoundary] Lazy loading issue detected, attempting page reload...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    }

    // تسجيل الخطأ في نظام الأداء
    addPerformanceWarning('CRITICAL', {
      type: 'ERROR_BOUNDARY_TRIGGERED',
      errorName: error.name,
      errorMessage: error.message,
      pageType: this.props.pageType,
      pathname: this.props.pathname,
      componentStack: errorInfo.componentStack
    });

    // إشعار callback خارجي
    if (this.props.onError) {
      this.props.onError(errorDetails);
    }

    // تسجيل مفصل في الكونسول
    console.error('🚨 [ErrorBoundary] Error caught:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      pageType: this.props.pageType,
      pathname: this.props.pathname
    });

    this.setState({
      error,
      errorInfo
    });
  }

  private handleRetry = () => {
    const now = Date.now();
    
    // التحقق من حد المحاولات والوقت المنقضي
    if (this.state.retryCount >= this.errorRetryLimit) {
      return;
    }

    if (now - this.state.lastErrorTime < this.errorCooldownTime) {
      return;
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: prevState.retryCount + 1,
      lastErrorTime: now
    }));
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      lastErrorTime: 0
    });
  };

  render() {
    if (this.state.hasError) {
      // استخدام fallback مخصص إذا تم توفيره
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // UI التعافي الافتراضي
      return (
        <ErrorFallbackUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          pageType={this.props.pageType}
          pathname={this.props.pathname}
          retryCount={this.state.retryCount}
          maxRetries={this.errorRetryLimit}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          enableRecovery={this.props.enableRecovery !== false}
        />
      );
    }

    // التحقق من أن children هو عنصر React صالح
    try {
      // إذا كان children هو object وليس function/component، هذا سيسبب خطأ
      if (this.props.children && typeof this.props.children === 'object' && !React.isValidElement(this.props.children)) {
        // محاولة التحقق من أن children ليس object عادي
        const childrenType = typeof this.props.children;
        if (childrenType === 'object' && this.props.children !== null && !Array.isArray(this.props.children)) {
          // إذا كان object وليس React element، قد يكون component غير صالح
          console.error('⚠️ [ErrorBoundary] Invalid children type detected:', {
            type: childrenType,
            children: this.props.children,
            keys: Object.keys(this.props.children || {})
          });
        }
      }
    } catch (validationError) {
      console.error('⚠️ [ErrorBoundary] Error validating children:', validationError);
    }

    return this.props.children;
  }
}

/**
 * 🎨 Error Fallback UI Component
 */
interface ErrorFallbackUIProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  pageType?: PageType;
  pathname?: string;
  retryCount: number;
  maxRetries: number;
  onRetry: () => void;
  onReset: () => void;
  enableRecovery: boolean;
}

const ErrorFallbackUI = memo<ErrorFallbackUIProps>(({
  error,
  errorInfo,
  errorId,
  pageType,
  pathname,
  retryCount,
  maxRetries,
  onRetry,
  onReset,
  enableRecovery
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const canRetry = retryCount < maxRetries && enableRecovery;

  const getErrorSeverity = useCallback(() => {
    if (!error) return 'unknown';
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      return 'network';
    }
    if (errorMessage.includes('chunk') || errorMessage.includes('loading')) {
      return 'loading';
    }
    if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
      return 'permission';
    }
    
    return 'critical';
  }, [error]);

  const getRecoveryMessage = useCallback(() => {
    const severity = getErrorSeverity();
    
    switch (severity) {
      case 'network':
        return 'يبدو أن هناك مشكلة في الاتصال بالإنترنت. تحقق من اتصالك وحاول مرة أخرى.';
      case 'loading':
        return 'فشل في تحميل جزء من التطبيق. سيتم إعادة المحاولة تلقائياً.';
      case 'permission':
        return 'ليس لديك صلاحية للوصول إلى هذه الصفحة. تواصل مع المدير.';
      default:
        return 'حدث خطأ غير متوقع. نعمل على حل المشكلة.';
    }
  }, [getErrorSeverity]);

  const getSeverityColor = useCallback(() => {
    const severity = getErrorSeverity();
    
    switch (severity) {
      case 'network': return 'text-orange-600';
      case 'loading': return 'text-blue-600';
      case 'permission': return 'text-red-600';
      default: return 'text-red-800';
    }
  }, [getErrorSeverity]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-center mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-6 h-6 text-red-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-xl font-bold text-center text-gray-900 mb-2">
          عذراً، حدث خطأ!
        </h1>

        {/* Message */}
        <p className={`text-center mb-6 ${getSeverityColor()}`}>
          {getRecoveryMessage()}
        </p>

        {/* Error ID */}
        {errorId && (
          <div className="bg-gray-100 rounded-md p-3 mb-4">
            <p className="text-xs text-gray-600 text-center">
              معرف الخطأ: <code className="bg-gray-200 px-1 rounded">{errorId}</code>
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col space-y-3">
          {canRetry && (
            <button
              onClick={onRetry}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              إعادة المحاولة ({maxRetries - retryCount} محاولات متبقية)
            </button>
          )}
          
          <button
            onClick={onReset}
            className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors"
          >
            إعادة تعيين
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
          >
            إعادة تحميل الصفحة
          </button>
        </div>

        {/* Technical Details Toggle */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-6 border-t pt-4">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              {showDetails ? 'إخفاء' : 'عرض'} التفاصيل التقنية
            </button>
            
            {showDetails && (
              <div className="bg-gray-900 text-green-400 p-3 rounded-md text-xs overflow-auto max-h-40">
                <div><strong>Page Type:</strong> {pageType}</div>
                <div><strong>Pathname:</strong> {pathname}</div>
                <div><strong>Error:</strong> {error?.name}</div>
                <div><strong>Message:</strong> {error?.message}</div>
                {error?.stack && (
                  <div className="mt-2">
                    <strong>Stack:</strong>
                    <pre className="whitespace-pre-wrap">{error.stack}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ErrorFallbackUI.displayName = 'ErrorFallbackUI';

/**
 * 🛡️ Provider-Specific Error Boundaries
 */

// Auth Provider Error Boundary
export const AuthErrorBoundary = memo<{ children: ReactNode; pageType?: PageType }>(({ 
  children, 
  pageType 
}) => {
  const location = useLocation();
  return (
    <EnhancedErrorBoundary
      pageType={pageType}
      pathname={location.pathname}
      onError={(details) => {
        // إرسال تحليلات خاصة بالمصادقة
      }}
      fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">خطأ في نظام المصادقة</h2>
          <p className="text-gray-600 mb-4">حدث خطأ في تحميل نظام المصادقة.</p>
          <button
            onClick={() => {
              try {
                const isElectron = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Electron');
                if (isElectron) {
                  window.location.hash = '#/login';
                } else {
                  window.location.href = '/login';
                }
              } catch {
                window.location.href = '/login';
              }
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            العودة لتسجيل الدخول
          </button>
        </div>
      </div>
    }
    >
      {children}
    </EnhancedErrorBoundary>
  );
});

AuthErrorBoundary.displayName = 'AuthErrorBoundary';

// Data Provider Error Boundary
export const DataErrorBoundary = memo<{ children: ReactNode; pageType?: PageType }>(({ 
  children, 
  pageType 
}) => {
  const location = useLocation();
  return (
    <EnhancedErrorBoundary
      pageType={pageType}
      pathname={location.pathname}
      onError={(details) => {
      }}
      fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-4">خطأ في تحميل البيانات</h2>
          <p className="text-gray-600 mb-4">فشل في تحميل بيانات التطبيق.</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            إعادة تحميل
          </button>
        </div>
      </div>
    }
    >
      {children}
    </EnhancedErrorBoundary>
  );
});

DataErrorBoundary.displayName = 'DataErrorBoundary';

// Main Error Boundary Export
export { EnhancedErrorBoundary as SmartErrorBoundary };
export default EnhancedErrorBoundary;
