"use client";

import * as React from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";

interface DateTimePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "اختر التاريخ والوقت",
  disabled,
  className,
}: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(value);
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (value) {
      return format(value, "HH:mm");
    }
    return "12:00";
  });

  React.useEffect(() => {
    setSelectedDate(value);
    if (value) {
      setTimeValue(format(value, "HH:mm"));
    }
  }, [value]);

  const updateDateTime = (date: Date | undefined, time: string) => {
    if (!date) {
      onChange?.(undefined);
      return;
    }

    const [hours, minutes] = time.split(":").map(Number);
    const newDateTime = new Date(date);
    newDateTime.setHours(hours || 12, minutes || 0, 0, 0);
    
    setSelectedDate(newDateTime);
    onChange?.(newDateTime);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      setSelectedDate(undefined);
      onChange?.(undefined);
      return;
    }
    updateDateTime(date, timeValue);
  };

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime);
    if (selectedDate) {
      updateDateTime(selectedDate, newTime);
    }
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return placeholder;
    
    return `${format(selectedDate, "dd/MM/yyyy", { locale: ar })} - ${format(selectedDate, "HH:mm")}`;
  };

  return (
    <Card className={className}>
      <CardContent className="p-4 space-y-4">
        <div className="space-y-2">
          <Label className="text-sm font-medium">التاريخ</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !selectedDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? format(selectedDate, "dd/MM/yyyy", { locale: ar }) : "اختر التاريخ"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                disabled={disabled}
                initialFocus
                locale={ar}
                dir="rtl"
                className="rounded-md border-0"
              />
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="space-y-2">
          <Label className="text-sm font-medium">الوقت</Label>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={(e) => handleTimeChange(e.target.value)}
              className="flex-1"
            />
          </div>
        </div>

        {selectedDate && (
          <div className="text-center p-2 bg-muted rounded-md">
            <div className="text-sm font-medium">
              {format(selectedDate, "EEEE، dd MMMM yyyy", { locale: ar })}
            </div>
            <div className="text-xs text-muted-foreground">
              الساعة {format(selectedDate, "HH:mm")}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default DateTimePicker;
