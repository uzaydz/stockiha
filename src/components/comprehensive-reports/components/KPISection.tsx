/**
 * مكون بطاقات المؤشرات الرئيسية (KPI Cards)
 * تصميم احترافي بسيط مع أرقام واضحة
 */

import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  DollarSign,
  Receipt,
  PiggyBank,
  Coins,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { KPIData } from '../types';
import { formatCurrency, formatPercentage } from '../utils';
import { cn } from '@/lib/utils';

interface KPISectionProps {
  data: KPIData | null;
  isLoading?: boolean;
}

interface KPICardProps {
  title: string;
  value: number;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  iconColor: string;
  gradientFrom: string;
  gradientTo: string;
  isLoading?: boolean;
  isCurrency?: boolean;
  suffix?: string;
  extra?: {
    label: string;
    value: string;
  };
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon: Icon,
  iconColor,
  gradientFrom,
  gradientTo,
  isLoading,
  isCurrency = true,
  suffix,
  extra,
}) => {
  if (isLoading) {
    return (
      <div className="h-40 rounded-3xl bg-zinc-100 dark:bg-zinc-900 animate-pulse" />
    );
  }

  const isPositive = changeType === 'increase';
  const isNegative = changeType === 'decrease';

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      className="relative overflow-hidden rounded-[28px] bg-white dark:bg-[#1C1C1E] p-6 shadow-sm border border-zinc-200/50 dark:border-zinc-800 h-full group transition-all"
    >
      {/* Hover Glow Effect - Subtle */}
      <div className={cn("absolute -right-20 -top-20 h-64 w-64 rounded-full opacity-0 group-hover:opacity-5 transition-opacity duration-700 blur-3xl", gradientFrom)} />

      <div className="relative z-10 flex flex-col justify-between h-full">
        <div className="flex justify-between items-start mb-6">
          <div className="flex flex-col">
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{title}</h3>
            <div className="flex items-baseline gap-1.5">
              <h2 className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {isCurrency ? formatCurrency(value).replace('DA', '') : value}
              </h2>
              <span className="text-sm font-medium text-zinc-400">
                {isCurrency ? 'DA' : suffix}
              </span>
            </div>
          </div>

          <div className={cn("p-2.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 shadow-sm border border-zinc-100 dark:border-zinc-700/50")}>
            <Icon className={cn("h-5 w-5", iconColor.replace('text-white', gradientFrom.replace('from-', 'text-')))} />
          </div>
        </div>

        <div className="flex items-center justify-between">
          {change !== undefined ? (
            <div className={cn(
              "flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full",
              isPositive ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400" :
                isNegative ? "bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400" :
                  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
            )}>
              {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : isNegative ? <ArrowDownRight className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
              <span>{Math.abs(change).toFixed(1)}%</span>
            </div>
          ) : (
            <div className="h-6" /> // spacer
          )}

          {extra && (
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 flex items-center gap-1">
              <span>{extra.value}</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// المكون الرئيسي
const KPISection: React.FC<KPISectionProps> = ({ data, isLoading }) => {
  const cards = [
    {
      title: 'إجمالي الإيرادات',
      value: data?.revenue.value || 0,
      change: data?.revenue.change,
      changeType: data?.revenue.changeType,
      icon: DollarSign,
      iconColor: 'text-white',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
    },
    {
      title: 'إجمالي التكاليف',
      value: data?.costs.value || 0,
      change: data?.costs.change,
      changeType: data?.costs.changeType === 'increase' ? 'decrease' as const : data?.costs.changeType === 'decrease' ? 'increase' as const : 'neutral' as const,
      icon: Receipt,
      iconColor: 'text-white',
      gradientFrom: 'from-orange-500',
      gradientTo: 'to-rose-500',
    },
    {
      title: 'صافي الربح',
      value: data?.profit.value || 0,
      change: data?.profit.change,
      changeType: data?.profit.changeType,
      icon: PiggyBank,
      iconColor: 'text-white',
      gradientFrom: 'from-emerald-500',
      gradientTo: 'to-teal-500',
      extra: data?.profit.margin ? {
        label: 'هامش الربح',
        value: `${data.profit.margin.toFixed(1)}%`,
      } : undefined,
    },
    {
      title: 'الزكاة المستحقة',
      value: data?.zakat.value || 0,
      icon: Coins,
      iconColor: 'text-white',
      gradientFrom: 'from-violet-500',
      gradientTo: 'to-purple-600',
      extra: data?.zakat ? {
        label: 'حالة النصاب',
        value: data.zakat.isEligible ? 'بلغ النصاب ✅' : 'لم يبلغ',
      } : undefined,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          className="h-full"
        >
          <KPICard  {...card} isLoading={isLoading} />
        </motion.div>
      ))}
    </div>
  );
};

export { KPISection };
