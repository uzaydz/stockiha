import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { LegacyDateRange as DateRange, DatePreset } from './types';
import { getDateRangeFromPreset } from './useAnalyticsData';

interface DateRangePickerProps {
  dateRange: DateRange;
  preset: DatePreset;
  onDateRangeChange: (range: DateRange, preset: DatePreset) => void;
}

const presetOptions: { value: DatePreset; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'yesterday', label: 'أمس' },
  { value: 'week', label: 'آخر 7 أيام' },
  { value: 'month', label: 'آخر 30 يوم' },
  { value: 'quarter', label: 'آخر 3 أشهر' },
  { value: 'year', label: 'آخر سنة' },
  { value: 'custom', label: 'مخصص' },
];

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  preset,
  onDateRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(dateRange);

  const handlePresetChange = (newPreset: DatePreset) => {
    if (newPreset === 'custom') {
      setIsOpen(true);
    } else {
      const newRange = getDateRangeFromPreset(newPreset);
      onDateRangeChange(newRange, newPreset);
    }
  };

  const handleDateSelect = (date: Date | undefined, type: 'from' | 'to') => {
    if (!date) return;

    const newRange = { ...tempRange };
    if (type === 'from') {
      newRange.from = date;
      if (date > tempRange.to) {
        newRange.to = date;
      }
    } else {
      newRange.to = date;
      if (date < tempRange.from) {
        newRange.from = date;
      }
    }
    setTempRange(newRange);
  };

  const handleApply = () => {
    onDateRangeChange(tempRange, 'custom');
    setIsOpen(false);
  };

  const formatDateRange = (): string => {
    if (preset !== 'custom') {
      return presetOptions.find(p => p.value === preset)?.label || '';
    }
    return `${format(dateRange.from, 'd MMM', { locale: ar })} - ${format(dateRange.to, 'd MMM yyyy', { locale: ar })}`;
  };

  return (
    <div className="flex items-center gap-2">
      {/* اختيار الفترة المحددة مسبقاً */}
      <Select value={preset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="اختر الفترة" />
        </SelectTrigger>
        <SelectContent>
          {presetOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* اختيار تاريخ مخصص */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-right font-normal min-w-[200px]",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="ml-2 h-4 w-4" />
            <span>{formatDateRange()}</span>
            <ChevronDown className="mr-auto h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex flex-col sm:flex-row">
            {/* تقويم تاريخ البداية */}
            <div className="border-l border-gray-200 dark:border-gray-700">
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-center">من</p>
              </div>
              <Calendar
                mode="single"
                selected={tempRange.from}
                onSelect={(date) => handleDateSelect(date, 'from')}
                locale={ar}
                disabled={(date) => date > new Date()}
              />
            </div>

            {/* تقويم تاريخ النهاية */}
            <div>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <p className="text-sm font-medium text-center">إلى</p>
              </div>
              <Calendar
                mode="single"
                selected={tempRange.to}
                onSelect={(date) => handleDateSelect(date, 'to')}
                locale={ar}
                disabled={(date) => date > new Date() || date < tempRange.from}
              />
            </div>
          </div>

          {/* أزرار التحكم */}
          <div className="flex items-center justify-between p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-muted-foreground">
              {format(tempRange.from, 'd MMM', { locale: ar })} - {format(tempRange.to, 'd MMM yyyy', { locale: ar })}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
                إلغاء
              </Button>
              <Button size="sm" onClick={handleApply}>
                تطبيق
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateRangePicker;
