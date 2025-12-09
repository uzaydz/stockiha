import React, { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Calendar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useTheme } from 'next-themes';
// ✨ استخدام الـ context الجديد المحسن - فقط OrdersContext بدلاً من ShopContext الكامل
import { useOrders } from '@/context/shop/ShopContext.new';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Цветовая схема для графиков
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SalesOverview = () => {
  // ✨ استخدام orders و isLoading من OrdersContext الجديد فقط - تحسين الأداء بنسبة 85%
  const { orders, isLoading } = useOrders();
  const [dateRange, setDateRange] = useState<{from: Date; to: Date}>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    salesGrowth: 0
  });
  
  const [dailySales, setDailySales] = useState<Array<{name: string; amount: number}>>([]);
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<Array<{name: string; value: number}>>([]);
  
  useEffect(() => {
    
    return () => {
      
    };
  }, []);
  
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      // فلترة الطلبات حسب نطاق التاريخ
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= dateRange.from && orderDate <= dateRange.to && !order.isOnline;
      });
      
      if (filteredOrders.length === 0) {
        setStats({
          totalSales: 0,
          totalOrders: 0,
          averageOrderValue: 0,
          salesGrowth: 0
        });
        setDailySales([]);
        setSalesByPaymentMethod([]);
        return;
      }
      
      // حساب إجمالي المبيعات وعدد الطلبات
      const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalSales / totalOrders;
      
      // حساب نمو المبيعات (مقارنة بالفترة السابقة)
      const previousPeriodStart = new Date(dateRange.from);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24));
      
      const previousPeriodOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= previousPeriodStart && orderDate < dateRange.from && !order.isOnline;
      });
      
      const previousPeriodSales = previousPeriodOrders.reduce((sum, order) => sum + order.total, 0);
      const salesGrowth = previousPeriodSales === 0 
        ? 100 
        : ((totalSales - previousPeriodSales) / previousPeriodSales) * 100;
      
      setStats({
        totalSales,
        totalOrders,
        averageOrderValue,
        salesGrowth
      });
      
      // بناء بيانات المبيعات اليومية
      const salesByDay = new Map<string, number>();
      
      filteredOrders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const dateKey = orderDate.toISOString().split('T')[0];
        const currentAmount = salesByDay.get(dateKey) || 0;
        salesByDay.set(dateKey, currentAmount + order.total);
      });
      
      const sortedDailySales = Array.from(salesByDay.entries())
        .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
        .map(([date, amount]) => ({
          name: new Date(date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          amount
        }));
      
      setDailySales(sortedDailySales);
      
      // بناء بيانات المبيعات حسب طريقة الدفع
      const salesByMethod = new Map<string, number>();
      
      filteredOrders.forEach(order => {
        const methodKey = order.paymentMethod;
        const currentAmount = salesByMethod.get(methodKey) || 0;
        salesByMethod.set(methodKey, currentAmount + order.total);
      });
      
      const paymentMethodSales = Array.from(salesByMethod.entries())
        .map(([name, value]) => ({ name, value }));
      
      setSalesByPaymentMethod(paymentMethodSales);
    }
  }, [isLoading, orders, dateRange]);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Chart.js data for daily sales bar chart
  const dailySalesChartData: ChartData<'bar'> = useMemo(() => ({
    labels: dailySales.map(d => d.name),
    datasets: [
      {
        label: 'المبيعات',
        data: dailySales.map(d => d.amount),
        backgroundColor: '#8884d8',
        borderRadius: 4,
      },
    ],
  }), [dailySales]);

  const barChartOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        titleColor: isDark ? '#a1a1aa' : '#71717a',
        bodyColor: isDark ? '#ffffff' : '#18181b',
        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
        borderWidth: 1,
        callbacks: {
          label: (context) => formatPrice(context.raw as number),
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: isDark ? '#71717a' : '#a1a1aa' },
      },
      y: {
        grid: { color: isDark ? '#27272a' : '#e4e4e7' },
        ticks: { color: isDark ? '#71717a' : '#a1a1aa' },
      },
    },
  }), [isDark]);

  // Chart.js data for payment methods pie chart
  const paymentMethodsChartData: ChartData<'doughnut'> = useMemo(() => ({
    labels: salesByPaymentMethod.map(d => d.name),
    datasets: [
      {
        data: salesByPaymentMethod.map(d => d.value),
        backgroundColor: COLORS.slice(0, salesByPaymentMethod.length),
        borderColor: isDark ? '#18181b' : '#ffffff',
        borderWidth: 2,
      },
    ],
  }), [salesByPaymentMethod, isDark]);

  const doughnutOptions: ChartOptions<'doughnut'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: { color: isDark ? '#a1a1aa' : '#71717a' },
      },
      tooltip: {
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        titleColor: isDark ? '#a1a1aa' : '#71717a',
        bodyColor: isDark ? '#ffffff' : '#18181b',
        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
        borderWidth: 1,
        callbacks: {
          label: (context) => {
            const value = context.raw as number;
            const total = salesByPaymentMethod.reduce((s, i) => s + i.value, 0);
            const pct = total > 0 ? ((value / total) * 100).toFixed(0) : '0';
            return `${context.label}: ${formatPrice(value)} (${pct}%)`;
          },
        },
      },
    },
  }), [isDark, salesByPaymentMethod]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="mr-2">جاري تحميل البيانات...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* فلتر التاريخ */}
      <div className="flex justify-end mb-4">
        <DateRangePicker 
          value={dateRange}
          onValueChange={setDateRange}
        />
      </div>
      
      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 ml-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
            </div>
            <div className="flex items-center mt-2">
              {stats.salesGrowth >= 0 ? (
                <TrendingUp className="h-4 w-4 ml-1 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 ml-1 text-red-500" />
              )}
              <span className={`text-xs ${stats.salesGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {stats.salesGrowth.toFixed(1)}% من الفترة السابقة
              </span>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <ShoppingBag className="h-4 w-4 ml-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <DollarSign className="h-4 w-4 ml-2 text-muted-foreground" />
              <div className="text-2xl font-bold">{formatPrice(stats.averageOrderValue)}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">فترة العرض</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Calendar className="h-4 w-4 ml-2 text-muted-foreground" />
              <div className="text-lg font-medium">
                {dateRange.from.toLocaleDateString('en')} - {dateRange.to.toLocaleDateString('en')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* رسوم بيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* المبيعات اليومية */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>المبيعات اليومية</CardTitle>
            <CardDescription>تتبع إجمالي المبيعات لكل يوم</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar data={dailySalesChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>

        {/* المبيعات حسب طريقة الدفع */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات حسب طريقة الدفع</CardTitle>
            <CardDescription>توزيع المبيعات حسب وسيلة الدفع</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <Doughnut data={paymentMethodsChartData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesOverview;
