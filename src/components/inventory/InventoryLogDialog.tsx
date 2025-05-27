import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Package, 
  Plus, 
  ArrowUp, 
  ArrowDown, 
  AlertCircle, 
  RefreshCw, 
  WifiOff,
  CalendarIcon,
  Check,
  Clock,
  Search,
  Filter,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { getInventoryLog, updateProductStock, setProductStock, getProductInventoryHistory } from '@/lib/api/inventory';
import { supabase } from '@/lib/supabase';
import type { Product, InventoryLog, InventoryLogType } from '@/types';
import type { InventoryTransaction } from '@/lib/db/inventoryDB';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input as SearchInput } from '@/components/ui/input';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface InventoryLogDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInventoryUpdated: () => Promise<void>;
}

// قالب إدخال سجل المخزون
const inventoryLogSchema = z.object({
  quantity: z.coerce.number().positive({ message: 'يجب أن تكون الكمية أكبر من 0' }),
  type: z.enum(['purchase', 'sale', 'adjustment', 'return', 'loss', 'online_order']),
  notes: z.string().optional(),
});

type InventoryLogFormValues = z.infer<typeof inventoryLogSchema>;

// مكون عرض بطاقة سجل المخزون للشاشات الصغيرة
const LogCard = ({ log, formatLogType, formatDate }: { 
  log: InventoryTransaction, 
  formatLogType: (type: string) => React.ReactNode,
  formatDate: (date: Date) => string
}) => {
  return (
    <Card className="mb-3 border-slate-200">
      <CardHeader className="pb-2 pt-3 px-3">
        <div className="flex justify-between">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{formatDate(log.timestamp)}</span>
          </div>
          {formatLogType(log.reason)}
        </div>
      </CardHeader>
      <CardContent className="px-3 py-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium">
            {log.quantity > 0 ? (
              <ArrowUp className="h-3.5 w-3.5 text-green-600" />
            ) : log.quantity < 0 ? (
              <ArrowDown className="h-3.5 w-3.5 text-rose-600" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5 text-purple-600" />
            )}
            <span>الكمية: </span>
            <span>{Math.abs(log.quantity)}</span>
          </div>
        </div>
        {log.notes && (
          <div className="mt-2 text-sm text-muted-foreground border-t pt-2">
            {log.notes}
          </div>
        )}
      </CardContent>
      <CardFooter className="px-3 py-2 border-t bg-slate-50 flex justify-end">
        {log.synced ? (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <Check className="h-3 w-3" />
            <span>تمت المزامنة</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3 w-3" />
            <span>في انتظار المزامنة</span>
          </div>
        )}
      </CardFooter>
    </Card>
  );
};

// مكون ترقيم الصفحات
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number; 
  totalPages: number; 
  onPageChange: (page: number) => void;
}) => {
  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-8 w-8"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      <div className="text-sm">
        صفحة {currentPage} من {totalPages}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages || totalPages === 0}
        className="h-8 w-8"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
    </div>
  );
};

const InventoryLogDialog = ({ product, open, onOpenChange, onInventoryUpdated }: InventoryLogDialogProps) => {
  const [inventoryLogs, setInventoryLogs] = useState<InventoryTransaction[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<InventoryTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'add'>('history');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [isMobile, setIsMobile] = useState(false);
  
  // إضافة حالة للصفحات
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  const dialogRef = useRef<HTMLDivElement>(null);
  
  const form = useForm<InventoryLogFormValues>({
    resolver: zodResolver(inventoryLogSchema),
    defaultValues: {
      quantity: 1,
      type: 'purchase',
      notes: '',
    },
  });
  
  // تحديث حالة الاتصال وحجم الشاشة
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // اكتشاف حجم الشاشة
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    // فحص الحجم عند التحميل
    checkScreenSize();
    
    // إضافة مستمع لتغيير الحجم
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);
  
  // تطبيق تصفية وبحث السجلات
  useEffect(() => {
    let filtered = [...inventoryLogs];
    
    // تصفية حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.reason === filterType);
    }
    
    // تصفية حسب البحث
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(log => 
        (log.notes && log.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        log.reason.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Math.abs(log.quantity).toString().includes(searchQuery)
      );
    }
    
    setFilteredLogs(filtered);
    setCurrentPage(1); // إعادة تعيين الصفحة الحالية عند تغيير التصفية
  }, [inventoryLogs, filterType, searchQuery]);
  
  // حساب إجمالي عدد الصفحات
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
  
  // الحصول على العناصر للصفحة الحالية
  const currentPageItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLogs.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLogs, currentPage, itemsPerPage]);
  
  // الحصول على معرف المستخدم الحالي
  const getCurrentUserId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || 'unknown';
  };
  
  // جلب سجل المخزون للمنتج - مع تحسين لتقليل الطلبات
  useEffect(() => {
    // تخزين مؤقت للبيانات
    let isMounted = true;
    
    const fetchInventoryLog = async () => {
      if (!open) return;
      
      setIsLoading(true);
      try {
        // استخدام الوظيفة المحسنة التي تدعم العمل دون اتصال
        const logs = await getProductInventoryHistory(product.id);
        
        if (isMounted) {
          setInventoryLogs(logs);
          setFilteredLogs(logs);
          setCurrentPage(1); // إعادة تعيين الصفحة عند تحميل بيانات جديدة
        }
      } catch (error) {
        if (isMounted) {
          toast.error('حدث خطأ أثناء جلب سجل المخزون');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };
    
    fetchInventoryLog();
    
    return () => {
      isMounted = false;
    };
  }, [product.id, open]);
  
  // إضافة إدخال جديد لسجل المخزون
  const handleAddInventoryLog = async (values: InventoryLogFormValues) => {
    setIsSubmitting(true);
    try {
      const userId = await getCurrentUserId();
      let success = false;
      
      if (values.type === 'adjustment') {
        // إذا كان نوع العملية هو تعديل مباشر للكمية، نستخدم setProductStock
        success = await setProductStock({
          product_id: product.id,
          stock_quantity: values.quantity,
          reason: values.type,
          notes: values.notes || 'تعديل مباشر للكمية',
          created_by: userId
        });
      } else {
        // حساب الكمية اعتمادًا على نوع العملية
        let adjustmentQuantity = values.quantity;
        if (values.type === 'sale' || values.type === 'loss') {
          // في حالة البيع أو الفاقد، نخصم من المخزون (كمية سالبة)
          adjustmentQuantity = -values.quantity;
        }
        
        // استخدام updateProductStock لإضافة العملية
        success = await updateProductStock({
          product_id: product.id,
          quantity: adjustmentQuantity,
          reason: values.type,
          notes: values.notes,
          created_by: userId
        });
      }
      
      if (success) {
        // إعادة تحميل السجل
        const logs = await getProductInventoryHistory(product.id);
        setInventoryLogs(logs);
        setFilteredLogs(logs);
        
        // تحديث المنتج محليًا
        if (values.type === 'adjustment') {
          product.stock_quantity = values.quantity;
          product.stockQuantity = values.quantity;
        } else {
          const adjustmentQuantity = (values.type === 'sale' || values.type === 'loss') ? -values.quantity : values.quantity;
          product.stock_quantity = Math.max(0, product.stock_quantity + adjustmentQuantity);
          product.stockQuantity = product.stock_quantity;
        }
        product.updatedAt = new Date();
        
        // إعادة ضبط النموذج
        form.reset({
          quantity: 1,
          type: 'purchase',
          notes: '',
        });
        
        // تبديل إلى تبويب السجل
        setActiveTab('history');
        
        // إخطار المستخدم
        toast.success('تمت إضافة حركة المخزون بنجاح');
        
        // استدعاء دالة التحديث للتأكد من تحديث بيانات المنتج
        await onInventoryUpdated();
      } else {
        toast.error('فشل في إضافة حركة المخزون، حاول مرة أخرى');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إضافة سجل المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // تنسيق نوع العملية
  const formatLogType = (type: string) => {
    switch (type) {
      case 'purchase':
        return <Badge variant="default" className="bg-green-100 text-green-700">وارد</Badge>;
      case 'sale':
        return <Badge variant="default" className="bg-blue-100 text-blue-700">مبيعات</Badge>;
      case 'adjustment':
        return <Badge variant="default" className="bg-purple-100 text-purple-700">تعديل</Badge>;
      case 'return':
        return <Badge variant="default" className="bg-amber-100 text-amber-700">مرتجع</Badge>;
      case 'loss':
        return <Badge variant="default" className="bg-rose-100 text-rose-700">فاقد</Badge>;
      case 'online_order':
        return <Badge variant="default" className="bg-teal-100 text-teal-700">طلب أونلاين</Badge>;
      case 'stock-add':
        return <Badge variant="default" className="bg-green-100 text-green-700">إضافة</Badge>;
      case 'stock-remove':
        return <Badge variant="default" className="bg-rose-100 text-rose-700">خصم</Badge>;
      case 'manual-update':
        return <Badge variant="default" className="bg-purple-100 text-purple-700">تحديث يدوي</Badge>;
      case 'sync-from-server':
        return <Badge variant="default" className="bg-blue-100 text-blue-700">مزامنة</Badge>;
      default:
        return <Badge variant="default">{type}</Badge>;
    }
  };
  
  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    return format(date, 'PPpp', { locale: ar });
  };
  
  // أنواع العمليات للتصفية
  const logTypes = [
    { value: 'all', label: 'الكل' },
    { value: 'purchase', label: 'وارد' },
    { value: 'sale', label: 'مبيعات' },
    { value: 'adjustment', label: 'تعديل' },
    { value: 'return', label: 'مرتجع' },
    { value: 'loss', label: 'فاقد' },
    { value: 'online_order', label: 'طلب أونلاين' },
    { value: 'stock-add', label: 'إضافة' },
    { value: 'stock-remove', label: 'خصم' },
  ];
  
  // معالجة تغيير الصفحة
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };
  
  // عدد العناصر المعروضة في التصفية
  const displayCount = filteredLogs.length;
  const totalCount = inventoryLogs.length;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="flex flex-col max-w-[95vw] h-[85vh] sm:max-w-[700px]"
        ref={dialogRef}
        aria-describedby={undefined}
      >
        <DialogHeader className="pb-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2">
              <Avatar className="h-10 w-10 rounded-md border">
                <AvatarImage 
                  src={product.thumbnailImage} 
                  alt={product.name}
                />
                <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                  {product.name.substring(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle>سجل المخزون</DialogTitle>
                <DialogDescription>
                  {product.name}
                </DialogDescription>
              </div>
            </div>
            {!navigator.onLine && (
              <Badge variant="outline" className="gap-1">
                <WifiOff className="h-3 w-3" />
                <span>غير متصل</span>
              </Badge>
            )}
          </div>
        </DialogHeader>
        
        <Tabs 
          defaultValue="history" 
          value={activeTab} 
          onValueChange={(value) => setActiveTab(value as 'history' | 'add')}
          className="flex-1 flex flex-col min-h-0 overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history" className="flex items-center gap-1">
              <Info className="h-4 w-4" />
              <span>سجل المخزون</span>
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              <span>إضافة حركة مخزون</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="history" className="flex-1 flex flex-col overflow-hidden">
            {/* أدوات البحث والتصفية */}
            {!isLoading && inventoryLogs.length > 0 && (
              <div className="flex items-center gap-2 mb-3 flex-wrap sm:flex-nowrap">
                <div className="relative w-full">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث في السجلات..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-3 pr-10 w-full"
                  />
                </div>
                <div className="w-full sm:w-auto flex-shrink-0">
                  <Select
                    value={filterType}
                    onValueChange={setFilterType}
                  >
                    <SelectTrigger className="w-full sm:w-[140px]">
                      <div className="flex items-center gap-1">
                        <Filter className="h-4 w-4" />
                        <SelectValue placeholder="نوع العملية" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {logTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            
            {/* عرض السجلات */}
            {isLoading ? (
              <div className="flex-1 flex justify-center items-center h-48">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">جاري تحميل السجلات...</p>
                </div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center h-48 text-center">
                <Package className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-lg font-medium">لا توجد سجلات</p>
                <p className="text-sm text-muted-foreground">
                  {searchQuery || filterType !== 'all' 
                    ? 'لم يتم العثور على سجلات تطابق معايير البحث' 
                    : 'لم يتم العثور على سجلات لهذا المنتج'}
                </p>
                {(searchQuery || filterType !== 'all') && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="mt-2"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterType('all');
                    }}
                  >
                    إزالة التصفية
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {displayCount < totalCount && (
                  <p className="text-xs text-muted-foreground mb-2 text-right">
                    عرض {displayCount} من أصل {totalCount} سجل
                  </p>
                )}
                
                {/* عرض مناسب لجميع أحجام الشاشة */}
                <ScrollArea className="flex-1">
                  {isMobile ? (
                    // عرض البطاقات للهواتف
                    <div className="space-y-2 p-1">
                      {currentPageItems.map((log) => (
                        <LogCard
                          key={log.id}
                          log={log}
                          formatLogType={formatLogType}
                          formatDate={formatDate}
                        />
                      ))}
                    </div>
                  ) : (
                    // عرض الجدول للشاشات الكبيرة
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">نوع الحركة</TableHead>
                          <TableHead className="text-right">الكمية</TableHead>
                          <TableHead className="text-right">ملاحظات</TableHead>
                          <TableHead className="text-right">تمت المزامنة</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {currentPageItems.map((log) => (
                          <TableRow key={log.id} className="hover:bg-slate-50">
                            <TableCell className="whitespace-nowrap">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger className="cursor-default">
                                    {format(log.timestamp, 'PPp', { locale: ar })}
                                  </TooltipTrigger>
                                  <TooltipContent>{formatDate(log.timestamp)}</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              {formatLogType(log.reason)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {log.quantity > 0 ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-green-600" />
                                ) : log.quantity < 0 ? (
                                  <ArrowDown className="h-3.5 w-3.5 text-rose-600" />
                                ) : (
                                  <RefreshCw className="h-3.5 w-3.5 text-purple-600" />
                                )}
                                {Math.abs(log.quantity)}
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate">
                              {log.notes ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger className="cursor-default text-left">
                                      <span className="truncate block">{log.notes}</span>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {log.notes}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {log.synced ? (
                                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-700 gap-1">
                                  <Check className="h-3 w-3" />
                                  تمت المزامنة
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700 gap-1">
                                  <Clock className="h-3 w-3" />
                                  في انتظار المزامنة
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </ScrollArea>
                
                {/* ترقيم الصفحات */}
                {filteredLogs.length > itemsPerPage && (
                  <Pagination 
                    currentPage={currentPage} 
                    totalPages={totalPages} 
                    onPageChange={handlePageChange}
                  />
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add" className="flex-1 overflow-auto p-1">
            <ScrollArea className="h-full w-full">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleAddInventoryLog)} className="space-y-4">
                  <div className="flex items-center p-3 bg-blue-50 rounded-md border border-blue-100 mb-4">
                    <div className="flex-shrink-0 ml-3">
                      <Avatar className="h-10 w-10 rounded-md">
                        <AvatarImage 
                          src={product.thumbnailImage} 
                          alt={product.name}
                        />
                        <AvatarFallback className="rounded-md bg-primary/10 text-primary">
                          {product.name.substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div>
                      <h4 className="font-medium">{product.name}</h4>
                      <p className="text-sm">الكمية الحالية: <strong>{product.stock_quantity}</strong></p>
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>نوع الحركة</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر نوع الحركة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="purchase">وارد (شراء / إضافة)</SelectItem>
                            <SelectItem value="sale">مبيعات</SelectItem>
                            <SelectItem value="adjustment">تعديل مباشر للكمية</SelectItem>
                            <SelectItem value="return">مرتجع</SelectItem>
                            <SelectItem value="loss">فاقد / تالف</SelectItem>
                            <SelectItem value="online_order">طلب أونلاين</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {field.value === 'purchase' && 'إضافة كمية للمخزون (زيادة)'}
                          {field.value === 'sale' && 'خروج كمية من المخزون للبيع (نقصان)'}
                          {field.value === 'adjustment' && 'تعديل الكمية مباشرة لتصبح القيمة المحددة'}
                          {field.value === 'return' && 'إرجاع كمية للمخزون (زيادة)'}
                          {field.value === 'loss' && 'خروج كمية كفاقد أو تالف (نقصان)'}
                          {field.value === 'online_order' && 'طلب أونلاين'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكمية</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="1" 
                            step="1" 
                            {...field} 
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormDescription>
                          {form.getValues('type') === 'adjustment' 
                            ? 'القيمة الجديدة للمخزون' 
                            : 'عدد الوحدات المضافة أو المخصومة'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="أضف ملاحظات حول سبب تغيير المخزون"
                            className="resize-none"
                            {...field}
                            disabled={isSubmitting}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="bg-muted/30 p-3 rounded-md flex items-center gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <span>
                      {form.getValues('type') === 'purchase' || form.getValues('type') === 'return'
                        ? `سيتم زيادة المخزون بمقدار ${form.getValues('quantity')} وحدة`
                        : form.getValues('type') === 'sale' || form.getValues('type') === 'loss'
                        ? `سيتم خفض المخزون بمقدار ${form.getValues('quantity')} وحدة`
                        : `سيتم ضبط المخزون إلى ${form.getValues('quantity')} وحدة`}
                    </span>
                  </div>
                  
                  {isOffline && (
                    <div className="bg-blue-50 p-3 rounded-md flex items-center gap-2 text-sm border border-blue-100">
                      <WifiOff className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <span>
                        أنت في وضع عدم الاتصال. سيتم تخزين العملية محليًا ومزامنتها عند استعادة الاتصال بالإنترنت.
                      </span>
                    </div>
                  )}
                  
                  <DialogFooter className="mt-4 gap-2 flex flex-col sm:flex-row sm:justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('history')}
                      disabled={isSubmitting}
                      className="sm:order-1"
                    >
                      إلغاء
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="sm:order-2">
                      {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                      إضافة حركة المخزون
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default InventoryLogDialog;
