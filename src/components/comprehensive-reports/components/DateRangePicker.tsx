/**
 * مكون اختيار نطاق التاريخ
 * تصميم بسيط ومتناسق
 */

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { CalendarIcon, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { DateRange, DatePreset } from '../types';
import { getDateRangeFromPreset } from '../utils';
import { DATE_PRESETS } from '../constants';

interface DateRangePickerProps {
  dateRange: DateRange;
  preset: DatePreset;
  onDateRangeChange: (range: DateRange, preset: DatePreset) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  preset,
  onDateRangeChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const handlePresetChange = (newPreset: DatePreset) => {
    if (newPreset === 'custom') {
      setIsCalendarOpen(true);
    } else {
      const newRange = getDateRangeFromPreset(newPreset);
      onDateRangeChange(newRange, newPreset);
      setIsOpen(false);
    }
  };

  const handleCustomDateChange = (range: { from?: Date; to?: Date } | undefined) => {
    if (range?.from && range?.to) {
      onDateRangeChange({ from: range.from, to: range.to }, 'custom');
    } else if (range?.from) {
      onDateRangeChange({ from: range.from, to: range.from }, 'custom');
    }
  };

  const presetLabel = DATE_PRESETS[preset]?.label || 'مخصص';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-between gap-2 min-w-[200px] border-zinc-200 dark:border-zinc-700',
            !dateRange && 'text-muted-foreground'
          )}
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-zinc-500" />
            <span className="text-sm">{presetLabel}</span>
          </div>
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          {/* قائمة الفترات المحددة مسبقاً */}
          <div className="border-l border-zinc-200 dark:border-zinc-700 p-2 space-y-1">
            {Object.entries(DATE_PRESETS).map(([key, value]) => (
              <Button
                key={key}
                variant={preset === key ? 'default' : 'ghost'}
                size="sm"
                className={cn(
                  'w-full justify-start text-right',
                  preset === key && 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                )}
                onClick={() => handlePresetChange(key as DatePreset)}
              >
                {value.label}
              </Button>
            ))}
          </div>

          {/* التقويم المخصص */}
          {(isCalendarOpen || preset === 'custom') && (
            <div className="p-3">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={{ from: dateRange.from, to: dateRange.to }}
                onSelect={handleCustomDateChange}
                numberOfMonths={2}
                locale={ar}
                dir="rtl"
              />
              <div className="mt-3 px-2 py-2 border-t border-zinc-200 dark:border-zinc-700">
                <p className="text-xs text-zinc-500 dark:text-zinc-400 text-center">
                  {dateRange.from && dateRange.to ? (
                    <>
                      {format(dateRange.from, 'dd MMM yyyy', { locale: ar })}
                      {' - '}
                      {format(dateRange.to, 'dd MMM yyyy', { locale: ar })}
                    </>
                  ) : (
                    'اختر نطاق التاريخ'
                  )}
                </p>
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export { DateRangePicker };
