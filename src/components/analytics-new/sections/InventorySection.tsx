/**
 * ============================================
 * STOCKIHA ANALYTICS - INVENTORY SECTION
 * قسم تقارير المخزون - تصميم Premium موحد
 * ============================================
 */

import React, { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Layers,
  Box,
  Archive,
  PackageX,
  BarChart3,
  Warehouse,
  CircleDollarSign,
  PiggyBank,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Scale,
  Boxes,
  ShoppingBag,
} from 'lucide-react';
import type { FilterState, InventoryData, CapitalData } from '../types';
import { formatCurrency, formatNumber, formatPercent } from '../utils/formatters';
import { cn } from '@/lib/utils';

// ==================== Types ====================

interface InventorySectionProps {
  filters: FilterState;
  inventoryData: InventoryData | null;
  capitalData: CapitalData | null;
  isLoading?: boolean;
}

type TabId = 'stock' | 'capital' | 'alerts';

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

// ==================== Tab Button ====================

const TabButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  color?: string;
}> = ({ active, onClick, icon, label, badge, color = '#3b82f6' }) => (
  <motion.button
    onClick={onClick}
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    className={cn(
      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
      active
        ? 'text-white shadow-lg'
        : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
    )}
    style={active ? { backgroundColor: color } : undefined}
  >
    {icon}
    <span>{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className={cn(
        'px-2 py-0.5 text-xs font-bold rounded-full',
        active ? 'bg-white/20' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
      )}>
        {badge}
      </span>
    )}
  </motion.button>
);

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
  iconColor = '#3b82f6',
  iconBgColor = '#dbeafe',
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
          trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-zinc-500'
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

// ==================== Stock Health Gauge ====================

const StockHealthGauge: React.FC<{
  healthy: number;
  low: number;
  outOfStock: number;
  size?: number;
}> = ({ healthy, low, outOfStock, size = 200 }) => {
  const total = healthy + low + outOfStock;
  const healthyPercent = total > 0 ? (healthy / total) * 100 : 100;
  const lowPercent = total > 0 ? (low / total) * 100 : 0;
  const outPercent = total > 0 ? (outOfStock / total) * 100 : 0;

  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const healthyOffset = 0;
  const lowOffset = circumference * (healthyPercent / 100);
  const outOffset = circumference * ((healthyPercent + lowPercent) / 100);

  return (
    <div className="flex items-center gap-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f4f4f5"
            strokeWidth={strokeWidth}
            className="dark:stroke-zinc-800"
          />
          {/* Healthy */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10b981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - healthyPercent / 100)}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - healthyPercent / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
          {/* Low Stock */}
          {lowPercent > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#f59e0b"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - lowPercent / 100)}
              transform={`rotate(${healthyPercent * 3.6} ${size / 2} ${size / 2})`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - lowPercent / 100) }}
              transition={{ duration: 1, delay: 0.3, ease: 'easeOut' }}
            />
          )}
          {/* Out of Stock */}
          {outPercent > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - outPercent / 100)}
              transform={`rotate(${(healthyPercent + lowPercent) * 3.6} ${size / 2} ${size / 2})`}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - outPercent / 100) }}
              transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-zinc-900 dark:text-white">
            {formatPercent(healthyPercent, { decimals: 0 })}
          </span>
          <span className="text-sm text-zinc-500">صحة المخزون</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-emerald-500" />
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">مخزون صحي</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{healthy}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-amber-500" />
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">مخزون منخفض</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{low}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full bg-red-500" />
          <div>
            <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">نفاد المخزون</p>
            <p className="text-lg font-bold text-zinc-900 dark:text-white">{outOfStock}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Horizontal Bar Chart ====================

const HorizontalBarChart: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
  maxItems?: number;
  formatValue?: 'number' | 'currency';
  colors?: string[];
}> = ({ data, maxItems = 6, formatValue = 'number', colors }) => {
  const items = data.slice(0, maxItems);
  const maxValue = Math.max(...items.map(d => d.value), 1);
  const defaultColors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#f59e0b', '#ec4899'];
  const colorPalette = colors || defaultColors;

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <motion.div
          key={item.name}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
              />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 truncate max-w-[160px]">
                {item.name}
              </span>
            </div>
            <span className="text-sm font-semibold text-zinc-900 dark:text-white">
              {formatValue === 'currency' ? formatCurrency(item.value) : formatNumber(item.value)}
            </span>
          </div>
          <div className="h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: colorPalette[index % colorPalette.length] }}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / maxValue) * 100}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {formatPercent(item.percentage)} من الإجمالي
          </span>
        </motion.div>
      ))}
    </div>
  );
};

// ==================== Treemap Chart ====================

const TreemapChart: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
}> = ({ data }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316', '#f59e0b', '#ec4899', '#06b6d4', '#6366f1'];

  // Simple treemap layout
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let currentX = 0;
  const width = 100;
  const height = 100;

  const items = data.slice(0, 8).map((item, index) => {
    const itemWidth = (item.value / total) * width;
    const x = currentX;
    currentX += itemWidth;
    return {
      ...item,
      x: `${x}%`,
      width: `${itemWidth}%`,
      color: colors[index % colors.length],
    };
  });

  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden flex">
      {items.map((item, index) => (
        <motion.div
          key={item.name}
          className="h-full relative cursor-pointer transition-all"
          style={{
            width: item.width,
            backgroundColor: item.color,
            opacity: hoveredIndex === null || hoveredIndex === index ? 1 : 0.5,
          }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          onMouseEnter={() => setHoveredIndex(index)}
          onMouseLeave={() => setHoveredIndex(null)}
        >
          {hoveredIndex === index && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 text-white p-2">
              <span className="text-xs font-medium text-center truncate w-full">{item.name}</span>
              <span className="text-sm font-bold">{formatNumber(item.value)}</span>
              <span className="text-xs opacity-80">{formatPercent(item.percentage)}</span>
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
};

// ==================== Capital Comparison Chart ====================

const CapitalComparisonChart: React.FC<{
  purchaseValue: number;
  retailValue: number;
  wholesaleValue: number;
  profit: number;
}> = ({ purchaseValue, retailValue, wholesaleValue, profit }) => {
  const max = Math.max(purchaseValue, retailValue, wholesaleValue) * 1.1;
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(400);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const bars = [
    { label: 'سعر الشراء', value: purchaseValue, color: '#3b82f6', icon: <Box className="w-4 h-4" /> },
    { label: 'سعر التجزئة', value: retailValue, color: '#10b981', icon: <ShoppingBag className="w-4 h-4" /> },
    { label: 'سعر الجملة', value: wholesaleValue, color: '#8b5cf6', icon: <Boxes className="w-4 h-4" /> },
  ];

  return (
    <div ref={containerRef} className="space-y-4">
      {bars.map((bar, index) => {
        const percentage = (bar.value / max) * 100;
        return (
          <div key={bar.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${bar.color}20` }}
                >
                  <div style={{ color: bar.color }}>{bar.icon}</div>
                </div>
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{bar.label}</span>
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-white">
                {formatCurrency(bar.value)}
              </span>
            </div>
            <div className="h-3 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: bar.color }}
                initial={{ width: 0 }}
                animate={{ width: `${percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.2, ease: 'easeOut' }}
              />
            </div>
          </div>
        );
      })}

      {/* Profit Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-xl border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">الربح المحتمل</p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">عند بيع كل المخزون بالتجزئة</p>
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(profit)}
            </p>
            <p className="text-sm text-emerald-500">
              {formatPercent(purchaseValue > 0 ? (profit / purchaseValue) * 100 : 0)} هامش
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Stock Type Donut ====================

const StockTypeDonut: React.FC<{
  data: Array<{ name: string; value: number; percentage: number }>;
  size?: number;
}> = ({ data, size = 160 }) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f97316'];
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const strokeWidth = 22;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentAngle = -90;
  const arcs = data.map((item, index) => {
    const percentage = total > 0 ? item.value / total : 0;
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
            const percentage = total > 0 ? arc.value / total : 0;
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
          <span className="text-2xl font-bold text-zinc-900 dark:text-white">
            {formatNumber(total)}
          </span>
          <span className="text-xs text-zinc-500">إجمالي المخزون</span>
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
              {formatNumber(arc.value)}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ==================== Alert Card ====================

const AlertCard: React.FC<{
  type: 'danger' | 'warning';
  title: string;
  count: number;
  icon: React.ReactNode;
}> = ({ type, title, count, icon }) => {
  const colors = {
    danger: {
      bg: 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-500/10 dark:to-rose-500/10',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
      iconBg: 'bg-red-100 dark:bg-red-500/20',
      iconColor: 'text-red-600 dark:text-red-400',
    },
    warning: {
      bg: 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-500/10 dark:to-yellow-500/10',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-500/20',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
  };

  const c = colors[type];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn('p-5 rounded-2xl border', c.bg, c.border)}
    >
      <div className="flex items-center gap-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', c.iconBg)}>
          <div className={c.iconColor}>{icon}</div>
        </div>
        <div>
          <p className={cn('text-sm font-medium', c.text)}>{title}</p>
          <p className={cn('text-3xl font-bold', c.text)}>
            <AnimatedValue value={count} format="number" />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ==================== Low Stock Product Row ====================

const LowStockProductRow: React.FC<{
  product: { name: string; sku?: string; currentStock: number; minStock: number };
  index: number;
}> = ({ product, index }) => {
  const isOutOfStock = product.currentStock <= 0;
  const stockPercent = product.minStock > 0 ? (product.currentStock / product.minStock) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center justify-between p-4 rounded-xl border transition-colors',
        isOutOfStock
          ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-800'
          : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-800'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center',
          isOutOfStock ? 'bg-red-100 dark:bg-red-500/20' : 'bg-amber-100 dark:bg-amber-500/20'
        )}>
          {isOutOfStock ? (
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          )}
        </div>
        <div>
          <p className="font-medium text-zinc-900 dark:text-white">{product.name}</p>
          {product.sku && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">SKU: {product.sku}</p>
          )}
        </div>
      </div>
      <div className="text-left">
        <p className={cn(
          'text-lg font-bold',
          isOutOfStock ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'
        )}>
          {product.currentStock}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          الحد الأدنى: {product.minStock}
        </p>
      </div>
    </motion.div>
  );
};

// ==================== Main Component ====================

const InventorySection: React.FC<InventorySectionProps> = ({
  filters,
  inventoryData,
  capitalData,
  isLoading = false,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('stock');

  // Calculate healthy stock count
  const healthyStockCount = useMemo(() => {
    const total = inventoryData?.totalProducts || 0;
    const low = inventoryData?.lowStockCount || 0;
    const out = inventoryData?.outOfStockCount || 0;
    return Math.max(total - low - out, 0);
  }, [inventoryData]);

  const alertsCount = (inventoryData?.lowStockCount || 0) + (inventoryData?.outOfStockCount || 0);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="flex gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-11 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
          ))}
        </div>
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
      {/* ===== Tabs ===== */}
      <div className="flex flex-wrap gap-3">
        <TabButton
          active={activeTab === 'stock'}
          onClick={() => setActiveTab('stock')}
          icon={<Layers className="h-4 w-4" />}
          label="المخزون"
          color="#3b82f6"
        />
        <TabButton
          active={activeTab === 'capital'}
          onClick={() => setActiveTab('capital')}
          icon={<CircleDollarSign className="h-4 w-4" />}
          label="رأس المال"
          color="#8b5cf6"
        />
        <TabButton
          active={activeTab === 'alerts'}
          onClick={() => setActiveTab('alerts')}
          icon={<AlertTriangle className="h-4 w-4" />}
          label="التنبيهات"
          badge={alertsCount}
          color="#ef4444"
        />
      </div>

      {/* ===== Stock Tab ===== */}
      <AnimatePresence mode="wait">
        {activeTab === 'stock' && (
          <motion.div
            key="stock"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="إجمالي المنتجات"
                value={inventoryData?.totalProducts || 0}
                format="number"
                icon={<Package className="w-5 h-5" />}
                iconColor="#3b82f6"
                iconBgColor="#dbeafe"
                description="عدد المنتجات النشطة"
              />
              <StatsCard
                title="إجمالي المخزون"
                value={inventoryData?.totalStock || 0}
                format="number"
                icon={<Warehouse className="w-5 h-5" />}
                iconColor="#8b5cf6"
                iconBgColor="#f3e8ff"
                description="مجموع الكميات"
              />
              <StatsCard
                title="مخزون منخفض"
                value={inventoryData?.lowStockCount || 0}
                format="number"
                icon={<AlertTriangle className="w-5 h-5" />}
                iconColor="#f59e0b"
                iconBgColor="#fef3c7"
                trend={(inventoryData?.lowStockCount || 0) > 0 ? 'down' : 'stable'}
                trendValue={`${inventoryData?.lowStockCount || 0} منتج`}
              />
              <StatsCard
                title="نفاد المخزون"
                value={inventoryData?.outOfStockCount || 0}
                format="number"
                icon={<PackageX className="w-5 h-5" />}
                iconColor="#ef4444"
                iconBgColor="#fee2e2"
                trend={(inventoryData?.outOfStockCount || 0) > 0 ? 'down' : 'stable'}
                trendValue={`${inventoryData?.outOfStockCount || 0} منتج`}
              />
            </div>

            {/* Stock Health + Stock by Type */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">صحة المخزون</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">توزيع حالة المخزون</p>
                </div>
                <StockHealthGauge
                  healthy={healthyStockCount}
                  low={inventoryData?.lowStockCount || 0}
                  outOfStock={inventoryData?.outOfStockCount || 0}
                  size={180}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المخزون حسب النوع</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">قطعة • وزن • متر • صندوق</p>
                </div>
                <StockTypeDonut data={inventoryData?.stockByType || []} size={160} />
              </motion.div>
            </div>

            {/* Stock by Category */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المخزون حسب الفئة</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">توزيع الكميات على الفئات</p>
                </div>
                <HorizontalBarChart
                  data={inventoryData?.stockByCategory || []}
                  maxItems={6}
                  formatValue="number"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">خريطة المخزون</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">تمثيل مرئي للتوزيع</p>
                </div>
                <TreemapChart data={inventoryData?.stockByCategory || []} />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ===== Capital Tab ===== */}
        {activeTab === 'capital' && (
          <motion.div
            key="capital"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Capital Summary Banner */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-purple-50 via-blue-50 to-cyan-50 dark:from-purple-500/10 dark:via-blue-500/10 dark:to-cyan-500/10 rounded-2xl p-6 border border-purple-200/50 dark:border-purple-800/50"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">قيمة الشراء</p>
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    <AnimatedValue value={capitalData?.totalPurchaseValue || 0} format="currency" />
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">قيمة التجزئة</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    <AnimatedValue value={capitalData?.totalRetailValue || 0} format="currency" />
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">قيمة الجملة</p>
                  <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    <AnimatedValue value={capitalData?.totalWholesaleValue || 0} format="currency" />
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1">الربح المحتمل</p>
                  <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    <AnimatedValue value={capitalData?.potentialProfit || 0} format="currency" />
                  </p>
                </div>
              </div>
            </motion.div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatsCard
                title="قيمة المخزون (شراء)"
                value={capitalData?.totalPurchaseValue || 0}
                format="currency"
                icon={<Box className="w-5 h-5" />}
                iconColor="#3b82f6"
                iconBgColor="#dbeafe"
                description="رأس المال المستثمر"
              />
              <StatsCard
                title="قيمة المخزون (تجزئة)"
                value={capitalData?.totalRetailValue || 0}
                format="currency"
                icon={<ShoppingBag className="w-5 h-5" />}
                iconColor="#10b981"
                iconBgColor="#d1fae5"
                description="القيمة البيعية"
              />
              <StatsCard
                title="الربح المحتمل"
                value={capitalData?.potentialProfit || 0}
                format="currency"
                icon={<PiggyBank className="w-5 h-5" />}
                iconColor="#f97316"
                iconBgColor="#ffedd5"
                trend="up"
                trendValue={formatPercent(capitalData?.potentialMargin || 0)}
              />
              <StatsCard
                title="هامش الربح المحتمل"
                value={capitalData?.potentialMargin || 0}
                format="percent"
                icon={<Percent className="w-5 h-5" />}
                iconColor="#8b5cf6"
                iconBgColor="#f3e8ff"
                description="نسبة الربح من التكلفة"
              />
            </div>

            {/* Capital Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">مقارنة الأسعار</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">الشراء vs التجزئة vs الجملة</p>
                </div>
                <CapitalComparisonChart
                  purchaseValue={capitalData?.totalPurchaseValue || 0}
                  retailValue={capitalData?.totalRetailValue || 0}
                  wholesaleValue={capitalData?.totalWholesaleValue || 0}
                  profit={capitalData?.potentialProfit || 0}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
              >
                <div className="mb-5">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">رأس المال حسب الفئة</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">قيمة المخزون بسعر الشراء</p>
                </div>
                <HorizontalBarChart
                  data={capitalData?.capitalByCategory || []}
                  maxItems={6}
                  formatValue="currency"
                  colors={['#8b5cf6', '#3b82f6', '#10b981', '#f97316', '#f59e0b', '#ec4899']}
                />
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* ===== Alerts Tab ===== */}
        {activeTab === 'alerts' && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {alertsCount === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-500/10 dark:to-teal-500/10 rounded-2xl border border-emerald-200 dark:border-emerald-800"
              >
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300 mb-2">
                  المخزون بحالة ممتازة
                </h3>
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  لا توجد تنبيهات حالياً • جميع المنتجات متوفرة
                </p>
              </motion.div>
            ) : (
              <>
                {/* Alert Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <AlertCard
                    type="danger"
                    title="نفاد المخزون"
                    count={inventoryData?.outOfStockCount || 0}
                    icon={<PackageX className="w-6 h-6" />}
                  />
                  <AlertCard
                    type="warning"
                    title="مخزون منخفض"
                    count={inventoryData?.lowStockCount || 0}
                    icon={<AlertTriangle className="w-6 h-6" />}
                  />
                </div>

                {/* Low Stock Products List */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-zinc-100 dark:border-zinc-800"
                >
                  <div className="mb-5">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">المنتجات التي تحتاج إعادة تخزين</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">قائمة المنتجات بمخزون منخفض أو نافد</p>
                  </div>
                  <div className="space-y-3">
                    {inventoryData?.lowStockProducts?.slice(0, 10).map((product, index) => (
                      <LowStockProductRow
                        key={product.id || index}
                        product={product}
                        index={index}
                      />
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default memo(InventorySection);
