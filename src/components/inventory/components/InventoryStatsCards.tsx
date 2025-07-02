import React from 'react';
import { motion } from 'framer-motion';
import { 
  Package, 
  Users, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  RotateCcw, 
  Settings, 
  Activity,
  BarChart3,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface InventoryStatistics {
  total_operations: number;
  affected_products: number;
  active_users: number;
  operations_breakdown: {
    sales: number;
    purchases: number;
    returns: number;
    adjustments: number;
  };
  financial_summary: {
    total_sales_value: number;
    total_purchase_value: number;
    net_value: number;
  };
  trends: {
    operations_last_7_days: number;
    operations_today: number;
  };
  top_products?: Array<{
    product_id: string;
    product_name: string;
    operations_count: number;
  }>;
}

interface InventoryStatsCardsProps {
  statistics?: InventoryStatistics;
  isLoading?: boolean;
}

// دالة تنسيق العملة
const formatCurrency = (value: number): string => {
  if (value === 0) return '0 د.ج';
  return `${value.toLocaleString('ar-DZ')} د.ج`;
};

// دالة تنسيق الأرقام
const formatNumber = (value: number): string => {
  if (value === 0) return '0';
  return value.toLocaleString('ar');
};

// مكون بطاقة إحصائية واحدة
const StatCard: React.FC<{
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  gradient: string;
  delay: number;
}> = ({ title, value, description, icon, trend, trendValue, gradient, delay }) => {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-3 w-3 text-green-600" />;
      case 'down':
        return <ArrowDownRight className="h-3 w-3 text-red-600" />;
      default:
        return <Minus className="h-3 w-3 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'down':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02 }}
      className="h-full"
    >
      <Card className={cn(
        "relative overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-300",
        "bg-gradient-to-br", gradient
      )}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="h-8 w-8 rounded-lg bg-background/80 backdrop-blur-sm flex items-center justify-center shadow-sm">
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground mb-1">
            {typeof value === 'number' ? formatNumber(value) : value}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mb-2">
              {description}
            </p>
          )}
          {trendValue && (
            <div className={cn(
              "flex items-center gap-1 text-xs px-2 py-1 rounded-full border w-fit",
              getTrendColor()
            )}>
              {getTrendIcon()}
              <span>{trendValue}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// مكون حالة التحميل
const StatsCardsLoader: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-8 w-8 bg-muted rounded-lg" />
          </CardHeader>
          <CardContent>
            <div className="h-8 w-20 bg-muted rounded mb-2" />
            <div className="h-3 w-32 bg-muted rounded mb-2" />
            <div className="h-5 w-16 bg-muted rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// مكون حالة فارغة
const EmptyStatsCards: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        { title: 'إجمالي العمليات', icon: Activity, gradient: 'from-blue-50 to-indigo-50' },
        { title: 'المنتجات المتأثرة', icon: Package, gradient: 'from-purple-50 to-pink-50' },
        { title: 'المستخدمين النشطين', icon: Users, gradient: 'from-green-50 to-emerald-50' },
        { title: 'عمليات اليوم', icon: Clock, gradient: 'from-orange-50 to-red-50' }
      ].map((stat, i) => (
        <StatCard
          key={i}
          title={stat.title}
          value={0}
          description="لا توجد بيانات"
          icon={<stat.icon className="h-4 w-4 text-muted-foreground" />}
          gradient={stat.gradient}
          delay={i * 0.1}
        />
      ))}
    </div>
  );
};

/**
 * مكون بطاقات إحصائيات المخزون
 * يعرض الإحصائيات الرئيسية لحركات المخزون
 */
const InventoryStatsCards: React.FC<InventoryStatsCardsProps> = ({ statistics, isLoading }) => {
  if (isLoading) {
    return <StatsCardsLoader />;
  }

  if (!statistics) {
    return <EmptyStatsCards />;
  }

  // حساب معدل النمو للعمليات
  const weeklyGrowth = statistics.trends?.operations_last_7_days || 0;
  const dailyOps = statistics.trends?.operations_today || 0;
  
  // تحديد اتجاه التطور
  const operationsTrend = weeklyGrowth > 0 ? 'up' : weeklyGrowth < 0 ? 'down' : 'neutral';
  const todayTrend = dailyOps > 0 ? 'up' : 'neutral';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* إجمالي العمليات */}
      <StatCard
        title="إجمالي العمليات"
        value={statistics.total_operations}
        description={`${statistics.operations_breakdown.sales} مبيعات، ${statistics.operations_breakdown.purchases} مشتريات`}
        icon={<Activity className="h-4 w-4 text-blue-600" />}
        trend={operationsTrend}
        trendValue={weeklyGrowth > 0 ? `+${weeklyGrowth} هذا الأسبوع` : 'لا توجد حركة'}
        gradient="from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20"
        delay={0}
      />

      {/* المنتجات المتأثرة */}
      <StatCard
        title="المنتجات المتأثرة"
        value={statistics.affected_products}
        description="منتجات تم التعامل معها"
        icon={<Package className="h-4 w-4 text-purple-600" />}
        trend="neutral"
        trendValue={`من إجمالي المنتجات`}
        gradient="from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20"
        delay={0.1}
      />

      {/* المستخدمين النشطين */}
      <StatCard
        title="المستخدمين النشطين"
        value={statistics.active_users}
        description="موظفين قاموا بعمليات"
        icon={<Users className="h-4 w-4 text-green-600" />}
        trend="neutral"
        trendValue="في الفترة المحددة"
        gradient="from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20"
        delay={0.2}
      />

      {/* عمليات اليوم */}
      <StatCard
        title="عمليات اليوم"
        value={dailyOps}
        description="حركات تمت اليوم"
        icon={<Clock className="h-4 w-4 text-orange-600" />}
        trend={todayTrend}
        trendValue={dailyOps > 0 ? `نشاط حالي` : 'لا توجد حركة'}
        gradient="from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20"
        delay={0.3}
      />
    </div>
  );
};

export default InventoryStatsCards; 