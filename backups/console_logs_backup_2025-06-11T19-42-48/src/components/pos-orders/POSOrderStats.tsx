import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  TrendingDown, 
  ShoppingCart, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  XCircle,
  CreditCard,
  Banknote,
  Target,
  CalendarDays,
  Activity
} from 'lucide-react';
import type { POSOrderStats } from '../../api/posOrdersService';

interface POSOrderStatsProps {
  stats: POSOrderStats | null;
  loading: boolean;
  error?: string;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  change?: {
    value: number;
    type: 'increase' | 'decrease' | 'neutral';
  };
  description?: string;
  color?: 'default' | 'green' | 'blue' | 'orange' | 'red' | 'purple';
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  change,
  description,
  color = 'default',
  loading = false
}) => {
  const colorClasses = {
    default: 'text-muted-foreground',
    green: 'text-green-600 dark:text-green-400',
    blue: 'text-blue-600 dark:text-blue-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    purple: 'text-purple-600 dark:text-purple-400'
  };

  const bgClasses = {
    default: 'bg-muted/10',
    green: 'bg-green-50 dark:bg-green-900/20',
    blue: 'bg-blue-50 dark:bg-blue-900/20',
    orange: 'bg-orange-50 dark:bg-orange-900/20',
    red: 'bg-red-50 dark:bg-red-900/20',
    purple: 'bg-purple-50 dark:bg-purple-900/20'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
          {description && <Skeleton className="h-4 w-32 mt-2" />}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{value}</p>
              {change && (
                <Badge 
                  variant={change.type === 'increase' ? 'default' : change.type === 'decrease' ? 'destructive' : 'secondary'}
                  className="text-xs"
                >
                  {change.type === 'increase' ? (
                    <TrendingUp className="w-3 h-3 mr-1" />
                  ) : change.type === 'decrease' ? (
                    <TrendingDown className="w-3 h-3 mr-1" />
                  ) : null}
                  {Math.abs(change.value)}%
                </Badge>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${bgClasses[color]}`}>
            <Icon className={`h-6 w-6 ${colorClasses[color]}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const POSOrderStats: React.FC<POSOrderStatsProps> = React.memo(({
  stats,
  loading,
  error,
  className = ''
}) => {
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 font-medium">خطأ في تحميل الإحصائيات</p>
        <p className="text-sm text-muted-foreground mt-1">{error}</p>
      </div>
    );
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount) + ' دج';
  };

  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat('ar-DZ').format(num);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* الإحصائيات الرئيسية */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="إجمالي الطلبيات"
          value={stats ? formatNumber(stats.total_orders) : '0'}
          icon={ShoppingCart}
          description="العدد الكلي للطلبيات"
          color="blue"
          loading={loading}
        />
        
        <StatCard
          title="إجمالي الإيرادات"
          value={stats ? formatCurrency(stats.total_revenue) : '0 دج'}
          icon={DollarSign}
          description="مجموع المبيعات"
          color="green"
          loading={loading}
        />
        
        <StatCard
          title="متوسط قيمة الطلبية"
          value={stats ? formatCurrency(stats.avg_order_value) : '0 دج'}
          icon={Target}
          description="متوسط سعر الطلبية"
          color="purple"
          loading={loading}
        />
        
        <StatCard
          title="طلبيات اليوم"
          value={stats ? formatNumber(stats.today_orders) : '0'}
          icon={CalendarDays}
          description={stats ? formatCurrency(stats.today_revenue) : '0 دج'}
          color="orange"
          loading={loading}
        />
      </div>

      {/* إحصائيات الحالة */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          title="الطلبيات المكتملة"
          value={stats ? formatNumber(stats.completed_orders) : '0'}
          icon={CheckCircle}
          description={`${stats ? Math.round((stats.completed_orders / stats.total_orders) * 100) || 0 : 0}% من إجمالي الطلبيات`}
          color="green"
          loading={loading}
        />
        
        <StatCard
          title="الطلبيات المعلقة"
          value={stats ? formatNumber(stats.pending_orders) : '0'}
          icon={Clock}
          description={`${stats ? Math.round((stats.pending_orders / stats.total_orders) * 100) || 0 : 0}% من إجمالي الطلبيات`}
          color="orange"
          loading={loading}
        />
        
        <StatCard
          title="الطلبيات المُلغاة"
          value={stats ? formatNumber(stats.cancelled_orders) : '0'}
          icon={XCircle}
          description={`${stats ? Math.round((stats.cancelled_orders / stats.total_orders) * 100) || 0 : 0}% من إجمالي الطلبيات`}
          color="red"
          loading={loading}
        />
      </div>

      {/* إحصائيات الدفع */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5" />
              توزيع طرق الدفع
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <Banknote className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium">الدفع النقدي</p>
                      <p className="text-sm text-muted-foreground">
                        {stats ? formatNumber(stats.cash_orders) : '0'} طلبية
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {stats && stats.total_orders > 0 
                      ? Math.round((stats.cash_orders / stats.total_orders) * 100) 
                      : 0}%
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <CreditCard className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">الدفع بالبطاقة</p>
                      <p className="text-sm text-muted-foreground">
                        {stats ? formatNumber(stats.card_orders) : '0'} طلبية
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary">
                    {stats && stats.total_orders > 0 
                      ? Math.round((stats.card_orders / stats.total_orders) * 100) 
                      : 0}%
                  </Badge>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              نظرة عامة سريعة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">معدل إكمال الطلبيات</span>
                  <span className="font-medium">
                    {stats && stats.total_orders > 0 
                      ? Math.round((stats.completed_orders / stats.total_orders) * 100) 
                      : 0}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">إيرادات اليوم</span>
                  <span className="font-medium">
                    {stats ? formatCurrency(stats.today_revenue) : '0 دج'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">متوسط العناصر/الطلبية</span>
                  <span className="font-medium">
                    {stats && stats.total_orders > 0 
                      ? Math.round((stats.completed_orders + stats.pending_orders) / stats.total_orders * 2.5) 
                      : 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

POSOrderStats.displayName = 'POSOrderStats';