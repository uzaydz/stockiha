import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  BarChart, 
  LineChart, 
  Sparkles, 
  Clock, 
  Database, 
  Hourglass, 
  Layers, 
  LayoutList, 
  RefreshCw, 
  Download, 
  FileDown, 
  Settings
} from "lucide-react";

import { ExportOptions, exportQueriesData, exportComprehensiveAnalysis, performComprehensiveAnalysis } from './queryExporter';
import { queryStore, similarQueriesGroups, performanceInfo } from './queryAnalytics';

/**
 * لوحة تحكم التحليلات - تعرض تحليلات شاملة عن استعلامات Supabase
 */
const AnalyticsDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('summary');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState<boolean>(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeRawQueries: true,
    includeQueryDetails: true,
    includeResponses: false,
    includeStackTraces: false,
    includeSimilarGroups: true,
    includePerformanceInfo: true,
    queryLimit: 100
  });
  
  // استدعاء دالة التحليل الشامل
  const analysisResults = performComprehensiveAnalysis();
  
  // معالجة تصدير البيانات المخصصة
  const handleExport = () => {
    exportQueriesData(exportOptions);
    setIsExportDialogOpen(false);
  };
  
  // معالجة تصدير التحليل الشامل
  const handleExportAnalysis = () => {
    exportComprehensiveAnalysis();
  };
  
  // لوحة ملخص التحليل
  const SummaryPanel = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الاستعلامات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisResults.summary.totalQueries}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">الاستعلامات البطيئة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisResults.summary.slowQueries}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">متوسط وقت الاستعلام</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisResults.summary.averageQueryTime.toFixed(2)} ms</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">المرشحون للتخزين المؤقت</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysisResults.summary.cacheableCandidates}</div>
          </CardContent>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">الجداول الأكثر استخداماً</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الجدول</TableHead>
                  <TableHead>العدد</TableHead>
                  <TableHead>متوسط الوقت (ms)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisResults.tableUsage.mostUsed.map((table, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{table.table}</TableCell>
                    <TableCell>{table.count}</TableCell>
                    <TableCell>{table.averageDuration.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-base">المكونات الأكثر نشاطاً</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المكون</TableHead>
                  <TableHead>عدد الاستعلامات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {analysisResults.componentUsage.mostActive.map((component, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">{component.component}</TableCell>
                    <TableCell>{component.count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
  
  // لوحة الأداء
  const PerformancePanel = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">أبطأ الاستعلامات</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الجدول</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>المكون</TableHead>
                <TableHead>الوقت (ms)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisResults.performance.slowestQueries.map((query, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{query.table || 'غير معروف'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{query.queryType || query.method}</Badge>
                  </TableCell>
                  <TableCell>{query.componentName || 'غير معروف'}</TableCell>
                  <TableCell className="font-bold">{query.duration}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-base">الاستعلامات الأكثر تكراراً</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الجدول</TableHead>
                <TableHead>النوع</TableHead>
                <TableHead>العدد</TableHead>
                <TableHead>متوسط الوقت (ms)</TableHead>
                <TableHead>الإمكانية للتخزين المؤقت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {analysisResults.performance.mostRepeatedQueries.map((query, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{query.tableName || 'غير معروف'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{query.queryType}</Badge>
                  </TableCell>
                  <TableCell>{query.count}</TableCell>
                  <TableCell>{Math.round(query.avgDuration)}</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <div className="w-full bg-muted rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${
                            query.cacheability > 7 ? 'bg-green-500' : 
                            query.cacheability > 4 ? 'bg-yellow-500' : 'bg-red-500'
                          }`} 
                          style={{ width: `${query.cacheability * 10}%` }}
                        />
                      </div>
                      <span className="text-xs">{query.cacheability}/10</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
  
  // لوحة اقتراحات التحسين
  const SuggestionsPanel = () => (
    <div className="space-y-4">
      {analysisResults.optimizationSuggestions.length === 0 ? (
        <div className="text-center p-6 text-muted-foreground">
          لم يتم العثور على اقتراحات للتحسين حالياً. قد تظهر اقتراحات مع زيادة استخدام التطبيق.
        </div>
      ) : (
        analysisResults.optimizationSuggestions.map((suggestion, index) => (
          <Card key={index} className={`border-l-4 ${
            suggestion.impact === 'high' ? 'border-l-red-500' :
            suggestion.impact === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                {suggestion.type === 'batch_queries' && <Layers className="text-blue-500" />}
                {suggestion.type === 'add_caching' && <Clock className="text-green-500" />}
                {suggestion.type === 'optimize_slow_queries' && <Hourglass className="text-orange-500" />}
                <h3 className="font-medium">
                  {suggestion.type === 'batch_queries' && 'تجميع الاستعلامات'}
                  {suggestion.type === 'add_caching' && 'إضافة التخزين المؤقت'}
                  {suggestion.type === 'optimize_slow_queries' && 'تحسين الاستعلامات البطيئة'}
                </h3>
              </div>
              <p className="text-sm">{suggestion.description}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
  
  // نافذة خيارات التصدير
  const ExportDialog = () => (
    <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>خيارات التصدير</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">محتويات التصدير</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeRawQueries}
                  onChange={e => setExportOptions({...exportOptions, includeRawQueries: e.target.checked})}
                />
                تضمين الاستعلامات الأصلية
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeQueryDetails}
                  onChange={e => setExportOptions({...exportOptions, includeQueryDetails: e.target.checked})}
                />
                تضمين تفاصيل الاستعلامات
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeResponses}
                  onChange={e => setExportOptions({...exportOptions, includeResponses: e.target.checked})}
                />
                تضمين الاستجابات (يزيد حجم الملف)
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeStackTraces}
                  onChange={e => setExportOptions({...exportOptions, includeStackTraces: e.target.checked})}
                />
                تضمين مسارات التنفيذ (يزيد حجم الملف)
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includeSimilarGroups}
                  onChange={e => setExportOptions({...exportOptions, includeSimilarGroups: e.target.checked})}
                />
                تضمين المجموعات المتشابهة
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.includePerformanceInfo}
                  onChange={e => setExportOptions({...exportOptions, includePerformanceInfo: e.target.checked})}
                />
                تضمين معلومات الأداء
              </label>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">مرشحات</h3>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.onlySlowQueries}
                  onChange={e => setExportOptions({...exportOptions, onlySlowQueries: e.target.checked})}
                />
                الاستعلامات البطيئة فقط
              </label>
              
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={exportOptions.onlyCacheableCandidates}
                  onChange={e => setExportOptions({...exportOptions, onlyCacheableCandidates: e.target.checked})}
                />
                المرشحون للتخزين المؤقت فقط
              </label>
              
              <div className="flex items-center gap-2 text-sm">
                <label className="text-sm">حد عدد الاستعلامات:</label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={exportOptions.queryLimit}
                  onChange={e => setExportOptions({
                    ...exportOptions, 
                    queryLimit: parseInt(e.target.value) || 100
                  })}
                  className="w-20 p-1 text-sm border rounded"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
            إلغاء
          </Button>
          <Button onClick={handleExport}>
            <FileDown className="h-4 w-4 mr-2" />
            تصدير
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>لوحة تحكم التحليلات</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="h-4 w-4 mr-2" />
              تصدير مخصص
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportAnalysis}>
              <FileDown className="h-4 w-4 mr-2" />
              تصدير التحليل
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="py-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="summary">
              <BarChart className="h-4 w-4 mr-2" />
              الملخص
            </TabsTrigger>
            <TabsTrigger value="performance">
              <LineChart className="h-4 w-4 mr-2" />
              الأداء
            </TabsTrigger>
            <TabsTrigger value="suggestions">
              <Sparkles className="h-4 w-4 mr-2" />
              اقتراحات التحسين
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary">
            <SummaryPanel />
          </TabsContent>
          
          <TabsContent value="performance">
            <PerformancePanel />
          </TabsContent>
          
          <TabsContent value="suggestions">
            <SuggestionsPanel />
          </TabsContent>
        </Tabs>
      </CardContent>
      
      <ExportDialog />
    </Card>
  );
};

export default AnalyticsDashboard;
