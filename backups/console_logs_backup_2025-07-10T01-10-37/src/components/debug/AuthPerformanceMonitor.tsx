/**
 * 📊 مراقب أداء المصادقة - يعرض إحصائيات AuthSingleton في الوقت الفعلي
 */

import React, { useState, useEffect } from 'react';
import { getAuthPerformanceStats } from '@/lib/auth-proxy';

interface AuthStats {
  totalRequests: number;
  cacheHits: number;
  networkRequests: number;
  cacheHitRatio: string;
  subscribers: number;
  isInitialized: boolean;
  cacheStatus: string;
}

export const AuthPerformanceMonitor: React.FC<{ 
  isVisible?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}> = ({ 
  isVisible = true, 
  position = 'bottom-right' 
}) => {
  const [stats, setStats] = useState<AuthStats | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const updateStats = () => {
    try {
      const currentStats = getAuthPerformanceStats();
      setStats(currentStats);
    } catch (error) {
    }
  };

  useEffect(() => {
    if (isVisible) {
      // جلب الإحصائيات فوراً
      updateStats();
      
      // تحديث كل 3 ثوان
      const interval = setInterval(updateStats, 3000);
      setRefreshInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [isVisible]);

  useEffect(() => {
    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  }, [refreshInterval]);

  if (!isVisible || !stats) return null;

  const getPositionClasses = () => {
    const base = 'fixed z-50 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700';
    
    switch (position) {
      case 'top-left':
        return `${base} top-4 left-4`;
      case 'top-right':
        return `${base} top-4 right-4`;
      case 'bottom-left':
        return `${base} bottom-4 left-4`;
      case 'bottom-right':
      default:
        return `${base} bottom-4 right-4`;
    }
  };

  const getCacheHitRatioColor = (ratio: string) => {
    const numericRatio = parseFloat(ratio);
    if (numericRatio >= 80) return 'text-green-400';
    if (numericRatio >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'صالح':
        return 'text-green-400';
      case 'منتهي الصلاحية':
        return 'text-yellow-400';
      case 'غير موجود':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className={getPositionClasses()}>
      <div className="p-3">
        {/* Header */}
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <span className="text-blue-400">🔐</span>
            <span className="font-medium">Auth Monitor</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={getCacheHitRatioColor(stats.cacheHitRatio)}>
              {stats.cacheHitRatio}
            </span>
            <span className="text-gray-400">
              {isExpanded ? '▼' : '▶'}
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-3 space-y-2 min-w-[250px]">
            {/* Cache Performance */}
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-300 font-medium mb-1">📈 الأداء</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">إجمالي الطلبات:</span>
                  <span className="ml-1 text-white">{stats.totalRequests}</span>
                </div>
                <div>
                  <span className="text-gray-400">Cache Hits:</span>
                  <span className="ml-1 text-green-400">{stats.cacheHits}</span>
                </div>
                <div>
                  <span className="text-gray-400">طلبات الشبكة:</span>
                  <span className="ml-1 text-blue-400">{stats.networkRequests}</span>
                </div>
                <div>
                  <span className="text-gray-400">نسبة النجاح:</span>
                  <span className={`ml-1 font-medium ${getCacheHitRatioColor(stats.cacheHitRatio)}`}>
                    {stats.cacheHitRatio}
                  </span>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-300 font-medium mb-1">⚙️ الحالة</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">مهيأ:</span>
                  <span className={stats.isInitialized ? 'text-green-400' : 'text-red-400'}>
                    {stats.isInitialized ? '✅ نعم' : '❌ لا'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Cache:</span>
                  <span className={getStatusColor(stats.cacheStatus)}>
                    {stats.cacheStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">المشتركين:</span>
                  <span className="text-white">{stats.subscribers}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-800 rounded p-2">
              <div className="text-gray-300 font-medium mb-1">🛠️ الأدوات</div>
              <div className="flex space-x-2">
                <button
                  onClick={updateStats}
                  className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                >
                  تحديث
                </button>
                <button
                  onClick={() => {
                    alert('تم طباعة الإحصائيات في Console');
                  }}
                  className="px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs transition-colors"
                >
                  طباعة
                </button>
              </div>
            </div>

            {/* Performance Tips */}
            {stats.cacheHitRatio && parseFloat(stats.cacheHitRatio) < 60 && (
              <div className="bg-yellow-900/50 border border-yellow-600 rounded p-2">
                <div className="text-yellow-400 font-medium text-xs mb-1">⚠️ تحذير</div>
                <div className="text-yellow-200 text-xs">
                  نسبة Cache Hit منخفضة. قد تحتاج لمراجعة استخدام المصادقة.
                </div>
              </div>
            )}

            {stats.networkRequests > 10 && (
              <div className="bg-red-900/50 border border-red-600 rounded p-2">
                <div className="text-red-400 font-medium text-xs mb-1">🚨 تنبيه</div>
                <div className="text-red-200 text-xs">
                  عدد كبير من طلبات الشبكة ({stats.networkRequests}). 
                  الهدف هو أقل من 3 طلبات.
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthPerformanceMonitor;
