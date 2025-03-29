
import { 
  BarChart, 
  DollarSign, 
  TrendingUp, 
  ShoppingBag 
} from 'lucide-react';
import { SalesSummary } from '@/types';
import StatCard from './StatCard';

interface StatsGridProps {
  sales: SalesSummary;
  revenue: SalesSummary;
  profits: SalesSummary;
  orders: {
    pending: number;
    processing: number;
    completed: number;
    total: number;
  };
  timeframe: 'daily' | 'weekly' | 'monthly' | 'annual';
}

const StatsGrid = ({ sales, revenue, profits, orders, timeframe }: StatsGridProps) => {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="المبيعات"
        value={`${sales[timeframe]} ر.س`}
        icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        trend="up"
        trendValue="+12.5% من الشهر الماضي"
      />
      <StatCard
        title="الإيرادات"
        value={`${revenue[timeframe]} ر.س`}
        icon={<BarChart className="h-4 w-4 text-muted-foreground" />}
        trend="up"
        trendValue="+8.2% من الشهر الماضي"
      />
      <StatCard
        title="الأرباح"
        value={`${profits[timeframe]} ر.س`}
        icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
        trend="up"
        trendValue="+5.1% من الشهر الماضي"
      />
      <StatCard
        title="الطلبات"
        value={orders.total}
        icon={<ShoppingBag className="h-4 w-4 text-muted-foreground" />}
        description={`${orders.pending} قيد الانتظار، ${orders.processing} قيد المعالجة`}
      />
    </div>
  );
};

export default StatsGrid;
