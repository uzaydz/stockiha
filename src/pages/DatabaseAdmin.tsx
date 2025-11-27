import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Database,
  Table as TableIcon,
  RefreshCw,
  Download,
  Info,
  ChevronLeft,
  ChevronRight,
  Search,
  Bug,
  Terminal,
  Play,
  Clock,
  AlertCircle,
  CheckCircle,
  Copy,
  Eye,
  Filter,
  Zap,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

interface QueryLog {
  id: string;
  query: string;
  timestamp: Date;
  duration: number;
  success: boolean;
  error?: string;
  rowCount?: number;
}



const DatabaseAdmin: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableCount, setTableCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbSize, setDbSize] = useState(0);

  // Debug states
  const [queryLogs, setQueryLogs] = useState<QueryLog[]>([]);
  const [customQuery, setCustomQuery] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryError, setQueryError] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');

  const isElectron = !!window.electronAPI?.db;

  useEffect(() => {
    if (isElectron) {
      loadTables();
      loadDbSize();
    }
  }, [isElectron]);

  useEffect(() => {
    if (selectedTable) {
      loadTableInfo();
      loadTableData();
      loadTableCount();
    }
  }, [selectedTable, currentPage, itemsPerPage, filterColumn, filterValue]);

  const executeQuery = async (sql: string, params?: any) => {
    const startTime = performance.now();
    const logId = Date.now().toString();

    try {
      const result = await window.electronAPI!.db.query(sql, params);
      const duration = performance.now() - startTime;

      const log: QueryLog = {
        id: logId,
        query: sql,
        timestamp: new Date(),
        duration,
        success: result.success,
        error: result.error,
        rowCount: result.data?.length || 0
      };

      setQueryLogs(prev => [log, ...prev].slice(0, 100));
      return result;
    } catch (error: any) {
      const duration = performance.now() - startTime;
      const log: QueryLog = {
        id: logId,
        query: sql,
        timestamp: new Date(),
        duration,
        success: false,
        error: error.message
      };
      setQueryLogs(prev => [log, ...prev].slice(0, 100));
      throw error;
    }
  };

  const loadTables = async () => {
    if (!window.electronAPI?.db) return;

    setLoading(true);
    try {
      const result = await executeQuery(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' ORDER BY name`
      );

      if (result.success) {
        const tableNames = result.data.map((row: any) => row.name);
        setTables(tableNames);
        toast.success(`تم تحميل ${tableNames.length} جدول`);
      } else {
        toast.error('فشل تحميل الجداول: ' + result.error);
      }
    } catch (error) {
      toast.error('خطأ في تحميل الجداول');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableInfo = async () => {
    if (!window.electronAPI?.db || !selectedTable) return;

    try {
      const result = await executeQuery(`PRAGMA table_info(${selectedTable})`);
      if (result.success) {
        setTableInfo(result.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadTableData = async () => {
    if (!window.electronAPI?.db || !selectedTable) return;

    setLoading(true);
    try {
      const offset = (currentPage - 1) * itemsPerPage;
      let query = `SELECT * FROM ${selectedTable}`;
      const params: any[] = [];

      if (filterColumn && filterValue) {
        query += ` WHERE ${filterColumn} LIKE ?`;
        params.push(`%${filterValue}%`);
      }

      query += ` LIMIT ? OFFSET ?`;
      params.push(itemsPerPage, offset);

      const result = await executeQuery(query, params);

      if (result.success) {
        setTableData(result.data);
      } else {
        toast.error('فشل تحميل البيانات: ' + result.error);
      }
    } catch (error) {
      toast.error('خطأ في تحميل البيانات');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadTableCount = async () => {
    if (!window.electronAPI?.db || !selectedTable) return;

    try {
      let query = `SELECT COUNT(*) as count FROM ${selectedTable}`;
      const params: any[] = [];

      if (filterColumn && filterValue) {
        query += ` WHERE ${filterColumn} LIKE ?`;
        params.push(`%${filterValue}%`);
      }

      const result = await window.electronAPI.db.queryOne(query, params);
      if (result.success && result.data) {
        setTableCount(result.data.count);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const loadDbSize = async () => {
    if (!window.electronAPI?.db) return;

    try {
      const result = await window.electronAPI.db.queryOne(`
        SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()
      `);
      if (result.success && result.data) {
        setDbSize(result.data.size);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const executeCustomQuery = async () => {
    if (!customQuery.trim()) {
      toast.error('الرجاء إدخال استعلام');
      return;
    }

    setQueryError('');
    setQueryResult(null);

    try {
      const result = await executeQuery(customQuery);

      if (result.success) {
        setQueryResult(result.data);
        toast.success(`تم التنفيذ بنجاح: ${result.data.length} سجل`);
      } else {
        setQueryError(result.error || 'فشل التنفيذ');
        toast.error('فشل تنفيذ الاستعلام');
      }
    } catch (error: any) {
      setQueryError(error.message);
      toast.error('خطأ في التنفيذ');
    }
  };

  const exportTableData = async () => {
    if (!selectedTable || tableData.length === 0) return;

    const csv = [
      tableInfo.map(col => col.name).join(','),
      ...tableData.map(row =>
        tableInfo.map(col => {
          const value = row[col.name];
          if (value === null) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success('تم تصدير البيانات');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('تم النسخ إلى الحافظة');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatValue = (value: any) => {
    if (value === null) {
      return (
        <span className="inline-flex items-center gap-1 text-gray-400 italic text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
          <AlertCircle className="h-3 w-3" />
          null
        </span>
      );
    }
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'true' : 'false'}
        </Badge>
      );
    }
    if (typeof value === 'object') {
      return (
        <code className="text-xs bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded text-blue-700 dark:text-blue-300">
          {JSON.stringify(value)}
        </code>
      );
    }
    if (typeof value === 'number') {
      return (
        <span className="font-mono text-sm text-purple-600 dark:text-purple-400 font-semibold">
          {value.toLocaleString('ar')}
        </span>
      );
    }
    const str = String(value);
    // URLs
    if (str.match(/^https?:\/\//)) {
      return (
        <a
          href={str}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline text-sm flex items-center gap-1"
        >
          <Eye className="h-3 w-3" />
          {str.length > 50 ? str.substring(0, 50) + '...' : str}
        </a>
      );
    }
    // Dates (ISO format)
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300 font-mono">
          {new Date(str).toLocaleString('ar')}
        </span>
      );
    }
    // Long text
    if (str.length > 80) {
      return (
        <span className="text-sm text-gray-700 dark:text-gray-300">
          {str.substring(0, 80)}
          <span className="text-gray-400">...</span>
        </span>
      );
    }
    return <span className="text-sm text-gray-700 dark:text-gray-300">{str}</span>;
  };

  const formatDuration = (ms: number) => {
    if (ms < 1) return `${ms.toFixed(2)}ms`;
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const totalPages = Math.ceil(tableCount / itemsPerPage);

  const filteredTables = tables.filter(table =>
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgQueryTime = queryLogs.length > 0
    ? queryLogs.reduce((sum, log) => sum + log.duration, 0) / queryLogs.length
    : 0;

  const successRate = queryLogs.length > 0
    ? (queryLogs.filter(log => log.success).length / queryLogs.length) * 100
    : 100;

  if (!isElectron) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle className="text-center flex items-center justify-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              غير متاح
            </CardTitle>
            <CardDescription className="text-center">
              هذه الصفحة متاحة فقط في تطبيق سطح المكتب (Electron)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 min-h-screen" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold flex items-center gap-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            <Database className="h-10 w-10 text-blue-600" />
            مستكشف قاعدة البيانات
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            عرض وإدارة وتحليل جميع البيانات المخزنة محلياً في SQLite
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Card className="border-2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-xs text-muted-foreground">حجم القاعدة</div>
                  <div className="text-sm font-bold">{formatBytes(dbSize)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-2">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <TableIcon className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-xs text-muted-foreground">الجداول</div>
                  <div className="text-sm font-bold">{tables.length}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Button onClick={loadTables} size="lg" variant="outline" className="gap-2">
            <RefreshCw className="h-5 w-5" />
            تحديث
          </Button>
          <Button
            onClick={() => setShowDebug(!showDebug)}
            size="lg"
            variant={showDebug ? 'default' : 'outline'}
            className="gap-2"
          >
            <Bug className="h-5 w-5" />
            Debug
          </Button>
        </div>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <Card className="border-2 border-orange-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950 dark:to-red-950">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  لوحة التحكم Debug
                </CardTitle>
                <CardDescription>
                  تشخيص المشاكل وتنفيذ الاستعلامات المخصصة
                </CardDescription>
              </div>
              <div className="flex gap-3">
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  متوسط الوقت: {formatDuration(avgQueryTime)}
                </Badge>
                <Badge variant={successRate === 100 ? 'default' : 'destructive'} className="gap-1">
                  {successRate === 100 ? <CheckCircle className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  نجاح: {successRate.toFixed(0)}%
                </Badge>
                <Badge variant="secondary" className="gap-1">
                  <Zap className="h-3 w-3" />
                  {queryLogs.length} استعلام
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="console">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="console" className="gap-2">
                  <Terminal className="h-4 w-4" />
                  تنفيذ استعلام
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <Activity className="h-4 w-4" />
                  سجل الاستعلامات
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  الإحصائيات
                </TabsTrigger>
              </TabsList>

              {/* Query Console */}
              <TabsContent value="console" className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">استعلام SQL مخصص</label>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setCustomQuery('SELECT * FROM ' + (selectedTable || 'table_name') + ' LIMIT 10')}
                    >
                      مثال
                    </Button>
                  </div>
                  <Textarea
                    value={customQuery}
                    onChange={(e) => setCustomQuery(e.target.value)}
                    placeholder="SELECT * FROM table_name WHERE ..."
                    className="font-mono min-h-[150px] text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={executeCustomQuery} className="gap-2">
                      <Play className="h-4 w-4" />
                      تنفيذ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(customQuery)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      نسخ
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomQuery('');
                        setQueryResult(null);
                        setQueryError('');
                      }}
                    >
                      مسح
                    </Button>
                  </div>
                </div>

                {queryError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="font-mono text-sm">
                      {queryError}
                    </AlertDescription>
                  </Alert>
                )}

                {queryResult && (
                  <Card className="border-2 border-green-500">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        النتيجة ({queryResult.length} سجل)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[300px]">
                        <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
                          {JSON.stringify(queryResult, null, 2)}
                        </pre>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* Query Logs */}
              <TabsContent value="logs" className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    آخر {queryLogs.length} استعلام
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setQueryLogs([])}
                  >
                    مسح السجل
                  </Button>
                </div>
                <ScrollArea className="h-[400px] border rounded-lg">
                  <div className="space-y-2 p-4">
                    {queryLogs.map((log) => (
                      <Card key={log.id} className={`${log.success ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                {log.success ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <AlertCircle className="h-4 w-4 text-red-600" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                  {log.timestamp.toLocaleTimeString('ar')}
                                </span>
                                <Badge variant="secondary" className="text-xs">
                                  {formatDuration(log.duration)}
                                </Badge>
                                {log.rowCount !== undefined && (
                                  <Badge variant="outline" className="text-xs">
                                    {log.rowCount} سجل
                                  </Badge>
                                )}
                              </div>
                              <pre className="text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
                                {log.query}
                              </pre>
                              {log.error && (
                                <Alert variant="destructive" className="py-2">
                                  <AlertDescription className="text-xs">
                                    {log.error}
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyToClipboard(log.query)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* Statistics */}
              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {queryLogs.length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        إجمالي الاستعلامات
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {queryLogs.filter(l => l.success).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ناجحة
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {queryLogs.filter(l => !l.success).length}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        فاشلة
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatDuration(avgQueryTime)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        متوسط الوقت
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">أبطأ الاستعلامات</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {[...queryLogs]
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, 5)
                        .map((log) => (
                          <div key={log.id} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-800 rounded">
                            <code className="text-xs flex-1 truncate">
                              {log.query}
                            </code>
                            <Badge variant="secondary">
                              {formatDuration(log.duration)}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Tables List */}
        <Card className="col-span-3 shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
            <CardTitle className="text-lg flex items-center gap-2">
              <TableIcon className="h-5 w-5" />
              الجداول ({filteredTables.length})
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في الجداول..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-350px)]">
              <div className="space-y-1 p-2">
                {filteredTables.map((table) => (
                  <Button
                    key={table}
                    variant={selectedTable === table ? 'default' : 'ghost'}
                    className={`w-full justify-start gap-2 ${selectedTable === table
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    onClick={() => {
                      setSelectedTable(table);
                      setCurrentPage(1);
                      setFilterColumn('');
                      setFilterValue('');
                    }}
                  >
                    <TableIcon className="h-4 w-4" />
                    <span className="truncate">{table}</span>
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Table Content */}
        <Card className="col-span-9 shadow-lg border-2">
          {selectedTable ? (
            <>
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl flex items-center gap-2">
                      <Eye className="h-6 w-6" />
                      {selectedTable}
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      {tableCount.toLocaleString('ar')} سجل في المجموع
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={exportTableData} className="gap-2">
                      <Download className="h-4 w-4" />
                      تصدير CSV
                    </Button>
                    <Button size="sm" variant="outline" onClick={loadTableData} className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      تحديث
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <Tabs defaultValue="data">
                  <TabsList className="grid grid-cols-2 w-full mb-4">
                    <TabsTrigger value="data" className="gap-2">
                      <Database className="h-4 w-4" />
                      البيانات
                    </TabsTrigger>
                    <TabsTrigger value="structure" className="gap-2">
                      <Info className="h-4 w-4" />
                      البنية
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="data" className="space-y-4">
                    {/* Filters */}
                    <Card className="border-2 border-dashed border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 shadow-sm">
                      <CardContent className="p-5">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-200 min-w-[80px]">
                            <Filter className="h-5 w-5 text-blue-600" />
                            تصفية:
                          </div>
                          <Select value={filterColumn || 'none'} onValueChange={(value) => setFilterColumn(value === 'none' ? '' : value)}>
                            <SelectTrigger className="w-[220px] bg-white dark:bg-gray-800 border-2 shadow-sm">
                              <SelectValue placeholder="اختر عمود للتصفية" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">
                                <span className="flex items-center gap-2">
                                  <Database className="h-4 w-4" />
                                  بدون تصفية
                                </span>
                              </SelectItem>
                              {tableInfo.map((col) => (
                                <SelectItem key={col.cid} value={col.name}>
                                  <span className="flex items-center gap-2">
                                    <TableIcon className="h-4 w-4" />
                                    {col.name}
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {filterColumn && (
                            <div className="flex-1 relative">
                              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="ابحث في البيانات..."
                                value={filterValue}
                                onChange={(e) => setFilterValue(e.target.value)}
                                className="pr-10 bg-white dark:bg-gray-800 border-2 shadow-sm"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 whitespace-nowrap">
                              عدد السجلات:
                            </span>
                            <Select
                              value={itemsPerPage.toString()}
                              onValueChange={(v) => {
                                setItemsPerPage(Number(v));
                                setCurrentPage(1);
                              }}
                            >
                              <SelectTrigger className="w-[130px] bg-white dark:bg-gray-800 border-2 shadow-sm">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="25">25 سجل</SelectItem>
                                <SelectItem value="50">50 سجل</SelectItem>
                                <SelectItem value="100">100 سجل</SelectItem>
                                <SelectItem value="200">200 سجل</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Data Table */}
                    <div className="border-2 rounded-lg overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <ScrollArea className="h-[calc(100vh-550px)]">
                          <Table className="w-full">
                            <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 sticky top-0 z-10 shadow-sm">
                              <TableRow className="border-b-2">
                                {tableInfo.map((col) => (
                                  <TableHead
                                    key={col.cid}
                                    className="whitespace-nowrap font-bold text-sm px-6 py-4 border-l first:border-l-0"
                                    style={{
                                      minWidth: col.pk === 1 ? '100px' : '180px',
                                      maxWidth: '300px'
                                    }}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-700 dark:text-gray-200">
                                        {col.name}
                                      </span>
                                      {col.pk === 1 && (
                                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                          PK
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                                      {col.type}
                                    </div>
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {loading ? (
                                <TableRow>
                                  <TableCell colSpan={tableInfo.length} className="text-center py-12">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
                                      <span className="text-sm font-medium">جاري التحميل...</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : tableData.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={tableInfo.length} className="text-center py-12">
                                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                                      <Database className="h-16 w-16 opacity-30" />
                                      <span className="text-base font-medium">لا توجد بيانات</span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ) : (
                                tableData.map((row, idx) => (
                                  <TableRow
                                    key={idx}
                                    className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors border-b"
                                  >
                                    {tableInfo.map((col) => (
                                      <TableCell
                                        key={col.cid}
                                        className="px-6 py-3 border-l first:border-l-0 align-middle"
                                        style={{
                                          minWidth: col.pk === 1 ? '100px' : '180px',
                                          maxWidth: '300px'
                                        }}
                                      >
                                        <div
                                          className="text-sm overflow-hidden text-ellipsis"
                                          title={String(row[col.name])}
                                        >
                                          {formatValue(row[col.name])}
                                        </div>
                                      </TableCell>
                                    ))}
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </ScrollArea>
                      </div>
                    </div>

                    {/* Pagination */}
                    <Card className="border-2 shadow-md bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Activity className="h-5 w-5 text-blue-600" />
                              <div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                  صفحة {currentPage.toLocaleString('ar')} من {totalPages.toLocaleString('ar')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  عرض {tableData.length.toLocaleString('ar')} من {tableCount.toLocaleString('ar')} سجل
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(1)}
                              disabled={currentPage === 1}
                              className="border-2 shadow-sm hover:shadow-md transition-all"
                            >
                              <ChevronRight className="h-4 w-4 ml-1" />
                              الأولى
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                              className="border-2 shadow-sm hover:shadow-md transition-all"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="flex items-center px-4 py-2 bg-blue-100 dark:bg-blue-900 rounded-md border-2 border-blue-300 dark:border-blue-700">
                              <span className="text-sm font-bold text-blue-700 dark:text-blue-200">
                                {currentPage.toLocaleString('ar')}
                              </span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                              className="border-2 shadow-sm hover:shadow-md transition-all"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setCurrentPage(totalPages)}
                              disabled={currentPage === totalPages}
                              className="border-2 shadow-sm hover:shadow-md transition-all"
                            >
                              الأخيرة
                              <ChevronLeft className="h-4 w-4 mr-1" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="structure">
                    <div className="border-2 rounded-lg overflow-hidden shadow-sm">
                      <Table className="w-full">
                        <TableHeader className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700">
                          <TableRow className="border-b-2">
                            <TableHead className="font-bold text-sm px-6 py-4 border-l first:border-l-0 w-[200px]">
                              <div className="flex items-center gap-2">
                                <TableIcon className="h-4 w-4" />
                                اسم العمود
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-sm px-6 py-4 border-l w-[180px]">
                              <div className="flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                النوع
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-sm px-6 py-4 border-l w-[150px] text-center">
                              <div className="flex items-center justify-center gap-2">
                                <Info className="h-4 w-4" />
                                يقبل NULL
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-sm px-6 py-4 border-l w-[200px]">
                              <div className="flex items-center gap-2">
                                <Terminal className="h-4 w-4" />
                                القيمة الافتراضية
                              </div>
                            </TableHead>
                            <TableHead className="font-bold text-sm px-6 py-4 w-[180px] text-center">
                              <div className="flex items-center justify-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                مفتاح
                              </div>
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tableInfo.map((col) => (
                            <TableRow
                              key={col.cid}
                              className="hover:bg-blue-50 dark:hover:bg-gray-800 transition-colors border-b"
                            >
                              <TableCell className="font-semibold px-6 py-4 border-l first:border-l-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-blue-600 dark:text-blue-400">
                                    {col.name}
                                  </span>
                                  {col.pk === 1 && (
                                    <Badge variant="default" className="text-[10px] px-1.5 py-0">
                                      PK
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="px-6 py-4 border-l">
                                <Badge variant="secondary" className="font-mono text-xs">
                                  {col.type}
                                </Badge>
                              </TableCell>
                              <TableCell className="px-6 py-4 border-l text-center">
                                {col.notnull ? (
                                  <Badge variant="destructive" className="text-xs">
                                    <AlertCircle className="h-3 w-3 ml-1" />
                                    NO
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle className="h-3 w-3 ml-1" />
                                    YES
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4 border-l">
                                {col.dflt_value ? (
                                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded font-mono">
                                    {col.dflt_value}
                                  </code>
                                ) : (
                                  <span className="text-gray-400 text-sm">-</span>
                                )}
                              </TableCell>
                              <TableCell className="px-6 py-4 text-center">
                                {col.pk === 1 && (
                                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-xs">
                                    <CheckCircle className="h-3 w-3 ml-1" />
                                    PRIMARY KEY
                                  </Badge>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>

                      {/* Structure Summary */}
                      <div className="bg-gray-50 dark:bg-gray-900 border-t-2 p-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {tableInfo.length}
                            </div>
                            <div className="text-xs text-muted-foreground">إجمالي الأعمدة</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                              {tableInfo.filter(c => c.pk === 1).length}
                            </div>
                            <div className="text-xs text-muted-foreground">مفاتيح أساسية</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {tableInfo.filter(c => c.notnull).length}
                            </div>
                            <div className="text-xs text-muted-foreground">أعمدة إجبارية</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {tableInfo.filter(c => c.dflt_value).length}
                            </div>
                            <div className="text-xs text-muted-foreground">لها قيم افتراضية</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[600px] text-muted-foreground">
              <div className="text-center space-y-4">
                <Database className="h-24 w-24 mx-auto opacity-30" />
                <div>
                  <p className="text-xl font-semibold">اختر جدولاً من القائمة</p>
                  <p className="text-sm mt-2">ابدأ باختيار جدول لعرض محتوياته والتعامل معه</p>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DatabaseAdmin;
