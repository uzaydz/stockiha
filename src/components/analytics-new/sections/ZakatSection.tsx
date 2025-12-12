/**
 * ============================================
 * STOCKIHA ANALYTICS - ZAKAT SECTION
 * قسم حساب الزكاة - Midnight Obsidian Redesign
 * ============================================
 */

import React, { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Calculator,
  Wallet,
  Package,
  CreditCard,
  Scale,
  Coins,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import type { ZakatData } from '../types';
import { formatCurrency, formatDate } from '../utils/formatters';

// ==================== Types & Props ====================

interface ZakatSectionProps {
  data: ZakatData | null;
  isLoading?: boolean;
  dateRange?: { start: Date; end: Date };
}

// ==================== Helper Components ====================

const ZakatKPICard: React.FC<{
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color?: 'emerald' | 'amber' | 'blue' | 'purple' | 'zinc';
  isLoading?: boolean;
}> = ({ title, value, subValue, icon, color = 'emerald', isLoading }) => {
  const colorStyles = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    amber: 'bg-amber-500/10 text-amber-500',
    blue: 'bg-blue-500/10 text-blue-500',
    purple: 'bg-purple-500/10 text-purple-500',
    zinc: 'bg-zinc-500/10 text-zinc-500',
  };

  const borderStyles = {
    emerald: 'group-hover:border-emerald-500/30',
    amber: 'group-hover:border-amber-500/30',
    blue: 'group-hover:border-blue-500/30',
    purple: 'group-hover:border-purple-500/30',
    zinc: 'group-hover:border-zinc-500/30',
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 animate-pulse h-32" />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-100 dark:border-zinc-800 transition-all duration-300 group hover:shadow-lg hover:shadow-zinc-500/5",
        borderStyles[color]
      )}
    >
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl transition-colors", colorStyles[color])}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-1 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight">{value}</h3>
        {subValue && (
          <p className="text-xs text-zinc-400 mt-1">{subValue}</p>
        )}
      </div>
    </motion.div>
  );
};

const AssetBreakdownCard: React.FC<{
  title: string;
  value: number;
  zakatAmount: number;
  percentage: number;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'orange';
}> = ({ title, value, zakatAmount, percentage, icon, color }) => {
  const bgColors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    orange: 'bg-orange-500',
  };

  const iconColors = {
    blue: 'text-blue-500 bg-blue-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
  };

  return (
    <div className="flex items-center p-4 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-700/50">
      <div className={cn("p-3 rounded-xl mr-4", iconColors[color])}>
        {icon}
      </div>
      <div className="flex-1">
        <div className="flex justify-between mb-1">
          <span className="font-medium text-zinc-900 dark:text-white">{title}</span>
          <span className="text-sm font-bold text-zinc-900 dark:text-white">{formatCurrency(value)}</span>
        </div>
        <div className="flex justify-between text-xs text-zinc-500 mb-2">
          <span>{percentage.toFixed(1)}% من الأصول</span>
          <span>الزكاة: {formatCurrency(zakatAmount)}</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all duration-500", bgColors[color])}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// ==================== Main Component ====================

const ZakatSection: React.FC<ZakatSectionProps> = ({
  data,
  isLoading = false,
  dateRange,
}) => {
  // Memoized Chart Data
  const chartData = useMemo(() => {
    if (!data) return [];
    // حساب الزكاة لكل نوع من الأصول (2.5%)
    const zakatOnInventory = (data.inventoryValue || 0) * (data.zakatRate || 0.025);
    const zakatOnCash = ((data.cashBalance || 0) + (data.bankBalance || 0)) * (data.zakatRate || 0.025);
    const zakatOnReceivables = (data.receivables || 0) * (data.zakatRate || 0.025);
    
    return [
      { name: 'المخزون', value: zakatOnInventory, color: '#3b82f6' },
      { name: 'النقد', value: zakatOnCash, color: '#8b5cf6' },
      { name: 'الديون المرجوة', value: zakatOnReceivables, color: '#f97316' },
    ].filter(item => item.value > 0);
  }, [data]);

  const totalAssets = data?.netZakatableAssets || 1; // Avoid division by zero

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-48 bg-zinc-100 dark:bg-zinc-800 rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-zinc-100 dark:bg-zinc-800 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      <div className="bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
        <span className="font-semibold">ملاحظة:</span>
        <span className="mr-2">حساب الزكاة هنا يعتمد على الأرصدة الحالية (المخزون/النقد/الديون) وليس على حركة الفترة المختارة</span>
        {dateRange && (
          <span className="text-zinc-500 dark:text-zinc-400">({formatDate(dateRange.start.toISOString(), 'short')} - {formatDate(dateRange.end.toISOString(), 'short')})</span>
        )}
      </div>

      {/* 1. Main Zakat Status Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          "relative overflow-hidden rounded-3xl p-8 border",
          data?.isNisabReached
            ? "bg-gradient-to-br from-emerald-900 to-emerald-950 border-emerald-800"
            : "bg-gradient-to-br from-zinc-800 to-zinc-900 border-zinc-700"
        )}
      >
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="text-center md:text-right">
            <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
              <div className={cn(
                "p-2 rounded-full",
                data?.isNisabReached ? "bg-emerald-500 text-white" : "bg-zinc-600 text-zinc-300"
              )}>
                {data?.isNisabReached ? <ShieldCheck className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
              </div>
              <h2 className="text-2xl font-bold text-white">
                {data?.isNisabReached ? 'النصاب مكتمل - الزكاة واجبة' : 'لم يبلغ النصاب - الزكاة غير واجبة'}
              </h2>
            </div>
            <p className="text-emerald-100/80 max-w-lg leading-relaxed">
              {data?.isNisabReached
                ? 'بارك الله لك في مالك. لقد تجاوزت أصولك الزكوية حد النصاب الشرعي، لذا يجب إخراج قيمة الزكاة الموضحة.'
                : 'أصولك الزكوية لم تبلغ النصاب الشرعي (قيمة 85 جرام ذهب) في الوقت الحالي.'}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 min-w-[300px] border border-white/10 text-center">
            <p className="text-emerald-100 text-sm font-medium mb-1">إجمالي الزكاة المستحقة</p>
            <div className="text-4xl font-bold text-white mb-2 tracking-tight">
              {formatCurrency(data?.zakatAmount || 0)}
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-medium text-white/90">
              <Scale className="w-3 h-3" />
              <span>نسبة 2.5% من إجمالي الأصول</span>
            </div>
          </div>
        </div>

        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-full h-full opacity-10 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 L100 0 L100 100 Z" fill="currentColor" className="text-white" />
          </svg>
        </div>
      </motion.div>

      {/* 2. Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ZakatKPICard
          title="إجمالي الأصول الزكوية"
          value={formatCurrency(data?.netZakatableAssets || 0)}
          subValue="مجموع المال الخاضع للزكاة"
          icon={<Wallet className="w-6 h-6" />}
          color="blue"
        />
        <ZakatKPICard
          title="حد النصاب الشرعي"
          value={formatCurrency(data?.nisab || 0)}
          subValue={`يعادل ${85} جرام ذهب عيار 24`}
          icon={<Scale className="w-6 h-6" />}
          color="amber"
        />
        <ZakatKPICard
          title="سعر جرام الذهب"
          value={formatCurrency(data?.goldPricePerGram || 0)}
          subValue={`اخر تحديث: ${formatDate(data?.calculationDate || new Date().toISOString())}`}
          icon={<Coins className="w-6 h-6" />}
          color="purple"
        />
      </div>

      {/* 3. Detailed Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Assets Distribution List */}
        <div className="lg:col-span-2 space-y-4 bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Calculator className="w-5 h-5 text-zinc-500" />
              تفاصيل الأصول
            </h3>
            <span className="text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full">
              السنة الهجرية {data?.hijriYear || '1446'}
            </span>
          </div>

          <div className="space-y-4">
            <AssetBreakdownCard
              title="المخزون والسلع"
              value={data?.inventoryValue || 0}
              zakatAmount={(data?.inventoryValue || 0) * (data?.zakatRate || 0.025)}
              percentage={((data?.inventoryValue || 0) / totalAssets) * 100}
              icon={<Package className="w-5 h-5" />}
              color="blue"
            />
            <AssetBreakdownCard
              title="السيولة النقدية"
              value={(data?.cashBalance || 0) + (data?.bankBalance || 0)}
              zakatAmount={((data?.cashBalance || 0) + (data?.bankBalance || 0)) * (data?.zakatRate || 0.025)}
              percentage={(((data?.cashBalance || 0) + (data?.bankBalance || 0)) / totalAssets) * 100}
              icon={<Wallet className="w-5 h-5" />}
              color="purple"
            />
            <AssetBreakdownCard
              title="الديون المستحقة (للمحل)"
              value={data?.receivables || 0}
              zakatAmount={(data?.receivables || 0) * (data?.zakatRate || 0.025)}
              percentage={((data?.receivables || 0) / totalAssets) * 100}
              icon={<CreditCard className="w-5 h-5" />}
              color="orange"
            />
          </div>
        </div>

        {/* Visual Distribution Chart */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-100 dark:border-zinc-800 flex flex-col items-center justify-center">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2 self-start">مصادر الزكاة</h3>
          <div className="h-[250px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  cornerRadius={6}
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderRadius: '8px',
                    border: '1px solid #27272a',
                    color: '#fff'
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  formatter={(value) => <span className="text-xs text-zinc-500 dark:text-zinc-400 mr-2">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
              <span className="text-3xl font-bold text-zinc-900 dark:text-white">
                {data?.isNisabReached ? `${(data?.zakatRate || 0.025) * 100}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default memo(ZakatSection);
