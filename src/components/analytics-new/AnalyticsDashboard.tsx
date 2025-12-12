/**
 * ============================================
 * STOCKIHA ANALYTICS DASHBOARD
 * لوحة التحكم الرئيسية للتقارير والتحليلات
 * ============================================
 * تصميم بسيط ومتناسق - v3.1
 * ============================================
 */

import React, { useState, useMemo, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  ShoppingCart,
  TrendingUp,
  Package,
  Wallet,
  Users,
  Calculator,
  RefreshCw,
  Calendar,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, subDays, subMonths, startOfDay, endOfDay, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

// Data Hooks
import {
  useSalesAnalytics,
  useProfitAnalytics,
  useInventoryAnalytics,
  useExpenseAnalytics,
  useCustomerAnalytics,
  useZakatAnalytics,
} from './hooks';

// Sections
import {
  OverviewSection,
  SalesSection,
  ProfitSection,
  InventorySection,
  ExpenseSection,
  CustomerSection,
  ZakatSection,
} from './sections';

// Types
import type { FilterState, DateRange } from './types';

// ==================== Types ====================

type SectionId =
  | 'overview'
  | 'sales'
  | 'profit'
  | 'inventory'
  | 'expenses'
  | 'customers'
  | 'zakat';

interface Tab {
  id: SectionId;
  label: string;
  icon: React.ReactNode;
}

type DatePresetKey = 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'this_month' | 'last_month' | 'custom';

interface DatePreset {
  key: DatePresetKey;
  label: string;
  getRange: () => DateRange;
}

// ==================== Tabs ====================

const tabs: Tab[] = [
  { id: 'overview', label: 'نظرة عامة', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'sales', label: 'المبيعات', icon: <ShoppingCart className="h-4 w-4" /> },
  { id: 'profit', label: 'الأرباح', icon: <TrendingUp className="h-4 w-4" /> },
  { id: 'inventory', label: 'المخزون', icon: <Package className="h-4 w-4" /> },
  { id: 'expenses', label: 'المصاريف', icon: <Wallet className="h-4 w-4" /> },
  { id: 'customers', label: 'العملاء', icon: <Users className="h-4 w-4" /> },
  { id: 'zakat', label: 'الزكاة', icon: <Calculator className="h-4 w-4" /> },
];

// ==================== Date Presets ====================

const datePresets: DatePreset[] = [
  {
    key: 'today',
    label: 'اليوم',
    getRange: () => {
      const now = new Date();
      return { start: startOfDay(now), end: endOfDay(now) };
    },
  },
  {
    key: 'yesterday',
    label: 'أمس',
    getRange: () => {
      const yesterday = subDays(new Date(), 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    },
  },
  {
    key: 'last_7_days',
    label: '7 أيام',
    getRange: () => {
      const now = new Date();
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    },
  },
  {
    key: 'last_30_days',
    label: '30 يوم',
    getRange: () => {
      const now = new Date();
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    },
  },
  {
    key: 'this_month',
    label: 'هذا الشهر',
    getRange: () => {
      const now = new Date();
      return { start: startOfMonth(now), end: endOfDay(now) };
    },
  },
  {
    key: 'last_month',
    label: 'الشهر الماضي',
    getRange: () => {
      const lastMonth = subMonths(new Date(), 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    },
  },
];

// ==================== Loading Skeleton ====================

const SectionSkeleton: React.FC = () => (
  <div className="space-y-6 animate-pulse">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-28 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700" />
      ))}
    </div>
    <div className="h-80 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-100 dark:border-zinc-700" />
  </div>
);

// ==================== Main Component ====================

const AnalyticsDashboard: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState<SectionId>('overview');
  const [selectedPreset, setSelectedPreset] = useState<DatePresetKey>('last_30_days');
  const [customStartDate, setCustomStartDate] = useState<Date>(subDays(new Date(), 29));
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCustomDate, setShowCustomDate] = useState(false);

  // Calculate date range from preset or custom
  const dateRange = useMemo(() => {
    if (selectedPreset === 'custom' || showCustomDate) {
      return { start: startOfDay(customStartDate), end: endOfDay(customEndDate) };
    }
    const preset = datePresets.find(p => p.key === selectedPreset);
    return preset ? preset.getRange() : datePresets[3].getRange();
  }, [selectedPreset, customStartDate, customEndDate, showCustomDate]);

  // Build filters
  const filters: FilterState = useMemo(() => ({
    dateRange,
    datePreset: selectedPreset as any,
    comparisonMode: 'none',
    categories: [],
    products: [],
    customers: [],
    suppliers: [],
    staff: [],
    paymentMethods: [],
    saleTypes: [],
    orderStatuses: [],
    productTypes: [],
  }), [dateRange, selectedPreset]);

  // Data Hooks
  const { data: salesData, isLoading: salesLoading } = useSalesAnalytics(filters);
  const { data: profitData, isLoading: profitLoading } = useProfitAnalytics(filters);
  const { inventoryData, capitalData, isLoading: inventoryLoading } = useInventoryAnalytics(filters);
  const { data: expenseData, isLoading: expenseLoading } = useExpenseAnalytics(filters);
  const { customerData, debtData, isLoading: customerLoading } = useCustomerAnalytics(filters);
  const { data: zakatData, isLoading: zakatLoading } = useZakatAnalytics();

  // Loading state
  const isLoading = salesLoading || profitLoading || inventoryLoading || expenseLoading || customerLoading || zakatLoading;

  // Handle refresh
  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    const currentPreset = selectedPreset;
    setSelectedPreset('today');
    setTimeout(() => {
      setSelectedPreset(currentPreset);
      setIsRefreshing(false);
    }, 100);
  }, [selectedPreset]);

  // Handle preset change
  const handlePresetChange = (preset: DatePresetKey) => {
    setSelectedPreset(preset);
    if (preset !== 'custom') {
      setShowCustomDate(false);
      const presetData = datePresets.find(p => p.key === preset);
      if (presetData) {
        const range = presetData.getRange();
        setCustomStartDate(range.start);
        setCustomEndDate(range.end);
      }
    } else {
      setShowCustomDate(true);
    }
  };

  // Render section content
  const renderSection = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <OverviewSection
            filters={filters}
            salesData={salesData}
            profitData={profitData}
            inventoryData={inventoryData}
            expenseData={expenseData}
            customerData={customerData}
            isLoading={isLoading}
          />
        );
      case 'sales':
        return <SalesSection filters={filters} data={salesData} isLoading={salesLoading} />;
      case 'profit':
        return <ProfitSection filters={filters} data={profitData} isLoading={profitLoading} />;
      case 'inventory':
        return <InventorySection filters={filters} inventoryData={inventoryData} capitalData={capitalData} isLoading={inventoryLoading} />;
      case 'expenses':
        return <ExpenseSection filters={filters} data={expenseData} isLoading={expenseLoading} />;
      case 'customers':
        return <CustomerSection filters={filters} customerData={customerData} debtData={debtData} isLoading={customerLoading} />;
      case 'zakat':
        return <ZakatSection data={zakatData} isLoading={zakatLoading} dateRange={dateRange} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-full bg-zinc-50 dark:bg-zinc-950">
      {/* ===== Clean Header ===== */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800">
        {/* Top Section: Title + Date + Actions */}
        <div className="px-4 sm:px-6 py-5">
          <div className="flex items-center justify-between">
            {/* Title & Date Range */}
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white">التحليلات</h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                {format(dateRange.start, 'd MMMM', { locale: ar })} - {format(dateRange.end, 'd MMMM yyyy', { locale: ar })}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={cn(
                  'p-2.5 rounded-xl transition-all',
                  'bg-zinc-100 dark:bg-zinc-800',
                  'hover:bg-zinc-200 dark:hover:bg-zinc-700',
                  'text-zinc-600 dark:text-zinc-400',
                  'disabled:opacity-50'
                )}
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
              </button>

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-500/10 rounded-xl">
                  <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
                  <span className="text-xs font-medium text-orange-600 dark:text-orange-400 hidden sm:inline">
                    جاري التحميل
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Date Presets */}
        <div className="px-4 sm:px-6 pb-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Preset Buttons */}
            <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl">
              {datePresets.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => handlePresetChange(preset.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    selectedPreset === preset.key && !showCustomDate
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  {preset.label}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowCustomDate(true);
                  setSelectedPreset('custom');
                }}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5',
                  showCustomDate
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                )}
              >
                <Calendar className="h-3 w-3" />
                مخصص
              </button>
            </div>

            {/* Custom Date Pickers */}
            <AnimatePresence>
              {showCustomDate && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">من</span>
                    <input
                      type="date"
                      value={format(customStartDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          setCustomStartDate(startOfDay(newDate));
                          if (newDate > customEndDate) setCustomEndDate(newDate);
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                  <span className="text-zinc-400">←</span>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-500">إلى</span>
                    <input
                      type="date"
                      value={format(customEndDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const newDate = new Date(e.target.value);
                        if (!isNaN(newDate.getTime())) {
                          setCustomEndDate(endOfDay(newDate));
                          if (newDate < customStartDate) setCustomStartDate(newDate);
                        }
                      }}
                      className="px-2 py-1.5 rounded-lg text-xs bg-zinc-100 dark:bg-zinc-800 border-0 text-zinc-900 dark:text-white focus:ring-2 focus:ring-orange-500/30"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 sm:px-6">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide border-t border-zinc-100 dark:border-zinc-800 -mx-4 sm:-mx-6 px-4 sm:px-6 pt-3 pb-3">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                    isActive
                      ? 'bg-orange-500 text-white'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-white'
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* ===== Content ===== */}
      <main className="p-4 sm:p-6">
        <Suspense fallback={<SectionSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeTab}-${selectedPreset}-${showCustomDate ? `${customStartDate}-${customEndDate}` : ''}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {renderSection()}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  );
};

export default AnalyticsDashboard;
