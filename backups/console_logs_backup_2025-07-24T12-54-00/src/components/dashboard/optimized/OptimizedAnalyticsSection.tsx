import React, { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useSuperUnifiedData } from '../../../context/SuperUnifiedDataContext';
import { useTenant } from '../../../context/TenantContext';
import OrderHeatmapCard from '../OrderHeatmapCard';
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
  const { provincesGlobal, isLoading, error } = useSuperUnifiedData();

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
      
      {(provincesGlobal || []).length === 0 ? (
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
          {provincesGlobal.map((province, index) => (
            <div key={province.province_id} className="p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">#{index + 1} {province.province_name}</p>
                  <p className="text-xs text-muted-foreground">{province.order_count} طلب</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm">{(province.total_revenue || 0).toFixed(0)} دج</p>
                  <p className="text-xs text-muted-foreground">متوسط: {(province.avg_order_value || 0).toFixed(0)} دج</p>
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
  const { organization } = useTenant();
  
  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-500" />
          خريطة الطلبات حسب الوقت
        </h2>
        <Link to="/dashboard/analytics" className="text-xs text-primary hover:underline">
          التفاصيل
        </Link>
      </div>
      
      <OrderHeatmapCard organizationId={organization?.id || ''} />
    </div>
  );
};

const OptimizedAnalyticsSection: React.FC = () => {
  const { provincesGlobal, isLoading, error } = useSuperUnifiedData();

  if (isLoading) {
    return <AnalyticsLoader />;
  }

  if (error) {
    return <AnalyticsError error={error} onRetry={() => window.location.reload()} />;
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
