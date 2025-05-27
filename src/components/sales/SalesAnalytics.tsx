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
  LineChart,
  Line,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
import { formatPrice } from '@/lib/utils';
import { useShop } from '@/context/ShopContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Цветовая схема для графиков
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const SalesAnalytics = () => {
  const { orders, products, isLoading } = useShop();
  const [timeFrame, setTimeFrame] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [activeTab, setActiveTab] = useState('revenue');
  
  // بيانات المبيعات الزمنية
  const [revenueByTime, setRevenueByTime] = useState<any[]>([]);
  // بيانات المبيعات حسب الفئة
  const [salesByCategory, setSalesByCategory] = useState<any[]>([]);
  // بيانات المنتجات الأكثر مبيعًا
  const [topProducts, setTopProducts] = useState<any[]>([]);
  // بيانات متوسط قيمة الطلب بمرور الوقت
  const [avgOrderValue, setAvgOrderValue] = useState<any[]>([]);
  
  useEffect(() => {
    if (!isLoading && orders.length > 0) {
      // فلترة المبيعات الحقيقية (نقاط البيع)
      const posOrders = orders.filter(order => !order.isOnline);
      
      // 1. تجميع البيانات حسب الوقت
      const groupedByTime = groupOrdersByTime(posOrders, timeFrame);
      setRevenueByTime(groupedByTime);
      
      // 2. حساب متوسط قيمة الطلب بمرور الوقت
      const averageOrderValues = calculateAverageOrderValue(posOrders, timeFrame);
      setAvgOrderValue(averageOrderValues);
      
      // 3. تجميع المبيعات حسب الفئة
      const categories = groupOrdersByCategory(posOrders);
      setSalesByCategory(categories);
      
      // 4. تحديد المنتجات الأكثر مبيعًا
      const bestSellers = calculateTopProducts(posOrders, products);
      setTopProducts(bestSellers);
    }
  }, [isLoading, orders, products, timeFrame]);
  
  // دالة تجميع الطلبات حسب الفترة الزمنية
  const groupOrdersByTime = (orders: any[], timeFrame: string) => {
    const groupedData = new Map();
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key = '';
      
      switch (timeFrame) {
        case 'daily':
          // تنسيق مثل "2023-06-15"
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          // الحصول على رقم الأسبوع في السنة
          const weekNumber = getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNumber}`;
          break;
        case 'monthly':
          // تنسيق مثل "يونيو 2023"
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'yearly':
          key = `${date.getFullYear()}`;
          break;
      }
      
      const currentAmount = groupedData.get(key) || 0;
      groupedData.set(key, currentAmount + order.total);
    });
    
    // تحويل البيانات المجمعة إلى مصفوفة وترتيبها حسب التاريخ
    return Array.from(groupedData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([period, amount]) => {
        let name = period;
        
        // تنسيق الفترة الزمنية بشكل أفضل للعرض
        if (timeFrame === 'daily') {
          name = new Date(period).toLocaleDateString('en', { month: 'short', day: 'numeric' });
        } else if (timeFrame === 'weekly') {
          const [year, week] = period.split('-W');
          name = `Week ${week}, ${year}`;
        } else if (timeFrame === 'monthly') {
          const [year, month] = period.split('-');
          name = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en', { month: 'short', year: 'numeric' });
        }
        
        return { name, amount };
      });
  };
  
  // حساب متوسط قيمة الطلب حسب الفترة الزمنية
  const calculateAverageOrderValue = (orders: any[], timeFrame: string) => {
    const groupedOrders = new Map();
    const totalByPeriod = new Map();
    
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key = '';
      
      switch (timeFrame) {
        case 'daily':
          key = date.toISOString().split('T')[0];
          break;
        case 'weekly':
          const weekNumber = getWeekNumber(date);
          key = `${date.getFullYear()}-W${weekNumber}`;
          break;
        case 'monthly':
          key = `${date.getFullYear()}-${date.getMonth() + 1}`;
          break;
        case 'yearly':
          key = `${date.getFullYear()}`;
          break;
      }
      
      const currentCount = groupedOrders.get(key) || 0;
      groupedOrders.set(key, currentCount + 1);
      
      const currentTotal = totalByPeriod.get(key) || 0;
      totalByPeriod.set(key, currentTotal + order.total);
    });
    
    // حساب المتوسط لكل فترة
    const averages = Array.from(groupedOrders.keys()).map(key => {
      const count = groupedOrders.get(key) || 0;
      const total = totalByPeriod.get(key) || 0;
      const average = count > 0 ? total / count : 0;
      
      let name = key;
      
      // تنسيق الفترة الزمنية
      if (timeFrame === 'daily') {
        name = new Date(key).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      } else if (timeFrame === 'weekly') {
        const [year, week] = key.split('-W');
        name = `Week ${week}, ${year}`;
      } else if (timeFrame === 'monthly') {
        const [year, month] = key.split('-');
        name = new Date(parseInt(year), parseInt(month) - 1, 1).toLocaleDateString('en', { month: 'short', year: 'numeric' });
      }
      
      return { name, value: average };
    });
    
    return averages.sort((a, b) => a.name.localeCompare(b.name));
  };
  
  // تجميع الطلبات حسب الفئة
  const groupOrdersByCategory = (orders: any[]) => {
    const salesByCategory = new Map();
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const category = product.category;
          // استخدام السعر الموجود في العنصر نفسه (قد يكون سعر الجملة)
          const itemPrice = item.totalPrice;
          const currentAmount = salesByCategory.get(category) || 0;
          salesByCategory.set(category, currentAmount + itemPrice);
        }
      });
    });
    
    return Array.from(salesByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
  };
  
  // حساب المنتجات الأكثر مبيعًا
  const calculateTopProducts = (orders: any[], products: any[]) => {
    const productSales = new Map();
    const productAmount = new Map();
    
    orders.forEach(order => {
      order.items.forEach((item: any) => {
        const currentQuantity = productSales.get(item.productId) || 0;
        productSales.set(item.productId, currentQuantity + item.quantity);
        
        // حساب المبلغ الإجمالي لكل منتج مع مراعاة سعر الجملة
        const currentAmount = productAmount.get(item.productId) || 0;
        productAmount.set(item.productId, currentAmount + item.totalPrice);
      });
    });
    
    // أخذ أعلى 10 منتجات من حيث المبيعات
    return Array.from(productSales.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([productId, quantity]) => {
        const product = products.find(p => p.id === productId);
        const amount = productAmount.get(productId) || 0;
        
        return {
          name: product?.name || 'غير معروف',
          value: quantity,
          amount: amount,
          // إضافة علامة لتوضيح ما إذا كان سعر الجملة مطبق على هذا المنتج
          hasWholesale: orders.some(order => 
            order.items.some(item => 
              item.productId === productId && item.isWholesale
            )
          )
        };
      });
  };
  
  // مساعدة لحساب رقم الأسبوع من التاريخ
  const getWeekNumber = (date: Date) => {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  };
  
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
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">تحليلات المبيعات</h2>
        <Select 
          value={timeFrame} 
          onValueChange={(value) => setTimeFrame(value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="اختر الفترة الزمنية" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">يومي</SelectItem>
            <SelectItem value="weekly">أسبوعي</SelectItem>
            <SelectItem value="monthly">شهري</SelectItem>
            <SelectItem value="yearly">سنوي</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="revenue">الإيرادات</TabsTrigger>
          <TabsTrigger value="products">المنتجات</TabsTrigger>
          <TabsTrigger value="categories">الفئات</TabsTrigger>
          <TabsTrigger value="avg">متوسط الطلب</TabsTrigger>
        </TabsList>
        
        {/* تحليل الإيرادات */}
        <TabsContent value="revenue" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>إيرادات المبيعات بمرور الوقت</CardTitle>
              <CardDescription>مجموع الإيرادات لكل فترة زمنية</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueByTime}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatPrice(value as number)} />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                      name="الإيرادات" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تحليل المنتجات */}
        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>أكثر المنتجات مبيعًا</CardTitle>
              <CardDescription>أعلى 10 منتجات من حيث كمية المبيعات</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topProducts}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="name" />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8884d8" name="الكمية" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* تحليل الفئات */}
        <TabsContent value="categories" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>المبيعات حسب الفئة</CardTitle>
              <CardDescription>توزيع مبيعات المنتجات حسب الفئة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={salesByCategory}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {salesByCategory.map((entry, index) => (
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
        </TabsContent>
        
        {/* تحليل متوسط قيمة الطلب */}
        <TabsContent value="avg" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>متوسط قيمة الطلب</CardTitle>
              <CardDescription>متوسط قيمة الطلب بمرور الوقت</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={avgOrderValue}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatPrice(value as number)} />
                    <Bar dataKey="value" fill="#82ca9d" name="متوسط قيمة الطلب" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SalesAnalytics;
