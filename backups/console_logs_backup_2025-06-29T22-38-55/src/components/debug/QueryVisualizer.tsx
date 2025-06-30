import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SupabaseQuery } from './types';
import { 
  queryStore, 
  clearSupabaseQueries, 
  addQueryListener, 
  analyzeSimilarQueries,
  similarQueriesGroups,
  performanceInfo
} from './queryAnalytics';
import { exportQueriesData } from './queryExporter';
import { SimilarQueriesViewer, PerformanceRecommendations } from './SimilarQueriesViewer';
import AnalyticsDashboard from './AnalyticsDashboard';

// مكون عرض القيمة كـ JSON
const JsonView = ({ data }: { data: any }) => {
  if (!data) return null;
  
  return (
    <pre className="text-xs overflow-x-auto p-2 bg-muted rounded-md">
      {typeof data === 'object' 
        ? JSON.stringify(data, null, 2) 
        : String(data)
      }
    </pre>
  );
};

// مكون لعرض معلومات الجدول
const TableInfoViewer = ({ tables }: { tables: any[] }) => {
  if (!tables || tables.length === 0) return null;
  
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium mb-1">الجداول المستخدمة:</div>
      <div className="space-y-2">
        {tables.map((table, index) => (
          <div key={index} className="bg-muted/50 p-2 rounded-md border border-muted">
            <div className="flex items-center gap-2 mb-1">
              <Badge className="bg-primary/20 text-primary">
                {table.name}
              </Badge>
              <Badge variant="outline">
                {table.operation}
              </Badge>
              {table.affectedRows !== undefined && (
                <span className="text-xs">
                  <span className="text-muted-foreground">عدد الصفوف: </span>
                  <span className="font-medium">{table.affectedRows}</span>
                </span>
              )}
            </div>
            
            {table.joins && table.joins.length > 0 && (
              <div className="mb-1">
                <span className="text-xs text-muted-foreground mr-1">الجداول المرتبطة:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {table.joins.map((join: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs bg-secondary/20">
                      {join}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {table.filters && Object.keys(table.filters).length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">المرشحات:</span>
                <JsonView data={table.filters} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// مكون لعرض إحصائيات الاستعلامات
const QueryStats = ({ queries }: { queries: SupabaseQuery[] }) => {
  // حساب متوسط وقت الاستجابة
  const totalTime = queries.reduce((sum, query) => sum + query.duration, 0);
  const avgTime = queries.length > 0 ? totalTime / queries.length : 0;
  
  // حساب عدد الاستعلامات لكل نوع
  const typeCounts: Record<string, number> = {};
  queries.forEach(query => {
    const type = query.queryType || 'unknown';
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });
  
  // العثور على أبطأ الاستعلامات
  const slowQueries = [...queries]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 3);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium text-muted-foreground">عدد الاستعلامات</div>
          <div className="text-2xl font-bold">{queries.length}</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium text-muted-foreground">متوسط وقت الاستجابة</div>
          <div className="text-2xl font-bold">{avgTime.toFixed(2)} ms</div>
        </div>
        <div className="rounded-lg border p-3">
          <div className="text-sm font-medium text-muted-foreground">إجمالي الوقت</div>
          <div className="text-2xl font-bold">{(totalTime/1000).toFixed(2)} s</div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-sm font-medium mb-2">أنواع الاستعلامات</h3>
          <div className="space-y-1">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex justify-between items-center">
                <div className="flex items-center">
                  <Badge variant="outline" className={getQueryTypeColor(type)}>
                    {type}
                  </Badge>
                </div>
                <span className="text-sm text-muted-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium mb-2">أبطأ الاستعلامات</h3>
          <div className="space-y-2">
            {slowQueries.map(query => (
              <div key={query.id} className="text-xs">
                <div className="flex justify-between">
                  <Badge variant="outline">
                    {query.queryType || 'unknown'} {query.table && `(${query.table})`}
                  </Badge>
                  <span className="font-medium">{query.duration} ms</span>
                </div>
                <div className="text-muted-foreground truncate mt-1 text-[10px]">
                  {query.url.split('?')[0]}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// تحديد لون العلامة بناءً على نوع الاستعلام
const getQueryTypeColor = (type?: string): string => {
  switch (type) {
    case 'select': return "bg-blue-100 text-blue-800";
    case 'insert': return "bg-green-100 text-green-800";
    case 'update': return "bg-yellow-100 text-yellow-800";
    case 'delete': return "bg-red-100 text-red-800";
    case 'rpc': return "bg-purple-100 text-purple-800";
    case 'function': return "bg-indigo-100 text-indigo-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

// المكون الرئيسي لعرض الاستعلامات
const SupabaseQueryVisualizer = () => {
  const [queries, setQueries] = useState<SupabaseQuery[]>([]);
  const [expandedQueryId, setExpandedQueryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'queries' | 'similar' | 'performance' | 'analytics'>('queries');
  
  useEffect(() => {
    // مستمع لتحديث حالة الاستعلامات
    const unsubscribe = addQueryListener((updatedQueries: SupabaseQuery[]) => {
      setQueries([...updatedQueries]);
    });
    
    // محاولة تحليل أي بيانات موجودة بالفعل
    if (queryStore.length >= 5) {
      analyzeSimilarQueries();
    }
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // تبديل حالة توسيع الاستعلام
  const toggleQuery = (id: string) => {
    setExpandedQueryId(expandedQueryId === id ? null : id);
  };
  
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>مراقب استعلامات Supabase</CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => exportQueriesData()}>
              تصدير البيانات
            </Button>
            <Button variant="ghost" size="sm" onClick={() => clearSupabaseQueries()}>
              مسح البيانات
            </Button>
          </div>
        </div>
        
        <div className="flex border-b mt-2">
          <div 
            className={`px-4 py-2 cursor-pointer ${activeTab === 'queries' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('queries')}
          >
            الاستعلامات ({queries.length})
          </div>
          <div 
            className={`px-4 py-2 cursor-pointer ${activeTab === 'similar' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('similar')}
          >
            الاستعلامات المتشابهة ({similarQueriesGroups.length})
          </div>
          <div 
            className={`px-4 py-2 cursor-pointer ${activeTab === 'performance' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('performance')}
          >
            توصيات الأداء
          </div>
          <div 
            className={`px-4 py-2 cursor-pointer ${activeTab === 'analytics' ? 'border-b-2 border-primary font-medium' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('analytics')}
          >
            لوحة التحليلات
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {activeTab === 'queries' && (
          <div className="space-y-4">
            {queries.length === 0 ? (
              <div className="text-center p-8 text-muted-foreground">
                لم يتم تسجيل أي استعلامات حتى الآن.
              </div>
            ) : (
              <>
                <QueryStats queries={queries} />
                
                <div className="space-y-2">
                  {queries.map(query => (
                    <Collapsible
                      key={query.id}
                      open={expandedQueryId === query.id}
                      onOpenChange={() => toggleQuery(query.id)}
                      className="border rounded-lg"
                    >
                      <CollapsibleTrigger className="flex w-full items-center justify-between p-3 text-left">
                        <div className="flex items-center gap-2">
                          <Badge className={getQueryTypeColor(query.queryType)}>
                            {query.queryType || query.method}
                          </Badge>
                          {query.table && (
                            <Badge variant="outline">{query.table}</Badge>
                          )}
                          {query.isSlowQuery && (
                            <Badge variant="destructive" className="text-xs">بطيء</Badge>
                          )}
                          {query.isCacheable && (
                            <Badge variant="secondary" className="text-xs">يمكن تخزينه مؤقتًا</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-sm text-muted-foreground">{query.componentName || ''}</div>
                          <div className="font-medium">{query.duration} ms</div>
                        </div>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent className="p-4 pt-0 space-y-3">
                        <div className="text-xs text-muted-foreground border-t pt-3">
                          {new Date(query.timestamp).toLocaleString()}
                        </div>
                        
                        {/* معلومات المكون */}
                        {(query.componentName || query.fileLocation) && (
                          <div className="bg-muted p-2 rounded-md">
                            <div className="text-sm font-medium mb-1">معلومات المكون:</div>
                            <div className="text-xs space-y-1">
                              {query.componentName && (
                                <div>
                                  <span className="font-medium">المكون: </span>
                                  <span>{query.componentName}</span>
                                </div>
                              )}
                              {query.fileLocation && (
                                <div>
                                  <span className="font-medium">الملف: </span>
                                  <span>{query.fileLocation}</span>
                                  {query.lineNumber > 0 && ` (السطر: ${query.lineNumber})`}
                                </div>
                              )}
                              {query.queryComplexity && (
                                <div>
                                  <span className="font-medium">تعقيد الاستعلام: </span>
                                  <Badge 
                                    variant="outline"
                                    className={`
                                      ${query.queryComplexity === 'simple' ? 'bg-green-100 text-green-700' : ''}
                                      ${query.queryComplexity === 'medium' ? 'bg-yellow-100 text-yellow-700' : ''}
                                      ${query.queryComplexity === 'complex' ? 'bg-red-100 text-red-700' : ''}
                                    `}
                                  >
                                    {query.queryComplexity === 'simple' ? 'بسيط' : ''}
                                    {query.queryComplexity === 'medium' ? 'متوسط' : ''}
                                    {query.queryComplexity === 'complex' ? 'معقد' : ''}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* معلومات التخزين المؤقت */}
                        {query.isCacheable && (
                          <div className="bg-blue-50 p-2 rounded-md">
                            <div className="text-sm font-medium mb-1 text-blue-700">توصيات التخزين المؤقت:</div>
                            <div className="text-xs space-y-1">
                              <div>
                                <span className="font-medium">درجة القابلية للتخزين: </span>
                                <span className="font-medium">{query.cacheabilityScore}/10</span>
                              </div>
                              {query.suggestedTTL && (
                                <div>
                                  <span className="font-medium">مدة التخزين المقترحة: </span>
                                  <span>{query.suggestedTTL} ثانية</span>
                                  {query.suggestedTTL >= 60 && ` (${Math.floor(query.suggestedTTL / 60)} دقيقة)`}
                                </div>
                              )}
                              {query.cacheRecommendation && (
                                <div className="text-muted-foreground mt-1">
                                  {query.cacheRecommendation}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* عرض معلومات الجداول */}
                        {query.tables && query.tables.length > 0 && (
                          <TableInfoViewer tables={query.tables} />
                        )}

                        <div>
                          <div className="text-sm font-medium mb-1">عنوان URL:</div>
                          <div className="text-xs text-muted-foreground break-all">
                            {query.url}
                          </div>
                        </div>
                        
                        {query.body && (
                          <div>
                            <div className="text-sm font-medium mb-1">البيانات المرسلة:</div>
                            <JsonView data={query.body} />
                          </div>
                        )}
                        
                        {query.response && (
                          <div>
                            <div className="text-sm font-medium mb-1">الاستجابة:</div>
                            <JsonView data={query.response} />
                          </div>
                        )}
                        
                        {query.error && (
                          <div>
                            <div className="text-sm font-medium mb-1 text-red-500">الخطأ:</div>
                            <JsonView data={query.error} />
                          </div>
                        )}
                        
                        {/* مسار التنفيذ */}
                        {query.stackTrace && (
                          <div>
                            <div className="text-sm font-medium mb-1">مسار التنفيذ:</div>
                            <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto whitespace-pre-wrap">
                              {query.stackTrace}
                            </pre>
                          </div>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
        
        {activeTab === 'similar' && (
          <SimilarQueriesViewer />
        )}
        
        {activeTab === 'performance' && (
          <PerformanceRecommendations />
        )}
        
        {activeTab === 'analytics' && (
          <AnalyticsDashboard />
        )}
      </CardContent>
    </Card>
  );
};

export default SupabaseQueryVisualizer;
