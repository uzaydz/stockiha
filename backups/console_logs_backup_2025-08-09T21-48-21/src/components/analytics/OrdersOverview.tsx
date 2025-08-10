import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  ShoppingCart, 
  Globe, 
  TrendingUp, 
  TrendingDown, 
  DollarSign,
  Package,
  Users,
  Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatCurrency } from '@/lib/utils';

interface OrdersStats {
  pos_orders: {
    total_orders: number;
    active_orders: number;
    total_revenue: number;
    avg_order_value: number;
    earliest_order: string;
    latest_order: string;
  };
  online_orders: {
    total_orders: number;
    active_orders: number;
    total_revenue: number;
    avg_order_value: number;
    earliest_order: string;
    latest_order: string;
  };
}

interface OrderStatus {
  source: string;
  status: string;
  count: number;
  total_amount: number;
  avg_amount: number;
}

interface MonthlyTrend {
  source: string;
  month: string;
  order_count: number;
  total_revenue: number;
  avg_order_value: number;
}

const OrdersOverview: React.FC = () => {
  const [ordersStats, setOrdersStats] = useState<OrdersStats | null>(null);
  const [statusBreakdown, setStatusBreakdown] = useState<OrderStatus[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<MonthlyTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const fetchOrdersData = async () => {
    try {
      setLoading(true);
      
      // جلب البيانات من دالة التحليلات المالية الشاملة
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1); // آخر شهر
      
      // الحصول على معرف المؤسسة من جدول المستخدمين
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('المستخدم غير مسجل الدخول');
      }

      // الحصول على معرف المؤسسة من جدول users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userError || !userData?.organization_id) {
        throw new Error('معرف المؤسسة غير موجود');
      }

      const { data: analyticsData, error: analyticsError } = await supabase.rpc(
        'get_complete_financial_analytics' as any, 
        {
          p_organization_id: userData.organization_id,
          p_start_date: startDate.toISOString(),
          p_end_date: endDate.toISOString(),
          p_employee_id: null,
          p_branch_id: null,
          p_transaction_type: null,
          p_payment_method: null,
          p_min_amount: null,
          p_max_amount: null,
          p_include_partial_payments: true,
          p_include_refunds: true
        }
      );

      if (!analyticsError && analyticsData && Array.isArray(analyticsData) && analyticsData.length > 0) {
        const data = analyticsData[0] as any;
        
        // استخراج إحصائيات الطلبات من النتيجة
        if (data.pos_orders_stats || data.online_orders_stats) {
          const posStats = data.pos_orders_stats || {};
          const onlineStats = data.online_orders_stats || {};
          
          const processedPosStats = {
            total_orders: posStats.total_orders || 0,
            active_orders: posStats.active_orders || 0,
            total_revenue: posStats.total_revenue || 0,
            avg_order_value: posStats.avg_order_value || 0,
            earliest_order: posStats.earliest_order || '',
            latest_order: posStats.latest_order || ''
          };

          const processedOnlineStats = {
            total_orders: onlineStats.total_orders || 0,
            active_orders: onlineStats.active_orders || 0,
            total_revenue: onlineStats.total_revenue || 0,
            avg_order_value: onlineStats.avg_order_value || 0,
            earliest_order: onlineStats.earliest_order || '',
            latest_order: onlineStats.latest_order || ''
          };

          setOrdersStats({
            pos_orders: processedPosStats,
            online_orders: processedOnlineStats
          });

          // تحويل تفصيل الحالات
          const posStatusBreakdown = (posStats.status_breakdown || []).map((statusData: any) => ({
            source: 'POS Orders',
            status: statusData.status,
            count: statusData.status_count,
            total_amount: statusData.status_total,
            avg_amount: statusData.avg_amount
          }));

          const onlineStatusBreakdown = (onlineStats.status_breakdown || []).map((statusData: any) => ({
            source: 'Online Orders',
            status: statusData.status,
            count: statusData.status_count,
            total_amount: statusData.status_total,
            avg_amount: statusData.avg_amount
          }));

          setStatusBreakdown([...posStatusBreakdown, ...onlineStatusBreakdown]);
        }
      } else {
        // في حالة الفشل، استخدم الطريقة البديلة
        await fetchOrdersDataDirectly();
      }

    } catch (error) {
      await fetchOrdersDataDirectly();
    } finally {
      setLoading(false);
    }
  };

  // طريقة بديلة للجلب المباشر
  const fetchOrdersDataDirectly = async () => {
    try {
      const { data: posStats, error: posError } = await supabase
        .from('orders')
        .select('id, total, status, created_at, is_online')
        .or('is_online.is.null,is_online.eq.false');

      const { data: onlineStats, error: onlineError } = await supabase
        .from('online_orders')
        .select('id, total, status, created_at');

      if (!posError && posStats) {
        const activePos = posStats.filter(o => o.status !== 'cancelled');
        const processedPosStats = {
          total_orders: posStats.length,
          active_orders: activePos.length,
          total_revenue: activePos.reduce((sum, o) => sum + Number(o.total), 0),
          avg_order_value: activePos.length > 0 ? activePos.reduce((sum, o) => sum + Number(o.total), 0) / activePos.length : 0,
          earliest_order: posStats[0]?.created_at || '',
          latest_order: posStats[posStats.length - 1]?.created_at || ''
        };

        const activeOnline = onlineStats?.filter(o => o.status !== 'cancelled') || [];
        const processedOnlineStats = {
          total_orders: onlineStats?.length || 0,
          active_orders: activeOnline.length,
          total_revenue: activeOnline.reduce((sum, o) => sum + Number(o.total), 0),
          avg_order_value: activeOnline.length > 0 ? activeOnline.reduce((sum, o) => sum + Number(o.total), 0) / activeOnline.length : 0,
          earliest_order: onlineStats?.[0]?.created_at || '',
          latest_order: onlineStats?.[onlineStats.length - 1]?.created_at || ''
        };

        setOrdersStats({
          pos_orders: processedPosStats,
          online_orders: processedOnlineStats
        });

        // جلب تفصيل الحالات
        const posStatusBreakdown = Object.entries(
          posStats.reduce((acc: any, order) => {
            acc[order.status] = acc[order.status] || { count: 0, total_amount: 0 };
            acc[order.status].count += 1;
            acc[order.status].total_amount += Number(order.total);
            return acc;
          }, {})
        ).map(([status, data]: any) => ({
          source: 'POS Orders',
          status,
          count: data.count,
          total_amount: data.total_amount,
          avg_amount: data.total_amount / data.count
        }));

        const onlineStatusBreakdown = Object.entries(
          (onlineStats || []).reduce((acc: any, order) => {
            acc[order.status] = acc[order.status] || { count: 0, total_amount: 0 };
            acc[order.status].count += 1;
            acc[order.status].total_amount += Number(order.total);
            return acc;
          }, {})
        ).map(([status, data]: any) => ({
          source: 'Online Orders',
          status,
          count: data.count,
          total_amount: data.total_amount,
          avg_amount: data.total_amount / data.count
        }));

        setStatusBreakdown([...posStatusBreakdown, ...onlineStatusBreakdown]);
      }
    } catch (error) {
    }
  };

  const calculateGrowthRate = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getStatusColor = (status: string): string => {
    const colors: { [key: string]: string } = {
      'completed': 'bg-green-500',
      'shipped': 'bg-blue-500',
      'delivered': 'bg-emerald-500',
      'pending': 'bg-yellow-500',
      'processing': 'bg-orange-500',
      'cancelled': 'bg-red-500'
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">جاري تحميل بيانات الطلبات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-right">إحصائيات الطلبات</h2>
        <Badge variant="outline" className="text-xs">
          <Calendar className="w-3 h-3 mr-1" />
          محدث الآن
        </Badge>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
          <TabsTrigger value="breakdown">تفصيل الحالات</TabsTrigger>
          <TabsTrigger value="trends">الاتجاهات الشهرية</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {ordersStats && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* إحصائيات POS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">طلبات نقطة البيع</CardTitle>
                  <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {ordersStats.pos_orders.total_orders?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {ordersStats.pos_orders.active_orders?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">طلبات نشطة</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
                        <span className="font-medium">
                          {formatCurrency(ordersStats.pos_orders.total_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">متوسط قيمة الطلب</span>
                        <span className="font-medium">
                          {formatCurrency(ordersStats.pos_orders.avg_order_value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* إحصائيات المتجر الإلكتروني */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">طلبات المتجر الإلكتروني</CardTitle>
                  <Globe className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {ordersStats.online_orders.total_orders?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {ordersStats.online_orders.active_orders?.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">طلبات نشطة</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">إجمالي الإيرادات</span>
                        <span className="font-medium">
                          {formatCurrency(ordersStats.online_orders.total_revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">متوسط قيمة الطلب</span>
                        <span className="font-medium">
                          {formatCurrency(ordersStats.online_orders.avg_order_value)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* مقارنة سريعة */}
          {ordersStats && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">مقارنة سريعة</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">إجمالي الطلبات</div>
                    <div className="space-y-2">
                      <div className="text-lg font-semibold">
                        {(ordersStats.pos_orders.total_orders + ordersStats.online_orders.total_orders).toLocaleString()}
                      </div>
                      <Progress 
                        value={(ordersStats.pos_orders.total_orders / (ordersStats.pos_orders.total_orders + ordersStats.online_orders.total_orders)) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        POS: {((ordersStats.pos_orders.total_orders / (ordersStats.pos_orders.total_orders + ordersStats.online_orders.total_orders)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">إجمالي الإيرادات</div>
                    <div className="space-y-2">
                      <div className="text-lg font-semibold">
                        {formatCurrency(ordersStats.pos_orders.total_revenue + ordersStats.online_orders.total_revenue)}
                      </div>
                      <Progress 
                        value={(ordersStats.pos_orders.total_revenue / (ordersStats.pos_orders.total_revenue + ordersStats.online_orders.total_revenue)) * 100} 
                        className="h-2"
                      />
                      <div className="text-xs text-muted-foreground">
                        POS: {((ordersStats.pos_orders.total_revenue / (ordersStats.pos_orders.total_revenue + ordersStats.online_orders.total_revenue)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-sm text-muted-foreground mb-2">متوسط قيمة الطلب</div>
                    <div className="space-y-2">
                      <div className="flex justify-center items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          POS: {formatCurrency(ordersStats.pos_orders.avg_order_value)}
                        </Badge>
                      </div>
                      <div className="flex justify-center items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Online: {formatCurrency(ordersStats.online_orders.avg_order_value)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="breakdown" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* طلبات POS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">حالات طلبات نقطة البيع</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusBreakdown
                    .filter(status => status.source === 'POS Orders')
                    .map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                        <div>
                          <div className="font-medium">{status.status}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(status.avg_amount)} متوسط
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{status.count.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(status.total_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* طلبات المتجر الإلكتروني */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">حالات طلبات المتجر الإلكتروني</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {statusBreakdown
                    .filter(status => status.source === 'Online Orders')
                    .map((status, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor(status.status)}`}></div>
                        <div>
                          <div className="font-medium">{status.status}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(status.avg_amount)} متوسط
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{status.count.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">
                          {formatCurrency(status.total_amount)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">الاتجاهات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  monthlyTrends.reduce((acc: { [key: string]: MonthlyTrend[] }, trend) => {
                    const month = new Date(trend.month).toLocaleDateString('ar-EG', { 
                      year: 'numeric', 
                      month: 'long' 
                    });
                    if (!acc[month]) acc[month] = [];
                    acc[month].push(trend);
                    return acc;
                  }, {})
                )
                  .slice(0, 6)
                  .map(([month, trends]) => (
                    <div key={month} className="p-4 rounded-lg border">
                      <h4 className="font-semibold mb-3 text-right">{month}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {trends.map((trend, index) => (
                          <div key={index} className="flex justify-between items-center">
                            <div>
                              <div className="text-sm font-medium">
                                {trend.source === 'POS Orders' ? 'نقطة البيع' : 'المتجر الإلكتروني'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {trend.order_count} طلب
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">
                                {formatCurrency(trend.total_revenue)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatCurrency(trend.avg_order_value)} متوسط
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrdersOverview;
