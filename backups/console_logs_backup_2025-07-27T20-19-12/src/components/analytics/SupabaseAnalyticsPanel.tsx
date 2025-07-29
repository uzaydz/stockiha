import React, { useState, useEffect } from 'react';
import { useSupabaseAnalytics, SupabaseCall } from '@/hooks/useSupabaseAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  BarChart3, 
  FileText, 
  Trash2,
  RefreshCw,
  Zap,
  Database,
  Download,
  FileDown,
  Copy,
  Minimize2,
  Maximize2,
  X,
  Move,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

// أنواع حالات العرض
type ViewState = 'minimized' | 'compact' | 'full' | 'hidden';
type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'bottom-center';

const SupabaseAnalyticsPanel: React.FC = () => {
  const { calls, stats, clearAnalytics } = useSupabaseAnalytics();
  const [viewState, setViewState] = useState<ViewState>('minimized');
  const [position, setPosition] = useState<Position>('bottom-right');
  const [selectedCall, setSelectedCall] = useState<SupabaseCall | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [autoHide, setAutoHide] = useState(false);
  const [opacity, setOpacity] = useState(100);

  // عدم عرض المكون إذا لم نكن في بيئة التطوير
  if (!import.meta.env.DEV) {
    return null;
  }

  // إخفاء تلقائي بعد فترة من عدم النشاط
  useEffect(() => {
    if (!autoHide) return;
    
    let timeout: NodeJS.Timeout;
    const resetTimeout = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (viewState !== 'minimized') {
          setViewState('minimized');
        }
      }, 5000); // إخفاء بعد 5 ثواني
    };

    resetTimeout();
    return () => clearTimeout(timeout);
  }, [autoHide, viewState, stats.totalCalls]);

  // دوال مساعدة موجودة
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('ar-SA');
  };

  const getMethodColor = (method: string) => {
    const colors = {
      select: 'bg-blue-100 text-blue-800',
      insert: 'bg-green-100 text-green-800',
      update: 'bg-yellow-100 text-yellow-800',
      delete: 'bg-red-100 text-red-800',
      rpc: 'bg-purple-100 text-purple-800',
      auth: 'bg-indigo-100 text-indigo-800',
      storage: 'bg-orange-100 text-orange-800',
      realtime: 'bg-pink-100 text-pink-800',
    };
    return colors[method as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getSpeedIndicator = (duration: number) => {
    if (duration < 100) return { color: 'text-green-600', icon: '🚀' };
    if (duration < 500) return { color: 'text-yellow-600', icon: '⚡' };
    if (duration < 1000) return { color: 'text-orange-600', icon: '⚠️' };
    return { color: 'text-red-600', icon: '🐌' };
  };

  // الحصول على أنماط الموضع
  const getPositionClasses = (pos: Position) => {
    const baseClasses = 'fixed z-50';
    switch (pos) {
      case 'bottom-right':
        return `${baseClasses} bottom-4 right-4`;
      case 'bottom-left':
        return `${baseClasses} bottom-4 left-4`;
      case 'top-right':
        return `${baseClasses} top-4 right-4`;
      case 'top-left':
        return `${baseClasses} top-4 left-4`;
      case 'bottom-center':
        return `${baseClasses} bottom-4 left-1/2 transform -translate-x-1/2`;
      default:
        return `${baseClasses} bottom-4 right-4`;
    }
  };

  // دوال التحميل الموجودة
  const downloadJSON = () => {
    const data = {
      timestamp: new Date().toISOString(),
      stats,
      calls: calls.map(call => ({
        ...call,
        timestamp: new Date(call.timestamp).toISOString()
      })),
      summary: {
        totalCalls: stats.totalCalls,
        successRate: stats.successRate,
        averageResponseTime: stats.averageResponseTime,
        slowestCall: stats.slowestCall,
        mostActiveFile: stats.mostActiveFile,
        exportedAt: new Date().toISOString()
      }
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    const headers = [
      'الوقت',
      'العملية',
      'النوع',
      'الجدول',
      'المدة (ms)',
      'الحالة',
      'الملف المصدر',
      'رقم السطر',
      'الخطأ'
    ];

    const rows = calls.map(call => [
      new Date(call.timestamp).toLocaleString('ar-SA'),
      call.operation,
      call.method,
      call.table || '',
      call.duration.toFixed(2),
      call.success ? 'نجح' : 'فشل',
      call.sourceFile,
      call.sourceLine.toString(),
      call.error || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-analytics-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const text = `
# تقرير تحليل Supabase
التاريخ: ${new Date().toLocaleString('ar-SA')}

## الإحصائيات العامة
- إجمالي الاستدعاءات: ${stats.totalCalls}
- معدل النجاح: ${stats.successRate.toFixed(1)}%
- متوسط زمن الاستجابة: ${formatDuration(stats.averageResponseTime)}
- الملف الأكثر نشاطاً: ${stats.mostActiveFile}

## أبطأ استدعاء
${stats.slowestCall ? `- العملية: ${stats.slowestCall.operation}
- المدة: ${formatDuration(stats.slowestCall.duration)}
- الملف: ${stats.slowestCall.sourceFile}:${stats.slowestCall.sourceLine}` : 'لا يوجد'}

## الاستدعاءات حسب النوع
${Object.entries(stats.callsByMethod).map(([method, count]) => `- ${method}: ${count}`).join('\n')}

## الاستدعاءات حسب الملف
${Object.entries(stats.callsByFile).map(([file, count]) => `- ${file}: ${count}`).join('\n')}

## آخر 10 استدعاءات
${calls.slice(0, 10).map((call, index) => `
${index + 1}. ${call.operation}
   - النوع: ${call.method}
   - المدة: ${formatDuration(call.duration)}
   - الحالة: ${call.success ? 'نجح' : 'فشل'}
   - المصدر: ${call.sourceFile}:${call.sourceLine}
   - الوقت: ${formatTimestamp(call.timestamp)}
   ${call.error ? `- الخطأ: ${call.error}` : ''}
`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      alert('تم نسخ التقرير إلى الحافظة!');
    }).catch(() => {
      alert('فشل في نسخ التقرير');
    });
  };

  // العرض المصغر فقط
  if (viewState === 'minimized') {
    return (
      <div className={getPositionClasses(position)} style={{ opacity: opacity / 100 }}>
        <Button
          onClick={() => setViewState('compact')}
          onDoubleClick={() => setViewState('full')}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 shadow-lg transition-all duration-300 hover:scale-110"
          title="انقر للعرض المختصر، انقر مرتين للعرض الكامل"
        >
          <Activity className="h-4 w-4" />
          {stats.totalCalls > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {stats.totalCalls > 99 ? '99+' : stats.totalCalls}
            </span>
          )}
        </Button>
        
        {/* أزرار التحكم السريع */}
        <div className="absolute -top-12 right-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowSettings(!showSettings)}
            className="h-6 w-6 p-0"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setViewState('hidden')}
            className="h-6 w-6 p-0"
          >
            <EyeOff className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }

  // العرض المخفي
  if (viewState === 'hidden') {
    return (
      <div className="fixed bottom-4 left-4 z-50">
        <Button
          onClick={() => setViewState('minimized')}
          variant="ghost"
          className="opacity-20 hover:opacity-60 text-xs p-1"
          title="إظهار تحليلات Supabase"
        >
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  // العرض المختصر
  if (viewState === 'compact') {
    return (
      <div className={getPositionClasses(position)} style={{ opacity: opacity / 100 }}>
        <Card className="w-72 shadow-xl border-2 border-blue-200 bg-white/95 backdrop-blur-sm">
          <CardHeader className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span className="font-medium text-sm">Supabase Analytics</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewState('full')}
                  className="text-white hover:bg-blue-500 p-1 h-6 w-6"
                  title="عرض كامل"
                >
                  <Maximize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-white hover:bg-blue-500 p-1 h-6 w-6"
                  title="الإعدادات"
                >
                  <Settings className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewState('minimized')}
                  className="text-white hover:bg-blue-500 p-1 h-6 w-6"
                  title="تصغير"
                >
                  <Minimize2 className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewState('hidden')}
                  className="text-white hover:bg-blue-500 p-1 h-6 w-6"
                  title="إخفاء"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-center p-2 bg-blue-50 rounded">
                <div className="font-bold text-blue-600">{stats.totalCalls}</div>
                <div className="text-xs text-gray-600">استدعاءات</div>
              </div>
              <div className="text-center p-2 bg-green-50 rounded">
                <div className="font-bold text-green-600">{stats.successRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-600">نجح</div>
              </div>
            </div>
            
            {stats.recentCalls.length > 0 && (
              <div className="border-t pt-2">
                <div className="text-xs text-gray-600 mb-1">آخر استدعاء:</div>
                <div className="flex items-center justify-between text-xs">
                  <Badge className={getMethodColor(stats.recentCalls[0].method)} size="sm">
                    {stats.recentCalls[0].method}
                  </Badge>
                  <span className={getSpeedIndicator(stats.recentCalls[0].duration).color}>
                    {formatDuration(stats.recentCalls[0].duration)}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex gap-1">
              <Button
                size="sm"
                onClick={downloadJSON}
                className="flex-1 h-7 text-xs"
                variant="outline"
              >
                <Download className="h-3 w-3 mr-1" />
                JSON
              </Button>
              <Button
                size="sm"
                onClick={clearAnalytics}
                className="flex-1 h-7 text-xs"
                variant="outline"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                مسح
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // العرض الكامل
  return (
    <div className={getPositionClasses(position)} style={{ opacity: opacity / 100 }}>
      <Card className="w-96 max-h-[80vh] shadow-2xl border-2 border-blue-200 bg-white/95 backdrop-blur-sm overflow-hidden">
        <CardHeader className="p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              <h3 className="font-semibold">Supabase Analytics</h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadJSON}
                className="text-white hover:bg-blue-500 p-1"
                title="تحميل JSON"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={downloadCSV}
                className="text-white hover:bg-blue-500 p-1"
                title="تحميل CSV"
              >
                <FileDown className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="text-white hover:bg-blue-500 p-1"
                title="نسخ التقرير"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAnalytics}
                className="text-white hover:bg-blue-500 p-1"
                title="مسح البيانات"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
                className="text-white hover:bg-blue-500 p-1"
                title="الإعدادات"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewState('compact')}
                className="text-white hover:bg-blue-500 p-1"
                title="عرض مختصر"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewState('hidden')}
                className="text-white hover:bg-blue-500 p-1"
                title="إخفاء"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <div className="p-4 max-h-[calc(80vh-120px)] overflow-y-auto">
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="calls">الاستدعاءات</TabsTrigger>
              <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
              <TabsTrigger value="export">التحميل</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">إجمالي الاستدعاءات</p>
                        <p className="text-2xl font-bold">{stats.totalCalls}</p>
                      </div>
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">معدل النجاح</p>
                        <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                      </div>
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-600">متوسط زمن الاستجابة</p>
                    <Clock className="h-5 w-5 text-gray-500" />
                  </div>
                  <p className="text-xl font-bold">{formatDuration(stats.averageResponseTime)}</p>
                  <Progress value={Math.min((stats.averageResponseTime / 1000) * 100, 100)} className="mt-2" />
                </CardContent>
              </Card>

              {stats.slowestCall && (
                <Card>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 mb-2">أبطأ استدعاء</p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{stats.slowestCall.operation}</p>
                        <p className="text-sm text-gray-500">{stats.slowestCall.sourceFile}:{stats.slowestCall.sourceLine}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600">{formatDuration(stats.slowestCall.duration)}</p>
                        <Badge className={getMethodColor(stats.slowestCall.method)}>
                          {stats.slowestCall.method}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="calls" className="space-y-2">
              <div className="max-h-96 overflow-y-auto space-y-2">
                {stats.recentCalls.map((call) => {
                  const speedInfo = getSpeedIndicator(call.duration);
                  return (
                    <Card 
                      key={call.id} 
                      className="cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setSelectedCall(call)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getMethodColor(call.method)}>
                              {call.method}
                            </Badge>
                            {call.success ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm ${speedInfo.color}`}>
                              {speedInfo.icon} {formatDuration(call.duration)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm font-medium">{call.operation}</p>
                        <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
                          <span>{call.sourceFile}:{call.sourceLine}</span>
                          <span>{formatTimestamp(call.timestamp)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="stats" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الاستدعاءات حسب النوع</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.callsByMethod).map(([method, count]) => (
                      <div key={method} className="flex items-center justify-between">
                        <Badge className={getMethodColor(method)}>{method}</Badge>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">الاستدعاءات حسب الملف</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(stats.callsByFile)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([file, count]) => (
                        <div key={file} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-gray-500" />
                            <span className="text-sm truncate">{file}</span>
                          </div>
                          <span className="font-medium">{count}</span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Download className="h-5 w-5" />
                    تحميل البيانات
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    <Button 
                      onClick={downloadJSON}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      تحميل بيانات JSON كاملة
                      <span className="text-xs text-gray-500 mr-auto">
                        ({stats.totalCalls} استدعاء)
                      </span>
                    </Button>
                    
                    <Button 
                      onClick={downloadCSV}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <FileDown className="h-4 w-4 mr-2" />
                      تحميل ملف CSV للتحليل
                      <span className="text-xs text-gray-500 mr-auto">
                        Excel متوافق
                      </span>
                    </Button>
                    
                    <Button 
                      onClick={copyToClipboard}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      نسخ تقرير نصي مفصل
                      <span className="text-xs text-gray-500 mr-auto">
                        Markdown
                      </span>
                    </Button>
                  </div>
                  
                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">معلومات التصدير</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>• JSON: يحتوي على كامل البيانات والإحصائيات</p>
                      <p>• CSV: مناسب للتحليل في Excel أو Google Sheets</p>
                      <p>• النص: تقرير مقروء جاهز للمشاركة</p>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-medium mb-2">ملخص البيانات المتاحة</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="font-medium">الاستدعاءات</p>
                        <p className="text-gray-600">{stats.totalCalls} استدعاء</p>
                      </div>
                      <div>
                        <p className="font-medium">معدل النجاح</p>
                        <p className="text-gray-600">{stats.successRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="font-medium">أنواع العمليات</p>
                        <p className="text-gray-600">{Object.keys(stats.callsByMethod).length} نوع</p>
                      </div>
                      <div>
                        <p className="font-medium">الملفات</p>
                        <p className="text-gray-600">{Object.keys(stats.callsByFile).length} ملف</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Card>

      {/* لوحة الإعدادات */}
      {showSettings && (
        <Card className="absolute top-0 left-0 transform -translate-x-full w-64 bg-white shadow-xl border">
          <CardHeader className="p-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">إعدادات العرض</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">الموضع</label>
              <select 
                value={position} 
                onChange={(e) => setPosition(e.target.value as Position)}
                className="w-full text-xs border rounded p-1"
              >
                <option value="bottom-right">أسفل يمين</option>
                <option value="bottom-left">أسفل يسار</option>
                <option value="top-right">أعلى يمين</option>
                <option value="top-left">أعلى يسار</option>
                <option value="bottom-center">أسفل وسط</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-medium mb-1 block">الشفافية: {opacity}%</label>
              <input
                type="range"
                min="20"
                max="100"
                value={opacity}
                onChange={(e) => setOpacity(Number(e.target.value))}
                className="w-full"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium">إخفاء تلقائي</label>
              <input
                type="checkbox"
                checked={autoHide}
                onChange={(e) => setAutoHide(e.target.checked)}
                className="rounded"
              />
            </div>
            
            <div className="pt-2 border-t">
              <Button
                size="sm"
                onClick={() => {
                  setPosition('bottom-right');
                  setOpacity(100);
                  setAutoHide(false);
                  setViewState('minimized');
                }}
                className="w-full text-xs"
                variant="outline"
              >
                إعادة تعيين
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* نافذة تفاصيل الاستدعاء */}
      {selectedCall && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">تفاصيل الاستدعاء</h3>
              <Button variant="ghost" onClick={() => setSelectedCall(null)}>
                ✕
              </Button>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">العملية</p>
                  <p className="font-medium">{selectedCall.operation}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">النوع</p>
                  <Badge className={getMethodColor(selectedCall.method)}>
                    {selectedCall.method}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">المدة</p>
                  <p className="font-medium">{formatDuration(selectedCall.duration)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">الحالة</p>
                  <div className="flex items-center gap-2">
                    {selectedCall.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span>{selectedCall.success ? 'نجح' : 'فشل'}</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600">المصدر</p>
                <p className="font-medium">{selectedCall.sourceFile}:{selectedCall.sourceLine}</p>
              </div>

              {selectedCall.stackTrace.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600">Stack Trace</p>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                    {selectedCall.stackTrace.map((line, index) => (
                      <div key={index}>{line}</div>
                    ))}
                  </div>
                </div>
              )}

              {selectedCall.error && (
                <div>
                  <p className="text-sm text-gray-600">الخطأ</p>
                  <div className="bg-red-50 p-3 rounded text-sm text-red-800">
                    {selectedCall.error}
                  </div>
                </div>
              )}

              {selectedCall.query && (
                <div>
                  <p className="text-sm text-gray-600">الاستعلام</p>
                  <div className="bg-gray-100 p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                    {typeof selectedCall.query === 'string' ? selectedCall.query : JSON.stringify(selectedCall.query, null, 2)}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupabaseAnalyticsPanel;
