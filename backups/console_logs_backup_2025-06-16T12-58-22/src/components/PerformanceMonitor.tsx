import React, { useEffect, useState, useCallback } from 'react';
import { block } from 'million/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Database, Clock, Zap, BarChart3, Trash2 } from 'lucide-react';

// Performance metrics interface
interface PerformanceMetrics {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
  domInteractive: number;
  domComplete: number;
  loadEventEnd: number;
  navigationStart: number;
}

interface PerformanceMonitorProps {
  enabled?: boolean;
  logToConsole?: boolean;
  onMetricsChange?: (metrics: Partial<PerformanceMetrics>) => void;
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

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = block(({ 
  enabled = process.env.NODE_ENV === 'development',
  logToConsole = true,
  onMetricsChange,
  cache,
  visible = false,
  onToggle
}) => {
  // إخفاء المكون في الإنتاج
  if (process.env.NODE_ENV === 'production' || !enabled) {
    return null;
  }
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});
  const [isVisible, setIsVisible] = useState(false);

  const [stats, setStats] = useState({
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

  const updateMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    onMetricsChange?.(newMetrics);
    
    if (logToConsole) {
      Object.entries(newMetrics).forEach(([key, value]) => {
        const formattedValue = typeof value === 'number' ? `${value.toFixed(2)}ms` : value;
      });
    }
  }, [logToConsole, onMetricsChange]);

  const measureWebVitals = useCallback(() => {
    if (!('performance' in window)) return;

    // Get navigation timing
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      updateMetrics({
        ttfb: navigation.responseStart - navigation.requestStart,
        domInteractive: navigation.domInteractive - navigation.startTime,
        domComplete: navigation.domComplete - navigation.startTime,
        loadEventEnd: navigation.loadEventEnd - navigation.startTime,
        navigationStart: navigation.startTime
      });
    }

    // Get paint timing
    const paintEntries = performance.getEntriesByType('paint');
    paintEntries.forEach(entry => {
      if (entry.name === 'first-contentful-paint') {
        updateMetrics({ fcp: entry.startTime });
      }
    });

    // Observe LCP
    if ('PerformanceObserver' in window) {
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          updateMetrics({ lcp: lastEntry.startTime });
        });
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

        // Observe FID
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-input') {
              updateMetrics({ fid: (entry as any).processingStart - entry.startTime });
            }
          });
        });
        fidObserver.observe({ entryTypes: ['first-input'] });

        // Observe CLS
        let clsValue = 0;
        const clsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          });
          updateMetrics({ cls: clsValue });
        });
        clsObserver.observe({ entryTypes: ['layout-shift'] });

        return () => {
          lcpObserver.disconnect();
          fidObserver.disconnect();
          clsObserver.disconnect();
        };
      } catch (error) {
      }
    }
  }, [updateMetrics]);

  const getPerformanceGrade = (metric: keyof PerformanceMetrics, value: number): string => {
    const thresholds = {
      fcp: { good: 1800, needsImprovement: 3000 },
      lcp: { good: 2500, needsImprovement: 4000 },
      fid: { good: 100, needsImprovement: 300 },
      cls: { good: 0.1, needsImprovement: 0.25 },
      ttfb: { good: 800, needsImprovement: 1800 }
    };

    const threshold = thresholds[metric];
    if (!threshold) return '⚪';

    if (value <= threshold.good) return '🟢';
    if (value <= threshold.needsImprovement) return '🟡';
    return '🔴';
  };

  useEffect(() => {
    if (!enabled) return;

    measureWebVitals();

    // Measure after page load
    const handleLoad = () => {
      setTimeout(measureWebVitals, 100);
    };

    if (document.readyState === 'complete') {
      handleLoad();
    } else {
      window.addEventListener('load', handleLoad);
      return () => window.removeEventListener('load', handleLoad);
    }
  }, [enabled, measureWebVitals]);

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

  if (!enabled) return null;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="fixed bottom-4 left-4 z-[9999] bg-black/80 text-white px-3 py-2 rounded-full text-xs font-mono hover:bg-black transition-colors print:hidden"
        title="Toggle Performance Monitor"
      >
        📊 {Object.keys(metrics).length}
      </button>

      {/* Performance Panel */}
      {isVisible && (
        <div className="fixed bottom-16 left-4 z-[9998] bg-black/90 text-white p-4 rounded-lg max-w-sm text-xs font-mono print:hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-bold">Performance Metrics</h3>
            <button 
              onClick={() => setIsVisible(false)}
              className="text-white/60 hover:text-white"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-2">
            {metrics.fcp && (
              <div className="flex justify-between">
                <span>FCP:</span>
                <span>
                  {getPerformanceGrade('fcp', metrics.fcp)} {metrics.fcp.toFixed(0)}ms
                </span>
              </div>
            )}
            
            {metrics.lcp && (
              <div className="flex justify-between">
                <span>LCP:</span>
                <span>
                  {getPerformanceGrade('lcp', metrics.lcp)} {metrics.lcp.toFixed(0)}ms
                </span>
              </div>
            )}
            
            {metrics.fid && (
              <div className="flex justify-between">
                <span>FID:</span>
                <span>
                  {getPerformanceGrade('fid', metrics.fid)} {metrics.fid.toFixed(0)}ms
                </span>
              </div>
            )}
            
            {metrics.cls !== undefined && (
              <div className="flex justify-between">
                <span>CLS:</span>
                <span>
                  {getPerformanceGrade('cls', metrics.cls)} {metrics.cls.toFixed(3)}
                </span>
              </div>
            )}
            
            {metrics.ttfb && (
              <div className="flex justify-between">
                <span>TTFB:</span>
                <span>
                  {getPerformanceGrade('ttfb', metrics.ttfb)} {metrics.ttfb.toFixed(0)}ms
                </span>
              </div>
            )}
            
            {metrics.domInteractive && (
              <div className="flex justify-between">
                <span>DOM Interactive:</span>
                <span>{metrics.domInteractive.toFixed(0)}ms</span>
              </div>
            )}
            
            {metrics.loadEventEnd && (
              <div className="flex justify-between">
                <span>Load Complete:</span>
                <span>{metrics.loadEventEnd.toFixed(0)}ms</span>
              </div>
            )}
          </div>

          <div className="mt-3 pt-2 border-t border-white/20 text-[10px] text-white/60">
            🟢 Good • 🟡 Needs Improvement • 🔴 Poor
          </div>

          <button
            onClick={() => {
              setMetrics({});
              measureWebVitals();
            }}
            className="mt-2 w-full bg-white/10 hover:bg-white/20 px-2 py-1 rounded text-[10px] transition-colors"
          >
            🔄 Refresh Metrics
          </button>
        </div>
      )}

      {/* Performance Monitor Card */}
      {visible && (
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
      )}
    </>
  );
});

PerformanceMonitor.displayName = 'PerformanceMonitor';

export default PerformanceMonitor;

// Hook لاستخدام Performance Metrics في مكونات أخرى
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = useState<Partial<PerformanceMetrics>>({});

  useEffect(() => {
    if (!('performance' in window)) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.entryType === 'paint' && entry.name === 'first-contentful-paint') {
          setMetrics(prev => ({ ...prev, fcp: entry.startTime }));
        }
        if (entry.entryType === 'largest-contentful-paint') {
          setMetrics(prev => ({ ...prev, lcp: entry.startTime }));
        }
      });
    });

    observer.observe({ entryTypes: ['paint', 'largest-contentful-paint'] });

    return () => observer.disconnect();
  }, []);

  return metrics;
};
