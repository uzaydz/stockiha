import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, Loader2, Ruler, Package, DollarSign, Hash, Star, Copy } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductSize } from '@/types/product';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// نموذج بيانات المقاس
const sizeFormSchema = z.object({
  size_name: z.string().min(1, { message: 'اسم المقاس مطلوب' }),
  quantity: z.coerce.number().min(0, { message: 'الكمية يجب أن تكون أكبر من أو تساوي صفر' }),
  price: z.coerce.number().min(0, { message: 'السعر يجب أن يكون أكبر من أو تساوي صفر' }),
  barcode: z.string().optional().nullable(),
  is_default: z.boolean().default(false),
});

type SizeFormValues = z.infer<typeof sizeFormSchema>;

interface ProductSizeManagerProps {
  sizes: ProductSize[];
  onChange: (sizes: ProductSize[]) => void;
  basePrice: number;
  colorId: string;
  productId: string;
  useVariantPrices: boolean;
}



const ProductSizeManager: React.FC<ProductSizeManagerProps> = ({
  sizes,
  onChange,
  basePrice,
  colorId,
  productId,
  useVariantPrices,
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSize, setEditingSize] = useState<ProductSize | null>(null);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const form = useForm<SizeFormValues>({
    resolver: zodResolver(sizeFormSchema),
    defaultValues: {
      size_name: '',
      quantity: 0,
      price: basePrice,
      barcode: '',
      is_default: false,
    },
  });

  // إضافة مقاس جديد
  const onAddSizeClick = () => {
    form.reset({
      size_name: '',
      quantity: 0,
      price: basePrice,
      barcode: '',
      is_default: sizes.length === 0,
    });
    setEditingSize(null);
    setIsAddDialogOpen(true);
  };

  // تعديل مقاس موجود
  const onEditSizeClick = (size: ProductSize) => {
    form.reset({
      size_name: size.size_name,
      quantity: size.quantity,
      price: size.price || basePrice,
      barcode: size.barcode || '',
      is_default: size.is_default,
    });
    setEditingSize(size);
    setIsAddDialogOpen(true);
  };

  // حذف مقاس
  const onDeleteSizeClick = (sizeId: string) => {
    const sizeToDelete = sizes.find(s => s.id === sizeId);
    if (!sizeToDelete) return;

    const newSizes = sizes.filter((s) => s.id !== sizeId);
    
    // إذا حذفنا المقاس الافتراضي وهناك مقاسات أخرى، اجعل الأول افتراضي
    if (sizeToDelete.is_default && newSizes.length > 0) {
      newSizes[0].is_default = true;
    }
    
    onChange(newSizes);
    toast.success(`تم حذف المقاس "${sizeToDelete.size_name}"`);
  };



  // نسخ مقاس
  const duplicateSize = (size: ProductSize) => {
    const newSize: ProductSize = {
      ...size,
      id: `temp-${Date.now()}`,
      size_name: `${size.size_name} - نسخة`,
      is_default: false,
    };
    
    const newSizes = [...sizes, newSize];
    onChange(newSizes);
    toast.success(`تم نسخ المقاس "${size.size_name}"`);
  };

  // توليد باركود
  const handleGenerateBarcode = async () => {
    try {
      setGeneratingBarcode(true);
      const timestamp = Date.now();
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      const generatedBarcode = `SIZE-${timestamp}-${random}`;
      
      form.setValue('barcode', generatedBarcode);
      toast.success('تم توليد الباركود بنجاح');
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  // حفظ المقاس
  const onSubmit = (values: SizeFormValues) => {
    let updatedSizes: ProductSize[] = [...sizes];
    
    if (editingSize) {
      // تحديث مقاس موجود
      updatedSizes = updatedSizes.map((s) => {
        if (s.id === editingSize.id) {
          return {
            ...s,
            size_name: values.size_name,
            quantity: values.quantity,
            price: useVariantPrices ? values.price : basePrice,
            barcode: values.barcode || undefined,
            is_default: values.is_default,
          };
        }
        if (values.is_default && s.id !== editingSize.id) {
          return { ...s, is_default: false };
        }
        return s;
      });
      toast.success(`تم تحديث المقاس "${values.size_name}"`);
    } else {
      // إضافة مقاس جديد
      const newSize: ProductSize = {
        id: `temp-${Date.now()}`,
        color_id: colorId,
        product_id: productId,
        size_name: values.size_name,
        quantity: values.quantity,
        price: useVariantPrices ? values.price : basePrice,
        is_default: values.is_default,
      };

      if (values.barcode) {
        newSize.barcode = values.barcode;
      }
      
      if (values.is_default) {
        updatedSizes = updatedSizes.map((s) => ({
          ...s,
          is_default: false,
        }));
      }
      
      updatedSizes.push(newSize);
      toast.success(`تم إضافة المقاس "${values.size_name}"`);
    }
    
    // التأكد من وجود مقاس افتراضي
    if (!updatedSizes.some((s) => s.is_default) && updatedSizes.length > 0) {
      updatedSizes[0].is_default = true;
    }
    
    onChange(updatedSizes);
    setIsAddDialogOpen(false);
  };

  // حساب الإحصائيات
  const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
  const totalValue = sizes.reduce((sum, size) => sum + (size.quantity * (size.price || basePrice)), 0);

  return (
    <div className="space-y-6">
      {/* الهيدر مع الإحصائيات */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            إدارة المقاسات
          </h3>
          {sizes.length > 0 && (
            <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <Package className="h-4 w-4" />
                {sizes.length} مقاس
              </span>
              <span className="flex items-center gap-1">
                <Hash className="h-4 w-4" />
                {totalQuantity} قطعة
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                {totalValue.toLocaleString()} دج
              </span>
            </div>
          )}
        </div>
        
        <Button size="sm" onClick={onAddSizeClick} className="gap-2">
          <Plus className="h-4 w-4" />
          إضافة مقاس
        </Button>
      </div>

      {/* المحتوى الرئيسي */}
      {sizes.length === 0 ? (
        <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-full flex items-center justify-center mb-4">
              <Ruler className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
              لا توجد مقاسات
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
              ابدأ بإضافة مقاسات مختلفة لهذا اللون لتنظيم المخزون بشكل أفضل
            </p>
            <Button onClick={onAddSizeClick} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة مقاس
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sizes.map((size) => (
            <Card key={size.id} className="group hover:shadow-lg transition-all duration-200 border-slate-200 dark:border-slate-700">
              <CardContent className="p-4">
                {/* هيدر البطاقة */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-lg">
                      <Ruler className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                        {size.size_name}
                      </h4>
                      {size.is_default && (
                        <Badge variant="secondary" className="mt-1 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          افتراضي
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* معلومات المقاس */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                        <Package className="h-3 w-3" />
                        <span className="text-xs">الكمية</span>
                      </div>
                      <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                        {size.quantity}
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                        <DollarSign className="h-3 w-3" />
                        <span className="text-xs">السعر</span>
                      </div>
                      <div className="text-lg font-bold text-green-600 dark:text-green-400">
                        {(size.price || basePrice).toLocaleString()} دج
                      </div>
                    </div>
                  </div>

                  {size.barcode && (
                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 mb-1">
                        <Hash className="h-3 w-3" />
                        <span className="text-xs">الباركود</span>
                      </div>
                      <div className="font-mono text-xs text-slate-900 dark:text-slate-100 truncate">
                        {size.barcode}
                      </div>
                    </div>
                  )}
                </div>

                {/* أزرار التحكم */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => duplicateSize(size)}
                    className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteSizeClick(size.id)}
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditSizeClick(size)}
                      className="gap-1"
                    >
                      <Edit2 className="h-4 w-4" />
                      تعديل
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}



      {/* نافذة إضافة/تعديل المقاس */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ruler className="h-5 w-5 text-blue-600" />
              {editingSize ? 'تعديل المقاس' : 'إضافة مقاس جديد'}
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* اسم المقاس */}
              <FormField
                control={form.control}
                name="size_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Ruler className="h-4 w-4" />
                      اسم المقاس
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="مثال: XL أو 42" 
                        {...field} 
                        className="h-11"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* الكمية والسعر */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        الكمية المتاحة
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          {...field} 
                          className="h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <DollarSign className="h-4 w-4" />
                        سعر المقاس
                      </FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01"
                            disabled={!useVariantPrices}
                            {...field} 
                            className="h-11 pl-10"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                            دج
                          </span>
                          {!useVariantPrices && (
                            <div className="absolute inset-0 bg-slate-100/50 dark:bg-slate-800/50 rounded-lg flex items-center justify-center">
                              <span className="text-xs text-slate-500 dark:text-slate-400">سعر ثابت</span>
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* الباركود */}
              <FormField
                control={form.control}
                name="barcode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      <Hash className="h-4 w-4" />
                      الباركود (اختياري)
                    </FormLabel>
                    <div className="flex gap-2">
                      <FormControl className="flex-1">
                        <Input 
                          placeholder="باركود للمقاس" 
                          {...field} 
                          className="h-11"
                        />
                      </FormControl>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateBarcode}
                        disabled={generatingBarcode}
                        className="px-3 h-11"
                      >
                        {generatingBarcode ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'توليد'
                        )}
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* المقاس الافتراضي */}
              <FormField
                control={form.control}
                name="is_default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={sizes.length === 0}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none flex-1">
                      <FormLabel className="text-slate-700 dark:text-slate-300 flex items-center gap-2 cursor-pointer">
                        <Star className="h-4 w-4 text-amber-500" />
                        المقاس الافتراضي
                      </FormLabel>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        سيتم عرض هذا المقاس كخيار افتراضي للعملاء
                      </p>
                    </div>
                  </FormItem>
                )}
              />
              
              {/* أزرار الحفظ */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsAddDialogOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
                <Button type="submit" className="flex-1 gap-2">
                  <Check className="h-4 w-4" />
                  {editingSize ? 'تحديث المقاس' : 'إضافة المقاس'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductSizeManager;