import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
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
import { CalendarIcon, Loader2, Plus, Trash2, Search, Check, ChevronsUpDown } from 'lucide-react';
import { Supplier, SupplierPurchase, SupplierPurchaseItem } from '@/api/supplierService';
import { SupplierDialog } from './SupplierDialog';
import { ProductVariantSelector } from './ProductVariantSelector';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { ar } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

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
  purchase_price?: number; // سعر الشراء
  has_variants?: boolean;
  use_sizes?: boolean;
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
  const isEditing = !!purchase;
  const [totalAmount, setTotalAmount] = useState(0);
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false);
  const [isCreatingSupplier, setIsCreatingSupplier] = useState(false);
  const [itemVariants, setItemVariants] = useState<Record<number, any[]>>({});
  const [showVariantSelector, setShowVariantSelector] = useState<Record<number, boolean>>({});
  const [productSearchOpen, setProductSearchOpen] = useState<Record<number, boolean>>({});
  const [productSearchValue, setProductSearchValue] = useState<Record<number, string>>({});
  const [isGeneratingInvoiceNumber, setIsGeneratingInvoiceNumber] = useState(false);
  
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
      console.error('Error generating purchase number:', error);
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
  
  // حساب المبلغ الإجمالي
  useEffect(() => {
    const calculateTotal = () => {
      const items = form.watch('items');
      let sum = 0;
      
      items.forEach((item) => {
        const subtotal = item.quantity * item.unit_price;
        const tax = subtotal * (item.tax_rate / 100);
        sum += subtotal + tax;
      });
      
      setTotalAmount(sum);
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
        alert("تحذير: لم يتم تحديد أي منتج. تأكد من اختيار منتج واحد على الأقل لتحديث المخزون.");
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
  
  // الإغلاق مع استدعاء onClose إن وجد
  const handleDialogClose = () => {
    
    if (onClose) {
      onClose();
    }
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
  
  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      
      if (!newOpen && onClose && open) {
        // عند الإغلاق
        handleDialogClose();
      } else {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل مشتريات' : 'إضافة مشتريات جديدة'}</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المشتريات من المورد. اضغط على حفظ عند الانتهاء.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* رقم الشراء */}
              <FormField
                control={form.control}
                name="purchase_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الفاتورة*</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input placeholder="مثال: PUR-2412-0001" {...field} />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generatePurchaseNumber}
                        disabled={isGeneratingInvoiceNumber}
                        title="توليد رقم فاتورة تلقائي"
                      >
                        {isGeneratingInvoiceNumber ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                      </Button>
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
                    <FormLabel>المورّد*</FormLabel>
                    <div className="flex gap-2">
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="اختر المورد" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name} {supplier.company_name ? `(${supplier.company_name})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {onCreateSupplier && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setSupplierDialogOpen(true)}
                          title="إضافة مورد جديد"
                          disabled={isLoading}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* تاريخ الشراء */}
              <FormField
                control={form.control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الشراء*</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر تاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
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
                  <FormItem className="flex flex-col">
                    <FormLabel>تاريخ الاستحقاق</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-right font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: ar })
                            ) : (
                              <span>اختر تاريخ</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value || undefined}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date("1900-01-01")
                          }
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
                    <FormLabel>شروط الدفع</FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: خلال 30 يوم" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* حالة الفاتورة */}
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الحالة*</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="confirmed">مؤكدة</SelectItem>
                        <SelectItem value="partially_paid">مدفوعة جزئياً</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="overdue">متأخرة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="أي ملاحظات إضافية عن هذه المشتريات"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* جدول العناصر */}
            <div className="border rounded-md p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">عناصر المشتريات</h3>
                <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة عنصر
                </Button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="space-y-4">
                    <div className="grid grid-cols-12 gap-4 items-start border-b pb-4">
                      {/* المنتج */}
                      <div className="col-span-12 md:col-span-4">
                        <FormField
                          control={form.control}
                          name={`items.${index}.product_id`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? 'sr-only' : ''}>المنتج</FormLabel>
                              <Popover 
                                open={productSearchOpen[index]} 
                                onOpenChange={(open) => 
                                  setProductSearchOpen(prev => ({ ...prev, [index]: open }))
                                }
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      aria-expanded={productSearchOpen[index]}
                                      className="w-full justify-between"
                                    >
                                      {field.value && field.value !== 'none'
                                        ? products.find((product) => product.id === field.value)?.name
                                        : "اختر المنتج"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput 
                                      placeholder="بحث عن منتج..." 
                                      value={productSearchValue[index] || ''}
                                      onValueChange={(value) => 
                                        setProductSearchValue(prev => ({ ...prev, [index]: value }))
                                      }
                                    />
                                    <CommandEmpty>لا توجد منتجات مطابقة</CommandEmpty>
                                    <CommandGroup className="max-h-60 overflow-y-auto">
                                      <CommandItem
                                        value="none"
                                        onSelect={() => {
                                          field.onChange('none');
                                          handleProductSelect(index, 'none');
                                          setProductSearchOpen(prev => ({ ...prev, [index]: false }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            field.value === 'none' ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        -- بدون منتج --
                                      </CommandItem>
                                      {products.map((product) => (
                                        <CommandItem
                                          key={product.id}
                                          value={product.name}
                                          onSelect={() => {
                                            field.onChange(product.id);
                                            handleProductSelect(index, product.id);
                                            setProductSearchOpen(prev => ({ ...prev, [index]: false }));
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              field.value === product.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {product.name}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* الوصف */}
                      <div className="col-span-12 md:col-span-3">
                        <FormField
                          control={form.control}
                          name={`items.${index}.description`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? 'sr-only' : ''}>الوصف*</FormLabel>
                              <FormControl>
                                <Input placeholder="وصف المنتج" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* الكمية */}
                      <div className="col-span-4 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? 'sr-only' : ''}>الكمية*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  value={field.value}
                                  disabled={showVariantSelector[index]}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* سعر الوحدة */}
                      <div className="col-span-4 md:col-span-2">
                        <FormField
                          control={form.control}
                          name={`items.${index}.unit_price`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? 'sr-only' : ''}>السعر*</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  value={field.value}
                                  disabled={showVariantSelector[index]}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* نسبة الضريبة */}
                      <div className="col-span-3 md:col-span-1">
                        <FormField
                          control={form.control}
                          name={`items.${index}.tax_rate`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={index !== 0 ? 'sr-only' : ''}>الضريبة %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  onChange={(e) => field.onChange(parseFloat(e.target.value))}
                                  value={field.value}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      {/* زر حذف العنصر */}
                      <div className="col-span-1 pt-8">
                        {fields.length > 1 && (
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon"
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* محدد المتغيرات */}
                    {showVariantSelector[index] && (
                      <div className="mt-4 border rounded-lg p-4 bg-gray-50">
                        <ProductVariantSelector
                          productId={form.getValues(`items.${index}.product_id`)}
                          productName={products.find(p => p.id === form.getValues(`items.${index}.product_id`))?.name || ''}
                          productPrice={products.find(p => p.id === form.getValues(`items.${index}.product_id`))?.price || 0}
                          productPurchasePrice={products.find(p => p.id === form.getValues(`items.${index}.product_id`))?.purchase_price}
                          onVariantsChange={(variants) => handleVariantsChange(index, variants)}
                          initialVariants={itemVariants[index] || []}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* المجموع */}
              <div className="flex justify-end mt-4">
                <div className="w-1/3 space-y-2">
                  <div className="flex justify-between">
                    <span>المجموع:</span>
                    <span>{totalAmount.toFixed(2)} دج</span>
                  </div>
                  
                  {/* المبلغ المدفوع */}
                  <FormField
                    control={form.control}
                    name="paid_amount"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex justify-between">
                          <FormLabel>المبلغ المدفوع:</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              className="w-28 text-left"
                              onChange={(e) => field.onChange(parseFloat(e.target.value))}
                              value={field.value}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between font-medium border-t pt-2">
                    <span>المتبقي:</span>
                    <span className={
                      (totalAmount - form.watch('paid_amount')) > 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }>
                      {(totalAmount - form.watch('paid_amount')).toFixed(2)} دج
                    </span>
                  </div>
                  
                  {(totalAmount - form.watch('paid_amount')) > 0 && (
                    <div className="flex gap-2 pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue('paid_amount', totalAmount)}
                      >
                        دفع المبلغ كاملاً
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => form.setValue('paid_amount', totalAmount / 2)}
                      >
                        دفع نصف المبلغ
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <div className="flex justify-between items-center w-full">
                <div className="text-sm text-muted-foreground">
                  {form.watch('items')?.length > 0 && (
                    <span>
                      {form.watch('items').length} عنصر - المجموع: {totalAmount.toFixed(2)} دج
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleDialogClose}
                    disabled={isLoading}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit" disabled={isLoading} className="min-w-[120px]">
                    {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                    {isEditing ? 'تحديث المشتريات' : 'حفظ المشتريات'}
                  </Button>
                </div>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
      
      {/* حوار إضافة مورد جديد */}
      <SupplierDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        onSave={handleCreateSupplier}
        isLoading={isCreatingSupplier}
      />
    </Dialog>
  );
}
