import { useState, Suspense } from 'react';
import Layout from '@/components/Layout';
import { DashboardDataProvider } from '@/context/DashboardDataContext';
import { AnalyticsPeriod } from '@/lib/api/analytics';
import { lazy } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
const DashboardHeader = lazy(() => import('@/components/dashboard/DashboardHeader'));
const TrialNotification = lazy(() => import('@/components/subscription/TrialNotification'));
const OptimizedStatsSection = lazy(() => import('@/components/dashboard/optimized/OptimizedStatsSection'));
const QuickAccessSection = lazy(() => import('@/components/dashboard/optimized/QuickAccessSection'));
const OptimizedOrdersSection = lazy(() => import('@/components/dashboard/optimized/OptimizedOrdersSection'));
const OptimizedInventorySection = lazy(() => import('@/components/dashboard/optimized/OptimizedInventorySection'));
const OptimizedAnalyticsSection = lazy(() => import('@/components/dashboard/optimized/OptimizedAnalyticsSection'));

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
    <Layout>
      <div className="container px-2 sm:px-4 lg:px-6 mx-auto max-w-6xl">
        {/* Header القسم */}
        <Suspense fallback={<div className="h-16 bg-muted/30 animate-pulse rounded-lg mb-4"></div>}>
          <DashboardHeader 
            toggleSidebar={() => {}} // لم نعد نحتاج sidebar
            onTimeframeChange={handleTimeframeChange} 
            onCustomDateChange={handleCustomDateChange}
          />
          
          {/* إشعار الفترة التجريبية */}
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
        </div>
      </div>
    </Layout>
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
    <DashboardDataProvider period="month">
      <Suspense fallback={<PageLoader />}>
        <DashboardContent />
      </Suspense>
    </DashboardDataProvider>
  );
};

export default Dashboard; 