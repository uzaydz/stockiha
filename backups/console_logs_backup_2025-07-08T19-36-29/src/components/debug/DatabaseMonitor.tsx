import React, { useState, useEffect, useCallback } from 'react';
import { databaseTracker, DatabaseQuery, TableStats } from '@/lib/database-tracker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Database,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Clock,
  Copy,
  Download,
  RefreshCw,
  Activity,
  Zap,
  Package,
  Hash,
  FileSearch,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Info,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from '@/components/ui/separator';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function DatabaseMonitor() {
  const [queries, setQueries] = useState<DatabaseQuery[]>([]);
  const [tableStats, setTableStats] = useState<TableStats[]>([]);
  const [selectedQuery, setSelectedQuery] = useState<DatabaseQuery | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOperation, setFilterOperation] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);

  // تحديث البيانات
  const updateData = useCallback(() => {
    const allQueries = databaseTracker.getQueries();
    const stats = databaseTracker.getTableStats();
    const performanceAnalysis = databaseTracker.analyzePerformance();
    
    setQueries(allQueries);
    setTableStats(stats);
    setAnalysis(performanceAnalysis);
  }, []);

  useEffect(() => {
    // الاستماع للتحديثات
    const handleQueryUpdate = (query: DatabaseQuery) => {
      if (autoRefresh) {
        updateData();
      }
    };

    databaseTracker.addListener(handleQueryUpdate);
    updateData();

    // تحديث دوري
    const interval = setInterval(() => {
      if (autoRefresh) {
        updateData();
      }
    }, 1000);

    return () => {
      databaseTracker.removeListener(handleQueryUpdate);
      clearInterval(interval);
    };
  }, [autoRefresh, updateData]);

  // فلترة الاستعلامات
  const filteredQueries = queries.filter(query => {
    const matchesSearch = 
      query.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.table.toLowerCase().includes(searchTerm.toLowerCase()) ||
      query.source.component?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesOperation = filterOperation === 'all' || query.operation === filterOperation;
    const matchesStatus = filterStatus === 'all' || query.status === filterStatus;
    const matchesTable = filterTable === 'all' || query.table === filterTable;
    
    return matchesSearch && matchesOperation && matchesStatus && matchesTable;
  });

  // الحصول على قائمة الجداول الفريدة
  const uniqueTables = Array.from(new Set(queries.map(q => q.table)));

  // تحضير بيانات الرسوم البيانية
  const prepareOperationData = () => {
    const operationCounts = {
      SELECT: 0,
      INSERT: 0,
      UPDATE: 0,
      DELETE: 0,
      UPSERT: 0,
      RPC: 0
    };
    
    queries.forEach(q => {
      if (operationCounts.hasOwnProperty(q.operation)) {
        operationCounts[q.operation as keyof typeof operationCounts]++;
      }
    });
    
    return Object.entries(operationCounts)
      .filter(([_, count]) => count > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const operationData = prepareOperationData();

  // تحضير بيانات الأداء عبر الوقت
  const prepareTimelineData = () => {
    const timeline: Record<string, { time: string; queries: number; avgDuration: number }> = {};
    
    queries.forEach(query => {
      const minute = Math.floor(query.timestamp / 60000) * 60000;
      const key = new Date(minute).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
      
      if (!timeline[key]) {
        timeline[key] = { time: key, queries: 0, avgDuration: 0 };
      }
      
      timeline[key].queries++;
      if (query.duration) {
        timeline[key].avgDuration = 
          (timeline[key].avgDuration * (timeline[key].queries - 1) + query.duration) / 
          timeline[key].queries;
      }
    });
    
    return Object.values(timeline).slice(-15);
  };

  const timelineData = prepareTimelineData();

  // تصدير البيانات
  const exportData = () => {
    const data = {
      queries: filteredQueries,
      tableStats,
      analysis,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `database-log-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // نسخ تفاصيل الاستعلام
  const copyQueryDetails = (query: DatabaseQuery) => {
    const details = JSON.stringify(query, null, 2);
    navigator.clipboard.writeText(details);
  };

  // مسح السجلات
  const clearLogs = () => {
    databaseTracker.clearQueries();
    updateData();
  };

  // عرض حالة الاستعلام
  const getStatusBadge = (query: DatabaseQuery) => {
    switch (query.status) {
      case 'pending':
        return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> جاري</Badge>;
      case 'success':
        return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> نجح</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> خطأ</Badge>;
    }
  };

  // عرض نوع العملية
  const getOperationBadge = (operation: string) => {
    const colors = {
      SELECT: 'bg-blue-50 text-blue-700',
      INSERT: 'bg-green-50 text-green-700',
      UPDATE: 'bg-yellow-50 text-yellow-700',
      DELETE: 'bg-red-50 text-red-700',
      UPSERT: 'bg-purple-50 text-purple-700',
      RPC: 'bg-gray-50 text-gray-700'
    };
    
    return (
      <Badge variant="outline" className={cn("gap-1", colors[operation as keyof typeof colors] || '')}>
        {operation}
      </Badge>
    );
  };

  // تنسيق المدة
  const formatDuration = (ms?: number) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  // تنسيق الحجم
  const formatSize = (bytes?: number) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  return (
    <div className="fixed bottom-4 right-[280px] z-50">
      {/* زر التبديل */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className="mb-2 gap-2"
        variant={analysis?.summary.errorRate > 10 ? "destructive" : "secondary"}
      >
        <Database className="w-4 h-4" />
        مراقب قاعدة البيانات
        {analysis?.summary.errorQueries > 0 && (
          <Badge variant="secondary" className="ml-2">
            {analysis.summary.errorQueries}
          </Badge>
        )}
      </Button>

      {/* النافذة الرئيسية */}
      {isOpen && (
        <Card className="w-[1200px] h-[700px] shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">مراقب قاعدة البيانات المتقدم</CardTitle>
                <CardDescription>
                  تتبع جميع عمليات قاعدة البيانات وتحليل الأداء
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
                  تصدير
                </Button>
                <Button size="sm" variant="outline" onClick={clearLogs}>
                  <Trash2 className="w-4 h-4 ml-2" />
                  مسح
                </Button>
              </div>
            </div>

            {/* الإحصائيات السريعة */}
            {analysis && (
              <div className="grid grid-cols-6 gap-3 mt-4">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">إجمالي الاستعلامات</span>
                    <Activity className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{analysis.summary.totalQueries}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">أخطاء</span>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">{analysis.summary.errorQueries}</div>
                  <div className="text-xs text-muted-foreground">
                    {analysis.summary.errorRate.toFixed(1)}%
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">متوسط الوقت</span>
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-blue-600">
                    {formatDuration(analysis.summary.averageResponseTime)}
                  </div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">استعلامات بطيئة</span>
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{analysis.summary.slowQueries}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">مكررة</span>
                    <Copy className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{analysis.summary.duplicateGroups}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">جداول</span>
                    <Package className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{analysis.summary.tablesAccessed}</div>
                </Card>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="queries" className="h-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="queries">الاستعلامات</TabsTrigger>
                <TabsTrigger value="tables">الجداول</TabsTrigger>
                <TabsTrigger value="performance">الأداء</TabsTrigger>
                <TabsTrigger value="analysis">التحليل</TabsTrigger>
                <TabsTrigger value="duplicates">المكررات</TabsTrigger>
              </TabsList>

              <TabsContent value="queries" className="h-[480px]">
                <div className="flex flex-col h-full">
                  {/* أدوات البحث والفلترة */}
                  <div className="flex gap-2 mb-4">
                    <div className="relative flex-1">
                      <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <Input
                        placeholder="بحث في الاستعلامات..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pr-10"
                      />
                    </div>
                    <Select value={filterOperation} onValueChange={setFilterOperation}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="العملية" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع العمليات</SelectItem>
                        <SelectItem value="SELECT">SELECT</SelectItem>
                        <SelectItem value="INSERT">INSERT</SelectItem>
                        <SelectItem value="UPDATE">UPDATE</SelectItem>
                        <SelectItem value="DELETE">DELETE</SelectItem>
                        <SelectItem value="UPSERT">UPSERT</SelectItem>
                        <SelectItem value="RPC">RPC</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الحالات</SelectItem>
                        <SelectItem value="success">نجح</SelectItem>
                        <SelectItem value="error">فشل</SelectItem>
                        <SelectItem value="pending">جاري</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterTable} onValueChange={setFilterTable}>
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="الجدول" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">جميع الجداول</SelectItem>
                        {uniqueTables.map(table => (
                          <SelectItem key={table} value={table}>{table}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* قائمة الاستعلامات */}
                  <div className="flex gap-4 flex-1">
                    <ScrollArea className="flex-1">
                      <div className="space-y-2">
                        {filteredQueries.map((query) => (
                          <div
                            key={query.id}
                            className={cn(
                              "p-3 border rounded-lg cursor-pointer transition-colors",
                              selectedQuery?.id === query.id ? "bg-accent" : "hover:bg-accent/50",
                              query.status === 'error' && "border-red-200",
                              query.analysis?.potentialIssues && query.analysis.potentialIssues.length > 0 && "border-yellow-200"
                            )}
                            onClick={() => setSelectedQuery(query)}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {getStatusBadge(query)}
                                {getOperationBadge(query.operation)}
                                <Badge variant="outline">{query.table}</Badge>
                                {query.cacheHit && <Badge variant="secondary">مخزن</Badge>}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                {query.duration && <span>{formatDuration(query.duration)}</span>}
                                {query.rowCount !== undefined && <span>{query.rowCount} صف</span>}
                                <span>{formatDistanceToNow(query.timestamp, { locale: ar, addSuffix: true })}</span>
                              </div>
                            </div>
                            <div className="mt-2">
                              <div className="text-sm font-mono truncate">{query.query}</div>
                              {query.source.file && (
                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                  <FileSearch className="w-3 h-3" />
                                  {query.source.component} - {query.source.file}:{query.source.line}
                                </div>
                              )}
                              {query.analysis?.potentialIssues && query.analysis.potentialIssues.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-yellow-600">
                                  <AlertTriangle className="w-3 h-3" />
                                  {query.analysis.potentialIssues[0]}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>

                    {/* تفاصيل الاستعلام */}
                    {selectedQuery && (
                      <div className="w-[450px] border-r pr-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">تفاصيل الاستعلام</h3>
                          <Button size="sm" variant="outline" onClick={() => copyQueryDetails(selectedQuery)}>
                            <Copy className="w-4 h-4 ml-2" />
                            نسخ
                          </Button>
                        </div>

                        <ScrollArea className="h-[400px]">
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">الاستعلام الكامل</label>
                              <pre className="mt-1 p-3 bg-muted rounded text-xs overflow-x-auto">
                                {selectedQuery.query}
                              </pre>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">العملية</label>
                                <div className="mt-1">{getOperationBadge(selectedQuery.operation)}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">الجدول</label>
                                <div className="mt-1">{selectedQuery.table}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                                <div className="mt-1">{getStatusBadge(selectedQuery)}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">المدة</label>
                                <div className="mt-1">{formatDuration(selectedQuery.duration)}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">عدد الصفوف</label>
                                <div className="mt-1">{selectedQuery.rowCount || 0}</div>
                              </div>
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">حجم الاستعلام</label>
                                <div className="mt-1">{formatSize(selectedQuery.querySize)}</div>
                              </div>
                            </div>

                            {selectedQuery.filters && selectedQuery.filters.length > 0 && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">الفلاتر</label>
                                <div className="mt-1 space-y-1">
                                  {selectedQuery.filters.map((filter: any, index: number) => (
                                    <div key={index} className="text-sm p-2 bg-muted rounded">
                                      {filter.method}({filter.args.join(', ')})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {selectedQuery.analysis && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">التحليل</label>
                                <div className="mt-1 space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm">التعقيد:</span>
                                    <Badge variant={
                                      selectedQuery.analysis.complexity === 'simple' ? 'secondary' :
                                      selectedQuery.analysis.complexity === 'moderate' ? 'default' : 'destructive'
                                    }>
                                      {selectedQuery.analysis.complexity === 'simple' ? 'بسيط' :
                                       selectedQuery.analysis.complexity === 'moderate' ? 'متوسط' : 'معقد'}
                                    </Badge>
                                  </div>
                                  
                                  {selectedQuery.analysis.potentialIssues.length > 0 && (
                                    <div>
                                      <span className="text-sm font-medium">مشاكل محتملة:</span>
                                      <div className="mt-1 space-y-1">
                                        {selectedQuery.analysis.potentialIssues.map((issue: string, index: number) => (
                                          <div key={index} className="flex items-start gap-2 text-sm text-yellow-600">
                                            <AlertTriangle className="w-4 h-4 mt-0.5" />
                                            <span>{issue}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {selectedQuery.error && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">الخطأ</label>
                                <div className="mt-1 p-3 bg-red-50 text-red-700 rounded text-sm">
                                  {JSON.stringify(selectedQuery.error, null, 2)}
                                </div>
                              </div>
                            )}

                            {selectedQuery.source && (
                              <div>
                                <label className="text-sm font-medium text-muted-foreground">المصدر</label>
                                <div className="mt-1 space-y-1 text-sm">
                                  <div>المكون: {selectedQuery.source.component}</div>
                                  {selectedQuery.source.file && (
                                    <div className="font-mono text-xs">
                                      {selectedQuery.source.file}:{selectedQuery.source.line}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="tables" className="space-y-4">
                {/* إحصائيات الجداول */}
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">توزيع العمليات حسب النوع</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={operationData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {operationData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">الاستعلامات عبر الوقت</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <LineChart data={timelineData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="time" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="queries" stroke="#8884d8" name="عدد الاستعلامات" />
                          <Line type="monotone" dataKey="avgDuration" stroke="#82ca9d" name="متوسط المدة (ms)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* قائمة الجداول */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">إحصائيات الجداول</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px]">
                      <div className="space-y-3">
                        {tableStats.map((table) => (
                          <div key={table.tableName} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium flex items-center gap-2">
                                <Package className="w-4 h-4" />
                                {table.tableName}
                              </h4>
                              <div className="flex gap-2">
                                <Badge variant="outline">{table.totalQueries} استعلام</Badge>
                                <Badge variant={table.errorRate > 5 ? "destructive" : "secondary"}>
                                  {table.errorRate.toFixed(1)}% أخطاء
                                </Badge>
                                <Badge variant="outline">
                                  {formatDuration(table.averageResponseTime)} متوسط
                                </Badge>
                              </div>
                            </div>
                            <div className="grid grid-cols-5 gap-2 text-xs">
                              <div className="text-center p-2 bg-blue-50 rounded">
                                <div className="font-medium">{table.selectCount}</div>
                                <div className="text-muted-foreground">SELECT</div>
                              </div>
                              <div className="text-center p-2 bg-green-50 rounded">
                                <div className="font-medium">{table.insertCount}</div>
                                <div className="text-muted-foreground">INSERT</div>
                              </div>
                              <div className="text-center p-2 bg-yellow-50 rounded">
                                <div className="font-medium">{table.updateCount}</div>
                                <div className="text-muted-foreground">UPDATE</div>
                              </div>
                              <div className="text-center p-2 bg-red-50 rounded">
                                <div className="font-medium">{table.deleteCount}</div>
                                <div className="text-muted-foreground">DELETE</div>
                              </div>
                              <div className="text-center p-2 bg-gray-50 rounded">
                                <div className="text-muted-foreground">آخر وصول</div>
                                <div className="font-medium">
                                  {formatDistanceToNow(table.lastAccessed, { locale: ar, addSuffix: true })}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="performance" className="space-y-4">
                {/* الاستعلامات البطيئة */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="w-5 h-5 text-yellow-600" />
                      أبطأ الاستعلامات
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {databaseTracker.getSlowQueries().slice(0, 10).map((query) => (
                          <div key={query.id} className="p-3 border border-yellow-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {getOperationBadge(query.operation)}
                                <Badge variant="outline">{query.table}</Badge>
                                <Badge variant="destructive">
                                  {formatDuration(query.duration)}
                                </Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setSelectedQuery(query)}
                              >
                                <FileSearch className="w-4 h-4" />
                              </Button>
                            </div>
                            <div className="text-sm font-mono truncate">{query.query}</div>
                            {query.source.component && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {query.source.component}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
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
                                ) : issue.type === 'warning' ? (
                                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                                ) : (
                                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                  <div className="font-medium">{issue.message}</div>
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

              <TabsContent value="duplicates" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Copy className="w-5 h-5 text-purple-600" />
                      الاستعلامات المكررة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-4">
                        {Array.from(databaseTracker.getDuplicateQueries().entries()).map(([key, queries]) => (
                          <div key={key} className="p-3 border border-purple-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="destructive">
                                تكرر {queries.length} مرة
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                يمكن توفير {formatDuration((queries[0].duration || 0) * (queries.length - 1))}
                              </span>
                            </div>
                            <div className="text-sm font-mono truncate mb-2">
                              {queries[0].query}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {queries.map((q, index) => (
                                <Badge key={q.id} variant="outline" className="text-xs">
                                  #{index + 1} - {formatDistanceToNow(q.timestamp, { locale: ar })}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
