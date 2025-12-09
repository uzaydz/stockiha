/**
 * CustomerFiltersOptimized - Customer Filters
 * ============================================================
 * Apple-Inspired Design - Single Row, Clean & Elegant
 * Same design as POSOrderFiltersOptimized
 * ============================================================
 */

import React, { useCallback, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import {
  Search,
  X,
  Calendar as CalendarIcon,
  RefreshCw,
  Download,
  FileSpreadsheet,
  FileText,
  UserPlus,
  SlidersHorizontal,
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';

// ===============================================================================
// Types
// ===============================================================================

export interface CustomerFilters {
  search?: string;
  sortBy?: 'name' | 'created_at';
  sortOrder?: 'asc' | 'desc';
  hasPhone?: boolean;
  hasEmail?: boolean;
  date_from?: string;
  date_to?: string;
}

interface CustomerFiltersProps {
  filters: CustomerFilters;
  onFiltersChange: (filters: CustomerFilters) => void;
  onRefresh: () => void;
  onExport: (type: 'pdf' | 'excel') => void;
  onAddCustomer?: () => void;
  loading?: boolean;
  showAddButton?: boolean;
}

// ===============================================================================
// Quick Date Presets
// ===============================================================================

type DatePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom' | 'all';

const getDatePreset = (preset: DatePreset): { from: Date | undefined; to: Date | undefined } => {
  const today = new Date();

  switch (preset) {
    case 'today':
      return { from: startOfDay(today), to: endOfDay(today) };
    case 'yesterday':
      const yesterday = subDays(today, 1);
      return { from: startOfDay(yesterday), to: endOfDay(yesterday) };
    case 'week':
      return { from: startOfWeek(today, { weekStartsOn: 6 }), to: endOfWeek(today, { weekStartsOn: 6 }) };
    case 'month':
      return { from: startOfMonth(today), to: endOfMonth(today) };
    case 'all':
    default:
      return { from: undefined, to: undefined };
  }
};

// ===============================================================================
// Main Component
// ===============================================================================

export const CustomerFiltersOptimized = React.memo<CustomerFiltersProps>(({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  onAddCustomer,
  loading = false,
  showAddButton = true
}) => {
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  });

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  }, [filters, onFiltersChange]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof CustomerFilters, value: string | boolean | undefined) => {
    if (value === 'all' || value === undefined || value === '') {
      const { [key]: _, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  }, [filters, onFiltersChange]);

  // Handle date preset change
  const handleDatePresetChange = useCallback((preset: DatePreset) => {
    setDatePreset(preset);

    if (preset === 'custom') {
      setShowCalendar(true);
      return;
    }

    const range = getDatePreset(preset);
    setDateRange(range);
    onFiltersChange({
      ...filters,
      date_from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      date_to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
  }, [filters, onFiltersChange]);

  // Handle custom date range change
  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
    setDatePreset('custom');
    onFiltersChange({
      ...filters,
      date_from: range.from ? format(range.from, 'yyyy-MM-dd') : undefined,
      date_to: range.to ? format(range.to, 'yyyy-MM-dd') : undefined,
    });
  }, [filters, onFiltersChange]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    onFiltersChange({});
    setDateRange({ from: undefined, to: undefined });
    setDatePreset('all');
  }, [onFiltersChange]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key =>
      filters[key as keyof CustomerFilters] !== undefined &&
      filters[key as keyof CustomerFilters] !== ''
    );
  }, [filters]);

  // Date display text
  const dateDisplayText = useMemo(() => {
    if (datePreset === 'today') return 'اليوم';
    if (datePreset === 'yesterday') return 'أمس';
    if (datePreset === 'week') return 'هذا الأسبوع';
    if (datePreset === 'month') return 'هذا الشهر';
    if (dateRange.from && dateRange.to) {
      return `${format(dateRange.from, 'dd/MM')} - ${format(dateRange.to, 'dd/MM')}`;
    }
    if (dateRange.from) {
      return `من ${format(dateRange.from, 'dd/MM')}`;
    }
    return 'الكل';
  }, [datePreset, dateRange]);

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 rounded-2xl",
      "border border-zinc-200 dark:border-zinc-800",
      "p-3"
    )}>
      <div className="flex items-center gap-2 flex-wrap">

        {/* Search Input - Smaller */}
        <div className="relative w-[200px]">
          <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
          <Input
            placeholder="بحث بالاسم، الهاتف..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={cn(
              "pr-8 h-9 text-sm rounded-xl border-zinc-200 dark:border-zinc-700",
              "bg-zinc-50 dark:bg-zinc-800/50",
              "focus:bg-white dark:focus:bg-zinc-800",
              "placeholder:text-zinc-400"
            )}
            disabled={loading}
          />
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

        {/* Quick Date Filters */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDatePresetChange('today')}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-all",
              datePreset === 'today'
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            اليوم
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDatePresetChange('week')}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-all",
              datePreset === 'week'
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            الأسبوع
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDatePresetChange('month')}
            className={cn(
              "h-8 px-3 rounded-lg text-xs font-medium transition-all",
              datePreset === 'month'
                ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            )}
          >
            الشهر
          </Button>

          {/* Custom Date Picker */}
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 px-3 rounded-lg text-xs font-medium gap-1.5 transition-all",
                  datePreset === 'custom'
                    ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {datePreset === 'custom' ? (
                  <span className="font-numeric">{dateDisplayText}</span>
                ) : (
                  <span>مخصص</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 rounded-xl" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{
                  from: dateRange.from,
                  to: dateRange.to,
                }}
                onSelect={(range) => {
                  if (range) {
                    handleDateRangeChange({
                      from: range.from,
                      to: range.to,
                    });
                  }
                }}
                numberOfMonths={2}
                locale={ar}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Separator */}
        <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 mx-1" />

        {/* Sort By Filter */}
        <Select
          value={filters.sortBy || 'created_at'}
          onValueChange={(value) => handleFilterChange('sortBy', value as 'name' | 'created_at')}
        >
          <SelectTrigger className="h-9 w-[110px] rounded-xl border-zinc-200 dark:border-zinc-700 text-xs">
            <SelectValue placeholder="ترتيب" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="created_at">تاريخ التسجيل</SelectItem>
            <SelectItem value="name">الاسم</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort Order Filter */}
        <Select
          value={filters.sortOrder || 'desc'}
          onValueChange={(value) => handleFilterChange('sortOrder', value as 'asc' | 'desc')}
        >
          <SelectTrigger className="h-9 w-[90px] rounded-xl border-zinc-200 dark:border-zinc-700 text-xs">
            <SelectValue placeholder="الترتيب" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="desc">تنازلي</SelectItem>
            <SelectItem value="asc">تصاعدي</SelectItem>
          </SelectContent>
        </Select>

        {/* More Filters Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 px-2.5 rounded-xl text-xs gap-1.5",
                (filters.hasPhone || filters.hasEmail)
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-700"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              فلاتر
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="rounded-xl w-[180px]">
            <DropdownMenuItem
              onClick={() => handleFilterChange('hasPhone', !filters.hasPhone)}
              className={cn(
                "gap-2 cursor-pointer rounded-lg",
                filters.hasPhone && "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center",
                filters.hasPhone
                  ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white"
                  : "border-zinc-300 dark:border-zinc-600"
              )}>
                {filters.hasPhone && (
                  <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>لديه هاتف</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleFilterChange('hasEmail', !filters.hasEmail)}
              className={cn(
                "gap-2 cursor-pointer rounded-lg",
                filters.hasEmail && "bg-zinc-100 dark:bg-zinc-800"
              )}
            >
              <div className={cn(
                "w-4 h-4 rounded border flex items-center justify-center",
                filters.hasEmail
                  ? "bg-zinc-900 dark:bg-white border-zinc-900 dark:border-white"
                  : "border-zinc-300 dark:border-zinc-600"
              )}>
                {filters.hasEmail && (
                  <svg className="w-3 h-3 text-white dark:text-zinc-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span>لديه بريد</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-2.5 rounded-xl text-xs text-zinc-500 hover:text-zinc-700 gap-1"
          >
            <X className="h-3.5 w-3.5" />
            مسح
          </Button>
        )}

        {/* Refresh */}
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={loading}
          className="h-9 w-9 rounded-xl border-zinc-200 dark:border-zinc-700"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
        </Button>

        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-xl gap-1.5 border-zinc-200 dark:border-zinc-700"
            >
              <Download className="h-4 w-4" />
              <span className="text-xs font-medium">تصدير</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="rounded-xl w-[160px]">
            <DropdownMenuItem
              onClick={() => onExport('excel')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              <span>تصدير Excel</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onExport('pdf')}
              className="gap-2 cursor-pointer rounded-lg"
            >
              <FileText className="h-4 w-4 text-red-500" />
              <span>تصدير PDF</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Customer Button - Orange Theme */}
        {showAddButton && onAddCustomer && (
          <Button
            onClick={onAddCustomer}
            size="sm"
            className="h-9 px-3 rounded-xl gap-1.5 bg-orange-500 hover:bg-orange-600 text-white"
          >
            <UserPlus className="h-4 w-4" />
            <span className="text-xs font-medium">إضافة عميل</span>
          </Button>
        )}
      </div>
    </div>
  );
});

CustomerFiltersOptimized.displayName = 'CustomerFiltersOptimized';

export default CustomerFiltersOptimized;
