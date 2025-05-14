import { useState } from "react";
import { Check, ChevronsUpDown, Filter, X } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

// تعريف نوع الفلتر للطلبات المتروكة
export interface AbandonedOrdersFilter {
  duration?: {
    min?: number; // الحد الأدنى للمدة بالساعات
    max?: number; // الحد الأقصى للمدة بالساعات
  };
  value?: {
    min?: number; // الحد الأدنى للقيمة
    max?: number; // الحد الأقصى للقيمة
  };
  date?: {
    start?: Date;
    end?: Date;
  };
  itemCount?: {
    min?: number;
    max?: number;
  };
  source?: string[]; // مصدر الطلب (موبايل، متصفح، إلخ)
  hasContactInfo?: boolean; // هل يوجد معلومات اتصال
}

// Props لمكون الفلاتر
interface AbandonedOrdersFiltersProps {
  filters: AbandonedOrdersFilter;
  onFiltersChange: (filters: AbandonedOrdersFilter) => void;
  sources: { label: string; value: string }[];
  onReset: () => void;
}

// مكون الفلاتر للطلبات المتروكة
export function AbandonedOrdersFilters({
  filters,
  onFiltersChange,
  sources,
  onReset,
}: AbandonedOrdersFiltersProps) {
  const [openSourcesMenu, setOpenSourcesMenu] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempFilters, setTempFilters] = useState<AbandonedOrdersFilter>(filters);
  
  // عدد الفلاتر النشطة
  const getActiveFiltersCount = () => {
    let count = 0;
    
    if (filters.duration?.min || filters.duration?.max) count++;
    if (filters.value?.min || filters.value?.max) count++;
    if (filters.date?.start || filters.date?.end) count++;
    if (filters.itemCount?.min || filters.itemCount?.max) count++;
    if (filters.source && filters.source.length > 0) count++;
    if (filters.hasContactInfo !== undefined) count++;
    
    return count;
  };
  
  // تحديد المصادر المحددة
  const selectedSources = filters.source || [];
  
  // تطبيق الفلاتر
  const applyFilters = () => {
    onFiltersChange(tempFilters);
    setSheetOpen(false);
  };
  
  // تنسيق تاريخ البداية والنهاية
  const formattedDateRange = () => {
    if (!filters.date?.start && !filters.date?.end) return "جميع التواريخ";
    
    if (filters.date?.start && filters.date?.end) {
      return `${format(filters.date.start, "yyyy/MM/dd", { locale: ar })} - ${format(filters.date.end, "yyyy/MM/dd", { locale: ar })}`;
    }
    
    if (filters.date?.start) {
      return `من ${format(filters.date.start, "yyyy/MM/dd", { locale: ar })}`;
    }
    
    return `حتى ${format(filters.date?.end as Date, "yyyy/MM/dd", { locale: ar })}`;
  };
  
  return (
    <div className="space-y-4">
      {/* فلاتر سريعة */}
      <div className="flex flex-wrap gap-2">
        {/* زر فتح نافذة الفلاتر */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="h-9">
              <Filter className="h-4 w-4 ml-2" />
              فلاتر متقدمة
              {getActiveFiltersCount() > 0 && (
                <Badge className="mr-2 h-5 w-5 rounded-full p-0 text-xs" variant="secondary">
                  {getActiveFiltersCount()}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full sm:max-w-md" side="right">
            <SheetHeader>
              <SheetTitle>فلاتر الطلبات المتروكة</SheetTitle>
              <SheetDescription>
                اضبط الفلاتر لعرض الطلبات المتروكة التي تهمك
              </SheetDescription>
            </SheetHeader>
            
            <div className="flex flex-col gap-6 py-6">
              {/* مدة الترك */}
              <div className="space-y-2">
                <Label className="text-base font-medium">مدة الترك (بالساعات)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>من</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={tempFilters.duration?.min ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        duration: {
                          ...prev.duration,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>إلى</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={tempFilters.duration?.max ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        duration: {
                          ...prev.duration,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* قيمة الطلب */}
              <div className="space-y-2">
                <Label className="text-base font-medium">قيمة الطلب (دج)</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>من</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={tempFilters.value?.min ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        value: {
                          ...prev.value,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>إلى</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={tempFilters.value?.max ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        value: {
                          ...prev.value,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* تاريخ الطلب */}
              <div className="space-y-2">
                <Label className="text-base font-medium">تاريخ الطلب</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-right">
                      {tempFilters.date?.start || tempFilters.date?.end ? (
                        <>
                          {tempFilters.date?.start && format(tempFilters.date.start, "yyyy/MM/dd", { locale: ar })}
                          {tempFilters.date?.start && tempFilters.date?.end && " - "}
                          {tempFilters.date?.end && format(tempFilters.date.end, "yyyy/MM/dd", { locale: ar })}
                        </>
                      ) : (
                        "اختر التاريخ"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      locale={ar}
                      mode="range"
                      selected={{
                        from: tempFilters.date?.start,
                        to: tempFilters.date?.end,
                      }}
                      onSelect={(range) => {
                        setTempFilters(prev => ({
                          ...prev,
                          date: {
                            start: range?.from,
                            end: range?.to,
                          }
                        }));
                        // إغلاق منتقي التاريخ عند الاختيار
                        if (range?.to) setDatePickerOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <Separator />
              
              {/* عدد العناصر */}
              <div className="space-y-2">
                <Label className="text-base font-medium">عدد العناصر</Label>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label>من</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={tempFilters.itemCount?.min ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        itemCount: {
                          ...prev.itemCount,
                          min: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                  <div className="flex-1">
                    <Label>إلى</Label>
                    <Input
                      type="number"
                      placeholder="∞"
                      value={tempFilters.itemCount?.max ?? ""}
                      onChange={(e) => setTempFilters(prev => ({
                        ...prev,
                        itemCount: {
                          ...prev.itemCount,
                          max: e.target.value ? parseInt(e.target.value) : undefined
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* مصدر الطلب */}
              <div className="space-y-2">
                <Label className="text-base font-medium">مصدر الطلب</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sources.map((source) => (
                    <div key={source.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`source-${source.value}`}
                        checked={tempFilters.source?.includes(source.value)}
                        onCheckedChange={(checked) => {
                          const newSources = tempFilters.source || [];
                          if (checked) {
                            setTempFilters(prev => ({
                              ...prev,
                              source: [...newSources, source.value],
                            }));
                          } else {
                            setTempFilters(prev => ({
                              ...prev,
                              source: newSources.filter(s => s !== source.value),
                            }));
                          }
                        }}
                      />
                      <Label htmlFor={`source-${source.value}`} className="ml-2 mr-4">
                        {source.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              
              <Separator />
              
              {/* معلومات الاتصال */}
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasContactInfo"
                    checked={tempFilters.hasContactInfo}
                    onCheckedChange={(checked) => {
                      setTempFilters(prev => ({
                        ...prev,
                        hasContactInfo: checked === true,
                      }));
                    }}
                  />
                  <Label htmlFor="hasContactInfo" className="mr-2">
                    عرض الطلبات التي تحتوي على معلومات اتصال فقط
                  </Label>
                </div>
              </div>
            </div>
            
            <SheetFooter className="flex flex-row gap-2 sm:justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setTempFilters({});
                  onReset();
                  setSheetOpen(false);
                }}
              >
                إعادة ضبط
              </Button>
              <Button onClick={applyFilters}>تطبيق الفلاتر</Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        
        {/* فلتر المدة */}
        <Select
          value={
            filters.duration?.min !== undefined || filters.duration?.max !== undefined
              ? "custom"
              : "all"
          }
          onValueChange={(value) => {
            if (value === "all") {
              onFiltersChange({
                ...filters,
                duration: undefined,
              });
              return;
            }
            
            // تعيين القيم المناسبة حسب الاختيار
            let min: number | undefined;
            let max: number | undefined;
            
            switch (value) {
              case "1h":
                min = 0;
                max = 1;
                break;
              case "1-24h":
                min = 1;
                max = 24;
                break;
              case "24-48h":
                min = 24;
                max = 48;
                break;
              case "48h+":
                min = 48;
                max = undefined;
                break;
              default:
                // الفلتر الحالي
                min = filters.duration?.min;
                max = filters.duration?.max;
            }
            
            onFiltersChange({
              ...filters,
              duration: { min, max },
            });
          }}
        >
          <SelectTrigger className="h-9 md:w-[180px]">
            <SelectValue placeholder="جميع المدد" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع المدد</SelectItem>
            <SelectItem value="1h">أقل من ساعة</SelectItem>
            <SelectItem value="1-24h">1 - 24 ساعة</SelectItem>
            <SelectItem value="24-48h">24 - 48 ساعة</SelectItem>
            <SelectItem value="48h+">أكثر من 48 ساعة</SelectItem>
            {(filters.duration?.min !== undefined || filters.duration?.max !== undefined) && (
              <SelectItem value="custom">
                فلتر مخصص
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* فلتر القيمة */}
        <Select
          value={
            filters.value?.min !== undefined || filters.value?.max !== undefined
              ? "custom"
              : "all"
          }
          onValueChange={(value) => {
            if (value === "all") {
              onFiltersChange({
                ...filters,
                value: undefined,
              });
              return;
            }
            
            // تعيين القيم المناسبة حسب الاختيار
            let min: number | undefined;
            let max: number | undefined;
            
            switch (value) {
              case "low":
                min = 0;
                max = 1000;
                break;
              case "medium":
                min = 1000;
                max = 5000;
                break;
              case "high":
                min = 5000;
                max = 10000;
                break;
              case "vhigh":
                min = 10000;
                max = undefined;
                break;
              default:
                // الفلتر الحالي
                min = filters.value?.min;
                max = filters.value?.max;
            }
            
            onFiltersChange({
              ...filters,
              value: { min, max },
            });
          }}
        >
          <SelectTrigger className="h-9 hidden md:flex md:w-[180px]">
            <SelectValue placeholder="جميع القيم" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع القيم</SelectItem>
            <SelectItem value="low">أقل من 1,000 دج</SelectItem>
            <SelectItem value="medium">1,000 - 5,000 دج</SelectItem>
            <SelectItem value="high">5,000 - 10,000 دج</SelectItem>
            <SelectItem value="vhigh">أكثر من 10,000 دج</SelectItem>
            {(filters.value?.min !== undefined || filters.value?.max !== undefined) && (
              <SelectItem value="custom">
                فلتر مخصص
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        
        {/* فلتر المصدر */}
        {sources.length > 0 && (
          <Popover open={openSourcesMenu} onOpenChange={setOpenSourcesMenu}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 hidden md:flex"
              >
                <span className="ml-1">المصدر</span>
                {selectedSources.length > 0 && (
                  <Badge className="ml-1 rounded-sm px-1 font-normal" variant="secondary">
                    {selectedSources.length}
                  </Badge>
                )}
                <ChevronsUpDown className="h-4 w-4 opacity-50 mr-1" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
              <Command>
                <CommandInput placeholder="ابحث..." />
                <CommandEmpty>لا توجد نتائج</CommandEmpty>
                <CommandGroup>
                  {sources.map((source) => (
                    <CommandItem
                      key={source.value}
                      onSelect={() => {
                        const isSelected = selectedSources.includes(source.value);
                        let newSources: string[];
                        
                        if (isSelected) {
                          newSources = selectedSources.filter(s => s !== source.value);
                        } else {
                          newSources = [...selectedSources, source.value];
                        }
                        
                        onFiltersChange({
                          ...filters,
                          source: newSources,
                        });
                      }}
                    >
                      <div
                        className={cn(
                          "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                          selectedSources.includes(source.value)
                            ? "bg-primary text-primary-foreground"
                            : "opacity-50 [&_svg]:invisible"
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{source.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      </div>
      
      {/* عرض الفلاتر النشطة */}
      {getActiveFiltersCount() > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {filters.duration?.min !== undefined || filters.duration?.max !== undefined ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>
                المدة: 
                {filters.duration?.min !== undefined ? ` من ${filters.duration.min} ساعة` : ""}
                {filters.duration?.min !== undefined && filters.duration?.max !== undefined ? " - " : ""}
                {filters.duration?.max !== undefined ? `حتى ${filters.duration.max} ساعة` : ""}
                {filters.duration?.min === undefined && filters.duration?.max === undefined ? " جميع المدد" : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, duration: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {filters.value?.min !== undefined || filters.value?.max !== undefined ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>
                القيمة: 
                {filters.value?.min !== undefined ? ` من ${filters.value.min} دج` : ""}
                {filters.value?.min !== undefined && filters.value?.max !== undefined ? " - " : ""}
                {filters.value?.max !== undefined ? `حتى ${filters.value.max} دج` : ""}
                {filters.value?.min === undefined && filters.value?.max === undefined ? " جميع القيم" : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, value: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {filters.date?.start || filters.date?.end ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>التاريخ: {formattedDateRange()}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, date: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {filters.itemCount?.min !== undefined || filters.itemCount?.max !== undefined ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>
                عدد العناصر: 
                {filters.itemCount?.min !== undefined ? ` من ${filters.itemCount.min}` : ""}
                {filters.itemCount?.min !== undefined && filters.itemCount?.max !== undefined ? " - " : ""}
                {filters.itemCount?.max !== undefined ? `حتى ${filters.itemCount.max}` : ""}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, itemCount: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {filters.source && filters.source.length > 0 ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>المصدر: {filters.source.length} محدد</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, source: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {filters.hasContactInfo !== undefined ? (
            <Badge variant="secondary" className="flex gap-1 items-center">
              <span>يحتوي على معلومات اتصال</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => onFiltersChange({ ...filters, hasContactInfo: undefined })}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ) : null}
          
          {getActiveFiltersCount() > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={onReset}
            >
              إعادة ضبط الكل
            </Button>
          )}
        </div>
      )}
    </div>
  );
} 