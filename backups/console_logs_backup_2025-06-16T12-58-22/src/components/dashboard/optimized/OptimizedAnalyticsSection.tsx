import React from 'react';
import { Link } from 'react-router-dom';
import { useDashboardProvinceData, useDashboardHeatmap } from '@/context/DashboardDataContext';
import { MapPin, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// مكون التحميل للتحليلات
const AnalyticsLoader = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// مكون الخطأ للتحليلات
const AnalyticsError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
        <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
          <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-base font-semibold text-foreground">
            فشل في تحميل التحليلات
          </h3>
          <p className="text-sm text-muted-foreground">
            {error}
          </p>
        </div>
        
        <Button
          onClick={onRetry}
          variant="outline"
          className="bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800"
        >
          إعادة المحاولة
        </Button>
      </div>
    </div>
  </div>
);

// مكون بيانات الولايات المحسن
const OptimizedProvinceCard = () => {
  const { provinceData, isLoading, error } = useDashboardProvinceData();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              فشل في تحميل بيانات الولايات
            </h3>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <MapPin className="h-4 w-4 text-teal-500" />
          الطلبات حسب الولايات
        </h2>
        <Link to="/dashboard/analytics" className="text-xs text-primary hover:underline">
          تفاصيل أكثر
        </Link>
      </div>
      
      {provinceData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-muted">
            <MapPin className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              لا توجد بيانات ولايات
            </h3>
            <p className="text-sm text-muted-foreground">
              ستظهر بيانات الولايات هنا
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {provinceData.map((province, index) => (
            <div key={province.province_id} className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">#{index + 1} {province.province_name}</p>
                  <p className="text-xs text-muted-foreground">{province.order_count} طلب</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{province.total_revenue.toFixed(0)} دج</p>
                  <p className="text-xs text-muted-foreground">متوسط: {province.avg_order_value.toFixed(0)} دج</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// مكون خريطة الطلبات المحسن
const OptimizedHeatmapCard = () => {
  const { orderHeatmapData, isLoading, error } = useDashboardHeatmap();

  if (isLoading) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
          <div className="h-4 w-16 bg-muted animate-pulse rounded"></div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
            <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              فشل في تحميل خريطة الطلبات
            </h3>
            <p className="text-sm text-muted-foreground">
              {error}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // العثور على أكثر الساعات نشاطاً
  const topHours = orderHeatmapData
    .filter(item => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-500" />
          توزيع الطلبات حسب الوقت
        </h2>
        <Link to="/dashboard/analytics" className="text-xs text-primary hover:underline">
          تفاصيل أكثر
        </Link>
      </div>
      
      {topHours.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-muted">
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              لا توجد بيانات زمنية
            </h3>
            <p className="text-sm text-muted-foreground">
              ستظهر التوزيعات الزمنية هنا
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {topHours.map((hourData, index) => (
            <div key={hourData.hour} className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">الساعة {hourData.hour}:00</p>
                  <p className="text-xs text-muted-foreground">#{index + 1} الأكثر نشاطاً</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{hourData.count} طلب</p>
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ 
                        width: `${(hourData.count / Math.max(...topHours.map(h => h.count))) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const OptimizedAnalyticsSection: React.FC = () => {
  const { isLoading: isProvinceLoading, error: provinceError } = useDashboardProvinceData();
  const { isLoading: isHeatmapLoading, error: heatmapError } = useDashboardHeatmap();

  const isLoading = isProvinceLoading || isHeatmapLoading;
  const hasError = provinceError || heatmapError;

  if (isLoading) {
    return <AnalyticsLoader />;
  }

  if (hasError) {
    return <AnalyticsError error={hasError} onRetry={() => window.location.reload()} />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* مكون أفضل الولايات */}
      <OptimizedProvinceCard />
      
      {/* مكون خريطة الطلبات حسب الوقت */}
      <OptimizedHeatmapCard />
    </div>
  );
};

export default OptimizedAnalyticsSection; 