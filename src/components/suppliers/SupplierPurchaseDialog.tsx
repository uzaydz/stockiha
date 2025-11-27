import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import {
  CalendarIcon,
  Loader2,
  Plus,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  FileText,
  Users,
  Calendar as CalendarIconSolid,
  Clock,
  FileCheck,
  StickyNote,
  ShoppingCart,
  Sparkles,
  Save,
  X,
  Package,
} from 'lucide-react';
import { Supplier, SupplierPurchase, SupplierPurchaseItem } from '@/api/supplierService';
import { SupplierDialog } from './SupplierDialog';
import { ProductVariantSelector } from './ProductVariantSelector';
import { PurchaseItemCard } from './PurchaseItemCard';
import { PurchaseSummaryCard } from './PurchaseSummaryCard';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ar } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { calculatePurchaseTotal, PurchaseItem, VariantType } from '@/types/purchase';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// مخطط التحقق للنموذج
const formSchema = z.object({
  purchase_number: z.string().min(1, { message: 'رقم المشتريات مطلوب' }),
  supplier_id: z.string().min(1, { message: 'يرجى اختيار المورد' }),
  purchase_date: z.date(),
  due_date: z.date().optional(),
  payment_terms: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['draft', 'confirmed', 'partially_paid', 'paid', 'overdue', 'cancelled']),
  items: z.array(
    z.object({
      product_id: z.string().optional(),
      description: z.string().min(1, { message: 'وصف المنتج مطلوب' }),
      quantity: z.number().min(0.01, { message: 'الكمية يجب أن تكون أكبر من صفر' }),
      unit_price: z.number().min(0, { message: 'السعر يجب أن يكون صفر أو أكبر' }),
      tax_rate: z.number().min(0, { message: 'نسبة الضريبة يجب أن تكون صفر أو أكبر' }),
    })
  ).min(1, { message: 'يجب إضافة منتج واحد على الأقل' }),
  paid_amount: z.number().min(0, { message: 'المبلغ المدفوع يجب أن يكون صفر أو أكبر' }),
});

type FormValues = z.infer<typeof formSchema>;

interface Product {
  id: string;
  name: string;
  price: number;
  purchase_price?: number;
  has_variants?: boolean;
  use_sizes?: boolean;
  sku?: string;
  thumbnail_image?: string;
  stock_quantity?: number;
}

interface SupplierPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchase?: {
    purchase: SupplierPurchase;
    items: SupplierPurchaseItem[];
  } | null;
  suppliers: Supplier[];
  products: Product[];
  selectedSupplierId?: string | null;
  onSave: (data: FormValues) => Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
  calculateTotalAmount?: (items: any[]) => number;
  onCreateSupplier?: (supplierData: any) => Promise<void>;
  onSuppliersUpdate?: () => void;
}

export function SupplierPurchaseDialog({
  open,
  onOpenChange,
  purchase,
  suppliers,
  products,
  selectedSupplierId,
  onSave,
  onClose,
  isLoading = false,
  calculateTotalAmount,
  onCreateSupplier,
  onSuppliersUpdate,
}: SupplierPurchaseDialogProps) {
  const { toast } = useToast();
  const isEditing = !!purchase;
  const [totalAmount, setTotalAmount] = useState(0);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);

  // نوع بيانات المتغيرات
  interface VariantData {
    variant_id: string;
    display_name: string;
    quantity: number;
    unit_price: number;
    color_id?: string;
    size_id?: string;
  }

  const [itemVariants, setItemVariants] = useState<Record<number, VariantData[]>>({});
  const [showVariantSelector, setShowVariantSelector] = useState<Record<number, boolean>>({});
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({});
  const [productSearchValue, setProductSearchValue] = useState<Record<number, string>>({});
  const [isGeneratingInvoiceNumber, setIsGeneratingInvoiceNumber] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  
  // وظيفة لتوليد رقم الفاتورة التلقائي
  const generatePurchaseNumber = async () => {
    setIsGeneratingInvoiceNumber(true);
    try {
      // جلب آخر رقم فاتورة من قاعدة البيانات
      const { data: latestPurchases } = await supabase
        .from('supplier_purchases')
        .select('purchase_number')
        .order('created_at', { ascending: false })
        .limit(1);
      
      let nextNumber = 1;
      
      if (latestPurchases && latestPurchases.length > 0) {
        const lastPurchaseNumber = latestPurchases[0].purchase_number;
        const numberPart = parseInt(lastPurchaseNumber.split('-').pop() || '0', 10);
        if (!isNaN(numberPart)) {
          nextNumber = numberPart + 1;
        }
      }
      
      const date = new Date();
      const year = date.getFullYear().toString().substring(2);
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      
      const newPurchaseNumber = `PUR-${year}${month}-${nextNumber.toString().padStart(4, '0')}`;
      form.setValue('purchase_number', newPurchaseNumber);
    } catch (error) {
    } finally {
      setIsGeneratingInvoiceNumber(false);
    }
  };
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      purchase_number: '',
      supplier_id: '',
      purchase_date: new Date(),
      status: 'draft',
      items: [
        {
          description: '',
          quantity: 1,
          unit_price: 0,
          tax_rate: 0,
        },
      ],
      paid_amount: 0,
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'items',
  });
  
  // تعبئة النموذج عند التعديل
  useEffect(() => {
    if (purchase) {
      const purchaseData = purchase.purchase;
      const itemsData = purchase.items;
      
      form.reset({
        purchase_number: purchaseData.purchase_number,
        supplier_id: purchaseData.supplier_id,
        purchase_date: new Date(purchaseData.purchase_date),
        due_date: purchaseData.due_date ? new Date(purchaseData.due_date) : undefined,
        payment_terms: purchaseData.payment_terms || '',
        notes: purchaseData.notes || '',
        status: purchaseData.status,
        items: itemsData.map(item => ({
          product_id: item.product_id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
        })),
        paid_amount: purchaseData.paid_amount,
      });
    } else if (selectedSupplierId) {
      // إذا كان هناك مورد محدد، استخدمه كقيمة افتراضية
      
      form.setValue('supplier_id', selectedSupplierId);
    }
  }, [purchase, form, selectedSupplierId]);
  
  // حساب المبلغ الإجمالي - استخدام الدالة الموحدة
  useEffect(() => {
    const calculateTotal = () => {
      const items = form.watch('items');
      setTotalAmount(calculatePurchaseTotal(items));
    };

    calculateTotal();

    const subscription = form.watch(() => calculateTotal());
    return () => subscription.unsubscribe();
  }, [form]);
  
  // عند إغلاق النموذج
  useEffect(() => {
    if (!open) {
      // إعادة تعيين النموذج عند الإغلاق
      if (!purchase) {
        form.reset({
          purchase_number: '',
          supplier_id: '',
          purchase_date: new Date(),
          status: 'draft',
          items: [
            {
              description: '',
              quantity: 1,
              unit_price: 0,
              tax_rate: 0,
            },
          ],
          paid_amount: 0,
        });
      }
    }
  }, [open, form, purchase]);
  
  // عند الإرسال
  const onSubmit = async (data: FormValues) => {

    // التحقق من وجود عناصر في المشتريات
    if (!data.items || data.items.length === 0) {
      return;
    }
    
    // التحقق من تحديد منتج واحد على الأقل إذا كانت الحالة "مؤكدة"
    if (data.status === 'confirmed') {
      const hasValidProduct = data.items.some(item => 
        item.product_id && item.product_id !== 'none'
      );
      
      if (!hasValidProduct) {
        // عرض رسالة تحذير للمستخدم
        toast({
          title: 'تحذير',
          description: 'لم يتم تحديد أي منتج. تأكد من اختيار منتج واحد على الأقل لتحديث المخزون.',
          variant: 'destructive',
        });
        // استمر في المعالجة رغم التحذير
      }
    }
    
    try {
      // إضافة بيانات المتغيرات إلى البيانات المرسلة
      const enhancedData = {
        ...data,
        item_variants: itemVariants
      };
      
      await onSave(enhancedData);
    } catch (error) {
    }
  };
  
  // التحقق من وجود تغييرات غير محفوظة
  const hasUnsavedChanges = useCallback(() => {
    return form.formState.isDirty;
  }, [form.formState.isDirty]);

  // طلب تأكيد الإغلاق
  const requestClose = useCallback(() => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirmation(true);
    } else {
      performClose();
    }
  }, [hasUnsavedChanges]);

  // تنفيذ الإغلاق الفعلي
  const performClose = useCallback(() => {
    setShowCloseConfirmation(false);
    if (onClose) {
      onClose();
    }
  }, [onClose]);

  // الإغلاق مع استدعاء onClose إن وجد (للتوافق مع الكود القديم)
  const handleDialogClose = () => {
    requestClose();
  };
  
  // استدعاء عند اختيار منتج
  const handleProductSelect = (index: number, productId: string) => {

    if (productId === "none") {
      // إذا كان المستخدم قد اختار "بدون منتج"، تأكد من أن له وصف
      const currentDescription = form.getValues(`items.${index}.description`);
      if (!currentDescription) {
        form.setValue(`items.${index}.description`, "عنصر إضافي");
      }
      // تعيين product_id إلى null صراحةً
      form.setValue(`items.${index}.product_id`, null);
      
      // إخفاء محدد المتغيرات
      setShowVariantSelector(prev => ({ ...prev, [index]: false }));
      setItemVariants(prev => ({ ...prev, [index]: [] }));
      
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (product) {
      
      // تعيين قيمة product_id صراحةً أولاً
      form.setValue(`items.${index}.product_id`, productId);
      form.setValue(`items.${index}.description`, product.name);
      
      // إذا كان المنتج له متغيرات، أظهر محدد المتغيرات
      if (product.has_variants) {
        setShowVariantSelector(prev => ({ ...prev, [index]: true }));
        setItemVariants(prev => ({ ...prev, [index]: [] }));
        
        // إعادة تعيين الكمية والسعر
        form.setValue(`items.${index}.quantity`, 0);
        form.setValue(`items.${index}.unit_price`, 0);
      } else {
        // منتج بسيط بدون متغيرات
        setShowVariantSelector(prev => ({ ...prev, [index]: false }));
        setItemVariants(prev => ({ ...prev, [index]: [] }));
        
        // استخدام سعر الشراء إذا كان متوفراً، وإلا استخدام سعر البيع
        const priceToUse = product.purchase_price || product.price;
        form.setValue(`items.${index}.unit_price`, priceToUse);
        form.setValue(`items.${index}.quantity`, 1);
        
        // إظهار تنبيه إذا لم يكن سعر الشراء متوفراً
        if (!product.purchase_price) {
        }
      }
      
    } else {
    }
  };

  // التعامل مع تغيير متغيرات المنتج
  const handleVariantsChange = (index: number, variants: any[]) => {
    setItemVariants(prev => ({ ...prev, [index]: variants }));
    
    // حساب الكمية الإجمالية والسعر المتوسط
    const totalQuantity = variants.reduce((sum, v) => sum + v.quantity, 0);
    const totalValue = variants.reduce((sum, v) => sum + (v.quantity * v.unit_price), 0);
    const averagePrice = totalQuantity > 0 ? totalValue / totalQuantity : 0;
    
    // تحديث النموذج
    form.setValue(`items.${index}.quantity`, totalQuantity);
    form.setValue(`items.${index}.unit_price`, averagePrice);
    
    // تحديث الوصف ليشمل المتغيرات
    const product = products.find(p => p.id === form.getValues(`items.${index}.product_id`));
    if (product && variants.length > 0) {
      const variantNames = variants.map(v => `${v.display_name} (${v.quantity})`).join(' + ');
      form.setValue(`items.${index}.description`, variantNames);
    }
  };
  
  // إضافة عنصر جديد إلى الفاتورة
  const handleAddItem = () => {
    append({
      product_id: undefined,
      description: '',
      quantity: 1,
      unit_price: 0,
      tax_rate: 0,
    });
  };

  // التعامل مع إنشاء مورد جديد
  const handleCreateSupplier = async (supplierData: any) => {
    if (!onCreateSupplier) return;
    
    try {
      setIsCreatingSupplier(true);
      await onCreateSupplier(supplierData);
      setSupplierDialogOpen(false);
      
      // تحديث قائمة الموردين إذا كانت الدالة متوفرة
      if (onSuppliersUpdate) {
        onSuppliersUpdate();
      }
    } catch (error) {
    } finally {
      setIsCreatingSupplier(false);
    }
  };
  
  // حالة الحقول المحددة
  const selectedSupplier = suppliers.find(s => s.id === form.watch('supplier_id'));
  const itemsCount = fields.length;

  // الحصول على ألوان الحالة
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; bg: string; label: string }> = {
      draft: { color: 'text-slate-600', bg: 'bg-slate-100', label: 'مسودة' },
      confirmed: { color: 'text-blue-600', bg: 'bg-blue-100', label: 'مؤكدة' },
      partially_paid: { color: 'text-amber-600', bg: 'bg-amber-100', label: 'مدفوعة جزئياً' },
      paid: { color: 'text-emerald-600', bg: 'bg-emerald-100', label: 'مدفوعة' },
      overdue: { color: 'text-red-600', bg: 'bg-red-100', label: 'متأخرة' },
      cancelled: { color: 'text-gray-600', bg: 'bg-gray-100', label: 'ملغاة' },
    };
    return configs[status] || configs.draft;
  };

  return (
    <>
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen && open) {
        requestClose();
      } else {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-[1000px] max-h-[95vh] p-0 gap-0 overflow-hidden">
        {/* Header محسّن */}
        <div className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
          <div className="px-6 py-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                  <ShoppingCart className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                    {isEditing ? 'تعديل فاتورة المشتريات' : 'إنشاء فاتورة مشتريات جديدة'}
                  </DialogTitle>
                  <DialogDescription className="text-sm text-slate-500 mt-1">
                    {isEditing
                      ? `تعديل الفاتورة رقم ${form.watch('purchase_number')}`
                      : 'أدخل تفاصيل المشتريات من المورد'}
                  </DialogDescription>
                </div>
              </div>
              {/* شارة الحالة */}
              {form.watch('status') && (
                <Badge
                  className={cn(
                    'px-3 py-1.5 font-medium',
                    getStatusConfig(form.watch('status')).bg,
                    getStatusConfig(form.watch('status')).color
                  )}
                >
                  {getStatusConfig(form.watch('status')).label}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-[calc(95vh-180px)]">
            {/* المحتوى الرئيسي */}
            <ScrollArea className="flex-1">
              <div className="p-6 space-y-6">
                {/* قسم المعلومات الأساسية */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                  <div className="px-5 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      المعلومات الأساسية
                    </h3>
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* رقم الفاتورة */}
                    <FormField
                      control={form.control}
                      name="purchase_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5" />
                            رقم الفاتورة *
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input
                                placeholder="PUR-2412-0001"
                                className="h-10"
                                {...field}
                              />
                            </FormControl>
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    className="h-10 w-10 shrink-0"
                                    onClick={generatePurchaseNumber}
                                    disabled={isGeneratingInvoiceNumber}
                                  >
                                    {isGeneratingInvoiceNumber ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Sparkles className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>توليد رقم تلقائي</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* المورد */}
                    <FormField
                      control={form.control}
                      name="supplier_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Users className="h-3.5 w-3.5" />
                            المورّد *
                          </FormLabel>
                          <div className="flex gap-2">
                            <Select
                              onValueChange={field.onChange}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="h-10 flex-1">
                                  <SelectValue placeholder="اختر المورد" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {suppliers.map((supplier) => (
                                  <SelectItem key={supplier.id} value={supplier.id}>
                                    <div className="flex items-center gap-2">
                                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                                        {supplier.name.charAt(0)}
                                      </div>
                                      <span>{supplier.name}</span>
                                      {supplier.company_name && (
                                        <span className="text-xs text-slate-400">
                                          ({supplier.company_name})
                                        </span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {onCreateSupplier && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="h-10 w-10 shrink-0"
                                      onClick={() => setSupplierDialogOpen(true)}
                                      disabled={isLoading}
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>إضافة مورد جديد</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* الحالة */}
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <FileCheck className="h-3.5 w-3.5" />
                            الحالة *
                          </FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="draft">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                                  مسودة
                                </div>
                              </SelectItem>
                              <SelectItem value="confirmed">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                  مؤكدة
                                </div>
                              </SelectItem>
                              <SelectItem value="partially_paid">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                  مدفوعة جزئياً
                                </div>
                              </SelectItem>
                              <SelectItem value="paid">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  مدفوعة
                                </div>
                              </SelectItem>
                              <SelectItem value="overdue">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-red-500" />
                                  متأخرة
                                </div>
                              </SelectItem>
                              <SelectItem value="cancelled">
                                <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-gray-500" />
                                  ملغاة
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* تاريخ الشراء */}
                    <FormField
                      control={form.control}
                      name="purchase_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <CalendarIconSolid className="h-3.5 w-3.5" />
                            تاريخ الشراء *
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full h-10 justify-start text-right font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                                  {field.value
                                    ? format(field.value, 'PPP', { locale: ar })
                                    : 'اختر التاريخ'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) =>
                                  date > new Date() || date < new Date('1900-01-01')
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* تاريخ الاستحقاق */}
                    <FormField
                      control={form.control}
                      name="due_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            تاريخ الاستحقاق
                          </FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    'w-full h-10 justify-start text-right font-normal',
                                    !field.value && 'text-muted-foreground'
                                  )}
                                >
                                  <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                                  {field.value
                                    ? format(field.value, 'PPP', { locale: ar })
                                    : 'اختر التاريخ'}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value || undefined}
                                onSelect={field.onChange}
                                disabled={(date) => date < new Date('1900-01-01')}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* شروط الدفع */}
                    <FormField
                      control={form.control}
                      name="payment_terms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500">
                            شروط الدفع
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder="مثال: خلال 30 يوم"
                              className="h-10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* الملاحظات */}
                  <div className="px-5 pb-5">
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                            <StickyNote className="h-3.5 w-3.5" />
                            ملاحظات
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="أي ملاحظات إضافية..."
                              className="resize-none h-20"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
            
                {/* قسم عناصر المشتريات والملخص */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* عناصر المشتريات */}
                  <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-slate-900 dark:text-white">
                          عناصر المشتريات
                        </h3>
                        <Badge variant="secondary" className="text-xs">
                          {itemsCount} عنصر
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddItem}
                        className="gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        إضافة عنصر
                      </Button>
                    </div>

                    {/* قائمة العناصر */}
                    <div className="space-y-4">
                      {fields.map((field, index) => (
                        <div key={field.id}>
                          <PurchaseItemCard
                            index={index}
                            form={form}
                            products={products}
                            onRemove={() => remove(index)}
                            canRemove={fields.length > 1}
                            onProductSelect={(productId) => handleProductSelect(index, productId)}
                          />

                          {/* محدد المتغيرات */}
                          {showVariantSelector[index] && (
                            <div className="mt-3 border rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50">
                              <ProductVariantSelector
                                productId={form.getValues(`items.${index}.product_id`)}
                                productName={
                                  products.find(
                                    p => p.id === form.getValues(`items.${index}.product_id`)
                                  )?.name || ''
                                }
                                productPrice={
                                  products.find(
                                    p => p.id === form.getValues(`items.${index}.product_id`)
                                  )?.price || 0
                                }
                                productPurchasePrice={
                                  products.find(
                                    p => p.id === form.getValues(`items.${index}.product_id`)
                                  )?.purchase_price
                                }
                                onVariantsChange={variants =>
                                  handleVariantsChange(index, variants)
                                }
                                initialVariants={itemVariants[index] || []}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* زر إضافة عنصر إضافي */}
                    <Button
                      type="button"
                      variant="dashed"
                      className="w-full h-12 border-dashed border-2 text-slate-500 hover:text-primary hover:border-primary transition-colors"
                      onClick={handleAddItem}
                    >
                      <Plus className="h-5 w-5 ml-2" />
                      إضافة عنصر جديد
                    </Button>
                  </div>

                  {/* الملخص المالي */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-0">
                      <PurchaseSummaryCard form={form} totalAmount={totalAmount} />
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Footer محسّن */}
            <div className="border-t bg-slate-50 dark:bg-slate-800/50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    <span>{itemsCount} عنصر</span>
                  </div>
                  <Separator orientation="vertical" className="h-4" />
                  <div className="font-medium text-slate-700 dark:text-slate-300">
                    الإجمالي: <span className="text-primary">{totalAmount.toFixed(2)} دج</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDialogClose}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    إلغاء
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="gap-2 min-w-[140px] bg-primary hover:bg-primary/90"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isEditing ? 'تحديث الفاتورة' : 'حفظ الفاتورة'}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
      
    </Dialog>

    {/* حوار إضافة مورد جديد - خارج Dialog الرئيسي */}
    <SupplierDialog
      open={supplierDialogOpen}
      onOpenChange={setSupplierDialogOpen}
      onSave={handleCreateSupplier}
      isLoading={isCreatingSupplier}
    />

    {/* حوار تأكيد الإغلاق - خارج Dialog الرئيسي ليظهر فوقه */}
    <AlertDialog open={showCloseConfirmation} onOpenChange={setShowCloseConfirmation}>
      <AlertDialogContent className="z-[200]">
        <AlertDialogHeader>
          <AlertDialogTitle>تغييرات غير محفوظة</AlertDialogTitle>
          <AlertDialogDescription>
            لديك تغييرات غير محفوظة. هل أنت متأكد من أنك تريد إغلاق النموذج؟ ستفقد جميع التغييرات.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setShowCloseConfirmation(false)}>
            متابعة التعديل
          </AlertDialogCancel>
          <AlertDialogAction onClick={performClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            إغلاق بدون حفظ
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
