import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Calendar, 
  Activity, 
  TrendingUp, 
  BarChart4, 
  ArrowRight,
  AlertCircle,
  Info,
  Grid3X3
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapData {
  hour: number;
  day: number;
  count: number;
}

interface OrderHeatmapCardProps {
  organizationId: string;
}

// تعريف مكون خلية الهيتماب
const HeatmapCell = React.memo(({ 
  hour,
  day, 
  count, 
  maxCount, 
  dayName, 
  hourFormatted 
}: { 
  hour: number;
  day: number;
  count: number;
  maxCount: number;
  dayName: string;
  hourFormatted: string;
}) => {
  // حساب شدة اللون بناءً على عدد الطلبات
  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'bg-muted/30 border border-border/20';
    
    const intensity = count / Math.max(maxCount, 1);
    
    if (intensity >= 0.8) return 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border border-primary/30';
    if (intensity >= 0.6) return 'bg-gradient-to-br from-primary/80 to-primary/60 text-primary-foreground border border-primary/40';
    if (intensity >= 0.4) return 'bg-gradient-to-br from-primary/60 to-primary/40 text-foreground border border-primary/50';
    if (intensity >= 0.2) return 'bg-gradient-to-br from-primary/40 to-primary/20 text-foreground border border-primary/30';
    return 'bg-gradient-to-br from-primary/20 to-primary/10 text-muted-foreground border border-primary/20';
  };

  const intensity = count / Math.max(maxCount, 1);

  return (
    <TooltipProvider>
      <Tooltip delayDuration={100}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "w-full h-9 rounded-lg transition-all duration-300 cursor-pointer group relative overflow-hidden",
              "flex items-center justify-center backdrop-blur-sm",
              "hover:scale-105 hover:shadow-md",
              getHeatmapColor(count)
            )}
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
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="text-center">
            <div className="font-bold mb-1">{dayName} {hourFormatted}</div>
            <div>{count} طلب</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

HeatmapCell.displayName = 'HeatmapCell';

// المكون الرئيسي
const OrderHeatmapCard = ({ organizationId }: OrderHeatmapCardProps) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [maxCount, setMaxCount] = useState(0);

  // أسماء أيام الأسبوع بالعربية (مختصرة)
  const daysOfWeek = ['الأحد', 'الاث', 'الثل', 'الأرب', 'الخم', 'الجم', 'السب'];
  const daysAbbr = ['أحد', 'اث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
  
  // الساعات من 9 صباحاً إلى 3 مساءً
  const hours = [9, 10, 11, 12, 13, 14, 15];

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

  // محتوى حالة التحميل
  const renderLoading = () => (
    <div className="flex items-center justify-center h-48">
      <div className="flex flex-col items-center gap-3">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <p className="text-sm text-muted-foreground">جاري تحميل بيانات الطلبات...</p>
      </div>
    </div>
  );

  // محتوى حالة الخطأ
  const renderError = () => (
    <div className="flex items-center justify-center h-48">
      <div className="text-center space-y-2">
        <AlertCircle className="h-6 w-6 text-red-500 mx-auto" />
        <p className="text-sm text-red-600">{error}</p>
      </div>
    </div>
  );

  // محتوى حالة عدم وجود بيانات
  const renderEmpty = () => (
    <div className={cn(
      "flex flex-col items-center justify-center py-8 text-center space-y-4 rounded-xl",
      "bg-muted/30 border border-border/30"
    )}>
      <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
        <Grid3X3 className="h-6 w-6 text-primary" />
      </div>
      
      <div className="space-y-1 max-w-xs">
        <h3 className="text-base font-bold text-foreground">
          لا توجد بيانات للطلبات حسب الوقت
        </h3>
        <p className="text-sm text-muted-foreground">
          ستظهر البيانات هنا بمجرد وجود طلبات في أوقات مختلفة
        </p>
      </div>
    </div>
  );

  // حساب إجمالي عدد الطلبات
  const totalOrders = heatmapData.reduce((sum, data) => sum + data.count, 0);

  // محتوى الهيتماب
  const renderHeatmap = () => (
    <div className="space-y-4">
      {/* قسم البيانات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className={cn(
          "p-4 rounded-xl transition-all duration-300 group",
          "bg-background/80 border border-border/30 shadow-sm",
          "hover:shadow-md hover:scale-[1.01]"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
              "bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/20 dark:to-blue-800/10 border border-blue-200/50 dark:border-blue-700/30 shadow-sm"
            )}>
              <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              <h4 className="text-2xl font-bold text-foreground">{totalOrders}</h4>
            </div>
          </div>
        </div>
        
        <div className={cn(
          "p-4 rounded-xl transition-all duration-300 group",
          "bg-background/80 border border-border/30 shadow-sm",
          "hover:shadow-md hover:scale-[1.01]"
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              "flex items-center justify-center h-10 w-10 rounded-lg shrink-0",
              "bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/20 dark:to-green-800/10 border border-green-200/50 dark:border-green-700/30 shadow-sm"
            )}>
              <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">أعلى ذروة</p>
              <h4 className="text-2xl font-bold text-foreground">{maxCount}</h4>
            </div>
          </div>
        </div>
      </div>
      
      {/* مفتاح الألوان المحدث */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col">
          <div className="text-sm font-semibold mb-1">كثافة الطلبات</div>
          <div className="flex items-center gap-4 text-xs flex-wrap">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-sm border border-primary/20"></div>
              <span className="text-muted-foreground">قليل</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/40 to-primary/20 rounded-sm border border-primary/30"></div>
              <span className="text-muted-foreground">منخفض</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/60 to-primary/40 rounded-sm border border-primary/40"></div>
              <span className="text-muted-foreground">متوسط</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary/80 to-primary/60 rounded-sm border border-primary/40"></div>
              <span className="text-muted-foreground">عالي</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-gradient-to-br from-primary to-primary/80 rounded-sm border border-primary/30"></div>
              <span className="text-muted-foreground">كثير</span>
            </div>
          </div>
        </div>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="p-2 rounded-full bg-muted/50 hover:bg-muted cursor-pointer">
                <Info className="h-4 w-4 text-muted-foreground" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="left">
              <div className="text-xs max-w-xs">
                يعرض هذا المخطط توزيع الطلبات حسب أيام الأسبوع وساعات اليوم لمساعدتك على فهم أنماط الطلب
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* الهيتماب المحدث - متجاوب مع مختلف أحجام الشاشات */}
      <div className="overflow-x-auto rounded-xl border border-border/30 bg-background/50 p-4">
        <div className="min-w-[500px] space-y-2">
          {/* عناوين أيام الأسبوع */}
          <div className="grid grid-cols-8 gap-2 mb-3">
            <div className="text-xs text-muted-foreground"></div>
            {/* استخدام أسماء مختصرة للشاشات الصغيرة */}
            {daysOfWeek.map((day, index) => (
              <div key={index} className="text-xs text-center font-semibold">
                <div className="p-1 rounded-lg bg-muted/30 border border-border/20">
                  <span className="hidden sm:inline">{day}</span>
                  <span className="inline sm:hidden">{daysAbbr[index]}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* شبكة الهيتماب المحدثة */}
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-2 mb-1">
              {/* عمود الساعة */}
              <div className="text-xs text-muted-foreground font-semibold py-2">
                <div className="p-1 rounded-lg bg-muted/30 border border-border/20 text-center">
                  {formatHour(hour)}
                </div>
              </div>
              
              {/* خلايا أيام الأسبوع المحدثة */}
              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                const cellData = getDataForCell(hour, day);
                const count = cellData?.count || 0;
                
                // تعديل لترتيب الأيام بحيث يكون الأحد آخر يوم (اليوم 7)
                const adjustedDayIndex = day % 7; // لجعل اليوم 7 (الأحد) يصبح 0
                const dayName = daysOfWeek[adjustedDayIndex];
                
                return (
                  <HeatmapCell
                    key={`${hour}-${day}`}
                    hour={hour}
                    day={day}
                    count={count}
                    maxCount={maxCount}
                    dayName={dayName}
                    hourFormatted={formatHour(hour)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      
      {/* زر للانتقال إلى صفحة التحليلات */}
      <div className="pt-2">
        <Button 
          asChild 
          variant="outline" 
          className="w-full bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
        >
          <Link to="/dashboard/analytics" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart4 className="h-4 w-4" />
              <span>عرض تحليلات الطلبات المفصلة</span>
            </div>
            
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-full">
      {isLoading ? (
        renderLoading()
      ) : error ? (
        renderError()
      ) : totalOrders === 0 ? (
        renderEmpty()
      ) : (
        renderHeatmap()
      )}
    </div>
  );
};

export default OrderHeatmapCard;
