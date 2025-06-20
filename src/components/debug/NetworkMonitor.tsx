import React, { useState, useEffect, useCallback } from 'react';
import { networkInterceptor, NetworkRequest } from '@/lib/network-interceptor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Download, 
  Trash2, 
  Filter, 
  Copy, 
  ChevronDown, 
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Wifi,
  WifiOff,
  FileCode,
  BarChart3,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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

export function NetworkMonitor() {
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<NetworkRequest | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [duplicates, setDuplicates] = useState<NetworkRequest[][]>([]);

  // تحديث الطلبات
  const updateRequests = useCallback(() => {
    const allRequests = networkInterceptor.getRequests();
    setRequests(allRequests);
    
    // البحث عن الطلبات المكررة
    const duplicateRequests = networkInterceptor.findDuplicateRequests();
    setDuplicates(duplicateRequests);
  }, []);

  useEffect(() => {
    // الاستماع للطلبات الجديدة
    const handleNewRequest = (request: NetworkRequest) => {
      if (autoRefresh) {
        updateRequests();
      }
    };

    networkInterceptor.addListener(handleNewRequest);
    updateRequests();

    // تحديث دوري
    const interval = setInterval(() => {
      if (autoRefresh) {
        updateRequests();
      }
    }, 1000);

    return () => {
      networkInterceptor.removeListener(handleNewRequest);
      clearInterval(interval);
    };
  }, [autoRefresh, updateRequests]);

  // فلترة الطلبات
  const filteredRequests = requests.filter(request => {
    const matchesSearch = request.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.method.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         request.initiator?.file?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || request.type === filterType;
    
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'success' && request.status && request.status >= 200 && request.status < 300) ||
                         (filterStatus === 'error' && (request.error || (request.status && request.status >= 400))) ||
                         (filterStatus === 'pending' && !request.status && !request.error);
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // الإحصائيات
  const stats = networkInterceptor.getStatistics();

  // تصدير البيانات
  const exportData = () => {
    const data = {
      requests: filteredRequests,
      statistics: stats,
      duplicates: duplicates,
      timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `network-log-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // نسخ تفاصيل الطلب
  const copyRequestDetails = (request: NetworkRequest) => {
    const details = JSON.stringify(request, null, 2);
    navigator.clipboard.writeText(details);
  };

  // مسح السجلات
  const clearLogs = () => {
    networkInterceptor.clearRequests();
    updateRequests();
  };

  // عرض حالة الطلب
  const getStatusBadge = (request: NetworkRequest) => {
    if (!request.status && !request.error) {
      return <Badge variant="secondary" className="gap-1"><Clock className="w-3 h-3" /> جاري</Badge>;
    }
    
    if (request.error) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> خطأ</Badge>;
    }
    
    if (request.status && request.status >= 200 && request.status < 300) {
      return <Badge variant="default" className="gap-1"><CheckCircle className="w-3 h-3" /> {request.status}</Badge>;
    }
    
    if (request.status && request.status >= 400) {
      return <Badge variant="destructive" className="gap-1"><AlertCircle className="w-3 h-3" /> {request.status}</Badge>;
    }
    
    return <Badge variant="secondary">{request.status}</Badge>;
  };

  // عرض نوع الطلب
  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'supabase':
        return <Badge variant="outline" className="gap-1 bg-green-50"><Database className="w-3 h-3" /> Supabase</Badge>;
      case 'fetch':
        return <Badge variant="outline" className="gap-1 bg-blue-50"><Globe className="w-3 h-3" /> Fetch</Badge>;
      case 'xhr':
        return <Badge variant="outline" className="gap-1 bg-purple-50"><Wifi className="w-3 h-3" /> XHR</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // تنسيق الحجم
  const formatSize = (bytes: number | undefined) => {
    if (!bytes) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  // تنسيق المدة
  const formatDuration = (ms: number | undefined) => {
    if (!ms) return '0 ms';
    if (ms < 1000) return `${Math.round(ms)} ms`;
    return `${(ms / 1000).toFixed(2)} s`;
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 max-w-7xl">
      {/* زر التبديل */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className="mb-2 gap-2"
        variant={duplicates.length > 0 || stats.byStatus.error > 0 ? "destructive" : "secondary"}
      >
        <Wifi className="w-4 h-4" />
        مراقب الشبكة
        {(duplicates.length > 0 || stats.byStatus.error > 0) && (
          <Badge variant="secondary" className="ml-2">
            {duplicates.length + stats.byStatus.error}
          </Badge>
        )}
      </Button>

      {/* النافذة الرئيسية */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleContent>
          <Card className="w-[1200px] h-[700px] shadow-2xl">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">مراقب الشبكة المتقدم</CardTitle>
                  <CardDescription>
                    مراقبة جميع طلبات الشبكة وقاعدة البيانات في الوقت الفعلي
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={autoRefresh ? "default" : "outline"}
                    onClick={() => setAutoRefresh(!autoRefresh)}
                  >
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

              {/* الإحصائيات */}
              <div className="grid grid-cols-6 gap-3 mt-4">
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">المجموع</span>
                    <BarChart3 className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="text-2xl font-bold">{stats.total}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">نجح</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{stats.byStatus.success}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">فشل</span>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="text-2xl font-bold text-red-600">{stats.byStatus.error}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">جاري</span>
                    <Clock className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div className="text-2xl font-bold text-yellow-600">{stats.byStatus.pending}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">متوسط الوقت</span>
                    <Zap className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-xl font-bold text-blue-600">{formatDuration(stats.averageDuration)}</div>
                </Card>
                <Card className="p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الحجم الكلي</span>
                    <Database className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-xl font-bold text-purple-600">{formatSize(stats.totalSize)}</div>
                </Card>
              </div>

              {/* التحذيرات */}
              {duplicates.length > 0 && (
                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-medium">تم اكتشاف {duplicates.length} مجموعة من الطلبات المكررة!</span>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="flex gap-4 h-[calc(100%-200px)]">
              {/* قائمة الطلبات */}
              <div className="flex-1">
                {/* أدوات البحث والفلترة */}
                <div className="flex gap-2 mb-4">
                  <div className="relative flex-1">
                    <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="بحث في الطلبات..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="النوع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الأنواع</SelectItem>
                      <SelectItem value="supabase">Supabase</SelectItem>
                      <SelectItem value="fetch">Fetch</SelectItem>
                      <SelectItem value="xhr">XHR</SelectItem>
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
                </div>

                {/* قائمة الطلبات */}
                <ScrollArea className="h-[calc(100%-50px)]">
                  <div className="space-y-2">
                    {filteredRequests.map((request) => (
                      <div
                        key={request.id}
                        className={cn(
                          "p-3 border rounded-lg cursor-pointer transition-colors",
                          selectedRequest?.id === request.id ? "bg-accent" : "hover:bg-accent/50",
                          request.error && "border-red-200",
                          duplicates.some(group => group.some(r => r.id === request.id)) && "border-yellow-200"
                        )}
                        onClick={() => setSelectedRequest(request)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getStatusBadge(request)}
                            {getTypeBadge(request.type)}
                            <Badge variant="outline">{request.method}</Badge>
                            {request.cached && <Badge variant="secondary">مخزن</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {request.duration && <span>{formatDuration(request.duration)}</span>}
                            {request.size && <span>{formatSize(request.size)}</span>}
                            <span>{formatDistanceToNow(request.timestamp, { locale: ar, addSuffix: true })}</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="text-sm font-mono truncate">{request.url}</div>
                          {request.initiator?.file && (
                            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <FileCode className="w-3 h-3" />
                              {request.initiator.file}:{request.initiator.line}:{request.initiator.column}
                              {request.initiator.functionName && ` (${request.initiator.functionName})`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              {/* تفاصيل الطلب */}
              {selectedRequest && (
                <div className="w-[500px] border-r pr-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">تفاصيل الطلب</h3>
                    <Button size="sm" variant="outline" onClick={() => copyRequestDetails(selectedRequest)}>
                      <Copy className="w-4 h-4 ml-2" />
                      نسخ
                    </Button>
                  </div>

                  <Tabs defaultValue="general" className="h-full">
                    <TabsList className="grid w-full grid-cols-5">
                      <TabsTrigger value="general">عام</TabsTrigger>
                      <TabsTrigger value="headers">الرؤوس</TabsTrigger>
                      <TabsTrigger value="body">المحتوى</TabsTrigger>
                      <TabsTrigger value="response">الاستجابة</TabsTrigger>
                      <TabsTrigger value="performance">الأداء</TabsTrigger>
                    </TabsList>

                    <ScrollArea className="h-[calc(100%-100px)]">
                      <TabsContent value="general" className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">URL</label>
                          <div className="font-mono text-sm mt-1 p-2 bg-muted rounded break-all">
                            {selectedRequest.url}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">الطريقة</label>
                            <div className="mt-1">{selectedRequest.method}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">الحالة</label>
                            <div className="mt-1">{getStatusBadge(selectedRequest)}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">النوع</label>
                            <div className="mt-1">{getTypeBadge(selectedRequest.type)}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">المدة</label>
                            <div className="mt-1">{formatDuration(selectedRequest.duration)}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">الحجم</label>
                            <div className="mt-1">{formatSize(selectedRequest.size)}</div>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">مخزن؟</label>
                            <div className="mt-1">{selectedRequest.cached ? 'نعم' : 'لا'}</div>
                          </div>
                        </div>
                        {selectedRequest.initiator && (
                          <div>
                            <label className="text-sm font-medium text-muted-foreground">المصدر</label>
                            <div className="mt-1 space-y-1 text-sm">
                              <div className="font-mono">
                                {selectedRequest.initiator.file}:{selectedRequest.initiator.line}:{selectedRequest.initiator.column}
                              </div>
                              {selectedRequest.initiator.functionName && (
                                <div>الدالة: {selectedRequest.initiator.functionName}</div>
                              )}
                            </div>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="headers" className="space-y-4">
                        <div>
                          <h4 className="font-medium mb-2">رؤوس الطلب</h4>
                          <div className="space-y-1">
                            {Object.entries(selectedRequest.headers).map(([key, value]) => (
                              <div key={key} className="text-sm">
                                <span className="font-mono font-medium">{key}:</span>{' '}
                                <span className="text-muted-foreground">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="body" className="space-y-4">
                        {selectedRequest.body ? (
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {JSON.stringify(selectedRequest.body, null, 2)}
                          </pre>
                        ) : (
                          <div className="text-muted-foreground text-center py-8">لا يوجد محتوى</div>
                        )}
                      </TabsContent>

                      <TabsContent value="response" className="space-y-4">
                        {selectedRequest.response ? (
                          <pre className="text-xs bg-muted p-3 rounded overflow-auto">
                            {typeof selectedRequest.response === 'string' 
                              ? selectedRequest.response 
                              : JSON.stringify(selectedRequest.response, null, 2)}
                          </pre>
                        ) : selectedRequest.error ? (
                          <div className="text-red-600">
                            <h4 className="font-medium mb-2">خطأ</h4>
                            <pre className="text-xs bg-red-50 p-3 rounded">
                              {selectedRequest.error.toString()}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-center py-8">لا توجد استجابة بعد</div>
                        )}
                      </TabsContent>

                      <TabsContent value="performance" className="space-y-4">
                        {selectedRequest.performanceMetrics ? (
                          <div className="space-y-3">
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">DNS</label>
                              <div className="mt-1">{formatDuration(selectedRequest.performanceMetrics.dns)}</div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">TCP</label>
                              <div className="mt-1">{formatDuration(selectedRequest.performanceMetrics.tcp)}</div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">TTFB</label>
                              <div className="mt-1">{formatDuration(selectedRequest.performanceMetrics.ttfb)}</div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-muted-foreground">تحميل</label>
                              <div className="mt-1">{formatDuration(selectedRequest.performanceMetrics.download)}</div>
                            </div>
                            <Separator className="my-2" />
                            <div>
                              <label className="text-sm font-medium">المجموع</label>
                              <div className="mt-1 text-lg font-semibold">
                                {formatDuration(selectedRequest.performanceMetrics.total)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-muted-foreground text-center py-8">
                            لا توجد بيانات أداء متاحة
                          </div>
                        )}
                      </TabsContent>
                    </ScrollArea>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}