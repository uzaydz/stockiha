import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShoppingCart, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  XCircle,
  TrendingUp,
  RotateCcw,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { POSOrderStats } from '@/api/posOrdersService';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: number;
  subtitle?: string;
  colorClass?: string;
  loading?: boolean;
}

const StatCard = React.memo<StatCardProps>(({ 
  title, 
  value, 
  icon, 
  trend, 
  subtitle,
  colorClass = 'from-blue-500 to-blue-600',
  loading = false 
}) => {
  if (loading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 group">
      <div className={cn(
        "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br",
        colorClass
      )} />
      <CardContent className="p-6 relative">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-2xl font-bold">{value}</h3>
              {trend !== undefined && (
                <span className={cn(
                  "text-xs font-medium flex items-center gap-1",
                  trend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  <TrendingUp className={cn(
                    "h-3 w-3",
                    trend < 0 && "rotate-180"
                  )} />
                  {Math.abs(trend)}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={cn(
            "p-3 rounded-lg bg-gradient-to-br shadow-md",
            colorClass
          )}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

StatCard.displayName = 'StatCard';

interface POSOrderStatsProps {
  stats: POSOrderStats | null;
  loading?: boolean;
  error?: string | null;
}

export const POSOrderStatsOptimized = React.memo<POSOrderStatsProps>(({ 
  stats, 
  loading = false,
  error = null 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-DZ').format(num);
  };

  const statCards = React.useMemo(() => [
    {
      title: 'إجمالي الطلبيات',
      value: formatNumber(stats?.total_orders || 0),
      icon: <ShoppingCart className="h-6 w-6 text-white" />,
      subtitle: `${formatNumber(stats?.today_orders || 0)} طلبية اليوم`,
      colorClass: 'from-blue-500 to-blue-600'
    },
    {
      title: 'الإيرادات الفعلية',
      value: formatCurrency(stats?.effective_revenue || 0),
      icon: <DollarSign className="h-6 w-6 text-white" />,
      subtitle: `أصلي: ${formatCurrency(stats?.total_revenue || 0)}`,
      colorClass: 'from-green-500 to-green-600'
    },
    {
      title: 'متوسط قيمة الطلبية',
      value: formatCurrency(stats?.avg_order_value || 0),
      icon: <TrendingUp className="h-6 w-6 text-white" />,
      colorClass: 'from-purple-500 to-purple-600'
    },
    {
      title: 'طلبيات مكتملة',
      value: formatNumber(stats?.completed_orders || 0),
      icon: <CheckCircle className="h-6 w-6 text-white" />,
      colorClass: 'from-emerald-500 to-emerald-600'
    },
    {
      title: 'طلبيات معلقة',
      value: formatNumber(stats?.pending_orders || 0),
      icon: <Clock className="h-6 w-6 text-white" />,
      colorClass: 'from-yellow-500 to-yellow-600'
    },
    {
      title: 'طلبيات ملغاة',
      value: formatNumber(stats?.cancelled_orders || 0),
      icon: <XCircle className="h-6 w-6 text-white" />,
      colorClass: 'from-red-500 to-red-600'
    },
    {
      title: 'مرتجعة بالكامل',
      value: formatNumber(stats?.fully_returned_orders || 0),
      icon: <RotateCcw className="h-6 w-6 text-white" />,
      subtitle: `جزئياً: ${formatNumber(stats?.partially_returned_orders || 0)}`,
      colorClass: 'from-purple-500 to-purple-600'
    },
    {
      title: 'معدل الإرجاع',
      value: `${(stats?.return_rate || 0).toFixed(1)}%`,
      icon: <Target className="h-6 w-6 text-white" />,
      subtitle: `مبلغ: ${formatCurrency(stats?.total_returned_amount || 0)}`,
      colorClass: 'from-orange-500 to-orange-600'
    }
  ], [stats]);

  if (error) {
    return (
      <Card className="bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
        <CardContent className="p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, index) => (
        <StatCard
          key={index}
          {...stat}
          loading={loading}
        />
      ))}
    </div>
  );
});

POSOrderStatsOptimized.displayName = 'POSOrderStatsOptimized';

export default POSOrderStatsOptimized;