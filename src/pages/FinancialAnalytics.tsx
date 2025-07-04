import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Calculator,
  PieChart,
  BarChart3,
  Calendar as CalendarIcon,
  Download,
  Filter,
  RefreshCw,
  Wrench,
  Gamepad2,
  Wifi,
  CreditCard,
  Smartphone
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { ar } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useTenant } from '@/context/TenantContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
  LineChart,
  Line
} from 'recharts';

// 🎨 ألوان التحليلات
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300'
];

// 📊 نوع البيانات المالية
interface FinancialData {
  total_revenue: number;
  total_cost: number;
  total_gross_profit: number;
  total_expenses: number;
  total_net_profit: number;
  profit_margin_percentage: number;
  pos_sales_revenue: number;
  pos_sales_cost: number;
  pos_sales_profit: number;
  pos_orders_count: number;
  online_sales_revenue: number;
  online_sales_cost: number;
  online_sales_profit: number;
  online_orders_count: number;
  repair_services_revenue: number;
  repair_services_profit: number;
  repair_orders_count: number;
  service_bookings_revenue: number;
  service_bookings_profit: number;
  service_bookings_count: number;
  game_downloads_revenue: number;
  game_downloads_profit: number;
  game_downloads_count: number;
  subscription_services_revenue: number;
  subscription_services_profit: number;
  subscription_transactions_count: number;
  currency_sales_revenue: number;
  currency_sales_profit: number;
  currency_sales_count: number;
  flexi_sales_revenue: number;
  flexi_sales_profit: number;
  flexi_sales_count: number;
  total_debt_amount: number;
  debt_impact_on_capital: number;
  paid_debt_amount: number;
  total_losses_cost: number;
  total_losses_selling_value: number;
  total_returns_amount: number;
  one_time_expenses: number;
  recurring_expenses_annual: number;
  avg_order_value: number;
  total_transactions_count: number;
  detailed_breakdown: any;
}

interface Employee {
  id: string;
  name: string;
  email: string;
}

const FinancialAnalytics: React.FC = () => {
  const { user } = useAuth();
  const { tenant } = useTenant();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date('2025-06-01T00:00:00.000Z'),
    to: new Date('2025-06-30T23:59:59.999Z')
  });
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 🔄 Console logs للتطوير
  console.log('🎯 FinancialAnalytics تم تحميل المكون');
  console.log('👤 بيانات المستخدم:', {
    userId: user?.id,
    organizationId: tenant?.id,
    userExists: !!user
  });
  console.log('📅 نطاق التاريخ الحالي:', {
    from: dateRange.from.toISOString(),
    to: dateRange.to.toISOString()
  });

  // 🔄 جلب البيانات المالية
  const { data: financialData, isLoading, refetch, error } = useQuery({
    queryKey: ['financial-analytics', dateRange, selectedEmployee, tenant?.id],
    queryFn: async (): Promise<FinancialData> => {
      console.log('🚀 بدء تنفيذ queryFn للتحليلات المالية');
      
      if (!tenant?.id) {
        console.error('❌ معرف المؤسسة غير موجود');
        throw new Error('Organization ID not found');
      }
      
      const orgId = tenant.id;
      
      console.log('🔍 بدء جلب البيانات المالية...');
      console.log('📋 معرف المؤسسة:', orgId);
      console.log('📅 التاريخ من:', dateRange.from.toISOString());
      console.log('📅 التاريخ إلى:', dateRange.to.toISOString());
      console.log('👤 معرف الموظف:', selectedEmployee === 'all' ? 'الكل' : selectedEmployee);
      
      // التحقق من وجود بيانات في المؤسسة
      console.log('🔎 التحقق من وجود طلبات...');
      const { data: ordersCheck, error: ordersError } = await supabase
        .from('orders')
        .select('id, total, created_at')
        .eq('organization_id', orgId)
        .limit(5);
      
      if (ordersError) {
        console.error('❌ خطأ في فحص الطلبات:', ordersError);
      } else {
        console.log('📦 عدد الطلبات الموجودة:', ordersCheck?.length || 0);
        if (ordersCheck && ordersCheck.length > 0) {
          console.log('📦 أول 5 طلبات:', ordersCheck);
        }
      }
      
      // التحقق من وجود طلبات إلكترونية
      console.log('🌐 التحقق من وجود طلبات إلكترونية...');
      const { data: onlineOrdersCheck, error: onlineError } = await supabase
        .from('online_orders')
        .select('id, total, created_at')
        .eq('organization_id', orgId)
        .limit(5);
      
      if (onlineError) {
        console.error('❌ خطأ في فحص الطلبات الإلكترونية:', onlineError);
      } else {
        console.log('🌐 عدد الطلبات الإلكترونية:', onlineOrdersCheck?.length || 0);
        if (onlineOrdersCheck && onlineOrdersCheck.length > 0) {
          console.log('🌐 أول 5 طلبات إلكترونية:', onlineOrdersCheck);
        }
      }
      
      // 🔍 معلومات الاستعلام
      console.group('🔍 معلومات الاستعلام');
      console.log('⚙️ معرف المؤسسة:', orgId);
      console.log('📅 النطاق الزمني:', {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        fromLocal: dateRange.from.toLocaleString('ar-DZ'),
        toLocal: dateRange.to.toLocaleString('ar-DZ')
      });
      console.log('👤 الموظف المحدد:', selectedEmployee === 'all' ? 'جميع الموظفين' : selectedEmployee);
      console.groupEnd();
      
      const { data, error } = await supabase.rpc('get_complete_financial_analytics' as any, {
        p_organization_id: orgId,
        p_start_date: dateRange.from.toISOString(),
        p_end_date: dateRange.to.toISOString(),
        p_employee_id: selectedEmployee === 'all' ? null : selectedEmployee
      });
      
      console.log('⚙️ تم استدعاء دالة get_complete_financial_analytics مع المعاملات:', {
        p_organization_id: orgId,
        p_start_date: dateRange.from.toISOString(),
        p_end_date: dateRange.to.toISOString(),
        p_employee_id: selectedEmployee === 'all' ? null : selectedEmployee
      });

      if (error) {
        console.error('❌ خطأ في دالة RPC:', error);
        console.error('❌ تفاصيل الخطأ:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }
      
      console.log('✅ استجابة دالة RPC:', data);
      console.log('📊 عدد النتائج المُرجعة:', data?.length || 0);
      
      if (data && data.length > 0) {
        console.log('📈 النتيجة الأولى:', data[0]);
        
        // 🔍 تحليل مفصل للخدمات
        const result = data[0];
        console.group('🔧 تحليل مفصل للخدمات');
        
        console.log('💰 خدمات التصليح:', {
          revenue: result.repair_services_revenue,
          profit: result.repair_services_profit,
          count: result.repair_orders_count
        });
        
        console.log('📅 حجز الخدمات:', {
          revenue: result.service_bookings_revenue,
          profit: result.service_bookings_profit,
          count: result.service_bookings_count
        });
        
        console.log('🎮 تحميل الألعاب:', {
          revenue: result.game_downloads_revenue,
          profit: result.game_downloads_profit,
          count: result.game_downloads_count
        });
        
        console.log('🔒 الاشتراكات:', {
          revenue: result.subscription_services_revenue,
          profit: result.subscription_services_profit,
          count: result.subscription_transactions_count
        });
        
        console.log('💱 بيع العملات:', {
          revenue: result.currency_sales_revenue,
          profit: result.currency_sales_profit,
          count: result.currency_sales_count
        });
        
        console.log('📱 بيع الفليكسي:', {
          revenue: result.flexi_sales_revenue,
          profit: result.flexi_sales_profit,
          count: result.flexi_sales_count
        });
        
        console.groupEnd();
        
        // 🔍 فحص النطاق الزمني المُرسل
        console.group('📅 تحليل النطاق الزمني');
        console.log('📅 التاريخ المُرسل - من:', dateRange.from.toISOString());
        console.log('📅 التاريخ المُرسل - إلى:', dateRange.to.toISOString());
        console.log('📅 المنطقة الزمنية الحالية:', Intl.DateTimeFormat().resolvedOptions().timeZone);
        console.log('📅 التاريخ المحلي - من:', dateRange.from.toLocaleString('ar-DZ'));
        console.log('📅 التاريخ المحلي - إلى:', dateRange.to.toLocaleString('ar-DZ'));
        console.groupEnd();
        
      } else {
        console.warn('⚠️ لم ترجع الدالة أي بيانات');
      }
      
      const resultData = (data?.[0] || {}) as FinancialData;
      console.log('🎯 البيانات النهائية:', resultData);
      
      return resultData;
    },
    enabled: !!tenant?.id
  });

  console.log('📊 حالة الاستعلام:', {
    isLoading,
    hasError: !!error,
    hasData: !!financialData,
    isEnabled: !!tenant?.id
  });

  if (error) {
    console.error('❌ خطأ في الاستعلام:', error);
  }
  
  // 🔍 طباعة البيانات الحالية حتى لو كانت من cache
  useEffect(() => {
    if (financialData) {
      console.group('🎯 البيانات الحالية (من cache أو جديدة)');
      console.log('📊 جميع البيانات:', financialData);
      
      console.log('💰 خدمات التصليح (cache):', {
        revenue: financialData.repair_services_revenue,
        profit: financialData.repair_services_profit,
        count: financialData.repair_orders_count
      });
      
      console.log('📅 حجز الخدمات (cache):', {
        revenue: financialData.service_bookings_revenue,
        profit: financialData.service_bookings_profit,
        count: financialData.service_bookings_count
      });
      
      console.log('🎮 تحميل الألعاب (cache):', {
        revenue: financialData.game_downloads_revenue,
        profit: financialData.game_downloads_profit,
        count: financialData.game_downloads_count
      });
      
      console.log('🔒 الاشتراكات (cache):', {
        revenue: financialData.subscription_services_revenue,
        profit: financialData.subscription_services_profit,
        count: financialData.subscription_transactions_count
      });
      
      console.groupEnd();
    }
  }, [financialData]);
  
  // 🔄 إجبار refetch عند تحميل الصفحة لأول مرة
  useEffect(() => {
    console.log('🔄 فرض إعادة تحميل البيانات...');
    refetch();
  }, []);

  // 🧑‍💼 قائمة الموظفين (مؤقتاً بدون جلب من قاعدة البيانات)
  const employees: Employee[] = [];

  // 🎯 تحديث البيانات
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
  };

  // 📅 تغيير الفترة الزمنية
  const handleDateRangeChange = (preset: string) => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: now, to: now });
        break;
      case 'week':
        setDateRange({ from: subDays(now, 7), to: now });
        break;
      case 'month':
        setDateRange({ from: startOfMonth(now), to: endOfMonth(now) });
        break;
      case 'year':
        setDateRange({ from: startOfYear(now), to: endOfYear(now) });
        break;
    }
  };

  // 📊 إعداد بيانات الرسوم البيانية
  const salesBreakdownData = financialData ? [
    { name: 'نقطة البيع', value: financialData.pos_sales_revenue, profit: financialData.pos_sales_profit },
    { name: 'المتجر الإلكتروني', value: financialData.online_sales_revenue, profit: financialData.online_sales_profit },
    { name: 'خدمات التصليح', value: financialData.repair_services_revenue, profit: financialData.repair_services_profit },
    { name: 'حجز الخدمات', value: financialData.service_bookings_revenue, profit: financialData.service_bookings_profit },
    { name: 'تحميل الألعاب', value: financialData.game_downloads_revenue, profit: financialData.game_downloads_profit },
    { name: 'الاشتراكات', value: financialData.subscription_services_revenue, profit: financialData.subscription_services_profit },
    { name: 'بيع العملات', value: financialData.currency_sales_revenue, profit: financialData.currency_sales_profit },
    { name: 'رصيد Flexi', value: financialData.flexi_sales_revenue, profit: financialData.flexi_sales_profit }
  ].filter(item => item.value > 0) : [];

  const profitAnalysisData = financialData ? [
    { name: 'الإيرادات الإجمالية', amount: financialData.total_revenue },
    { name: 'التكلفة الإجمالية', amount: financialData.total_cost },
    { name: 'الربح الإجمالي', amount: financialData.total_gross_profit },
    { name: 'المصروفات', amount: financialData.total_expenses },
    { name: 'الربح الصافي', amount: financialData.total_net_profit }
  ] : [];

  // 💰 تنسيق الأرقام
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>جارٍ تحميل التحليلات المالية...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6" dir="rtl">
      {/* 🎛️ شريط التحكم */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">التحليلات المالية الشاملة</h1>
          <p className="text-muted-foreground">
            تحليل تفصيلي للأرباح والمبيعات من جميع المصادر
          </p>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {/* تحديد الفترة الزمنية */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateRangeChange('today')}
            >
              اليوم
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateRangeChange('week')}
            >
              الأسبوع
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateRangeChange('month')}
            >
              الشهر
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => handleDateRangeChange('year')}
            >
              السنة
            </Button>
          </div>

          {/* اختيار الموظف */}
          <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="اختر الموظف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الموظفين</SelectItem>
              {/* employees.map(employee => (
                <SelectItem key={employee.id} value={employee.id}>
                  {employee.name}
                </SelectItem>
              )) */}
            </SelectContent>
          </Select>

          {/* زر التحديث */}
          <Button 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 ml-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* 📊 البطاقات الرئيسية */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الإيرادات الإجمالية</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(financialData?.total_revenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              من {financialData?.total_transactions_count || 0} معاملة
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الربح الصافي</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(financialData?.total_net_profit || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              هامش ربح {formatPercentage(financialData?.profit_margin_percentage || 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">متوسط قيمة الطلب</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(financialData?.avg_order_value || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              متوسط قيمة المعاملات
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">المديونية</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(financialData?.total_debt_amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              مدفوع: {formatCurrency(financialData?.paid_debt_amount || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 📈 التبويبات التفصيلية */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="sales">المبيعات</TabsTrigger>
          <TabsTrigger value="services">الخدمات</TabsTrigger>
          <TabsTrigger value="financial">الحالة المالية</TabsTrigger>
          <TabsTrigger value="detailed">التفاصيل</TabsTrigger>
        </TabsList>

        {/* 👁️ نظرة عامة */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* الرسم البياني للأرباح */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل الأرباح</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={profitAnalysisData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value as number)} />
                    <Bar dataKey="amount" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* توزيع المبيعات */}
            <Card>
              <CardHeader>
                <CardTitle>توزيع المبيعات حسب المصدر</CardTitle>
              </CardHeader>
              <CardContent>
                                 <ResponsiveContainer width="100%" height={300}>
                   <RechartsPieChart>
                     <Pie
                       dataKey="value"
                       data={salesBreakdownData}
                       cx="50%"
                       cy="50%"
                       outerRadius={80}
                       fill="#8884d8"
                       label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                     >
                       {salesBreakdownData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip formatter={(value) => formatCurrency(value as number)} />
                   </RechartsPieChart>
                 </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 🛒 المبيعات */}
        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* نقطة البيع */}
            <Card>
              <CardHeader>
                <CardTitle>نقطة البيع (POS)</CardTitle>
                <CardDescription>
                  {financialData?.pos_orders_count} طلب مكتمل
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>الإيرادات:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(financialData?.pos_sales_revenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>التكلفة:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialData?.pos_sales_cost || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>الربح:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(financialData?.pos_sales_profit || 0)}
                  </span>
                </div>
                <Progress 
                  value={financialData?.pos_sales_revenue ? 
                    (financialData.pos_sales_profit / financialData.pos_sales_revenue) * 100 : 0
                  } 
                  className="w-full"
                />
              </CardContent>
            </Card>

            {/* المتجر الإلكتروني */}
            <Card>
              <CardHeader>
                <CardTitle>المتجر الإلكتروني</CardTitle>
                <CardDescription>
                  {financialData?.online_orders_count} طلب مؤكد
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>الإيرادات:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(financialData?.online_sales_revenue || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>التكلفة:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialData?.online_sales_cost || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>الربح:</span>
                  <span className="font-bold text-blue-600">
                    {formatCurrency(financialData?.online_sales_profit || 0)}
                  </span>
                </div>
                <Progress 
                  value={financialData?.online_sales_revenue ? 
                    (financialData.online_sales_profit / financialData.online_sales_revenue) * 100 : 0
                  } 
                  className="w-full"
                />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 🔧 الخدمات */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* خدمات التصليح */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">خدمات التصليح</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-green-600">
                  {formatCurrency(financialData?.repair_services_profit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData?.repair_orders_count || 0} طلب مكتمل
                </p>
              </CardContent>
            </Card>

            {/* حجز الخدمات */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">حجز الخدمات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-blue-600">
                  {formatCurrency(financialData?.service_bookings_profit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData?.service_bookings_count || 0} حجز
                </p>
              </CardContent>
            </Card>

            {/* تحميل الألعاب */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">تحميل الألعاب</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-purple-600">
                  {formatCurrency(financialData?.game_downloads_profit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData?.game_downloads_count || 0} تحميل
                </p>
              </CardContent>
            </Card>

            {/* الاشتراكات */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">الاشتراكات</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold text-orange-600">
                  {formatCurrency(financialData?.subscription_services_profit || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {financialData?.subscription_transactions_count || 0} معاملة
                </p>
              </CardContent>
            </Card>
          </div>

          {/* بيع العملات والرصيد */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>بيع العملات الرقمية</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {formatCurrency(financialData?.currency_sales_profit || 0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {financialData?.currency_sales_count} عملية بيع
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>بيع رصيد Flexi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {formatCurrency(financialData?.flexi_sales_profit || 0)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {financialData?.flexi_sales_count} عملية بيع
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 💰 الحالة المالية */}
        <TabsContent value="financial" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* المديونية */}
            <Card>
              <CardHeader>
                <CardTitle>تحليل المديونية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>إجمالي المديونية:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialData?.total_debt_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>المبلغ المدفوع:</span>
                  <span className="font-semibold text-green-600">
                    {formatCurrency(financialData?.paid_debt_amount || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>تأثير على رأس المال:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(financialData?.debt_impact_on_capital || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* الخسائر والإرجاعات */}
            <Card>
              <CardHeader>
                <CardTitle>الخسائر والإرجاعات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>قيمة الخسائر (التكلفة):</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialData?.total_losses_cost || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>قيمة الخسائر (البيع):</span>
                  <span className="font-semibold text-red-400">
                    {formatCurrency(financialData?.total_losses_selling_value || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>الإرجاعات:</span>
                  <span className="font-bold text-orange-600">
                    {formatCurrency(financialData?.total_returns_amount || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* المصروفات */}
            <Card>
              <CardHeader>
                <CardTitle>المصروفات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>المصروفات العادية:</span>
                  <span className="font-semibold text-red-600">
                    {formatCurrency(financialData?.one_time_expenses || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>المصروفات المتكررة:</span>
                  <span className="font-semibold text-red-400">
                    {formatCurrency(financialData?.recurring_expenses_annual || 0)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span>إجمالي المصروفات:</span>
                  <span className="font-bold text-red-700">
                    {formatCurrency((financialData?.one_time_expenses || 0) + (financialData?.recurring_expenses_annual || 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 📋 التفاصيل */}
        <TabsContent value="detailed" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>البيانات التفصيلية الكاملة</CardTitle>
              <CardDescription>
                جميع البيانات المالية بالتفصيل (JSON)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-100 p-4 rounded-lg text-sm overflow-auto max-h-96">
                {JSON.stringify(financialData?.detailed_breakdown, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FinancialAnalytics;