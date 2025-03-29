
import { useState } from 'react';
import Layout from '@/components/Layout';
import { useShop } from '@/context/ShopContext';
import { dashboardStats } from '@/data/mockData';

// Import dashboard components
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatsGrid from '@/components/dashboard/StatsGrid';
import RevenueChart from '@/components/dashboard/RevenueChart';
import OrderStatusCard from '@/components/dashboard/OrderStatusCard';
import RecentOrdersCard from '@/components/dashboard/RecentOrdersCard';
import LowStockCard from '@/components/dashboard/LowStockCard';

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
        {/* Dashboard Header with Timeframe Tabs */}
        <DashboardHeader onTimeframeChange={setTimeframe} />
        
        {/* Stats Grid */}
        <StatsGrid 
          sales={stats.sales}
          revenue={stats.revenue}
          profits={stats.profits}
          orders={stats.orders}
          timeframe={timeframe}
        />
        
        {/* Charts and Reports */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          {/* Revenue Chart */}
          <RevenueChart data={revenueData} />
          
          {/* Order Status */}
          <OrderStatusCard stats={stats.orders} />
        </div>
        
        {/* Tables Section */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Recent Orders */}
          <RecentOrdersCard orders={recentOrders} />
          
          {/* Low Stock Alert */}
          <LowStockCard products={lowStockProducts} />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
