import React, { useState, useEffect, useCallback } from 'react';
import { NetworkMonitor } from './NetworkMonitor';
import { AdvancedPerformanceMonitor } from './AdvancedPerformanceMonitor';
import { DatabaseMonitor } from './DatabaseMonitor';
import { networkInterceptor } from '@/lib/network-interceptor';
import { performanceTracker } from '@/lib/performance-tracker';
import { databaseTracker } from '@/lib/database-tracker';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Monitor,
  Settings,
  Download,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Activity,
  Database,
  Globe,
  Cpu,
  BarChart3,
  Zap,
  Clock,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Eye,
  EyeOff,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  FileText,
  Shield,
  Target,
  Users,
  Server
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface DashboardSettings {
  autoRefresh: boolean;
  refreshInterval: number;
  showNetworkDetails: boolean;
  showPerformanceDetails: boolean;
  showDatabaseDetails: boolean;
  alertOnErrors: boolean;
  alertOnSlowQueries: boolean;
  alertOnHighMemory: boolean;
  minimizeMode: boolean;
  position: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
}

interface SystemHealth {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  network: {
    status: 'healthy' | 'warning' | 'critical';
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    duplicateRequests: number;
  };
  performance: {
    status: 'healthy' | 'warning' | 'critical';
    score: number;
    lcp?: number;
    fid?: number;
    cls?: number;
    memoryUsage?: number;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    totalQueries: number;
    errorRate: number;
    slowQueries: number;
    averageResponseTime: number;
  };
}

export function MasterDebugDashboard() {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState<DashboardSettings>({
    autoRefresh: true,
    refreshInterval: 2000,
    showNetworkDetails: true,
    showPerformanceDetails: true,
    showDatabaseDetails: true,
    alertOnErrors: true,
    alertOnSlowQueries: true,
    alertOnHighMemory: true,
    minimizeMode: false,
    position: 'bottom-left'
  });
  
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<number>(Date.now());

  // تحديث البيانات
  const updateSystemHealth = useCallback(() => {
    // جمع البيانات من جميع أنظمة المراقبة
    const networkStats = networkInterceptor.getStatistics();
    const performanceAnalysis = performanceTracker.analyzePerformance();
    const databaseAnalysis = databaseTracker.analyzePerformance();
    const pageMetrics = performanceTracker.getPageMetrics();

    // حساب حالة الشبكة
    const networkErrorRate = (networkStats.byStatus.error / networkStats.total) * 100 || 0;
    const networkStatus = 
      networkErrorRate > 20 ? 'critical' :
      networkErrorRate > 10 ? 'warning' : 'healthy';

    // حساب حالة الأداء
    const performanceScore = performanceAnalysis?.summary?.pageMetrics ? 
      calculatePerformanceScore(performanceAnalysis.summary.pageMetrics) : 100;
    const performanceStatus = 
      performanceScore < 50 ? 'critical' :
      performanceScore < 70 ? 'warning' : 'healthy';

    // حساب حالة قاعدة البيانات
    const dbErrorRate = databaseAnalysis?.summary?.errorRate || 0;
    const dbStatus = 
      dbErrorRate > 15 ? 'critical' :
      dbErrorRate > 5 ? 'warning' : 'healthy';

    // حساب الحالة الإجمالية
    const statuses = [networkStatus, performanceStatus, dbStatus];
    const overall = 
      statuses.includes('critical') ? 'critical' :
      statuses.includes('warning') ? 'warning' : 
      'excellent';

    const health: SystemHealth = {
      overall,
      network: {
        status: networkStatus,
        totalRequests: networkStats.total,
        errorRate: networkErrorRate,
        averageResponseTime: networkStats.averageDuration,
        duplicateRequests: networkInterceptor.findDuplicateRequests().length
      },
      performance: {
        status: performanceStatus,
        score: performanceScore,
        lcp: pageMetrics?.lcp,
        fid: pageMetrics?.fid,
        cls: pageMetrics?.cls,
        memoryUsage: pageMetrics?.memoryUsage ? 
          (pageMetrics.memoryUsage.usedJSHeapSize / pageMetrics.memoryUsage.jsHeapSizeLimit) * 100 : 0
      },
      database: {
        status: dbStatus,
        totalQueries: databaseAnalysis?.summary?.totalQueries || 0,
        errorRate: dbErrorRate,
        slowQueries: databaseAnalysis?.summary?.slowQueries || 0,
        averageResponseTime: databaseAnalysis?.summary?.averageResponseTime || 0
      }
    };

    setSystemHealth(health);
    setLastUpdate(Date.now());

    // إنشاء التحذيرات
    generateAlerts(health);
  }, []);

  // حساب نتيجة الأداء
  const calculatePerformanceScore = (metrics: any) => {
    let score = 100;
    
    if (metrics.lcp > 4000) score -= 30;
    else if (metrics.lcp > 2500) score -= 15;
    
    if (metrics.fid > 300) score -= 20;
    else if (metrics.fid > 100) score -= 10;
    
    if (metrics.cls > 0.25) score -= 20;
    else if (metrics.cls > 0.1) score -= 10;
    
    return Math.max(0, score);
  };

  // إنشاء التحذيرات
  const generateAlerts = (health: SystemHealth) => {
    const newAlerts = [];
    
    if (settings.alertOnErrors) {
      if (health.network.errorRate > 10) {
        newAlerts.push({
          id: `network-error-${Date.now()}`,
          type: 'error',
          title: 'معدل أخطاء الشبكة مرتفع',
          message: `${health.network.errorRate.toFixed(1)}% من طلبات الشبكة فشلت`,
          timestamp: Date.now()
        });
      }
      
      if (health.database.errorRate > 5) {
        newAlerts.push({
          id: `db-error-${Date.now()}`,
          type: 'error',
          title: 'معدل أخطاء قاعدة البيانات مرتفع',
          message: `${health.database.errorRate.toFixed(1)}% من استعلامات قاعدة البيانات فشلت`,
          timestamp: Date.now()
        });
      }
    }
    
    if (settings.alertOnSlowQueries && health.database.slowQueries > 5) {
      newAlerts.push({
        id: `slow-queries-${Date.now()}`,
        type: 'warning',
        title: 'استعلامات بطيئة مكتشفة',
        message: `${health.database.slowQueries} استعلام يستغرق أكثر من ثانية واحدة`,
        timestamp: Date.now()
      });
    }
    
    if (settings.alertOnHighMemory && health.performance.memoryUsage && health.performance.memoryUsage > 80) {
      newAlerts.push({
        id: `memory-high-${Date.now()}`,
        type: 'warning',
        title: 'استخدام مرتفع للذاكرة',
        message: `${health.performance.memoryUsage.toFixed(1)}% من الذاكرة مستخدمة`,
        timestamp: Date.now()
      });
    }
    
    if (health.performance.score < 50) {
      newAlerts.push({
        id: `performance-low-${Date.now()}`,
        type: 'warning',
        title: 'أداء ضعيف للصفحة',
        message: `نتيجة الأداء: ${health.performance.score}%`,
        timestamp: Date.now()
      });
    }
    
    setAlerts(prev => [...newAlerts, ...prev.slice(0, 20)]); // الاحتفاظ بآخر 20 تحذير
  };

  useEffect(() => {
    if (settings.autoRefresh && isTracking) {
      updateSystemHealth();
      
      const interval = setInterval(updateSystemHealth, settings.refreshInterval);
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, isTracking, updateSystemHealth]);

  // تشغيل/إيقاف المراقبة
  const toggleTracking = () => {
    if (isTracking) {
      networkInterceptor.stopIntercepting();
      performanceTracker.stopTracking();
      databaseTracker.stopTracking();
    } else {
      networkInterceptor.startIntercepting();
      performanceTracker.startTracking();
      databaseTracker.startTracking();
    }
    setIsTracking(!isTracking);
  };

  // مسح جميع البيانات
  const clearAllData = () => {
    networkInterceptor.clearRequests();
    performanceTracker.clear();
    databaseTracker.clearQueries();
    setAlerts([]);
    updateSystemHealth();
  };

  // تصدير تقرير شامل
  const exportFullReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      systemHealth,
      alerts,
      settings,
      networkData: {
        statistics: networkInterceptor.getStatistics(),
        requests: networkInterceptor.getRequests().slice(0, 100)
      },
      performanceData: {
        metrics: performanceTracker.getMetrics().slice(0, 100),
        pageMetrics: performanceTracker.getPageMetrics(),
        analysis: performanceTracker.analyzePerformance()
      },
      databaseData: {
        queries: databaseTracker.getQueries().slice(0, 100),
        tableStats: databaseTracker.getTableStats(),
        analysis: databaseTracker.analyzePerformance()
      }
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-report-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // حساب لون الحالة
  const getHealthColor = (status: string) => {
    switch (status) {
      case 'excellent':
      case 'healthy':
        return 'text-green-600 bg-green-50';
      case 'good':
      case 'warning':
        return 'text-yellow-600 bg-yellow-50';
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  // تنسيق القيم
  const formatMs = (ms?: number) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  const formatPercentage = (value?: number) => {
    return value ? `${value.toFixed(1)}%` : '0%';
  };

  if (settings.minimizeMode && !isOpen) {
    return (
      <div className={cn(
        "fixed z-50",
        settings.position === 'bottom-left' && "bottom-4 left-4",
        settings.position === 'bottom-right' && "bottom-4 right-4",
        settings.position === 'top-left' && "top-4 left-4",
        settings.position === 'top-right' && "top-4 right-4"
      )}>
        <Button
          onClick={() => setIsOpen(true)}
          size="sm"
          className={cn(
            "gap-2 shadow-lg",
            systemHealth && getHealthColor(systemHealth.overall)
          )}
        >
          <Monitor className="w-4 h-4" />
          مراقب النظام
          {alerts.filter(a => a.type === 'error').length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {alerts.filter(a => a.type === 'error').length}
            </Badge>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className={cn(
      "fixed z-50",
      settings.position === 'bottom-left' && "bottom-4 left-4",
      settings.position === 'bottom-right' && "bottom-4 right-4",
      settings.position === 'top-left' && "top-4 left-4",
      settings.position === 'top-right' && "top-4 right-4"
    )}>
      {/* أزرار الأدوات */}
      <div className="flex gap-2 mb-2">
        <Button
          size="sm"
          variant={isOpen ? "default" : "secondary"}
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <Monitor className="w-4 h-4" />
          لوحة التحكم الرئيسية
          {systemHealth && (
            <div className={cn(
              "w-3 h-3 rounded-full",
              systemHealth.overall === 'excellent' ? 'bg-green-500' :
              systemHealth.overall === 'good' ? 'bg-blue-500' :
              systemHealth.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
            )} />
          )}
        </Button>
        
        <Button
          size="sm"
          variant={isTracking ? "default" : "outline"}
          onClick={toggleTracking}
          className="gap-2"
        >
          {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isTracking ? "إيقاف" : "تشغيل"}
        </Button>
      </div>

      {/* النافذة الرئيسية */}
      {isOpen && (
        <Card className="w-[1400px] h-[800px] shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Monitor className="w-6 h-6" />
                  لوحة التحكم الرئيسية - مراقب النظام الشامل
                </CardTitle>
                <CardDescription>
                  مراقبة متقدمة لجميع جوانب التطبيق في الوقت الفعلي
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={settings.autoRefresh ? "default" : "outline"}
                  onClick={() => setSettings(s => ({ ...s, autoRefresh: !s.autoRefresh }))}
                >
                  {settings.autoRefresh ? "تحديث تلقائي" : "متوقف"}
                </Button>
                <Button size="sm" variant="outline" onClick={exportFullReport}>
                  <Download className="w-4 h-4 ml-2" />
                  تصدير التقرير
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <RotateCcw className="w-4 h-4 ml-2" />
                      مسح الكل
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف جميع البيانات المسجلة والتحذيرات. هذا الإجراء لا يمكن التراجع عنه.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllData}>
                        نعم، احذف الكل
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button size="sm" variant="outline" onClick={() => setSettings(s => ({ ...s, minimizeMode: !s.minimizeMode }))}>
                  {settings.minimizeMode ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* نظرة عامة سريعة */}
            {systemHealth && (
              <div className="grid grid-cols-4 gap-4 mt-4">
                <Card className={cn("p-4", getHealthColor(systemHealth.overall))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">الحالة الإجمالية</div>
                      <div className="text-2xl font-bold">
                        {systemHealth.overall === 'excellent' ? 'ممتاز' :
                         systemHealth.overall === 'good' ? 'جيد' :
                         systemHealth.overall === 'warning' ? 'تحذير' : 'حرج'}
                      </div>
                    </div>
                    <Activity className="w-8 h-8" />
                  </div>
                  <div className="text-xs mt-2">
                    آخر تحديث: {formatDistanceToNow(lastUpdate, { locale: ar, addSuffix: true })}
                  </div>
                </Card>

                <Card className={cn("p-4", getHealthColor(systemHealth.network.status))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">الشبكة</div>
                      <div className="text-lg font-bold">{systemHealth.network.totalRequests} طلب</div>
                      <div className="text-xs">
                        {formatPercentage(systemHealth.network.errorRate)} أخطاء
                      </div>
                    </div>
                    <Globe className="w-6 h-6" />
                  </div>
                </Card>

                <Card className={cn("p-4", getHealthColor(systemHealth.performance.status))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">الأداء</div>
                      <div className="text-lg font-bold">{systemHealth.performance.score}%</div>
                      <div className="text-xs">
                        {systemHealth.performance.memoryUsage ? 
                          `${formatPercentage(systemHealth.performance.memoryUsage)} ذاكرة` : 
                          'ذاكرة غير متوفرة'}
                      </div>
                    </div>
                    <Cpu className="w-6 h-6" />
                  </div>
                </Card>

                <Card className={cn("p-4", getHealthColor(systemHealth.database.status))}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">قاعدة البيانات</div>
                      <div className="text-lg font-bold">{systemHealth.database.totalQueries} استعلام</div>
                      <div className="text-xs">
                        {systemHealth.database.slowQueries} بطيء
                      </div>
                    </div>
                    <Database className="w-6 h-6" />
                  </div>
                </Card>
              </div>
            )}

            {/* التحذيرات */}
            {alerts.length > 0 && (
              <Card className="mt-4 border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    التحذيرات الحديثة ({alerts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-20">
                    <div className="space-y-2">
                      {alerts.slice(0, 3).map((alert) => (
                        <div key={alert.id} className="flex items-start gap-2 text-sm">
                          {alert.type === 'error' ? (
                            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{alert.title}</div>
                            <div className="text-muted-foreground">{alert.message}</div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(alert.timestamp, { locale: ar, addSuffix: true })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  {alerts.length > 3 && (
                    <div className="text-xs text-muted-foreground mt-2">
                      و {alerts.length - 3} تحذير آخر...
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="overview" className="h-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="network">الشبكة</TabsTrigger>
                <TabsTrigger value="performance">الأداء</TabsTrigger>
                <TabsTrigger value="database">قاعدة البيانات</TabsTrigger>
                <TabsTrigger value="alerts">التحذيرات</TabsTrigger>
                <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="h-[520px] space-y-4">
                {/* مقاييس الأداء الرئيسية */}
                {systemHealth && (
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">الأداء العام</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm mb-1">
                              <span>نتيجة الأداء</span>
                              <span>{systemHealth.performance.score}%</span>
                            </div>
                            <Progress value={systemHealth.performance.score} className="h-2" />
                          </div>
                          
                          {systemHealth.performance.lcp && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>LCP</span>
                                <span className={systemHealth.performance.lcp > 2500 ? 'text-red-600' : 'text-green-600'}>
                                  {formatMs(systemHealth.performance.lcp)}
                                </span>
                              </div>
                              <Progress 
                                value={Math.min(100, (systemHealth.performance.lcp / 4000) * 100)} 
                                className="h-2" 
                              />
                            </div>
                          )}
                          
                          {systemHealth.performance.memoryUsage && (
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span>استخدام الذاكرة</span>
                                <span className={systemHealth.performance.memoryUsage > 80 ? 'text-red-600' : 'text-green-600'}>
                                  {formatPercentage(systemHealth.performance.memoryUsage)}
                                </span>
                              </div>
                              <Progress value={systemHealth.performance.memoryUsage} className="h-2" />
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">إحصائيات الشبكة</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">إجمالي الطلبات</span>
                            <Badge variant="outline">{systemHealth.network.totalRequests}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">معدل الأخطاء</span>
                            <Badge variant={systemHealth.network.errorRate > 10 ? "destructive" : "secondary"}>
                              {formatPercentage(systemHealth.network.errorRate)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">متوسط وقت الاستجابة</span>
                            <Badge variant="outline">{formatMs(systemHealth.network.averageResponseTime)}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">طلبات مكررة</span>
                            <Badge variant={systemHealth.network.duplicateRequests > 0 ? "destructive" : "secondary"}>
                              {systemHealth.network.duplicateRequests}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">إحصائيات قاعدة البيانات</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">إجمالي الاستعلامات</span>
                            <Badge variant="outline">{systemHealth.database.totalQueries}</Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">معدل الأخطاء</span>
                            <Badge variant={systemHealth.database.errorRate > 5 ? "destructive" : "secondary"}>
                              {formatPercentage(systemHealth.database.errorRate)}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">استعلامات بطيئة</span>
                            <Badge variant={systemHealth.database.slowQueries > 5 ? "destructive" : "secondary"}>
                              {systemHealth.database.slowQueries}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm">متوسط وقت الاستجابة</span>
                            <Badge variant="outline">{formatMs(systemHealth.database.averageResponseTime)}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* مؤشرات سريعة للحالة */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">الحالة العامة للنظام</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-center p-6">
                        {systemHealth ? (
                          <div className={cn(
                            "w-24 h-24 rounded-full flex items-center justify-center text-white text-xl font-bold",
                            systemHealth.overall === 'excellent' ? 'bg-green-500' :
                            systemHealth.overall === 'good' ? 'bg-blue-500' :
                            systemHealth.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                          )}>
                            {systemHealth.overall === 'excellent' ? '✓' :
                             systemHealth.overall === 'good' ? '◐' :
                             systemHealth.overall === 'warning' ? '⚠' : '✗'}
                          </div>
                        ) : (
                          <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                            <Cpu className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">إعدادات المراقبة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">المراقبة نشطة</span>
                          <Badge variant={isTracking ? "default" : "secondary"}>
                            {isTracking ? "نشط" : "متوقف"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">التحديث التلقائي</span>
                          <Badge variant={settings.autoRefresh ? "default" : "secondary"}>
                            {settings.autoRefresh ? "مفعل" : "معطل"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">فترة التحديث</span>
                          <Badge variant="outline">{settings.refreshInterval / 1000}s</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">عدد التحذيرات</span>
                          <Badge variant={alerts.length > 0 ? "destructive" : "secondary"}>
                            {alerts.length}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="network" className="h-[520px]">
                <NetworkMonitor />
              </TabsContent>

              <TabsContent value="performance" className="h-[520px]">
                <AdvancedPerformanceMonitor />
              </TabsContent>

              <TabsContent value="database" className="h-[520px]">
                <DatabaseMonitor />
              </TabsContent>

              <TabsContent value="alerts" className="h-[520px]">
                <ScrollArea className="h-full">
                  <div className="space-y-3">
                    {alerts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle className="w-12 h-12 mx-auto mb-2" />
                        <p>لا توجد تحذيرات حالياً</p>
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <Card key={alert.id} className={cn(
                          "p-4",
                          alert.type === 'error' ? 'border-red-200 bg-red-50' : 'border-yellow-200 bg-yellow-50'
                        )}>
                          <div className="flex items-start gap-3">
                            {alert.type === 'error' ? (
                              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
                            ) : (
                              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            )}
                            <div className="flex-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(alert.timestamp, { locale: ar, addSuffix: true })}
                              </span>
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="settings" className="h-[520px]">
                <ScrollArea className="h-full">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إعدادات التحديث</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label htmlFor="auto-refresh" className="text-sm font-medium">
                            التحديث التلقائي
                          </label>
                          <Switch
                            id="auto-refresh"
                            checked={settings.autoRefresh}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, autoRefresh: checked }))
                            }
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-sm font-medium">فترة التحديث (ثانية)</label>
                          <Select
                            value={settings.refreshInterval.toString()}
                            onValueChange={(value) => 
                              setSettings(s => ({ ...s, refreshInterval: parseInt(value) }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1000">1 ثانية</SelectItem>
                              <SelectItem value="2000">2 ثانية</SelectItem>
                              <SelectItem value="5000">5 ثواني</SelectItem>
                              <SelectItem value="10000">10 ثواني</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إعدادات التحذيرات</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">تحذيرات الأخطاء</label>
                          <Switch
                            checked={settings.alertOnErrors}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, alertOnErrors: checked }))
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">تحذيرات الاستعلامات البطيئة</label>
                          <Switch
                            checked={settings.alertOnSlowQueries}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, alertOnSlowQueries: checked }))
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">تحذيرات الذاكرة المرتفعة</label>
                          <Switch
                            checked={settings.alertOnHighMemory}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, alertOnHighMemory: checked }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إعدادات العرض</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">موقع النافذة</label>
                          <Select
                            value={settings.position}
                            onValueChange={(value: any) => 
                              setSettings(s => ({ ...s, position: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="bottom-left">أسفل يسار</SelectItem>
                              <SelectItem value="bottom-right">أسفل يمين</SelectItem>
                              <SelectItem value="top-left">أعلى يسار</SelectItem>
                              <SelectItem value="top-right">أعلى يمين</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium">الوضع المصغر</label>
                          <Switch
                            checked={settings.minimizeMode}
                            onCheckedChange={(checked) => 
                              setSettings(s => ({ ...s, minimizeMode: checked }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">إجراءات النظام</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button
                          variant="outline"
                          onClick={toggleTracking}
                          className="w-full gap-2"
                        >
                          {isTracking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          {isTracking ? "إيقاف المراقبة" : "بدء المراقبة"}
                        </Button>
                        
                        <Button
                          variant="outline"
                          onClick={exportFullReport}
                          className="w-full gap-2"
                        >
                          <Download className="w-4 h-4" />
                          تصدير تقرير شامل
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="w-full gap-2">
                              <RotateCcw className="w-4 h-4" />
                              مسح جميع البيانات
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
                              <AlertDialogDescription>
                                سيتم حذف جميع البيانات المسجلة والتحذيرات نهائياً.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={clearAllData}>
                                نعم، احذف الكل
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}