import { useState, Suspense, lazy, ComponentType, type FC } from 'react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
// import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext'; // غير مستخدم حالياً
import { AnalyticsPeriod } from '@/lib/api/analytics';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { isAppOnline } from '@/utils/networkStatus';

// تحديد نوع الفترة الزمنية المطلوب
type TimeframeType = 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';

// تحويل نوع الفترة الزمنية
const timeframeToAnalyticsPeriod = (timeframe: TimeframeType): AnalyticsPeriod => {
  switch (timeframe) {
    case 'daily': return 'day';
    case 'weekly': return 'week';
    case 'monthly': return 'month';
    case 'annual': return 'year';
    case 'custom': return 'custom';
    default: return 'month';
  }
};

// تحميل مكونات محسنة بصورة lazy
// const DashboardHeader = lazy(() => import('@/components/dashboard/DashboardHeader'));
import DashboardHeader from '@/components/dashboard/DashboardHeader';
const lazyWithOfflineFallback = <T extends ComponentType<any>>(
  importer: () => Promise<{ default: T }>,
  fallbackComponent: T
) => lazy(async () => {
  if (!isAppOnline()) {
    return { default: fallbackComponent };
  }

  try {
    return await importer();
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();
    if (
      !isAppOnline() ||
      message.includes('failed to fetch') ||
      message.includes('dynamically imported module')
    ) {
      return { default: fallbackComponent };
    }
    throw error;
  }
});

const OfflineSectionMessage: FC<{ title: string; height?: string }> = ({ title, height = 'h-48' }) => (
  <div className={`flex items-center justify-center rounded-lg border border-dashed border-muted ${height}`}>
    <div className="text-center space-y-1 px-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">المحتوى غير متاح بدون اتصال بالإنترنت</p>
    </div>
  </div>
);

const TrialNotificationFallback: FC = () => null;
const OptimizedStatsFallback: FC<{ timeframe: TimeframeType }> = () => (
  <OfflineSectionMessage title="الإحصائيات الرئيسية" height="h-40" />
);
const QuickAccessFallback: FC<{ maxItems?: number }> = () => (
  <OfflineSectionMessage title="الروابط السريعة" height="h-20" />
);
const OrdersSectionFallback: FC = () => (
  <OfflineSectionMessage title="ملخص الطلبات" height="h-64" />
);
const InventorySectionFallback: FC = () => (
  <OfflineSectionMessage title="تنبيهات المخزون" height="h-48" />
);
const AnalyticsSectionFallback: FC = () => (
  <OfflineSectionMessage title="تحليلات متقدمة" height="h-64" />
);
const MapSectionFallback: FC = () => (
  <OfflineSectionMessage title="خريطة توزيع الطلبات" height="h-96" />
);
const POSSalesSectionFallback: FC = () => (
  <OfflineSectionMessage title="أداء مبيعات نقطة البيع" height="h-64" />
);

const TrialNotification = lazyWithOfflineFallback(
  () => import('@/components/subscription/TrialNotification'),
  TrialNotificationFallback
);
const OptimizedStatsSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedStatsSection'),
  OptimizedStatsFallback
);
const QuickAccessSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/QuickAccessSection'),
  QuickAccessFallback
);
const OptimizedOrdersSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedOrdersSection'),
  OrdersSectionFallback
);
const OptimizedInventorySection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedInventorySection'),
  InventorySectionFallback
);
const OptimizedAnalyticsSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedAnalyticsSection'),
  AnalyticsSectionFallback
);
const OptimizedMapSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedMapSection'),
  MapSectionFallback
);
const OptimizedPOSSalesSection = lazyWithOfflineFallback(
  () => import('@/components/dashboard/optimized/OptimizedPOSSalesSection'),
  POSSalesSectionFallback
);

// مكون التحميل الأساسي
const SectionLoader = ({ height = "h-48" }: { height?: string }) => (
  <div className={`flex items-center justify-center ${height}`}>
    <div className="flex flex-col items-center gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  </div>
);

// مكون التحميل الكامل للصفحة
const PageLoader = () => (
  <div className="container px-2 sm:px-4 lg:px-6 mx-auto max-w-6xl">
    <div className="space-y-8">
      {/* تحميل الهيدر */}
      <div className="h-16 bg-muted/30 animate-pulse rounded-lg"></div>
      
      {/* تحميل الإحصائيات */}
      <div className="h-40 bg-muted/30 animate-pulse rounded-lg"></div>
      
      {/* تحميل الروابط السريعة */}
      <div className="grid grid-cols-5 sm:grid-cols-5 lg:grid-cols-10 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 bg-muted/30 animate-pulse rounded-lg"></div>
        ))}
      </div>
      
      {/* تحميل الأقسام الأخرى */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="h-64 bg-muted/30 animate-pulse rounded-lg"></div>
        <div className="h-64 bg-muted/30 animate-pulse rounded-lg"></div>
      </div>
    </div>
  </div>
);

// مكون الخطأ العام
const ErrorBoundary = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <div className="container px-2 sm:px-4 lg:px-6 mx-auto max-w-6xl">
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
      <div className="p-4 rounded-full bg-red-100 dark:bg-red-900/20">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-foreground">
          حدث خطأ في لوحة التحكم
        </h2>
        <p className="text-muted-foreground max-w-md">
          {error || 'حدث خطأ غير متوقع أثناء تحميل لوحة التحكم'}
        </p>
        </div>
      
      <div className="flex gap-3">
        <Button
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
        
        <Button
          variant="outline"
          onClick={() => window.location.href = '/dashboard/orders'}
        >
          الذهاب للطلبات
        </Button>
      </div>
      </div>
    </div>
  );

// مكون لوحة التحكم الداخلي
const DashboardContent = () => {
  const [timeframe, setTimeframe] = useState<TimeframeType>('monthly');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date }>({
    start: new Date(new Date().setDate(new Date().getDate() - 30)),
    end: new Date(),
  });

  // معالجة تغيير الفترة الزمنية
  const handleTimeframeChange = (newTimeframe: TimeframeType) => {
    setTimeframe(newTimeframe);
  };

  // معالجة تغيير الفترة المخصصة
  const handleCustomDateChange = (startDate: Date, endDate: Date) => {
    setCustomDateRange({ start: startDate, end: endDate });
  };

  // دالة تحديث الصفحة
  const refreshDashboard = () => {
    window.location.reload();
  };

  return (
    <POSPureLayout
      onRefresh={() => window.location.reload()}
      isRefreshing={false}
      connectionStatus="connected"
    >
      <div className="container px-2 sm:px-4 lg:px-6 mx-auto max-w-6xl">
        {/* Header القسم */}
        <DashboardHeader 
          toggleSidebar={() => {}} // لم نعد نحتاج sidebar
          onTimeframeChange={handleTimeframeChange} 
          onCustomDateChange={handleCustomDateChange}
        />
        
        {/* إشعار الفترة التجريبية */}
        <Suspense fallback={<div className="h-16 bg-muted/30 animate-pulse rounded-lg mb-4"></div>}>
          <TrialNotification />
        </Suspense>
        
            <div className="space-y-8">
          {/* قسم الإحصائيات الرئيسية */}
          <Suspense fallback={<SectionLoader height="h-40" />}>
            <OptimizedStatsSection timeframe={timeframe} />
          </Suspense>

          {/* قسم الروابط السريعة */}
          <Suspense fallback={<SectionLoader height="h-20" />}>
            <QuickAccessSection maxItems={10} />
          </Suspense>
                
          {/* قسم الطلبات (عادية وأونلاين) */}
          <Suspense fallback={<SectionLoader height="h-64" />}>
            <OptimizedOrdersSection />
          </Suspense>
              
          {/* قسم المخزون منخفض المستوى */}
          <Suspense fallback={<SectionLoader height="h-48" />}>
            <OptimizedInventorySection />
          </Suspense>
                
          {/* قسم التحليلات (الولايات وخريطة الوقت) */}
          <Suspense fallback={<SectionLoader height="h-64" />}>
            <OptimizedAnalyticsSection />
          </Suspense>

          {/* قسم أداء المبيعات والخريطة جنباً إلى جنب */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* قسم أداء مبيعات نقطة البيع */}
            <Suspense fallback={<SectionLoader height="h-64" />}>
              <OptimizedPOSSalesSection />
            </Suspense>

            {/* قسم خريطة توزيع الطلبات الأونلاين */}
            <Suspense fallback={<SectionLoader height="h-96" />}>
              <OptimizedMapSection />
            </Suspense>
          </div>
              </div>
      </div>
    </POSPureLayout>
  );
};

// مكون لوحة التحكم الرئيسي مع Provider
const Dashboard = () => {
  const [error, setError] = useState<string | null>(null);

  // معالجة الأخطاء
  const handleError = (errorMessage: string) => {
    setError(errorMessage);
  };

  // إعادة المحاولة
  const handleRetry = () => {
    setError(null);
    window.location.reload();
  };

  // في حالة وجود خطأ عام
  if (error) {
    return <ErrorBoundary error={error} onRetry={handleRetry} />;
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <DashboardContent />
    </Suspense>
  );
};

export default Dashboard;
