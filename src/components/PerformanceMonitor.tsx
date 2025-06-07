import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, Clock, Zap, BarChart3, Trash2 } from 'lucide-react';

interface PerformanceStats {
  memoryUsage: number;
  renderTime: number;
  cacheHits: number;
  cacheMisses: number;
  totalRequests: number;
  averageResponseTime: number;
}

interface PerformanceMonitorProps {
  cache?: {
    getStats: () => {
      totalEntries: number;
      expiredEntries: number;
      validEntries: number;
      memoryUsage: number;
    };
    invalidate: () => void;
  };
  visible?: boolean;
  onToggle?: () => void;
}

const PerformanceMonitor = ({ cache, visible = false, onToggle }: PerformanceMonitorProps) => {
  const [stats, setStats] = useState<PerformanceStats>({
    memoryUsage: 0,
    renderTime: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalRequests: 0,
    averageResponseTime: 0
  });

  const [cacheStats, setCacheStats] = useState({
    totalEntries: 0,
    expiredEntries: 0,
    validEntries: 0,
    memoryUsage: 0
  });

  useEffect(() => {
    if (!visible) return;

    const updateStats = () => {
      // Memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setStats(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / (1024 * 1024) // MB
        }));
      }

      // Cache stats
      if (cache) {
        setCacheStats(cache.getStats());
      }
    };

    const interval = setInterval(updateStats, 1000);
    updateStats();

    return () => clearInterval(interval);
  }, [visible, cache]);

  const formatBytes = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const clearCache = () => {
    if (cache) {
      cache.invalidate();
      setCacheStats({
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0,
        memoryUsage: 0
      });
    }
  };

  if (!visible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onToggle}
        className="fixed bottom-4 left-4 z-50 bg-background/80 backdrop-blur-sm"
      >
        <Activity className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-sm">
      <Card className="bg-background/95 backdrop-blur-sm border shadow-lg">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              مراقب الأداء
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Memory Usage */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-blue-500" />
              <span className="text-sm">الذاكرة</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {stats.memoryUsage.toFixed(1)} MB
            </Badge>
          </div>

          {/* Cache Stats */}
          <div className="space-y-2 border-t pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" />
                <span className="text-sm">الكاش</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="text-xs">
                  {cacheStats.validEntries}/{cacheStats.totalEntries}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearCache}
                  className="h-6 w-6 p-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex justify-between">
                <span>الذاكرة المستخدمة:</span>
                <span>{formatBytes(cacheStats.memoryUsage)}</span>
              </div>
              <div className="flex justify-between">
                <span>المدخلات المنتهية الصلاحية:</span>
                <span>{cacheStats.expiredEntries}</span>
              </div>
            </div>
          </div>

          {/* Performance Indicators */}
          <div className="border-t pt-2">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-orange-500" />
                <span>وقت التحميل</span>
              </div>
              <Badge variant="outline" className="text-xs justify-center">
                {stats.renderTime}ms
              </Badge>
              
              <div className="flex items-center gap-1">
                <BarChart3 className="h-3 w-3 text-purple-500" />
                <span>الطلبات</span>
              </div>
              <Badge variant="outline" className="text-xs justify-center">
                {stats.totalRequests}
              </Badge>
            </div>
          </div>

          {/* Cache Hit Rate */}
          {(stats.cacheHits + stats.cacheMisses) > 0 && (
            <div className="border-t pt-2">
              <div className="text-xs text-muted-foreground mb-1">معدل نجاح الكاش</div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${(stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100}%`
                    }}
                  />
                </div>
                <span className="text-xs font-medium">
                  {Math.round((stats.cacheHits / (stats.cacheHits + stats.cacheMisses)) * 100)}%
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PerformanceMonitor; 