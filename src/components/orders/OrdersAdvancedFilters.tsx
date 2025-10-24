import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Search,
  Filter,
  Calendar as CalendarIcon,
  Save,
  Plus,
  Check,
  SlidersHorizontal,
  X,
  Trash,
  Share
} from "lucide-react";

type OrderStatus = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

type FilterSet = {
  name: string;
  status?: OrderStatus;
  dateRange?: {
    from: Date | undefined;
    to: Date | undefined;
  };
  searchTerm?: string;
  paymentMethod?: string[];
  minAmount?: number;
  maxAmount?: number;
};

type OrdersAdvancedFiltersProps = {
  orderCounts: {
    all: number;
    pending: number;
    processing: number;
    shipped: number;
    delivered: number;
    cancelled: number;
  };
  onFilterChange: (filters: any) => void;
  activeStatus: OrderStatus;
  setActiveStatus: (status: OrderStatus) => void;
};

const OrdersAdvancedFilters = ({
  orderCounts,
  onFilterChange,
  activeStatus,
  setActiveStatus
}: OrdersAdvancedFiltersProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [savedFilters, setSavedFilters] = useState<FilterSet[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterSet>({
    name: "",
    status: 'all',
    searchTerm: "",
  });
  const [saveFilterDialogOpen, setSaveFilterDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  // ترجمة الحالات إلى العربية
  const statusTranslations = {
    'all': 'الكل',
    'pending': 'معلق',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الإرسال',
    'delivered': 'تم الاستلام',
    'cancelled': 'ملغي',
  };

  // نظام الألوان والرموز للحالات
  const statusIcons = {
    'pending': <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400 ml-1">{orderCounts.pending}</Badge>,
    'processing': <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400 ml-1">{orderCounts.processing}</Badge>,
    'shipped': <Badge variant="outline" className="bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-400 ml-1">{orderCounts.shipped}</Badge>,
    'delivered': <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 ml-1">{orderCounts.delivered}</Badge>,
    'cancelled': <Badge variant="outline" className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400 ml-1">{orderCounts.cancelled}</Badge>,
  };

  // حفظ مجموعة التصفية الحالية
  const saveCurrentFilter = (name: string) => {
    const newFilter: FilterSet = {
      name,
      status: activeStatus,
      searchTerm,
      dateRange: dateRange.from ? { ...dateRange } : undefined,
    };
    
    setSavedFilters([...savedFilters, newFilter]);
    setSaveFilterDialogOpen(false);
  };

  // تطبيق مجموعة تصفية محفوظة
  const applyFilter = (filter: FilterSet) => {
    setActiveStatus(filter.status || 'all');
    setSearchTerm(filter.searchTerm || "");
    setDateRange(filter.dateRange || { from: undefined, to: undefined });
    
    // تحديث الواجهة بالفلاتر النشطة
    const newActiveFilters = [];
    if (filter.status && filter.status !== 'all') {
      newActiveFilters.push(`الحالة: ${statusTranslations[filter.status]}`);
    }
    if (filter.searchTerm) {
      newActiveFilters.push(`بحث: ${filter.searchTerm}`);
    }
    if (filter.dateRange?.from) {
      newActiveFilters.push(`التاريخ: ${filter.dateRange.from.toLocaleDateString()} - ${filter.dateRange.to?.toLocaleDateString() || 'الآن'}`);
    }
    setActiveFilters(newActiveFilters);
    
    // إرسال حالة التصفية للكومبوننت الأب
    onFilterChange({
      status: filter.status || 'all',
      searchTerm: filter.searchTerm || "",
      dateRange: filter.dateRange,
    });
  };

  // إرسال التغييرات للكومبوننت الأب عند تغيير البحث
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    
    // Send filter change (debouncing is handled in the hook)
    onFilterChange({
      status: activeStatus,
      searchTerm: newSearchTerm,
      dateRange,
    });
  };

  // إعادة تعيين كل المرشحات
  const resetAllFilters = () => {
    setActiveStatus('all');
    setSearchTerm("");
    setDateRange({ from: undefined, to: undefined });
    setActiveFilters([]);
    onFilterChange({
      status: 'all',
      searchTerm: "",
      dateRange: { from: undefined, to: undefined },
    });
  };

  // تطبيق مرشح نطاق التاريخ
  const applyDateRange = () => {
    let newActiveFilters = [...activeFilters];
    const dateFilterIndex = newActiveFilters.findIndex(f => f.startsWith('التاريخ:'));
    
    if (dateRange.from) {
      const dateFilterText = `التاريخ: ${dateRange.from.toLocaleDateString()} - ${dateRange.to?.toLocaleDateString() || 'الآن'}`;
      
      if (dateFilterIndex >= 0) {
        newActiveFilters[dateFilterIndex] = dateFilterText;
      } else {
        newActiveFilters.push(dateFilterText);
      }
    } else if (dateFilterIndex >= 0) {
      newActiveFilters.splice(dateFilterIndex, 1);
    }
    
    setActiveFilters(newActiveFilters);
    onFilterChange({
      status: activeStatus,
      searchTerm,
      dateRange,
    });
  };

  return (
    <div className="space-y-6">
      {/* Status Filter Cards - Clean and Professional */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Filter className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">تصفية حسب الحالة</h3>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-6 gap-2 md:gap-3">
          <button
            onClick={() => setActiveStatus('all')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'all'
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border/20 hover:border-border/40 hover:bg-muted/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1">{orderCounts.all}</div>
              <div className="text-[10px] md:text-xs font-medium text-muted-foreground">الكل</div>
            </div>
            {activeStatus === 'all' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"></div>
            )}
          </button>

          <button
            onClick={() => setActiveStatus('pending')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'pending'
                ? 'border-amber-300 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                : 'border-border/20 hover:border-amber-200 hover:bg-amber-50/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1 text-amber-700 dark:text-amber-400">{orderCounts.pending}</div>
              <div className="text-[10px] md:text-xs font-medium text-amber-600 dark:text-amber-500">معلق</div>
            </div>
            {activeStatus === 'pending' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500"></div>
            )}
          </button>

          <button
            onClick={() => setActiveStatus('processing')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'processing'
                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 shadow-sm'
                : 'border-border/20 hover:border-blue-200 hover:bg-blue-50/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1 text-blue-700 dark:text-blue-400">{orderCounts.processing}</div>
              <div className="text-[10px] md:text-xs font-medium text-blue-600 dark:text-blue-500 leading-tight">قيد المعالجة</div>
            </div>
            {activeStatus === 'processing' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-500"></div>
            )}
          </button>

          <button
            onClick={() => setActiveStatus('shipped')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'shipped'
                ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                : 'border-border/20 hover:border-purple-200 hover:bg-purple-50/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1 text-purple-700 dark:text-purple-400">{orderCounts.shipped}</div>
              <div className="text-[10px] md:text-xs font-medium text-purple-600 dark:text-purple-500 leading-tight">تم الشحن</div>
            </div>
            {activeStatus === 'shipped' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-purple-500"></div>
            )}
          </button>

          <button
            onClick={() => setActiveStatus('delivered')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'delivered'
                ? 'border-green-300 bg-green-50 dark:bg-green-900/20 shadow-sm'
                : 'border-border/20 hover:border-green-200 hover:bg-green-50/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1 text-green-700 dark:text-green-400">{orderCounts.delivered}</div>
              <div className="text-[10px] md:text-xs font-medium text-green-600 dark:text-green-500">مكتمل</div>
            </div>
            {activeStatus === 'delivered' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-green-500"></div>
            )}
          </button>

          <button
            onClick={() => setActiveStatus('cancelled')}
            className={`group relative overflow-hidden rounded-lg border transition-all duration-200 ${
              activeStatus === 'cancelled'
                ? 'border-red-300 bg-red-50 dark:bg-red-900/20 shadow-sm'
                : 'border-border/20 hover:border-red-200 hover:bg-red-50/30'
            }`}
          >
            <div className="p-3 md:p-4 text-center">
              <div className="text-lg md:text-xl font-bold mb-0.5 md:mb-1 text-red-700 dark:text-red-400">{orderCounts.cancelled}</div>
              <div className="text-[10px] md:text-xs font-medium text-red-600 dark:text-red-500">ملغي</div>
            </div>
            {activeStatus === 'cancelled' && (
              <div className="absolute inset-x-0 bottom-0 h-0.5 bg-red-500"></div>
            )}
          </button>
        </div>
      </div>
      
      {/* Search and Filters Bar - Clean Design */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Search className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">البحث والمرشحات</h3>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="البحث في الطلبات..."
              className="pl-10 pr-4 h-11 md:h-10 text-sm border-border/20 focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all" 
              value={searchTerm}
              onChange={handleSearchChange}
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  onFilterChange({ status: activeStatus, searchTerm: "", dateRange });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          
          {/* Date Range Picker */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={`h-11 md:h-10 px-3 md:px-4 border-border/20 hover:border-primary/40 transition-all text-sm ${
                  dateRange.from ? 'bg-primary/5 border-primary/20 text-primary' : ''
                }`}
              >
                <CalendarIcon className="h-4 w-4 ml-2 flex-shrink-0" />
                {dateRange.from ? (
                  <span className="font-medium text-xs md:text-sm truncate">
                    {dateRange.from.toLocaleDateString('ar-DZ', { month: 'numeric', day: 'numeric' })} - {dateRange.to?.toLocaleDateString('ar-DZ', { month: 'numeric', day: 'numeric' }) || "الآن"}
                  </span>
                ) : (
                  <span className="text-xs md:text-sm">اختر الفترة</span>
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
                className="border-0"
              />
              <div className="p-3 border-t bg-muted/30 flex justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange({ from: undefined, to: undefined });
                    onFilterChange({ status: activeStatus, searchTerm, dateRange: { from: undefined, to: undefined } });
                  }}
                >
                  مسح التاريخ
                </Button>
                <Button size="sm" onClick={applyDateRange}>
                  تطبيق
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-11 md:h-10 px-3 md:px-4 border-border/20 hover:border-primary/40 transition-all">
                  <SlidersHorizontal className="h-4 w-4 md:ml-2" />
                  <span className="hidden md:inline text-sm ml-1">المزيد</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>خيارات إضافية</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={true}>
                  تصدير إلى Excel
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={false}>
                  طباعة التقرير
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem checked={false}>
                  حفظ عرض مخصص
                </DropdownMenuCheckboxItem>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem checked={false}>
                  تحديث تلقائي
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {(searchTerm || dateRange.from || activeStatus !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetAllFilters}
                className="h-11 md:h-10 px-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4 ml-1" />
                <span className="text-xs md:text-sm">مسح</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersAdvancedFilters;
