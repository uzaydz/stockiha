import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Download, Calendar as CalendarIcon, Filter, X, Users, MapPin, CreditCard, DollarSign, TrendingUp, Settings, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { formatDate, getDateRangePreset, formatCurrency } from './utils';
import type { DateRange } from './types';

interface AnalyticsFilters {
  employeeId?: string;
  branchId?: string;
  transactionType?: string;
  paymentMethod?: string;
  minAmount?: number;
  maxAmount?: number;
  includePartialPayments?: boolean;
  includeRefunds?: boolean;
}

interface AnalyticsHeaderProps {
  dateRange: DateRange;
  selectedEmployee: string;
  isRefreshing: boolean;
  filters?: AnalyticsFilters;
  onDateRangeChange: (preset: string, customRange?: DateRange) => void;
  onEmployeeChange: (employeeId: string) => void;
  onFiltersChange?: (filters: AnalyticsFilters) => void;
  onRefresh: () => void;
  onExport?: () => void;
  className?: string;
}

const AnalyticsHeader = React.memo<AnalyticsHeaderProps>(({
  dateRange,
  selectedEmployee,
  isRefreshing,
  filters = {},
  onDateRangeChange,
  onEmployeeChange,
  onFiltersChange,
  onRefresh,
  onExport,
  className
}) => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [previewFilters, setPreviewFilters] = useState(false);

  const datePresets = [
    { value: 'today', label: 'اليوم', icon: '📅', color: 'from-blue-500 to-blue-600' },
    { value: 'week', label: 'هذا الأسبوع', icon: '📊', color: 'from-green-500 to-green-600' },
    { value: 'month', label: 'هذا الشهر', icon: '📈', color: 'from-purple-500 to-purple-600' },
    { value: 'quarter', label: 'هذا الربع', icon: '📉', color: 'from-orange-500 to-orange-600' },
    { value: 'year', label: 'هذه السنة', icon: '📋', color: 'from-red-500 to-red-600' },
    { value: 'custom', label: 'تخصيص', icon: '🎯', color: 'from-indigo-500 to-indigo-600' }
  ];

  const transactionTypes = [
    { value: 'all', label: 'جميع المعاملات', icon: '🔄', color: 'text-blue-600' },
    { value: 'pos', label: 'نقطة البيع', icon: '🏪', color: 'text-green-600' },
    { value: 'online', label: 'المتجر الإلكتروني', icon: '🌐', color: 'text-purple-600' },
    { value: 'repair', label: 'خدمات التصليح', icon: '🔧', color: 'text-orange-600' },
    { value: 'subscription', label: 'الاشتراكات', icon: '🔒', color: 'text-indigo-600' },
    { value: 'games', label: 'تحميل الألعاب', icon: '🎮', color: 'text-pink-600' }
  ];

  const paymentMethods = [
    { value: 'all', label: 'جميع طرق الدفع', icon: '💳', color: 'text-blue-600' },
    { value: 'cash', label: 'نقداً', icon: '💵', color: 'text-green-600' },
    { value: 'card', label: 'بطاقة ائتمان', icon: '💳', color: 'text-purple-600' },
    { value: 'bank_transfer', label: 'تحويل بنكي', icon: '🏦', color: 'text-orange-600' },
    { value: 'digital_wallet', label: 'محفظة رقمية', icon: '📱', color: 'text-indigo-600' },
    { value: 'installment', label: 'أقساط', icon: '📅', color: 'text-pink-600' }
  ];

  const handleDatePresetChange = (preset: string) => {
    
    if (preset === 'custom') {
      setShowCustomDatePicker(true);
    } else {
      onDateRangeChange(preset);
      setShowCustomDatePicker(false);
    }
  };

  const handleCustomDateSelect = () => {
    
    if (customDateRange?.from && customDateRange?.to) {
      setShowCustomDatePicker(false);
      onDateRangeChange('custom', customDateRange);
    } else {
    }
  };

  const updateFilters = (newFilters: Partial<AnalyticsFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    onFiltersChange?.(updatedFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange?.({});
    onEmployeeChange('all');
    onDateRangeChange('month');
    setShowAdvancedFilters(false);
  };

  const clearSpecificFilter = (filterKey: keyof AnalyticsFilters) => {
    const updatedFilters = { ...filters };
    delete updatedFilters[filterKey];
    onFiltersChange?.(updatedFilters);
  };

  // حساب عدد الفلاتر النشطة مع تفاصيل أكثر
  const activeFilters = useMemo(() => {
    const active: Array<{key: string, label: string, value: any, type: 'basic' | 'advanced'}> = [];
    
    // الفلاتر الأساسية
    if (selectedEmployee !== 'all') {
      active.push({
        key: 'employee',
        label: 'الموظف',
        value: selectedEmployee,
        type: 'basic'
      });
    }

    // الفلاتر المتقدمة
    if (filters.transactionType && filters.transactionType !== 'all') {
      const type = transactionTypes.find(t => t.value === filters.transactionType);
      active.push({
        key: 'transactionType',
        label: 'نوع المعاملة',
        value: type?.label || filters.transactionType,
        type: 'advanced'
      });
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      const method = paymentMethods.find(m => m.value === filters.paymentMethod);
      active.push({
        key: 'paymentMethod',
        label: 'طريقة الدفع',
        value: method?.label || filters.paymentMethod,
        type: 'advanced'
      });
    }

    if (filters.minAmount && filters.minAmount > 0) {
      active.push({
        key: 'minAmount',
        label: 'الحد الأدنى',
        value: formatCurrency(filters.minAmount),
        type: 'advanced'
      });
    }

    if (filters.maxAmount && filters.maxAmount > 0) {
      active.push({
        key: 'maxAmount',
        label: 'الحد الأعلى',
        value: formatCurrency(filters.maxAmount),
        type: 'advanced'
      });
    }

    if (filters.includePartialPayments === false) {
      active.push({
        key: 'includePartialPayments',
        label: 'المدفوعات الجزئية',
        value: 'مستبعدة',
        type: 'advanced'
      });
    }

    if (filters.includeRefunds === false) {
      active.push({
        key: 'includeRefunds',
        label: 'المرتجعات',
        value: 'مستبعدة',
        type: 'advanced'
      });
    }

    return active;
  }, [filters, selectedEmployee, transactionTypes, paymentMethods]);

  const activeFiltersCount = activeFilters.length;
  const basicFiltersCount = activeFilters.filter(f => f.type === 'basic').length;
  const advancedFiltersCount = activeFilters.filter(f => f.type === 'advanced').length;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn("space-y-6", className)}
    >

      {/* الفلاتر الأساسية المحسنة */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="flex flex-wrap gap-4 items-center justify-center"
      >
        {/* اختيار الفترة الزمنية المحسن */}
        <div className="flex gap-2 bg-gradient-to-r from-muted/40 to-muted/60 p-3 rounded-xl border border-border/50 backdrop-blur-sm shadow-lg">
          {datePresets.map((preset, index) => (
            <motion.div
              key={preset.value}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.4 + index * 0.05 }}
            >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleDatePresetChange(preset.value)}
                className={cn(
                  "hover:bg-background hover:shadow-md transition-all duration-200 gap-2 relative overflow-hidden",
                  preset.value === 'custom' && showCustomDatePicker && "bg-primary text-primary-foreground shadow-lg"
                )}
              >
                <span className="text-sm">{preset.icon}</span>
                <div className="flex flex-col items-start">
                  <span className="hidden md:inline font-medium">{preset.label}</span>
                  <span className="md:hidden font-medium">{preset.label.split(' ')[0]}</span>
                  {preset.value === 'custom' && customDateRange?.from && customDateRange?.to && (
                    <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                      {formatDate(customDateRange.from)} - {formatDate(customDateRange.to)}
                    </span>
                  )}
                </div>
                
                {/* تأثير الخلفية */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-r opacity-0 hover:opacity-10 transition-opacity duration-200",
                  preset.color
                )} />
              </Button>
            </motion.div>
          ))}
        </div>

        {/* اختيار الموظف المحسن */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 }}
          className="min-w-[220px]"
        >
          <Select value={selectedEmployee} onValueChange={onEmployeeChange}>
            <SelectTrigger className="bg-background/80 backdrop-blur-sm border-border/50 shadow-lg hover:shadow-xl transition-all duration-200">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <SelectValue placeholder="اختر الموظف" />
                {selectedEmployee !== 'all' && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
                    محدد
                  </Badge>
                )}
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  جميع الموظفين
                </div>
              </SelectItem>
              {/* يمكن إضافة المزيد من الموظفين هنا */}
            </SelectContent>
          </Select>
        </motion.div>

        {/* أزرار الإجراءات المحسنة */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 1.0 }}
          className="flex gap-2"
        >
          <Button
            onClick={onRefresh}
            disabled={isRefreshing}
            size="sm"
            className="gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">
              {isRefreshing ? 'جارٍ التحديث...' : 'تحديث'}
            </span>
          </Button>

          {onExport && (
            <Button
              onClick={onExport}
              variant="outline"
              size="sm"
              className="gap-2 border-primary/20 hover:bg-primary/5 transition-all duration-200"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">تصدير</span>
            </Button>
          )}

          <Button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            variant={showAdvancedFilters ? "default" : "outline"}
            size="sm"
            className={cn(
              "gap-2 transition-all duration-200",
              showAdvancedFilters && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            )}
          >
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">فلاتر متقدمة</span>
            {advancedFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-white/20 text-white text-xs ml-1">
                {advancedFiltersCount}
              </Badge>
            )}
          </Button>
        </motion.div>
      </motion.div>

      {/* منتقي التاريخ المخصص */}
      <AnimatePresence>
        {showCustomDatePicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex justify-center"
          >
            <div className="bg-background border rounded-lg p-4 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  اختيار فترة زمنية مخصصة
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomDatePicker(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Calendar
                mode="range"
                selected={customDateRange ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                onSelect={(range) => {
                  if (range?.from) {
                    setCustomDateRange({
                      from: range.from,
                      to: range.to || range.from
                    });
                  }
                }}
                numberOfMonths={2}
                className="rounded-md"
                classNames={{
                  months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
                  month: "space-y-4",
                  caption: "flex justify-center pt-1 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
                  row: "flex w-full mt-2",
                  cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-range-start)]:rounded-l-md first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 select-none hover:bg-accent hover:text-accent-foreground rounded-md focus:bg-accent focus:text-accent-foreground cursor-pointer",
                  day_range_end: "day-range-end",
                  day_range_start: "day-range-start",
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
                  day_today: "bg-accent text-accent-foreground",
                  day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
                  day_disabled: "text-muted-foreground opacity-50",
                  day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                  day_hidden: "invisible",
                }}
              />
              
              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  {customDateRange?.from && customDateRange?.to ? (
                    <span>
                      من {formatDate(customDateRange.from)} إلى {formatDate(customDateRange.to)}
                    </span>
                  ) : (
                    <span>اختر تاريخ البداية والنهاية</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCustomDatePicker(false)}
                  >
                    إلغاء
                  </Button>
                  <Button
                    size="sm"
                    disabled={!customDateRange?.from || !customDateRange?.to}
                    onClick={handleCustomDateSelect}
                  >
                    تطبيق
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* الفلاتر المتقدمة */}
      <AnimatePresence>
        {showAdvancedFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-muted/20 backdrop-blur-sm rounded-xl border border-border/50 p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  فلاتر متقدمة
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={clearAllFilters}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4 mr-1" />
                  مسح الكل
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* نوع المعاملة */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    نوع المعاملة
                  </Label>
                  <Select 
                    value={filters.transactionType || 'all'} 
                    onValueChange={(value) => updateFilters({ transactionType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* طريقة الدفع */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    طريقة الدفع
                  </Label>
                  <Select 
                    value={filters.paymentMethod || 'all'} 
                    onValueChange={(value) => updateFilters({ paymentMethod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(method => (
                        <SelectItem key={method.value} value={method.value}>
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* الفرع */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    الفرع
                  </Label>
                  <Select 
                    value={filters.branchId || 'all'} 
                    onValueChange={(value) => updateFilters({ branchId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الفروع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع الفروع</SelectItem>
                      {/* يمكن إضافة الفروع هنا لاحقاً من API */}
                    </SelectContent>
                  </Select>
                </div>

                {/* الحد الأدنى للمبلغ */}
                <div className="space-y-2">
                  <Label>الحد الأدنى للمبلغ (دج)</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.minAmount || ''}
                    onChange={(e) => updateFilters({ minAmount: Number(e.target.value) || undefined })}
                  />
                </div>

                {/* الحد الأقصى للمبلغ */}
                <div className="space-y-2">
                  <Label>الحد الأقصى للمبلغ (دج)</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.maxAmount || ''}
                    onChange={(e) => updateFilters({ maxAmount: Number(e.target.value) || undefined })}
                  />
                </div>

                {/* خيارات إضافية */}
                <div className="space-y-3">
                  <Label>خيارات إضافية</Label>
                  <div className="space-y-2">
                    <label className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={filters.includePartialPayments || false}
                        onChange={(e) => updateFilters({ includePartialPayments: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm">تضمين المدفوعات الجزئية</span>
                    </label>
                    <label className="flex items-center space-x-2 space-x-reverse">
                      <input
                        type="checkbox"
                        checked={filters.includeRefunds || false}
                        onChange={(e) => updateFilters({ includeRefunds: e.target.checked })}
                        className="rounded border-border"
                      />
                      <span className="text-sm">تضمين المرتجعات</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

AnalyticsHeader.displayName = 'AnalyticsHeader';

export default AnalyticsHeader;
