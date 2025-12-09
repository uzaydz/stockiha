/**
 * ============================================
 * STOCKIHA ANALYTICS - SIMPLE PIE CHART
 * مخطط دائري بسيط - Recharts
 * ============================================
 */

import React, { memo, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { useTheme } from 'next-themes';
import { formatCurrency } from '../utils/formatters';

// ==================== Types ====================

export interface SimplePieChartData {
  name: string;
  value: number;
  color?: string;
}

export interface SimplePieChartProps {
  data: SimplePieChartData[];
  height?: number;
  colors?: string[];
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
  valueFormat?: 'currency' | 'number' | 'percent';
  className?: string;
}

// ==================== Custom Active Shape ====================

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 6}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
    </g>
  );
};

// ==================== Custom Tooltip ====================

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: any[];
  format: 'currency' | 'number' | 'percent';
  total: number;
}> = ({ active, payload, format, total }) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const percentage = ((data.value / total) * 100).toFixed(1);

  const formattedValue = format === 'currency'
    ? formatCurrency(data.value)
    : format === 'percent'
      ? `${data.value.toFixed(1)}%`
      : data.value.toLocaleString('ar-DZ');

  return (
    <div className="bg-white dark:bg-zinc-800 px-3 py-2 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700">
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: data.color || payload[0].color }}
        />
        <span className="text-xs text-zinc-500 dark:text-zinc-400">{data.name}</span>
      </div>
      <p className="text-sm font-bold text-zinc-900 dark:text-white">{formattedValue}</p>
      <p className="text-xs text-zinc-400">{percentage}%</p>
    </div>
  );
};

// ==================== Legend Item ====================

const LegendItem: React.FC<{
  name: string;
  value: number;
  color: string;
  percentage: number;
  format: 'currency' | 'number' | 'percent';
}> = ({ name, value, color, percentage, format }) => {
  const formattedValue = format === 'currency'
    ? formatCurrency(value, { compact: true })
    : format === 'percent'
      ? `${value.toFixed(1)}%`
      : value.toLocaleString('ar-DZ');

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[100px]">
          {name}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-zinc-900 dark:text-white">
          {formattedValue}
        </span>
        <span className="text-[10px] text-zinc-400 w-10 text-left">
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

const SimplePieChart: React.FC<SimplePieChartProps> = ({
  data,
  height = 260,
  colors,
  innerRadius = 50,
  outerRadius = 80,
  showLegend = true,
  valueFormat = 'currency',
  className,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  const defaultColors = [
    '#f97316', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
    '#14b8a6', '#f59e0b', '#ef4444', '#6366f1', '#84cc16',
  ];
  const chartColors = colors || defaultColors;

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const dataWithColors = data.map((item, index) => ({
    ...item,
    color: item.color || chartColors[index % chartColors.length],
  }));

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(undefined);
  };

  return (
    <div style={{ height }} className={`flex items-center ${className}`}>
      {/* Chart */}
      <div className={showLegend ? 'w-1/2' : 'w-full'} style={{ height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {dataWithColors.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={isDark ? '#18181b' : '#ffffff'}
                  strokeWidth={2}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip format={valueFormat} total={total} />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="w-1/2 pr-4 max-h-full overflow-y-auto">
          {dataWithColors.map((item, index) => (
            <LegendItem
              key={index}
              name={item.name}
              value={item.value}
              color={item.color}
              percentage={(item.value / total) * 100}
              format={valueFormat}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(SimplePieChart);
