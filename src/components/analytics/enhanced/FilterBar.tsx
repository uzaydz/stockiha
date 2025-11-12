/**
 * شريط تصفية متقدم للتحليلات
 * يدعم جميع أنواع الفلاتر مع حفظ الإعدادات
 */

import React, { useState } from 'react';
import {
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Save,
  X,
  ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { AnalyticsFilters, AnalyticsPeriod } from '@/hooks/useAnalytics';

// ============================================================================
// Types
// ============================================================================

export interface FilterBarProps {
  filters: AnalyticsFilters;
  onFiltersChange: (filters: AnalyticsFilters) => void;
  onRefresh?: () => void;
  onExport?: () => void;
  isLoading?: boolean;
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  isLoading = false,
  className
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(
    filters.dateRange?.start.toISOString().split('T')[0] || ''
  );
  const [customEndDate, setCustomEndDate] = useState(
    filters.dateRange?.end.toISOString().split('T')[0] || ''
  );

  // عدد الفلاتر النشطة
  const activeFiltersCount = [
    filters.channel !== 'all',
    filters.employeeId,
    filters.customerId,
    filters.categoryId,
    filters.paymentMethod
  ].filter(Boolean).length;

  // تحديث الفترة
  const handlePeriodChange = (period: AnalyticsPeriod) => {
    let dateRange = filters.dateRange;

    if (period !== 'custom') {
      const end = new Date();
      const start = new Date();

      switch (period) {
        case 'day':
          start.setHours(0, 0, 0, 0);
          end.setHours(23, 59, 59, 999);
          break;
        case 'week':
          start.setDate(end.getDate() - 7);
          break;
        case 'month':
          start.setMonth(end.getMonth() - 1);
          break;
        case 'quarter':
          start.setMonth(end.getMonth() - 3);
          break;
        case 'year':
          start.setFullYear(end.getFullYear() - 1);
          break;
      }

      dateRange = { start, end };
    }

    onFiltersChange({ ...filters, period, dateRange });
  };

  // تطبيق التاريخ المخصص
  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      const start = new Date(customStartDate);
      const end = new Date(customEndDate);
      end.setHours(23, 59, 59, 999);

      onFiltersChange({
        ...filters,
        period: 'custom',
        dateRange: { start, end }
      });
    }
  };

  // إعادة تعيين الفلاتر
  const handleResetFilters = () => {
    onFiltersChange({
      period: 'month',
      dateRange: {
        start: new Date(new Date().setMonth(new Date().getMonth() - 1)),
        end: new Date()
      },
      channel: 'all'
    });
    setShowAdvanced(false);
  };

  // تنسيق عرض الفترة
  const getPeriodLabel = (): string => {
    if (filters.period === 'custom' && filters.dateRange) {
      const start = filters.dateRange.start.toLocaleDateString('ar-DZ', {
        month: 'short',
        day: 'numeric'
      });
      const end = filters.dateRange.end.toLocaleDateString('ar-DZ', {
        month: 'short',
        day: 'numeric'
      });
      return `${start} - ${end}`;
    }

    const labels: Record<AnalyticsPeriod, string> = {
      day: 'اليوم',
      week: 'أسبوع',
      month: 'شهر',
      quarter: 'ربع سنة',
      year: 'سنة',
      custom: 'مخصص'
    };
    return labels[filters.period];
  };

  return (
    <div className={cn('bg-white dark:bg-card rounded-lg shadow-sm border p-4', className)}>
      {/* الصف الأول - الفلاتر الأساسية */}
      <div className="flex flex-wrap items-center gap-3">
        {/* اختيار الفترة */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Select
            value={filters.period}
            onValueChange={(value) => handlePeriodChange(value as AnalyticsPeriod)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue>{getPeriodLabel()}</SelectValue>
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="day">اليوم</SelectItem>
              <SelectItem value="week">أسبوع</SelectItem>
              <SelectItem value="month">شهر</SelectItem>
              <SelectItem value="quarter">ربع سنة</SelectItem>
              <SelectItem value="year">سنة</SelectItem>
              <SelectItem value="custom">مخصص</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* القناة */}
        <Select
          value={filters.channel || 'all'}
          onValueChange={(value) => onFiltersChange({ ...filters, channel: value as any })}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل القنوات</SelectItem>
            <SelectItem value="pos">POS</SelectItem>
            <SelectItem value="online">أونلاين</SelectItem>
          </SelectContent>
        </Select>

        {/* زر الفلاتر المتقدمة */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="relative"
        >
          <Filter className="w-4 h-4 ml-2" />
          فلاتر متقدمة
          {activeFiltersCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        <div className="flex-1" />

        {/* أزرار الإجراءات */}
        <div className="flex items-center gap-2">
          {/* زر التحديث */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
              تحديث
            </Button>
          )}

          {/* زر التصدير */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              تصدير
            </Button>
          )}

          {/* إعادة تعيين */}
          {activeFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="gap-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <X className="w-4 h-4" />
              إعادة تعيين
            </Button>
          )}
        </div>
      </div>

      {/* التاريخ المخصص */}
      {filters.period === 'custom' && (
        <div className="mt-4 flex flex-wrap items-end gap-3 p-3 bg-muted/50 rounded-md">
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs mb-1 block">من تاريخ</Label>
            <Input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Label className="text-xs mb-1 block">إلى تاريخ</Label>
            <Input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleApplyCustomDates}
            disabled={!customStartDate || !customEndDate}
          >
            تطبيق
          </Button>
        </div>
      )}

      {/* الفلاتر المتقدمة */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* فلتر الموظف */}
            <div>
              <Label className="text-xs mb-1 block">الموظف</Label>
              <Input
                type="text"
                placeholder="ID الموظف"
                value={filters.employeeId || ''}
                onChange={(e) => onFiltersChange({ ...filters, employeeId: e.target.value || undefined })}
                className="text-sm"
              />
            </div>

            {/* فلتر العميل */}
            <div>
              <Label className="text-xs mb-1 block">العميل</Label>
              <Input
                type="text"
                placeholder="ID العميل"
                value={filters.customerId || ''}
                onChange={(e) => onFiltersChange({ ...filters, customerId: e.target.value || undefined })}
                className="text-sm"
              />
            </div>

            {/* فلتر الفئة */}
            <div>
              <Label className="text-xs mb-1 block">الفئة</Label>
              <Input
                type="text"
                placeholder="ID الفئة"
                value={filters.categoryId || ''}
                onChange={(e) => onFiltersChange({ ...filters, categoryId: e.target.value || undefined })}
                className="text-sm"
              />
            </div>

            {/* فلتر طريقة الدفع */}
            <div>
              <Label className="text-xs mb-1 block">طريقة الدفع</Label>
              <Select
                value={filters.paymentMethod || 'all'}
                onValueChange={(value) => onFiltersChange({
                  ...filters,
                  paymentMethod: value === 'all' ? undefined : value
                })}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="cash">نقداً</SelectItem>
                  <SelectItem value="card">بطاقة</SelectItem>
                  <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                  <SelectItem value="other">أخرى</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
