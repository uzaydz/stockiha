/**
 * ============================================
 * STOCKIHA ANALYTICS - EXPENSES CHART
 * مخطط المصاريف - Chart.js مع تصميم احترافي
 * ============================================
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from 'next-themes';
import { Wallet, CreditCard } from 'lucide-react';
import type { ExpensesByCategory, PaymentMethodStats } from './types';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

interface ExpensesChartProps {
  expensesByCategory: ExpensesByCategory[];
  paymentMethods: PaymentMethodStats[];
  isLoading: boolean;
}

const COLORS = ['#f97316', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

const formatCurrency = (value: number): string => {
  return `${value.toLocaleString('ar-DZ')} د.ج`;
};

const ExpensesChart: React.FC<ExpensesChartProps> = ({
  expensesByCategory,
  paymentMethods,
  isLoading,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[200px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalExpenses = expensesByCategory.reduce((sum, e) => sum + e.amount, 0);
  const totalPayments = paymentMethods.reduce((sum, p) => sum + p.amount, 0);

  const expensesData = useMemo(() =>
    expensesByCategory.map((e, index) => ({
      name: e.categoryName,
      value: e.amount,
      fill: COLORS[index % COLORS.length],
    })),
    [expensesByCategory]
  );

  const chartData: ChartData<'doughnut'> = useMemo(() => ({
    labels: expensesData.map(d => d.name),
    datasets: [
      {
        data: expensesData.map(d => d.value),
        backgroundColor: expensesData.map(d => d.fill),
        borderColor: isDark ? '#18181b' : '#ffffff',
        borderWidth: 2,
        hoverOffset: 8,
        spacing: 2,
      },
    ],
  }), [expensesData, isDark]);

  const options: ChartOptions<'doughnut'> = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        display: false,
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
          label: (context) => {
            const value = context.raw as number;
            const percentage = ((value / totalExpenses) * 100).toFixed(1);
            return `${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  }), [isDark, totalExpenses]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-4"
    >
      {/* مخطط المصاريف */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Wallet className="h-5 w-5 text-rose-600" />
            توزيع المصاريف
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            الإجمالي: {formatCurrency(totalExpenses)}
          </div>
        </CardHeader>
        <CardContent>
          {expensesData.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Wallet className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد مصاريف مسجلة</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center h-[200px]">
              <div className="w-1/2 h-full">
                <Doughnut data={chartData} options={options} />
              </div>
              <div className="w-1/2 pr-2 max-h-full overflow-y-auto">
                {expensesData.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-1.5 px-1 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate max-w-[80px]">
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-white">
                      {((item.value / totalExpenses) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* مخطط طرق الدفع */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <CreditCard className="h-5 w-5 text-orange-600" />
            طرق الدفع
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            الإجمالي: {formatCurrency(totalPayments)}
          </div>
        </CardHeader>
        <CardContent>
          {paymentMethods.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد بيانات دفع</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentMethods.map((method, index) => {
                const percentage = totalPayments > 0 ? (method.amount / totalPayments) * 100 : 0;
                const color = COLORS[index % COLORS.length];
                return (
                  <div key={method.method} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="font-medium">{method.method}</span>
                        <span className="text-muted-foreground">({method.count} عملية)</span>
                      </div>
                      <span className="font-medium">{formatCurrency(method.amount)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default ExpensesChart;
