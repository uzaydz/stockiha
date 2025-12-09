/**
 * ============================================
 * STOCKIHA ANALYTICS - SALES CHART
 * مخطط المبيعات - Chart.js مع تصميم احترافي
 * ============================================
 */

import React, { useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useTheme } from 'next-themes';
import { TrendingUp, Calendar } from 'lucide-react';
import type { DailySalesData, MonthlySalesData } from './types';

// Register Chart.js components
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

interface SalesChartProps {
  dailySales: DailySalesData[];
  monthlySales: MonthlySalesData[];
  isLoading: boolean;
}

const COLORS = {
  orange: '#f97316',
  rose: '#f43f5e',
  emerald: '#10b981',
};

const formatCurrency = (value: number): string => {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
};

const formatCurrencyFull = (value: number): string => {
  return `${value.toLocaleString('ar-DZ')} د.ج`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' });
};

const formatMonth = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('ar-DZ', { month: 'short', year: '2-digit' });
};

const SalesChart: React.FC<SalesChartProps> = ({
  dailySales,
  monthlySales,
  isLoading,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const lineChartRef = useRef<ChartJS<'line'>>(null);

  const chartData = useMemo(() => ({
    daily: dailySales.map(item => ({
      date: formatDate(item.date),
      sales: item.sales,
      orders: item.orders,
    })),
    monthly: monthlySales.map(item => ({
      month: formatMonth(item.month),
      sales: item.sales,
      expenses: item.expenses,
      profit: item.profit,
    })),
  }), [dailySales, monthlySales]);

  // Create gradient for area chart
  useEffect(() => {
    const chart = lineChartRef.current;
    if (!chart) return;

    const ctx = chart.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, chart.height);
    gradient.addColorStop(0, `${COLORS.orange}66`);
    gradient.addColorStop(1, `${COLORS.orange}0D`);

    chart.data.datasets[0].backgroundColor = gradient;
    chart.update('none');
  }, [chartData.daily]);

  const dailyChartData: ChartData<'line'> = useMemo(() => ({
    labels: chartData.daily.map(d => d.date),
    datasets: [
      {
        label: 'المبيعات',
        data: chartData.daily.map(d => d.sales),
        borderColor: COLORS.orange,
        borderWidth: 2.5,
        fill: true,
        backgroundColor: `${COLORS.orange}33`,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: COLORS.orange,
        pointHoverBorderColor: isDark ? '#18181b' : '#ffffff',
        pointHoverBorderWidth: 3,
      },
    ],
  }), [chartData.daily, isDark]);

  const monthlyChartData: ChartData<'bar'> = useMemo(() => ({
    labels: chartData.monthly.map(d => d.month),
    datasets: [
      {
        label: 'المبيعات',
        data: chartData.monthly.map(d => d.sales),
        backgroundColor: COLORS.orange,
        borderRadius: 4,
        maxBarThickness: 40,
      },
      {
        label: 'المصاريف',
        data: chartData.monthly.map(d => d.expenses),
        backgroundColor: COLORS.rose,
        borderRadius: 4,
        maxBarThickness: 40,
      },
      {
        label: 'الربح',
        data: chartData.monthly.map(d => d.profit),
        backgroundColor: COLORS.emerald,
        borderRadius: 4,
        maxBarThickness: 40,
      },
    ],
  }), [chartData.monthly]);

  const lineOptions: ChartOptions<'line'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: isDark ? '#a1a1aa' : '#71717a',
          font: { size: 11 },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        titleColor: isDark ? '#a1a1aa' : '#71717a',
        bodyColor: isDark ? '#ffffff' : '#18181b',
        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        titleFont: { size: 11 },
        bodyFont: { size: 14, weight: 'bold' },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrencyFull(context.raw as number)}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDark ? '#71717a' : '#a1a1aa',
          font: { size: 11 },
          padding: 10,
        },
      },
      y: {
        display: true,
        grid: {
          display: true,
          color: isDark ? '#27272a' : '#e4e4e7',
        },
        border: {
          display: false,
          dash: [3, 3],
        },
        ticks: {
          color: isDark ? '#71717a' : '#a1a1aa',
          font: { size: 11 },
          padding: 10,
          callback: (value) => formatCurrency(value as number),
        },
      },
    },
  }), [isDark]);

  const barOptions: ChartOptions<'bar'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          color: isDark ? '#a1a1aa' : '#71717a',
          font: { size: 11 },
          padding: 20,
          usePointStyle: true,
          pointStyle: 'circle',
        },
      },
      tooltip: {
        enabled: true,
        backgroundColor: isDark ? '#27272a' : '#ffffff',
        titleColor: isDark ? '#a1a1aa' : '#71717a',
        bodyColor: isDark ? '#ffffff' : '#18181b',
        borderColor: isDark ? '#3f3f46' : '#e4e4e7',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 12,
        titleFont: { size: 11 },
        bodyFont: { size: 14, weight: 'bold' },
        callbacks: {
          label: (context) => `${context.dataset.label}: ${formatCurrencyFull(context.raw as number)}`,
        },
      },
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        ticks: {
          color: isDark ? '#71717a' : '#a1a1aa',
          font: { size: 11 },
          padding: 10,
        },
      },
      y: {
        display: true,
        grid: {
          display: true,
          color: isDark ? '#27272a' : '#e4e4e7',
        },
        border: {
          display: false,
          dash: [3, 3],
        },
        ticks: {
          color: isDark ? '#71717a' : '#a1a1aa',
          font: { size: 11 },
          padding: 10,
          callback: (value) => formatCurrency(value as number),
        },
      },
    },
  }), [isDark]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <TrendingUp className="h-5 w-5 text-orange-600" />
            تحليل المبيعات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2 max-w-xs">
              <TabsTrigger value="daily" className="gap-2">
                <Calendar className="h-4 w-4" />
                يومي
              </TabsTrigger>
              <TabsTrigger value="monthly" className="gap-2">
                <Calendar className="h-4 w-4" />
                شهري
              </TabsTrigger>
            </TabsList>

            <TabsContent value="daily" className="mt-4">
              {chartData.daily.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات للفترة المحددة
                </div>
              ) : (
                <div className="h-[300px]">
                  <Line ref={lineChartRef} data={dailyChartData} options={lineOptions} />
                </div>
              )}
            </TabsContent>

            <TabsContent value="monthly" className="mt-4">
              {chartData.monthly.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  لا توجد بيانات شهرية
                </div>
              ) : (
                <div className="h-[300px]">
                  <Bar data={monthlyChartData} options={barOptions} />
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default SalesChart;
