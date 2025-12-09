/**
 * ============================================
 * STOCKIHA ANALYTICS - SECTION HEADER
 * رأس القسم - تصميم موحد لكل الأقسام
 * ============================================
 */

import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconColor?: string;
  actions?: ReactNode;
  breadcrumb?: string[];
  showInfo?: boolean;
  infoContent?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'centered' | 'minimal';
}

// ==================== Main Component ====================

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  icon,
  iconColor,
  actions,
  breadcrumb,
  showInfo = false,
  infoContent,
  className,
  size = 'md',
  variant = 'default',
}) => {
  // Size configurations
  const sizes = {
    sm: {
      title: 'text-lg font-semibold',
      subtitle: 'text-xs',
      icon: 'p-2 rounded-xl',
      iconSize: 'h-4 w-4',
      gap: 'gap-3',
    },
    md: {
      title: 'text-xl font-bold',
      subtitle: 'text-sm',
      icon: 'p-2.5 rounded-xl',
      iconSize: 'h-5 w-5',
      gap: 'gap-4',
    },
    lg: {
      title: 'text-2xl font-bold',
      subtitle: 'text-base',
      icon: 'p-3 rounded-2xl',
      iconSize: 'h-6 w-6',
      gap: 'gap-5',
    },
  };

  const config = sizes[size];

  // Variant styles
  const variantStyles = {
    default: 'justify-between',
    centered: 'justify-center text-center',
    minimal: 'justify-start',
  };

  return (
    <motion.div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center',
        variantStyles[variant],
        config.gap,
        'mb-6',
        className
      )}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left Side - Title + Icon */}
      <div className={cn(
        'flex items-center',
        config.gap,
        variant === 'centered' && 'flex-col'
      )}>
        {/* Icon */}
        {icon && (
          <div
            className={cn(
              'flex items-center justify-center',
              'bg-zinc-100 dark:bg-zinc-800',
              'border border-zinc-200/50 dark:border-zinc-700/50',
              config.icon
            )}
            style={iconColor ? { backgroundColor: `${iconColor}15`, borderColor: `${iconColor}30` } : undefined}
          >
            <div
              className={config.iconSize}
              style={iconColor ? { color: iconColor } : undefined}
            >
              {icon}
            </div>
          </div>
        )}

        {/* Title + Subtitle */}
        <div className={cn(variant === 'centered' && 'text-center')}>
          {/* Breadcrumb */}
          {breadcrumb && breadcrumb.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 mb-1">
              {breadcrumb.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <ChevronLeft className="h-3 w-3" />}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <h2 className={cn(
              'text-zinc-900 dark:text-white tracking-tight',
              config.title
            )}>
              {title}
            </h2>

            {showInfo && (
              <button
                className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
                title={infoContent}
              >
                <Info className="h-4 w-4" />
              </button>
            )}
          </div>

          {subtitle && (
            <p className={cn(
              'text-zinc-500 dark:text-zinc-400 mt-0.5',
              config.subtitle
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right Side - Actions */}
      {actions && variant !== 'centered' && (
        <div className="flex items-center gap-2 mt-3 sm:mt-0">
          {actions}
        </div>
      )}
    </motion.div>
  );
};

export default memo(SectionHeader);

// ==================== Section Divider ====================

export const SectionDivider: React.FC<{
  className?: string;
  variant?: 'line' | 'dashed' | 'dots' | 'fade';
}> = ({ className, variant = 'line' }) => {
  const variants = {
    line: 'h-px bg-zinc-200 dark:bg-zinc-800',
    dashed: 'h-px border-b border-dashed border-zinc-200 dark:border-zinc-800',
    dots: 'flex items-center justify-center gap-1.5',
    fade: 'h-px bg-gradient-to-r from-transparent via-zinc-200 dark:via-zinc-800 to-transparent',
  };

  if (variant === 'dots') {
    return (
      <div className={cn(variants[variant], 'my-8', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        ))}
      </div>
    );
  }

  return <div className={cn(variants[variant], 'my-8', className)} />;
};

// ==================== Section Container ====================

export const SectionContainer: React.FC<{
  children: ReactNode;
  id?: string;
  className?: string;
  variant?: 'default' | 'card' | 'bordered';
}> = ({ children, id, className, variant = 'default' }) => {
  const variants = {
    default: '',
    card: 'bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200/50 dark:border-zinc-800 p-6',
    bordered: 'border-t border-zinc-200 dark:border-zinc-800 pt-8',
  };

  return (
    <section
      id={id}
      className={cn('scroll-mt-20', variants[variant], className)}
    >
      {children}
    </section>
  );
};

// ==================== Quick Stats Row ====================

export interface QuickStat {
  label: string;
  value: string | number;
  icon?: ReactNode;
  color?: string;
}

export const QuickStatsRow: React.FC<{
  stats: QuickStat[];
  className?: string;
}> = ({ stats, className }) => {
  return (
    <div className={cn(
      'flex flex-wrap items-center gap-4 p-4',
      'bg-zinc-50 dark:bg-zinc-800/50 rounded-xl',
      'border border-zinc-100 dark:border-zinc-800',
      className
    )}>
      {stats.map((stat, index) => (
        <React.Fragment key={index}>
          {index > 0 && (
            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />
          )}
          <div className="flex items-center gap-2">
            {stat.icon && (
              <div
                className="text-zinc-400 dark:text-zinc-500"
                style={stat.color ? { color: stat.color } : undefined}
              >
                {stat.icon}
              </div>
            )}
            <div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">{stat.label}</p>
              <p
                className="text-sm font-semibold text-zinc-900 dark:text-white"
                style={stat.color ? { color: stat.color } : undefined}
              >
                {stat.value}
              </p>
            </div>
          </div>
        </React.Fragment>
      ))}
    </div>
  );
};
