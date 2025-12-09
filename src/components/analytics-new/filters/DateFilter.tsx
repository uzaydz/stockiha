/**
 * ============================================
 * STOCKIHA ANALYTICS - DATE FILTER
 * فلتر التاريخ المتقدم
 * ============================================
 */

import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CalendarRange,
  ArrowLeftRight,
} from 'lucide-react';
import { format, subDays, subMonths, subQuarters, subYears, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, startOfYear, endOfYear, isToday, isSameDay } from 'date-fns';
import { ar } from 'date-fns/locale';
import { DayPicker, DateRange as DayPickerRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import type { DateRange, DatePreset, ComparisonMode } from '../types';

// ==================== Types ====================

export interface DateFilterProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  preset?: DatePreset;
  onPresetChange?: (preset: DatePreset) => void;
  comparisonMode?: ComparisonMode;
  onComparisonModeChange?: (mode: ComparisonMode) => void;
  comparisonDateRange?: DateRange;
  showComparison?: boolean;
  showPresets?: boolean;
  className?: string;
}

// ==================== Presets Configuration ====================

const presets: { key: DatePreset; label: string; icon?: React.ReactNode }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'yesterday', label: 'أمس' },
  { key: 'last_7_days', label: 'آخر 7 أيام' },
  { key: 'last_30_days', label: 'آخر 30 يوم' },
  { key: 'this_month', label: 'هذا الشهر' },
  { key: 'last_month', label: 'الشهر الماضي' },
  { key: 'this_quarter', label: 'هذا الربع' },
  { key: 'last_quarter', label: 'الربع الماضي' },
  { key: 'this_year', label: 'هذه السنة' },
  { key: 'last_year', label: 'السنة الماضية' },
  { key: 'custom', label: 'مخصص' },
];

// ==================== Helper Functions ====================

function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();

  switch (preset) {
    case 'today':
      return { start: startOfDay(now), end: endOfDay(now) };
    case 'yesterday':
      const yesterday = subDays(now, 1);
      return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
    case 'last_7_days':
      return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
    case 'last_30_days':
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
    case 'this_month':
      return { start: startOfMonth(now), end: endOfDay(now) };
    case 'last_month':
      const lastMonth = subMonths(now, 1);
      return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
    case 'this_quarter':
      return { start: startOfQuarter(now), end: endOfDay(now) };
    case 'last_quarter':
      const lastQuarter = subQuarters(now, 1);
      return { start: startOfQuarter(lastQuarter), end: endOfQuarter(lastQuarter) };
    case 'this_year':
      return { start: startOfYear(now), end: endOfDay(now) };
    case 'last_year':
      const lastYear = subYears(now, 1);
      return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
    default:
      return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
  }
}

function formatDateRange(range: DateRange): string {
  const startStr = format(range.start, 'd MMM', { locale: ar });
  const endStr = format(range.end, 'd MMM yyyy', { locale: ar });

  if (isSameDay(range.start, range.end)) {
    return format(range.start, 'd MMMM yyyy', { locale: ar });
  }

  return `${startStr} - ${endStr}`;
}

// ==================== Preset Button ====================

const PresetButton: React.FC<{
  preset: typeof presets[0];
  isActive: boolean;
  onClick: () => void;
}> = ({ preset, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={cn(
      'px-3 py-1.5 text-sm rounded-lg transition-all',
      isActive
        ? 'bg-blue-500 text-white font-medium shadow-sm'
        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
    )}
  >
    {preset.label}
  </button>
);

// ==================== Quick Buttons ====================

const QuickButtons: React.FC<{
  currentPreset?: DatePreset;
  onPresetSelect: (preset: DatePreset) => void;
}> = ({ currentPreset, onPresetSelect }) => {
  const quickPresets: DatePreset[] = ['today', 'last_7_days', 'this_month', 'last_month'];

  return (
    <div className="flex flex-wrap gap-2">
      {quickPresets.map((preset) => (
        <button
          key={preset}
          onClick={() => onPresetSelect(preset)}
          className={cn(
            'px-3 py-1.5 text-xs font-medium rounded-full transition-all',
            currentPreset === preset
              ? 'bg-blue-500 text-white'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 dark:hover:text-blue-400'
          )}
        >
          {presets.find(p => p.key === preset)?.label}
        </button>
      ))}
    </div>
  );
};

// ==================== Main Component ====================

const DateFilter: React.FC<DateFilterProps> = ({
  dateRange,
  onDateRangeChange,
  preset = 'last_30_days',
  onPresetChange,
  comparisonMode = 'none',
  onComparisonModeChange,
  comparisonDateRange,
  showComparison = false,
  showPresets = true,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<DayPickerRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  });
  const [viewMode, setViewMode] = useState<'presets' | 'calendar'>('presets');

  // Handle preset selection
  const handlePresetSelect = (selectedPreset: DatePreset) => {
    if (selectedPreset === 'custom') {
      setViewMode('calendar');
      return;
    }

    const newRange = getDateRangeFromPreset(selectedPreset);
    onDateRangeChange(newRange);
    onPresetChange?.(selectedPreset);
    setSelectedRange({ from: newRange.start, to: newRange.end });
    setIsOpen(false);
  };

  // Handle calendar selection
  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    setSelectedRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange({
        start: startOfDay(range.from),
        end: endOfDay(range.to),
      });
      onPresetChange?.('custom');
    }
  };

  // Apply and close
  const handleApply = () => {
    if (selectedRange?.from && selectedRange?.to) {
      onDateRangeChange({
        start: startOfDay(selectedRange.from),
        end: endOfDay(selectedRange.to),
      });
    }
    setIsOpen(false);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 rounded-xl',
          'bg-white dark:bg-zinc-900',
          'border border-zinc-200 dark:border-zinc-800',
          'hover:border-zinc-300 dark:hover:border-zinc-700',
          'shadow-sm transition-all',
          isOpen && 'ring-2 ring-blue-500/20 border-blue-500'
        )}
      >
        <Calendar className="h-4 w-4 text-zinc-400" />
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {formatDateRange(dateRange)}
        </span>
        <ChevronDown className={cn(
          'h-4 w-4 text-zinc-400 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute left-0 top-full mt-2 z-50',
                'bg-white dark:bg-zinc-900',
                'border border-zinc-200 dark:border-zinc-800',
                'rounded-2xl shadow-xl',
                'overflow-hidden',
                viewMode === 'calendar' ? 'w-auto' : 'w-80'
              )}
            >
              {/* View Mode Tabs */}
              <div className="flex border-b border-zinc-100 dark:border-zinc-800">
                <button
                  onClick={() => setViewMode('presets')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    viewMode === 'presets'
                      ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  )}
                >
                  <CalendarDays className="h-4 w-4" />
                  فترات سريعة
                </button>
                <button
                  onClick={() => setViewMode('calendar')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors',
                    viewMode === 'calendar'
                      ? 'bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                      : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                  )}
                >
                  <CalendarRange className="h-4 w-4" />
                  تقويم
                </button>
              </div>

              {/* Presets View */}
              {viewMode === 'presets' && (
                <div className="p-4 space-y-2">
                  {presets.filter(p => p.key !== 'custom').map((p) => (
                    <button
                      key={p.key}
                      onClick={() => handlePresetSelect(p.key)}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-sm transition-all',
                        preset === p.key
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                          : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                      )}
                    >
                      <span>{p.label}</span>
                      {preset === p.key && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Calendar View */}
              {viewMode === 'calendar' && (
                <div className="p-4">
                  <DayPicker
                    mode="range"
                    selected={selectedRange}
                    onSelect={handleCalendarSelect}
                    locale={ar}
                    dir="rtl"
                    numberOfMonths={2}
                    showOutsideDays
                    className="!font-sans"
                    classNames={{
                      months: 'flex gap-4',
                      month: 'space-y-4',
                      caption: 'flex justify-center pt-1 relative items-center',
                      caption_label: 'text-sm font-medium text-zinc-900 dark:text-zinc-100',
                      nav: 'space-x-1 flex items-center',
                      nav_button: cn(
                        'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
                        'inline-flex items-center justify-center rounded-lg',
                        'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
                      ),
                      nav_button_previous: 'absolute right-1',
                      nav_button_next: 'absolute left-1',
                      table: 'w-full border-collapse space-y-1',
                      head_row: 'flex',
                      head_cell: 'text-zinc-500 rounded-md w-9 font-normal text-[0.8rem]',
                      row: 'flex w-full mt-2',
                      cell: 'text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20',
                      day: cn(
                        'h-9 w-9 p-0 font-normal',
                        'inline-flex items-center justify-center rounded-lg',
                        'text-zinc-900 dark:text-zinc-100',
                        'hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors',
                        'focus:outline-none focus:ring-2 focus:ring-blue-500/20'
                      ),
                      day_selected: 'bg-blue-500 text-white hover:bg-blue-600 hover:text-white focus:bg-blue-500 focus:text-white',
                      day_today: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100',
                      day_outside: 'text-zinc-400 opacity-50',
                      day_disabled: 'text-zinc-400 opacity-50',
                      day_range_middle: 'aria-selected:bg-blue-50 dark:aria-selected:bg-blue-900/20 aria-selected:text-blue-900 dark:aria-selected:text-blue-100',
                      day_hidden: 'invisible',
                    }}
                    components={{
                      IconLeft: () => <ChevronRight className="h-4 w-4" />,
                      IconRight: () => <ChevronLeft className="h-4 w-4" />,
                    }}
                  />

                  {/* Actions */}
                  <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                    <button
                      onClick={() => setIsOpen(false)}
                      className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                    >
                      إلغاء
                    </button>
                    <button
                      onClick={handleApply}
                      disabled={!selectedRange?.from || !selectedRange?.to}
                      className={cn(
                        'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                        'bg-blue-500 text-white hover:bg-blue-600',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      تطبيق
                    </button>
                  </div>
                </div>
              )}

              {/* Comparison Option */}
              {showComparison && (
                <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                      <ArrowLeftRight className="h-4 w-4" />
                      <span>مقارنة مع</span>
                    </div>
                    <select
                      value={comparisonMode}
                      onChange={(e) => onComparisonModeChange?.(e.target.value as ComparisonMode)}
                      className={cn(
                        'text-sm bg-transparent border-0',
                        'text-zinc-700 dark:text-zinc-300',
                        'focus:outline-none focus:ring-0'
                      )}
                    >
                      <option value="none">بدون مقارنة</option>
                      <option value="previous_period">الفترة السابقة</option>
                      <option value="same_period_last_year">نفس الفترة من العام الماضي</option>
                    </select>
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default memo(DateFilter);

// ==================== Export Utility ====================

export { getDateRangeFromPreset, formatDateRange };
