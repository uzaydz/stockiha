import React, { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { ErrorResponse, handleHttpError, handleNetworkError } from '@/lib/errorHandlers';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

interface ErrorHandlerProps {
  error?: Error | ErrorResponse | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  showRetry?: boolean;
  className?: string;
}

export const ErrorHandler: React.FC<ErrorHandlerProps> = ({
  error,
  onRetry,
  onDismiss,
  showRetry = true,
  className = ''
}) => {
  const { isOnline } = useNetworkStatus();
  const [errorDetails, setErrorDetails] = useState<ErrorResponse | null>(null);

  useEffect(() => {
    if (error) {
      if ('status' in error) {
        // إذا كان الخطأ من نوع ErrorResponse
        setErrorDetails(error as ErrorResponse);
      } else if (error instanceof Error) {
        // إذا كان الخطأ من نوع Error
        setErrorDetails(handleNetworkError(error));
      }
    } else {
      setErrorDetails(null);
    }
  }, [error]);

  if (!error || !errorDetails) {
    return null;
  }

  const getErrorIcon = () => {
    if (!isOnline) return <WifiOff className="h-4 w-4" />;
    if (errorDetails.status === 406) return <AlertTriangle className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getErrorVariant = () => {
    if (!isOnline) return 'destructive';
    if (errorDetails.status === 406) return 'default';
    if (errorDetails.status >= 500) return 'destructive';
    return 'default';
  };

  const getErrorTitle = () => {
    if (!isOnline) return 'لا يوجد اتصال بالإنترنت';
    if (errorDetails.status === 406) return 'مشكلة في تنسيق الطلب';
    if (errorDetails.status >= 500) return 'خطأ في الخادم';
    return 'حدث خطأ';
  };

  const getErrorMessage = () => {
    if (!isOnline) {
      return 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى';
    }
    
    if (errorDetails.status === 406) {
      return 'يتم حل المشكلة تلقائياً. إذا استمرت المشكلة، يرجى تحديث الصفحة.';
    }
    
    return errorDetails.message;
  };

  return (
    <Alert variant={getErrorVariant()} className={`mb-4 ${className}`}>
      {getErrorIcon()}
      <AlertTitle className="flex items-center justify-between">
        {getErrorTitle()}
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0"
          >
            ×
          </Button>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        {getErrorMessage()}
        
        {errorDetails.code && (
          <div className="text-xs text-muted-foreground mt-1">
            رمز الخطأ: {errorDetails.code}
          </div>
        )}
        
        {(showRetry && onRetry) && (
          <div className="mt-3 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-3 w-3" />
              إعادة المحاولة
            </Button>
            
            {!isOnline && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="flex items-center gap-2"
              >
                <Wifi className="h-3 w-3" />
                تحديث الصفحة
              </Button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

// Hook لاستخدام معالج الأخطاء
export const useErrorHandler = () => {
  const [error, setError] = useState<Error | ErrorResponse | null>(null);

  const handleError = (err: Error | ErrorResponse) => {
    setError(err);
  };

  const clearError = () => {
    setError(null);
  };

  const retryLastAction = () => {
    // يمكن تخصيص هذه الدالة حسب الحاجة
    clearError();
    window.location.reload();
  };

  return {
    error,
    handleError,
    clearError,
    retryLastAction
  };
};

// مكون لمعالجة أخطاء 406 بشكل خاص
export const Error406Handler: React.FC<{
  onRetry?: () => void;
  message?: string;
}> = ({ onRetry, message }) => {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (onRetry) {
      setIsRetrying(true);
      try {
        await onRetry();
      } catch (error) {
      } finally {
        setIsRetrying(false);
      }
    }
  };

  return (
    <Alert className="border-orange-200 bg-orange-50">
      <AlertTriangle className="h-4 w-4 text-orange-600" />
      <AlertTitle className="text-orange-800">
        مشكلة مؤقتة في التحميل
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        {message || 'يتم حل المشكلة تلقائياً. يرجى الانتظار قليلاً أو إعادة المحاولة.'}
        
        {onRetry && (
          <div className="mt-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-2 border-orange-300 text-orange-700 hover:bg-orange-100"
            >
              <RefreshCw className={`h-3 w-3 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'جاري إعادة المحاولة...' : 'إعادة المحاولة'}
            </Button>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default ErrorHandler;
