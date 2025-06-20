import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CalendarIcon, CreditCard, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Supplier, 
  SupplierPurchase, 
  SupplierPayment 
} from '@/api/supplierService';

// تعريف مخطط التحقق من الصحة
const paymentFormSchema = z.object({
  supplier_id: z.string({
    required_error: 'يرجى اختيار المورد',
  }),
  purchase_id: z.string().optional(),
  payment_date: z.date({
    required_error: 'يرجى تحديد تاريخ الدفع',
  }),
  amount: z.coerce.number({
    required_error: 'يرجى إدخال المبلغ',
    invalid_type_error: 'يرجى إدخال قيمة صحيحة',
  }).positive({
    message: 'يجب أن يكون المبلغ قيمة موجبة',
  }),
  payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'check', 'other'], {
    required_error: 'يرجى اختيار طريقة الدفع',
  }),
  reference_number: z.string().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof paymentFormSchema>;

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment?: SupplierPayment | null;
  suppliers: Supplier[];
  supplierPurchases?: SupplierPurchase[];
  selectedSupplierId?: string | null;
  onSave: (data: FormValues) => Promise<void>;
  onClose?: () => void;
  isLoading?: boolean;
}

export function SupplierPaymentDialog({
  open,
  onOpenChange,
  payment,
  suppliers,
  supplierPurchases = [],
  selectedSupplierId,
  onSave,
  onClose,
  isLoading = false,
}: SupplierPaymentDialogProps) {
  const [availablePurchases, setAvailablePurchases] = useState<SupplierPurchase[]>([]);
  const [isFullPayment, setIsFullPayment] = useState(false);
  
  // إعداد نموذج React Hook Form
  const form = useForm<FormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      supplier_id: selectedSupplierId || '',
      purchase_id: 'none',
      payment_date: new Date(),
      amount: 0,
      payment_method: 'cash',
      reference_number: '',
      notes: '',
    },
  });
  
  // تحديث القيم الافتراضية عند تغيير البيانات
  useEffect(() => {
    if (payment) {
      // إذا كان هناك دفعة موجودة للتعديل
      form.reset({
        supplier_id: payment.supplier_id,
        purchase_id: payment.purchase_id || 'none',
        payment_date: new Date(payment.payment_date),
        amount: payment.amount,
        payment_method: payment.payment_method,
        reference_number: payment.reference_number || '',
        notes: payment.notes || '',
      });
    } else if (selectedSupplierId) {
      // إذا كان هناك مورد محدد
      form.setValue('supplier_id', selectedSupplierId);
    }
  }, [payment, selectedSupplierId, form]);
  
  // تحديث المشتريات المتاحة عند تغيير المورد
  useEffect(() => {
    const supplierId = form.watch('supplier_id');
    const filteredPurchases = supplierPurchases.filter(
      purchase => purchase.supplier_id === supplierId && 
      purchase.status !== 'paid' && 
      purchase.status !== 'cancelled'
    );
    setAvailablePurchases(filteredPurchases);
  }, [form.watch('supplier_id'), supplierPurchases]);
  
  // تحديث المبلغ المتبقي عند اختيار مشتريات
  useEffect(() => {
    const purchaseId = form.watch('purchase_id');
    
    // إعادة تعيين حالة الدفع الكامل عند تغيير المشتريات
    setIsFullPayment(false);
    
    if (purchaseId && purchaseId !== 'none') {
      const selectedPurchase = supplierPurchases.find(p => p.id === purchaseId);
      if (selectedPurchase && selectedPurchase.balance_due > 0) {
        form.setValue('amount', selectedPurchase.balance_due);
      }
    }
  }, [form.watch('purchase_id'), supplierPurchases]);

  // معالجة تسديد المبلغ بالكامل
  const handleFullPayment = () => {
    const purchaseId = form.getValues('purchase_id');
    
    if (purchaseId && purchaseId !== 'none') {
      const selectedPurchase = supplierPurchases.find(p => p.id === purchaseId);
      if (selectedPurchase && selectedPurchase.balance_due > 0) {
        // تعيين المبلغ ليكون المبلغ المتبقي بالضبط
        form.setValue('amount', selectedPurchase.balance_due);
        // تعيين حالة "دفع كامل" لإرسالها إلى الخادم
        setIsFullPayment(true);
      }
    }
  };
  
  // معالجة تقديم النموذج
  const onSubmit = async (values: FormValues) => {
    try {
      // إضافة معلومة ما إذا كان هذا دفعًا كاملًا
      const paymentData = {
        ...values,
        is_full_payment: isFullPayment
      };
      
      await onSave(paymentData);
      form.reset();
    } catch (error) {
    }
  };
  
  // تحويل طريقة الدفع إلى نص عربي
  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash':
        return 'نقدي';
      case 'bank_transfer':
        return 'تحويل بنكي';
      case 'credit_card':
        return 'بطاقة ائتمان';
      case 'check':
        return 'شيك';
      case 'other':
        return 'أخرى';
      default:
        return method;
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{payment ? 'تعديل دفعة' : 'تسجيل دفعة جديدة'}</DialogTitle>
          <DialogDescription>
            {payment ? 'تعديل تفاصيل الدفعة للمورد' : 'إضافة دفعة جديدة للمورد'}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* المورد */}
            <FormField
              control={form.control}
              name="supplier_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المورد <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={!!payment || isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المورد" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    يرجى اختيار المورد الذي تريد تسجيل دفعة له
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* المشتريات المرتبطة (اختياري) */}
            <FormField
              control={form.control}
              name="purchase_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>المشتريات المرتبطة</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setIsFullPayment(false); // إعادة تعيين حالة الدفع الكامل عند تغيير المشتريات
                    }}
                    defaultValue={field.value}
                    value={field.value || 'none'}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المشتريات (اختياري)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط بمشتريات</SelectItem>
                      {availablePurchases.map((purchase) => (
                        <SelectItem key={purchase.id} value={purchase.id}>
                          {purchase.purchase_number} - {purchase.balance_due.toLocaleString('ar-EG')} ج.م
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    يمكنك ربط الدفعة بمشتريات محددة أو تركها عامة
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* تاريخ الدفع */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>تاريخ الدفع <span className="text-red-500">*</span></FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-right font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                          disabled={isLoading}
                        >
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ar })
                          ) : (
                            <span>اختر تاريخاً</span>
                          )}
                          <CalendarIcon className="mr-auto h-4 w-4" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    تاريخ تسجيل دفع المبلغ للمورد
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* المبلغ */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between items-center">
                    <FormLabel>المبلغ <span className="text-red-500">*</span></FormLabel>
                    {form.watch('purchase_id') && form.watch('purchase_id') !== 'none' && (
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={handleFullPayment}
                        disabled={isLoading}
                      >
                        تسديد بالكامل
                      </Button>
                    )}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="أدخل المبلغ"
                        className="pl-12"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        disabled={isLoading}
                      />
                      <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-gray-500">
                        ج.م
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    المبلغ المدفوع للمورد
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* طريقة الدفع */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>طريقة الدفع <span className="text-red-500">*</span></FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    value={field.value}
                    disabled={isLoading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طريقة الدفع" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cash">نقدي</SelectItem>
                      <SelectItem value="bank_transfer">تحويل بنكي</SelectItem>
                      <SelectItem value="credit_card">بطاقة ائتمان</SelectItem>
                      <SelectItem value="check">شيك</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    طريقة سداد المبلغ للمورد
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* رقم المرجع */}
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>رقم المرجع</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="رقم المرجع أو الإيصال"
                      {...field}
                      value={field.value || ''}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    رقم الشيك أو التحويل البنكي أو المرجع (اختياري)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* ملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="ملاحظات إضافية عن الدفع"
                      className="resize-none"
                      {...field}
                      value={field.value || ''}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormDescription>
                    أي ملاحظات إضافية حول هذه الدفعة (اختياري)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button 
                type="submit"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {payment ? 'تحديث الدفعة' : 'تسجيل الدفعة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
