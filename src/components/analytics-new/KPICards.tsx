import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KPIData } from './types';

interface KPICardsProps {
  data: KPIData | null;
  isLoading: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: number;
  type: 'currency' | 'number' | 'percentage';
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
  isLoading: boolean;
  delay?: number;
}

const formatValue = (value: number, type: 'currency' | 'number' | 'percentage'): string => {
  switch (type) {
    case 'currency':
      return `${value.toLocaleString('ar-DZ')} دج`;
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString('ar-DZ');
  }
};

const colorClasses = {
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  green: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
    border: 'border-green-200 dark:border-green-800',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-200 dark:border-orange-800',
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
  },
};

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  type,
  color,
  isLoading,
  delay = 0,
}) => {
  const colors = colorClasses[color];

  if (isLoading) {
    return (
      <Card className="relative overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <Card className={cn(
        "relative overflow-hidden transition-all duration-300 hover:shadow-lg",
        "border",
        colors.border
      )}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-2xl font-bold text-foreground">
                {formatValue(value, type)}
              </h3>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend !== undefined && trend !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  trend > 0 ? "text-green-600" : "text-red-600"
                )}>
                  {trend > 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  <span>{Math.abs(trend).toFixed(1)}% من الفترة السابقة</span>
                </div>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              colors.bg
            )}>
              <Icon className={cn("h-6 w-6", colors.icon)} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const KPICards: React.FC<KPICardsProps> = ({ data, isLoading }) => {
  const kpiItems = [
    {
      title: 'إجمالي المبيعات',
      value: data?.totalSales || 0,
      icon: DollarSign,
      trend: data?.growthRate,
      type: 'currency' as const,
      color: 'blue' as const,
    },
    {
      title: 'عدد الطلبات',
      value: data?.totalOrders || 0,
      icon: ShoppingCart,
      type: 'number' as const,
      color: 'purple' as const,
    },
    {
      title: 'متوسط قيمة الطلب',
      value: data?.avgOrderValue || 0,
      icon: TrendingUp,
      type: 'currency' as const,
      color: 'green' as const,
    },
    {
      title: 'صافي الربح',
      value: data?.netProfit || 0,
      subtitle: `المصاريف: ${(data?.totalExpenses || 0).toLocaleString('ar-DZ')} دج`,
      icon: Wallet,
      type: 'currency' as const,
      color: data?.netProfit && data.netProfit >= 0 ? 'green' as const : 'red' as const,
    },
    {
      title: 'إجمالي العملاء',
      value: data?.totalCustomers || 0,
      subtitle: `جدد: ${data?.newCustomers || 0}`,
      icon: Users,
      type: 'number' as const,
      color: 'orange' as const,
    },
    {
      title: 'نسبة النمو',
      value: data?.growthRate || 0,
      icon: data?.growthRate && data.growthRate >= 0 ? TrendingUp : TrendingDown,
      type: 'percentage' as const,
      color: data?.growthRate && data.growthRate >= 0 ? 'green' as const : 'red' as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpiItems.map((item, index) => (
        <KPICard
          key={item.title}
          {...item}
          isLoading={isLoading}
          delay={index * 0.1}
        />
      ))}
    </div>
  );
};

export default KPICards;
