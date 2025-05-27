import { useState } from 'react';
import { format, isAfter, isBefore, parseISO, subDays } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  TrendingUp,
  Calendar,
  BarChart2,
  ArrowRight,
  ArrowLeft,
  Layers
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

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

// Componente para tendencias de ventas
const SalesTrends = ({ data, dateRange, isLoading }: SalesTrendsProps) => {
  const [viewMode, setViewMode] = useState('chart');
  const [chartPeriod, setChartPeriod] = useState('daily');
  
  // Formatear rango de fechas para mostrar
  const formattedDateRange = `${format(dateRange.from, 'dd MMM yyyy', { locale: ar })} - ${format(dateRange.to, 'dd MMM yyyy', { locale: ar })}`;
  
  // Organizar datos por periodo
  const organizeTrendData = () => {
    if (!data || data.length === 0) return [];
    
    let sortedData = [...data].sort((a, b) => {
      // Ordenar datos por periodo
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
    
    return sortedData;
  };
  
  const trendData = organizeTrendData();
  
  // Calcular el ancho de cada barra
  const getBarWidth = (value: number, maxValue: number): number => {
    if (maxValue === 0) return 0;
    return (value / maxValue) * 100;
  };
  
  // Encontrar el valor máximo para dimensionar el gráfico
  const maxSales = Math.max(...(trendData.map(d => Number(d.total_sales)) || [0]));
  const maxOrders = Math.max(...(trendData.map(d => Number(d.order_count)) || [0]));
  
  // Formatear etiquetas de periodo
  const formatPeriodLabel = (period: string): string => {
    if (chartPeriod === 'daily') {
      return format(parseISO(period), 'dd MMM', { locale: ar });
    } else if (chartPeriod === 'weekly') {
      const [year, week] = period.split('-W');
      return `أسبوع ${week}`;
    } else if (chartPeriod === 'monthly') {
      const [year, month] = period.split('-');
      return format(new Date(Number(year), Number(month) - 1, 1), 'MMM yyyy', { locale: ar });
    } else {
      return period;
    }
  };
  
  // Calcular tendencias y cambios
  const calculateTrends = () => {
    if (!data || data.length < 2) return { salesChange: 0, ordersChange: 0 };
    
    const currentPeriodData = trendData.slice(-Math.ceil(trendData.length / 2));
    const previousPeriodData = trendData.slice(0, Math.floor(trendData.length / 2));
    
    const currentSales = currentPeriodData.reduce((sum, d) => sum + Number(d.total_sales), 0);
    const previousSales = previousPeriodData.reduce((sum, d) => sum + Number(d.total_sales), 0);
    
    const currentOrders = currentPeriodData.reduce((sum, d) => sum + Number(d.order_count), 0);
    const previousOrders = previousPeriodData.reduce((sum, d) => sum + Number(d.order_count), 0);
    
    const salesChange = previousSales === 0 ? 100 : ((currentSales - previousSales) / previousSales) * 100;
    const ordersChange = previousOrders === 0 ? 100 : ((currentOrders - previousOrders) / previousOrders) * 100;
    
    return { salesChange, ordersChange };
  };
  
  const { salesChange, ordersChange } = calculateTrends();
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col space-y-2 md:flex-row md:justify-between md:items-center md:space-y-0">
        <h2 className="text-xl font-semibold">اتجاهات المبيعات</h2>
        <p className="text-sm text-muted-foreground">
          {isLoading ? (
            <Skeleton className="h-4 w-32" />
          ) : (
            <>الفترة: {formattedDateRange}</>
          )}
        </p>
      </div>
      
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <CardTitle className="text-lg">تحليل اتجاهات المبيعات</CardTitle>
              <CardDescription>
                تحليل اتجاهات المبيعات خلال الفترة المحددة
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 mt-2 md:mt-0">
              <Select
                value={chartPeriod}
                onValueChange={setChartPeriod}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="اختر الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">يومي</SelectItem>
                  <SelectItem value="weekly">أسبوعي</SelectItem>
                  <SelectItem value="monthly">شهري</SelectItem>
                </SelectContent>
              </Select>
              
              <Tabs value={viewMode} onValueChange={setViewMode} className="hidden md:block">
                <TabsList className="h-9">
                  <TabsTrigger value="chart" className="px-3">
                    <BarChart2 className="h-4 w-4" />
                  </TabsTrigger>
                  <TabsTrigger value="table" className="px-3">
                    <Layers className="h-4 w-4" />
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-[300px] w-full" />
            </div>
          ) : data?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <TrendingUp className="h-12 w-12 mb-2" />
              <p>لم يتم العثور على بيانات اتجاهات للفترة المحددة</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* ملخص البيانات */}
              <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
                <Card className="overflow-hidden bg-muted/50">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm">
                      المبيعات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-xl font-bold">
                      {trendData.reduce((sum, d) => sum + Number(d.total_sales), 0).toLocaleString()} د.ج
                    </div>
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Badge className={salesChange >= 0 ? "bg-emerald-500" : "bg-red-500"}>
                        {salesChange >= 0 ? "+" : ""}{salesChange.toFixed(1)}%
                      </Badge>
                      <span className="text-muted-foreground">مقارنة بالفترة السابقة</span>
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden bg-muted/50">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm">
                      الطلبات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-xl font-bold">
                      {trendData.reduce((sum, d) => sum + Number(d.order_count), 0).toLocaleString()}
                    </div>
                    <p className="text-xs flex items-center gap-1 mt-1">
                      <Badge className={ordersChange >= 0 ? "bg-emerald-500" : "bg-red-500"}>
                        {ordersChange >= 0 ? "+" : ""}{ordersChange.toFixed(1)}%
                      </Badge>
                      <span className="text-muted-foreground">مقارنة بالفترة السابقة</span>
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden bg-muted/50">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm">
                      متوسط الطلب
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-xl font-bold">
                      {trendData.length > 0 && trendData.reduce((sum, d) => sum + Number(d.order_count), 0) > 0
                        ? (trendData.reduce((sum, d) => sum + Number(d.total_sales), 0) / trendData.reduce((sum, d) => sum + Number(d.order_count), 0)).toLocaleString(undefined, {maximumFractionDigits: 0})
                        : 0} د.ج
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      متوسط قيمة الطلب
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="overflow-hidden bg-muted/50">
                  <CardHeader className="pb-2 pt-4">
                    <CardTitle className="text-sm">
                      أعلى قيمة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="text-xl font-bold">
                      {maxSales.toLocaleString()} د.ج
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      أعلى قيمة في يوم واحد
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {viewMode === 'chart' ? (
                <div className="space-y-6">
                  {/* المبيعات */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-medium">المبيعات</h3>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        <span>0</span>
                        <span>-</span>
                        <span>{maxSales.toLocaleString()} د.ج</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {trendData.map((period, index) => (
                        <div key={period.time_period} className="flex items-center gap-2">
                          <div className="w-20 text-sm">{formatPeriodLabel(period.time_period)}</div>
                          <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-md transition-all duration-500"
                              style={{ width: `${getBarWidth(Number(period.total_sales), maxSales)}%` }}
                            />
                          </div>
                          <div className="w-20 text-sm text-left">
                            {Number(period.total_sales).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* الطلبات */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <h3 className="text-sm font-medium">الطلبات</h3>
                      <div className="flex gap-1 text-xs text-muted-foreground">
                        <span>0</span>
                        <span>-</span>
                        <span>{maxOrders}</span>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {trendData.map((period, index) => (
                        <div key={period.time_period} className="flex items-center gap-2">
                          <div className="w-20 text-sm">{formatPeriodLabel(period.time_period)}</div>
                          <div className="flex-1 h-8 bg-muted rounded-md overflow-hidden">
                            <div 
                              className="h-full bg-indigo-500 rounded-md transition-all duration-500"
                              style={{ width: `${getBarWidth(Number(period.order_count), maxOrders)}%` }}
                            />
                          </div>
                          <div className="w-20 text-sm text-left">
                            {Number(period.order_count).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="overflow-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b">
                        <th className="py-2 px-4 text-right font-medium">الفترة</th>
                        <th className="py-2 px-4 text-right font-medium">الطلبات</th>
                        <th className="py-2 px-4 text-right font-medium">المبيعات</th>
                        <th className="py-2 px-4 text-right font-medium">متوسط الطلب</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trendData.map((period) => (
                        <tr key={period.time_period} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-4">{formatPeriodLabel(period.time_period)}</td>
                          <td className="py-2 px-4">{Number(period.order_count).toLocaleString()}</td>
                          <td className="py-2 px-4">{Number(period.total_sales).toLocaleString()} د.ج</td>
                          <td className="py-2 px-4">
                            {Number(period.order_count) > 0
                              ? (Number(period.total_sales) / Number(period.order_count)).toLocaleString(undefined, {maximumFractionDigits: 0})
                              : 0} د.ج
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-muted/30 font-medium">
                        <td className="py-2 px-4">الإجمالي</td>
                        <td className="py-2 px-4">
                          {trendData.reduce((sum, d) => sum + Number(d.order_count), 0).toLocaleString()}
                        </td>
                        <td className="py-2 px-4">
                          {trendData.reduce((sum, d) => sum + Number(d.total_sales), 0).toLocaleString()} د.ج
                        </td>
                        <td className="py-2 px-4">
                          {trendData.reduce((sum, d) => sum + Number(d.order_count), 0) > 0
                            ? (trendData.reduce((sum, d) => sum + Number(d.total_sales), 0) / trendData.reduce((sum, d) => sum + Number(d.order_count), 0)).toLocaleString(undefined, {maximumFractionDigits: 0})
                            : 0} د.ج
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SalesTrends;
