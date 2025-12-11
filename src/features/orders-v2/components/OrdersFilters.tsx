/**
 * OrdersFilters - مكون فلاتر الطلبيات المحسن
 */

import React, { memo, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Search, Calendar as CalendarIcon, X, Filter } from 'lucide-react';
import { useOrders } from '../context/OrdersContext';
import type { OrderStatus } from '../types';

const STATUS_CONFIG: Record<OrderStatus | 'all', { label: string; color: string; bgColor: string }> = {
  all: { label: 'الكل', color: 'text-foreground', bgColor: 'bg-muted' },
  pending: { label: 'معلق', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20' },
  processing: { label: 'قيد المعالجة', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20' },
  shipped: { label: 'تم الشحن', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20' },
  delivered: { label: 'مكتمل', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20' },
  cancelled: { label: 'ملغي', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/20' },
};

const OrdersFilters: React.FC = () => {
  const {
    filters,
    applyFilters,
    resetFilters,
    orderCounts,
  } = useOrders();

  // Ensure status is a valid key, default to 'all'
  const currentStatus = (filters.status && filters.status in STATUS_CONFIG)
    ? filters.status
    : 'all';

  const [searchValue, setSearchValue] = useState(filters.searchTerm || '');
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.dateFrom || undefined,
    to: filters.dateTo || undefined,
  });

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchValue(value);

    // Debounce the API call
    const timeoutId = setTimeout(() => {
      applyFilters({ searchTerm: value });
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [applyFilters]);

  const handleStatusChange = useCallback((status: OrderStatus | 'all') => {
    applyFilters({ status });
  }, [applyFilters]);

  const handleDateApply = useCallback(() => {
    applyFilters({
      dateFrom: dateRange.from || null,
      dateTo: dateRange.to || null,
    });
  }, [applyFilters, dateRange]);

  const handleClearDates = useCallback(() => {
    setDateRange({ from: undefined, to: undefined });
    applyFilters({ dateFrom: null, dateTo: null });
  }, [applyFilters]);

  const handleReset = useCallback(() => {
    setSearchValue('');
    setDateRange({ from: undefined, to: undefined });
    resetFilters();
  }, [resetFilters]);

  const hasActiveFilters = filters.searchTerm || filters.dateFrom || currentStatus !== 'all';

  return (
    <div className="space-y-4 p-4 bg-card rounded-xl border border-border/30">
      {/* Status Pills */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>تصفية حسب الحالة</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CONFIG) as (OrderStatus | 'all')[]).map((status) => {
            const config = STATUS_CONFIG[status];
            const count = status === 'all' ? orderCounts.all : (orderCounts[status] || 0);
            const isActive = currentStatus === status;

            return (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                className={`
                  flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
                  transition-all duration-200 border
                  ${isActive
                    ? `${config.bgColor} ${config.color} border-current`
                    : 'bg-background border-border/40 hover:border-border hover:bg-muted/50'
                  }
                `}
              >
                <span>{config.label}</span>
                <Badge
                  variant="secondary"
                  className={`text-xs px-1.5 min-w-[1.5rem] justify-center ${isActive ? config.bgColor : ''}`}
                >
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Date Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث برقم الطلب، اسم العميل، أو رقم الهاتف..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10 pr-4 h-10"
          />
          {searchValue && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={`h-10 gap-2 ${dateRange.from ? 'bg-primary/5 border-primary/30' : ''}`}
            >
              <CalendarIcon className="h-4 w-4" />
              {dateRange.from ? (
                <span className="text-sm">
                  {dateRange.from.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' })}
                  {dateRange.to && ` - ${dateRange.to.toLocaleDateString('ar-DZ', { month: 'short', day: 'numeric' })}`}
                </span>
              ) : (
                <span>اختر الفترة</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="range"
              selected={dateRange as any}
              onSelect={setDateRange as any}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
            />
            <div className="p-3 border-t flex justify-between gap-2">
              <Button variant="ghost" size="sm" onClick={handleClearDates}>
                مسح
              </Button>
              <Button size="sm" onClick={handleDateApply}>
                تطبيق
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-10 gap-2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            مسح الكل
          </Button>
        )}
      </div>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
          <span className="text-xs text-muted-foreground py-1">الفلاتر النشطة:</span>

          {currentStatus !== 'all' && STATUS_CONFIG[currentStatus] && (
            <Badge variant="secondary" className="gap-1">
              الحالة: {STATUS_CONFIG[currentStatus].label}
              <button onClick={() => handleStatusChange('all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.searchTerm && (
            <Badge variant="secondary" className="gap-1">
              بحث: {filters.searchTerm}
              <button onClick={() => handleSearchChange('')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}

          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              التاريخ: {filters.dateFrom.toLocaleDateString('ar-DZ')}
              {filters.dateTo && ` - ${filters.dateTo.toLocaleDateString('ar-DZ')}`}
              <button onClick={handleClearDates}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};

export default memo(OrdersFilters);
