import React, { useState } from 'react';
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
  Copy
} from 'lucide-react';

const SupabaseAnalyticsPanel: React.FC = () => {
  const { calls, stats, clearAnalytics } = useSupabaseAnalytics();
  const [isMinimized, setIsMinimized] = useState(false);
  const [selectedCall, setSelectedCall] = useState<SupabaseCall | null>(null);

  // عدم عرض المكون إذا لم نكن في بيئة التطوير
  if (!import.meta.env.DEV) {
    return null;
  }

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

  // دالة لتحميل البيانات كـ JSON
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

  // دالة لتحميل التقرير كـ CSV
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

  // دالة لنسخ التفاصيل كنص
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

  // دالة لتحميل تقرير HTML مفصل
  const downloadHTMLReport = () => {
    const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير تحليل Supabase</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1, h2, h3 { color: #2563eb; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #2563eb; }
        .stat-value { font-size: 2em; font-weight: bold; color: #1e40af; }
        .stat-label { color: #64748b; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: right; border-bottom: 1px solid #e2e8f0; }
        th { background: #f1f5f9; font-weight: bold; }
        tr:hover { background: #f8fafc; }
        .success { color: #059669; }
        .error { color: #dc2626; }
        .speed-fast { color: #059669; }
        .speed-medium { color: #d97706; }
        .speed-slow { color: #dc2626; }
        .method-badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8em; font-weight: bold; }
        .method-select { background: #dbeafe; color: #1e40af; }
        .method-insert { background: #dcfce7; color: #166534; }
        .method-update { background: #fef3c7; color: #92400e; }
        .method-delete { background: #fee2e2; color: #991b1b; }
        .method-rpc { background: #ede9fe; color: #6b21a8; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 تقرير تحليل Supabase</h1>
        <p><strong>تم إنشاؤه في:</strong> ${new Date().toLocaleString('ar-SA')}</p>
        
        <h2>📈 الإحصائيات العامة</h2>
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">${stats.totalCalls}</div>
                <div class="stat-label">إجمالي الاستدعاءات</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.successRate.toFixed(1)}%</div>
                <div class="stat-label">معدل النجاح</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${formatDuration(stats.averageResponseTime)}</div>
                <div class="stat-label">متوسط زمن الاستجابة</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.mostActiveFile}</div>
                <div class="stat-label">الملف الأكثر نشاطاً</div>
            </div>
        </div>

        <h2>🚀 أبطأ استدعاء</h2>
        ${stats.slowestCall ? `
        <table>
            <tr><td><strong>العملية:</strong></td><td>${stats.slowestCall.operation}</td></tr>
            <tr><td><strong>المدة:</strong></td><td class="speed-slow">${formatDuration(stats.slowestCall.duration)}</td></tr>
            <tr><td><strong>الملف:</strong></td><td>${stats.slowestCall.sourceFile}:${stats.slowestCall.sourceLine}</td></tr>
            <tr><td><strong>النوع:</strong></td><td><span class="method-badge method-${stats.slowestCall.method}">${stats.slowestCall.method}</span></td></tr>
        </table>
        ` : '<p>لا توجد بيانات</p>'}

        <h2>📊 الاستدعاءات حسب النوع</h2>
        <table>
            <thead>
                <tr><th>النوع</th><th>العدد</th><th>النسبة</th></tr>
            </thead>
            <tbody>
                ${Object.entries(stats.callsByMethod).map(([method, count]) => `
                <tr>
                    <td><span class="method-badge method-${method}">${method}</span></td>
                    <td>${count}</td>
                    <td>${((count / stats.totalCalls) * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>📁 الاستدعاءات حسب الملف</h2>
        <table>
            <thead>
                <tr><th>الملف</th><th>العدد</th><th>النسبة</th></tr>
            </thead>
            <tbody>
                ${Object.entries(stats.callsByFile)
                  .sort(([,a], [,b]) => b - a)
                  .map(([file, count]) => `
                <tr>
                    <td>${file}</td>
                    <td>${count}</td>
                    <td>${((count / stats.totalCalls) * 100).toFixed(1)}%</td>
                </tr>
                `).join('')}
            </tbody>
        </table>

        <h2>🕒 آخر الاستدعاءات</h2>
        <table>
            <thead>
                <tr>
                    <th>الوقت</th>
                    <th>العملية</th>
                    <th>النوع</th>
                    <th>المدة</th>
                    <th>الحالة</th>
                    <th>المصدر</th>
                </tr>
            </thead>
            <tbody>
                ${calls.slice(0, 20).map(call => `
                <tr>
                    <td>${formatTimestamp(call.timestamp)}</td>
                    <td>${call.operation}</td>
                    <td><span class="method-badge method-${call.method}">${call.method}</span></td>
                    <td class="${call.duration < 100 ? 'speed-fast' : call.duration < 500 ? 'speed-medium' : 'speed-slow'}">${formatDuration(call.duration)}</td>
                    <td class="${call.success ? 'success' : 'error'}">${call.success ? '✅ نجح' : '❌ فشل'}</td>
                    <td>${call.sourceFile}:${call.sourceLine}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
    </div>
</body>
</html>
    `.trim();

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supabase-analytics-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-3"
        >
          <Activity className="h-5 w-5" />
          <span className="mr-2 text-sm">{stats.totalCalls}</span>
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-h-[80vh] bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
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
            onClick={() => setIsMinimized(true)}
            className="text-white hover:bg-blue-500 p-1"
            title="تصغير"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
