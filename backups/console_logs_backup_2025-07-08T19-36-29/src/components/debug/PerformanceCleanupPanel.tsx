import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Activity,
  Timer,
  Database,
  Settings,
  TrendingUp,
  TrendingDown,
  Zap
} from 'lucide-react';
import { performanceCleanup, usePerformanceCleanup } from '@/lib/performance-cleanup';
import { cn } from '@/lib/utils';

export function PerformanceCleanupPanel() {
  const { stats, cleanup, partialCleanup } = usePerformanceCleanup();
  const [isOpen, setIsOpen] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);
  const [cleanupHistory, setCleanupHistory] = useState<Array<{
    time: Date;
    type: 'full' | 'partial';
    itemsCleaned: number;
  }>>([]);

  // تحديد مستوى الخطر
  const getRiskLevel = () => {
    const total = stats.intervals + stats.timeouts + stats.eventListeners + stats.caches;
    if (total > 100) return 'high';
    if (total > 50) return 'medium';
    return 'low';
  };

  const riskLevel = getRiskLevel();

  // ألوان حسب مستوى الخطر
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-green-600';
    }
  };

  const getRiskBgColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-50 border-red-200';
      case 'medium': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  // تنفيذ التنظيف الكامل
  const handleFullCleanup = () => {
    const totalItems = stats.intervals + stats.timeouts + stats.eventListeners + stats.caches;
    cleanup();
    setLastCleanup(new Date());
    setCleanupHistory(prev => [...prev, {
      time: new Date(),
      type: 'full' as const,
      itemsCleaned: totalItems
    }].slice(-10)); // الاحتفاظ بآخر 10 عمليات
  };

  // تنفيذ التنظيف الجزئي
  const handlePartialCleanup = () => {
    const totalItems = Math.floor((stats.intervals + stats.timeouts) * 0.3); // تقدير
    partialCleanup();
    setLastCleanup(new Date());
    setCleanupHistory(prev => [...prev, {
      time: new Date(),
      type: 'partial' as const,
      itemsCleaned: totalItems
    }].slice(-10));
  };

  // حساب النسبة المئوية للاستخدام
  const getUsagePercentage = () => {
    const total = stats.intervals + stats.timeouts + stats.eventListeners + stats.caches;
    return Math.min((total / 200) * 100, 100); // افتراض 200 كحد أقصى آمن
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      {/* زر التبديل */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        className={cn(
          "mb-2 gap-2",
          riskLevel === 'high' ? "animate-pulse" : ""
        )}
        variant={riskLevel === 'high' ? "destructive" : riskLevel === 'medium' ? "secondary" : "outline"}
      >
        {riskLevel === 'high' ? (
          <AlertTriangle className="w-4 h-4" />
        ) : (
          <Activity className="w-4 h-4" />
        )}
        تنظيف الأداء
        <Badge variant="secondary" className={getRiskColor(riskLevel)}>
          {stats.intervals + stats.timeouts + stats.eventListeners + stats.caches}
        </Badge>
      </Button>

      {/* Panel الرئيسي */}
      {isOpen && (
        <Card className={cn("w-[600px] h-[500px] shadow-2xl", getRiskBgColor(riskLevel))}>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  لوحة تنظيف الأداء
                  <Badge variant={riskLevel === 'high' ? 'destructive' : 'secondary'}>
                    {riskLevel === 'high' ? 'خطر عالي' : riskLevel === 'medium' ? 'خطر متوسط' : 'آمن'}
                  </Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  آخر تنظيف: {lastCleanup ? lastCleanup.toLocaleTimeString('ar-SA') : 'لم يتم بعد'}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handlePartialCleanup} variant="outline">
                  <RotateCcw className="w-4 h-4 ml-2" />
                  تنظيف جزئي
                </Button>
                <Button size="sm" onClick={handleFullCleanup} variant="destructive">
                  <Trash2 className="w-4 h-4 ml-2" />
                  تنظيف كامل
                </Button>
              </div>
            </div>

            {/* مؤشر الاستخدام */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span>مستوى الاستخدام</span>
                <span>{getUsagePercentage().toFixed(1)}%</span>
              </div>
              <Progress 
                value={getUsagePercentage()} 
                className={cn(
                  "h-2",
                  riskLevel === 'high' ? "bg-red-100" : 
                  riskLevel === 'medium' ? "bg-yellow-100" : "bg-green-100"
                )}
              />
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="stats" className="h-[320px]">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stats">الإحصائيات</TabsTrigger>
                <TabsTrigger value="history">سجل التنظيف</TabsTrigger>
                <TabsTrigger value="settings">الإعدادات</TabsTrigger>
              </TabsList>

              {/* تبويب الإحصائيات */}
              <TabsContent value="stats" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Intervals</p>
                        <p className="text-2xl font-bold">{stats.intervals}</p>
                      </div>
                      <Timer className="w-8 h-8 text-blue-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Timeouts</p>
                        <p className="text-2xl font-bold">{stats.timeouts}</p>
                      </div>
                      <Timer className="w-8 h-8 text-orange-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Event Listeners</p>
                        <p className="text-2xl font-bold">{stats.eventListeners}</p>
                      </div>
                      <Activity className="w-8 h-8 text-purple-500" />
                    </div>
                  </Card>

                  <Card className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Caches</p>
                        <p className="text-2xl font-bold">{stats.caches}</p>
                      </div>
                      <Database className="w-8 h-8 text-green-500" />
                    </div>
                  </Card>
                </div>

                {/* معلومات إضافية */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>مهام التنظيف المسجلة:</span>
                    <span className="font-medium">{stats.cleanupTasks}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Observers نشط:</span>
                    <span className="font-medium">{stats.observers}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>حالة التنظيف:</span>
                    <Badge variant={stats.isCleaningUp ? "destructive" : "default"}>
                      {stats.isCleaningUp ? "جاري التنظيف..." : "جاهز"}
                    </Badge>
                  </div>
                </div>
              </TabsContent>

              {/* تبويب سجل التنظيف */}
              <TabsContent value="history">
                <ScrollArea className="h-[250px]">
                  <div className="space-y-2">
                    {cleanupHistory.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        لا يوجد سجل تنظيف بعد
                      </p>
                    ) : (
                      cleanupHistory.slice().reverse().map((entry, index) => (
                        <Card key={index} className="p-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              {entry.type === 'full' ? (
                                <Trash2 className="w-4 h-4 text-red-500" />
                              ) : (
                                <RotateCcw className="w-4 h-4 text-blue-500" />
                              )}
                              <div>
                                <p className="text-sm font-medium">
                                  {entry.type === 'full' ? 'تنظيف كامل' : 'تنظيف جزئي'}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {entry.time.toLocaleString('ar-SA')}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline">
                              {entry.itemsCleaned} عنصر
                            </Badge>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              {/* تبويب الإعدادات */}
              <TabsContent value="settings" className="space-y-4">
                <Card className="p-4">
                  <h3 className="font-medium mb-3">إعدادات التنظيف التلقائي</h3>
                  <div className="space-y-3">
                    <Button
                      onClick={() => performanceCleanup.startPeriodicCleanup(5 * 60 * 1000)}
                      variant="outline"
                      className="w-full justify-start"
                    >
                      <CheckCircle className="w-4 h-4 ml-2" />
                      تفعيل التنظيف التلقائي (كل 5 دقائق)
                    </Button>
                    
                    <div className="text-xs text-muted-foreground space-y-1">
                      <p>• سيتم تنظيف العناصر منتهية الصلاحية تلقائياً</p>
                      <p>• يمكن تشغيل التنظيف الكامل يدوياً عند الحاجة</p>
                      <p>• استخدم الـ console للوصول لدوال إضافية:</p>
                      <code className="bg-muted px-1 rounded">window.triggerCleanup()</code>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h3 className="font-medium mb-3">أدوات التشخيص</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => console.log(window.getCleanupStats())}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      طباعة إحصائيات مفصلة في Console
                    </Button>
                    <Button
                      onClick={() => window.triggerCleanup()}
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                    >
                      تنظيف فوري عبر Console Command
                    </Button>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default PerformanceCleanupPanel;
