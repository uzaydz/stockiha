/**
 * مكون رسوم بيانية متقدم
 * يدعم أنواع مختلفة من الرسوم البيانية مع تفاعلية عالية
 */

import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps
} from 'recharts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut';

export interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: any;
}

export interface AdvancedChartProps {
  title: string;
  subtitle?: string;
  type: ChartType;
  data: ChartDataPoint[];
  dataKeys?: string[];
  colors?: string[];
  height?: number;
  isLoading?: boolean;
  showLegend?: boolean;
  showGrid?: boolean;
  className?: string;
  trend?: {
    value: number;
    label: string;
  };
  formatValue?: (value: number) => string;
}

// ============================================================================
// ألوان افتراضية
// ============================================================================

const DEFAULT_COLORS = [
  '#FC5D41', // Primary - Orange
  '#10B981', // Success - Green
  '#3B82F6', // Info - Blue
  '#F59E0B', // Warning - Amber
  '#EF4444', // Danger - Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
];

// ============================================================================
// Component
// ============================================================================

const AdvancedChart: React.FC<AdvancedChartProps> = ({
  title,
  subtitle,
  type,
  data,
  dataKeys = ['value'],
  colors = DEFAULT_COLORS,
  height = 300,
  isLoading = false,
  showLegend = true,
  showGrid = true,
  className,
  trend,
  formatValue = (value) => value.toLocaleString('ar-DZ')
}) => {

  // Tooltip مخصص
  const CustomTooltip: React.FC<TooltipProps<any, any>> = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3">
        <p className="font-medium text-sm mb-2 text-gray-900 dark:text-white">
          {label}
        </p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-600 dark:text-gray-400">
              {entry.name}:
            </span>
            <span className="font-semibold text-gray-900 dark:text-white">
              {formatValue(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  // رسم الخط
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
        )}
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: '12px' }} />}
        {dataKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ fill: colors[index % colors.length], r: 4 }}
            activeDot={{ r: 6 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );

  // رسم الأعمدة
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
        )}
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: '12px' }} />}
        {dataKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            radius={[8, 8, 0, 0]}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );

  // رسم المساحة
  const renderAreaChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        {showGrid && (
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#e5e7eb"
            className="dark:stroke-gray-700"
          />
        )}
        <XAxis
          dataKey="name"
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
        />
        <YAxis
          stroke="#6b7280"
          style={{ fontSize: '12px', fontFamily: 'Tajawal' }}
          tickFormatter={formatValue}
        />
        <Tooltip content={<CustomTooltip />} />
        {showLegend && <Legend wrapperStyle={{ fontFamily: 'Tajawal', fontSize: '12px' }} />}
        {dataKeys.map((key, index) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            fill={colors[index % colors.length]}
            fillOpacity={0.6}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );

  // رسم الدائرة
  const renderPieChart = () => {
    const RADIAN = Math.PI / 180;
    const renderCustomizedLabel = ({
      cx,
      cy,
      midAngle,
      innerRadius,
      outerRadius,
      percent
    }: any) => {
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);

      return (
        <text
          x={x}
          y={y}
          fill="white"
          textAnchor={x > cx ? 'start' : 'end'}
          dominantBaseline="central"
          style={{ fontSize: '12px', fontWeight: 'bold', fontFamily: 'Tajawal' }}
        >
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderCustomizedLabel}
            outerRadius={type === 'donut' ? 100 : 120}
            innerRadius={type === 'donut' ? 60 : 0}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && (
            <Legend
              wrapperStyle={{ fontFamily: 'Tajawal', fontSize: '12px' }}
              iconType="circle"
            />
          )}
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // رسم الرسم البياني حسب النوع
  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'area':
        return renderAreaChart();
      case 'pie':
      case 'donut':
        return renderPieChart();
      default:
        return renderLineChart();
    }
  };

  // أيقونة الاتجاه
  const TrendIcon = trend
    ? trend.value > 0
      ? TrendingUp
      : trend.value < 0
      ? TrendingDown
      : Minus
    : null;

  return (
    <Card className={cn('p-6', className)}>
      {/* العنوان */}
      <div className="mb-4">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">
                {subtitle}
              </p>
            )}
          </div>

          {/* مؤشر الاتجاه */}
          {trend && TrendIcon && (
            <div className={cn(
              'flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-full',
              trend.value > 0
                ? 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20'
                : trend.value < 0
                ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20'
                : 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-900/20'
            )}>
              <TrendIcon className="w-4 h-4" />
              <span>{Math.abs(trend.value).toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* الرسم البياني */}
      {isLoading ? (
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
        </div>
      ) : data.length === 0 ? (
        <div className="flex items-center justify-center text-muted-foreground" style={{ height }}>
          <p>لا توجد بيانات للعرض</p>
        </div>
      ) : (
        <div dir="ltr">
          {renderChart()}
        </div>
      )}
    </Card>
  );
};

export default AdvancedChart;
