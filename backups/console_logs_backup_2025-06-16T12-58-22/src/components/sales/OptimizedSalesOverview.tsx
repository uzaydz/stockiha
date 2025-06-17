import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { Loader2, TrendingUp, TrendingDown, DollarSign, Users, ShoppingBag, Calendar } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useDashboardOrders } from '@/context/DashboardDataContext';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Цветовая схема для графиков
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const OptimizedSalesOverview = () => {
  const { orders, isLoading } = useDashboardOrders();
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
    if (!isLoading && orders && orders.length > 0) {
      // فلترة الطلبات حسب نطاق التاريخ - تعامل مع نوع Order من DashboardDataContext
      const filteredOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at || order.createdAt);
        return orderDate >= dateRange.from && orderDate <= dateRange.to && !order.is_online;
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
      const totalSales = filteredOrders.reduce((sum, order) => sum + (order.total_price || order.total), 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalSales / totalOrders;
      
      // حساب نمو المبيعات (مقارنة بالفترة السابقة)
      const previousPeriodStart = new Date(dateRange.from);
      previousPeriodStart.setDate(previousPeriodStart.getDate() - (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 3600 * 24));
      
      const previousPeriodOrders = orders.filter(order => {
        const orderDate = new Date(order.created_at || order.createdAt);
        return orderDate >= previousPeriodStart && orderDate < dateRange.from && !order.is_online;
      });
      
      const previousPeriodSales = previousPeriodOrders.reduce((sum, order) => sum + (order.total_price || order.total), 0);
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
        const orderDate = new Date(order.created_at || order.createdAt);
        const dateKey = orderDate.toISOString().split('T')[0];
        const currentSales = salesByDay.get(dateKey) || 0;
        salesByDay.set(dateKey, currentSales + (order.total_price || order.total));
      });
      
      const dailySalesData = Array.from(salesByDay.entries())
        .map(([date, amount]) => ({
          name: new Date(date).toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' }),
          amount: amount
        }))
        .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
      
      setDailySales(dailySalesData);
      
      // بناء بيانات المبيعات حسب طريقة الدفع
      const paymentMethods = new Map<string, number>();
      filteredOrders.forEach(order => {
        const method = order.payment_method || 'نقدي';
        const currentSales = paymentMethods.get(method) || 0;
        paymentMethods.set(method, currentSales + (order.total_price || order.total));
      });
      
      const paymentMethodData = Array.from(paymentMethods.entries()).map(([name, value]) => ({
        name: name,
        value: value
      }));
      
      setSalesByPaymentMethod(paymentMethodData);
    }
  }, [isLoading, orders, dateRange]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* فلتر النطاق الزمني */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">نظرة عامة على المبيعات</h2>
          <p className="text-muted-foreground">تحليل شامل لأداء المبيعات</p>
        </div>
        <DateRangePicker
          selected={dateRange}
          onSelect={setDateRange}
        />
      </div>

      {/* البطاقات الإحصائية */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalSales)}</div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.salesGrowth > 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                  <span className="text-green-500">+{stats.salesGrowth.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
                  <span className="text-red-500">{stats.salesGrowth.toFixed(1)}%</span>
                </>
              )}
              <span className="mr-1">عن الفترة السابقة</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">عدد الطلبات</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              طلب في الفترة المحددة
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.averageOrderValue)}</div>
            <p className="text-xs text-muted-foreground">
              لكل طلب
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">العملاء</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              عميل مختلف
            </p>
          </CardContent>
        </Card>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* رسم بياني للمبيعات اليومية */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات اليومية</CardTitle>
            <CardDescription>تطور المبيعات خلال الفترة المحددة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: any) => [formatPrice(value), 'المبيعات']} />
                <Bar dataKey="amount" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* رسم بياني لطرق الدفع */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات حسب طريقة الدفع</CardTitle>
            <CardDescription>توزيع المبيعات على طرق الدفع المختلفة</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={salesByPaymentMethod}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                >
                  {salesByPaymentMethod.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [formatPrice(value), 'المبيعات']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OptimizedSalesOverview; 