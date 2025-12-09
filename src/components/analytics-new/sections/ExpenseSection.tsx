/**
 * ============================================
 * STOCKIHA ANALYTICS - EXPENSE SECTION
 * قسم تقارير المصاريف - تصميم Premium موحد
 * ============================================
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  CreditCard,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  PiggyBank,
  Banknote,
  CircleDollarSign,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  FileText,
  Tag,
  Flame,
  Zap,
  Target,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
} from 'recharts';
import type { FilterState, ExpenseData } from '../types';
import { formatCurrency, formatNumber, formatPercent, formatDate } from '../utils/formatters';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface ExpenseSectionProps {
  filters: FilterState;
  data: ExpenseData | null;
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
        return formatNumber(Math.round(displayValue));
    }
  }, [displayValue, format]);

  return <span>{formatted}</span>;
};

// ==================== Stats Card ====================

const StatsCard: React.FC<{
  title: string;
  value: number;
  format?: 'currency' | 'number' | 'percent';
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  description?: string;
}> = ({
  title,
  value,
  format = 'number',
  icon,
  iconColor = '#ef4444',
  iconBgColor = '#fee2e2',
  trend,
  trendValue,
  description,
}) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -5, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 backdrop-blur-xl relative overflow-hidden group"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/50 to-transparent dark:from-white/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
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
            trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-emerald-600' : 'text-zinc-500'
          )}>
            {trend === 'up' ? <ArrowUpRight className="w-4 h-4" /> :
              trend === 'down' ? <ArrowDownRight className="w-4 h-4" /> : null}
            <span>{trendValue}</span>
          </div>
        )}
        {description && !trend && (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
        )}
      </motion.div>
    );
  };

// ==================== Expense Gauge (Speedometer Style) ====================

// ==================== Expense Gauge (RadialBarChart) ====================

const ExpenseGauge: React.FC<{
  total: number;
  average: number;
  max?: number;
  size?: number;
}> = ({ total, average, max, size = 200 }) => {
  const maxValue = max || total * 1.5;
  const percentage = Math.min((total / maxValue) * 100, 100);

  // Determine color based on percentage relative to some budget or arbitrary threshold
  // Red for high, Orange for medium, Green for low? Or simply Red for expenses?
  // Let's stick to Red theme for expenses.
  const color = '#ef4444';

  const data = [
    {
      name: 'Total Expenses',
      value: total,
      fill: color,
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
            domain={[0, maxValue]}
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

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
        <span className="text-4xl font-bold font-mono tracking-tighter text-zinc-900 dark:text-white">
          {formatCurrency(total)}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mt-2">إجمالي المصاريف</span>
      </div>
    </div>
  );
};

// ==================== Expense Trend Chart ====================

// ==================== Expense Trend Chart (AreaChart) ====================

const CustomExpenseTooltip = ({ active, payload, label }: any) => {
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

    return (
      <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl text-right min-w-[200px] z-50">
        <p className="text-zinc-400 text-xs mb-3 font-medium flex items-center gap-2">
          <Calendar className="h-3 w-3" />
          {formattedDate}
        </p>
        <div className="flex items-center justify-between gap-4">
          <span className="text-white font-bold font-mono text-xl tracking-tight">
            {formatCurrency(payload[0].value)}
          </span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 text-red-400 bg-red-500/10 border-red-500/20">
            <TrendingDown className="h-3 w-3" />
            مصاريف
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const ExpenseTrendChart: React.FC<{
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

  return (
    <div className="w-full" style={{ height }} dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
          <defs>
            <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(161, 161, 170, 0.08)" />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
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
            tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'monospace' }}
            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
            dx={10}
          />
          <Tooltip content={<CustomExpenseTooltip />} cursor={{ stroke: '#ef4444', strokeWidth: 1.5, strokeDasharray: '4 4' }} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#ef4444"
            strokeWidth={3}
            fill="url(#expenseGradient)"
            fillOpacity={1}
            activeDot={{ r: 6, fill: '#ef4444', stroke: '#fff', strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== Category Donut Chart ====================

// ==================== Category Donut Chart (PieChart) ====================

const CategoryDonutChart: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
  size?: number;
}> = ({ data, size = 180 }) => {
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6'];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  // Filter out tiny segments for cleaner chart
  const chartData = data.filter(d => d.value > 0);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-8 justify-center">
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              innerRadius={size / 2 - 25}
              outerRadius={size / 2}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={6}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip
              cursor={{ fill: 'transparent' }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const d = payload[0].payload;
                  return (
                    <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl z-50">
                      <p className="text-zinc-400 text-xs mb-1">{d.name}</p>
                      <p className="text-white font-bold font-mono text-lg">{formatCurrency(d.value)}</p>
                      <p className="text-xs text-zinc-500">{formatPercent(total > 0 ? (d.value / total) * 100 : 0)}</p>
                    </div>
                  );
                }
                return null;
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <Wallet className="w-5 h-5 text-red-500 mb-1" />
          <span className="text-lg font-bold text-zinc-900 dark:text-white font-mono tracking-tight">
            {formatCurrency(total, { compact: true })}
          </span>
          <span className="text-xs text-zinc-500">الإجمالي</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        {data.slice(0, 6).map((item, index) => (
          <div key={item.name} className="flex items-center justify-between p-2 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
              <span className="text-sm text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{item.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                {formatPercent(item.percentage)}
              </span>
              <span className="text-xs text-zinc-400 font-mono w-16 text-left">
                {formatCurrency(item.value, { compact: true })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== Payment Method Bars ====================

// ==================== Payment Method Trend (BarChart) ====================

const PaymentMethodBars: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
}> = ({ data }) => {
  const chartData = data.slice(0, 5).map(item => ({
    name: item.name,
    value: item.value,
    percentage: item.percentage
  }));

  return (
    <div className="w-full h-[220px]" dir="ltr">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          barSize={20}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(161, 161, 170, 0.1)" />
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            width={80}
            tick={{ fill: '#71717a', fontSize: 11 }}
          />
          <Tooltip
            cursor={{ fill: 'rgba(161, 161, 170, 0.1)' }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const d = payload[0].payload;
                return (
                  <div className="bg-zinc-900/95 backdrop-blur-xl border border-white/10 p-3 rounded-xl shadow-xl z-50">
                    <p className="text-zinc-400 text-xs mb-1">{d.name}</p>
                    <p className="text-white font-bold font-mono text-lg">{formatCurrency(d.value)}</p>
                    <p className="text-xs text-zinc-500">{formatPercent(d.percentage)}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899'][index % 5]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

// ==================== Recurring vs One-time Chart ====================

const RecurringChart: React.FC<{
  recurring: number;
  oneTime: number;
}> = ({ recurring, oneTime }) => {
  const total = recurring + oneTime;
  const recurringPercent = total > 0 ? (recurring / total) * 100 : 0;
  const oneTimePercent = total > 0 ? (oneTime / total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Visual Bar */}
      <div className="relative h-12 bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden flex">
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center"
          initial={{ width: 0 }}
          animate={{ width: `${recurringPercent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          {recurringPercent > 15 && (
            <span className="text-white text-sm font-bold">{formatPercent(recurringPercent, { decimals: 0 })}</span>
          )}
        </motion.div>
        <motion.div
          className="h-full bg-gradient-to-r from-red-500 to-rose-500 flex items-center justify-center"
          initial={{ width: 0 }}
          animate={{ width: `${oneTimePercent}%` }}
          transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
        >
          {oneTimePercent > 15 && (
            <span className="text-white text-sm font-bold">{formatPercent(oneTimePercent, { decimals: 0 })}</span>
          )}
        </motion.div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-500/10 dark:to-amber-500/10 rounded-xl border border-orange-200 dark:border-orange-800"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center">
              <Repeat className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm font-medium text-orange-700 dark:text-orange-300">مصاريف متكررة</span>
          </div>
          <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
            <AnimatedValue value={recurring} format="currency" />
          </p>
          <p className="text-sm text-orange-500 mt-1">{formatPercent(recurringPercent)} من الإجمالي</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10 rounded-xl border border-red-200 dark:border-red-800"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
              <Flame className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm font-medium text-red-700 dark:text-red-300">مصاريف لمرة واحدة</span>
          </div>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">
            <AnimatedValue value={oneTime} format="currency" />
          </p>
          <p className="text-sm text-red-500 mt-1">{formatPercent(oneTimePercent)} من الإجمالي</p>
        </motion.div>
      </div>
    </div>
  );
};

// ==================== Top Expenses List ====================

const TopExpensesList: React.FC<{
  expenses: Array<{ id: string; description: string; amount: number; category: string; date: string }>;
}> = ({ expenses }) => {
  return (
    <div className="space-y-3">
      {expenses.slice(0, 8).map((expense, index) => (
        <motion.div
          key={expense.id}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="flex items-center justify-between p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm">
              #{index + 1}
            </div>
            <div>
              <p className="font-medium text-zinc-900 dark:text-white">{expense.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2 py-0.5 bg-zinc-200 dark:bg-zinc-700 rounded-full text-zinc-600 dark:text-zinc-400">
                  {expense.category}
                </span>
                <span className="text-xs text-zinc-400">{formatDate(expense.date, 'short')}</span>
              </div>
            </div>
          </div>
          <div className="text-left">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">
              {formatCurrency(expense.amount)}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ==================== Category Breakdown Table ====================

// ==================== Category Breakdown Table ====================

const CategoryTable: React.FC<{
  categories: Array<{ name: string; value: number; count: number; percentage: number }>;
}> = ({ categories }) => {
  const colors = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#06b6d4', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-700">
            <th className="text-right py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500">الفئة</th>
            <th className="text-right py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500">المبلغ</th>
            <th className="text-right py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500">العدد</th>
            <th className="text-right py-3 px-4 text-xs uppercase tracking-wider font-semibold text-zinc-500">النسبة</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
            >
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-2.5 h-2.5 rounded-full ring-2 ring-white dark:ring-zinc-900"
                    style={{ backgroundColor: colors[index % colors.length] }}
                  />
                  <span className="font-medium text-sm text-zinc-900 dark:text-white">{cat.name}</span>
                </div>
              </td>
              <td className="py-4 px-4">
                <span className="font-bold font-mono text-sm text-zinc-900 dark:text-white">
                  {formatCurrency(cat.value)}
                </span>
              </td>
              <td className="py-4 px-4 text-sm text-zinc-600 dark:text-zinc-400">
                {formatNumber(cat.count)}
              </td>
              <td className="py-4 px-4">
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[80px]">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: colors[index % colors.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${cat.percentage}%` }}
                      transition={{ duration: 0.8, delay: index * 0.05 }}
                    />
                  </div>
                  <span className="text-xs font-medium text-zinc-500 w-10 text-left">
                    {formatPercent(cat.percentage)}
                  </span>
                </div>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ==================== Main Component ====================

const ExpenseSection: React.FC<ExpenseSectionProps> = ({
  filters,
  data,
  isLoading = false,
}) => {
  // Calculate recurring ratio
  const recurringRatio = useMemo(() => {
    if (!data?.totalExpenses || !data?.recurringExpenses) return 0;
    return (data.recurringExpenses / data.totalExpenses) * 100;
  }, [data]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-red-100 to-orange-100 dark:from-red-900/20 dark:to-orange-900/20 rounded-2xl" />
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
      {/* ===== Expense Summary Banner ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-500/10 dark:via-orange-500/10 dark:to-amber-500/10 rounded-2xl p-6 border border-red-200/50 dark:border-red-800/50"
      >
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="text-center lg:text-right">
            <div className="flex items-center gap-3 justify-center lg:justify-start mb-2">
              <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                <Wallet className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">إجمالي المصاريف</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  <AnimatedValue value={data?.totalExpenses || 0} format="currency" />
                </p>
              </div>
            </div>
            <p className="text-sm text-zinc-500">
              من {formatNumber(data?.expenseCount || 0)} مصروف خلال الفترة المحددة
            </p>
          </div>

          {/* Quick Stats */}
          <div className="flex flex-wrap items-center gap-4 justify-center">
            <div className="text-center px-6 py-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 backdrop-blur-md shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">المتوسط اليومي</p>
              <p className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                {formatCurrency(data?.dailyAverage || 0)}
              </p>
            </div>
            <div className="text-center px-6 py-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 backdrop-blur-md shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">متوسط المصروف</p>
              <p className="text-xl font-bold font-mono text-zinc-900 dark:text-white">
                {formatCurrency(data?.averageExpense || 0)}
              </p>
            </div>
            <div className="text-center px-6 py-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-white/50 dark:border-white/5 backdrop-blur-md shadow-sm">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">المتكررة</p>
              <p className="text-xl font-bold font-mono text-orange-600 dark:text-orange-400">
                {formatPercent(recurringRatio)}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ===== KPI Cards ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي المصاريف"
          value={data?.totalExpenses || 0}
          format="currency"
          icon={<Wallet className="w-5 h-5" />}
          iconColor="#ef4444"
          iconBgColor="#fee2e2"
          description="المبلغ الكلي"
        />
        <StatsCard
          title="عدد المصاريف"
          value={data?.expenseCount || 0}
          format="number"
          icon={<Receipt className="w-5 h-5" />}
          iconColor="#f97316"
          iconBgColor="#ffedd5"
          description="عدد العمليات"
        />
        <StatsCard
          title="المتوسط اليومي"
          value={data?.dailyAverage || 0}
          format="currency"
          icon={<Calendar className="w-5 h-5" />}
          iconColor="#8b5cf6"
          iconBgColor="#f3e8ff"
          description="معدل الإنفاق"
        />
        <StatsCard
          title="المتوسط الشهري"
          value={data?.monthlyAverage || 0}
          format="currency"
          icon={<PiggyBank className="w-5 h-5" />}
          iconColor="#06b6d4"
          iconBgColor="#cffafe"
          description="التقدير الشهري"
        />
      </div>

      {/* ===== Expense Trend Chart ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">اتجاه المصاريف</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">المصاريف اليومية خلال الفترة</p>
        </div>
        <ExpenseTrendChart data={data?.expensesByDay || []} height={300} />
      </motion.div>

      {/* ===== Category & Payment Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المصاريف حسب الفئة</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">توزيع المصاريف على الفئات</p>
          </div>
          <CategoryDonutChart data={data?.expensesByCategory || []} size={180} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">طرق الدفع</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">المصاريف حسب طريقة الدفع</p>
          </div>
          <PaymentMethodBars data={data?.expensesByPaymentMethod || []} />
        </motion.div>
      </div>

      {/* ===== Recurring vs One-time ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تحليل نوع المصاريف</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">المتكررة vs لمرة واحدة</p>
        </div>
        <RecurringChart
          recurring={data?.recurringExpenses || 0}
          oneTime={data?.oneTimeExpenses || 0}
        />
      </motion.div>

      {/* ===== Top Expenses & Category Table ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">أعلى المصاريف</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">أكبر المصاريف خلال الفترة</p>
          </div>
          <TopExpensesList expenses={data?.topExpenses || []} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تفاصيل الفئات</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">المصاريف حسب كل فئة</p>
          </div>
          <CategoryTable categories={data?.expensesByCategory || []} />
        </motion.div>
      </div>
    </motion.div>
  );
};

export default memo(ExpenseSection);
