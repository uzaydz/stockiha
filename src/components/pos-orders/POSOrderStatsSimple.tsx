/**
 * 📊 POSOrderStatsSimple - إحصائيات طلبيات نقطة البيع
 * ============================================================
 * 🍎 Apple-Inspired Design - Elegant & Refined
 * ============================================================
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ShoppingBag,
  TrendingUp,
  CheckCircle2,
  Clock,
  XCircle,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { POSOrderStats } from '@/api/posOrdersService';

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

interface POSOrderStatsProps {
  stats: POSOrderStats | null;
  loading?: boolean;
  error?: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ═══════════════════════════════════════════════════════════════════════════
// Stat Card - Apple Style
// ═══════════════════════════════════════════════════════════════════════════

const StatCard = React.memo<StatCardProps>(({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  loading = false
}) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
            <Skeleton className="h-3 w-12" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-2xl p-4",
      "border border-zinc-200 dark:border-zinc-800",
      "transition-all duration-200",
      "hover:shadow-md hover:border-zinc-300 dark:hover:border-zinc-700"
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 font-numeric tracking-tight">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center",
          iconBg
        )}>
          {icon}
        </div>
      </div>
    </div>
  );
});

StatCard.displayName = 'StatCard';

// ═══════════════════════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════════════════════

export const POSOrderStatsSimple = React.memo<POSOrderStatsProps>(({
  stats,
  loading = false,
  error = null
}) => {

  const statCards = React.useMemo(() => [
    {
      title: 'إجمالي الطلبيات',
      value: formatNumber(stats?.total_orders || 0),
      subtitle: `${formatNumber(stats?.today_orders || 0)} اليوم`,
      icon: <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50'
    },
    {
      title: 'الإيرادات',
      value: `${formatCurrency(stats?.effective_revenue || stats?.total_revenue || 0)} د.ج`,
      subtitle: stats?.today_revenue ? `${formatCurrency(stats.today_revenue)} اليوم` : undefined,
      icon: <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50'
    },
    {
      title: 'مكتملة',
      value: formatNumber(stats?.completed_orders || 0),
      subtitle: `${formatNumber(stats?.pending_orders || 0)} معلقة`,
      icon: <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
      iconBg: 'bg-teal-50 dark:bg-teal-950/50'
    },
    {
      title: 'معلقة',
      value: formatNumber(stats?.pending_orders || 0),
      icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/50'
    },
    {
      title: 'ملغاة',
      value: formatNumber(stats?.cancelled_orders || 0),
      icon: <XCircle className="w-5 h-5 text-zinc-500 dark:text-zinc-400" />,
      iconBg: 'bg-zinc-100 dark:bg-zinc-800'
    },
    {
      title: 'مرتجعة',
      value: formatNumber((stats?.fully_returned_orders || 0) + (stats?.partially_returned_orders || 0)),
      subtitle: stats?.return_rate ? `${stats.return_rate.toFixed(1)}% معدل` : undefined,
      icon: <RotateCcw className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
      iconBg: 'bg-violet-50 dark:bg-violet-950/50'
    }
  ], [stats]);

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-800 p-4 text-center">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
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
