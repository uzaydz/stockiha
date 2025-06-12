import React, { useState, useEffect } from 'react';
import { AlertTriangle, RefreshCw, X, CheckCircle, AlertCircle } from 'lucide-react';
import { getRequestStats, getFailedRequests } from '@/lib/http406Handler';

interface ErrorStats {
  total: number;
  failed: number;
  retried: number;
  success: number;
}

interface FailedRequest {
  url: string;
  timestamp: number;
  error: string;
}

export const ErrorMonitor: React.FC = () => {
  const [stats, setStats] = useState<ErrorStats>({ total: 0, failed: 0, retried: 0, success: 0 });
  const [failedRequests, setFailedRequests] = useState<FailedRequest[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // تحديث الإحصائيات كل 5 ثوانٍ
  useEffect(() => {
    const updateStats = () => {
      const currentStats = getRequestStats();
      const currentFailed = getFailedRequests();
      
      setStats(currentStats);
      setFailedRequests(currentFailed);
      
      // إظهار المراقب إذا كان هناك أخطاء
      setIsVisible(currentStats.failed > 0 || currentStats.retried > 0);
    };

    updateStats();
    const interval = setInterval(updateStats, 5000);

    return () => clearInterval(interval);
  }, []);

  // إعادة محاولة الطلبات الفاشلة
  const retryFailedRequests = async () => {
    if ((window as any).retryFailed406Requests) {
      await (window as any).retryFailed406Requests();
      // تحديث الإحصائيات بعد إعادة المحاولة
      setTimeout(() => {
        const currentStats = getRequestStats();
        const currentFailed = getFailedRequests();
        setStats(currentStats);
        setFailedRequests(currentFailed);
      }, 1000);
    }
  };

  // إعادة تعيين الإحصائيات
  const resetStats = () => {
    if ((window as any).reset406Stats) {
      (window as any).reset406Stats();
      setStats({ total: 0, failed: 0, retried: 0, success: 0 });
      setFailedRequests([]);
      setIsVisible(false);
    }
  };

  // إخفاء المراقب
  const hideMonitor = () => {
    setIsVisible(false);
    setIsExpanded(false);
  };

  if (!isVisible) return null;

  const successRate = stats.total > 0 ? ((stats.success / stats.total) * 100).toFixed(1) : '100';
  const hasErrors = stats.failed > 0;
  const hasRetries = stats.retried > 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-md">
      {/* المؤشر المصغر */}
      {!isExpanded && (
        <div
          onClick={() => setIsExpanded(true)}
          className={`
            cursor-pointer rounded-lg shadow-lg p-3 border transition-all duration-300 hover:shadow-xl
            ${hasErrors 
              ? 'bg-red-50 border-red-200 text-red-800' 
              : hasRetries 
                ? 'bg-yellow-50 border-yellow-200 text-yellow-800'
                : 'bg-green-50 border-green-200 text-green-800'
            }
          `}
        >
          <div className="flex items-center space-x-2">
            {hasErrors ? (
              <AlertTriangle className="w-5 h-5" />
            ) : hasRetries ? (
              <RefreshCw className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">
              {hasErrors ? `${stats.failed} أخطاء` : hasRetries ? `${stats.retried} إعادة محاولة` : 'كل شيء يعمل بشكل جيد'}
            </span>
          </div>
        </div>
      )}

      {/* العرض المفصل */}
      {isExpanded && (
        <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-80">
          {/* الرأس */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">مراقب الشبكة</h3>
            </div>
            <button
              onClick={hideMonitor}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-blue-800">إجمالي الطلبات</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{successRate}%</div>
              <div className="text-sm text-green-800">معدل النجاح</div>
            </div>
            {hasRetries && (
              <div className="bg-yellow-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-yellow-600">{stats.retried}</div>
                <div className="text-sm text-yellow-800">إعادة محاولة</div>
              </div>
            )}
            {hasErrors && (
              <div className="bg-red-50 rounded-lg p-3">
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <div className="text-sm text-red-800">أخطاء</div>
              </div>
            )}
          </div>

          {/* الطلبات الفاشلة */}
          {failedRequests.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-gray-900 mb-2">الطلبات الفاشلة:</h4>
              <div className="max-h-32 overflow-y-auto space-y-2">
                {failedRequests.slice(0, 3).map((request, index) => (
                  <div key={index} className="bg-gray-50 rounded p-2 text-xs">
                    <div className="font-medium text-gray-900 truncate">
                      {request.url.split('/').pop() || request.url}
                    </div>
                    <div className="text-gray-600">
                      {new Date(request.timestamp).toLocaleTimeString('ar-SA')}
                    </div>
                    <div className="text-red-600">{request.error}</div>
                  </div>
                ))}
                {failedRequests.length > 3 && (
                  <div className="text-xs text-gray-500 text-center">
                    و {failedRequests.length - 3} طلبات أخرى...
                  </div>
                )}
              </div>
            </div>
          )}

          {/* الأزرار */}
          <div className="flex space-x-2">
            {failedRequests.length > 0 && (
              <button
                onClick={retryFailedRequests}
                className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-1"
              >
                <RefreshCw className="w-4 h-4" />
                <span>إعادة المحاولة</span>
              </button>
            )}
            <button
              onClick={resetStats}
              className="flex-1 bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
            >
              إعادة تعيين
            </button>
          </div>

          {/* رسالة مساعدة */}
          {hasErrors && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                💡 إذا استمرت الأخطاء، جرب تحديث الصفحة أو تحقق من اتصال الإنترنت.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ErrorMonitor;
