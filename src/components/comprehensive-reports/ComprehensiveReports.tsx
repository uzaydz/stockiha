/**
 * منصة التقارير المالية المتطورة - Apple Style / SaaS Design
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Download,
  RefreshCw,
  LayoutGrid,
  TrendingUp,
  PieChart,
  Wallet,
  Scale,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReportData } from './hooks/useReportData';
import { KPISection } from './components/KPISection';
import { RevenueSection } from './components/RevenueSection';
import { CostsSection } from './components/CostsSection';
import { ProfitSection } from './components/ProfitSection';
import { ZakatSection } from './components/ZakatSection';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { addDays } from 'date-fns';
import { DateRange } from 'react-day-picker';

type ReportView = 'dashboard' | 'revenue' | 'costs' | 'profit' | 'zakat';

// Apple-style Segmented Control
const SegmentedControl = ({
  value,
  onChange,
  options
}: {
  value: string;
  onChange: (val: ReportView) => void;
  options: { value: string; label: string; icon: React.ElementType }[]
}) => {
  return (
    <div className="flex p-1 bg-zinc-100 dark:bg-zinc-800/50 rounded-full w-fit">
      {options.map((opt) => {
        const isActive = value === opt.value;
        const Icon = opt.icon;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value as ReportView)}
            className={cn(
              "relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 ease-out z-10",
              isActive ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            )}
          >
            {isActive && (
              <motion.div
                layoutId="segmented-pill"
                className="absolute inset-0 bg-white dark:bg-zinc-700 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.05)] border border-black/5 dark:border-white/5 -z-10"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            <Icon className="w-4 h-4" />
            <span>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};

const ComprehensiveReports = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const {
    data,
    isLoading,
    error,
    refetch
  } = useReportData({ dateRange: dateRange! });

  const [activeView, setActiveView] = useState<ReportView>('dashboard');
  const [showDatePicker, setShowDatePicker] = useState(false);

  // تحديث البيانات
  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('تم تحديث البيانات بنجاح');
    } catch (err) {
      toast.error('حدث خطأ أثناء التحديث');
    }
  };

  // Views Configuration
  const views = [
    { value: 'dashboard', label: 'نظرة عامة', icon: LayoutGrid },
    { value: 'revenue', label: 'المبيعات', icon: TrendingUp },
    { value: 'costs', label: 'التكاليف', icon: Wallet },
    { value: 'profit', label: 'الأرباح', icon: PieChart },
    { value: 'zakat', label: 'الزكاة', icon: Scale },
  ];

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-[#F5F5F7] dark:bg-black rounded-3xl m-4">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-3xl flex items-center justify-center mb-6">
          <Scale className="w-10 h-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">تعذر تحميل البيانات المالية</h3>
        <p className="text-zinc-500 mb-6 max-w-md">نواجه مشكلة في الاتصال بقاعدة البيانات. يرجى التحقق من الاتصال والمحاولة مرة أخرى.</p>
        <Button onClick={handleRefresh} size="lg" className="rounded-full px-8">
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-zinc-900 dark:text-zinc-100 font-sans p-6 lg:p-10 space-y-8">

      {/* Smart Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sticky top-0 z-50 py-4 bg-[#F5F5F7]/80 dark:bg-black/80 backdrop-blur-xl -mx-6 px-6 lg:-mx-10 lg:px-10 border-b border-zinc-200/50 dark:border-zinc-800/50 transition-all">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium mb-1">
            <span>التقارير</span>
            <ChevronRight className="w-4 h-4" />
            <span className="text-zinc-900 dark:text-zinc-100">
              {views.find(v => v.value === activeView)?.label}
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">
            المركز المالي
          </h1>
          <p className="text-sm text-zinc-500 font-medium">
            آخر تحديث: {new Date().toLocaleTimeString('ar-DZ', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <SegmentedControl
            value={activeView}
            onChange={setActiveView}
            options={views}
          />

          <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800 mx-2 hidden lg:block" />

          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={cn("rounded-full w-10 h-10 border-zinc-200 dark:border-zinc-800", showDatePicker && "bg-zinc-100 dark:bg-zinc-800")}
          >
            <Calendar className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            className="rounded-full w-10 h-10 border-zinc-200 dark:border-zinc-800"
            disabled={isLoading}
          >
            <RefreshCw className={cn("w-4 h-4 text-zinc-600 dark:text-zinc-400", isLoading && "animate-spin")} />
          </Button>

          <Button className="rounded-full px-6 gap-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-lg shadow-zinc-500/10 transition-all active:scale-95">
            <Download className="w-4 h-4" />
            <span className="font-semibold">تصدير</span>
          </Button>
        </div>
      </header>

      {/* Date Filter Context */}
      <AnimatePresence>
        {showDatePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1C1C1E] p-4 rounded-3xl shadow-sm border border-zinc-100 dark:border-zinc-800 flex justify-center">
              <DatePickerWithRange
                date={dateRange!}
                onDateChange={(range: any) => setDateRange(range)}
                className="w-full justify-center"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeView}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="min-h-[500px]"
        >
          {activeView === 'dashboard' && (
            <div className="space-y-8">
              {/* KPIs Row */}
              <section>
                <KPISection data={data?.kpi || null} isLoading={isLoading} />
              </section>

              {/* Charts Grid */}
              <div className="grid grid-cols-12 gap-6">
                {/* Revenue (Main Chart) - Span 8 */}
                <div className="col-span-12 xl:col-span-8 space-y-6">
                  <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-1 shadow-sm overflow-hidden min-h-[400px]">
                    <RevenueSection
                      revenue={data?.revenue || null}
                      breakdown={data?.revenueBreakdown || []}
                      dailySales={data?.dailySales || []}
                      monthlySales={data?.monthlySales || []}
                      isLoading={isLoading}
                      detailed={false}
                    />
                  </div>
                </div>

                {/* Profit (Side) - Span 4 */}
                <div className="col-span-12 xl:col-span-4 space-y-6">
                  <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-1 shadow-sm overflow-hidden h-full">
                    <ProfitSection
                      profit={data?.profit || null}
                      breakdown={data?.profitBreakdown || []}
                      trend={data?.profitTrend || []}
                      isLoading={isLoading}
                      detailed={false}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm">
                  <CostsSection costs={data?.costs || null} isLoading={isLoading} />
                </div>
                <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200/50 dark:border-zinc-800 rounded-[32px] p-6 shadow-sm">
                  <ZakatSection zakat={data?.zakat || null} isLoading={isLoading} />
                </div>
              </div>
            </div>
          )}

          {activeView === 'revenue' && (
            <div className="p-1">
              <RevenueSection
                revenue={data?.revenue || null}
                breakdown={data?.revenueBreakdown || []}
                dailySales={data?.dailySales || []}
                monthlySales={data?.monthlySales || []}
                isLoading={isLoading}
                detailed={true}
              />
            </div>
          )}

          {activeView === 'costs' && (
            <div className="p-1">
              <CostsSection costs={data?.costs || null} isLoading={isLoading} />
            </div>
          )}

          {activeView === 'profit' && (
            <div className="p-1">
              <ProfitSection
                profit={data?.profit || null}
                breakdown={data?.profitBreakdown || []}
                trend={data?.profitTrend || []}
                isLoading={isLoading}
                detailed={true}
              />
            </div>
          )}

          {activeView === 'zakat' && (
            <div className="p-1">
              <ZakatSection zakat={data?.zakat || null} isLoading={isLoading} />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ComprehensiveReports;
