/**
 * ============================================
 * STOCKIHA ANALYTICS - PROFIT SECTION
 * قسم تقارير الأرباح التفصيلية - تصميم Premium موحد
 * ============================================
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  PiggyBank,
  Wallet,
  Receipt,
  CircleDollarSign,
  Calculator,
  Scale,
  Minus,
  Equal,
  ChevronUp,
  ChevronDown,
  Calendar,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import type { FilterState, ProfitData } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface ProfitSectionProps {
  filters: FilterState;
  data: ProfitData | null;
  isLoading?: boolean;
}

// ==================== Animated Number Component ====================

const AnimatedValue: React.FC<{ value: number; format?: 'currency' | 'number' | 'percent'; duration?: number }> = ({
  value,
  format = 'number',
  duration = 1000,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const startTime = useRef<number | null>(null);
  const animationFrame = useRef<number | null>(null);

  useEffect(() => {
    const startValue = displayValue;
    const endValue = value;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const progress = Math.min((timestamp - startTime.current) / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const current = startValue + (endValue - startValue) * easeOutQuart;
      setDisplayValue(current);

      if (progress < 1) {
        animationFrame.current = requestAnimationFrame(animate);
      }
    };

    animationFrame.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current);
      }
    };
  }, [value]);

  const formatted = useMemo(() => {
    switch (format) {
      case 'currency':
        return formatCurrency(displayValue);
      case 'percent':
        return formatPercent(displayValue);
      default:
        return formatNumber(displayValue);
    }
  }, [displayValue, format]);

  return <span>{formatted}</span>;
};

// ==================== Profit Gauge Chart ====================

const ProfitGauge: React.FC<{
  value: number;
  max?: number;
  size?: number;
  isProfit?: boolean;
}> = ({ value, max = 50, size = 200, isProfit = true }) => {
  // Ensure value doesn't exceed max for the visual bar
  const displayValue = Math.min(Math.abs(value), max);

  const data = [
    {
      name: 'Margin',
      value: displayValue,
      fill: isProfit ? '#10b981' : '#ef4444',
    }
  ];

  return (
    <div className="relative flex items-center justify-center -mt-8" style={{ width: size, height: size }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="65%"
          outerRadius="80%"
          barSize={15}
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <PolarAngleAxis
            type="number"
            domain={[0, max]}
            angleAxisId={0}
            tick={false}
          />
          <RadialBar
            background={{ fill: 'rgba(161, 161, 170, 0.1)' }}
            dataKey="value"
            cornerRadius={10}
            label={false}
          />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className={cn(
          "text-3xl font-bold font-mono tracking-tight",
          isProfit ? "text-emerald-500" : "text-rose-500"
        )}>
          {formatPercent(value)}
        </span>
        <span className="text-xs font-medium text-zinc-400 mt-1">هامش الربح</span>
      </div>
    </div>
  );
};

// ==================== Waterfall Chart ====================

const WaterfallChart: React.FC<{
  revenue: number;
  cost: number;
  profit: number;
  height?: number;
}> = ({ revenue, cost, profit, height = 300 }) => {
  const data = [
    { name: 'الإيرادات', value: revenue, fill: '#3b82f6' },
    { name: 'التكاليف', value: -cost, fill: '#f97316' }, // Keep cost negative for visual representation if desired, or positive for stacked. 
    // Usually waterfall is step based, but user asked for "Profitability Analysis". Bar chart comparing magnitudes is clearer.
    // Let's make cost positive magnitude but colored differently to indicate expense? 
    // Or keep negative value to show it going down? The Recharts BarChart handles negative values well.
    // Let's stick to the previous plan: distinct bars.
    { name: 'صافي الربح', value: profit, fill: profit >= 0 ? '#10b981' : '#ef4444' },
  ];

  // To make it look like "Profitability Analysis", maybe comparing Revenue vs Cost vs Profit side by side is best.
  // If we want magnitudes, Cost should probably be absolute value in the chart to compare size, 
  // but "Cost" implies money out. Let's use absolute values for height but keep color coding.
  const chartData = [
    { name: 'الإيرادات', value: Math.abs(revenue), fill: '#3b82f6', distinct: true },
    { name: 'التكاليف', value: Math.abs(cost), fill: '#f97316', distinct: true },
    { name: 'الربح', value: Math.abs(profit), fill: profit >= 0 ? '#10b981' : '#ef4444', distinct: true },
  ];

  return (
    <div className="w-full" style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          barSize={50}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161, 161, 170, 0.1)" />
          <XAxis
            dataKey="name"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#a1a1aa', fontSize: 12, fontWeight: 500 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(161, 161, 170, 0.05)' }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-2xl">
                    <p className="text-zinc-400 text-xs mb-2">{label}</p>
                    <p className="text-white font-bold font-mono text-lg flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
                      {formatCurrency(payload[0].value as number)}
                    </p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar
            dataKey="value"
            radius={[8, 8, 8, 8]}
            animationDuration={1500}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== Area Chart for Profit Trend ====================

// ==================== Custom Tooltip ====================

const CustomProfitTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    let formattedDate = label;
    try {
      const date = new Date(payload[0].payload.date);
      if (!isNaN(date.getTime())) {
        formattedDate = new Intl.DateTimeFormat('ar-DZ', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          numberingSystem: 'latn'
        }).format(date);
      }
    } catch (e) { }

    const value = payload[0].value;
    const isProfit = value >= 0;

    return (
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl text-right min-w-[200px] z-50">
        <p className="text-zinc-400 text-xs mb-3 font-medium flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </p>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-4">
            <span className="text-white font-bold font-mono text-xl tracking-tight">
              {formatCurrency(value)}
            </span>
            <span className={cn(
              "text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1",
              isProfit
                ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                : "text-rose-400 bg-rose-500/10 border-rose-500/20"
            )}>
              {isProfit ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {isProfit ? 'ربح' : 'خسارة'}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// ==================== Area Chart for Profit Trend ====================

const ProfitTrendChart: React.FC<{
  data: Array<{ date: string; value: number; count?: number }>;
  height?: number;
}> = ({ data, height = 280 }) => {
  if (!data || data.length < 2) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-400">
        لا توجد بيانات كافية للعرض
      </div>
    );
  }

  // Calculate gradient offset for split coloring
  const gradientOffset = () => {
    const dataMax = Math.max(...data.map((i) => i.value));
    const dataMin = Math.min(...data.map((i) => i.value));

    if (dataMax <= 0) {
      return 0;
    }
    if (dataMin >= 0) {
      return 1;
    }

    return dataMax / (dataMax - dataMin);
  };

  const off = gradientOffset();

  return (
    <div className="w-full" style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
        >
          <defs>
            <linearGradient id="splitColor" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#10b981" stopOpacity={0.3} />
              <stop offset={off} stopColor="#ef4444" stopOpacity={0.3} />
            </linearGradient>
            <linearGradient id="splitStroke" x1="0" y1="0" x2="0" y2="1">
              <stop offset={off} stopColor="#10b981" stopOpacity={1} />
              <stop offset={off} stopColor="#ef4444" stopOpacity={1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161, 161, 170, 0.1)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#a1a1aa', fontSize: 11 }}
            dy={15}
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
            minTickGap={30}
          />
          <YAxis
            orientation="right"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            dx={10}
          />
          <Tooltip content={<CustomProfitTooltip />} cursor={{ stroke: '#a1a1aa', strokeWidth: 1, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="url(#splitStroke)"
            strokeWidth={3}
            fill="url(#splitColor)"
            fillOpacity={1}
            activeDot={{ r: 5, strokeWidth: 0, fill: '#fff' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== Profit Breakdown Bars ====================

const ProfitBreakdownBars: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
  maxItems?: number;
}> = ({ data, maxItems = 6 }) => {
  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map(d => Math.abs(d.value)), 1);

  return (
    <div className="space-y-4">
      {items.map((item, index) => {
        const isProfit = item.value >= 0;
        const color = isProfit ? '#10b981' : '#ef4444';
        const bgColor = isProfit ? '#d1fae5' : '#fee2e2';

        return (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: bgColor }}
                >
                  {isProfit ? (
                    <TrendingUp className="w-4 h-4" style={{ color }} />
                  ) : (
                    <TrendingDown className="w-4 h-4" style={{ color }} />
                  )}
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  {item.name}
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ color }}>
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${(Math.abs(item.value) / maxValue) * 100}%` }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
              />
            </div>
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatPercent(item.percentage)} من إجمالي الربح
            </span>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==================== Donut Chart for Sale Types ====================

const SaleTypesDonut: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
  size?: number;
}> = ({ data, size = 160 }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const colors = ['#10b981', '#8b5cf6', '#f97316'];
  const total = data.reduce((sum, d) => sum + Math.abs(d.value), 0);

  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;
  const arcs = data.map((item, index) => {
    const percentage = Math.abs(item.value) / total;
    const angle = percentage * 360;
    const arc = {
      ...item,
      startAngle: currentAngle,
      color: colors[index % colors.length],
    };
    currentAngle += angle;
    return arc;
  });

  return (
    <div className="flex items-center gap-6">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size}>
          {arcs.map((arc, index) => {
            const percentage = Math.abs(arc.value) / total;
            const strokeDasharray = circumference;
            const strokeDashoffset = circumference * (1 - percentage);

            return (
              <motion.circle
                key={arc.name}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={activeIndex === index ? strokeWidth + 4 : strokeWidth}
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                transform={`rotate(${arc.startAngle} ${size / 2} ${size / 2})`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset }}
                transition={{ duration: 1, delay: index * 0.1 }}
                className="cursor-pointer transition-all"
                onMouseEnter={() => setActiveIndex(index)}
                onMouseLeave={() => setActiveIndex(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">
            {formatCurrency(total)}
          </span>
          <span className="text-xs text-zinc-500">إجمالي الربح</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 flex-1">
        {arcs.map((arc, index) => (
          <motion.div
            key={arc.name}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              'flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer',
              activeIndex === index ? 'bg-zinc-100 dark:bg-zinc-800' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
            )}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
          >
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: arc.color }} />
              <span className="text-sm text-zinc-700 dark:text-zinc-300">{arc.name}</span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatPercent(arc.percentage)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ==================== Stats Card ====================

const StatsCard: React.FC<{
  title: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  trend?: 'up' | 'down';
  trendValue?: string;
  description?: string;
}> = ({
  title,
  value,
  format = 'currency',
  icon,
  iconColor = '#10b981',
  iconBgColor = '#d1fae5',
  trend,
  trendValue,
  description,
}) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 transition-all"
      >
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: iconBgColor }}
          >
            <div style={{ color: iconColor }}>{icon}</div>
          </div>
          <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
        </div>
        <div className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
          <AnimatedValue value={value} format={format} />
        </div>
        {trend && trendValue && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend === 'up' ? 'text-emerald-600' : 'text-red-500'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{trendValue}</span>
          </div>
        )}
        {description && !trend && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </motion.div>
    );
  };

// ==================== Main Component ====================

const ProfitSection: React.FC<ProfitSectionProps> = ({
  filters,
  data,
  isLoading = false,
}) => {
  // Calculate profit status
  const profitStatus = useMemo(() => {
    const profit = data?.grossProfit || 0;
    if (profit > 0) return { status: 'profit' as const, color: '#10b981', bgColor: '#d1fae5' };
    if (profit < 0) return { status: 'loss' as const, color: '#ef4444', bgColor: '#fee2e2' };
    return { status: 'break-even' as const, color: '#6b7280', bgColor: '#f3f4f6' };
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
          ))}
        </div>
        <div className="h-80 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* ===== Profit Status Banner ===== */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'rounded-2xl p-6 border',
          profitStatus.status === 'profit'
            ? 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 border-emerald-200 dark:border-emerald-800'
            : profitStatus.status === 'loss'
              ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 border-red-200 dark:border-red-800'
              : 'bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 border-zinc-200 dark:border-zinc-700'
        )}
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Profit Summary */}
          <div className="text-center lg:text-right flex-1">
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">
              {profitStatus.status === 'profit' ? 'تحقق ربح بقيمة' :
                profitStatus.status === 'loss' ? 'تحقق خسارة بقيمة' : 'نقطة التعادل'}
            </p>
            <div className="text-4xl lg:text-5xl font-bold mb-2" style={{ color: profitStatus.color }}>
              <AnimatedValue value={Math.abs(data?.grossProfit || 0)} format="currency" />
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              بهامش ربح <span className="font-semibold" style={{ color: profitStatus.color }}>{formatPercent(data?.grossMargin || 0)}</span>
            </p>
          </div>

          {/* Equation Cards */}
          <div className="flex items-center gap-3 flex-wrap justify-center">
            <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">الإيرادات</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {formatCurrency(data?.grossRevenue || 0)}
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
              <Minus className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="flex items-center gap-3 p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">التكاليف</p>
                <p className="text-lg font-bold text-zinc-900 dark:text-white">
                  {formatCurrency((data?.cogs || 0) + (data?.operatingExpenses || 0))}
                </p>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center">
              <Equal className="w-4 h-4 text-zinc-500" />
            </div>

            <div className="flex items-center gap-3 p-4 rounded-xl shadow-sm" style={{ backgroundColor: profitStatus.bgColor }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${profitStatus.color}20` }}>
                {profitStatus.status === 'profit' ? (
                  <TrendingUp className="w-5 h-5" style={{ color: profitStatus.color }} />
                ) : (
                  <TrendingDown className="w-5 h-5" style={{ color: profitStatus.color }} />
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">الربح</p>
                <p className="text-lg font-bold" style={{ color: profitStatus.color }}>
                  {formatCurrency(data?.grossProfit || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي الإيرادات"
          value={data?.grossRevenue || 0}
          format="currency"
          icon={<CircleDollarSign className="w-5 h-5" />}
          iconColor="#3b82f6"
          iconBgColor="#dbeafe"
          description="صافي المبيعات"
        />
        <StatsCard
          title="تكلفة البضاعة"
          value={(data?.cogs || 0) + (data?.operatingExpenses || 0)}
          format="currency"
          icon={<Layers className="w-5 h-5" />}
          iconColor="#f97316"
          iconBgColor="#ffedd5"
          description="تكلفة الشراء"
        />
        <StatsCard
          title="إجمالي الربح"
          value={data?.grossProfit || 0}
          format="currency"
          icon={<PiggyBank className="w-5 h-5" />}
          iconColor={profitStatus.color}
          iconBgColor={profitStatus.bgColor}
          trend={(data?.grossProfit || 0) >= 0 ? 'up' : 'down'}
          trendValue={`${formatPercent(data?.grossMargin || 0)} هامش`}
        />
        <StatsCard
          title="هامش الربح"
          value={data?.grossMargin || 0}
          format="percent"
          icon={<Percent className="w-5 h-5" />}
          iconColor="#8b5cf6"
          iconBgColor="#f3e8ff"
          description="نسبة الربح من الإيرادات"
        />
      </div>

      {/* ===== Profit Trend Chart ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">اتجاه الأرباح</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">تطور الربح خلال الفترة المحددة</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ backgroundColor: profitStatus.bgColor }}>
            {profitStatus.status === 'profit' ? (
              <TrendingUp className="w-4 h-4" style={{ color: profitStatus.color }} />
            ) : (
              <TrendingDown className="w-4 h-4" style={{ color: profitStatus.color }} />
            )}
            <span className="text-sm font-medium" style={{ color: profitStatus.color }}>
              {profitStatus.status === 'profit' ? 'ربح' : profitStatus.status === 'loss' ? 'خسارة' : 'تعادل'}
            </span>
          </div>
        </div>
        <ProfitTrendChart data={data?.profitByDay || []} height={280} />
      </motion.div>

      {/* ===== Waterfall + Gauge ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تحليل الربحية</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">الإيرادات والتكاليف وصافي الربح</p>
          </div>
          <WaterfallChart
            revenue={data?.grossRevenue || 0}
            cost={(data?.cogs || 0) + (data?.operatingExpenses || 0)}
            profit={data?.grossProfit || 0}
            height={300}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">هامش الربح</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">نسبة الربح إلى الإيرادات</p>
          </div>
          <div className="flex flex-col items-center">
            <ProfitGauge
              value={data?.grossMargin || 0}
              max={50}
              size={200}
              isProfit={(data?.grossProfit || 0) >= 0}
            />
            <div className="mt-4 text-center">
              <div className="text-2xl font-bold" style={{ color: profitStatus.color }}>
                {formatCurrency(data?.grossProfit || 0)}
              </div>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">صافي الربح</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Category & Sale Type Breakdown ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">الربح حسب الفئة</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">توزيع الأرباح على فئات المنتجات</p>
          </div>
          <ProfitBreakdownBars data={data?.profitByCategory || []} maxItems={6} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">الربح حسب نوع البيع</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">تجزئة • جملة • نصف جملة</p>
          </div>
          <SaleTypesDonut data={data?.profitBySaleType || []} size={160} />
        </motion.div>
      </div>

      {/* ===== Detailed Table ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تفاصيل الأرباح حسب الفئة</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">جدول تفصيلي للأرباح والهوامش</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الفئة</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الربح</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الكمية</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">النسبة</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {data?.profitByCategory?.slice(0, 10).map((cat, index) => {
                const isProfit = cat.value >= 0;
                const color = isProfit ? '#10b981' : '#ef4444';
                const bgColor = isProfit ? '#d1fae5' : '#fee2e2';

                return (
                  <motion.tr
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.05 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: bgColor }}
                        >
                          {isProfit ? (
                            <TrendingUp className="w-4 h-4" style={{ color }} />
                          ) : (
                            <TrendingDown className="w-4 h-4" style={{ color }} />
                          )}
                        </div>
                        <span className="font-medium text-zinc-900 dark:text-white">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold" style={{ color }}>
                        {formatCurrency(cat.value)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {formatNumber(cat.count || 0)} قطعة
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[80px]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(Math.abs(cat.percentage), 100)}%` }}
                            transition={{ duration: 0.8, delay: 0.7 + index * 0.05 }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-12">
                          {formatPercent(cat.percentage)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {cat.value > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                          <ArrowUpRight className="w-3 h-3" />
                          ربح
                        </span>
                      ) : cat.value < 0 ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300">
                          <ArrowDownRight className="w-3 h-3" />
                          خسارة
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                          تعادل
                        </span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default memo(ProfitSection);
