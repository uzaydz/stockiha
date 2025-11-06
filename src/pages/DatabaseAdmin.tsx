import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Database,
  Table as TableIcon,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  Info,
  ChevronLeft,
  ChevronRight,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';

interface TableInfo {
  name: string;
  count: number;
  columns: ColumnInfo[];
}

interface ColumnInfo {
  cid: number;
  name: string;
  type: string;
  notnull: number;
  dflt_value: any;
  pk: number;
}

declare global {
  interface Window {
    electronAPI?: {
      db: {
        query: (sql: string, params?: any) => Promise<{ success: boolean; data: any[]; error?: string }>;
        queryOne: (sql: string, params?: any) => Promise<{ success: boolean; data: any; error?: string }>;
      };
    };
  }
}

const DatabaseAdmin: React.FC = () => {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<ColumnInfo[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableCount, setTableCount] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(50);
  const [searchTerm, setSearchTerm] = useState('');
  const [dbSize, setDbSize] = useState(0);

  // التحقق من وجود Electron API
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
  }, [selectedTable, currentPage]);

  const loadTables = async () => {
    if (!window.electronAPI?.db) return;

    setLoading(true);
    try {
      const result = await window.electronAPI.db.query(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '%_fts%' ORDER BY name`
      );

      if (result.success) {
        const tableNames = result.data.map((row: any) => row.name);
        setTables(tableNames);
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
      const result = await window.electronAPI.db.query(`PRAGMA table_info(${selectedTable})`);
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
      const result = await window.electronAPI.db.query(
        `SELECT * FROM ${selectedTable} ORDER BY id DESC LIMIT ? OFFSET ?`,
        [itemsPerPage, offset]
      );

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
      const result = await window.electronAPI.db.queryOne(`SELECT COUNT(*) as count FROM ${selectedTable}`);
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatValue = (value: any) => {
    if (value === null) return <span className="text-gray-400 italic">null</span>;
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    if (str.length > 100) return str.substring(0, 100) + '...';
    return str;
  };

  const totalPages = Math.ceil(tableCount / itemsPerPage);

  const filteredTables = tables.filter(table =>
    table.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isElectron) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">غير متاح</CardTitle>
            <CardDescription className="text-center">
              هذه الصفحة متاحة فقط في تطبيق سطح المكتب (Electron)
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Database className="h-8 w-8" />
            مستكشف قاعدة البيانات
          </h1>
          <p className="text-muted-foreground mt-1">
            عرض وإدارة جميع البيانات المخزنة محلياً في SQLite
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {formatBytes(dbSize)}
          </Badge>
          <Badge variant="outline">
            {tables.length} جدول
          </Badge>
          <Button onClick={loadTables} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* قائمة الجداول */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle className="text-lg">الجداول</CardTitle>
            <Input
              placeholder="بحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mt-2"
            />
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[calc(100vh-300px)]">
              <div className="space-y-1 p-4">
                {filteredTables.map((table) => (
                  <Button
                    key={table}
                    variant={selectedTable === table ? 'default' : 'ghost'}
                    className="w-full justify-start"
                    onClick={() => {
                      setSelectedTable(table);
                      setCurrentPage(1);
                    }}
                  >
                    <TableIcon className="h-4 w-4 ml-2" />
                    {table}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* محتوى الجدول */}
        <Card className="col-span-9">
          {selectedTable ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedTable}</CardTitle>
                    <CardDescription>
                      {tableCount.toLocaleString('ar')} سجل
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 ml-2" />
                      تصدير
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="data">
                  <TabsList>
                    <TabsTrigger value="data">البيانات</TabsTrigger>
                    <TabsTrigger value="structure">البنية</TabsTrigger>
                  </TabsList>

                  <TabsContent value="data" className="space-y-4">
                    {/* جدول البيانات */}
                    <ScrollArea className="h-[calc(100vh-400px)] rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            {tableInfo.map((col) => (
                              <TableHead key={col.cid} className="whitespace-nowrap">
                                {col.name}
                                {col.pk === 1 && (
                                  <Badge variant="outline" className="mr-1 text-xs">
                                    PK
                                  </Badge>
                                )}
                              </TableHead>
                            ))}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={tableInfo.length} className="text-center">
                                جاري التحميل...
                              </TableCell>
                            </TableRow>
                          ) : tableData.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={tableInfo.length} className="text-center">
                                لا توجد بيانات
                              </TableCell>
                            </TableRow>
                          ) : (
                            tableData.map((row, idx) => (
                              <TableRow key={idx}>
                                {tableInfo.map((col) => (
                                  <TableCell key={col.cid} className="max-w-xs truncate">
                                    {formatValue(row[col.name])}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </ScrollArea>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        صفحة {currentPage} من {totalPages} ({tableCount.toLocaleString('ar')} سجل)
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="structure">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>اسم العمود</TableHead>
                          <TableHead>النوع</TableHead>
                          <TableHead>Null</TableHead>
                          <TableHead>القيمة الافتراضية</TableHead>
                          <TableHead>مفتاح</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tableInfo.map((col) => (
                          <TableRow key={col.cid}>
                            <TableCell className="font-medium">{col.name}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{col.type}</Badge>
                            </TableCell>
                            <TableCell>{col.notnull ? 'NO' : 'YES'}</TableCell>
                            <TableCell>
                              {col.dflt_value ? (
                                <code className="text-xs">{col.dflt_value}</code>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {col.pk === 1 && <Badge>PRIMARY</Badge>}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Info className="h-12 w-12 mx-auto opacity-50" />
                <p>اختر جدولاً لعرض محتوياته</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default DatabaseAdmin;
