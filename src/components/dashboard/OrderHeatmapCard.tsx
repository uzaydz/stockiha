import { useEffect, useState } from 'react';
import { Clock, Calendar, Activity, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HeatmapData {
  hour: number;
  day: number;
  count: number;
}

interface OrderHeatmapCardProps {
  organizationId: string;
}

const OrderHeatmapCard = ({ organizationId }: OrderHeatmapCardProps) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);

  // أسماء أيام الأسبوع بالعربية (مختصرة كما في الصورة)
  const daysOfWeek = ['الاث', 'الثل', 'الأرب', 'الخم', 'الجم', 'السب', 'الأحد'];
  
  // الساعات من 9 صباحاً إلى 3 مساءً (كما في الصورة)
  const hours = [9, 10, 11, 12, 13, 14, 15];

  useEffect(() => {
    const fetchHeatmapData = async () => {
      if (!organizationId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // جلب بيانات الطلبات مع وقت الإنشاء
        const { data: ordersData, error: ordersError } = await supabase
          .from('online_orders_view')
          .select('created_at')
          .eq('organization_id', organizationId)
          .not('created_at', 'is', null);
        
        if (ordersError) throw ordersError;
        
        // معالجة البيانات وتجميعها حسب الساعة ويوم الأسبوع
        const heatmapMap = new Map<string, number>();
        let maxOrderCount = 0;
        
        ordersData?.forEach(order => {
          if (!order.created_at) return;
          
          const date = new Date(order.created_at);
          const hour = date.getHours();
          const dayOfWeek = date.getDay(); // 0 = الأحد، 1 = الاثنين، إلخ
          
          // تحويل إلى نظام 1 = الاثنين، 7 = الأحد
          const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
          
          // تصفية الساعات للعمل فقط (9 صباحاً - 3 مساءً)
          if (hour >= 9 && hour <= 15) {
            const key = `${hour}-${adjustedDay}`;
            const existing = heatmapMap.get(key) || 0;
            const newCount = existing + 1;
            heatmapMap.set(key, newCount);
            
            if (newCount > maxOrderCount) {
              maxOrderCount = newCount;
            }
          }
        });
        
        // تحويل البيانات إلى مصفوفة
        const processedData: HeatmapData[] = [];
        
        // إنشاء جميع التركيبات الممكنة من الساعات والأيام
        hours.forEach(hour => {
          for (let day = 1; day <= 7; day++) {
            const key = `${hour}-${day}`;
            const count = heatmapMap.get(key) || 0;
            
            processedData.push({
              hour,
              day,
              count
            });
          }
        });
        
        setHeatmapData(processedData);
        setMaxCount(maxOrderCount);
      } catch (err) {
        setError('حدث خطأ أثناء جلب بيانات الطلبات');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchHeatmapData();
  }, [organizationId]);

  // حساب شدة اللون بناءً على عدد الطلبات (متناسق مع الثيم)
  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30 border border-border/20';
    
    // استخدام مستويات ديناميكية بناءً على البيانات الفعلية
    const intensity = count / Math.max(maxCount, 1);
    
    if (intensity >= 0.8) return 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border border-primary/30'; // كثافة عالية جداً
    if (intensity >= 0.6) return 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground border border-primary/40'; // كثافة عالية
    if (intensity >= 0.4) return 'bg-gradient-to-br from-primary/60 to-primary/40 text-foreground border border-primary/50'; // كثافة متوسطة
    if (intensity >= 0.2) return 'bg-gradient-to-br from-primary/40 to-primary/20 text-foreground border border-primary/30'; // كثافة منخفضة
    return 'bg-gradient-to-br from-primary/20 to-primary/10 text-muted-foreground border border-primary/20'; // كثافة منخفضة جداً
  };

  // تنسيق الساعة للعرض
  const formatHour = (hour: number): string => {
    if (hour < 12) {
      return `${hour} ص`;
    } else if (hour === 12) {
      return '12 م';
    } else {
      return `${hour - 12} م`;
    }
  };

  // الحصول على البيانات لساعة ويوم محددين
  const getDataForCell = (hour: number, day: number): HeatmapData | undefined => {
    return heatmapData.find(data => data.hour === hour && data.day === day);
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300",
      "bg-gradient-to-br from-background/95 to-background/90 backdrop-blur-md",
      "border border-border/20 shadow-lg hover:shadow-xl",
      "before:absolute before:inset-0 before:bg-gradient-to-br before:from-primary/5 before:to-transparent before:pointer-events-none"
    )}>
      <CardHeader className="pb-4 relative z-10">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            "text-lg font-bold flex items-center gap-2",
            "bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent"
          )}>
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20">
              <Activity className="h-5 w-5 text-primary" />
            </div>
            الطلبات حسب الوقت
          </CardTitle>
          
          {/* مفتاح الألوان المحدث */}
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-sm border border-primary/20"></div>
              <span className="text-muted-foreground font-medium">قليل</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/60 to-primary/40 rounded-sm border border-primary/40"></div>
              <span className="text-muted-foreground font-medium">متوسط</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-sm border border-primary/30"></div>
              <span className="text-muted-foreground font-medium">كثير</span>
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="relative z-10">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="flex flex-col items-center gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              <span className="text-sm text-muted-foreground">جاري تحميل البيانات...</span>
            </div>
          </div>
        ) : error ? (
          <div className={cn(
            "text-center p-6 rounded-xl",
            "bg-gradient-to-br from-destructive/10 to-destructive/5",
            "border border-destructive/20"
          )}>
            <span className="text-destructive font-medium">{error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* الهيتماب المحدث */}
            <div className="overflow-x-auto">
              <div className="min-w-[480px] space-y-2">
                {/* عناوين أيام الأسبوع */}
                <div className="grid grid-cols-8 gap-2 mb-3">
                  <div className="text-xs text-muted-foreground w-14"></div>
                  {daysOfWeek.map((day, index) => (
                    <div key={index} className="text-xs text-muted-foreground text-center font-semibold w-14">
                      <div className="p-1 rounded-lg bg-muted/30 border border-border/20">
                        {day}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* شبكة الهيتماب المحدثة */}
                {hours.map(hour => (
                  <div key={hour} className="grid grid-cols-8 gap-2 mb-1">
                    {/* عمود الساعة */}
                    <div className="text-xs text-muted-foreground font-semibold py-2 w-14">
                      <div className="p-1 rounded-lg bg-muted/30 border border-border/20 text-center">
                        {formatHour(hour)}
                      </div>
                    </div>
                    
                    {/* خلايا أيام الأسبوع المحدثة */}
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const cellData = getDataForCell(hour, day);
                      const count = cellData?.count || 0;
                      const intensity = count / Math.max(maxCount, 1);
                      
                      return (
                        <div
                          key={`${hour}-${day}`}
                          className={cn(
                            "w-14 h-9 rounded-lg transition-all duration-300 cursor-pointer group relative overflow-hidden",
                            "flex items-center justify-center backdrop-blur-sm",
                            "hover:scale-105 hover:shadow-md",
                            getHeatmapColor(count)
                          )}
                          title={`${daysOfWeek[day - 1]} ${formatHour(hour)}: ${count} طلب`}
                        >
                          {/* تأثير التحويم */}
                          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg" />
                          
                          {count > 0 && count >= (maxCount * 0.3) && (
                            <span className={cn(
                              "text-xs font-bold relative z-10 transition-transform duration-300 group-hover:scale-110",
                              intensity >= 0.6 ? "text-primary-foreground" : "text-foreground"
                            )}>
                              {count > 99 ? '99+' : count}
                            </span>
                          )}
                          
                          {/* نقاط للقيم المنخفضة */}
                          {count > 0 && count < (maxCount * 0.3) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-60 relative z-10" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            
            {/* إحصائيات محدثة */}
            <div className={cn(
              "flex justify-between items-center pt-4 border-t border-border/30",
              "bg-gradient-to-r from-muted/30 to-muted/20 rounded-xl p-3"
            )}>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30">
                  <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">إجمالي الطلبات</span>
                  <p className="text-lg font-bold text-primary">
                    {heatmapData.reduce((sum, data) => sum + data.count, 0)}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm font-semibold text-foreground">أعلى ذروة</span>
                  <p className="text-lg font-bold text-primary">{maxCount}</p>
                </div>
                <div className="p-2 rounded-lg bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30">
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* تأثير الإضاءة الخلفية */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg" />
    </Card>
  );
};

export default OrderHeatmapCard;
