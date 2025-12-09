
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  Store,
  Globe,
  Wrench,
  CreditCard,
  MoreHorizontal,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Activity,
  Zap
} from 'lucide-react';
import type { RevenueData, RevenueBreakdown, DailySalesData, MonthlySalesData } from '../types';
import { formatCurrency, formatCompactNumber } from '../utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface RevenueSectionProps {
  revenue: RevenueData | null;
  breakdown: RevenueBreakdown[];
  dailySales: DailySalesData[];
  monthlySales: MonthlySalesData[];
  isLoading?: boolean;
  detailed?: boolean;
}

// ألوان متوهجة جديدة (Neon / Obsidian Theme)
const COLORS = [
  '#FC5D41', // Primary (Deep Orange)
  '#8B5CF6', // Purple
  '#34D399', // Emerald
  '#FBBF24', // Amber
  '#EC4899', // Pink
  '#6366F1', // Indigo
];

const METRIC_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: "easeOut"
    }
  })
};

// Tooltip مخصص متطور
const CustomTooltip = ({ active, payload, label, currency = true }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="glass-panel p-4 rounded-2xl shadow-2xl border border-white/10 bg-black/80 backdrop-blur-xl text-sm min-w-[200px] z-50 animate-in fade-in zoom-in-95 duration-200">
        <p className="font-bold text-white/90 mb-3 pb-2 border-b border-white/10 flex items-center justify-between">
          <span>{label}</span>
          <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-white/60">تقرير</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4 group">
              <span className="text-zinc-400 flex items-center gap-2 text-xs font-medium group-hover:text-white transition-colors">
                <div
                  className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.5)]"
                  style={{ backgroundColor: entry.color || entry.fill, boxShadow: `0 0 10px ${entry.color || entry.fill}` }}
                />
                {entry.name}
              </span>
              <span className="font-bold font-numeric text-white tracking-wide">
                {currency ? formatCurrency(entry.value) : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

// مكون توزيع الإيرادات - تصميم حلقي عصري
const RevenueDistribution: React.FC<{
  breakdown: RevenueBreakdown[];
  totalRevenue: number;
  isLoading?: boolean;
  compact?: boolean;
}> = ({ breakdown, totalRevenue, isLoading, compact }) => {
  const sourceIcons: Record<string, React.ElementType> = {
    pos: Store,
    online: Globe,
    repair: Wrench,
    subscription: CreditCard,
  };

  const data = useMemo(() => {
    return (breakdown || []).map((item, index) => ({
      name: item.sourceName,
      value: item.amount,
      orders: item.ordersCount,
      percentage: item.percentage,
      source: item.source
    }));
  }, [breakdown]);

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full rounded-3xl" />;
  }

  return (
    <Card className="h-full border-none shadow-none bg-transparent">
      <CardHeader className="pb-2 px-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <PieChart /> {/* Icon placeholder for PieChart from lucide is not imported but PieChart from rechart is. wait. lucide has PieChart too but name conflict. using Activity for now or just generic icon */}
              <Zap className="h-4 w-4" />
            </div>
            توزيع المصادر
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        <div className={cn("flex flex-col gap-6", compact ? "" : "lg:flex-row lg:items-center")}>
          {/* Chart */}
          <div className={cn("relative flex items-center justify-center", compact ? "h-[200px]" : "h-[260px] lg:flex-1")}>
            <div className="absolute inset-4 bg-gradient-radial from-purple-500/10 to-transparent rounded-full opacity-50 blur-xl" />
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={compact ? 55 : 70}
                  outerRadius={compact ? 75 : 95}
                  paddingAngle={6}
                  dataKey="value"
                  cornerRadius={8}
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      className="transition-all duration-300 hover:opacity-100 hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
                      style={{ filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.2))' }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <div className="bg-white/5 backdrop-blur-sm p-3 rounded-full border border-white/10 flex flex-col items-center justify-center h-28 w-28 shadow-2xl">
                <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider mb-1">الإجمالي</span>
                <span className="text-sm font-bold font-numeric text-white">{formatCompactNumber(totalRevenue)}</span>
              </div>
            </div>
          </div>

          {/* List */}
          <div className={cn("space-y-3", compact ? "" : "lg:flex-1")}>
            {data.map((item, index) => {
              const Icon = sourceIcons[item.source] || Store;
              const color = COLORS[index % COLORS.length];

              return (
                <motion.div
                  key={item.source}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="group flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-xl opacity-20 blur-sm transition-opacity group-hover:opacity-40" style={{ backgroundColor: color }} />
                      <div className="relative p-2 rounded-xl bg-black/40 border border-white/5">
                        <Icon className="h-4 w-4" style={{ color: color }} />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">
                        {item.name}
                      </p>
                      <p className="text-[10px] text-zinc-500 font-numeric">
                        {item.orders} process
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-white font-numeric tabular-nums tracking-wide">
                      {formatCurrency(item.value)}
                    </p>
                    <div className="flex items-center justify-end gap-2 mt-1.5">
                      <div className="h-1.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.percentage}%` }}
                          transition={{ duration: 1, delay: 0.5 + (index * 0.1) }}
                          className="h-full rounded-full shadow-[0_0_10px_currentColor]"
                          style={{ backgroundColor: color, color: color }}
                        />
                      </div>
                      <p className="text-[10px] font-bold text-zinc-500 font-numeric w-8 text-right">
                        {item.percentage.toFixed(0)}%
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// مكون مخطط المبيعات الرئيسي
const SalesChart: React.FC<{
  dailySales: DailySalesData[];
  monthlySales: MonthlySalesData[];
  isLoading?: boolean;
  compact?: boolean;
}> = ({ dailySales, monthlySales, isLoading, compact }) => {
  const [view, setView] = useState<'daily' | 'monthly'>('daily');

  const formattedDailyData = useMemo(() => {
    const daysToShow = compact ? 14 : 30;
    return (dailySales || []).slice(-daysToShow).map(day => ({
      ...day,
      dateFormatted: new Date(day.date).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' }),
      total: day.posSales + day.onlineSales
    }));
  }, [dailySales, compact]);

  const formattedMonthlyData = useMemo(() => {
    return (monthlySales || []).map(month => ({
      ...month,
      monthFormatted: new Date(month.month + '-01').toLocaleDateString('ar-DZ', { month: 'short', year: '2-digit' })
    }));
  }, [monthlySales]);

  if (isLoading) {
    return <Skeleton className="h-[400px] w-full rounded-2xl" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 px-2">
        <div>
          <h3 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            تحليل الأداء المالي
          </h3>
          <p className="text-zinc-500 text-sm mt-1 font-medium">متابعة دقيقة لتدفقات الإيرادات</p>
        </div>

        <div className="bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50 backdrop-blur-md">
          <Tabs value={view} onValueChange={(v) => setView(v as 'daily' | 'monthly')}>
            <TabsList className="h-8 bg-transparent p-0 gap-1">
              <TabsTrigger
                value="daily"
                className="h-8 text-xs font-medium px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-none transition-all hover:bg-white/5"
              >
                يومي
              </TabsTrigger>
              <TabsTrigger
                value="monthly"
                className="h-8 text-xs font-medium px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg shadow-none transition-all hover:bg-white/5"
              >
                شهري
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className={cn("w-full transition-all duration-500 flex-1 min-h-0 bg-gradient-to-b from-transparent to-white/5 rounded-3xl border border-white/5 p-4", compact ? "h-[280px]" : "h-[400px]")}>
        <ResponsiveContainer width="100%" height="100%">
          {view === 'daily' ? (
            <AreaChart data={formattedDailyData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FC5D41" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#FC5D41" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOnline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="dateFormatted"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1, strokeDasharray: '4 4' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

              <Area
                type="monotone"
                dataKey="posSales"
                name="مبيعات المحل (POS)"
                stroke="#FC5D41"
                fill="url(#colorTotal)"
                strokeWidth={3}
                animationDuration={2000}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#fff', shadowBlur: 10 }}
              />
              <Area
                type="monotone"
                dataKey="onlineSales"
                name="التجارة الإلكترونية"
                stroke="#6366F1"
                fill="url(#colorOnline)"
                strokeWidth={3}
                animationDuration={2000}
                strokeDasharray="4 4"
              />
            </AreaChart>
          ) : (
            <ComposedChart data={formattedMonthlyData} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="monthFormatted"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11, fontWeight: 500 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#71717a', fontSize: 11, fontFamily: 'JetBrains Mono' }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.05)' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />

              <Bar
                dataKey="totalSales"
                name="إجمالي المبيعات"
                fill="#FC5D41"
                radius={[6, 6, 0, 0]}
                barSize={compact ? 24 : 36}
                animationDuration={1500}
              >
                {formattedMonthlyData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === formattedMonthlyData.length - 1 ? '#FC5D41' : '#FC5D41aa'} />
                ))}
              </Bar>
              {!compact && (
                <Line
                  type="monotone"
                  dataKey="profit"
                  name="صافي الأرباح"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#1C1C1E', stroke: '#10B981', strokeWidth: 2 }}
                  activeDot={{ r: 6, stroke: '#10B981', strokeWidth: 0, fill: '#fff' }}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// بطاقة إحصائيات سريعة متوهجة
const MetricCard = ({ title, value, change, icon: Icon, delay, color = "primary" }: any) => {
  const isPositive = change >= 0;

  const colorStyles = {
    primary: "from-orange-500/20 to-orange-600/5 border-orange-500/20 text-orange-500",
    success: "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20 text-emerald-500",
    info: "from-blue-500/20 to-blue-600/5 border-blue-500/20 text-blue-500",
  };

  const selectedColor = colorStyles[color as keyof typeof colorStyles] || colorStyles.primary;

  return (
    <motion.div
      variants={METRIC_VARIANTS}
      custom={delay}
      initial="hidden"
      animate="visible"
      className="relative group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <Card className="relative border border-white/10 bg-zinc-900/50 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-3 rounded-2xl bg-gradient-to-br ${selectedColor} border shadow-inner`}>
              <Icon className="h-6 w-6 text-current" />
            </div>
            {change !== undefined && (
              <Badge variant="outline" className={cn("font-numeric gap-1.5 px-2.5 py-1 backdrop-blur-md rounded-lg", isPositive ? "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" : "text-rose-400 border-rose-400/20 bg-rose-400/10")}>
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(change)}%
              </Badge>
            )}
          </div>

          <div className="space-y-1">
            <h3 className="text-3xl font-bold font-numeric text-white tracking-tight">{value}</h3>
            <p className="text-sm font-medium text-zinc-500">{title}</p>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </CardContent>
      </Card>
    </motion.div>
  );
};

// المكون الرئيسي
const RevenueSection: React.FC<RevenueSectionProps> = ({
  revenue,
  breakdown,
  dailySales,
  monthlySales,
  isLoading,
  detailed = false
}) => {
  useEffect(() => {
    console.log("RevenueSection Updated Render - Neon Theme");
  }, []);

  // حساب متوسط قيمة الطلب من البيانات المتاحة
  const calculateAverageOrderValue = useMemo(() => {
    if (!breakdown || breakdown.length === 0) return 0;
    
    const totalOrders = breakdown.reduce((sum, item) => sum + item.ordersCount, 0);
    const totalAmount = breakdown.reduce((sum, item) => sum + item.amount, 0);
    
    return totalOrders > 0 ? totalAmount / totalOrders : 0;
  }, [breakdown]);

  return (
    <div className={cn("grid gap-8 font-tajawal", detailed ? "grid-cols-1" : "grid-cols-1")}>

      {detailed && revenue && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-2">
          <MetricCard
            title="إجمالي الإيرادات"
            value={formatCurrency(revenue.totalRevenue)}
            change={12.5}
            icon={DollarSign}
            color="primary"
            delay={0}
          />
          <MetricCard
            title="متوسط قيمة الطلب"
            value={formatCurrency(calculateAverageOrderValue)}
            change={-2.4}
            icon={CreditCard}
            color="info"
            delay={1}
          />
        </div>
      )}

      {detailed ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card className="border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden p-6">
            <SalesChart
              dailySales={dailySales}
              monthlySales={monthlySales}
              isLoading={isLoading}
              compact={false}
            />
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="border border-white/10 bg-black/40 backdrop-blur-xl shadow-2xl rounded-3xl p-6">
              <RevenueDistribution
                breakdown={breakdown}
                totalRevenue={revenue?.totalRevenue || 0}
                isLoading={isLoading}
                compact={false}
              />
            </div>
            {/* Can add more components here */}
          </div>
        </div>
      ) : (
        /* Overview Mode - Clean & Minimal */
        <div className="h-full flex flex-col gap-6">
          <SalesChart
            dailySales={dailySales}
            monthlySales={monthlySales}
            isLoading={isLoading}
            compact={true}
          />
        </div>
      )}
    </div>
  );
};

export { RevenueSection };
