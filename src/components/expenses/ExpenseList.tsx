import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExpenses } from "@/hooks/useExpenses";
import { ExpenseFilters, ExpenseWithRecurring } from "@/types/expenses";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarIcon, Check, ChevronsUpDown, ChevronLeft, ChevronRight, FileEdit, MoreHorizontal, Receipt, Search, Trash2, Repeat } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
// import { ExpenseDrawer } from "./ExpenseDrawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";
// import { useDebounce } from "@/hooks/useDebounce";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Edit2,
} from "lucide-react";
import { ar } from "date-fns/locale";
import { toast } from "sonner";

interface CustomPaginationProps {
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}

function CustomPagination({ totalPages, currentPage, onPageChange }: CustomPaginationProps) {
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    
    if (currentPage <= 3) return i + 1;
    
    if (currentPage >= totalPages - 2) {
      return totalPages - 4 + i;
    }
    
    return currentPage - 2 + i;
  });

  return (
    <div className="flex items-center justify-center space-x-2">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="sr-only">Previous page</span>
      </Button>
      
      {currentPage > 3 && totalPages > 5 && (
        <>
          <Button
            variant={currentPage === 1 ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(1)}
          >
            1
          </Button>
          {currentPage > 4 && <span>...</span>}
        </>
      )}
      
      {pages.map((page) => (
        <Button
          key={page}
          variant={currentPage === page ? "default" : "outline"}
          size="icon"
          onClick={() => onPageChange(page)}
        >
          {page}
        </Button>
      ))}
      
      {currentPage < totalPages - 2 && totalPages > 5 && (
        <>
          {currentPage < totalPages - 3 && <span>...</span>}
          <Button
            variant={currentPage === totalPages ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(totalPages)}
          >
            {totalPages}
          </Button>
        </>
      )}
      
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        <ChevronRight className="h-4 w-4" />
        <span className="sr-only">Next page</span>
      </Button>
    </div>
  );
}

export function ExpenseList({ showRecurringOnly }: { showRecurringOnly?: boolean } = {}) {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { filters, setFilters, useExpensesQuery, useExpenseCategoriesQuery, useDeleteExpenseMutation } = useExpenses();
  
  // تعديل الفلاتر لتضمين فلتر المصروفات المتكررة
  useEffect(() => {
    if (showRecurringOnly !== undefined) {
      setFilters(prev => ({
        ...prev,
        isRecurring: showRecurringOnly
      }));
    }
  }, [showRecurringOnly, setFilters]);
  
  const { data, isLoading, error } = useExpensesQuery(page, pageSize);
  const { data: categories } = useExpenseCategoriesQuery();
  const deleteExpenseMutation = useDeleteExpenseMutation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<ExpenseWithRecurring | string | null>(null);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [isRecurringOnly, setIsRecurringOnly] = useState(!!showRecurringOnly);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseWithRecurring | null>(null);
  const [isEditDrawerOpen, setIsEditDrawerOpen] = useState(false);
  
  // إنشاء قاموس للفئات
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map());
  
  // تحديث قاموس الفئات عندما تكون البيانات متاحة
  useEffect(() => {
    if (categories && categories.length > 0) {
      const map = new Map<string, string>();
      categories.forEach(cat => {
        map.set(cat.id, cat.name);
      });
      setCategoryMap(map);
    }
  }, [categories]);
  
  // تعديل الفلاتر لتضمين فلتر المصروفات المتكررة
  useEffect(() => {
    if (showRecurringOnly !== undefined) {
      setIsRecurringOnly(!!showRecurringOnly);
      setFilters(prev => ({
        ...prev,
        isRecurring: !!showRecurringOnly
      }));
    }
  }, [showRecurringOnly, setFilters]);
  
  // دالة للحصول على اسم الفئة من المعرف
  const getCategoryName = (category?: string): string => {
    if (!category) return 'غير مصنف';
    // Si category es un ID (UUID), intenta obtener el nombre del mapa
    if (category.includes('-') && categoryMap.has(category)) {
      return categoryMap.get(category) || 'غير مصنف';
    }
    // Si no, probablemente ya es un nombre de categoría
    return category;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSearch = () => {
    setFilters((prev) => ({ ...prev, searchTerm }));
    setPage(1);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Esta función está comentada temporalmente hasta que tengamos el componente ExpenseDrawer
  /*
  const handleEdit = (expense: ExpenseWithRecurring) => {
    setSelectedExpense(expense);
    setIsEditDrawerOpen(true);
  };
  */

  const handleDelete = (id: string) => {
    if (expenseToDelete && typeof expenseToDelete === 'object') {
      setExpenseToDelete(null); // Reset previous selection
    }
    setExpenseToDelete(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (expenseToDelete) {
      try {
        // Si expenseToDelete es un objeto, extraemos el ID
        const expenseId = typeof expenseToDelete === 'object' 
          ? expenseToDelete.id 
          : expenseToDelete;
          
        await deleteExpenseMutation.mutateAsync(expenseId);
        setIsDeleteDialogOpen(false);
        setExpenseToDelete(null);
        
        // Show success message
        toast.success("تم حذف المصروف بنجاح");
      } catch (error) {
        // Show error message
        toast.error("فشل في حذف المصروف");
      }
    }
  };

  const handleFilterChange = () => {
    const newFilters: ExpenseFilters = {
      ...filters,
      startDate: startDate,
      endDate: endDate,
      categories: selectedCategories.length > 0 ? selectedCategories : undefined,
      isRecurring: isRecurringOnly ? true : undefined,
    };
    setFilters(newFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSelectedCategories([]);
    setIsRecurringOnly(false);
    setFilters({});
    setSearchTerm("");
    setPage(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  // ترجمة حالات المصروفات إلى العربية
  const translateStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'قيد الانتظار',
      'completed': 'مكتمل',
      'cancelled': 'ملغي'
    };
    return statusMap[status] || status;
  };

  // دالة لترجمة تكرار المصروف
  const translateFrequency = (frequency?: string) => {
    if (!frequency) return '';
    
    const frequencyMap: Record<string, string> = {
      'weekly': 'أسبوعي',
      'bi_weekly': 'كل أسبوعين',
      'monthly': 'شهري',
      'quarterly': 'ربع سنوي',
      'yearly': 'سنوي'
    };
    
    return frequencyMap[frequency] || frequency;
  };

  // دالة لعرض أيقونة الفئة
  const getCategoryIcon = (category: string) => {
    const icons: Record<string, React.ReactNode> = {
      'الإيجار': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>,
      'الرواتب': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></svg>,
      'المرافق': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V6a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14"></path><path d="M2 20h20"></path><path d="M14 12v.01"></path></svg>,
      'المخزون': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"></path><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"></path><path d="M2 7h20"></path><path d="M22 7v3a2 2 0 0 1-2 2v0a2 2 0 0 1-2-2V7"></path><path d="M2 7v3a2 2 0 0 0 2 2v0a2 2 0 0 0 2-2V7"></path></svg>,
      'التسويق': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>,
      'الصيانة': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>,
      'متنوع': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>,
      'غير مصنف': <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>,
    };
    
    return icons[category] || icons['غير مصنف'];
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30 dark:hover:bg-green-900/30';
      case 'pending':
        return 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800/30 dark:hover:bg-amber-900/30';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800/30 dark:hover:bg-red-900/30';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 dark:bg-gray-800/50 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800/70';
    }
  };

  if (error) {
    return (
      <Card className="w-full bg-destructive-foreground/5">
        <CardHeader>
          <CardTitle className="text-destructive">Error Loading Expenses</CardTitle>
          <CardDescription>Unable to load expense data</CardDescription>
        </CardHeader>
        <CardContent>
          <p>An error occurred while fetching expense data. Please try again later.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header with search and filters */}
      <div className="bg-white dark:bg-card rounded-xl shadow-sm border border-border p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
            <h2 className="text-lg font-bold text-foreground">
              {showRecurringOnly ? "المصروفات المتكررة" : "جميع المصروفات"}
            </h2>
          </div>
          <div className="relative flex items-center">
            <Search className="absolute right-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن المصروفات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-3 pr-9 w-full md:w-[250px] bg-background/80 dark:bg-muted/40 focus-visible:ring-primary/30"
            />
          </div>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[180px]">
            <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={categoryOpen}
                  className="w-full justify-between bg-background/80 dark:bg-muted/40 focus-visible:ring-primary/30 border-border"
                >
                  {selectedCategories.length > 0
                    ? `${selectedCategories.length} فئة محددة`
                    : "تصفية حسب الفئة"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="بحث عن الفئة..." />
                  <CommandEmpty>لم يتم العثور على فئات.</CommandEmpty>
                  <CommandGroup className="max-h-[250px] overflow-y-auto">
                    {(categories || []).map((category) => (
                      <CommandItem
                        key={category.id}
                        onSelect={() => {
                          const selected = selectedCategories.includes(category.id);
                          setSelectedCategories(
                            selected
                              ? selectedCategories.filter((id) => id !== category.id)
                              : [...selectedCategories, category.id]
                          );
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded-full bg-primary/10 text-primary">
                            {getCategoryIcon(category.name)}
                          </div>
                          <span>{category.name}</span>
                        </div>
                        <Check
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedCategories.includes(category.id) ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1 min-w-[180px]">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between bg-background/80 dark:bg-muted/40 focus-visible:ring-primary/30 border-border"
                >
                  {startDate && endDate
                    ? `${format(startDate, "MM/dd/yyyy")} - ${format(endDate, "MM/dd/yyyy")}`
                    : startDate
                    ? `من ${format(startDate, "MM/dd/yyyy")}`
                    : endDate
                    ? `حتى ${format(endDate, "MM/dd/yyyy")}`
                    : "تصفية حسب التاريخ"}
                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{
                    from: startDate || undefined,
                    to: endDate || undefined,
                  }}
                  onSelect={(range) => {
                    setStartDate(range?.from);
                    setEndDate(range?.to);
                  }}
                  numberOfMonths={1}
                  className="rounded-md shadow-md border"
                />
                <div className="flex items-center justify-between p-3 border-t border-border">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                    size="sm"
                  >
                    مسح
                  </Button>
                  <Button onClick={handleFilterChange} size="sm">
                    تطبيق
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex-1 min-w-[180px]">
            <Select
              value={filters.status && filters.status.length > 0 ? filters.status[0] : "all"}
              onValueChange={(value) => {
                setFilters({
                  ...filters,
                  status: value === "all" ? undefined : [value],
                });
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full bg-background/80 dark:bg-muted/40 focus-visible:ring-primary/30 border-border">
                <SelectValue placeholder="تصفية حسب الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="completed">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-green-500"></span>
                    مكتمل
                  </div>
                </SelectItem>
                <SelectItem value="pending">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                    قيد الانتظار
                  </div>
                </SelectItem>
                <SelectItem value="cancelled">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-500"></span>
                    ملغي
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {!showRecurringOnly && (
            <div className="flex-1 min-w-[180px] flex items-center">
              <div className="flex items-center bg-background/80 dark:bg-muted/40 rounded-md px-3 py-2 border border-border w-full h-10">
                <Checkbox
                  id="isRecurring"
                  checked={isRecurringOnly}
                  onCheckedChange={(checked) => {
                    setIsRecurringOnly(!!checked);
                    setFilters({
                      ...filters,
                      isRecurring: !!checked ? true : undefined,
                    });
                    setPage(1);
                  }}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
                <label
                  htmlFor="isRecurring"
                  className="ml-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-1.5 text-foreground"
                >
                  <Repeat className="h-4 w-4 text-primary" />
                  المصروفات المتكررة فقط
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Expenses Table */}
      <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">جاري تحميل المصروفات...</p>
            </div>
          </div>
        ) : error ? (
          <div className="p-8 flex justify-center">
            <div className="text-center">
              <div className="inline-flex h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/20 p-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-red-800 dark:text-red-400">حدث خطأ أثناء تحميل المصروفات</h3>
              <p className="text-sm text-muted-foreground mt-1">يرجى المحاولة مرة أخرى لاحقاً.</p>
            </div>
          </div>
        ) : data?.data.length === 0 ? (
          <div className="p-8 flex justify-center">
            <div className="text-center">
              <div className="inline-flex h-10 w-10 rounded-full bg-muted dark:bg-muted/50 p-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4M8 16L4 12l4-4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground">لا توجد مصروفات</h3>
              <p className="text-sm text-muted-foreground mt-1">لم يتم العثور على أي مصروفات تطابق معايير البحث الخاصة بك.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="overflow-x-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">العنوان</TableHead>
                  <TableHead className="whitespace-nowrap">التاريخ</TableHead>
                  <TableHead className="whitespace-nowrap">الفئة</TableHead>
                  <TableHead className="whitespace-nowrap">المبلغ</TableHead>
                  <TableHead className="whitespace-nowrap">الحالة</TableHead>
                  <TableHead className="whitespace-nowrap text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-primary/5 dark:hover:bg-primary/10 group">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-foreground">{expense.title}</span>
                        {expense.is_recurring && (
                          <div className="text-primary" title="مصروف متكرر">
                            <Repeat className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </div>
                      {expense.is_recurring && expense.recurring && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {translateFrequency(expense.recurring.frequency)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground">
                      {format(new Date(expense.expense_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 rounded-full bg-primary/10 text-primary">
                          {getCategoryIcon(getCategoryName(expense.category))}
                        </div>
                        <span className="text-foreground">{getCategoryName(expense.category)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {Number(expense.amount).toFixed(2)} د.ج
                    </TableCell>
                    <TableCell>
                      <Badge className={`border ${getStatusBadgeColor(expense.status)}`}>
                        {translateStatus(expense.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 group-hover:bg-primary/10 dark:group-hover:bg-primary/20 group-hover:opacity-100 opacity-70"
                            >
                              <span className="sr-only">فتح القائمة</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>الإجراءات</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف المصروف
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/20">
                <Trash2 className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              تأكيد حذف المصروف
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800"
              disabled={deleteExpenseMutation.isPending}
            >
              {deleteExpenseMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحذف...
                </div>
              ) : (
                "حذف"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
