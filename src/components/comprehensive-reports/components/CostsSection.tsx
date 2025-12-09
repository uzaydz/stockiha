/**
 * مكون قسم التكاليف والمصاريف - تصميم جديد
 */

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Receipt,
  Package,
  TrendingDown,
  Wallet,
  ArrowDownRight
} from 'lucide-react';
import type { CostsData, COGSData, ExpensesByCategory } from '../types';
import { formatCurrency, calculatePercentage } from '../utils';
import { CHART_COLORS } from '../constants';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// تسجيل مكونات Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CostsSectionProps {
  costs: CostsData | null;
  isLoading?: boolean;
}

// Visual components
const CostIcon: React.FC<{ icon: React.ElementType; color: string; bg: string }> = ({ icon: Icon, color, bg }) => (
  <div className={cn("p-2 rounded-lg", bg)}>
    <Icon className={cn("h-4 w-4", color)} />
  </div>
);

// مكون عرض COGS
const COGSCard: React.FC<{
  cogs: COGSData | null;
  isLoading?: boolean;
}> = ({ cogs, isLoading }) => {
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

  const cogsItems = [
    {
      label: 'تكلفة منتجات نقاط البيع',
      value: cogs?.posItemsCost || 0,
      color: CHART_COLORS.primary,
      icon: Package,
    },
    {
      label: 'تكلفة منتجات الأونلاين',
      value: cogs?.onlineItemsCost || 0,
      color: CHART_COLORS.secondary,
      icon: Globe,
    },
    {
      label: 'تكلفة خدمات الاشتراكات',
      value: cogs?.subscriptionCost || 0,
      color: CHART_COLORS.tertiary,
      icon: Receipt,
    },
  ];

  const totalCOGS = cogs?.totalCOGS || 0;

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CostIcon icon={Package} color="text-rose-600" bg="bg-rose-50 dark:bg-rose-900/20" />
            تكلفة البضاعة المباعة (COGS)
          </CardTitle>
          <Badge variant="outline" className="font-mono text-zinc-500">
            {cogsItems.length} بنود
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Total Banner */}
        <div className="mb-6 p-5 rounded-xl bg-gradient-to-r from-rose-50 to-white dark:from-rose-900/10 dark:to-zinc-900 border border-rose-100 dark:border-rose-900/20">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-rose-700 dark:text-rose-400">القيمة الإجمالية</span>
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {formatCurrency(totalCOGS)}
            </span>
          </div>
        </div>

        {/* Breakdown List */}
        <div className="space-y-5">
          {cogsItems.map((item, index) => {
            const percentage = calculatePercentage(item.value, totalCOGS);
            return (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {item.label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {formatCurrency(item.value)}
                    </span>
                    <span className="text-xs text-zinc-400 w-10 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={percentage}
                  className="h-2 bg-zinc-100 dark:bg-zinc-800"
                  indicatorClassName={cn(index === 0 ? "bg-rose-500" : index === 1 ? "bg-orange-500" : "bg-amber-500")}
                />
              </motion.div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// مكون عرض المصاريف حسب الفئة
const ExpensesByCategoryCard: React.FC<{
  expenses: ExpensesByCategory[];
  totalExpenses: number;
  isLoading?: boolean;
}> = ({ expenses, totalExpenses, isLoading }) => {
  const chartData = useMemo(() => {
    const sortedExpenses = [...(expenses || [])]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    return {
      labels: sortedExpenses.map(exp => exp.categoryName),
      datasets: [
        {
          label: 'المصاريف',
          data: sortedExpenses.map(exp => exp.amount),
          backgroundColor: sortedExpenses.map((_, i) => [
            '#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'
          ][i % 5]),
          borderRadius: 4,
          barThickness: 32,
        },
      ],
    };
  }, [expenses]);

  if (isLoading) {
    return <div className="h-64 bg-zinc-100 animate-pulse rounded-2xl" />;
  }

  return (
    <Card className="h-full border-zinc-200/60 dark:border-zinc-800/60 shadow-sm hover:shadow-md transition-all">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <CostIcon icon={Wallet} color="text-amber-600" bg="bg-amber-50 dark:bg-amber-900/20" />
            المصاريف التشغيلية
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-zinc-500">الإجمالي</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-500">{formatCurrency(totalExpenses)}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {expenses.length > 0 ? (
          <div className="h-[220px]">
            <Bar
              data={chartData}
              options={{
                indexAxis: 'y' as const,
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { display: false },
                  y: {
                    grid: { display: false },
                    ticks: { font: { family: 'Tajawal' }, color: '#71717a' }
                  }
                }
              }}
            />
          </div>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800">
            لا توجد مصاريف مسجلة
          </div>
        )}
      </CardContent>
    </Card>
  );
};
import { Globe } from 'lucide-react';

const CostsSection: React.FC<CostsSectionProps> = ({ costs, isLoading }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <COGSCard cogs={costs?.cogs || null} isLoading={isLoading} />
        <ExpensesByCategoryCard
          expenses={costs?.expensesByCategory || []}
          totalExpenses={costs?.operatingExpenses || 0}
          isLoading={isLoading}
        />
      </div>
      {/* We can add a detailed breakdown table here later if needed */}
    </div>
  );
};

export { CostsSection };
