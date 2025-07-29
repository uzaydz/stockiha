import React from 'react';
import { Suspense } from 'react';
import { useDashboardStats } from '@/context/DashboardDataContext';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

// مكون التحميل
const StatsLoader = () => (
  <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
    <div className="mb-4">
      <div className="h-6 w-32 bg-muted animate-pulse rounded"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-20 bg-muted animate-pulse rounded-lg"></div>
      ))}
    </div>
  </div>
);

// مكون الخطأ
const StatsError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
    <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
      <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
      </div>
      
      <div className="space-y-2">
        <h3 className="text-base font-semibold text-foreground">
          فشل في تحميل الإحصائيات
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
);

interface OptimizedStatsSectionProps {
  timeframe: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
}

const OptimizedStatsSection: React.FC<OptimizedStatsSectionProps> = ({ timeframe }) => {
  const { stats, isLoading, error, refresh } = useDashboardStats();

  if (isLoading) {
    return <StatsLoader />;
  }

  if (error) {
    return <StatsError error={error} onRetry={refresh} />;
  }

  if (!stats) {
    return (
      <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
        <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
          <div className="p-3 rounded-full bg-muted">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-foreground">
              لا توجد بيانات إحصائية
            </h3>
            <p className="text-sm text-muted-foreground">
              ستظهر الإحصائيات هنا بمجرد وجود بيانات
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-background/80 border border-border/30 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-foreground">ملخص الأداء</h2>
      </div>
      <Suspense fallback={<StatsLoader />}>
        <StatsGrid 
          sales={stats.sales}
          revenue={stats.revenue}
          profits={stats.profits}
          orders={stats.orders}
          timeframe={timeframe}
        />
      </Suspense>
    </div>
  );
};

export default OptimizedStatsSection;
