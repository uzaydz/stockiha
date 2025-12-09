/**
 * مكون قسم الأرباح - تصميم متطور
 * يعرض الربح الإجمالي والصافي مع التفاصيل والاتجاهات
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  PiggyBank,
  Calculator,
  ArrowRight,
  Target
} from 'lucide-react';
import type { ProfitData, ProfitBreakdown, ProfitTrend } from '../types';
import { formatCurrency, formatCompactNumber, getColorForValue } from '../utils';
import { CHART_COLORS } from '../constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProfitSectionProps {
  profit: ProfitData | null;
  breakdown: ProfitBreakdown[];
  trend: ProfitTrend[];
  isLoading?: boolean;
  detailed?: boolean;
}

// options shared
const commonChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(24, 24, 27, 0.9)',
      titleColor: '#fff',
      bodyColor: '#fff',
      padding: 12,
      cornerRadius: 8,
      titleFont: { family: 'Tajawal, sans-serif', weight: 'bold' as const },
      bodyFont: { family: 'Tajawal, sans-serif' },
    }
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: 'Tajawal, sans-serif' }, color: '#a1a1aa' }
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
      ticks: { font: { family: 'Tajawal, sans-serif' }, color: '#a1a1aa' },
      border: { display: false }
    }
  }
};

// مكون ملخص الأرباح
const ProfitSummaryCard: React.FC<{
  profit: ProfitData | null;
  isLoading?: boolean;
  compact?: boolean;
}> = ({ profit, isLoading, compact }) => {
  if (isLoading) {
    return (
      <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const profitFlow = [
    {
      label: 'إجمالي الإيرادات',
      value: profit?.grossRevenue || 0,
      color: 'text-blue-600',
      barColor: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'تكلفة البضاعة المباعة',
      value: -(profit?.cogs || 0),
      color: 'text-red-600',
      barColor: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      isNegative: true,
    },
    {
      label: 'الربح الإجمالي',
      value: profit?.grossProfit || 0,
      color: 'text-emerald-600',
      barColor: 'bg-emerald-500',
      bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
      margin: profit?.grossProfitMargin,
      isTotal: true
    },
    {
      label: 'المصاريف التشغيلية',
      value: -(profit?.operatingExpenses || 0),
      color: 'text-amber-600',
      barColor: 'bg-amber-500',
      bgColor: 'bg-amber-50 dark:bg-amber-900/20',
      isNegative: true,
    },
    {
      label: 'الخسائر والمرتجعات',
      value: -((profit?.losses || 0) + (profit?.returns || 0)),
      color: 'text-red-500',
      barColor: 'bg-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20',
      isNegative: true,
    },
  ];

  const netProfit = profit?.netProfit || 0;
  const netMargin = profit?.netProfitMargin || 0;

  return (
    <Card className={cn("h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm transition-all hover:shadow-md", compact ? "" : "col-span-1 lg:col-span-2")}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">
              <Calculator className="h-4 w-4" />
            </div>
            تحليل الربحية
          </CardTitle>
          <Badge variant="outline" className={cn("gap-1 font-mono", netProfit >= 0 ? "text-emerald-600 border-emerald-200 bg-emerald-50" : "text-red-600 border-red-200 bg-red-50")}>
            هامش {netMargin.toFixed(1)}%
          </Badge>
        </div>
        <CardDescription>
          تتبع تدفق الأرباح من الإيرادات وصولاً لصافي الربح
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Waterfall / Flow List */}
        <div className="space-y-1 relative">

          {/* Connector Line */}
          <div className="absolute top-4 bottom-12 right-[19px] w-0.5 bg-zinc-100 dark:bg-zinc-800" />

          {profitFlow.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative flex items-center justify-between p-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 group"
            >
              <div className="flex items-center gap-3 relative z-10">
                <div className={cn("w-2.5 h-2.5 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm", item.isNegative ? "bg-red-400" : "bg-emerald-400", item.barColor.replace('bg-', 'bg-'))} />

                <div className="flex flex-col">
                  <span className={cn("text-sm font-medium", item.isTotal ? "text-zinc-900 dark:text-zinc-100 text-base" : "text-zinc-600 dark:text-zinc-400")}>
                    {item.label}
                  </span>
                  {item.margin !== undefined && (
                    <span className="text-[10px] text-zinc-400">هامش {item.margin.toFixed(1)}%</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={cn("text-sm font-bold tabular-nums", item.color, item.isTotal ? "text-base" : "")}>
                  {formatCurrency(Math.abs(item.value))}
                </span>
                {item.isNegative && <ArrowRight className="h-3 w-3 text-red-400 rotate-45" />}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="my-4 border-t border-dashed border-zinc-200 dark:border-zinc-800" />

        {/* Net Profit Final Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={cn(
            "relative overflow-hidden p-6 rounded-2xl border",
            netProfit >= 0
              ? "bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-500/20"
              : "bg-gradient-to-br from-red-500 to-red-600 border-red-400 text-white shadow-lg shadow-red-500/20"
          )}
        >
          {/* Background Pattern */}
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <PiggyBank className="h-32 w-32" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">صافي الربح النهائي</p>
              <h2 className="text-3xl font-bold tracking-tight">
                {formatCurrency(netProfit).replace('DA', '')} <span className="text-base font-medium opacity-80">DA</span>
              </h2>
            </div>
            <div className="bg-white/20 backdrop-blur-md p-3 rounded-xl">
              <Target className="h-6 w-6 text-white" />
            </div>
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
};

// مكون توزيع الأرباح حسب المصدر
const ProfitBreakdownCard: React.FC<{
  breakdown: ProfitBreakdown[];
  isLoading?: boolean;
}> = ({ breakdown, isLoading }) => {
  const chartData = useMemo(() => ({
    labels: (breakdown || []).map(item => item.sourceName),
    datasets: [
      {
        label: 'الربح',
        data: (breakdown || []).map(item => item.profit),
        backgroundColor: CHART_COLORS.secondary,
        borderRadius: 4,
        barThickness: 24,
      },
    ],
  }), [breakdown]);

  if (isLoading) {
    return (
      <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100">
          مصادر الأرباح
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[200px] mb-4">
          <Bar data={chartData} options={{ ...commonChartOptions, indexAxis: 'y' as const }} />
        </div>

        {/* Mini Table */}
        <div className="space-y-2">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
              <span className="font-medium text-zinc-700 dark:text-zinc-300">{item.sourceName}</span>
              <div className="flex items-center gap-3">
                <span className="text-zinc-500">{formatCompactNumber(item.profit)}</span>
                <Badge variant="secondary" className="h-5 text-[10px] px-1.5">{item.margin.toFixed(1)}%</Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// مكون اتجاه الأرباح
const ProfitTrendCard: React.FC<{
  trend: ProfitTrend[];
  isLoading?: boolean;
}> = ({ trend, isLoading }) => {
  const chartData = useMemo(() => ({
    labels: (trend || []).map(item =>
      new Date(item.date + '-01').toLocaleDateString('ar-DZ', { month: 'short' })
    ),
    datasets: [
      {
        label: 'الربح',
        data: (trend || []).map(item => item.profit),
        borderColor: CHART_COLORS.secondary,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, `${CHART_COLORS.secondary}40`);
          gradient.addColorStop(1, `${CHART_COLORS.secondary}00`);
          return gradient;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        yAxisID: 'y',
        borderWidth: 2
      },
      {
        label: 'الهامش %',
        data: (trend || []).map(item => item.margin),
        borderColor: CHART_COLORS.tertiary,
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        yAxisID: 'y1',
        borderWidth: 2
      },
    ],
  }), [trend]);

  if (isLoading) {
    return (
      <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const chartOptions = {
    ...commonChartOptions,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { family: 'Tajawal' }, color: '#a1a1aa' } },
      y: {
        type: 'linear' as const,
        display: true,
        position: 'left' as const,
        grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
        ticks: { callback: (val: any) => formatCompactNumber(val), font: { family: 'Tajawal' }, color: '#a1a1aa' },
        border: { display: false }
      },
      y1: {
        type: 'linear' as const,
        display: true,
        position: 'right' as const,
        grid: { drawOnChartArea: false },
        ticks: { callback: (val: any) => `${val}%`, font: { family: 'Tajawal' }, color: '#a1a1aa' },
        border: { display: false }
      },
    },
  };

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-900/20 text-orange-600">
            <TrendingUp className="h-4 w-4" />
          </div>
          اتجاه النمو (شهري)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <Line data={chartData} options={chartOptions} />
        </div>
      </CardContent>
    </Card>
  );
};

// المكون الرئيسي
const ProfitSection: React.FC<ProfitSectionProps> = ({
  profit,
  breakdown,
  trend,
  isLoading,
  detailed = false
}) => {
  return (
    <div className={cn("grid gap-6", detailed ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid-cols-1")}>

      {/* If Detailed: Layout changes */}
      {detailed && (
        <div className="col-span-1 lg:col-span-3">
          <ProfitTrendCard trend={trend} isLoading={isLoading} />
        </div>
      )}

      {/* Summary Card - Takes full width in compact, or part in detailed */}
      <div className={cn(detailed ? "lg:col-span-2" : "")}>
        <ProfitSummaryCard profit={profit} isLoading={isLoading} compact={!detailed} />
      </div>

      {/* Breakdown Card - Shown in detailed, or if we want it in compact but usually hidden there */}
      {detailed && (
        <div className="lg:col-span-1">
          <ProfitBreakdownCard breakdown={breakdown} isLoading={isLoading} />
        </div>
      )}
    </div>
  );
};

export { ProfitSection };
