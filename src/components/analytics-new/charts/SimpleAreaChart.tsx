/**
 * ============================================
 * STOCKIHA ANALYTICS - SIMPLE AREA CHART
 * مخطط المساحة البسيط - Recharts
 * ============================================
 */

import React, { memo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useTheme } from 'next-themes';
import { formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface SimpleAreaChartData {
  name: string;
  value: number;
}

export interface SimpleAreaChartProps {
  data: SimpleAreaChartData[];
  height?: number;
  color?: string;
  gradientColor?: string;
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  valueFormat?: 'currency' | 'number' | 'percent';
  className?: string;
}

// ==================== Custom Tooltip ====================

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  label?: string;
  format: 'currency' | 'number' | 'percent';
}> = ({ active, payload, label, format }) => {
  if (!active || !payload || !payload.length) return null;

  const value = payload[0].value;
  const formattedValue = format === 'currency'
    ? formatCurrency(value)
    : format === 'percent'
      ? `${value.toFixed(1)}%`
      : value.toLocaleString('ar-DZ');

  return (
    <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700">
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{formattedValue}</p>
    </div>
  );
};

// ==================== Main Component ====================

const SimpleAreaChart: React.FC<SimpleAreaChartProps> = ({
  data,
  height = 260,
  color = '#f97316',
  gradientColor,
  showGrid = false,
  showXAxis = true,
  showYAxis = false,
  valueFormat = 'currency',
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const gradientId = `gradient-${color.replace('#', '')}`;
  const finalGradientColor = gradientColor || color;

  const formatYAxis = (value: number) => {
    if (valueFormat === 'currency') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    if (valueFormat === 'percent') return `${value}%`;
    return value.toString();
  };

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={finalGradientColor} stopOpacity={0.3} />
              <stop offset="95%" stopColor={finalGradientColor} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && (
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke={isDark ? '#27272a' : '#e4e4e7'}
            />
          )}

          {showXAxis && (
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? '#71717a' : '#a1a1aa' }}
              dy={10}
            />
          )}

          {showYAxis && (
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? '#71717a' : '#a1a1aa' }}
              tickFormatter={formatYAxis}
              dx={-10}
            />
          )}

          <Tooltip
            content={<CustomTooltip format={valueFormat} />}
            cursor={{ stroke: isDark ? '#52525b' : '#d4d4d8', strokeWidth: 1 }}
          />

          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2.5}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{
              r: 5,
              fill: color,
              stroke: isDark ? '#18181b' : '#ffffff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(SimpleAreaChart);
