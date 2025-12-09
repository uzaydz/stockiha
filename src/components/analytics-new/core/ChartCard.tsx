/**
 * ============================================
 * STOCKIHA ANALYTICS - CHART CARD
 * حاوية الرسوم البيانية - تصميم موحد
 * ============================================
 */

import React, { memo, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { MoreHorizontal, Maximize2, Download, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

// ==================== Types ====================

export interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  isEmpty?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  actions?: ReactNode;
  height?: number | string;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'elevated' | 'bordered' | 'glass';
  showRefresh?: boolean;
  showExpand?: boolean;
  showDownload?: boolean;
  onRefresh?: () => void;
  onExpand?: () => void;
  onDownload?: () => void;
}

// ==================== Loading Skeleton ====================

const ChartSkeleton: React.FC<{ height?: number | string }> = ({ height = 300 }) => {
  return (
    <div
      className="w-full animate-pulse"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="h-full w-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Fake chart bars */}
          <div className="flex items-end gap-2 h-40">
            {[0.6, 0.8, 0.4, 0.9, 0.5, 0.7, 0.3].map((h, i) => (
              <motion.div
                key={i}
                className="w-8 bg-zinc-200 dark:bg-zinc-700 rounded-t"
                style={{ height: `${h * 100}%` }}
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              />
            ))}
          </div>
          {/* Axis line */}
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-700" />
        </div>
      </div>
    </div>
  );
};

// ==================== Empty State ====================

const EmptyState: React.FC<{
  message?: string;
  icon?: ReactNode;
}> = ({ message = 'لا توجد بيانات متاحة', icon }) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      {icon ? (
        <div className="mb-4 text-zinc-300 dark:text-zinc-600">
          {icon}
        </div>
      ) : (
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-zinc-300 dark:text-zinc-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
      )}
      <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500 text-center">
        {message}
      </p>
    </div>
  );
};

// ==================== Action Button ====================

const ActionButton: React.FC<{
  icon: ReactNode;
  onClick?: () => void;
  title?: string;
}> = ({ icon, onClick, title }) => {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300',
        'hover:bg-zinc-100 dark:hover:bg-zinc-800',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
      )}
    >
      {icon}
    </button>
  );
};

// ==================== Main Component ====================

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  subtitle,
  children,
  isLoading = false,
  isEmpty = false,
  emptyMessage,
  emptyIcon,
  actions,
  height = 300,
  className,
  headerClassName,
  contentClassName,
  variant = 'default',
  showRefresh = false,
  showExpand = false,
  showDownload = false,
  onRefresh,
  onExpand,
  onDownload,
}) => {
  // Variant styles
  const variantStyles = {
    default: cn(
      'bg-white dark:bg-zinc-900',
      'border border-zinc-200/50 dark:border-zinc-800',
      'shadow-sm',
    ),
    elevated: cn(
      'bg-white dark:bg-zinc-900',
      'shadow-lg shadow-zinc-200/50 dark:shadow-zinc-950/50',
      'border border-zinc-100 dark:border-zinc-800',
    ),
    bordered: cn(
      'bg-transparent',
      'border-2 border-zinc-200 dark:border-zinc-700',
    ),
    glass: cn(
      'bg-white/80 dark:bg-zinc-900/80',
      'backdrop-blur-xl',
      'border border-white/20 dark:border-zinc-700/50',
      'shadow-lg',
    ),
  };

  const hasActions = actions || showRefresh || showExpand || showDownload;

  return (
    <motion.div
      className={cn(
        'rounded-2xl overflow-hidden',
        variantStyles[variant],
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center justify-between px-5 pt-5 pb-3',
        headerClassName
      )}>
        <div className="flex flex-col gap-0.5">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-white">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">
              {subtitle}
            </p>
          )}
        </div>

        {hasActions && (
          <div className="flex items-center gap-1">
            {showRefresh && (
              <ActionButton
                icon={<RefreshCw className="h-4 w-4" />}
                onClick={onRefresh}
                title="تحديث"
              />
            )}
            {showDownload && (
              <ActionButton
                icon={<Download className="h-4 w-4" />}
                onClick={onDownload}
                title="تحميل"
              />
            )}
            {showExpand && (
              <ActionButton
                icon={<Maximize2 className="h-4 w-4" />}
                onClick={onExpand}
                title="توسيع"
              />
            )}
            {actions}
          </div>
        )}
      </div>

      {/* Content */}
      <div
        className={cn('px-5 pb-5', contentClassName)}
        style={{ minHeight: typeof height === 'number' ? `${height}px` : height }}
      >
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : isEmpty ? (
          <EmptyState message={emptyMessage} icon={emptyIcon} />
        ) : (
          <div
            className="w-full"
            style={{ height: typeof height === 'number' ? `${height}px` : height }}
          >
            {children}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default memo(ChartCard);

// ==================== Grid Layout Components ====================

export const ChartGrid: React.FC<{
  children: ReactNode;
  columns?: 1 | 2 | 3 | 4;
  gap?: 4 | 5 | 6 | 8;
  className?: string;
}> = ({ children, columns = 2, gap = 6, className }) => {
  const columnClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 lg:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 xl:grid-cols-4',
  };

  const gapClasses = {
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={cn('grid', columnClasses[columns], gapClasses[gap], className)}>
      {children}
    </div>
  );
};

export const ChartRow: React.FC<{
  children: ReactNode;
  gap?: 4 | 5 | 6 | 8;
  className?: string;
}> = ({ children, gap = 6, className }) => {
  const gapClasses = {
    4: 'gap-4',
    5: 'gap-5',
    6: 'gap-6',
    8: 'gap-8',
  };

  return (
    <div className={cn('flex flex-col lg:flex-row', gapClasses[gap], className)}>
      {children}
    </div>
  );
};
