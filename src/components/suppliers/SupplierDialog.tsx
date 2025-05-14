import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
  FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { Supplier } from '@/api/supplierService';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';

// تعريف مخطط التحقق للنموذج
const formSchema = z.object({
  name: z.string().min(2, { message: 'يجب أن يحتوي الاسم على حرفين على الأقل' }),
  company_name: z.string().optional(),
  email: z.string().email({ message: 'البريد الإلكتروني غير صالح' }).optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().optional(),
  tax_number: z.string().optional(),
  business_type: z.string().optional(),
  notes: z.string().optional(),
  supplier_type: z.enum(['local', 'international']),
  supplier_category: z.enum(['wholesale', 'retail', 'both']),
  is_active: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null;
  onSave: (data: FormValues) => Promise<void>;
  isLoading?: boolean;
}

export function SupplierDialog({
  open,
  onOpenChange,
  supplier,
  onSave,
  isLoading = false,
}: SupplierDialogProps) {
  const isEditing = !!supplier;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      company_name: '',
      email: '',
      phone: '',
      address: '',
      website: '',
      tax_number: '',
      business_type: '',
      notes: '',
      supplier_type: 'local',
      supplier_category: 'wholesale',
      is_active: true,
    },
  });
  
  // تعبئة النموذج عند التعديل
  useEffect(() => {
    if (supplier) {
      form.reset({
        name: supplier.name || '',
        company_name: supplier.company_name || '',
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        website: supplier.website || '',
        tax_number: supplier.tax_number || '',
        business_type: supplier.business_type || '',
        notes: supplier.notes || '',
        supplier_type: supplier.supplier_type,
        supplier_category: supplier.supplier_category,
        is_active: supplier.is_active,
      });
    }
  }, [supplier, form]);
  
  // عند إغلاق النموذج
  useEffect(() => {
    if (!open) {
      form.reset();
    }
  }, [open, form]);
  
  const onSubmit = async (data: FormValues) => {
    try {
      console.log('Form submitted with data:', data);
      // أضف رسالة حالة أثناء الحفظ
      toast({
        title: 'جاري الحفظ',
        description: 'جاري معالجة البيانات...',
      });
      
      await onSave(data);
    } catch (error) {
      console.error('Error submitting supplier form:', error);
      // عرض رسالة خطأ في النموذج نفسه
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال النموذج',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'تعديل المورد' : 'إضافة مورد جديد'}</DialogTitle>
          <DialogDescription>
            أدخل تفاصيل المورد هنا. اضغط على حفظ عند الانتهاء.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* اسم المورد */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم المورد*</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم المورد" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* اسم الشركة */}
              <FormField
                control={form.control}
                name="company_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>اسم الشركة</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل اسم الشركة" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* البريد الإلكتروني */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>البريد الإلكتروني</FormLabel>
                    <FormControl>
                      <Input placeholder="example@domain.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* رقم الهاتف */}
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رقم الهاتف</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="الهاتف رقم أدخل" 
                        {...field} 
                        dir="rtl"
                        inputMode="tel"
                        style={{ textAlign: 'right', direction: 'rtl' }}
                        className="text-right [&::placeholder]:text-right [&::placeholder]:mr-0"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* نوع المورد */}
              <FormField
                control={form.control}
                name="supplier_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع المورد</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر نوع المورد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="local">محلي</SelectItem>
                          <SelectItem value="international">دولي</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* فئة المورد */}
              <FormField
                control={form.control}
                name="supplier_category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>فئة المورد</FormLabel>
                    <FormControl>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        value={field.value}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر فئة المورد" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="wholesale">جملة</SelectItem>
                          <SelectItem value="retail">تجزئة</SelectItem>
                          <SelectItem value="both">جملة وتجزئة</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* الرقم الضريبي */}
              <FormField
                control={form.control}
                name="tax_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الرقم الضريبي</FormLabel>
                    <FormControl>
                      <Input placeholder="أدخل الرقم الضريبي" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* نوع العمل */}
              <FormField
                control={form.control}
                name="business_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع النشاط</FormLabel>
                    <FormControl>
                      <Input placeholder="نوع النشاط التجاري" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* الموقع الإلكتروني */}
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الموقع الإلكتروني</FormLabel>
                    <FormControl>
                      <Input placeholder="www.example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* حالة النشاط */}
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>نشط</FormLabel>
                      <FormDescription>
                        حالة نشاط المورد
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
            
            {/* العنوان */}
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العنوان</FormLabel>
                  <FormControl>
                    <Textarea placeholder="أدخل العنوان الكامل" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* الملاحظات */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ملاحظات</FormLabel>
                  <FormControl>
                    <Textarea placeholder="ملاحظات إضافية عن المورد" className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'تحديث' : 'إضافة'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
} 