import React, { useState, useEffect } from 'react';
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
  Users,
  CreditCard,
  Package,
  Download,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import type { POSOrderFilters } from '../../api/posOrdersService';

interface POSOrderFiltersProps {
  filters: POSOrderFilters;
  onFiltersChange: (filters: POSOrderFilters) => void;
  onRefresh: () => void;
  onExport: () => void;
  loading?: boolean;
  employees?: Array<{ id: string; name: string; email: string }>;
  className?: string;
}

const ORDER_STATUSES = [
  { value: 'pending', label: 'معلقة', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'completed', label: 'مكتملة', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'ملغاة', color: 'bg-red-100 text-red-800' },
  { value: 'processing', label: 'قيد المعالجة', color: 'bg-blue-100 text-blue-800' }
];

const PAYMENT_METHODS = [
  { value: 'cash', label: 'نقدي', icon: '💵' },
  { value: 'card', label: 'بطاقة', icon: '💳' },
  { value: 'credit', label: 'آجل', icon: '📝' },
  { value: 'transfer', label: 'تحويل', icon: '🏦' }
];

const PAYMENT_STATUSES = [
  { value: 'paid', label: 'مدفوع', color: 'bg-green-100 text-green-800' },
  { value: 'pending', label: 'معلق', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'partial', label: 'جزئي', color: 'bg-orange-100 text-orange-800' },
  { value: 'refunded', label: 'مُسترد', color: 'bg-purple-100 text-purple-800' }
];

export const POSOrderFilters: React.FC<POSOrderFiltersProps> = ({
  filters,
  onFiltersChange,
  onRefresh,
  onExport,
  loading = false,
  employees = [],
  className = ''
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<POSOrderFilters>(filters);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    filters.date_from ? new Date(filters.date_from) : undefined
  );
  const [dateTo, setDateTo] = useState<Date | undefined>(
    filters.date_to ? new Date(filters.date_to) : undefined
  );

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof POSOrderFilters, value: string | undefined) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleDateChange = (key: 'date_from' | 'date_to', date: Date | undefined) => {
    if (key === 'date_from') {
      setDateFrom(date);
    } else {
      setDateTo(date);
    }
    
    const dateStr = date ? format(date, 'yyyy-MM-dd') : undefined;
    handleFilterChange(key, dateStr);
  };

  const clearFilters = () => {
    const emptyFilters: POSOrderFilters = {};
    setLocalFilters(emptyFilters);
    setDateFrom(undefined);
    setDateTo(undefined);
    onFiltersChange(emptyFilters);
  };

  const getActiveFiltersCount = (): number => {
    return Object.values(localFilters).filter(value => value && value !== '').length;
  };

  const handleQuickDateFilter = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    setDateFrom(startDate);
    setDateTo(endDate);
    
    const newFilters = {
      ...localFilters,
      date_from: format(startDate, 'yyyy-MM-dd'),
      date_to: format(endDate, 'yyyy-MM-dd')
    };
    
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardContent className="p-4">
          {/* البحث الأساسي والأزرار الرئيسية */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="البحث في الطلبيات..."
                  value={localFilters.search || ''}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* فلاتر سريعة */}
              <div className="hidden sm:flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(1)}
                  className="text-xs"
                >
                  اليوم
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(7)}
                  className="text-xs"
                >
                  آخر 7 أيام
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter(30)}
                  className="text-xs"
                >
                  آخر شهر
                </Button>
              </div>

              {/* زر الفلاتر المتقدمة */}
              <Button
                variant={isAdvancedOpen ? "secondary" : "outline"}
                size="sm"
                onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                className="relative"
              >
                <Filter className="h-4 w-4 mr-2" />
                فلاتر متقدمة
                {getActiveFiltersCount() > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {getActiveFiltersCount()}
                  </Badge>
                )}
              </Button>

              {/* زر التحديث */}
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              {/* زر التصدير */}
              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                disabled={loading}
              >
                <Download className="h-4 w-4 mr-2" />
                تصدير
              </Button>

              {/* مسح الفلاتر */}
              {getActiveFiltersCount() > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-2" />
                  مسح الكل
                </Button>
              )}
            </div>
          </div>

          {/* الفلاتر المتقدمة */}
          {isAdvancedOpen && (
            <div className="mt-6 pt-4 border-t">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {/* حالة الطلبية */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    حالة الطلبية
                  </Label>
                  <Select
                    value={localFilters.status || ''}
                    onValueChange={(value) => handleFilterChange('status', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الحالات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع الحالات</SelectItem>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status.color.replace('bg-', 'bg-').replace(' text-', ' border-')}`} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* طريقة الدفع */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    طريقة الدفع
                  </Label>
                  <Select
                    value={localFilters.payment_method || ''}
                    onValueChange={(value) => handleFilterChange('payment_method', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع الطرق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع الطرق</SelectItem>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method.value} value={method.value}>
                          <div className="flex items-center gap-2">
                            <span>{method.icon}</span>
                            {method.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* حالة الدفع */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">حالة الدفع</Label>
                  <Select
                    value={localFilters.payment_status || ''}
                    onValueChange={(value) => handleFilterChange('payment_status', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="جميع حالات الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">جميع حالات الدفع</SelectItem>
                      {PAYMENT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${status.color.replace('bg-', 'bg-').replace(' text-', ' border-')}`} />
                            {status.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* الموظف */}
                {employees.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      الموظف
                    </Label>
                    <Select
                      value={localFilters.employee_id || ''}
                      onValueChange={(value) => handleFilterChange('employee_id', value || undefined)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="جميع الموظفين" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">جميع الموظفين</SelectItem>
                        {employees.map((employee) => (
                          <SelectItem key={employee.id} value={employee.id}>
                            {employee.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* تاريخ البداية */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    من تاريخ
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateFrom ? format(dateFrom, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateFrom}
                        onSelect={(date) => handleDateChange('date_from', date)}
                        initialFocus
                        locale={ar}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* تاريخ النهاية */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4" />
                    إلى تاريخ
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateTo ? format(dateTo, 'dd/MM/yyyy', { locale: ar }) : 'اختر التاريخ'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateTo}
                        onSelect={(date) => handleDateChange('date_to', date)}
                        initialFocus
                        locale={ar}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* الفلاتر النشطة */}
              {getActiveFiltersCount() > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-muted-foreground">الفلاتر النشطة:</span>
                    
                    {localFilters.status && (
                      <Badge variant="secondary" className="gap-1">
                        حالة: {ORDER_STATUSES.find(s => s.value === localFilters.status)?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleFilterChange('status', undefined)}
                        />
                      </Badge>
                    )}
                    
                    {localFilters.payment_method && (
                      <Badge variant="secondary" className="gap-1">
                        دفع: {PAYMENT_METHODS.find(m => m.value === localFilters.payment_method)?.label}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleFilterChange('payment_method', undefined)}
                        />
                      </Badge>
                    )}
                    
                    {localFilters.employee_id && (
                      <Badge variant="secondary" className="gap-1">
                        موظف: {employees.find(e => e.id === localFilters.employee_id)?.name}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleFilterChange('employee_id', undefined)}
                        />
                      </Badge>
                    )}
                    
                    {(localFilters.date_from || localFilters.date_to) && (
                      <Badge variant="secondary" className="gap-1">
                        فترة: {localFilters.date_from} - {localFilters.date_to}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => {
                            handleFilterChange('date_from', undefined);
                            handleFilterChange('date_to', undefined);
                            setDateFrom(undefined);
                            setDateTo(undefined);
                          }}
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
