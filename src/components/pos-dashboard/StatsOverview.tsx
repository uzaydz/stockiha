import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Package,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface StatsOverviewProps {
  stats: {
    totalSales: number;
    totalOrders: number;
    totalCustomers: number;
    totalProducts: number;
    todaySales: number;
    todayOrders: number;
    growthRate: number;
    avgOrderValue: number;
  };
}

const StatsOverview: React.FC<StatsOverviewProps> = ({ stats }) => {
  const statsCards = [
    {
      title: 'إجمالي المبيعات',
      value: stats.totalSales,
      icon: DollarSign,
      change: '+12.5%'
    },
    {
      title: 'إجمالي الطلبات',
      value: stats.totalOrders,
      icon: ShoppingCart,
      change: '+8.2%'
    },
    {
      title: 'إجمالي العملاء',
      value: stats.totalCustomers,
      icon: Users,
      change: '+15.3%'
    },
    {
      title: 'إجمالي المنتجات',
      value: stats.totalProducts,
      icon: Package,
      change: '+3.1%'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statsCards.map((stat, index) => (
        <Card key={index} className="border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="p-2 rounded border bg-gray-50">
                <stat.icon className="h-5 w-5 text-gray-600" />
              </div>
              <span className="text-xs text-gray-500">
                {stat.change}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-2xl font-bold">
                {stat.value.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500">
                {stat.change} من الشهر الماضي
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default StatsOverview;
