import React, { useState, useEffect, useCallback } from 'react';
import { usePerformanceOptimizer } from '@/hooks/usePerformanceOptimizer';
import { getReflowStats } from '@/utils/performanceOptimizer';
import { AlertTriangle, Activity, Zap, Clock } from 'lucide-react';

interface PerformanceMonitorProps {
  showInProduction?: boolean;
  position?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  autoHide?: boolean;
  hideDelay?: number;
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  showInProduction = false,
  position = 'bottom-right',
  autoHide = true,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [stats, setStats] = useState<any>({});
  const [showDetails, setShowDetails] = useState(false);
  const [hasError, setHasError] = useState(false);

  const { getPerformanceStats, printPerformanceReport } = usePerformanceOptimizer({
    enableLogging: true,
    detectReflows: true
  });

  // تحديث الإحصائيات كل ثانية مع حماية من الأخطاء
  useEffect(() => {
    const updateStats = () => {
      try {
        const performanceStats = getPerformanceStats();
        const reflowStats = getReflowStats();
        
        setStats({
          ...performanceStats,
          ...reflowStats
        });

        // إظهار المراقب إذا كان هناك مشاكل
        if (performanceStats.slowOperations > 0 || reflowStats.reflowCount > 5) {
          setIsVisible(true);
          
          if (autoHide) {
            setTimeout(() => setIsVisible(false), hideDelay);
          }
        }
      } catch (error) {
        console.warn('Error updating performance stats:', error);
        setHasError(true);
      }
    };

    const interval = setInterval(updateStats, 1000);
    return () => clearInterval(interval);
  }, [getPerformanceStats, autoHide, hideDelay]);

  // إخفاء المراقب في production إذا لم يكن مطلوباً
  if (process.env.NODE_ENV === 'production' && !showInProduction) {
    return null;
  }

  // إخفاء المراقب إذا كان هناك خطأ
  if (hasError) {
    return null;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getPerformanceColor = () => {
    if (stats.reflowCount > 10 || stats.slowOperations > 5) {
      return 'text-red-500 bg-red-50 border-red-200';
    } else if (stats.reflowCount > 5 || stats.slowOperations > 2) {
      return 'text-yellow-500 bg-yellow-50 border-yellow-200';
    } else {
      return 'text-green-500 bg-green-50 border-green-200';
    }
  };

  const getPerformanceIcon = () => {
    if (stats.reflowCount > 10 || stats.slowOperations > 5) {
      return <AlertTriangle className="h-4 w-4" />;
    } else if (stats.reflowCount > 5 || stats.slowOperations > 2) {
      return <Activity className="h-4 w-4" />;
    } else {
      return <Zap className="h-4 w-4" />;
    }
  };

  if (!isVisible && !showDetails) {
    return null;
  }

  return (
    <div className={`fixed z-50 ${getPositionClasses()}`}>
      <div className={`rounded-lg border p-3 shadow-lg backdrop-blur-sm ${getPerformanceColor()}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getPerformanceIcon()}
            <span className="text-sm font-medium">مراقب الأداء</span>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            {showDetails ? 'إخفاء' : 'تفاصيل'}
          </button>
        </div>

        <div className="space-y-1 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="h-3 w-3" />
            <span>متوسط المدة: {stats.averageDuration?.toFixed(1) || '0'}ms</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Activity className="h-3 w-3" />
            <span>عمليات بطيئة: {stats.slowOperations || 0}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="h-3 w-3" />
            <span>Reflow: {stats.reflowCount || 0}</span>
          </div>
        </div>

        {showDetails && (
          <div className="mt-3 pt-3 border-t border-current border-opacity-20">
            <div className="space-y-1 text-xs">
              <div>إجمالي العمليات: {stats.totalMetrics || 0}</div>
              <div>قراءات DOM معلقة: {stats.pendingReads || 0}</div>
              <div>كتابات DOM معلقة: {stats.pendingWrites || 0}</div>
              
              <button
                onClick={printPerformanceReport}
                className="mt-2 w-full text-xs bg-current bg-opacity-10 hover:bg-opacity-20 px-2 py-1 rounded"
              >
                طباعة التقرير
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceMonitor;
