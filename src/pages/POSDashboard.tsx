import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ShoppingCart, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Clock, 
  Star,
  BarChart3,
  PieChart,
  Activity,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

// استيراد POS Layout
import POSPureLayout from '@/components/pos-layout/POSPureLayout';

// مكونات فرعية
import RecentOrders from '../components/pos-dashboard/RecentOrders';
import SalesChart from '../components/pos-dashboard/SalesChart';
import TopProducts from '../components/pos-dashboard/TopProducts';
import QuickActions from '../components/pos-dashboard/QuickActions';
import StatsOverview from '../components/pos-dashboard/StatsOverview';
import StaffPerformance from '../components/pos-dashboard/StaffPerformance';

// الخدمة الجديدة
import { 
  getPOSDashboardData, 
  type POSDashboardData 
} from '@/services/posDashboardService';

interface POSDashboardProps {
  // يمكن إضافة props إضافية حسب الحاجة
}

const POSDashboard: React.FC<POSDashboardProps> = () => {
  const { user, userProfile, organization } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardData, setDashboardData] = useState<POSDashboardData | null>(null);

  // جلب البيانات من RPC
  const fetchDashboardData = async () => {
    // الحصول على organization_id من عدة مصادر
    const orgId = userProfile?.organization_id || 
                  organization?.id || 
                  localStorage.getItem('bazaar_organization_id');
    
    if (!orgId) {
      setError('لم يتم العثور على معرف المؤسسة');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log('🔄 [POS Dashboard] جاري جلب البيانات...');
      
      const data = await getPOSDashboardData(orgId);
      setDashboardData(data);
      
      console.log('✅ [POS Dashboard] تم جلب البيانات بنجاح');
      // ⚡ إزالة Toast التلقائي - يظهر فقط عند التحديث اليدوي
    } catch (err) {
      console.error('❌ [POS Dashboard] خطأ في جلب البيانات:', err);
      const errorMessage = err instanceof Error ? err.message : 'حدث خطأ في جلب البيانات';
      setError(errorMessage);
      
      // معالجة خاصة لانتهاء الجلسة
      if (errorMessage.includes('الجلسة منتهية') || errorMessage.includes('JWT')) {
        toast.error('انتهت صلاحية الجلسة. الرجاء تسجيل الدخول مرة أخرى', {
          duration: 5000,
          action: {
            label: 'تسجيل الدخول',
            onClick: () => {
              try {
                const isElectron = typeof window !== 'undefined' && window.navigator?.userAgent?.includes('Electron');
                if (isElectron) {
                  window.location.hash = '#/login';
                } else {
                  window.location.href = '/login';
                }
              } catch {
                window.location.href = '/login';
              }
            }
          }
        });
      } else {
        toast.error('فشل في تحميل بيانات لوحة التحكم');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // جلب البيانات عند التحميل
  useEffect(() => {
    // الانتظار حتى يتم تحميل بيانات المستخدم
    if (userProfile || organization) {
      fetchDashboardData();
    }
  }, [userProfile?.organization_id, organization?.id]);

  // تحويل البيانات للصيغة القديمة (للتوافق مع المكونات الحالية)
  const statsData = useMemo(() => {
    if (!dashboardData) {
      return {
        totalSales: 0,
        totalOrders: 0,
        totalCustomers: 0,
        totalProducts: 0,
        todaySales: 0,
        todayOrders: 0,
        growthRate: 0,
        avgOrderValue: 0
      };
    }

    return {
      totalSales: dashboardData.sales_stats.total_sales,
      totalOrders: dashboardData.orders_stats.total_orders,
      totalCustomers: dashboardData.customers_stats.total_customers,
      totalProducts: dashboardData.products_stats.total_products,
      todaySales: dashboardData.sales_stats.today_sales,
      todayOrders: dashboardData.orders_stats.today_orders,
      growthRate: dashboardData.sales_stats.growth_rate,
      avgOrderValue: dashboardData.orders_stats.avg_order_value
    };
  }, [dashboardData]);

  const quickActions = [
    {
      title: 'نقطة البيع',
      description: 'بدء عملية بيع جديدة',
      icon: ShoppingCart,
      href: '/dashboard/pos-advanced'
    },
    {
      title: 'إدارة المنتجات',
      description: 'إضافة أو تعديل المنتجات',
      icon: Package,
      href: '/products'
    },
    {
      title: 'العملاء',
      description: 'إدارة بيانات العملاء',
      icon: Users,
      href: '/customers'
    },
    {
      title: 'التقارير',
      description: 'عرض التقارير والإحصائيات',
      icon: BarChart3,
      href: '/reports'
    }
  ];

  const handleRefresh = async () => {
    await fetchDashboardData();
    toast.success('تم تحديث البيانات بنجاح');
  };

  return (
    <POSPureLayout
      onRefresh={handleRefresh}
      isRefreshing={isLoading}
      connectionStatus="connected"
    >
      {/* استخدام نفس البنية البسيطة مثل POSAdvanced */}
      <div className="h-full w-full overflow-hidden p-2 bg-gray-50 dark:bg-gray-900">
        <div className="h-full w-full flex flex-col gap-3 overflow-hidden">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex-shrink-0 overflow-hidden">
            <div className="px-4 py-3 sm:px-6 sm:py-4">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">
                    لوحة تحكم نقطة البيع
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
                    إدارة شاملة لنظام نقطة البيع
                  </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleRefresh}>
                    <RefreshCw className="h-4 w-4" />
                    <span className="hidden sm:inline">تحديث</span>
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="hidden sm:inline">الإعدادات</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
            <div className="p-4 sm:p-6">
        {/* حالة التحميل */}
        {isLoading && !dashboardData && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">جاري تحميل البيانات...</p>
            </div>
          </div>
        )}

        {/* حالة الخطأ */}
        {error && !isLoading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md w-full">
              <CardContent className="pt-6">
                <div className="text-center">
                  <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    حدث خطأ في تحميل البيانات
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                  <Button onClick={handleRefresh} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    إعادة المحاولة
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* المحتوى الرئيسي */}
        {!isLoading && !error && dashboardData && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 h-full flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
              <TabsTrigger value="sales">المبيعات</TabsTrigger>
              <TabsTrigger value="products">المنتجات</TabsTrigger>
              <TabsTrigger value="customers">العملاء</TabsTrigger>
            </TabsList>

            {/* نظرة عامة */}
            <TabsContent value="overview" className="space-y-4 flex-1 min-h-0 overflow-y-auto mt-0" data-state={activeTab === 'overview' ? 'active' : 'inactive'}>
              {/* إحصائيات سريعة */}
              <StatsOverview stats={statsData} />

            {/* الإجراءات السريعة */}
            <Card>
              <CardHeader>
                <CardTitle>الإجراءات السريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {quickActions.map((action, index) => (
                    <Card key={index} className="hover:shadow-sm transition-shadow cursor-pointer border">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded border bg-gray-50">
                            <action.icon className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-medium text-sm">{action.title}</h3>
                            <p className="text-xs text-gray-500">
                              {action.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* أداء الموظفين */}
            <StaffPerformance 
              staffData={dashboardData.staff_stats?.staff_list || []} 
              isLoading={isLoading}
            />

            {/* الرسوم البيانية والإحصائيات */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <SalesChart dailySales={dashboardData.daily_sales} />
              <TopProducts products={dashboardData.top_products} />
            </div>

            {/* الطلبات الأخيرة */}
            <RecentOrders orders={dashboardData.recent_orders} />
          </TabsContent>

          {/* المبيعات */}
          <TabsContent value="sales" className="space-y-4 flex-1 min-h-0 overflow-y-auto mt-0" data-state={activeTab === 'sales' ? 'active' : 'inactive'}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    إجمالي المبيعات اليوم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsData.todaySales.toLocaleString()} دج</div>
                  <p className="text-xs text-gray-500 mt-1">
                    +12.5% من أمس
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    عدد الطلبات اليوم
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsData.todayOrders}</div>
                  <p className="text-xs text-gray-500 mt-1">
                    +8.2% من أمس
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    متوسط قيمة الطلب
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statsData.avgOrderValue.toLocaleString()} دج</div>
                  <p className="text-xs text-gray-500 mt-1">
                    +5.1% هذا الأسبوع
                  </p>
                </CardContent>
              </Card>
            </div>

            {dashboardData && <SalesChart dailySales={dashboardData.daily_sales || []} />}
          </TabsContent>

          {/* المنتجات */}
          <TabsContent value="products" className="space-y-4 flex-1 min-h-0 overflow-y-auto mt-0" data-state={activeTab === 'products' ? 'active' : 'inactive'}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">إدارة المنتجات</h2>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة منتج
              </Button>
            </div>
            {dashboardData && <TopProducts products={dashboardData.top_products || []} />}
          </TabsContent>

          {/* العملاء */}
          <TabsContent value="customers" className="space-y-4 flex-1 min-h-0 overflow-y-auto mt-0" data-state={activeTab === 'customers' ? 'active' : 'inactive'}>
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">إدارة العملاء</h2>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة عميل
              </Button>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>إحصائيات العملاء</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{statsData.totalCustomers}</div>
                    <div className="text-sm text-gray-600">إجمالي العملاء</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">45</div>
                    <div className="text-sm text-gray-600">عملاء جدد هذا الشهر</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">78%</div>
                    <div className="text-sm text-gray-600">معدل العودة</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        )}
            </div>
          </div>
        </div>
      </div>
    </POSPureLayout>
  );
};

export default POSDashboard;
