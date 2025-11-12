/**
 * مكون KPI Card احترافي
 * يعرض مؤشر أداء رئيسي مع مقارنة بالفترة السابقة وتصميم متجاوب
 */

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  isLoading?: boolean;
  onClick?: () => void;
  className?: string;
  format?: 'currency' | 'number' | 'percentage' | 'text';
  sparklineData?: number[];
}

type ColorConfig = {
  bg: string;
  iconBg: string;
  iconText: string;
  trend: string;
};

// ============================================================================
// Component
// ============================================================================

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = 'primary',
  isLoading = false,
  onClick,
  className,
  format = 'text',
  sparklineData
}) => {

  // تنسيق القيمة حسب النوع
  const formatValue = (val: string | number): string => {
    if (typeof val === 'string') return val;

    switch (format) {
      case 'currency':
        return `${val.toLocaleString('ar-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} دج`;
      case 'number':
        return val.toLocaleString('ar-DZ');
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return String(val);
    }
  };

  // ألوان حسب النوع
  const colorConfigs: Record<string, ColorConfig> = {
    primary: {
      bg: 'bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20',
      iconBg: 'bg-primary-500 dark:bg-primary-600',
      iconText: 'text-white',
      trend: 'text-primary-600 dark:text-primary-400'
    },
    success: {
      bg: 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
      iconBg: 'bg-green-500 dark:bg-green-600',
      iconText: 'text-white',
      trend: 'text-green-600 dark:text-green-400'
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20',
      iconBg: 'bg-amber-500 dark:bg-amber-600',
      iconText: 'text-white',
      trend: 'text-amber-600 dark:text-amber-400'
    },
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20',
      iconBg: 'bg-red-500 dark:bg-red-600',
      iconText: 'text-white',
      trend: 'text-red-600 dark:text-red-400'
    },
    info: {
      bg: 'bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
      iconBg: 'bg-blue-500 dark:bg-blue-600',
      iconText: 'text-white',
      trend: 'text-blue-600 dark:text-blue-400'
    }
  };

  const colorConfig = colorConfigs[color];

  // أيقونة التوجه
  const TrendIcon = trend
    ? trend.isPositive
      ? TrendingUp
      : trend.value === 0
      ? Minus
      : TrendingDown
    : null;

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-300',
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02]',
        'border-none shadow-sm',
        className
      )}
      onClick={onClick}
    >
      {/* خلفية متدرجة */}
      <div className={cn('absolute inset-0', colorConfig.bg)} />

      {/* المحتوى */}
      <div className="relative p-6">
        <div className="flex items-start justify-between">
          {/* معلومات KPI */}
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </p>

            {isLoading ? (
              <div className="space-y-2">
                <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            ) : (
              <>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatValue(value)}
                </p>

                {subtitle && (
                  <p className="text-xs text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </>
            )}
          </div>

          {/* أيقونة */}
          <div className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg shadow-md',
            colorConfig.iconBg
          )}>
            <Icon className={cn('w-6 h-6', colorConfig.iconText)} />
          </div>
        </div>

        {/* Trend Indicator */}
        {trend && !isLoading && (
          <div className="mt-4 flex items-center gap-2">
            {TrendIcon && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                trend.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              )}>
                <TrendIcon className="w-4 h-4" />
                <span>{Math.abs(trend.value).toFixed(1)}%</span>
              </div>
            )}
            {trend.label && (
              <span className="text-xs text-muted-foreground">
                {trend.label}
              </span>
            )}
          </div>
        )}

        {/* Sparkline (إن وُجد) */}
        {sparklineData && sparklineData.length > 0 && !isLoading && (
          <div className="mt-4">
            <MiniSparkline data={sparklineData} color={color} />
          </div>
        )}
      </div>

      {/* مؤشر تفاعلي */}
      {onClick && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Card>
  );
};

// ============================================================================
// Mini Sparkline Component
// ============================================================================

const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  const colorMap: Record<string, string> = {
    primary: '#FC5D41',
    success: '#10B981',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6'
  };

  return (
    <svg
      viewBox="0 0 100 30"
      className="w-full h-8"
      preserveAspectRatio="none"
    >
      <polyline
        points={points}
        fill="none"
        stroke={colorMap[color] || colorMap.primary}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  );
};

export default KPICard;
