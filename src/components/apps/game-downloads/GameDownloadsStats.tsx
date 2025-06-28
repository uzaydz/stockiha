import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, Users, Clock, Gamepad2, Award } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/context/UserContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfWeek, startOfMonth, subDays, subMonths } from 'date-fns';
import { ar } from 'date-fns/locale';

interface Stats {
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  averageOrderValue: number;
  topGames: Array<{
    game_name: string;
    platform: string;
    download_count: number;
    revenue: number;
  }>;
  ordersByStatus: Array<{
    status: string;
    count: number;
  }>;
  revenueByPeriod: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  platformStats: Array<{
    platform: string;
    count: number;
    revenue: number;
  }>;
}

export default function GameDownloadsStats() {
  const { organizationId } = useUser();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('week');
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
    completedOrders: 0,
    cancelledOrders: 0,
    averageOrderValue: 0,
    topGames: [],
    ordersByStatus: [],
    revenueByPeriod: [],
    platformStats: [],
  });

  useEffect(() => {
    if (organizationId) {
      fetchStats();
    }
  }, [organizationId, period]);

  const fetchStats = async () => {
    try {
      setLoading(true);

      // تحديد الفترة الزمنية
      let startDate: Date;
      const endDate = new Date();
      
      switch (period) {
        case 'today':
          startDate = new Date();
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'week':
          startDate = startOfWeek(new Date(), { locale: ar });
          break;
        case 'month':
          startDate = startOfMonth(new Date());
          break;
        case '3months':
          startDate = subMonths(new Date(), 3);
          break;
        default:
          startDate = startOfWeek(new Date());
      }

      // جلب الطلبات
      const { data: orders, error: ordersError } = await supabase
        .from('game_download_orders')
        .select('*, game:games_catalog(name, platform)')
        .eq('organization_id', organizationId)
        .filter('created_at', 'gte', startDate.toISOString())
        .filter('created_at', 'lte', endDate.toISOString());

      if (ordersError) throw ordersError;

      // حساب الإحصائيات
      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + (order.price || 0), 0) || 0;
      const pendingOrders = orders?.filter(order => order.status === 'pending').length || 0;
      const completedOrders = orders?.filter(order => order.status === 'delivered').length || 0;
      const cancelledOrders = orders?.filter(order => order.status === 'cancelled').length || 0;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // حساب أفضل الألعاب
      const gameStats: { [key: string]: { count: number; revenue: number; platform: string } } = {};
      orders?.forEach(order => {
        if (order.game) {
          const gameName = order.game.name;
          if (!gameStats[gameName]) {
            gameStats[gameName] = { count: 0, revenue: 0, platform: order.game.platform };
          }
          gameStats[gameName].count++;
          gameStats[gameName].revenue += order.price || 0;
        }
      });

      const topGames = Object.entries(gameStats)
        .map(([game_name, data]) => ({
          game_name,
          platform: data.platform,
          download_count: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.download_count - a.download_count)
        .slice(0, 5);

      // حساب الطلبات حسب الحالة
      const statusCounts: { [key: string]: number } = {};
      orders?.forEach(order => {
        statusCounts[order.status] = (statusCounts[order.status] || 0) + 1;
      });
      
      const ordersByStatus = Object.entries(statusCounts).map(([status, count]) => ({
        status,
        count,
      }));

      // حساب الإيرادات حسب الفترة
      const revenueByDate: { [key: string]: { revenue: number; orders: number } } = {};
      orders?.forEach(order => {
        const date = format(new Date(order.created_at), 'yyyy-MM-dd');
        if (!revenueByDate[date]) {
          revenueByDate[date] = { revenue: 0, orders: 0 };
        }
        revenueByDate[date].revenue += order.price || 0;
        revenueByDate[date].orders++;
      });

      const revenueByPeriod = Object.entries(revenueByDate)
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // حساب إحصائيات المنصات
      const platformCounts: { [key: string]: { count: number; revenue: number } } = {};
      orders?.forEach(order => {
        if (order.game?.platform) {
          const platform = order.game.platform;
          if (!platformCounts[platform]) {
            platformCounts[platform] = { count: 0, revenue: 0 };
          }
          platformCounts[platform].count++;
          platformCounts[platform].revenue += order.price || 0;
        }
      });

      const platformStats = Object.entries(platformCounts).map(([platform, data]) => ({
        platform,
        count: data.count,
        revenue: data.revenue,
      }));

      setStats({
        totalOrders,
        totalRevenue,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        averageOrderValue,
        topGames,
        ordersByStatus,
        revenueByPeriod,
        platformStats,
      });
    } catch (error: any) {
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      pending: 'قيد الانتظار',
      processing: 'قيد المعالجة',
      ready: 'جاهز للتسليم',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      pending: 'bg-yellow-500',
      processing: 'bg-blue-500',
      ready: 'bg-purple-500',
      delivered: 'bg-green-500',
      cancelled: 'bg-red-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">إحصائيات تحميل الألعاب</h2>
          <p className="text-muted-foreground">تحليل أداء متجر تحميل الألعاب</p>
        </div>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="اختر الفترة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">اليوم</SelectItem>
            <SelectItem value="week">هذا الأسبوع</SelectItem>
            <SelectItem value="month">هذا الشهر</SelectItem>
            <SelectItem value="3months">آخر 3 شهور</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* البطاقات الرئيسية */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingOrders} قيد الانتظار
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الإيرادات</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRevenue.toFixed(2)} دج</div>
            <p className="text-xs text-muted-foreground">
              متوسط قيمة الطلب: {stats.averageOrderValue.toFixed(2)} دج
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات المكتملة</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0 ? ((stats.completedOrders / stats.totalOrders) * 100).toFixed(1) : 0}% من الإجمالي
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">الطلبات الملغية</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.cancelledOrders}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalOrders > 0 ? ((stats.cancelledOrders / stats.totalOrders) * 100).toFixed(1) : 0}% من الإجمالي
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* أفضل الألعاب */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              أفضل الألعاب
            </CardTitle>
            <CardDescription>الألعاب الأكثر طلباً</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topGames.map((game, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <Gamepad2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{game.game_name}</p>
                      <p className="text-xs text-muted-foreground">{game.platform}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{game.download_count} طلب</p>
                    <p className="text-xs text-muted-foreground">{game.revenue.toFixed(2)} دج</p>
                  </div>
                </div>
              ))}
              {stats.topGames.length === 0 && (
                <p className="text-center text-muted-foreground">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* توزيع الحالات */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              توزيع الطلبات حسب الحالة
            </CardTitle>
            <CardDescription>حالة الطلبات الحالية</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.ordersByStatus.map((item) => {
                const percentage = stats.totalOrders > 0 ? (item.count / stats.totalOrders) * 100 : 0;
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{getStatusLabel(item.status)}</span>
                      <span className="text-sm text-muted-foreground">{item.count}</span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getStatusColor(item.status)}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.ordersByStatus.length === 0 && (
                <p className="text-center text-muted-foreground">لا توجد بيانات</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* إحصائيات المنصات */}
      <Card>
        <CardHeader>
          <CardTitle>توزيع الطلبات حسب المنصة</CardTitle>
          <CardDescription>عدد الطلبات والإيرادات لكل منصة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.platformStats.map((platform) => (
              <div key={platform.platform} className="space-y-2">
                <div className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{platform.platform}</span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{platform.count}</p>
                  <p className="text-xs text-muted-foreground">
                    {platform.revenue.toFixed(2)} دج
                  </p>
                </div>
              </div>
            ))}
            {stats.platformStats.length === 0 && (
              <p className="col-span-4 text-center text-muted-foreground">لا توجد بيانات</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* الإيرادات عبر الزمن */}
      {stats.revenueByPeriod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الإيرادات عبر الفترة الزمنية</CardTitle>
            <CardDescription>تطور الإيرادات وعدد الطلبات</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.revenueByPeriod.map((item) => (
                <div key={item.date} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="text-sm">
                      {format(new Date(item.date), 'dd MMM yyyy', { locale: ar })}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{item.revenue.toFixed(2)} دج</p>
                    <p className="text-xs text-muted-foreground">{item.orders} طلب</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
