
import { useState, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  TrendingUp,
  BarChart2,
  Layers,
  DollarSign,
  ShoppingBag,
  CreditCard,
  Maximize2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area
} from 'recharts';
import { cn } from '@/lib/utils';

// Tipos de datos
type DateRange = {
  from: Date;
  to: Date;
};

type TrendData = {
  time_period: string;
  order_count: number;
  total_sales: number;
  average_order_value: number;
};

type SalesTrendsProps = {
  data: TrendData[];
  dateRange: DateRange;
  isLoading: boolean;
};

// مكون للأرقام بتنسيق جميل
const MetricCard = ({ title, value, subtext, icon: Icon, trend, trendLabel, delay }: any) => (
  <Card className={cn("overflow-hidden border-none shadow-md bg-card/50 backdrop-blur-sm transition-all duration-300 hover:bg-card hover:shadow-lg animate-in fade-in zoom-in-95", delay)}>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold font-numeric">{value}</div>
      <div className="flex items-center text-xs mt-1 space-x-2 space-x-reverse">
        {trend !== undefined && (
          <Badge variant="outline" className={cn("ml-2 font-numeric", trend >= 0 ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" : "text-rose-500 border-rose-500/20 bg-rose-500/10")}>
            {trend >= 0 ? "+" : ""}{trend.toFixed(1)}%
          </Badge>
        )}
        <span className="text-muted-foreground truncate">{trendLabel || subtext}</span>
      </div>
    </CardContent>
  </Card>
);

// تخصيص التلميح في المخطط
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-xl text-sm min-w-[180px]">
        <p className="font-semibold mb-2 text-foreground border-b border-border/50 pb-1">{label}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#FC5D41]" />
              المبيعات:
            </span>
            <span className="font-bold font-numeric text-foreground">{Number(payload[0].value).toLocaleString()} <span className="text-xs font-normal text-muted-foreground">د.ج</span></span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500" />
              الطلبات:
            </span>
            <span className="font-bold font-numeric text-foreground">{Number(payload[1].value).toLocaleString()}</span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// Componente para tendencias de ventas
const SalesTrends = ({ data, dateRange, isLoading }: SalesTrendsProps) => {
  const [viewMode, setViewMode] = useState('chart');
  const [chartPeriod, setChartPeriod] = useState('daily');

  // Organizar datos por periodo
  const trendData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return [...data].sort((a, b) => {
      if (chartPeriod === 'daily') {
        return parseISO(a.time_period).getTime() - parseISO(b.time_period).getTime();
      } else if (chartPeriod === 'weekly') {
        const weekA = a.time_period.split('-W')[1];
        const weekB = b.time_period.split('-W')[1];
        return Number(weekA) - Number(weekB);
      } else {
        return a.time_period.localeCompare(b.time_period);
      }
    });
  }, [data, chartPeriod]);

  // Formatear etiquetas de periodo para el gráfico
  const formatPeriodLabel = (period: string): string => {
    if (!period) return '';
    try {
      if (chartPeriod === 'daily') {
        return format(parseISO(period), 'dd MMM', { locale: ar });
      } else if (chartPeriod === 'weekly') {
        const parts = period.split('-W');
        if (parts.length < 2) return period;
        return `أ ${parts[1]}`;
      } else if (chartPeriod === 'monthly') {
        const parts = period.split('-');
        if (parts.length < 2) return period;
        return format(new Date(Number(parts[0]), Number(parts[1]) - 1, 1), 'MMM yy', { locale: ar });
      }
      return period;
    } catch (e) {
      return period;
    }
  };

  // Prepare data for Recharts
  const chartData = useMemo(() => {
    return trendData.map(d => ({
      name: formatPeriodLabel(d.time_period),
      originalPeriod: d.time_period,
      sales: Number(d.total_sales),
      orders: Number(d.order_count),
      avg: Number(d.order_count) > 0 ? Number(d.total_sales) / Number(d.order_count) : 0
    }));
  }, [trendData, chartPeriod]);

  // Estadísticas
  const stats = useMemo(() => {
    if (!data || data.length === 0) return {
      totalSales: 0, totalOrders: 0, avgOrderValue: 0, maxSales: 0,
      salesChange: 0, ordersChange: 0
    };

    const totalSales = data.reduce((sum, d) => sum + Number(d.total_sales), 0);
    const totalOrders = data.reduce((sum, d) => sum + Number(d.order_count), 0);
    const maxSales = Math.max(...data.map(d => Number(d.total_sales)));
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Calculo simple de tendencias (primera mitad vs segunda mitad)
    const midPoint = Math.floor(trendData.length / 2);
    const firstHalf = trendData.slice(0, midPoint);
    const secondHalf = trendData.slice(midPoint);

    const firstHalfSales = firstHalf.reduce((sum, d) => sum + Number(d.total_sales), 0);
    const secondHalfSales = secondHalf.reduce((sum, d) => sum + Number(d.total_sales), 0);
    const salesChange = firstHalfSales === 0 ? 100 : ((secondHalfSales - firstHalfSales) / firstHalfSales) * 100;

    const firstHalfOrders = firstHalf.reduce((sum, d) => sum + Number(d.order_count), 0);
    const secondHalfOrders = secondHalf.reduce((sum, d) => sum + Number(d.order_count), 0);
    const ordersChange = firstHalfOrders === 0 ? 100 : ((secondHalfOrders - firstHalfOrders) / firstHalfOrders) * 100;

    return { totalSales, totalOrders, avgOrderValue, maxSales, salesChange, ordersChange };
  }, [data, trendData]);

  // Formatear rango de fechas
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-primary to-orange-400 w-fit">تحليل اتجاهات المبيعات</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? (
              <Skeleton className="h-4 w-32" />
            ) : (
              <span>الفترة: <span className="font-menu text-foreground">{formattedDateRange}</span></span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={chartPeriod} onValueChange={setChartPeriod}>
            <SelectTrigger className="w-[140px] bg-card border-border/50">
              <SelectValue placeholder="اختر الفترة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">يومي</SelectItem>
              <SelectItem value="weekly">أسبوعي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={setViewMode} className="hidden md:block">
            <TabsList className="h-10 bg-muted/50 p-1">
              <TabsTrigger value="chart" className="px-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <BarChart2 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="table" className="px-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">
                <Layers className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
          </div>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </div>
      ) : data?.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <div className="bg-muted p-4 rounded-full mb-4">
              <TrendingUp className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">لا توجد بيانات</h3>
            <p className="text-sm">لم يتم العثور على بيانات مبيعات في الفترة المحددة</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ملخص البيانات */}
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="إجمالي المبيعات"
              value={`${stats.totalSales.toLocaleString()} د.ج`}
              icon={DollarSign}
              trend={stats.salesChange}
              trendLabel="مقارنة بالفترة السابقة"
              delay="animation-delay-100"
            />
            <MetricCard
              title="إجمالي الطلبات"
              value={stats.totalOrders.toLocaleString()}
              icon={ShoppingBag}
              trend={stats.ordersChange}
              trendLabel="مقارنة بالفترة السابقة"
              delay="animation-delay-200"
            />
            <MetricCard
              title="متوسط قيمة الطلب"
              value={`${stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} د.ج`}
              icon={CreditCard}
              subtext="متوسط السلة"
              delay="animation-delay-300"
            />
            <MetricCard
              title="أعلى مبيعات"
              value={`${stats.maxSales.toLocaleString()} د.ج`}
              icon={Maximize2}
              subtext="في فترة واحدة"
              delay="animation-delay-400"
            />
          </div>

          <Card className="border-border/50 shadow-sm bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-0">
              {viewMode === 'chart' ? (
                <div className="p-6 h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FC5D41" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#FC5D41" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--items-border))" opacity={0.4} />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                        tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12, fontFamily: 'JetBrains Mono' }}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted)/0.4)' }} />
                      <Legend iconType="circle" />

                      <Bar
                        yAxisId="left"
                        dataKey="sales"
                        name="المبيعات (د.ج)"
                        fill="url(#colorSales)"
                        stroke="#FC5D41"
                        radius={[4, 4, 0, 0]}
                        barSize={30}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="orders"
                        name="الطلبات"
                        stroke="#6366f1"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                        activeDot={{ r: 6, strokeWidth: 0 }}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="overflow-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
                      <tr className="border-b border-border/50">
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">الفترة</th>
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">الطلبات</th>
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">المبيعات</th>
                        <th className="py-3 px-4 text-right font-medium text-muted-foreground">متوسط الطلب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chartData.map((row, i) => (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-4 font-medium">{row.name}</td>
                          <td className="py-3 px-4 font-numeric">{row.orders}</td>
                          <td className="py-3 px-4 font-numeric text-primary font-medium">{row.sales.toLocaleString()}</td>
                          <td className="py-3 px-4 font-numeric text-muted-foreground">
                            {row.avg.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default SalesTrends;
