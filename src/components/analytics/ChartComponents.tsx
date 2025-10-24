import React, { useRef, useEffect, useMemo } from 'react';
import { Bar, Pie, Doughnut, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, PieChart, TrendingUp, Activity } from 'lucide-react';
import { useTheme } from 'next-themes';
import {
  getDefaultChartOptions,
  getPieChartOptions,
  colorPalette,
  createGradient,
  createRadialGradient
} from './chartConfig';
import { formatCurrency, formatLargeNumber } from './utils';
import type { ChartDataItem } from './types';

interface FinancialBarChartProps {
  data: ChartDataItem[];
  title: string;
  subtitle?: string;
  isLoading?: boolean;
}

interface SalesDistributionChartProps {
  data: ChartDataItem[];
  title: string;
  subtitle?: string;
  isLoading?: boolean;
}

// مكون الرسم البياني للأرباح والتكاليف
export const FinancialBarChart: React.FC<FinancialBarChartProps> = ({
  data,
  title,
  subtitle,
  isLoading = false
}) => {
  const chartRef = useRef<any>(null);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    return {
      labels: data.map(item => item.name),
      datasets: [
        {
          label: 'المبلغ',
          data: data.map(item => item.amount || item.value),
          backgroundColor: data.map((item, index) => {
            const color = colorPalette[index % colorPalette.length];
            return (item.amount || item.value) >= 0 ? color.background : colorPalette[3].background; // أحمر للقيم السالبة
          }),
          borderColor: data.map((item, index) => {
            const color = colorPalette[index % colorPalette.length];
            return (item.amount || item.value) >= 0 ? color.border : colorPalette[3].border;
          }),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          hoverBackgroundColor: data.map((item, index) => {
            const color = colorPalette[index % colorPalette.length];
            return (item.amount || item.value) >= 0 ? color.border : colorPalette[3].border;
          }),
          hoverBorderWidth: 3
        }
      ]
    };
  }, [data]);

  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const options = useMemo(() => {
    const baseOptions = getDefaultChartOptions(isDarkMode);
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        title: {
          display: false
        },
        legend: {
          display: false
        }
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales.y,
          beginAtZero: true
        }
      }
    };
  }, [isDarkMode]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="h-5 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 animate-pulse rounded w-40"></div>
              <div className="h-3 bg-gradient-to-r from-gray-200/80 to-gray-300/80 dark:from-gray-700/80 dark:to-gray-600/80 animate-pulse rounded w-60"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80 bg-gradient-to-br from-gray-100/80 to-gray-200/80 dark:from-gray-800/80 dark:to-gray-700/80 animate-pulse rounded-xl"></div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold">
                {title}
              </span>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p className="text-lg font-semibold">
                لا توجد بيانات
              </p>
              <p className="text-sm text-muted-foreground">
                للفترة المحددة حالياً
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all">
      <CardHeader className="bg-muted/30">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BarChart3 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-lg font-bold">
              {title}
            </span>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1 font-normal">
                {subtitle}
              </p>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 pb-4">
        <div className="h-[400px]">
          <Bar ref={chartRef} data={chartData} options={options} />
        </div>
      </CardContent>
    </Card>
  );
};

// مكون الرسم الدائري لتوزيع المبيعات
export const SalesDistributionChart: React.FC<SalesDistributionChartProps> = ({
  data,
  title,
  subtitle,
  isLoading = false
}) => {
  const chartRef = useRef<any>(null);
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return null;

    const validData = data.filter(item => (item.value || item.amount || 0) > 0);
    
    if (validData.length === 0) return null;

    return {
      labels: validData.map(item => item.name),
      datasets: [
        {
          label: 'المبيعات',
          data: validData.map(item => item.value || item.amount || 0),
          backgroundColor: validData.map((_, index) => {
            const color = colorPalette[index % colorPalette.length];
            return color.background;
          }),
          borderColor: validData.map((_, index) => {
            const color = colorPalette[index % colorPalette.length];
            return color.border;
          }),
          borderWidth: 3,
          hoverBorderWidth: 4,
          hoverOffset: 8,
          cutout: '45%',
          spacing: 2
        }
      ]
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-2">
              <div className="h-5 bg-muted animate-pulse rounded w-40"></div>
              <div className="h-3 bg-muted animate-pulse rounded w-60"></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="h-80 bg-muted animate-pulse rounded-lg"></div>
        </CardContent>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <PieChart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold">
                {title}
              </span>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-80 flex items-center justify-center text-gray-400 dark:text-gray-500"
          >
            <div className="text-center space-y-4">
              <motion.div 
                animate={{ 
                  rotate: [0, 5, -5, 0],
                  scale: [1, 1.05, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse"
                }}
                className="text-6xl opacity-80 dark:opacity-60"
              >
                📊
              </motion.div>
                              <div className="space-y-2">
                  <p className="text-lg font-semibold text-gray-600 dark:text-gray-300">
                    لا توجد بيانات مبيعات
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100/50 dark:bg-gray-800/50 px-3 py-1 rounded-lg">
                    للفترة المحددة حالياً
                  </p>
                </div>
            </div>
          </motion.div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
    >
      <Card className="overflow-hidden hover:shadow-2xl transition-all duration-500 border-0 bg-gradient-to-br from-emerald-50/80 to-green-50/80 dark:from-emerald-950/40 dark:to-green-950/40 backdrop-blur-sm shadow-xl dark:shadow-emerald-900/20">
        <CardHeader className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 dark:from-emerald-500/10 dark:to-green-500/10 border-b border-emerald-200/50 dark:border-emerald-700/50">
          <CardTitle className="flex items-center gap-3 text-gray-800 dark:text-gray-100">
            <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                {title}
              </span>
              {subtitle && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-normal">
                  {subtitle}
                </p>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 pb-4">
          <div className="h-[400px]">
            <Doughnut ref={chartRef} data={chartData} options={getPieChartOptions(isDarkMode)} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
