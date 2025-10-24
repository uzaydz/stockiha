import React, { Suspense } from 'react';
import { useSuperUnifiedData } from '@/context/SuperUnifiedDataContext';
import StatsGrid from '@/components/dashboard/StatsGrid';
import { AlertCircle, Clock, RefreshCcw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AccentTone = 'primary' | 'neutral' | 'error';

const DecorativeWrapper = ({
  children,
  accent = 'primary'
}: {
  children: React.ReactNode;
  accent?: AccentTone;
}) => {
  const toneStyles: Record<AccentTone, string> = {
    primary: 'border-primary/30 bg-background',
    neutral: 'border-border/40 bg-background',
    error: 'border-red-300/40 bg-red-50/70 dark:border-red-900/50 dark:bg-red-950/30'
  };

  return (
    <section className={`relative rounded-3xl border transition-colors ${toneStyles[accent]}`}>
      <div className="relative">{children}</div>
    </section>
  );
};

// مكون التحميل
const StatsGridSkeleton = () => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/50" />
    ))}
  </div>
);

const StatsLoader = ({ withFrame = true }: { withFrame?: boolean }) => {
  const content = (
    <div className="p-6 md:p-8">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/80 px-4 py-1 text-xs font-semibold uppercase text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            <span className="h-3 w-24 animate-pulse rounded bg-muted/60" />
          </div>
          <div className="space-y-2">
            <div className="h-8 w-56 animate-pulse rounded bg-muted/60" />
            <div className="h-4 w-72 animate-pulse rounded bg-muted/40" />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-9 w-44 animate-pulse rounded-full bg-muted/50" />
          <div className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-border/60 bg-background/70 p-4 md:p-6">
        <StatsGridSkeleton />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border/50 bg-background/70" />
        ))}
      </div>
    </div>
  );

  if (!withFrame) {
    return <StatsGridSkeleton />;
  }

  return <DecorativeWrapper>{content}</DecorativeWrapper>;
};

// مكون الخطأ
const StatsError = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
  <DecorativeWrapper accent="error">
    <div className="p-6 md:p-8">
      <div className="flex flex-col items-center justify-center space-y-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-200/60 bg-red-50/80 dark:border-red-900/40 dark:bg-red-950/60">
          <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-semibold text-foreground">فشل في تحميل الإحصائيات</h3>
          <p className="text-sm text-muted-foreground max-w-xl">
            {error}
          </p>
        </div>

        <Button
          onClick={onRetry}
          variant="secondary"
          className="gap-2 border-red-200/50 bg-red-100/50 text-red-600 hover:bg-red-100 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300"
        >
          <RefreshCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    </div>
  </DecorativeWrapper>
);

interface OptimizedStatsSectionProps {
  timeframe: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
}

const timeframeLabels: Record<OptimizedStatsSectionProps['timeframe'], string> = {
  daily: 'اليومي',
  weekly: 'الأسبوعي',
  monthly: 'الشهري',
  annual: 'السنوي',
  custom: 'مخصص'
};

const OptimizedStatsSection: React.FC<OptimizedStatsSectionProps> = ({ timeframe }) => {
  const { dashboardStats: stats, isLoading, error, refreshData } = useSuperUnifiedData();
  const refresh = refreshData || (() => {});

  if (isLoading) {
    return <StatsLoader />;
  }

  if (error) {
    return <StatsError error={error} onRetry={refresh} />;
  }

  if (!stats) {
    return (
      <DecorativeWrapper accent="neutral">
        <div className="p-6 md:p-8">
          <div className="flex flex-col items-center justify-center space-y-5 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/70">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              <h3 className="text-xl font-semibold text-foreground">لا توجد بيانات إحصائية بعد</h3>
              <p className="text-sm text-muted-foreground max-w-md">
                بمجرد توفر البيانات سيتم عرض لوحة الأداء بكامل تأثيراتها البصرية لتتابع أهم المؤشرات بسهولة.
              </p>
            </div>
            <Button onClick={refresh} variant="secondary" className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              تحديث الآن
            </Button>
          </div>
        </div>
      </DecorativeWrapper>
    );
  }

  const orders = stats.orders || {
    total: 0,
    pending: 0,
    processing: 0,
    completed: 0
  };

  return (
    <DecorativeWrapper>
      <div className="p-6 md:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="h-4 w-4" />
              لوحة الأداء الذكية
            </span>
            <div className="space-y-3 text-foreground">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">ملخص الأداء المتقدم</h2>
              <p className="max-w-2xl text-sm text-muted-foreground md:text-base">
                نظرة بصرية شاملة على أهم المؤشرات مع تصميم متجاوب وراقي يعمل بسلاسة على مختلف الأجهزة.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-medium text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              إطار زمني:
              <span className="text-sm font-semibold text-foreground">
                {timeframeLabels[timeframe]}
              </span>
            </div>
            <Button
              onClick={refresh}
              variant="secondary"
              size="sm"
              className="gap-2 border border-border/60 bg-background/80 text-foreground hover:bg-background"
            >
              <RefreshCcw className="h-4 w-4" />
              تحديث البيانات
            </Button>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-border/60 bg-background/70 p-4 md:p-6">
          <Suspense fallback={<StatsLoader withFrame={false} />}>
            <StatsGrid
              sales={stats.sales}
              revenue={stats.revenue}
              profits={stats.profits}
              orders={orders}
              timeframe={timeframe}
            />
          </Suspense>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">إجمالي الطلبات</span>
            <p className="mt-3 text-2xl font-bold text-foreground">{orders.total.toLocaleString('ar-DZ')}</p>
            <p className="mt-1 text-xs text-muted-foreground">مؤشر شامل لجميع الطلبات خلال الفترة المختارة.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">طلبات قيد الانتظار</span>
            <p className="mt-3 text-2xl font-bold text-foreground">{orders.pending.toLocaleString('ar-DZ')}</p>
            <p className="mt-1 text-xs text-muted-foreground">راجع التراكم الحالي لضمان سرعة الاستجابة.</p>
          </div>
          <div className="rounded-xl border border-border/60 bg-background/80 p-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">طلبات مكتملة</span>
            <p className="mt-3 text-2xl font-bold text-foreground">{orders.completed.toLocaleString('ar-DZ')}</p>
            <p className="mt-1 text-xs text-muted-foreground">نسبة الإنجاز تعكس الأداء العام للفريق.</p>
          </div>
        </div>
      </div>
    </DecorativeWrapper>
  );
};

export default OptimizedStatsSection;
