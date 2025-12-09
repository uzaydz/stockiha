/**
 * CustomerStatsSimple - Customer Statistics Cards
 * ============================================================
 * Apple-Inspired Design - Elegant & Refined
 * Same design as POSOrderStatsSimple
 * ============================================================
 */

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  UserPlus,
  UserCheck,
  Phone,
  Mail,
  TrendingUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}

export interface CustomerStatsData {
  total: number;
  newLast30Days: number;
  activeLast30Days: number;
  withPhone?: number;
  withEmail?: number;
  todayNew?: number;
}

interface CustomerStatsProps {
  stats: CustomerStatsData | null;
  loading?: boolean;
  error?: string | null;
}

// ===============================================================================
// Helpers
// ===============================================================================

const formatNumber = (num: number) => {
  return new Intl.NumberFormat('en-US').format(num);
};

// ===============================================================================
// Stat Card - Apple Style
// ===============================================================================

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

// ===============================================================================
// Main Component
// ===============================================================================

export const CustomerStatsSimple = React.memo<CustomerStatsProps>(({
  stats,
  loading = false,
  error = null
}) => {

  const statCards = React.useMemo(() => {
    const total = stats?.total || 0;
    const newLast30Days = stats?.newLast30Days || 0;
    const activeLast30Days = stats?.activeLast30Days || 0;
    const withPhone = stats?.withPhone || 0;
    const withEmail = stats?.withEmail || 0;
    const todayNew = stats?.todayNew || 0;

    // Calculate percentages
    const newPercentage = total > 0 ? Math.round((newLast30Days / total) * 100) : 0;
    const activePercentage = total > 0 ? Math.round((activeLast30Days / total) * 100) : 0;

    return [
      {
        title: 'إجمالي العملاء',
        value: formatNumber(total),
        subtitle: todayNew > 0 ? `${formatNumber(todayNew)} اليوم` : undefined,
        icon: <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />,
        iconBg: 'bg-orange-50 dark:bg-orange-950/50'
      },
      {
        title: 'عملاء جدد',
        value: formatNumber(newLast30Days),
        subtitle: `${newPercentage}% آخر 30 يوم`,
        icon: <UserPlus className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
        iconBg: 'bg-emerald-50 dark:bg-emerald-950/50'
      },
      {
        title: 'عملاء نشطين',
        value: formatNumber(activeLast30Days),
        subtitle: `${activePercentage}% من الإجمالي`,
        icon: <UserCheck className="w-5 h-5 text-teal-600 dark:text-teal-400" />,
        iconBg: 'bg-teal-50 dark:bg-teal-950/50'
      },
      {
        title: 'لديهم هاتف',
        value: formatNumber(withPhone),
        subtitle: total > 0 ? `${Math.round((withPhone / total) * 100)}%` : undefined,
        icon: <Phone className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
        iconBg: 'bg-amber-50 dark:bg-amber-950/50'
      },
      {
        title: 'لديهم بريد',
        value: formatNumber(withEmail),
        subtitle: total > 0 ? `${Math.round((withEmail / total) * 100)}%` : undefined,
        icon: <Mail className="w-5 h-5 text-violet-600 dark:text-violet-400" />,
        iconBg: 'bg-violet-50 dark:bg-violet-950/50'
      },
      {
        title: 'معدل النمو',
        value: `${newPercentage}%`,
        subtitle: 'آخر 30 يوم',
        icon: <TrendingUp className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
        iconBg: 'bg-rose-50 dark:bg-rose-950/50'
      }
    ];
  }, [stats]);

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

CustomerStatsSimple.displayName = 'CustomerStatsSimple';

export default CustomerStatsSimple;
