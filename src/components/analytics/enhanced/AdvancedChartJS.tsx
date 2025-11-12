/**
 * مكون رسوم بيانية متقدم باستخدام Chart.js
 * بديل مستقر لـ recharts بدون مشاكل dependencies
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ============================================================================
// Types
// ============================================================================

export type ChartType = 'line' | 'bar' | 'area' | 'pie' | 'donut';

export interface ChartDataPoint {
  name: string;
  value?: number;
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

const AdvancedChartJS: React.FC<AdvancedChartProps> = ({
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

  // تحضير البيانات لـ Chart.js
  const chartData = useMemo(() => {
    const labels = data.map(item => item.name);

    if (type === 'pie' || type === 'donut') {
      // للرسوم الدائرية
      return {
        labels,
        datasets: [{
          data: data.map(item => item.value),
          backgroundColor: colors.slice(0, data.length),
          borderColor: '#ffffff',
          borderWidth: 2,
        }]
      };
    } else {
      // للرسوم الخطية والأعمدة
      return {
        labels,
        datasets: dataKeys.map((key, index) => ({
          label: key,
          data: data.map(item => item[key] || 0),
          backgroundColor: type === 'area' 
            ? `${colors[index % colors.length]}99` // شفافية للمساحة
            : colors[index % colors.length],
          borderColor: colors[index % colors.length],
          borderWidth: 2,
          fill: type === 'area',
          tension: 0.4, // منحنى ناعم
        }))
      };
    }
  }, [data, dataKeys, colors, type]);

  // خيارات الرسم البياني
  const options: ChartOptions<any> = useMemo(() => {
    const isPieChart = type === 'pie' || type === 'donut';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'bottom' as const,
          labels: {
            font: {
              family: 'Tajawal',
              size: 12
            },
            padding: 15,
            usePointStyle: true,
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleFont: {
            family: 'Tajawal',
            size: 13
          },
          bodyFont: {
            family: 'Tajawal',
            size: 12
          },
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: function(context: any) {
              // للرسوم الدائرية (pie/donut)
              if (isPieChart) {
                const label = context.label || '';
                const value = context.parsed || 0;
                return `${label}: ${formatValue(value)}`;
              }
              
              // للرسوم الأخرى (line/bar/area)
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed?.y !== null && context.parsed?.y !== undefined) {
                label += formatValue(context.parsed.y);
              } else if (context.parsed !== null && context.parsed !== undefined) {
                label += formatValue(context.parsed);
              }
              return label;
            }
          }
        }
      },
      scales: !isPieChart ? {
        x: {
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: {
              family: 'Tajawal',
              size: 11
            }
          }
        },
        y: {
          grid: {
            display: showGrid,
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: {
              family: 'Tajawal',
              size: 11
            },
            callback: function(value: any) {
              return formatValue(Number(value));
            }
          }
        }
      } : undefined,
    };
  }, [showLegend, showGrid, formatValue, type]);

  // رسم الرسم البياني حسب النوع
  const renderChart = () => {
    const chartProps = {
      data: chartData,
      options,
      height
    };

    switch (type) {
      case 'line':
        return <Line {...chartProps} />;
      case 'bar':
        return <Bar {...chartProps} />;
      case 'area':
        return <Line {...chartProps} />;
      case 'pie':
        return <Pie {...chartProps} />;
      case 'donut':
        return <Doughnut {...chartProps} />;
      default:
        return <Line {...chartProps} />;
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
        <div style={{ height }}>
          {renderChart()}
        </div>
      )}
    </Card>
  );
};

export default AdvancedChartJS;
