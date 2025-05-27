import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { useShop } from '@/context/ShopContext';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { formatPrice } from '@/lib/utils';
import { Loader2, FileDown, Printer, BarChart3, Clock, Users, ShoppingBag } from 'lucide-react';
import { DateRange } from "react-day-picker";

const SalesReports = () => {
  const { orders, users, isLoading } = useShop();
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date()
  });
  
  // استخراج البيانات المفلترة حسب التاريخ
  const getFilteredOrders = () => {
    return orders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= dateRange.from && (!dateRange.to || orderDate <= dateRange.to) && !order.isOnline;
    });
  };
  
  // حساب ملخص المبيعات
  const calculateSalesSummary = (filteredOrders: any[]) => {
    const totalSales = filteredOrders.reduce((sum, order) => sum + order.total, 0);
    const totalOrders = filteredOrders.length;
    const totalProducts = filteredOrders.reduce(
      (sum, order) => sum + order.items.reduce((itemSum: number, item: any) => itemSum + item.quantity, 0), 
      0
    );
    
    const completedOrders = filteredOrders.filter(order => order.status === 'completed');
    const completedSales = completedOrders.reduce((sum, order) => sum + order.total, 0);
    
    const uniqueCustomers = new Set(filteredOrders.map(order => order.customerId)).size;
    
    // بيانات المبيعات بالجملة
    let wholesaleItems = 0;
    let wholesaleAmount = 0;
    let regularAmount = 0;
    let wholesaleSavings = 0;
    
    filteredOrders.forEach(order => {
      order.items.forEach((item: any) => {
        if (item.isWholesale) {
          wholesaleItems += item.quantity;
          wholesaleAmount += item.totalPrice;
          // حساب الوفورات من خلال مقارنة السعر الأصلي بسعر الجملة
          if (item.originalPrice) {
            wholesaleSavings += (item.originalPrice - item.unitPrice) * item.quantity;
          }
        } else {
          regularAmount += item.totalPrice;
        }
      });
    });
    
    // معلومات طرق الدفع
    const paymentMethods: {[key: string]: {count: number, amount: number}} = {};
    filteredOrders.forEach(order => {
      if (!paymentMethods[order.paymentMethod]) {
        paymentMethods[order.paymentMethod] = { count: 0, amount: 0 };
      }
      paymentMethods[order.paymentMethod].count += 1;
      paymentMethods[order.paymentMethod].amount += order.total;
    });
    
    return {
      totalSales,
      totalOrders,
      totalProducts,
      completedSales,
      uniqueCustomers,
      paymentMethods,
      wholesaleItems,
      wholesaleAmount,
      regularAmount,
      wholesaleSavings,
      // نسبة المبيعات بالجملة من إجمالي المبيعات
      wholesalePercentage: totalSales > 0 ? (wholesaleAmount / totalSales) * 100 : 0
    };
  };
  
  // حساب المبيعات اليومية
  const calculateDailySales = (filteredOrders: any[]) => {
    const dailySales: {[key: string]: {count: number, amount: number}} = {};
    
    filteredOrders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!dailySales[date]) {
        dailySales[date] = { count: 0, amount: 0 };
      }
      dailySales[date].count += 1;
      dailySales[date].amount += order.total;
    });
    
    // تحويل إلى مصفوفة وترتيبها حسب التاريخ
    return Object.entries(dailySales)
      .map(([date, data]) => ({
        date,
        count: data.count,
        amount: data.amount,
        formattedDate: new Date(date).toLocaleDateString('en', {
          weekday: 'short',
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };
  
  // حساب المبيعات حسب الموظف
  const calculateSalesByEmployee = (filteredOrders: any[]) => {
    const employeeSales: {[key: string]: {count: number, amount: number}} = {};
    
    filteredOrders.forEach(order => {
      if (!order.employeeId) return;
      
      if (!employeeSales[order.employeeId]) {
        employeeSales[order.employeeId] = { count: 0, amount: 0 };
      }
      employeeSales[order.employeeId].count += 1;
      employeeSales[order.employeeId].amount += order.total;
    });
    
    // تحويل إلى مصفوفة وإضافة اسم الموظف
    return Object.entries(employeeSales)
      .map(([employeeId, data]) => {
        const employee = users?.find(u => u.id === employeeId);
        return {
          employeeId,
          employeeName: employee ? employee.name : 'غير معروف',
          count: data.count,
          amount: data.amount
        };
      })
      .sort((a, b) => b.amount - a.amount);
  };
  
  // رسم تقرير المبيعات
  const renderSalesReport = () => {
    const filteredOrders = getFilteredOrders();
    
    if (filteredOrders.length === 0) {
      return (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <ShoppingBag className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">لا توجد مبيعات في هذه الفترة</p>
              <p className="text-muted-foreground">
                حاول تغيير نطاق التاريخ للحصول على بيانات المبيعات
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    const summary = calculateSalesSummary(filteredOrders);
    const dailySales = calculateDailySales(filteredOrders);
    const employeeSales = calculateSalesByEmployee(filteredOrders);
    
    return (
      <div className="space-y-6">
        {/* ملخص المبيعات */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">إجمالي المبيعات</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatPrice(summary.totalSales)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                خلال الفترة من {dateRange.from.toLocaleDateString('en')} إلى {dateRange.to.toLocaleDateString('en')}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">عدد الطلبات</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalOrders}</div>
              <p className="text-xs text-muted-foreground mt-1">
                بمعدل {(summary.totalOrders / (
                  Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)) || 1
                )).toFixed(1)} طلب يوميًا
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">العملاء</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.uniqueCustomers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                عميل مختلف قاموا بالشراء
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* معلومات المبيعات بالجملة */}
        <Card>
          <CardHeader>
            <CardTitle>معلومات المبيعات بالجملة</CardTitle>
            <CardDescription>
              تفصيل المبيعات بسعر الجملة خلال الفترة المحددة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">إجمالي مبيعات الجملة</div>
                <div className="text-lg font-bold text-primary">{formatPrice(summary.wholesaleAmount)}</div>
                <div className="text-xs text-muted-foreground">
                  {summary.wholesalePercentage.toFixed(1)}% من إجمالي المبيعات
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">عدد المنتجات المباعة بسعر الجملة</div>
                <div className="text-lg font-bold text-primary">{summary.wholesaleItems}</div>
                <div className="text-xs text-muted-foreground">
                  من إجمالي {summary.totalProducts} منتج
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm text-muted-foreground">الوفورات من أسعار الجملة</div>
                <div className="text-lg font-bold text-emerald-600">{formatPrice(summary.wholesaleSavings)}</div>
                <div className="text-xs text-muted-foreground">
                  مقارنة بأسعار البيع العادية
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* طرق الدفع */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات حسب طريقة الدفع</CardTitle>
            <CardDescription>
              تفصيل المبيعات لكل طريقة دفع خلال الفترة المحددة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>طريقة الدفع</TableHead>
                  <TableHead className="text-center">عدد المعاملات</TableHead>
                  <TableHead className="text-center">نسبة المعاملات</TableHead>
                  <TableHead>إجمالي المبيعات</TableHead>
                  <TableHead className="text-center">نسبة المبيعات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(summary.paymentMethods).map(([method, data]) => (
                  <TableRow key={method}>
                    <TableCell className="font-medium">{method}</TableCell>
                    <TableCell className="text-center">{data.count}</TableCell>
                    <TableCell className="text-center">
                      {((data.count / summary.totalOrders) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{formatPrice(data.amount)}</TableCell>
                    <TableCell className="text-center">
                      {((data.amount / summary.totalSales) * 100).toFixed(1)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* المبيعات حسب الموظف */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات حسب الموظف</CardTitle>
            <CardDescription>
              تفصيل المبيعات لكل موظف خلال الفترة المحددة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الموظف</TableHead>
                  <TableHead className="text-center">عدد المبيعات</TableHead>
                  <TableHead className="text-center">نسبة المبيعات</TableHead>
                  <TableHead>إجمالي المبيعات</TableHead>
                  <TableHead className="text-center">متوسط قيمة الطلب</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeSales.map((employee) => (
                  <TableRow key={employee.employeeId}>
                    <TableCell className="font-medium">{employee.employeeName}</TableCell>
                    <TableCell className="text-center">{employee.count}</TableCell>
                    <TableCell className="text-center">
                      {((employee.count / summary.totalOrders) * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>{formatPrice(employee.amount)}</TableCell>
                    <TableCell className="text-center">
                      {formatPrice(employee.amount / employee.count)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* المبيعات اليومية */}
        <Card>
          <CardHeader>
            <CardTitle>المبيعات اليومية</CardTitle>
            <CardDescription>
              تفصيل المبيعات لكل يوم خلال الفترة المحددة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>التاريخ</TableHead>
                    <TableHead className="text-center">عدد الطلبات</TableHead>
                    <TableHead>إجمالي المبيعات</TableHead>
                    <TableHead className="text-center">متوسط قيمة الطلب</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailySales.map((day) => (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{day.formattedDate}</TableCell>
                      <TableCell className="text-center">{day.count}</TableCell>
                      <TableCell>{formatPrice(day.amount)}</TableCell>
                      <TableCell className="text-center">
                        {formatPrice(day.amount / day.count)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div>
          <h2 className="text-xl font-bold">تقارير المبيعات</h2>
          <p className="text-muted-foreground">
            عرض وتصدير تقارير مفصلة عن مبيعات نقاط البيع
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker 
            value={dateRange}
            onValueChange={setDateRange}
          />
          <div className="flex gap-2">
            <Button variant="outline" size="icon">
              <Printer className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <FileDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {renderSalesReport()}
    </div>
  );
};

export default SalesReports;
