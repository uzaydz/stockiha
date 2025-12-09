/**
 * ============================================
 * STOCKIHA ANALYTICS - KPI CARD
 * بطاقة المؤشر الرئيسي - تصميم متطور
 * ============================================
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatKPICurrency, formatPercent, formatNumber, formatChange } from '../utils/formatters';
import { colors, animation } from '../utils/theme';

// ==================== Types ====================

export interface KPICardProps {
  title: string;
  value: number;
  previousValue?: number;
  format?: 'currency' | 'number' | 'percent';
  icon?: React.ReactNode;
  iconColor?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  subtitle?: string;
  isLoading?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'gradient' | 'outline' | 'glass';
  accentColor?: string;
  className?: string;
  onClick?: () => void;
}

// ==================== Loading Skeleton ====================

const KPICardSkeleton: React.FC<{ size: 'sm' | 'md' | 'lg' }> = ({ size }) => {
  const heights = { sm: 'h-24', md: 'h-32', lg: 'h-40' };

  return (
    <div className={cn(
      'rounded-2xl bg-zinc-100 dark:bg-zinc-800/50 animate-pulse',
      heights[size]
    )}>
      <div className="p-5 space-y-3">
        <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-8 w-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
        <div className="h-3 w-16 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    </div>
  );
};

// ==================== Animated Counter ====================

const AnimatedValue: React.FC<{
  value: number;
  format: 'currency' | 'number' | 'percent';
  size: 'sm' | 'md' | 'lg';
}> = memo(({ value, format, size }) => {
  const textSizes = {
    sm: 'text-2xl',
    md: 'text-3xl',
    lg: 'text-4xl',
  };

  const suffixSizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  if (format === 'currency') {
    const { main, suffix } = formatKPICurrency(value);
    return (
      <div className="flex items-baseline gap-1.5">
        <motion.span
          className={cn(
            'font-bold tracking-tight text-zinc-900 dark:text-white',
            textSizes[size]
          )}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        >
          {main}
        </motion.span>
        <span className={cn('font-medium text-zinc-400 dark:text-zinc-500', suffixSizes[size])}>
          {suffix}
        </span>
      </div>
    );
  }

  if (format === 'percent') {
    return (
      <motion.span
        className={cn(
          'font-bold tracking-tight text-zinc-900 dark:text-white',
          textSizes[size]
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {formatPercent(value)}
      </motion.span>
    );
  }

  return (
    <motion.span
      className={cn(
        'font-bold tracking-tight text-zinc-900 dark:text-white',
        textSizes[size]
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
    >
      {formatNumber(value, { compact: true })}
    </motion.span>
  );
});

AnimatedValue.displayName = 'AnimatedValue';

// ==================== Trend Badge ====================

const TrendBadge: React.FC<{
  trend: 'up' | 'down' | 'stable';
  value?: number;
  size: 'sm' | 'md' | 'lg';
  invertColors?: boolean;
}> = ({ trend, value, size, invertColors = false }) => {
  const isPositive = invertColors ? trend === 'down' : trend === 'up';
  const isNegative = invertColors ? trend === 'up' : trend === 'down';

  const badgeSizes = {
    sm: 'px-2 py-0.5 text-xs gap-0.5',
    md: 'px-2.5 py-1 text-xs gap-1',
    lg: 'px-3 py-1.5 text-sm gap-1.5',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <div
      className={cn(
        'flex items-center rounded-full font-semibold transition-colors',
        badgeSizes[size],
        isPositive && 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
        isNegative && 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400',
        trend === 'stable' && 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
      )}
    >
      {trend === 'up' && <ArrowUpRight className={iconSizes[size]} />}
      {trend === 'down' && <ArrowDownRight className={iconSizes[size]} />}
      {trend === 'stable' && <Minus className={iconSizes[size]} />}
      {value !== undefined && <span>{formatChange(value)}</span>}
    </div>
  );
};

// ==================== Main Component ====================

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  previousValue,
  format = 'currency',
  icon,
  iconColor,
  trend,
  trendValue,
  subtitle,
  isLoading = false,
  size = 'md',
  variant = 'default',
  accentColor,
  className,
  onClick,
}) => {
  if (isLoading) {
    return <KPICardSkeleton size={size} />;
  }

  // Calculate trend if not provided
  const calculatedTrend = trend || (
    previousValue !== undefined
      ? value > previousValue ? 'up' : value < previousValue ? 'down' : 'stable'
      : 'stable'
  );

  const calculatedTrendValue = trendValue ?? (
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : undefined
  );

  // Paddings based on size
  const paddings = {
    sm: 'p-4',
    md: 'p-5',
    lg: 'p-6',
  };

  // Icon container sizes
  const iconContainerSizes = {
    sm: 'p-2 rounded-xl',
    md: 'p-2.5 rounded-2xl',
    lg: 'p-3 rounded-2xl',
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  // Title sizes
  const titleSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  // Variant styles
  const variantStyles = {
    default: cn(
      'bg-white dark:bg-zinc-900',
      'border border-zinc-200/50 dark:border-zinc-800',
      'shadow-sm hover:shadow-md',
    ),
    gradient: cn(
      'bg-gradient-to-br from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-800',
      'border border-zinc-200/50 dark:border-zinc-700',
      'shadow-sm hover:shadow-md',
    ),
    outline: cn(
      'bg-transparent',
      'border-2 border-zinc-200 dark:border-zinc-700',
      'hover:border-zinc-300 dark:hover:border-zinc-600',
    ),
    glass: cn(
      'bg-white/80 dark:bg-zinc-900/80',
      'backdrop-blur-xl',
      'border border-white/20 dark:border-zinc-700/50',
      'shadow-lg',
    ),
  };

  return (
    <motion.div
      className={cn(
        'relative overflow-hidden rounded-2xl transition-all duration-300',
        'cursor-default select-none',
        variantStyles[variant],
        onClick && 'cursor-pointer',
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick ? { y: -2, scale: 1.01 } : undefined}
      onClick={onClick}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Accent Glow - Subtle */}
      {accentColor && (
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.03] blur-3xl transition-opacity group-hover:opacity-[0.06]"
          style={{ backgroundColor: accentColor }}
        />
      )}

      <div className={cn('relative z-10 flex flex-col justify-between h-full', paddings[size])}>
        {/* Header - Title + Icon */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-1">
            <h3 className={cn(
              'font-medium text-zinc-500 dark:text-zinc-400',
              titleSizes[size]
            )}>
              {title}
            </h3>
          </div>

          {icon && (
            <div
              className={cn(
                'flex items-center justify-center',
                'bg-zinc-100 dark:bg-zinc-800',
                'border border-zinc-200/50 dark:border-zinc-700/50',
                iconContainerSizes[size]
              )}
              style={iconColor ? { color: iconColor } : undefined}
            >
              <div className={cn(iconSizes[size], !iconColor && 'text-zinc-600 dark:text-zinc-400')}>
                {icon}
              </div>
            </div>
          )}
        </div>

        {/* Value */}
        <div className="mb-3">
          <AnimatedValue value={value} format={format} size={size} />
        </div>

        {/* Footer - Trend + Subtitle */}
        <div className="flex items-center justify-between min-h-[24px]">
          {calculatedTrendValue !== undefined ? (
            <TrendBadge
              trend={calculatedTrend}
              value={calculatedTrendValue}
              size={size}
              invertColors={title.includes('تكاليف') || title.includes('مصاريف') || title.includes('خسائر')}
            />
          ) : (
            <div />
          )}

          {subtitle && (
            <span className={cn(
              'text-zinc-400 dark:text-zinc-500 font-medium',
              size === 'sm' ? 'text-xs' : 'text-xs'
            )}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default memo(KPICard);
