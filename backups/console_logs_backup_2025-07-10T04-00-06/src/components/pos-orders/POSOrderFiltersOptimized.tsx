import React, { useCallback, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  X, 
  Calendar as CalendarIcon,
  RefreshCw,
  Download,
  ChevronDown
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { POSOrderFilters } from '@/api/posOrdersService';

interface POSOrderFiltersProps {
  filters: POSOrderFilters;
  onFiltersChange: (filters: POSOrderFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading?: boolean;
  employees?: Array<{ id: string; name: string; email: string }>;
}

const FilterBadge = React.memo<{ label: string; value: string; onRemove: () => void }>(
  ({ label, value, onRemove }) => (
    <Badge variant="secondary" className="gap-1">
      <span className="text-xs">{label}:</span>
      <span className="font-medium">{value}</span>
      <button
        onClick={onRemove}
        className="ml-1 hover:bg-muted rounded-full p-0.5"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  )
);

FilterBadge.displayName = 'FilterBadge';

export const POSOrderFiltersOptimized = React.memo<POSOrderFiltersProps>(({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  loading = false,
  employees = []
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.date_from ? new Date(filters.date_from) : undefined,
    to: filters.date_to ? new Date(filters.date_to) : undefined,
  });

  // Handle search change
  const handleSearchChange = useCallback((value: string) => {
    onFiltersChange({ ...filters, search: value });
  }, [filters, onFiltersChange]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof POSOrderFilters, value: string | undefined) => {
    if (value === 'all' || !value) {
      const { [key]: _, ...rest } = filters;
      onFiltersChange(rest);
    } else {
      onFiltersChange({ ...filters, [key]: value });
    }
  }, [filters, onFiltersChange]);

  // Handle date range change
  const handleDateRangeChange = useCallback((range: { from: Date | undefined; to: Date | undefined }) => {
    setDateRange(range);
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
  }, [onFiltersChange]);

  // Check if any filter is active
  const hasActiveFilters = useMemo(() => {
    return Object.keys(filters).some(key => 
      filters[key as keyof POSOrderFilters] !== undefined && 
      filters[key as keyof POSOrderFilters] !== ''
    );
  }, [filters]);

  // Get active filter badges
  const activeFilterBadges = useMemo(() => {
    const badges = [];
    
    if (filters.status) {
      badges.push({
        key: 'status',
        label: 'الحالة',
        value: filters.status === 'completed' ? 'مكتمل' : 
               filters.status === 'pending' ? 'معلق' : 
               filters.status === 'cancelled' ? 'ملغي' : filters.status
      });
    }
    
    if (filters.payment_method) {
      badges.push({
        key: 'payment_method',
        label: 'طريقة الدفع',
        value: filters.payment_method === 'cash' ? 'نقدي' : 
               filters.payment_method === 'card' ? 'بطاقة' : filters.payment_method
      });
    }
    
    if (filters.payment_status) {
      badges.push({
        key: 'payment_status',
        label: 'حالة الدفع',
        value: filters.payment_status === 'paid' ? 'مدفوع' : 
               filters.payment_status === 'unpaid' ? 'غير مدفوع' : 
               filters.payment_status === 'partial' ? 'دفع جزئي' : filters.payment_status
      });
    }
    
    if (filters.employee_id) {
      const employee = employees.find(e => e.id === filters.employee_id);
      if (employee) {
        badges.push({
          key: 'employee_id',
          label: 'الموظف',
          value: employee.name
        });
      }
    }
    
    if (filters.date_from || filters.date_to) {
      let dateValue = '';
      if (filters.date_from && filters.date_to) {
        dateValue = `${format(new Date(filters.date_from), 'dd/MM/yyyy')} - ${format(new Date(filters.date_to), 'dd/MM/yyyy')}`;
      } else if (filters.date_from) {
        dateValue = `من ${format(new Date(filters.date_from), 'dd/MM/yyyy')}`;
      } else if (filters.date_to) {
        dateValue = `حتى ${format(new Date(filters.date_to), 'dd/MM/yyyy')}`;
      }
      badges.push({
        key: 'date',
        label: 'التاريخ',
        value: dateValue
      });
    }
    
    return badges;
  }, [filters, employees]);

  return (
    <Card>
      <CardContent className="p-4 space-y-4">
        {/* Main Filter Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث برقم الطلبية أو الملاحظات..."
              value={filters.search || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-10"
              disabled={loading}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="gap-2"
            >
              <Filter className="h-4 w-4" />
              فلاتر متقدمة
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform",
                isExpanded && "rotate-180"
              )} />
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-1">
                  {activeFilterBadges.length}
                </Badge>
              )}
            </Button>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground"
              >
                <X className="h-4 w-4 mr-1" />
                مسح الكل
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              تحديث
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
            >
              <Download className="h-4 w-4 mr-2" />
              تصدير
            </Button>
          </div>
        </div>

        {/* Active Filters */}
        {activeFilterBadges.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilterBadges.map((badge) => (
              <FilterBadge
                key={badge.key}
                label={badge.label}
                value={badge.value}
                onRemove={() => {
                  if (badge.key === 'date') {
                    handleDateRangeChange({ from: undefined, to: undefined });
                  } else {
                    handleFilterChange(badge.key as keyof POSOrderFilters, undefined);
                  }
                }}
              />
            ))}
          </div>
        )}

        {/* Expanded Filters */}
        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
            {/* Status Filter */}
            <div className="space-y-2">
              <Label>حالة الطلبية</Label>
              <Select
                value={filters.status || 'all'}
                onValueChange={(value) => handleFilterChange('status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="pending">معلق</SelectItem>
                  <SelectItem value="processing">قيد المعالجة</SelectItem>
                  <SelectItem value="completed">مكتمل</SelectItem>
                  <SelectItem value="cancelled">ملغي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method Filter */}
            <div className="space-y-2">
              <Label>طريقة الدفع</Label>
              <Select
                value={filters.payment_method || 'all'}
                onValueChange={(value) => handleFilterChange('payment_method', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الطرق" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الطرق</SelectItem>
                  <SelectItem value="cash">نقدي</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="transfer">تحويل</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Status Filter */}
            <div className="space-y-2">
              <Label>حالة الدفع</Label>
              <Select
                value={filters.payment_status || 'all'}
                onValueChange={(value) => handleFilterChange('payment_status', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الحالات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحالات</SelectItem>
                  <SelectItem value="paid">مدفوع</SelectItem>
                  <SelectItem value="unpaid">غير مدفوع</SelectItem>
                  <SelectItem value="partial">دفع جزئي</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Employee Filter */}
            <div className="space-y-2">
              <Label>الموظف</Label>
              <Select
                value={filters.employee_id || 'all'}
                onValueChange={(value) => handleFilterChange('employee_id', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="جميع الموظفين" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الموظفين</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2 md:col-span-2">
              <Label>نطاق التاريخ</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-right font-normal",
                      !dateRange.from && !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "PPP", { locale: ar })} -{" "}
                          {format(dateRange.to, "PPP", { locale: ar })}
                        </>
                      ) : (
                        format(dateRange.from, "PPP", { locale: ar })
                      )
                    ) : (
                      <span>اختر نطاق التاريخ</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
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
          </div>
        )}
      </CardContent>
    </Card>
  );
});

POSOrderFiltersOptimized.displayName = 'POSOrderFiltersOptimized';

export default POSOrderFiltersOptimized;
