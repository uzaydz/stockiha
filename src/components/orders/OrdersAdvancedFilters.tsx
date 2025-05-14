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
    'pending': 'قيد الانتظار',
    'processing': 'قيد المعالجة',
    'shipped': 'تم الشحن',
    'delivered': 'تم التسليم',
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
    setSearchTerm(e.target.value);
    onFilterChange({
      status: activeStatus,
      searchTerm: e.target.value,
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
    <div className="space-y-2">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* شريط التبويب للحالات */}
        <Tabs value={activeStatus} onValueChange={(val) => setActiveStatus(val as OrderStatus)} className="overflow-x-auto flex-1">
          <TabsList className="grid grid-cols-3 lg:grid-cols-6 p-1">
            <TabsTrigger value="all" className="text-xs px-2 py-1.5">
              الكل
              <Badge variant="outline" className="ml-1 bg-gray-100 dark:bg-gray-800">
                {orderCounts.all}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs px-2 py-1.5">
              قيد الانتظار
              {statusIcons.pending}
            </TabsTrigger>
            <TabsTrigger value="processing" className="text-xs px-2 py-1.5">
              قيد المعالجة
              {statusIcons.processing}
            </TabsTrigger>
            <TabsTrigger value="shipped" className="text-xs px-2 py-1.5">
              تم الشحن
              {statusIcons.shipped}
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs px-2 py-1.5">
              تم التسليم
              {statusIcons.delivered}
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs px-2 py-1.5">
              ملغي
              {statusIcons.cancelled}
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        {/* قائمة المرشحات المحفوظة */}
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Save className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">المرشحات المحفوظة</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>المرشحات المحفوظة</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {savedFilters.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-center text-muted-foreground">
                  لا توجد مرشحات محفوظة
                </div>
              ) : (
                savedFilters.map((filter, index) => (
                  <DropdownMenuCheckboxItem
                    key={index}
                    checked={false}
                    onClick={() => applyFilter(filter)}
                  >
                    {filter.name}
                  </DropdownMenuCheckboxItem>
                ))
              )}
              
              <DropdownMenuSeparator />
              <Dialog open={saveFilterDialogOpen} onOpenChange={setSaveFilterDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <Plus className="h-4 w-4 ml-1" />
                    حفظ المرشح الحالي
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>حفظ مجموعة المرشحات</DialogTitle>
                    <DialogDescription>
                      أدخل اسمًا لمجموعة المرشحات الحالية لاستخدامها لاحقًا
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Input
                      placeholder="اسم المرشح"
                      value={currentFilter.name}
                      onChange={(e) => setCurrentFilter({ ...currentFilter, name: e.target.value })}
                    />
                    <div className="mt-2 text-sm">
                      <p><strong>المرشحات المضمنة:</strong></p>
                      <ul className="list-disc list-inside mt-1 text-muted-foreground">
                        <li>الحالة: {statusTranslations[activeStatus]}</li>
                        {searchTerm && <li>بحث: {searchTerm}</li>}
                        {dateRange.from && (
                          <li>
                            التاريخ: {dateRange.from.toLocaleDateString()} - {dateRange.to?.toLocaleDateString() || 'الآن'}
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSaveFilterDialogOpen(false)}>
                      إلغاء
                    </Button>
                    <Button 
                      onClick={() => saveCurrentFilter(currentFilter.name)}
                      disabled={!currentFilter.name}
                    >
                      حفظ المرشح
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <SlidersHorizontal className="h-4 w-4 ml-1" />
                <span className="hidden sm:inline">خيارات العرض</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>تخصيص عرض الطلبات</DialogTitle>
                <DialogDescription>
                  حدد الأعمدة التي تريد عرضها وترتيبها في جدول الطلبات
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">الأعمدة المعروضة</h4>
                    {/* هنا يمكن وضع مكون لاختيار وترتيب الأعمدة */}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">عدد الطلبات في الصفحة</h4>
                    <div className="flex items-center gap-2">
                      {[10, 20, 50, 100].map(num => (
                        <Button 
                          key={num} 
                          variant="outline" 
                          size="sm"
                          className="px-3 py-1"
                        >
                          {num}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline">
                  إعادة تعيين
                </Button>
                <Button>
                  تطبيق
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      {/* صف البحث والتصفية */}
      <div className="flex items-center gap-2 flex-wrap md:flex-nowrap">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="بحث عن اسم العميل، رقم الطلب، رقم الهاتف..."
            className="pl-8 pr-3 text-sm h-9" 
            value={searchTerm}
            onChange={handleSearchChange}
          />
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9">
              <CalendarIcon className="h-4 w-4 ml-1" />
              {dateRange.from ? (
                <>
                  {dateRange.from.toLocaleDateString()} - {dateRange.to?.toLocaleDateString() || ""}
                </>
              ) : (
                <span>اختر الفترة</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              disabled={(date) => date > new Date()}
              className="border-0"
            />
            <div className="p-3 border-t flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDateRange({ from: undefined, to: undefined })}
              >
                إعادة تعيين
              </Button>
              <Button size="sm" onClick={applyDateRange}>
                تطبيق
              </Button>
            </div>
          </PopoverContent>
        </Popover>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1 h-9">
              <Filter className="h-4 w-4 ml-1" />
              <span className="hidden sm:inline">فرز وتصفية</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px]">
            <DropdownMenuLabel>فرز الطلبات</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuCheckboxItem checked={true}>
              الأحدث أولاً
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              الأقدم أولاً
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              الأعلى قيمة
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              الأقل قيمة
            </DropdownMenuCheckboxItem>
            
            <DropdownMenuSeparator />
            <DropdownMenuLabel>طريقة الدفع</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked={true}>
              الكل
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              الدفع عند الاستلام
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              بطاقة ائتمان
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              تحويل بنكي
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      
      {/* عرض الفلاتر النشطة */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <span className="text-xs text-muted-foreground">المرشحات النشطة:</span>
          {activeFilters.map((filter, index) => (
            <Badge key={index} variant="secondary" className="gap-1">
              {filter}
              <Button
                variant="ghost"
                size="icon"
                className="h-4 w-4 p-0 hover:bg-secondary"
                onClick={() => {
                  const newFilters = [...activeFilters];
                  newFilters.splice(index, 1);
                  setActiveFilters(newFilters);
                  
                  // إعادة تعيين المرشح المناسب
                  if (filter.startsWith('الحالة:')) {
                    setActiveStatus('all');
                  } else if (filter.startsWith('بحث:')) {
                    setSearchTerm("");
                  } else if (filter.startsWith('التاريخ:')) {
                    setDateRange({ from: undefined, to: undefined });
                  }
                }}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs text-muted-foreground"
            onClick={resetAllFilters}
          >
            <Trash className="h-3 w-3 ml-1" />
            مسح الكل
          </Button>
        </div>
      )}
    </div>
  );
};

export default OrdersAdvancedFilters; 