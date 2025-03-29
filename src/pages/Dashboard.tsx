
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  ShoppingBag, 
  Users, 
  AlertTriangle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/Layout';
import { dashboardStats } from '@/data/mockData';
import { useShop } from '@/context/ShopContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

const StatCard = ({ title, value, icon, description, trend, trendValue }: StatCardProps) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(trend || description) && (
          <p className="text-xs text-muted-foreground mt-1">
            {trend && (
              <span className={`inline-flex items-center ${
                trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : ''
              }`}>
                {trend === 'up' ? <TrendingUp className="mr-1 h-3 w-3" /> : 
                 trend === 'down' ? <TrendingDown className="mr-1 h-3 w-3" /> : null}
                {trendValue}
              </span>
            )}
            {description && <span> {description}</span>}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

const Dashboard = () => {
  const { products, orders } = useShop();
  const stats = dashboardStats;
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'annual'>('monthly');
  
  // Low stock products
  const lowStockProducts = products
    .filter(product => product.stockQuantity <= 5 && product.stockQuantity > 0)
    .slice(0, 5);
  
  // Recent orders
  const recentOrders = orders.slice(0, 5);
  
  // Revenue data
  const revenueData = [
    { month: 'يناير', revenue: 25000 },
    { month: 'فبراير', revenue: 30000 },
    { month: 'مارس', revenue: 35000 },
    { month: 'أبريل', revenue: 40000 },
    { month: 'مايو', revenue: 45000 },
    { month: 'يونيو', revenue: 50000 }
  ];
  
  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">لوحة التحكم</h1>
            <p className="text-muted-foreground">
              نظرة عامة على متجرك ومبيعاتك وطلباتك
            </p>
          </div>
          <Tabs defaultValue="monthly" className="w-[400px]">
            <TabsList className="grid grid-cols-4">
              <TabsTrigger value="daily" onClick={() => setTimeframe('daily')}>يومي</TabsTrigger>
              <TabsTrigger value="weekly" onClick={() => setTimeframe('weekly')}>أسبوعي</TabsTrigger>
              <TabsTrigger value="monthly" onClick={() => setTimeframe('monthly')}>شهري</TabsTrigger>
              <TabsTrigger value="annual" onClick={() => setTimeframe('annual')}>سنوي</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="المبيعات"
            value={`${stats.sales[timeframe]} ر.س`}
            icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
            trend="up"
            trendValue="+12.5% من الشهر الماضي"
          />
          <StatCard
            title="الإيرادات"
            value={`${stats.revenue[timeframe]} ر.س`}
            icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
            trend="up"
            trendValue="+8.2% من الشهر الماضي"
          />
          <StatCard
            title="الأرباح"
            value={`${stats.profits[timeframe]} ر.س`}
            icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
            trend="up"
            trendValue="+5.1% من الشهر الماضي"
          />
          <StatCard
            title="الطلبات"
            value={stats.orders.total}
            icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
            description={`${stats.orders.pending} قيد الانتظار، ${stats.orders.processing} قيد المعالجة`}
          />
        </div>
        
        {/* Charts and Reports */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Revenue Chart */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>تحليل المبيعات</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
              <div className="h-[200px] w-full">
                <div className="flex items-end h-full gap-2 pr-10 pl-2">
                  {revenueData.map((item, index) => (
                    <div key={index} className="relative h-full flex flex-col justify-end items-center flex-1">
                      <div className="text-xs text-muted-foreground absolute top-0">
                        {item.revenue} ر.س
                      </div>
                      <div 
                        className="bg-primary/90 rounded-t-md w-full"
                        style={{ height: `${(item.revenue / 50000) * 100}%` }}
                      />
                      <div className="text-xs pt-1">{item.month}</div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Order Status */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>حالة الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-yellow-500 mr-1" />
                      <div className="text-sm font-medium">قيد الانتظار</div>
                    </div>
                    <div className="text-sm font-medium">{stats.orders.pending}</div>
                  </div>
                  <Progress value={(stats.orders.pending / stats.orders.total) * 100} className="h-2 bg-muted" indicatorClassName="bg-yellow-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-blue-500 mr-1" />
                      <div className="text-sm font-medium">قيد المعالجة</div>
                    </div>
                    <div className="text-sm font-medium">{stats.orders.processing}</div>
                  </div>
                  <Progress value={(stats.orders.processing / stats.orders.total) * 100} className="h-2 bg-muted" indicatorClassName="bg-blue-500" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-green-500 mr-1" />
                      <div className="text-sm font-medium">مكتملة</div>
                    </div>
                    <div className="text-sm font-medium">{stats.orders.completed}</div>
                  </div>
                  <Progress value={(stats.orders.completed / stats.orders.total) * 100} className="h-2 bg-muted" indicatorClassName="bg-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Tables Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Orders */}
          <Card>
            <CardHeader>
              <CardTitle>أحدث الطلبات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">طلب #{order.id}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <div className={`h-2 w-2 rounded-full ${
                          order.status === 'completed' ? 'bg-green-500' :
                          order.status === 'processing' ? 'bg-blue-500' :
                          order.status === 'pending' ? 'bg-yellow-500' :
                          'bg-red-500'
                        } mr-1`} />
                        <span>
                          {order.status === 'completed' ? 'مكتمل' :
                           order.status === 'processing' ? 'قيد المعالجة' :
                           order.status === 'pending' ? 'قيد الانتظار' :
                           'ملغي'}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{order.total} ر.س</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <Link to="/dashboard/orders">عرض جميع الطلبات</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* Low Stock Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mr-2" />
                تنبيه المخزون المنخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lowStockProducts.length > 0 ? (
                  <>
                    {lowStockProducts.map((product) => (
                      <div key={product.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-md bg-muted mr-2 overflow-hidden">
                            <img
                              src={product.thumbnailImage || '/placeholder.svg'}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <p className="text-sm font-medium truncate max-w-[150px]">
                            {product.name}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">
                            المتبقي: <span className="text-yellow-500">{product.stockQuantity}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">{product.sku}</p>
                        </div>
                      </div>
                    ))}
                    <Button asChild variant="outline" className="w-full">
                      <Link to="/dashboard/products">إدارة المخزون</Link>
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">لا توجد منتجات بمخزون منخفض</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
