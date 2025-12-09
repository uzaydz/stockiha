/**
 * ============================================
 * STOCKIHA ANALYTICS - SIMPLE BAR CHART
 * مخطط الأعمدة البسيط - Recharts
 * ============================================
 */

import React, { memo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useTheme } from 'next-themes';
import { formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface SimpleBarChartData {
  name: string;
  value: number;
  color?: string;
}

export interface SimpleBarChartProps {
  data: SimpleBarChartData[];
  height?: number;
  color?: string;
  colors?: string[];
  layout?: 'vertical' | 'horizontal';
  showGrid?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
  valueFormat?: 'currency' | 'number' | 'percent';
  barRadius?: number;
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

const SimpleBarChart: React.FC<SimpleBarChartProps> = ({
  data,
  height = 260,
  color = '#f97316',
  colors,
  layout = 'vertical',
  showGrid = false,
  showXAxis = true,
  showYAxis = true,
  valueFormat = 'currency',
  barRadius = 6,
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const defaultColors = ['#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];
  const chartColors = colors || defaultColors;

  const formatValue = (value: number) => {
    if (valueFormat === 'currency') {
      if (value >= 1000000) return `${(value / 1000000).toFixed(0)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      return value.toString();
    }
    if (valueFormat === 'percent') return `${value}%`;
    return value.toString();
  };

  if (layout === 'horizontal') {
    return (
      <div style={{ height }} className={className}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke={isDark ? '#27272a' : '#e4e4e7'}
              />
            )}

            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: isDark ? '#71717a' : '#a1a1aa' }}
              tickFormatter={formatValue}
            />

            <YAxis
              type="category"
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: isDark ? '#a1a1aa' : '#71717a' }}
              width={80}
            />

            <Tooltip content={<CustomTooltip format={valueFormat} />} cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }} />

            <Bar dataKey="value" radius={[0, barRadius, barRadius, 0]} maxBarSize={32}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || chartColors[index % chartColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div style={{ height }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
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
              tickFormatter={formatValue}
              dx={-10}
            />
          )}

          <Tooltip content={<CustomTooltip format={valueFormat} />} cursor={{ fill: isDark ? '#27272a' : '#f4f4f5' }} />

          <Bar dataKey="value" radius={[barRadius, barRadius, 0, 0]} maxBarSize={50}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color || chartColors[index % chartColors.length]}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(SimpleBarChart);
