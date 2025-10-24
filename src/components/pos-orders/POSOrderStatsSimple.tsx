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
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { POSOrderStats } from '@/api/posOrdersService';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
  colorClass?: string;
  loading?: boolean;
}

// بطاقة إحصائية مبسطة جداً
const StatCard = React.memo<StatCardProps>(({ 
  title, 
  value, 
  icon, 
  subtitle,
  colorClass,
  loading = false 
}) => {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-3">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-24" />
            {subtitle && <Skeleton className="h-3 w-16" />}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1 min-w-0">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold truncate">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-1.5 rounded-md flex-shrink-0", colorClass)}>
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

export const POSOrderStatsSimple = React.memo<POSOrderStatsProps>(({ 
  stats, 
  loading = false,
  error = null 
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount) + ' دج';
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('ar-DZ').format(num);
  };

  // فقط 6 بطاقات أساسية
  const statCards = React.useMemo(() => [
    {
      title: 'إجمالي الطلبيات',
      value: formatNumber(stats?.total_orders || 0),
      icon: <ShoppingCart className="h-4 w-4 text-blue-600" />,
      subtitle: `${formatNumber(stats?.today_orders || 0)} اليوم`,
      colorClass: 'bg-blue-50'
    },
    {
      title: 'الإيرادات',
      value: formatCurrency(stats?.effective_revenue || 0),
      icon: <DollarSign className="h-4 w-4 text-green-600" />,
      subtitle: stats?.total_revenue !== stats?.effective_revenue 
        ? `أصلي: ${formatCurrency(stats?.total_revenue || 0)}`
        : undefined,
      colorClass: 'bg-green-50'
    },
    {
      title: 'متوسط الطلبية',
      value: formatCurrency(stats?.avg_order_value || 0),
      icon: <TrendingUp className="h-4 w-4 text-purple-600" />,
      colorClass: 'bg-purple-50'
    },
    {
      title: 'مكتملة',
      value: formatNumber(stats?.completed_orders || 0),
      icon: <CheckCircle className="h-4 w-4 text-emerald-600" />,
      subtitle: `${formatNumber(stats?.pending_orders || 0)} معلقة`,
      colorClass: 'bg-emerald-50'
    },
    {
      title: 'ملغاة',
      value: formatNumber(stats?.cancelled_orders || 0),
      icon: <XCircle className="h-4 w-4 text-red-600" />,
      colorClass: 'bg-red-50'
    },
    {
      title: 'مرتجعة',
      value: formatNumber((stats?.fully_returned_orders || 0) + (stats?.partially_returned_orders || 0)),
      icon: <RotateCcw className="h-4 w-4 text-orange-600" />,
      subtitle: `${(stats?.return_rate || 0).toFixed(1)}% معدل`,
      colorClass: 'bg-orange-50'
    }
  ], [stats]);

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-4 text-center">
          <p className="text-sm text-red-600">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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

POSOrderStatsSimple.displayName = 'POSOrderStatsSimple';

export default POSOrderStatsSimple;
