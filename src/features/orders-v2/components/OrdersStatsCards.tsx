/**
 * OrdersStatsCards - بطاقات إحصائيات الطلبيات
 */

import React, { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle2,
  XCircle,
  DollarSign
} from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import { formatCurrency } from '@/utils/ordersHelpers';
import type { OrderStatus } from '../types';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  isActive?: boolean;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = memo(({
  title,
  value,
  icon,
  color,
  bgColor,
  isActive,
  onClick,
}) => (
  <Card
    className={`
      cursor-pointer transition-all duration-200 hover:shadow-md
      ${isActive ? 'ring-2 ring-primary ring-offset-2' : ''}
      ${onClick ? 'hover:scale-[1.02]' : ''}
    `}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-bold ${color}`}>{value}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
));

StatCard.displayName = 'StatCard';

const OrdersStatsCards: React.FC = () => {
  const {
    orderCounts,
    orderStats,
    loading,
    filters,
    applyFilters,
  } = useOrders();

  const activeStatus = filters.status;

  const stats = useMemo(() => [
    {
      key: 'all' as const,
      title: 'إجمالي الطلبيات',
      value: orderCounts.all,
      icon: <ShoppingCart className="h-5 w-5 text-blue-600" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      key: 'pending' as const,
      title: 'معلقة',
      value: orderCounts.pending,
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      key: 'processing' as const,
      title: 'قيد المعالجة',
      value: orderCounts.processing,
      icon: <Truck className="h-5 w-5 text-purple-600" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    },
    {
      key: 'delivered' as const,
      title: 'مكتملة',
      value: orderCounts.delivered,
      icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
    },
    {
      key: 'cancelled' as const,
      title: 'ملغاة',
      value: orderCounts.cancelled,
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
    {
      key: 'revenue' as const,
      title: 'إجمالي المبيعات',
      value: formatCurrency(orderStats.totalSales),
      icon: <DollarSign className="h-5 w-5 text-emerald-600" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
  ], [orderCounts, orderStats]);

  const handleCardClick = (key: string) => {
    if (key === 'revenue') return;

    const newStatus = key as OrderStatus | 'all';
    applyFilters({ status: activeStatus === newStatus ? 'all' : newStatus });
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-12 w-12 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {stats.map((stat) => (
        <StatCard
          key={stat.key}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          color={stat.color}
          bgColor={stat.bgColor}
          isActive={activeStatus === stat.key}
          onClick={stat.key !== 'revenue' ? () => handleCardClick(stat.key) : undefined}
        />
      ))}
    </div>
  );
};

export default memo(OrdersStatsCards);
