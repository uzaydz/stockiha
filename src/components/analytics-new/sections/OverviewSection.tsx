/**
 * ============================================
 * STOCKIHA ANALYTICS - OVERVIEW SECTION
 * Enhanced Version with Interactive Features
 * ============================================
 */

import React, { memo, useMemo, useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowUpDown,
  Check,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  ChevronDown,
  Package,
  Users,
  Filter,
  MoreHorizontal,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { FilterState, SalesData, ProfitData, InventoryData, ExpenseData, CustomerData } from '../types';
import { formatCurrency, formatNumber, calculateChangePercent } from '../utils/formatters';

// ==================== Types ====================

interface OverviewSectionProps {
  filters: FilterState;
  salesData: SalesData | null;
  profitData: ProfitData | null;
  inventoryData: InventoryData | null;
  expenseData: ExpenseData | null;
  customerData: CustomerData | null;
  isLoading?: boolean;
}

type PeriodOption = 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear';

const periodLabels: Record<PeriodOption, string> = {
  today: 'اليوم',
  yesterday: 'أمس',
  last7: 'آخر 7 أيام',
  last30: 'آخر 30 يوم',
  thisMonth: 'هذا الشهر',
  lastMonth: 'الشهر الماضي',
  thisYear: 'هذه السنة',
};

// ==================== Period Selector Component ====================

const PeriodSelector: React.FC<{
  value: PeriodOption;
  onChange: (value: PeriodOption) => void;
  options?: PeriodOption[];
}> = ({ value, onChange, options = ['today', 'last7', 'thisMonth', 'thisYear'] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
      >
        {periodLabels[value]}
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-lg py-1 min-w-32"
          >
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => {
                  onChange(opt);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-sm text-right hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-between',
                  value === opt && 'text-orange-500 font-medium'
                )}
              >
                {periodLabels[opt]}
                {value === opt && <Check className="h-4 w-4" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==================== Animated Number Component ====================

const AnimatedNumber: React.FC<{
  value: number;
  formatter?: (val: number) => string;
  duration?: number;
}> = ({ value, formatter = (v) => v.toFixed(0), duration = 800 }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function (ease-out)
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{formatter(displayValue)}</>;
};

// ==================== Progress Ring Component ====================

const ProgressRing: React.FC<{
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  animated?: boolean;
}> = ({
  progress,
  size = 64,
  strokeWidth = 4,
  color = '#f97316',
  bgColor = 'currentColor',
  animated = true,
}) => {
    const [animatedProgress, setAnimatedProgress] = useState(0);
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    useEffect(() => {
      if (animated) {
        const timer = setTimeout(() => setAnimatedProgress(progress), 100);
        return () => clearTimeout(timer);
      } else {
        setAnimatedProgress(progress);
      }
    }, [progress, animated]);

    const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;

    return (
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          className="text-zinc-100 dark:text-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: animated ? 'stroke-dashoffset 0.8s ease-out' : 'none' }}
        />
      </svg>
    );
  };

// ==================== Product Overview Card ====================

const ProductOverviewCard: React.FC<{
  totalSales: number;
  totalOrders: number;
  topCategories: { id: string; name: string; value: number }[];
  previousSales?: number;
  isLoading?: boolean;
}> = ({ totalSales, totalOrders, topCategories, previousSales = 0, isLoading }) => {
  const [period, setPeriod] = useState<PeriodOption>('thisMonth');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, []);

  const trend = useMemo(() => {
    if (!previousSales) return 0;
    return calculateChangePercent(totalSales, previousSales);
  }, [totalSales, previousSales]);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-500 dark:text-zinc-400">نظرة عامة على المنتجات</span>
          <span className="text-zinc-300 dark:text-zinc-600 text-xs cursor-help" title="إجمالي المبيعات لهذه الفترة">ⓘ</span>
        </div>
        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Main Value */}
      <div className="flex items-baseline gap-3 mb-1">
        <div className="text-3xl font-bold text-zinc-900 dark:text-white">
          <AnimatedNumber value={totalSales} formatter={formatCurrency} />
        </div>
        {trend !== 0 && (
          <span className={cn(
            'text-sm font-medium flex items-center gap-0.5',
            trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
          )}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
          </span>
        )}
      </div>
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        إجمالي المبيعات
      </div>

      {/* Product Selection */}
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-zinc-600 dark:text-zinc-400">اختيار حسب الفئة</span>
          <span className="text-xs text-zinc-500">طلبات جديدة: {formatNumber(totalOrders)}</span>
        </div>
        <div
          ref={scrollContainerRef}
          className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 [&::-webkit-scrollbar]:hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {topCategories.map((cat, index) => (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              className={cn(
                'shrink-0 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-1.5 transition-all whitespace-nowrap',
                selectedCategory === cat.id
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : index === 0 && !selectedCategory
                    ? 'bg-orange-500/90 text-white hover:bg-orange-500'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              )}
            >
              {cat.name}
              <span className={cn(
                "rounded-full w-5 h-5 flex items-center justify-center text-xs",
                selectedCategory === cat.id || (index === 0 && !selectedCategory)
                  ? "bg-white/20 text-white"
                  : "bg-zinc-200 dark:bg-zinc-700 text-zinc-500"
              )}>
                {index + 1}
              </span>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

// ==================== KPI Card with Ring ====================

const KPICardWithRing: React.FC<{
  title: string;
  tooltip: string;
  value: number;
  trend: number;
  progress: number;
  onViewDetails?: () => void;
  isLoading?: boolean;
}> = ({ title, tooltip, value, trend, progress, onViewDetails, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-32 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">{title}</span>
        <span className="text-zinc-300 dark:text-zinc-600 text-xs cursor-help" title={tooltip}>ⓘ</span>
      </div>

      {/* Value with Progress Ring */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white mb-1">
            <AnimatedNumber value={value} formatter={formatCurrency} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-500">مقارنة بالشهر الماضي</span>
            <span className={cn(
              'text-sm font-medium flex items-center gap-0.5',
              trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
            )}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Progress Ring */}
        <div className="relative">
          <ProgressRing progress={progress} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Action */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-500 mt-4 transition-colors"
        >
          عرض التفاصيل
          <ArrowLeft className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
};

// ==================== Analytics Chart Card ====================

// ==================== Custom Chart Tooltip ====================

const CustomChartTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const dateStr = payload[0].payload.date;
    let formattedDate = label;

    if (dateStr) {
      try {
        const date = new Date(dateStr);
        if (!isNaN(date.getTime())) {
          formattedDate = new Intl.DateTimeFormat('ar-DZ', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            numberingSystem: 'latn'
          }).format(date);
        }
      } catch (e) {
        // Fallback to label if date parsing fails
      }
    }

    return (
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl text-right min-w-[200px]">
        <p className="text-zinc-400 text-xs mb-3 font-medium flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white font-bold font-mono text-xl tracking-tight">
              {formatCurrency(payload[0].value)}
            </span>
            <span className="text-orange-400 text-[10px] font-bold px-2 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              المبيعات
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ==================== Analytics Chart Card ====================

const AnalyticsChartCard: React.FC<{
  salesValue: number;
  convRate: number;
  salesTrend: number;
  convTrend: number;
  chartData: { label: string; value: number; date?: string }[];
  isLoading?: boolean;
}> = ({ salesValue, convRate, salesTrend, convTrend, chartData, isLoading }) => {
  const [period, setPeriod] = useState<PeriodOption>('thisYear');

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-72 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 h-full flex flex-col"
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            تحليل الأداء المالي
          </h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            نظرة شاملة على المبيعات والإيرادات
          </p>
        </div>

        <PeriodSelector value={period} onChange={setPeriod} options={['last7', 'thisMonth', 'thisYear']} />
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <TrendingUp className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">إجمالي المبيعات</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
              <AnimatedNumber value={Math.abs(salesValue)} formatter={formatCurrency} />
            </span>
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1",
              salesTrend >= 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10"
                : "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10"
            )}>
              {salesTrend > 0 ? "+" : ""}{salesTrend.toFixed(1)}%
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800/50">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
            <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">معدل التحويل</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-zinc-900 dark:text-white font-mono">
              <AnimatedNumber value={convRate} formatter={(v) => v.toFixed(2)} />%
            </span>
            <span className={cn(
              "text-xs font-medium px-1.5 py-0.5 rounded flex items-center gap-1",
              convTrend >= 0
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10"
                : "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10"
            )}>
              {convTrend > 0 ? "+" : ""}{convTrend.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 w-full min-h-[250px]" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161, 161, 170, 0.1)" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 11 }}
              dy={10}
              tickFormatter={(dateStr) => {
                if (!dateStr) return '';
                try {
                  const date = new Date(dateStr);
                  if (isNaN(date.getTime())) return dateStr;
                  return new Intl.DateTimeFormat('ar-DZ', {
                    day: 'numeric',
                    month: 'short',
                    numberingSystem: 'latn'
                  }).format(date);
                } catch {
                  return dateStr;
                }
              }}
              interval={period === 'last7' ? 0 : 'preserveStartEnd'}
              minTickGap={period === 'last7' ? 0 : 30}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
              tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              dx={10}
            />
            <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f97316"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorSales)"
              activeDot={{ r: 4, strokeWidth: 0, fill: '#fff', stroke: '#f97316' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
};

// ==================== Sales Performance Card ====================

const SalesPerformanceCard: React.FC<{
  percentage: number;
  dailyTotal: number;
  averageSales: number;
  weeklyData?: { label: string; value: number }[];
  isLoading?: boolean;
}> = ({ percentage, dailyTotal, averageSales, weeklyData = [], isLoading }) => {
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsAnimated(true), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-64 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  // Calculate segments for donut chart
  const segments = [
    { label: 'المكتمل', value: percentage, color: '#f97316' },
    { label: 'المتبقي', value: 100 - percentage, color: '#fed7aa' },
  ];

  let cumulativePercent = 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">أداء المبيعات</span>
        <span className="text-zinc-300 dark:text-zinc-600 text-xs cursor-help" title="نسبة تحقيق الهدف">ⓘ</span>
      </div>

      {/* Animated Donut Chart */}
      <div className="flex flex-col items-center mb-6">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            {segments.map((segment, index) => {
              const startPercent = cumulativePercent;
              cumulativePercent += segment.value;

              return (
                <motion.circle
                  key={index}
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  stroke={segment.color}
                  strokeWidth="2.5"
                  strokeDasharray={`${segment.value} ${100 - segment.value}`}
                  strokeDashoffset={-startPercent}
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 100' }}
                  animate={isAnimated ? { strokeDasharray: `${segment.value} ${100 - segment.value}` } : {}}
                  transition={{ duration: 1, delay: index * 0.2, ease: 'easeOut' }}
                />
              );
            })}
          </svg>

          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <motion.span
              className="text-2xl font-bold text-zinc-900 dark:text-white"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              <AnimatedNumber value={percentage} formatter={(v) => `${v.toFixed(1)}%`} />
            </motion.span>
            <motion.div
              className="flex items-center gap-0.5 text-emerald-500 text-xs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <TrendingUp className="h-3 w-3" />
            </motion.div>
          </div>
        </div>
        <span className="text-sm text-zinc-500 dark:text-zinc-400 mt-2">منذ الأمس</span>
      </div>

      {/* Legend */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">إجمالي المبيعات اليومية</span>
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-white">{formatCurrency(dailyTotal)}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-200" />
            <span className="text-sm text-zinc-600 dark:text-zinc-400">متوسط المبيعات</span>
          </div>
          <span className="text-sm font-medium text-zinc-900 dark:text-white">{formatCurrency(averageSales)}</span>
        </div>
      </div>

      {/* Action */}
      <button className="flex items-center gap-1 text-sm text-zinc-600 dark:text-zinc-400 hover:text-orange-500 mt-4 transition-colors">
        عرض التفاصيل
        <ArrowLeft className="h-4 w-4" />
      </button>
    </motion.div>
  );
};

// ==================== Customers Heatmap Card ====================

const CustomersHeatmapCard: React.FC<{
  value: number;
  trend: number;
  weekData: { day: string; hours: number[] }[];
  isLoading?: boolean;
}> = ({ value, trend, weekData, isLoading }) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-40 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  const getIntensityClass = (intensity: number) => {
    const classes = [
      'bg-orange-50 dark:bg-orange-900/10',
      'bg-orange-100 dark:bg-orange-900/20',
      'bg-orange-200 dark:bg-orange-900/40',
      'bg-orange-300 dark:bg-orange-800/60',
      'bg-orange-400 dark:bg-orange-700',
      'bg-orange-500 dark:bg-orange-600',
    ];
    return classes[Math.min(intensity, 5)];
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
            <Users className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
          </div>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">نشاط العملاء</span>
        </div>
        <button className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
        </button>
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2 mb-4">
        <span className="text-3xl font-bold text-zinc-900 dark:text-white">
          <AnimatedNumber value={value} formatter={formatNumber} />
        </span>
        <span className={cn(
          'text-sm font-medium flex items-center gap-0.5',
          trend >= 0 ? 'text-emerald-500' : 'text-rose-500'
        )}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend >= 0 ? '+' : ''}{trend.toFixed(1)}%
        </span>
      </div>

      {/* Heatmap Grid */}
      <div className="space-y-1">
        {weekData.map((row, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-1">
            <span className="w-16 text-xs text-zinc-400 truncate">{row.day}</span>
            <div className="flex gap-0.5 flex-1">
              {row.hours.map((intensity, colIndex) => (
                <motion.div
                  key={colIndex}
                  className={cn(
                    'flex-1 h-4 rounded-sm transition-all cursor-pointer',
                    getIntensityClass(intensity),
                    hoveredCell?.row === rowIndex && hoveredCell?.col === colIndex && 'ring-2 ring-orange-500 ring-offset-1'
                  )}
                  onMouseEnter={() => setHoveredCell({ row: rowIndex, col: colIndex })}
                  onMouseLeave={() => setHoveredCell(null)}
                  whileHover={{ scale: 1.1 }}
                  title={`${row.day} - الساعة ${colIndex + 8}:00 - ${intensity} عميل`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1 mt-3">
        <span className="text-xs text-zinc-400 mr-2">النشاط:</span>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={cn('w-3 h-3 rounded-sm', getIntensityClass(i))} />
        ))}
      </div>
    </motion.div>
  );
};

// ==================== Top Products Table ====================

interface TopProduct {
  rank: number;
  id?: string;
  name: string;
  price: number;
  progress: number;
  sales: number;
  revenue: number;
  stock: number;
  status: 'in_stock' | 'out_of_stock' | 'low_stock';
}

type SortField = 'revenue' | 'sales' | 'stock';

const TopProductsTable: React.FC<{
  products: TopProduct[];
  isLoading?: boolean;
}> = ({ products, isLoading }) => {
  const [sortField, setSortField] = useState<SortField>('revenue');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const sortedProducts = useMemo(() => {
    return [...products].sort((a, b) => {
      const multiplier = sortDirection === 'desc' ? -1 : 1;
      return (a[sortField] - b[sortField]) * multiplier;
    }).map((p, i) => ({ ...p, rank: i + 1 }));
  }, [products, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse">
        <div className="h-48 bg-zinc-200 dark:bg-zinc-700 rounded" />
      </div>
    );
  }

  const getStatusBadge = (status: TopProduct['status']) => {
    switch (status) {
      case 'in_stock':
        return <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs rounded-full">متوفر</span>;
      case 'out_of_stock':
        return <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 text-xs rounded-full">نفد</span>;
      case 'low_stock':
        return <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs rounded-full">منخفض</span>;
    }
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <th
      className="text-right py-3 font-medium cursor-pointer hover:text-orange-500 transition-colors select-none"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn(
          'h-3 w-3 transition-colors',
          sortField === field ? 'text-orange-500' : 'text-zinc-400'
        )} />
      </div>
    </th>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-zinc-600 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-900 dark:text-white">أفضل المنتجات</span>
        </div>
        <button className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600 transition-colors">
          عرض التفاصيل
          <ArrowLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-xs text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <th className="text-right py-3 font-medium">#</th>
              <th className="text-right py-3 font-medium">المنتج</th>
              <SortHeader field="sales" label="المبيعات" />
              <SortHeader field="revenue" label="الإيرادات" />
              <SortHeader field="stock" label="المخزون" />
              <th className="text-right py-3 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    لا توجد بيانات للعرض
                  </td>
                </tr>
              ) : (
                sortedProducts.map((product) => (
                  <motion.tr
                    key={product.id || product.rank}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="border-b border-zinc-50 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <motion.div
                          layout
                          className="w-6 h-6 rounded bg-orange-500 flex items-center justify-center text-white text-xs font-bold"
                        >
                          {product.rank}
                        </motion.div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div>
                        <span className="text-sm font-medium text-zinc-900 dark:text-white line-clamp-1">{product.name}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-zinc-500">{formatCurrency(product.price)}</span>
                          <div className="flex-1 max-w-20 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full bg-orange-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(product.progress, 100)}%` }}
                              transition={{ duration: 0.6, delay: 0.2 }}
                            />
                          </div>
                          <span className="text-xs text-emerald-500">{product.progress}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-sm text-zinc-600 dark:text-zinc-400">{product.sales} قطعة</td>
                    <td className="py-3 text-sm text-zinc-900 dark:text-white font-medium">{formatCurrency(product.revenue)}</td>
                    <td className="py-3 text-sm text-zinc-600 dark:text-zinc-400">{product.stock}</td>
                    <td className="py-3">{getStatusBadge(product.status)}</td>
                  </motion.tr>
                ))
              )}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// ==================== Main Component ====================

const OverviewSection: React.FC<OverviewSectionProps> = ({
  filters,
  salesData,
  profitData,
  inventoryData,
  expenseData,
  customerData,
  isLoading = false,
}) => {
  // Extract top categories from sales data
  const topCategories = useMemo(() => {
    const categories = salesData?.salesByCategory || [];
    return categories.map((cat) => ({
      id: cat.id || cat.name,
      name: cat.name || 'غير مصنف',
      value: cat.value || 0,
    }));
  }, [salesData]);

  // Generate chart data from salesByDay
  const chartData = useMemo(() => {
    const data = salesData?.salesByDay || [];
    if (data.length === 0) {
      // Return placeholder data
      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس'];
      return months.map((label, i) => ({
        label,
        value: Math.random() * 10000 + 5000,
      }));
    }
    return data.slice(0, 12).map(d => ({
      label: d.label || d.date || '',
      value: d.value || 0,
      date: d.date,
    }));
  }, [salesData]);

  // Generate week heatmap data from customer activity
  const weekData = useMemo(() => {
    const activeCustomers = customerData?.activeCustomers || 0;
    const baseIntensity = Math.min(Math.floor(activeCustomers / 50), 5);

    const days = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];

    return days.slice(0, 5).map((day, dayIndex) => ({
      day,
      hours: Array.from({ length: 12 }, (_, hourIndex) => {
        // Simulate higher activity during business hours
        const isPeakHour = hourIndex >= 2 && hourIndex <= 8;
        const isWeekend = dayIndex >= 5;
        const boost = isPeakHour ? 2 : 0;
        const weekendPenalty = isWeekend ? -1 : 0;
        return Math.max(0, Math.min(5, baseIntensity + boost + weekendPenalty + Math.floor(Math.random() * 2)));
      }),
    }));
  }, [customerData]);

  // Calculate top products from sales data
  const topProducts = useMemo<TopProduct[]>(() => {
    const products = salesData?.topProducts || [];

    if (products.length === 0) {
      return [];
    }
    const topN = products.slice(0, 5);
    const maxRevenue = topN.reduce((m, p) => Math.max(m, p.revenue || 0), 0) || 1;

    return topN.map((p, i) => {
      const avgPrice = p.quantitySold > 0 ? p.revenue / p.quantitySold : 0;
      const progress = Math.min(100, Math.round(((p.revenue || 0) / maxRevenue) * 100));
      const stock = 0;

      return {
        rank: i + 1,
        id: p.productId,
        name: p.productName || `منتج ${i + 1}`,
        price: avgPrice,
        progress,
        sales: p.quantitySold || 0,
        revenue: p.revenue || 0,
        stock,
        status: 'in_stock',
      };
    });
  }, [salesData, inventoryData]);

  // Calculate profit margin for performance ring
  const profitMargin = useMemo(() => {
    if (!salesData?.totalSales || !profitData?.grossProfit) return 15;
    return Math.min(100, Math.abs((profitData.grossProfit / salesData.totalSales) * 100));
  }, [salesData, profitData]);

  // Calculate conversion rate
  const conversionRate = useMemo(() => {
    const orders = salesData?.totalOrders || 0;
    const customers = customerData?.activeCustomers || 1;
    return Math.min(100, (orders / Math.max(customers, 1)) * 100);
  }, [salesData, customerData]);

  // Calculate trends
  const salesTrend = useMemo(() => {
    if (!salesData?.totalSales) return 0;
    // This would ideally come from comparing with previous period
    return Math.random() * 20 - 5; // Placeholder
  }, [salesData]);

  return (
    <div className="space-y-6">
      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Product Overview */}
        <ProductOverviewCard
          totalSales={salesData?.totalSales || 0}
          totalOrders={salesData?.totalOrders || 0}
          topCategories={topCategories.length > 0 ? topCategories : [
            { id: '1', name: 'مستحضرات التجميل', value: 0 },
            { id: '2', name: 'الأدوات المنزلية', value: 0 },
          ]}
          isLoading={isLoading}
        />

        {/* Active Sales */}
        <KPICardWithRing
          title="المبيعات النشطة"
          tooltip="المبيعات المكتملة هذه الفترة"
          value={salesData?.totalSales ? salesData.totalSales * 0.62 : 0}
          trend={salesTrend}
          progress={75}
          isLoading={isLoading}
        />

        {/* Product Revenue */}
        <KPICardWithRing
          title="إيرادات المنتجات"
          tooltip="صافي الربح من المبيعات"
          value={profitData?.grossProfit || 0}
          trend={profitData?.grossProfit ? 7 : 0}
          progress={85}
          isLoading={isLoading}
        />
      </div>

      {/* Row 2: Analytics Chart & Sales Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analytics Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <AnalyticsChartCard
            salesValue={salesData?.totalSales || 0}
            convRate={conversionRate}
            salesTrend={salesTrend}
            convTrend={13}
            chartData={chartData}
            isLoading={isLoading}
          />
        </div>

        {/* Sales Performance */}
        <SalesPerformanceCard
          percentage={profitMargin}
          dailyTotal={salesData?.averageOrderValue || 0}
          averageSales={salesData?.averageOrderValue ? salesData.averageOrderValue * 0.8 : 0}
          isLoading={isLoading}
        />
      </div>

      {/* Row 3: Customers Heatmap & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customers Heatmap */}
        <CustomersHeatmapCard
          value={customerData?.totalCustomers || 0}
          trend={customerData?.totalCustomers ? 4 : 0}
          weekData={weekData}
          isLoading={isLoading}
        />

        {/* Top Products */}
        <div className="lg:col-span-2">
          <TopProductsTable
            products={topProducts}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default memo(OverviewSection);
