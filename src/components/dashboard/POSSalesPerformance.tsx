import { useEffect, useState, useMemo, memo } from 'react';
import { TrendingUp, Package, DollarSign, AlertCircle } from 'lucide-react';
import { inventoryDB } from '@/database/localDb';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ar } from 'date-fns/locale';

interface POSSalesPerformanceProps {
  organizationId: string;
  days?: number;
}

interface DailySalesData {
  day: string;
  dayShort: string;
  revenue: number;
  sales: number;
  date: Date;
}

// تنسيق العملة
const formatCurrency = (value: number): string => {
  return `${Number(value).toLocaleString('ar-DZ')} د.ج`;
};

const POSSalesPerformance = memo(({ organizationId, days = 7 }: POSSalesPerformanceProps) => {
  const [salesData, setSalesData] = useState<DailySalesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchSalesData = async () => {
      if (!organizationId) return;

      setIsLoading(true);
      setError(null);

      try {
        // إنشاء مصفوفة الأيام
        const daysArray: DailySalesData[] = [];
        const today = new Date();

        for (let i = days - 1; i >= 0; i--) {
          const date = subDays(today, i);
          const dayName = format(date, 'EEEE', { locale: ar });
          const dayShort = format(date, 'EEE', { locale: ar });

          daysArray.push({
            day: dayName,
            dayShort: dayShort,
            revenue: 0,
            sales: 0,
            date: date
          });
        }

        // جلب بيانات الطلبات من قاعدة البيانات المحلية (SQLite)
        const rangeStart = startOfDay(subDays(today, days - 1));
        const rangeEnd = endOfDay(today);
        const orders = await inventoryDB.posOrders
          .where('[organization_id+created_at]')
          .between([organizationId, rangeStart.toISOString()], [organizationId, rangeEnd.toISOString()])
          .toArray();

        if (!isMounted) return;

        // تجميع البيانات حسب اليوم
        orders?.forEach(order => {
          if (order.organization_id !== organizationId) return;

          const orderDate = order.created_at ? new Date(order.created_at) : null;
          if (!orderDate) return;

          // إيجاد اليوم المطابق
          const matchingDay = daysArray.find(day => {
            const dayStart = startOfDay(day.date);
            const dayEnd = endOfDay(day.date);
            return orderDate >= dayStart && orderDate <= dayEnd;
          });

          if (matchingDay) {
            matchingDay.revenue += order.total || 0;
            matchingDay.sales += 1;
          }
        });

        setSalesData(daysArray);
      } catch (err) {
        console.error('Error fetching sales data:', err);
        if (isMounted) {
          setError('حدث خطأ أثناء جلب بيانات المبيعات');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchSalesData();

    return () => {
      isMounted = false;
    };
  }, [organizationId, days]);

  // حساب الإحصائيات
  const stats = useMemo(() => {
    const totalRevenue = salesData.reduce((sum, day) => sum + day.revenue, 0);
    const totalOrders = salesData.reduce((sum, day) => sum + day.sales, 0);
    const maxRevenue = Math.max(...salesData.map(d => d.revenue), 0);
    const maxOrders = Math.max(...salesData.map(d => d.sales), 0);

    return {
      totalRevenue,
      totalOrders,
      maxRevenue,
      maxOrders
    };
  }, [salesData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">جاري تحميل بيانات المبيعات...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header مع الإحصائيات */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 rounded-lg bg-primary/10 dark:bg-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">أداء المبيعات</h3>
              <p className="text-xs text-muted-foreground">طلبات نقطة البيع - آخر {days} أيام</p>
            </div>
          </div>
        </div>

        {/* الإحصائيات الإجمالية */}
        <div className="flex gap-3 flex-wrap">
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-3 rounded-xl border border-primary/20 dark:border-primary/30 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary font-medium">إجمالي الإيرادات</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {formatCurrency(stats.totalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalRevenue > 0 ? `(${(stats.totalRevenue / days).toFixed(0)} د.ج / يوم)` : 'لا توجد مبيعات'}
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 p-3 rounded-xl border border-primary/20 dark:border-primary/30 min-w-[140px]">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-primary" />
              <span className="text-xs text-primary font-medium">عدد الطلبات</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {stats.totalOrders.toLocaleString('ar-DZ')}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalOrders > 0 ? `(${(stats.totalOrders / days).toFixed(1)} طلب / يوم)` : 'لا توجد طلبات'}
            </p>
          </div>
        </div>
      </div>

      {/* الرسم البياني */}
      <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-background dark:to-muted/10 rounded-xl p-6 border border-gray-200/50 dark:border-border/20 shadow-sm">
        {stats.totalOrders === 0 ? (
          <div className="text-center py-12 space-y-3">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-muted/50 dark:bg-muted/30">
                <Package className="h-10 w-10 text-muted-foreground opacity-50" />
              </div>
            </div>
            <div>
              <p className="text-base font-medium text-foreground">لا توجد مبيعات حتى الآن</p>
              <p className="text-sm text-muted-foreground mt-1">ستظهر البيانات هنا بمجرد إتمام طلبات من نقطة البيع</p>
            </div>
          </div>
        ) : (
          <div className="w-full" style={{ height: '320px' }}>
            <div className="relative h-full pt-8 pb-10">
              {/* Grid background (horizontal lines) */}
              <div className="absolute inset-0 top-8 bottom-10 pointer-events-none">
                <div className="h-full w-full flex flex-col justify-between">
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                  <div className="border-t border-border/30 dark:border-border/20"></div>
                </div>
              </div>

              {/* Bars Container */}
              <div className="absolute inset-0 top-8 bottom-10 px-4 flex items-end gap-1 sm:gap-2">
                {salesData.map((entry, index) => {
                  const alpha = 0.6 + (stats.maxOrders > 0 ? (entry.sales / stats.maxOrders) * 0.4 : 0);
                  const heightPct = stats.maxOrders > 0
                    ? Math.max(4, Math.round((entry.sales / stats.maxOrders) * 100))
                    : 4; // min 4%

                  return (
                    <div
                      key={index}
                      className="group relative flex-1 flex flex-col items-center justify-end h-full"
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-8 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none">
                        <div className="bg-white dark:bg-slate-800 border-2 border-primary/30 rounded-xl shadow-2xl p-3 min-w-[200px] whitespace-nowrap">
                          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-border/30">
                            <div className="p-1.5 rounded-lg bg-primary/10">
                              <Package className="h-3.5 w-3.5 text-primary" />
                            </div>
                            <h4 className="font-bold text-foreground text-sm">{entry.day}</h4>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            <div className="flex items-center justify-between gap-3 bg-muted/30 dark:bg-muted/10 p-1.5 rounded-lg">
                              <span className="text-muted-foreground font-medium">الإيرادات:</span>
                              <span className="font-bold text-primary">{formatCurrency(entry.revenue)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-muted/30 dark:bg-muted/10 p-1.5 rounded-lg">
                              <span className="text-muted-foreground font-medium">عدد الطلبات:</span>
                              <span className="font-bold text-foreground">{entry.sales}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="relative w-full flex flex-col items-center justify-end" style={{ height: `${heightPct}%` }}>
                        {/* Value label */}
                        {entry.sales > 0 && (
                          <div className="absolute -top-5 text-xs font-bold text-primary select-none">
                            {entry.sales}
                          </div>
                        )}

                        <div
                          className="w-full max-w-[60px] rounded-t-lg transition-all duration-200 hover:opacity-90 cursor-pointer"
                          style={{
                            height: '100%',
                            minHeight: entry.sales > 0 ? '8px' : '4px',
                            background: `hsl(var(--primary) / ${alpha})`,
                            boxShadow: entry.sales > 0 ? '0 2px 8px rgba(0,0,0,0.1)' : 'none'
                          }}
                        />
                      </div>

                      {/* X label */}
                      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-xs text-muted-foreground select-none font-medium whitespace-nowrap">
                        {entry.dayShort}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

POSSalesPerformance.displayName = 'POSSalesPerformance';

export default POSSalesPerformance;
