import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Zap, 
  RefreshCw, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { useCacheStats } from '@/hooks/useOptimizedQuery';
import { cacheManager } from '@/lib/cache/CentralCacheManager';
import { cn } from '@/lib/utils';

interface PerformanceMetrics {
  queries: {
    total: number;
    cached: number;
    pending: number;
    failed: number;
  };
  cache: {
    hits: number;
    misses: number;
    staleHits: number;
    hitRate: number;
    size: number;
    maxSize: number;
  };
  database: {
    activeConnections: number;
    avgResponseTime: number;
    slowQueries: number;
  };
}

export const PerformanceMonitor: React.FC<{ isVisible?: boolean }> = ({ 
  isVisible = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(isVisible);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const { data: cacheStats } = useCacheStats();

  // Update metrics
  useEffect(() => {
    if (cacheStats) {
      setMetrics({
        queries: {
          total: cacheStats.reactQuery.queryCount,
          cached: cacheStats.cache.hits,
          pending: 0, // TODO: Track pending queries
          failed: 0, // TODO: Track failed queries
        },
        cache: cacheStats.cache,
        database: {
          activeConnections: 0, // TODO: Track active connections
          avgResponseTime: 0, // TODO: Track response time
          slowQueries: 0, // TODO: Track slow queries
        }
      });
    }
  }, [cacheStats]);

  const clearCache = useCallback(() => {
    cacheManager.clear();
    window.location.reload();
  }, []);

  if (!isExpanded) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 left-4 z-50 rounded-full shadow-lg"
        onClick={() => setIsExpanded(true)}
      >
        <Activity className="h-4 w-4" />
      </Button>
    );
  }

  if (!metrics) return null;

  const cacheUsagePercent = (metrics.cache.size / metrics.cache.maxSize) * 100;
  const isPerformanceGood = metrics.cache.hitRate > 0.7;

  return (
    <Card className="fixed bottom-4 left-4 z-50 w-96 max-h-[600px] overflow-auto shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            مراقب الأداء
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Overall Status */}
        <div className={cn(
          "p-3 rounded-lg flex items-center gap-3",
          isPerformanceGood 
            ? "bg-green-50 dark:bg-green-950/20" 
            : "bg-yellow-50 dark:bg-yellow-950/20"
        )}>
          {isPerformanceGood ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <AlertCircle className="h-5 w-5 text-yellow-600" />
          )}
          <div className="flex-1">
            <p className="font-medium text-sm">
              {isPerformanceGood ? 'الأداء ممتاز' : 'الأداء يحتاج تحسين'}
            </p>
            <p className="text-xs text-muted-foreground">
              معدل إصابة الكاش: {(metrics.cache.hitRate * 100).toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Cache Statistics */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            إحصائيات التخزين المؤقت
          </h3>
          
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="text-center p-2 bg-muted rounded">
              <p className="font-bold text-green-600">{metrics.cache.hits}</p>
              <p className="text-xs text-muted-foreground">إصابات</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="font-bold text-red-600">{metrics.cache.misses}</p>
              <p className="text-xs text-muted-foreground">أخطاء</p>
            </div>
            <div className="text-center p-2 bg-muted rounded">
              <p className="font-bold text-yellow-600">{metrics.cache.staleHits}</p>
              <p className="text-xs text-muted-foreground">قديمة</p>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>استخدام الذاكرة</span>
              <span>{metrics.cache.size} / {metrics.cache.maxSize}</span>
            </div>
            <Progress value={cacheUsagePercent} className="h-2" />
          </div>
        </div>

        {/* Query Statistics */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <Zap className="h-4 w-4" />
            الاستعلامات النشطة
          </h3>
          
          <div className="flex items-center justify-between text-sm">
            <span>إجمالي الاستعلامات</span>
            <Badge variant="secondary">{metrics.queries.total}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>من الكاش</span>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              {metrics.queries.cached}
            </Badge>
          </div>
        </div>

        {/* Performance Tips */}
        {!isPerformanceGood && (
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg space-y-2">
            <h4 className="font-medium text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              نصائح لتحسين الأداء
            </h4>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {metrics.cache.hitRate < 0.5 && (
                <li>• معدل إصابة الكاش منخفض، تحقق من إعدادات TTL</li>
              )}
              {cacheUsagePercent > 80 && (
                <li>• الكاش ممتلئ، قد تحتاج لزيادة الحجم الأقصى</li>
              )}
              {metrics.queries.total > 50 && (
                <li>• عدد كبير من الاستعلامات، فكر في تجميع البيانات</li>
              )}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={clearCache}
            className="flex-1"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            مسح الكاش
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => console.log('Cache stats:', cacheStats)}
            className="flex-1"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            تفاصيل
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceMonitor;