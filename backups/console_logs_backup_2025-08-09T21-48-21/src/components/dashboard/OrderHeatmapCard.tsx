import React, { useMemo } from 'react';
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
import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface HeatmapData {
  hour: number;
  day: number;
  count: number;
}

// أسماء الأيام بالعربية
const DAYS = ['الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت', 'الأحد'];
const DAYS_SHORT = ['اث', 'ثل', 'أر', 'خم', 'جم', 'سب', 'أح'];

// أسماء الساعات (من 9 صباحاً إلى 9 مساءً)
const HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

// تعريف مكون خلية الهيتماب
const HeatmapCell = ({ hour, day, count, maxCount, tooltip }: {
  hour: number;
  day: number;
  count: number;
  maxCount: number;
  tooltip: string;
}) => {
  // حساب شدة اللون بناءً على عدد الطلبات
  const intensity = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  
  // تعريف ألوان التدرج
  const getBackgroundColor = () => {
    if (count === 0) return 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700';
    if (intensity <= 20) return 'bg-blue-100 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800';
    if (intensity <= 40) return 'bg-blue-200 border-blue-300 dark:bg-blue-900/50 dark:border-blue-700';
    if (intensity <= 60) return 'bg-blue-300 border-blue-400 dark:bg-blue-900/70 dark:border-blue-600';
    if (intensity <= 80) return 'bg-blue-400 border-blue-500 dark:bg-blue-800 dark:border-blue-500 text-white';
    return 'bg-blue-500 border-blue-600 dark:bg-blue-700 dark:border-blue-400 text-white';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'w-8 h-6 rounded-sm border cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-sm flex items-center justify-center',
              getBackgroundColor()
            )}
          >
            {count > 0 && (
              <span className="text-xs font-medium">
                {count}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

const OrderHeatmapCard: React.FC = () => {
  const { recentOnlineOrders, isLoading, error } = useSuperUnifiedData();

  // معالجة البيانات وتجميعها حسب الساعة ويوم الأسبوع
  const { heatmapData, maxCount, totalOrders } = useMemo(() => {
    // تحويل البيانات إلى مصفوفة إذا كانت object
    let ordersArray = recentOnlineOrders;
    
    if (!recentOnlineOrders) {
      return { heatmapData: [], maxCount: 0, totalOrders: 0 };
    }
    
    // إذا كانت البيانات object، محاولة استخراج المصفوفة
    if (typeof recentOnlineOrders === 'object' && !Array.isArray(recentOnlineOrders)) {
      // محاولة تحويل Object.values إذا كان الكائن يحتوي على خصائص رقمية
      const values = Object.values(recentOnlineOrders);
      if (values.length > 0 && typeof values[0] === 'object') {
        ordersArray = values;
      } else {
        return { heatmapData: [], maxCount: 0, totalOrders: 0 };
      }
    }

    if (!Array.isArray(ordersArray)) {
      return { heatmapData: [], maxCount: 0, totalOrders: 0 };
    }

    const heatmapMap = new Map<string, number>();
    let maxOrderCount = 0;
    let totalOrdersCount = 0;

    ordersArray.forEach(order => {
      if (!order.created_at) return;
      
      const date = new Date(order.created_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay(); // 0 = الأحد، 1 = الاثنين، إلخ
      
      // تحويل إلى نظام 1 = الاثنين، 7 = الأحد
      const adjustedDay = dayOfWeek === 0 ? 7 : dayOfWeek;
      
      // تصفية الساعات للعمل (9 صباحاً - 9 مساءً)
      if (hour >= 9 && hour <= 21) {
        const key = `${hour}-${adjustedDay}`;
        const existing = heatmapMap.get(key) || 0;
        const newCount = existing + 1;
        heatmapMap.set(key, newCount);
        
        if (newCount > maxOrderCount) {
          maxOrderCount = newCount;
        }
        totalOrdersCount++;
      }
    });

    // تحويل البيانات إلى مصفوفة مع إنشاء جميع التركيبات
    const processedData: HeatmapData[] = [];
    HOURS.forEach(hour => {
      for (let day = 1; day <= 7; day++) {
        const key = `${hour}-${day}`;
        const count = heatmapMap.get(key) || 0;
        processedData.push({ hour, day, count });
      }
    });

    return { 
      heatmapData: processedData, 
      maxCount: maxOrderCount, 
      totalOrders: totalOrdersCount 
    };
  }, [recentOnlineOrders]);

  // دالة للحصول على البيانات لخلية معينة
  const getDataForCell = (hour: number, day: number): HeatmapData | undefined => {
    return heatmapData.find(data => data.hour === hour && data.day === day);
  };

  // حالة التحميل
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="h-6 w-48 bg-muted animate-pulse rounded"></div>
            <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 91 }).map((_, i) => (
                <div key={i} className="h-6 bg-muted animate-pulse rounded-sm"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // حالة الخطأ
  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            خريطة الطلبات حسب الوقت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                فشل في تحميل البيانات
              </h3>
              <p className="text-sm text-muted-foreground">
                {error}
              </p>
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.location.reload()}
            >
              إعادة المحاولة
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // حالة عدم وجود بيانات
  if (!heatmapData.length || totalOrders === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              خريطة الطلبات حسب الوقت
            </CardTitle>
            <Link to="/dashboard/orders">
              <Button variant="ghost" size="sm" className="text-xs">
                التفاصيل <ArrowRight className="h-3 w-3 mr-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <div className="p-3 rounded-full bg-muted">
              <Grid3X3 className="h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base font-semibold text-foreground">
                بيانات الخريطة غير متوفرة
              </h3>
              <p className="text-sm text-muted-foreground">
                ستظهر خريطة الطلبات هنا بمجرد وجود بيانات
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            خريطة الطلبات حسب الوقت
          </CardTitle>
          <Link to="/dashboard/orders">
            <Button variant="ghost" size="sm" className="text-xs">
              التفاصيل <ArrowRight className="h-3 w-3 mr-1" />
            </Button>
          </Link>
        </div>
        
        {/* معلومات إضافية */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            <span>المجموع: {totalOrders} طلب</span>
          </div>
          <div className="flex items-center gap-1">
            <BarChart4 className="h-4 w-4" />
            <span>الذروة: {maxCount} طلب/ساعة</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* الخريطة الحرارية */}
        <div className="space-y-2">
          {/* رؤوس الأعمدة - الأيام */}
          <div className="grid grid-cols-8 gap-1 text-xs text-center">
            <div></div> {/* مساحة فارغة للساعات */}
            {DAYS_SHORT.map((day, index) => (
              <div key={index} className="text-muted-foreground font-medium">
                {day}
              </div>
            ))}
          </div>
          
          {/* الصفوف - الساعات مع البيانات */}
          {HOURS.map(hour => (
            <div key={hour} className="grid grid-cols-8 gap-1 items-center">
              {/* عمود الساعة */}
              <div className="text-xs text-muted-foreground font-medium text-right pr-1">
                {formatHour(hour)}
              </div>
              
              {/* خلايا البيانات لكل يوم */}
              {[1, 2, 3, 4, 5, 6, 7].map(day => {
                const cellData = getDataForCell(hour, day);
                const count = cellData?.count || 0;
                const dayName = DAYS[day - 1];
                const tooltip = `${dayName} في ${formatHour(hour)}: ${count} طلب`;
                
                return (
                  <HeatmapCell
                    key={`${hour}-${day}`}
                    hour={hour}
                    day={day}
                    count={count}
                    maxCount={maxCount}
                    tooltip={tooltip}
                  />
                );
              })}
            </div>
          ))}
        </div>
        
        {/* مفتاح الألوان */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="h-3 w-3" />
            <span>أوقات العمل: 9 ص - 3 م</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">أقل</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 bg-gray-100 border border-gray-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-200 border border-blue-300 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-300 border border-blue-400 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-400 border border-blue-500 rounded-sm"></div>
              <div className="w-3 h-3 bg-blue-500 border border-blue-600 rounded-sm"></div>
            </div>
            <span className="text-xs text-muted-foreground">أكثر</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderHeatmapCard;
