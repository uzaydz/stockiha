import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, ShoppingBag, DollarSign, Clock, BarChart4 } from "lucide-react";

// تعريف نوع إحصائيات الطلبات المتروكة
export interface AbandonedOrdersStats {
  totalCount: number;
  totalValue: number;
  todayCount: number;
  weekCount: number;
  monthCount: number;
  averageValue: number;
  recoveryRate: number;
  conversionRate: number;
  // البيانات اللازمة للرسوم البيانية
  timeSeries: {
    labels: string[];
    data: number[];
  };
}

// Props لمكون الإحصائيات
interface AbandonedOrdersStatsProps {
  stats: AbandonedOrdersStats;
  loading: boolean;
  timeRange: "today" | "week" | "month" | "year";
  onTimeRangeChange: (range: "today" | "week" | "month" | "year") => void;
}

// مكون إحصائيات الطلبات المتروكة
export function AbandonedOrdersStats({
  stats,
  loading,
  timeRange,
  onTimeRangeChange,
}: AbandonedOrdersStatsProps) {
  // عرض حالة التحميل
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border shadow-sm">
            <CardContent className="p-6">
              <div className="animate-pulse space-y-2">
                <div className="h-5 w-20 bg-muted rounded"></div>
                <div className="h-8 w-28 bg-muted rounded"></div>
                <div className="h-4 w-16 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">إحصائيات الطلبات المتروكة</h2>
        <Tabs value={timeRange} onValueChange={(v) => onTimeRangeChange(v as any)}>
          <TabsList>
            <TabsTrigger value="today">
              اليوم
            </TabsTrigger>
            <TabsTrigger value="week">
              الأسبوع
            </TabsTrigger>
            <TabsTrigger value="month">
              الشهر
            </TabsTrigger>
            <TabsTrigger value="year">
              السنة
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        {/* إجمالي الطلبات المتروكة */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-row justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">إجمالي الطلبات المتروكة</p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {stats.totalCount.toLocaleString("ar-DZ")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stats.todayCount} طلب اليوم
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <ShoppingBag className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* القيمة المفقودة */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-row justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">القيمة المفقودة</p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {new Intl.NumberFormat("ar-DZ", {
                    style: "currency",
                    currency: "DZD",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(stats.totalValue)}
                </h3>
                <p className="text-xs text-muted-foreground">
                  متوسط {new Intl.NumberFormat("ar-DZ", {
                    style: "currency",
                    currency: "DZD",
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  }).format(stats.averageValue)} / طلب
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center dark:bg-green-900/20">
                <DollarSign className="h-6 w-6 text-green-500 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* نسبة التحويل */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-row justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">نسبة التحويل</p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {stats.conversionRate.toFixed(1)}%
                </h3>
                <p className="text-xs text-muted-foreground">
                  {stats.recoveryRate < stats.conversionRate ? (
                    <span className="text-green-600 dark:text-green-400">↑ {(stats.conversionRate - stats.recoveryRate).toFixed(1)}%</span>
                  ) : (
                    <span className="text-red-600 dark:text-red-400">↓ {(stats.recoveryRate - stats.conversionRate).toFixed(1)}%</span>
                  )}
                  {" "}مقارنة بالفترة السابقة
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center dark:bg-blue-900/20">
                <BarChart4 className="h-6 w-6 text-blue-500 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* نسبة الاسترداد */}
        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <div className="flex flex-row justify-between items-start">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">نسبة الاسترداد</p>
                <h3 className="text-2xl font-bold tracking-tight">
                  {stats.recoveryRate.toFixed(1)}%
                </h3>
                <p className="text-xs text-muted-foreground">
                  من إجمالي الطلبات المتروكة
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center dark:bg-amber-900/20">
                <Clock className="h-6 w-6 text-amber-500 dark:text-amber-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* مكان لعرض الرسوم البيانية */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">توزيع الطلبات المتروكة حسب الوقت</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[200px] w-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <BarChart4 className="h-12 w-12 text-muted mx-auto" />
                <p className="text-sm text-muted-foreground">
                  الرسم البياني سيظهر هنا
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">توزيع الطلبات المتروكة حسب القيمة</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-[200px] w-full flex items-center justify-center">
              <div className="text-center space-y-2">
                <DollarSign className="h-12 w-12 text-muted mx-auto" />
                <p className="text-sm text-muted-foreground">
                  الرسم البياني سيظهر هنا
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 