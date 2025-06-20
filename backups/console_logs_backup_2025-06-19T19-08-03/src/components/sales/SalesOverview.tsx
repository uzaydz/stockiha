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
import { useShop } from '@/context/ShopContext';
import { DateRangePicker } from '@/components/ui/date-range-picker';

// Цветовая схема для графиков
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SalesOverview = () => {
  const { orders, isLoading } = useShop();
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
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dailySales}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatPrice(value as number)} />
                  <Bar dataKey="amount" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={salesByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {salesByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatPrice(value as number)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SalesOverview;
