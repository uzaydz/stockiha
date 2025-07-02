import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Calendar, 
  Package, 
  Users, 
  X,
  ChevronDown,
  Settings
} from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

// أنواع البيانات
interface InventoryTrackingFilters {
  dateRange: {
    from: Date;
    to: Date;
  } | null;
  productIds?: string[];
  userIds?: string[];
  operationTypes?: string[];
  searchTerm?: string;
  includeBatches: boolean;
  includeStats: boolean;
}

interface OperationType {
  value: string;
  label: string;
  icon: string;
  color: string;
}

interface InventoryFiltersProps {
  filters: InventoryTrackingFilters;
  onFiltersChange: (filters: Partial<InventoryTrackingFilters>) => void;
  operationTypes: OperationType[];
}

// خيارات فترات زمنية سريعة
const quickDateRanges = [
  { 
    label: 'اليوم', 
    getValue: () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      return {
        from: startOfDay,
        to: endOfDay
      };
    }
  },
  { 
    label: 'آخر 7 أيام', 
    getValue: () => {
      const today = new Date();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
      const startOfSevenDaysAgo = new Date(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate(), 0, 0, 0, 0);
      return {
        from: startOfSevenDaysAgo,
        to: endOfDay
      };
    }
  },
  { 
    label: 'آخر 30 يوم', 
    getValue: () => {
      const today = new Date();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      const startOfThirtyDaysAgo = new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0);
      return {
        from: startOfThirtyDaysAgo,
        to: endOfDay
      };
    }
  },
  { 
    label: 'آخر 3 أشهر', 
    getValue: () => {
      const today = new Date();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
      const threeMonthsAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
      const startOfThreeMonthsAgo = new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth(), threeMonthsAgo.getDate(), 0, 0, 0, 0);
      return {
        from: startOfThreeMonthsAgo,
        to: endOfDay
      };
    }
  }
];

// تنسيق التاريخ
const formatDate = (date: Date): string => {
  return date.toLocaleDateString('fr-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * مكون الفلاتر لصفحة تتبع المخزون
 */
const InventoryFilters: React.FC<InventoryFiltersProps> = ({
  filters,
  onFiltersChange,
  operationTypes
}) => {
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState(filters.dateRange);

  // إدارة البحث البسيط - فقط عند الضغط على Enter أو مسح النص
  const [localSearchTerm, setLocalSearchTerm] = useState(filters.searchTerm || '');
  
  // تحديث المصطلح المحلي عندما تتغير الفلاتر من الخارج
  useEffect(() => {
    setLocalSearchTerm(filters.searchTerm || '');
  }, [filters.searchTerm]);

  // البحث الفوري فقط عند مسح النص
  useEffect(() => {
    if (localSearchTerm === '' && filters.searchTerm !== '') {
      onFiltersChange({ searchTerm: '' });
    }
  }, [localSearchTerm, filters.searchTerm, onFiltersChange]);

  // تحديث المصطلح المحلي فقط
  const handleSearchChange = useCallback((value: string) => {
    setLocalSearchTerm(value);
  }, []);

  // البحث فقط عند الضغط على Enter
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onFiltersChange({ searchTerm: localSearchTerm });
    }
  }, [localSearchTerm, onFiltersChange]);

  // تحديث أنواع العمليات
  const handleOperationTypeToggle = useCallback((operationType: string) => {
    const currentTypes = filters.operationTypes || [];
    const updatedTypes = currentTypes.includes(operationType)
      ? currentTypes.filter(type => type !== operationType)
      : [...currentTypes, operationType];
    
    onFiltersChange({ operationTypes: updatedTypes });
  }, [filters.operationTypes, onFiltersChange]);

  // تطبيق نطاق زمني سريع
  const handleQuickDateRange = useCallback((range: { from: Date; to: Date }) => {
    onFiltersChange({ dateRange: range });
    setTempDateRange(range);
    setIsDatePickerOpen(false);
  }, [onFiltersChange]);

  // تطبيق النطاق الزمني المخصص
  const handleCustomDateRange = useCallback(() => {
    if (tempDateRange) {
      onFiltersChange({ dateRange: tempDateRange });
    }
    setIsDatePickerOpen(false);
  }, [tempDateRange, onFiltersChange]);

  // إعادة تعيين الفلاتر
  const handleResetFilters = useCallback(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const resetDateRange = {
      from: new Date(thirtyDaysAgo.getFullYear(), thirtyDaysAgo.getMonth(), thirtyDaysAgo.getDate(), 0, 0, 0, 0),
      to: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999)
    };
    
    onFiltersChange({
      dateRange: resetDateRange,
      productIds: [],
      userIds: [],
      operationTypes: [],
      searchTerm: ''
    });
    setTempDateRange(resetDateRange);
  }, [onFiltersChange]);

  // حساب عدد الفلاتر النشطة
  const activeFiltersCount = 
    (filters.operationTypes?.length || 0) +
    (filters.productIds?.length || 0) +
    (filters.userIds?.length || 0) +
    (filters.searchTerm ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-background/95 border-border/50 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* البحث النصي */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="اكتب واضغط Enter للبحث..."
                  value={localSearchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pr-10 bg-background"
                />
                {localSearchTerm && localSearchTerm !== filters.searchTerm && (
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs">
                    <span className="text-muted-foreground bg-background px-1 rounded">
                      اضغط Enter للبحث
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* فلتر التاريخ */}
            <div className="flex-shrink-0">
              <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full lg:w-auto justify-start text-right font-normal",
                      !filters.dateRange && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="ml-2 h-4 w-4" />
                    {filters.dateRange ? (
                      `${formatDate(filters.dateRange.from)} - ${formatDate(filters.dateRange.to)}`
                    ) : (
                      'اختر الفترة الزمنية'
                    )}
                    <ChevronDown className="mr-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-4 space-y-4">
                    {/* خيارات سريعة */}
                    <div>
                      <Label className="text-sm font-medium">فترات سريعة</Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {quickDateRanges.map((range, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickDateRange(range.getValue())}
                            className="text-xs"
                          >
                            {range.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* اختيار مخصص */}
                    <div>
                      <Label className="text-sm font-medium">اختيار مخصص</Label>
                      <div className="mt-2 space-y-2">
                        <CalendarComponent
                          mode="range"
                          selected={tempDateRange}
                          onSelect={(range) => {
                            if (range?.from && range?.to) {
                              setTempDateRange({ from: range.from, to: range.to });
                            }
                          }}
                          numberOfMonths={2}
                          className="rounded-md border"
                        />
                        <div className="flex gap-2">
                          <Button
                            onClick={handleCustomDateRange}
                            disabled={!tempDateRange}
                            size="sm"
                            className="flex-1"
                          >
                            تطبيق
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => setIsDatePickerOpen(false)}
                            size="sm"
                            className="flex-1"
                          >
                            إلغاء
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* فلتر أنواع العمليات */}
            <div className="flex-shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-auto">
                    <Filter className="ml-2 h-4 w-4" />
                    أنواع العمليات
                    {filters.operationTypes?.length ? (
                      <Badge variant="secondary" className="mr-2">
                        {filters.operationTypes.length}
                      </Badge>
                    ) : null}
                    <ChevronDown className="mr-2 h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64">
                  <div className="space-y-3">
                    <div className="font-medium text-sm">اختر أنواع العمليات</div>
                    <div className="space-y-2">
                      {operationTypes.map((type) => (
                        <div
                          key={type.value}
                          className="flex items-center space-x-2 space-x-reverse"
                        >
                          <input
                            type="checkbox"
                            id={type.value}
                            checked={filters.operationTypes?.includes(type.value) || false}
                            onChange={() => handleOperationTypeToggle(type.value)}
                            className="rounded border-gray-300"
                          />
                          <label
                            htmlFor={type.value}
                            className="flex items-center gap-2 text-sm font-medium cursor-pointer"
                          >
                            <span className={cn("w-3 h-3 rounded-full", type.color)} />
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* زر إعادة التعيين */}
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="flex-shrink-0"
              >
                <X className="h-4 w-4 ml-2" />
                إعادة تعيين
                <Badge variant="destructive" className="mr-2">
                  {activeFiltersCount}
                </Badge>
              </Button>
            )}
          </div>

          {/* عرض الفلاتر النشطة */}
          {activeFiltersCount > 0 && (
            <div className="mt-4 pt-4 border-t border-border/50">
              <div className="flex flex-wrap gap-2">
                {filters.operationTypes?.map((type) => {
                  const operationType = operationTypes.find(op => op.value === type);
                  return operationType ? (
                    <Badge
                      key={type}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      <span>{operationType.icon}</span>
                      <span>{operationType.label}</span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-destructive"
                        onClick={() => handleOperationTypeToggle(type)}
                      />
                    </Badge>
                  ) : null;
                })}

                {filters.searchTerm && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Search className="h-3 w-3" />
                    <span>"{filters.searchTerm}"</span>
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => handleSearchChange('')}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default InventoryFilters; 