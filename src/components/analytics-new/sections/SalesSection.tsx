/**
 * ============================================
 * STOCKIHA ANALYTICS - SALES SECTION
 * قسم تقارير المبيعات التفصيلية - تصميم Premium
 * ============================================
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ShoppingCart,
  Store,
  Package,
  Calendar,
  BarChart3,
  DollarSign,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Target,
  Activity,
  Layers,
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
import type { FilterState, SalesData } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface SalesSectionProps {
  filters: FilterState;
  data: SalesData | null;
  isLoading?: boolean;
}

type SimpleTopProductRow = {
  productId: string;
  productName: string;
  quantitySold: number;
  revenue: number;
  profit: number;
};

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

// ==================== Sparkline Chart ====================

const SparklineChart: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
}> = ({ data, width = 120, height = 40, color = '#f97316', fillOpacity = 0.2 }) => {
  if (!data || data.length < 2) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`sparklineGradient-${color.replace('#', '')}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={areaPoints}
        fill={`url(#sparklineGradient-${color.replace('#', '')})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ==================== Radial Progress Chart ====================

const RadialProgress: React.FC<{
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  label?: string;
  sublabel?: string;
}> = ({
  value,
  max = 100,
  size = 120,
  strokeWidth = 10,
  color = '#f97316',
  bgColor = '#f4f4f5',
  label,
  sublabel,
}) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(value / max, 1);
    const strokeDashoffset = circumference * (1 - progress);

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
            className="dark:stroke-zinc-700"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-zinc-900 dark:text-white">{formatPercent(progress * 100, { decimals: 0 })}</span>
          {label && <span className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{label}</span>}
        </div>
      </div>
    );
  };

// ==================== Wave Area Chart ====================

// ==================== Custom Tooltip ====================

const CustomSalesTooltip = ({ active, payload, label }: any) => {
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
        <div className="space-y-3">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <span className="text-white font-bold font-mono text-lg tracking-tight">
                {entry.dataKey === 'value' ? formatCurrency(entry.value) : entry.value}
              </span>
              <span className={cn(
                "text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1",
                entry.dataKey === 'value'
                  ? "text-orange-400 bg-orange-500/10 border-orange-500/20"
                  : "text-purple-400 bg-purple-500/10 border-purple-500/20"
              )}>
                {entry.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// ==================== Horizontal Bar Chart ====================

const HorizontalBarChart: React.FC<{
  data: Array<{ name: string; value: number; percentage: number; color?: string }>;
  maxItems?: number;
  showValues?: boolean;
  valueFormatter?: (value: number) => string;
}> = ({ data, maxItems = 6, showValues = true, valueFormatter = formatCurrency }) => {
  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map(d => d.value), 1);
  const colors = ['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];

  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
          className="group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: item.color || colors[index % colors.length] }}
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[140px]">
                {item.name}
              </span>
            </div>
            {showValues && (
              <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                {valueFormatter(item.value)}
              </span>
            )}
          </div>
          <div className="relative h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: item.color || colors[index % colors.length] }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-zinc-400 dark:text-zinc-500">
              {formatPercent(item.percentage)} من الإجمالي
            </span>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

// ==================== Stats Card ====================

const StatsCard: React.FC<{
  title: string;
  value: number;
  format?: 'currency' | 'number';
  icon: React.ReactNode;
  iconColor?: string;
  iconBgColor?: string;
  trend?: number;
  sparklineData?: number[];
  sparklineColor?: string;
  description?: string;
}> = ({
  title,
  value,
  format = 'currency',
  icon,
  iconColor = '#f97316',
  iconBgColor = '#fff7ed',
  trend,
  sparklineData,
  sparklineColor,
  description,
}) => {
    const isPositiveTrend = trend && trend > 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50 transition-all"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: iconBgColor }}
              >
                <div style={{ color: iconColor }}>{icon}</div>
              </div>
              <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</span>
            </div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
              <AnimatedValue value={value} format={format} />
            </div>
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 text-sm font-medium',
                isPositiveTrend ? 'text-emerald-600' : 'text-red-500'
              )}>
                {isPositiveTrend ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                <span>{formatPercent(Math.abs(trend))}</span>
                <span className="text-zinc-400 font-normal">مقارنة بالفترة السابقة</span>
              </div>
            )}
            {description && !trend && (
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            )}
          </div>
          {sparklineData && sparklineData.length > 1 && (
            <div className="flex-shrink-0">
              <SparklineChart
                data={sparklineData}
                width={100}
                height={45}
                color={sparklineColor || iconColor}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  };

// ==================== Main Component ====================

const SalesSection: React.FC<SalesSectionProps> = ({
  filters,
  data,
  isLoading = false,
}) => {
  const [topProductsMetric, setTopProductsMetric] = useState<'revenue' | 'quantity'>('revenue');

  // Extract sparkline data from sales by day
  const sparklineData = useMemo(() => {
    if (!data?.salesByDay) return [];
    return data.salesByDay.map(d => d.value);
  }, [data]);

  const ordersSparklineData = useMemo(() => {
    if (!data?.salesByDay) return [];
    return data.salesByDay.map(d => d.count || 0);
  }, [data]);

  // Calculate average daily sales
  const avgDailySales = useMemo(() => {
    if (!data?.salesByDay || data.salesByDay.length === 0) return 0;
    return data.totalSales / data.salesByDay.length;
  }, [data]);

  // Calculate target progress (example: monthly target)
  const targetProgress = useMemo(() => {
    const monthlyTarget = 1000000; // 1M DA example target
    return Math.min((data?.totalSales || 0) / monthlyTarget, 1) * 100;
  }, [data]);

  const topProducts = useMemo<SimpleTopProductRow[]>(() => {
    const products = data?.topProducts || [];
    return products.slice(0, 10).map((p) => ({
      productId: p.productId,
      productName: p.productName,
      quantitySold: p.quantitySold,
      revenue: p.revenue,
      profit: p.profit,
    }));
  }, [data]);

  const topProductsMaxRevenue = useMemo(() => {
    return Math.max(...topProducts.map((x) => x.revenue), 1);
  }, [topProducts]);

  const bestProduct = useMemo(() => {
    return data?.topProducts?.[0] || null;
  }, [data]);

  const topProductsBarData = useMemo(() => {
    const products = data?.topProducts || [];
    const rows = products.slice(0, 6).map((p) => ({
      name: p.productName,
      value: topProductsMetric === 'revenue' ? p.revenue : p.quantitySold,
      percentage: 0,
    }));

    const total = rows.reduce((sum, r) => sum + (Number(r.value) || 0), 0);
    return rows.map((r) => ({
      ...r,
      value: Number(r.value) || 0,
      percentage: total > 0 ? (r.value / total) * 100 : 0,
    }));
  }, [data, topProductsMetric]);

  // Transform salesBySaleType to include percentage and count
  const salesBySaleTypeWithPercentage = useMemo(() => {
    if (!data?.salesBySaleType || data.salesBySaleType.length === 0) return [];
    const total = data.salesBySaleType.reduce((sum, item) => sum + item.value, 0);
    const avgOrderValue = data?.averageOrderValue || 1;
    return data.salesBySaleType.map(item => ({
      ...item,
      percentage: total > 0 ? (item.value / total) * 100 : 0,
      count: Math.round(item.value / avgOrderValue), // Estimate count based on average order value
    }));
  }, [data?.salesBySaleType, data?.averageOrderValue]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-36 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
          ))}
        </div>
        <div className="h-80 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-72 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
          <div className="h-72 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      {/* ===== KPI Cards Row ===== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="إجمالي المبيعات"
          value={data?.totalSales || 0}
          format="currency"
          icon={<ShoppingCart className="w-5 h-5" />}
          iconColor="#f97316"
          iconBgColor="#fff7ed"
          sparklineData={sparklineData}
          sparklineColor="#f97316"
        />
        <StatsCard
          title="عدد الطلبات"
          value={data?.totalOrders || 0}
          format="number"
          icon={<Package className="w-5 h-5" />}
          iconColor="#8b5cf6"
          iconBgColor="#f3e8ff"
          sparklineData={ordersSparklineData}
          sparklineColor="#8b5cf6"
        />
        <StatsCard
          title="متوسط قيمة الطلب"
          value={data?.averageOrderValue || 0}
          format="currency"
          icon={<Target className="w-5 h-5" />}
          iconColor="#10b981"
          iconBgColor="#d1fae5"
          description="صافي قيمة الطلب الواحد"
        />
        <StatsCard
          title="المتوسط اليومي"
          value={avgDailySales}
          format="currency"
          icon={<Activity className="w-5 h-5" />}
          iconColor="#3b82f6"
          iconBgColor="#dbeafe"
          description="متوسط المبيعات في اليوم"
        />
      </div>

      {/* ===== Sales Trend Chart ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">اتجاه المبيعات</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">تحليل المبيعات وأعداد الطلبات خلال الفترة</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50" />
              <span className="text-zinc-600 dark:text-zinc-400">المبيعات</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
              <span className="text-zinc-600 dark:text-zinc-400">الطلبات</span>
            </div>
          </div>
        </div>

        <div className="h-[350px] w-full" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.salesByDay || []} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
              {/* Y-Axis for Sales (Right) */}
              <YAxis
                yAxisId="sales"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#a1a1aa', fontSize: 11, fontFamily: 'monospace' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                dx={10}
              />
              {/* Y-Axis for Orders (Left) */}
              <YAxis
                yAxisId="orders"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#a1a1aa', fontSize: 11 }}
                dx={-10}
              />
              <Tooltip content={<CustomSalesTooltip />} cursor={{ stroke: '#f97316', strokeWidth: 1.5, strokeDasharray: '4 4' }} />

              <Area
                yAxisId="sales"
                type="monotone"
                dataKey="value"
                name="المبيعات"
                stroke="#f97316"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#salesGradient)"
                activeDot={{ r: 5, strokeWidth: 0, fill: '#fff', stroke: '#f97316' }}
              />
              <Area
                yAxisId="orders"
                type="monotone"
                dataKey="count"
                name="الطلبات"
                stroke="#a855f7"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#ordersGradient)"
                activeDot={{ r: 5, strokeWidth: 0, fill: '#fff', stroke: '#a855f7' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </motion.div>

      {/* ===== Two Column Charts ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Category */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المبيعات حسب الفئة</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">توزيع المبيعات على فئات المنتجات</p>
          </div>
          <HorizontalBarChart
            data={data?.salesByCategory || []}
            maxItems={6}
          />
        </motion.div>

        {/* Sales by Product Type */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المبيعات حسب نوع المنتج</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">قطعة • وزن • متر • صندوق</p>
          </div>
          <HorizontalBarChart
            data={[
              { name: 'قطعة', value: data?.pieceSales || 0, percentage: 0 },
              { name: 'وزن', value: data?.weightSales || 0, percentage: 0 },
              { name: 'متر', value: data?.meterSales || 0, percentage: 0 },
              { name: 'صندوق', value: data?.boxSales || 0, percentage: 0 },
            ].map((row) => {
              const total = (data?.pieceSales || 0) + (data?.weightSales || 0) + (data?.meterSales || 0) + (data?.boxSales || 0);
              return {
                ...row,
                percentage: total > 0 ? (row.value / total) * 100 : 0,
              };
            })}
            maxItems={4}
            valueFormatter={formatCurrency}
          />
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">أفضل منتج</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">الأعلى إيراداً خلال الفترة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>

          {bestProduct ? (
            <div className="space-y-4">
              <div className="min-w-0">
                <div className="text-base font-semibold text-zinc-900 dark:text-white truncate">
                  {bestProduct.productName}
                </div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  {bestProduct.categoryName || '—'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">الإيراد</div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white mt-1 font-mono">
                    {formatCurrency(bestProduct.revenue)}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">الكمية</div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-white mt-1 font-mono">
                    {formatNumber(bestProduct.quantitySold)}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">هامش الربح</span>
                  <span className={cn(
                    'text-xs font-semibold px-2 py-1 rounded-lg',
                    bestProduct.profit >= 0
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10'
                      : 'text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10'
                  )}>
                    {formatPercent(bestProduct.profitMargin, { decimals: 1 })}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, (bestProduct.revenue / Math.max(data?.totalSales || 1, 1)) * 100))}%` }}
                  />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                  {formatPercent((bestProduct.revenue / Math.max(data?.totalSales || 1, 1)) * 100, { decimals: 1 })} من إجمالي المبيعات
                </div>
              </div>
            </div>
          ) : (
            <div className="py-10 text-center text-zinc-400">لا توجد بيانات للعرض</div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800 lg:col-span-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">أفضل المنتجات</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">الأعلى أداءً خلال الفترة</p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl w-fit">
              <button
                onClick={() => setTopProductsMetric('revenue')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  topProductsMetric === 'revenue'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                الإيراد
              </button>
              <button
                onClick={() => setTopProductsMetric('quantity')}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                  topProductsMetric === 'quantity'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                الكمية
              </button>
            </div>
          </div>

          <HorizontalBarChart
            data={topProductsBarData}
            maxItems={6}
            valueFormatter={(v) =>
              topProductsMetric === 'revenue'
                ? formatCurrency(v)
                : `${formatNumber(v)} قطعة`
            }
          />
        </motion.div>
      </div>

      {/* ===== Sale Types & Performance ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">أنواع البيع</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">تجزئة • جملة • نصف جملة</p>
          </div>
          <div className="space-y-4">
            {salesBySaleTypeWithPercentage.map((type, index) => {
              const colors = ['#f97316', '#8b5cf6', '#10b981'];
              const bgColors = ['#fff7ed', '#f3e8ff', '#d1fae5'];
              return (
                <div key={type.name} className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: bgColors[index % bgColors.length] }}
                  >
                    {index === 0 ? <Store className="w-5 h-5" style={{ color: colors[index] }} /> :
                      index === 1 ? <Layers className="w-5 h-5" style={{ color: colors[index] }} /> :
                        <Package className="w-5 h-5" style={{ color: colors[index] }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{type.name}</span>
                      <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                        {formatCurrency(type.value)}
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: colors[index % colors.length] }}
                        initial={{ width: 0 }}
                        animate={{ width: `${type.percentage}%` }}
                        transition={{ duration: 0.8, delay: 0.5 + index * 0.1 }}
                      />
                    </div>
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {type.count} طلب • {formatPercent(type.percentage)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">إحصائيات سريعة</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">ملخص بيانات المبيعات</p>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">المنتجات المباعة</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                {formatNumber(data?.totalItemsSold || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <Percent className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">إجمالي الخصومات</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                {formatCurrency(data?.totalDiscount || 0)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">الضرائب المحصلة</span>
              </div>
              <span className="text-lg font-semibold text-zinc-900 dark:text-white">
                {formatCurrency(data?.totalTax || 0)}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Target Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
        >
          <div className="mb-5">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تقدم الهدف</h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">نسبة تحقيق هدف المبيعات</p>
          </div>
          <div className="flex flex-col items-center">
            <RadialProgress
              value={targetProgress}
              max={100}
              size={140}
              strokeWidth={12}
              color="#f97316"
              label="من الهدف"
            />
            <div className="mt-4 text-center">
              <div className="text-xl font-bold text-zinc-900 dark:text-white">
                {formatCurrency(data?.totalSales || 0)}
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                من أصل {formatCurrency(1000000)}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ===== Categories Table ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">تفاصيل الفئات</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">المبيعات والكميات حسب كل فئة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الفئة</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">المبيعات</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الكمية</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {data?.salesByCategory?.slice(0, 10).map((cat, index) => {
                const colors = ['#f97316', '#8b5cf6', '#10b981', '#3b82f6', '#f59e0b', '#ec4899'];
                return (
                  <motion.tr
                    key={cat.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8 + index * 0.05 }}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors[index % colors.length] }}
                        />
                        <span className="font-medium text-zinc-900 dark:text-white">{cat.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white">
                      {formatCurrency(cat.value)}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">
                      {formatNumber(cat.count)} قطعة
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden max-w-[100px]">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: colors[index % colors.length] }}
                            initial={{ width: 0 }}
                            animate={{ width: `${cat.percentage}%` }}
                            transition={{ duration: 0.8, delay: 0.8 + index * 0.05 }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500 w-12 text-left">
                          {formatPercent(cat.percentage)}
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* ===== Top Products Table ===== */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
      >
        <div className="mb-5">
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">أفضل المنتجات</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">الأكثر إيراداً خلال الفترة</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-700">
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">#</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">المنتج</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الكمية</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الإيراد</th>
                <th className="text-right py-3 px-4 font-medium text-zinc-500 dark:text-zinc-400">الربح</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-zinc-400">لا توجد بيانات للعرض</td>
                </tr>
              ) : (
                topProducts.map((p, index) => {
                  const revPct = Math.min(100, (p.revenue / topProductsMaxRevenue) * 100);
                  return (
                  <tr
                    key={p.productId}
                    className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center text-xs font-bold">
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="min-w-0">
                        <div className="font-medium text-zinc-900 dark:text-white truncate">{p.productName}</div>
                        <div className="mt-1 flex items-center gap-2">
                          <div className="flex-1 max-w-[160px] h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${revPct}%` }} />
                          </div>
                          <span className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">{Math.round(revPct)}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-mono text-xs">
                        {formatNumber(p.quantitySold)}
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">قطعة</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-white font-mono">{formatCurrency(p.revenue)}</td>
                    <td className={cn(
                      'py-3 px-4 font-semibold',
                      p.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                      <span className="font-mono">{formatCurrency(p.profit)}</span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default memo(SalesSection);
