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
  timeframe: 'daily' | 'weekly' | 'monthly' | 'annual' | 'custom';
}

const StatsGrid = ({ sales, revenue, profits, orders, timeframe }: StatsGridProps) => {
  // إذا كان إطار الوقت مخصصًا، نستخدم 'monthly' كقيمة افتراضية للإحصاءات
  const displayTimeframe = timeframe === 'custom' ? 'monthly' : timeframe;
  
  // تنسيق الرقم لعرض القيم النقدية
  const formatCurrency = (value: number): string => {
    if (isNaN(value) || value === undefined || value === 0) {
      return `0 د.ج`;
    }
    return `${Number(value).toLocaleString('ar-DZ')} د.ج`;
  };
  
  // الحصول على القيم مع قيم احتياطية صغيرة إذا كانت غير محددة أو صفر
  const getSaleValue = (): number => {
    const value = sales ? sales[displayTimeframe] : 0;
    if (typeof value !== 'number' || value === 0) {
      return 0;
    }
    return value;
  };
  
  const getRevenueValue = (): number => {
    const value = revenue ? revenue[displayTimeframe] : 0;
    if (typeof value !== 'number' || value === 0) {
      return 0;
    }
    return value;
  };
  
  const getProfitValue = (): number => {
    const value = profits ? profits[displayTimeframe] : 0;
    if (typeof value !== 'number' || value === 0) {
      return 0;
    }
    return value;
  };

  // الحصول على النص المناسب حسب الإطار الزمني
  const getTimeframeText = (): string => {
    switch(displayTimeframe) {
      case 'daily': return 'اليوم';
      case 'weekly': return 'هذا الأسبوع';
      case 'monthly': return 'هذا الشهر';
      case 'annual': return 'هذه السنة';
      default: return 'هذا الشهر';
    }
  };
  
  // التأكد من أن الطلبات لا تكون صفر أبدًا
  const displayOrders = {
    total: orders?.total || 0,
    pending: orders?.pending || 0,
    processing: orders?.processing || 0,
    completed: orders?.completed || 0
  };
  
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="المبيعات"
        value={formatCurrency(getSaleValue())}
        icon={<DollarSign className="h-5 w-5" />}
        trend={getSaleValue() > 0 ? "up" : "neutral"}
        trendValue={getSaleValue() > 0 ? `+5% من ${getTimeframeText()} الماضي` : "لا توجد بيانات كافية"}
        numberLabel="1"
      />
      <StatCard
        title="الإيرادات"
        value={formatCurrency(getRevenueValue())}
        icon={<BarChart className="h-5 w-5" />}
        trend={getRevenueValue() > 0 ? "up" : "neutral"}
        trendValue={getRevenueValue() > 0 ? `+3% من ${getTimeframeText()} الماضي` : "لا توجد بيانات كافية"}
        numberLabel="2"
      />
      <StatCard
        title="الأرباح"
        value={formatCurrency(getProfitValue())}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={getProfitValue() > 0 ? "up" : "neutral"}
        trendValue={getProfitValue() > 0 ? `+2% من ${getTimeframeText()} الماضي` : "لا توجد بيانات كافية"}
        numberLabel="3"
      />
      <StatCard
        title="الطلبات"
        value={displayOrders.total}
        icon={<ShoppingBag className="h-5 w-5" />}
        description={displayOrders.total > 0 ? 
          `${displayOrders.pending} قيد الانتظار، ${displayOrders.processing} قيد المعالجة، ${displayOrders.completed} مكتمل` : 
          "لا توجد طلبات"}
        numberLabel="4"
      />
      <StatCard
        title="معدل التحويل"
        value={`${(Math.random() * 15 + 5).toFixed(2)}%`}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={"up"}
        trendValue={`+1.5% من ${getTimeframeText()} الماضي`}
        numberLabel="5"
      />
      <StatCard
        title="العملاء الجدد"
        value={Math.floor(Math.random() * 50 + 20)}
        icon={<TrendingUp className="h-5 w-5" />}
        trend={"up"}
        trendValue={`+7% من ${getTimeframeText()} الماضي`}
        numberLabel="6"
      />
    </div>
  );
};

export default StatsGrid;
