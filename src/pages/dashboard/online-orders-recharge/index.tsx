import React from 'react';
import { Helmet } from 'react-helmet-async';
import { OnlineOrdersRechargeCard } from '@/components/dashboard/OnlineOrdersRechargeCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShoppingCart, 
  Package, 
  TrendingUp, 
  Zap, 
  Calendar,
  RefreshCw,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTenant } from '@/context/TenantContext';
import { toast } from 'sonner';

interface RechargePackage {
  id: string;
  name: string;
  description: string;
  orders_count: number;
  price: number;
  currency: string;
  is_active: boolean;
}

interface OrganizationLimits {
  current_limit: number;
  used_count: number;
  remaining_count: number;
  reset_date: string;
  last_recharge_date?: string;
}

interface RechargeHistory {
  id: string;
  package_name: string;
  orders_count: number;
  amount_paid: number;
  currency: string;
  status: string;
  processed_at: string;
  created_at: string;
}

const OnlineOrdersRechargePage: React.FC = () => {
  const { currentOrganization } = useTenant();
  const [packages, setPackages] = React.useState<RechargePackage[]>([]);
  const [limits, setLimits] = React.useState<OrganizationLimits | null>(null);
  const [rechargeHistory, setRechargeHistory] = React.useState<RechargeHistory[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [stats, setStats] = React.useState({
    totalRecharges: 0,
    totalAmount: 0,
    thisMonthRecharges: 0,
    thisMonthAmount: 0
  });

  // جلب البيانات
  React.useEffect(() => {
    if (currentOrganization?.id) {
      fetchData();
    }
  }, [currentOrganization?.id]);

  // إضافة console.log للتأكد من أن البيانات تصل
  React.useEffect(() => {
  }, [currentOrganization, packages, limits, rechargeHistory]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // جلب الحزم المتاحة
      const { data: packagesData, error: packagesError } = await supabase
        .from('online_orders_recharge_packages')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (packagesError) {
        toast.error('فشل في جلب حزم إعادة الشحن');
      } else {
        setPackages(packagesData || []);
      }

      // فحص حدود الطلبيات
      const { data: limitsData, error: limitsError } = await supabase
        .rpc('check_online_orders_limit', {
          p_organization_id: currentOrganization!.id
        });

      if (limitsError) {
        toast.error('فشل في فحص حدود الطلبيات');
      } else {
        setLimits(limitsData);
      }

      // جلب سجل إعادة الشحن - تبسيط الاستعلام
      let historyData = null;
      let historyError = null;
      
      try {
        const result = await supabase
          .from('online_orders_recharge_history')
          .select('*')
          .eq('organization_id', currentOrganization!.id)
          .order('created_at', { ascending: false });
        
        historyData = result.data;
        historyError = result.error;
      } catch (err) {
        historyData = [];
        historyError = null;
      }

      if (historyError) {
        // لا نرمي الخطأ، فقط نضع مصفوفة فارغة
      }
      
      const formattedHistory = (historyData || []).map(item => ({
        id: item.id,
        package_name: `حزمة ${item.orders_count} طلبية`,
        orders_count: item.orders_count,
        amount_paid: item.amount_paid,
        currency: item.currency,
        status: item.status,
        processed_at: item.processed_at,
        created_at: item.created_at
      }));
      
      setRechargeHistory(formattedHistory);

      // حساب الإحصائيات
      const totalRecharges = formattedHistory.length;
      const totalAmount = formattedHistory.reduce((sum, item) => sum + item.amount_paid, 0);
      const thisMonthRecharges = formattedHistory.filter(item => {
        const itemDate = new Date(item.created_at);
        const now = new Date();
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }).length;
      const thisMonthAmount = formattedHistory.filter(item => {
        const itemDate = new Date(item.created_at);
        const now = new Date();
        return itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
      }).reduce((sum, item) => sum + item.amount_paid, 0);

      setStats({
        totalRecharges,
        totalAmount,
        thisMonthRecharges,
        thisMonthAmount
      });

    } catch (error) {
      toast.error('فشل في جلب بيانات إعادة الشحن');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد المعالجة';
      case 'failed':
        return 'فشل';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <>
        <Helmet>
          <title>إعادة شحن الطلبيات الإلكترونية | لوحة التحكم</title>
        </Helmet>
        
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/20 rounded-lg flex items-center justify-center">
              <ShoppingCart className="h-6 w-6 text-rose-600 dark:text-rose-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">إعادة شحن الطلبيات الإلكترونية</h1>
              <p className="text-muted-foreground">إدارة حدود الطلبيات الإلكترونية وإعادة الشحن</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="text-muted-foreground">جاري تحميل البيانات...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>إعادة شحن الطلبيات الإلكترونية | لوحة التحكم</title>
      </Helmet>
      
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/20 rounded-lg flex items-center justify-center">
            <ShoppingCart className="h-6 w-6 text-rose-600 dark:text-rose-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">إعادة شحن الطلبيات الإلكترونية</h1>
            <p className="text-muted-foreground">إدارة حدود الطلبيات الإلكترونية وإعادة الشحن</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        {/* الإحصائيات العامة */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي إعادة الشحن</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRecharges}</div>
              <p className="text-xs text-muted-foreground">عملية إعادة شحن</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المدفوع</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">دينار جزائري</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">إعادة الشحن هذا الشهر</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonthRecharges}</div>
              <p className="text-xs text-muted-foreground">عملية</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">المدفوع هذا الشهر</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.thisMonthAmount.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">دينار جزائري</p>
            </CardContent>
          </Card>
        </div>

        {/* حالة الحدود الحالية */}
        {limits ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                حالة حدود الطلبيات الإلكترونية
              </CardTitle>
              <CardDescription>
                نظرة عامة على الحدود الحالية والاستخدام
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">{limits.current_limit}</div>
                  <div className="text-sm text-muted-foreground">الحد الحالي</div>
                  <div className="text-xs text-blue-600">طلبية إلكترونية</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{limits.used_count}</div>
                  <div className="text-sm text-muted-foreground">المستخدم</div>
                  <div className="text-xs text-green-600">طلبية هذا الشهر</div>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{limits.remaining_count}</div>
                  <div className="text-sm text-muted-foreground">المتبقي</div>
                  <div className="text-xs text-orange-600">طلبية متاحة</div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">إعادة تعيين الحدود:</span>
                  <span className="font-medium">
                    {new Date(limits.reset_date).toLocaleDateString('ar-SA')}
                  </span>
                </div>
                
                {limits.last_recharge_date && (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">آخر إعادة شحن:</span>
                    <span className="font-medium">
                      {new Date(limits.last_recharge_date).toLocaleDateString('ar-SA')}
                    </span>
                  </div>
                )}
              </div>

              {/* تنبيه إذا كان الحد منخفض */}
              {limits.remaining_count <= 10 && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    <div className="text-orange-800">
                      {limits.remaining_count <= 0 
                        ? 'تم استنفاذ جميع الطلبيات الإلكترونية. يرجى إعادة الشحن للاستمرار.'
                        : `الطلبيات الإلكترونية المتبقية منخفضة (${limits.remaining_count}). يرجى إعادة الشحن قريباً.`
                      }
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                حالة حدود الطلبيات الإلكترونية
              </CardTitle>
              <CardDescription>
                لا توجد بيانات متاحة للحدود الحالية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا يمكن تحميل بيانات الحدود حالياً</p>
                <Button 
                  onClick={fetchData} 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                >
                  إعادة المحاولة
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* الحزم المتاحة */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              حزم إعادة الشحن المتاحة
            </CardTitle>
            <CardDescription>
              اختر من بين الحزم المتاحة لإعادة شحن الطلبيات الإلكترونية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {packages.map((pkg) => (
                <div key={pkg.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">{pkg.name}</h4>
                    <Badge variant="secondary">{pkg.orders_count} طلبية</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{pkg.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-bold text-primary">
                      {pkg.price.toLocaleString()} {pkg.currency}
                    </div>
                    <Button size="sm" variant="outline">
                      اختيار
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* سجل إعادة الشحن */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              سجل إعادة الشحن
            </CardTitle>
            <CardDescription>
              تاريخ عمليات إعادة شحن الطلبيات الإلكترونية
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rechargeHistory.length > 0 ? (
              <div className="space-y-3">
                {rechargeHistory.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <CheckCircle className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{item.package_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {item.orders_count} طلبية بـ {item.amount_paid.toLocaleString()} {item.currency}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getStatusColor(item.status)}>
                        {getStatusText(item.status)}
                      </Badge>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString('ar-SA')}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.created_at).toLocaleTimeString('ar-SA')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">لا توجد عمليات إعادة شحن حتى الآن</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* زر تحديث البيانات */}
        <div className="flex justify-center">
          <Button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث البيانات
          </Button>
        </div>
      </div>
    </>
  );
};

export default OnlineOrdersRechargePage;
