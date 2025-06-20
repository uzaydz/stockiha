import React, { useState, useEffect, useCallback } from 'react';
import { performanceTracker, PerformanceMetric, PageLoadMetrics } from '@/lib/performance-tracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity,
  Zap,
  AlertTriangle,
  TrendingUp,
  Clock,
  Cpu,
  HardDrive,
  BarChart,
  AlertCircle,
  CheckCircle,
  Info,
  RefreshCw,
  Download,
  Gauge
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

// ألوان للرسوم البيانية
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AdvancedPerformanceMonitor() {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [pageMetrics, setPageMetrics] = useState<PageLoadMetrics | undefined>();
  const [componentStats, setComponentStats] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(5); // دقائق

  // تحديث البيانات
  const updateData = useCallback(() => {
    const allMetrics = performanceTracker.getMetrics();
    const currentPageMetrics = performanceTracker.getPageMetrics();
    const slowComponents = performanceTracker.getSlowestComponents();
    const performanceAnalysis = performanceTracker.analyzePerformance();
    
    setMetrics(allMetrics);
    setPageMetrics(currentPageMetrics);
    setComponentStats(slowComponents);
    setAnalysis(performanceAnalysis);
  }, []);

  useEffect(() => {
    // الاستماع للتحديثات
    const handleMetricUpdate = () => {
      if (autoRefresh) {
        updateData();
      }
    };

    performanceTracker.addListener(handleMetricUpdate);
    updateData();

    // تحديث دوري
    const interval = setInterval(() => {
      if (autoRefresh) {
        updateData();
      }
    }, 2000);

    return () => {
      performanceTracker.removeListener(handleMetricUpdate);
      clearInterval(interval);
    };
  }, [autoRefresh, updateData]);

  // فلترة المقاييس حسب الوقت
  const filteredMetrics = metrics.filter(metric => {
    const metricTime = metric.startTime;
    const now = performance.now();
    const timeRangeMs = selectedTimeRange * 60 * 1000;
    return now - metricTime < timeRangeMs;
  });

  // تحضير بيانات الرسوم البيانية
  const prepareTimeSeriesData = () => {
    const groupedByMinute: Record<string, { time: string; count: number; avgDuration: number }> = {};
    
    filteredMetrics.forEach(metric => {
      const minute = Math.floor(metric.startTime / 60000) * 60000;
      const key = new Date(minute).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      
      if (!groupedByMinute[key]) {
        groupedByMinute[key] = { time: key, count: 0, avgDuration: 0 };
      }
      
      groupedByMinute[key].count++;
      groupedByMinute[key].avgDuration = 
        (groupedByMinute[key].avgDuration * (groupedByMinute[key].count - 1) + metric.duration) / 
        groupedByMinute[key].count;
    });
    
    return Object.values(groupedByMinute).slice(-10);
  };

  const timeSeriesData = prepareTimeSeriesData();

  // حساب نسبة الأداء الإجمالية
  const calculatePerformanceScore = () => {
    if (!pageMetrics) return 0;
    
    let score = 100;
    
    // LCP
    if (pageMetrics.lcp) {
      if (pageMetrics.lcp > 4000) score -= 30;
      else if (pageMetrics.lcp > 2500) score -= 15;
    }
    
    // FID
    if (pageMetrics.fid) {
      if (pageMetrics.fid > 300) score -= 20;
      else if (pageMetrics.fid > 100) score -= 10;
    }
    
    // CLS
    if (pageMetrics.cls) {
      if (pageMetrics.cls > 0.25) score -= 20;
      else if (pageMetrics.cls > 0.1) score -= 10;
    }
    
    // TTFB
    if (pageMetrics.ttfb) {
      if (pageMetrics.ttfb > 1800) score -= 10;
      else if (pageMetrics.ttfb > 600) score -= 5;
    }
    
    return Math.max(0, score);
  };

  const performanceScore = calculatePerformanceScore();

  // تحديد لون النتيجة
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // تصدير البيانات
  const exportData = () => {
    const data = {
      pageMetrics,
      componentStats,
      analysis,
      metrics: filteredMetrics,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // تنسيق القيم
  const formatMs = (ms?: number) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* زر التبديل */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className="mb-2 gap-2"
        variant={performanceScore < 50 ? "destructive" : "secondary"}
      >
        <Activity className="w-4 h-4" />
        مراقب الأداء
        <Badge variant="secondary" className={cn("ml-2", getScoreColor(performanceScore))}>
          {performanceScore}%
        </Badge>
      </Button>

      {/* النافذة الرئيسية */}
      {isOpen && (
        <Card className="w-[1000px] h-[700px] shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">مراقب الأداء المتقدم</CardTitle>
                <CardDescription>
                  تحليل شامل لأداء التطبيق والصفحات
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={autoRefresh ? "default" : "outline"}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  {autoRefresh ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  {autoRefresh ? "تحديث تلقائي" : "متوقف"}
                </Button>
                <Button size="sm" variant="outline" onClick={exportData}>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير التقرير
                </Button>
              </div>
            </div>

            {/* نتيجة الأداء الإجمالية */}
            <div className="mt-4 p-4 bg-accent rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative w-20 h-20">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="36"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray={`${(performanceScore / 100) * 226} 226`}
                        className={getScoreColor(performanceScore)}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={cn("text-2xl font-bold", getScoreColor(performanceScore))}>
                        {performanceScore}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">نتيجة الأداء</h3>
                    <p className="text-sm text-muted-foreground">
                      {performanceScore >= 90 ? 'ممتاز' : 
                       performanceScore >= 50 ? 'يحتاج تحسين' : 'ضعيف'}
                    </p>
                  </div>
                </div>
                
                {/* Core Web Vitals */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">LCP</div>
                    <div className={cn("text-lg font-semibold", 
                      pageMetrics?.lcp && pageMetrics.lcp > 2500 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {formatMs(pageMetrics?.lcp)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">FID</div>
                    <div className={cn("text-lg font-semibold",
                      pageMetrics?.fid && pageMetrics.fid > 100 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {formatMs(pageMetrics?.fid)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">CLS</div>
                    <div className={cn("text-lg font-semibold",
                      pageMetrics?.cls && pageMetrics.cls > 0.1 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {pageMetrics?.cls?.toFixed(3) || '0'}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground">TTFB</div>
                    <div className={cn("text-lg font-semibold",
                      pageMetrics?.ttfb && pageMetrics.ttfb > 600 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {formatMs(pageMetrics?.ttfb)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="components">المكونات</TabsTrigger>
                <TabsTrigger value="resources">الموارد</TabsTrigger>
                <TabsTrigger value="memory">الذاكرة</TabsTrigger>
                <TabsTrigger value="analysis">التحليل</TabsTrigger>
              </TabsList>

              <ScrollArea className="h-[450px] mt-4">
                <TabsContent value="overview" className="space-y-4">
                  {/* رسم بياني للأداء عبر الوقت */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">الأداء عبر الوقت</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={timeSeriesData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Line 
                            type="monotone" 
                            dataKey="avgDuration" 
                            stroke="#8884d8" 
                            name="متوسط المدة (ms)"
                          />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#82ca9d" 
                            name="عدد العمليات"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* معلومات تحميل الصفحة */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">أوقات التحميل</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">DOM Content Loaded</span>
                          <Badge variant="outline">{formatMs(pageMetrics?.domContentLoaded)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Page Load Complete</span>
                          <Badge variant="outline">{formatMs(pageMetrics?.loadComplete)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">First Contentful Paint</span>
                          <Badge variant="outline">{formatMs(pageMetrics?.fcp)}</Badge>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">إحصائيات الشبكة</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">إجمالي الطلبات</span>
                          <Badge variant="outline">{pageMetrics?.totalRequests || 0}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">الحجم الكلي</span>
                          <Badge variant="outline">{formatBytes(pageMetrics?.totalSize)}</Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">طلبات مخزنة</span>
                          <Badge variant="outline">{pageMetrics?.cachedRequests || 0}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="components" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">أبطأ المكونات</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {componentStats.map((comp, index) => (
                          <div key={comp.component} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{comp.component}</span>
                              <div className="flex gap-2">
                                <Badge variant="secondary">
                                  {comp.renderCount} renders
                                </Badge>
                                <Badge variant={comp.averageTime > 50 ? "destructive" : "outline"}>
                                  {formatMs(comp.averageTime)} avg
                                </Badge>
                              </div>
                            </div>
                            <Progress 
                              value={(comp.averageTime / componentStats[0].averageTime) * 100} 
                              className="h-2"
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="resources" className="space-y-4">
                  {/* توزيع أنواع الموارد */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">توزيع الموارد</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Scripts', value: filteredMetrics.filter(m => m.metadata?.initiatorType === 'script').length },
                              { name: 'Styles', value: filteredMetrics.filter(m => m.metadata?.initiatorType === 'css').length },
                              { name: 'Images', value: filteredMetrics.filter(m => m.metadata?.initiatorType === 'img').length },
                              { name: 'XHR/Fetch', value: filteredMetrics.filter(m => m.metadata?.initiatorType === 'xmlhttprequest' || m.metadata?.initiatorType === 'fetch').length },
                              { name: 'Other', value: filteredMetrics.filter(m => !['script', 'css', 'img', 'xmlhttprequest', 'fetch'].includes(m.metadata?.initiatorType)).length }
                            ]}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {COLORS.map((color, index) => (
                              <Cell key={`cell-${index}`} fill={color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="memory" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">استخدام الذاكرة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {pageMetrics?.memoryUsage ? (
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm">الذاكرة المستخدمة</span>
                              <span className="text-sm font-medium">
                                {formatBytes(pageMetrics.memoryUsage.usedJSHeapSize)}
                              </span>
                            </div>
                            <Progress 
                              value={(pageMetrics.memoryUsage.usedJSHeapSize / pageMetrics.memoryUsage.jsHeapSizeLimit) * 100}
                              className="h-3"
                            />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 mt-4">
                            <div className="text-center">
                              <HardDrive className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-xs text-muted-foreground">مستخدم</div>
                              <div className="font-medium">{formatBytes(pageMetrics.memoryUsage.usedJSHeapSize)}</div>
                            </div>
                            <div className="text-center">
                              <Cpu className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-xs text-muted-foreground">مخصص</div>
                              <div className="font-medium">{formatBytes(pageMetrics.memoryUsage.totalJSHeapSize)}</div>
                            </div>
                            <div className="text-center">
                              <Gauge className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                              <div className="text-xs text-muted-foreground">الحد الأقصى</div>
                              <div className="font-medium">{formatBytes(pageMetrics.memoryUsage.jsHeapSizeLimit)}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Info className="w-12 h-12 mx-auto mb-2" />
                          <p>معلومات الذاكرة غير متوفرة</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="analysis" className="space-y-4">
                  {analysis && (
                    <>
                      {/* المشاكل المكتشفة */}
                      {analysis.issues.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <AlertTriangle className="w-5 h-5 text-yellow-600" />
                              المشاكل المكتشفة
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {analysis.issues.map((issue: any, index: number) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-accent rounded-lg">
                                  {issue.type === 'error' ? (
                                    <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                                  ) : (
                                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                  )}
                                  <div className="flex-1">
                                    <div className="font-medium">{issue.message}</div>
                                    <div className="text-sm text-muted-foreground mt-1">
                                      {issue.metric}: {issue.value} 
                                      {issue.threshold && ` (الحد المسموح: ${issue.threshold})`}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* التوصيات */}
                      {analysis.recommendations.length > 0 && (
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                              <TrendingUp className="w-5 h-5 text-green-600" />
                              توصيات التحسين
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {analysis.recommendations.map((rec: string, index: number) => (
                                <div key={index} className="flex items-start gap-3">
                                  <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                                  <span>{rec}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </>
                  )}
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}