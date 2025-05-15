import { ChangeEvent, useEffect, useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { updateProduct } from '@/lib/api/products';
import { updateProductStock, setProductStock } from '@/lib/api/inventory';
import { supabase } from '@/lib/supabase';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, PlusCircle, MinusCircle, History, WifiOff, Palette, Ruler } from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/types';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';
import { ProductColor, ProductSize } from '@/api/store';

// Form schema using zod
const stockUpdateSchema = z.object({
  stock_quantity: z.coerce.number().int().min(0, { message: 'يجب أن تكون الكمية أكبر من أو تساوي صفر' }),
  adjustment: z.coerce.number().int(),
  note: z.string().optional(),
  color_id: z.string().optional(),
  size_id: z.string().optional(),
});

type StockUpdateValues = z.infer<typeof stockUpdateSchema>;

interface StockUpdateDialogProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStockUpdated: () => Promise<void>;
}

export function StockUpdateDialog({
  product,
  open,
  onOpenChange,
  onStockUpdated,
}: StockUpdateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'set' | 'adjust'>('adjust');
  const { isOffline, isOnline } = useOfflineStatus();
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [currentQuantity, setCurrentQuantity] = useState(product?.stock_quantity || 0);
  const [hasVariants, setHasVariants] = useState(false);
  
  // تسجيل حالة الفتح للتأكد من أن المكون يستجيب للتغييرات
  useEffect(() => {
    
    
    // إذا تم فتح الحوار، تحقق من حالة الاتصال مرة أخرى
    if (open) {
      // إجراء فحص فوري للاتصال عند فتح الحوار
      const checkConnectionOnOpen = async () => {
        try {
          const response = await fetch('/api/health-check', {
            method: 'HEAD',
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' }
          });
          
          
          // لا نحتاج إلى تغيير الحالة لأن useOfflineStatus سيقوم بذلك
        } catch (error) {
          console.warn('فشل فحص الاتصال عند فتح الحوار:', error);
        }
      };
      
      checkConnectionOnOpen();
    }
  }, [open]);

  // التحقق مما إذا كان المنتج له متغيرات
  useEffect(() => {
    const hasColorsOrSizes = product && 
                            product.colors && 
                            product.colors.length > 0;
    setHasVariants(hasColorsOrSizes || false);
    
    // إعادة تعيين المتغيرات المحددة
    setSelectedColor(null);
    setSelectedSize(null);
    
    // ضبط الكمية الحالية
    if (product) {
      setCurrentQuantity(product.stock_quantity);
    }
  }, [product]);
  
  // Initialize form with react-hook-form and zod validation
  const form = useForm<StockUpdateValues>({
    resolver: zodResolver(stockUpdateSchema),
    defaultValues: {
      stock_quantity: product?.stock_quantity || 0,
      adjustment: 0,
      note: '',
      color_id: '',
      size_id: '',
    },
  });

  // إعادة تعيين النموذج عند تغيير المنتج أو فتح النافذة
  useEffect(() => {
    if (open && product) {
      
      form.reset({
        stock_quantity: currentQuantity,
        adjustment: 0,
        note: '',
        color_id: "all",
        size_id: "all-sizes",
      });
    }
  }, [product, open, form, currentQuantity]);

  // عند تغيير اللون المحدد
  useEffect(() => {
    if (selectedColor) {
      setCurrentQuantity(selectedColor.quantity);
      form.setValue('stock_quantity', selectedColor.quantity);
      
      // إعادة تعيين المقاس المحدد
      setSelectedSize(null);
      form.setValue('size_id', "all-sizes");
    } else if (product) {
      setCurrentQuantity(product.stock_quantity);
      form.setValue('stock_quantity', product.stock_quantity);
    }
  }, [selectedColor, form, product]);

  // عند تغيير المقاس المحدد
  useEffect(() => {
    if (selectedSize && selectedColor) {
      setCurrentQuantity(selectedSize.quantity);
      form.setValue('stock_quantity', selectedSize.quantity);
    } else if (selectedColor) {
      setCurrentQuantity(selectedColor.quantity);
      form.setValue('stock_quantity', selectedColor.quantity);
    }
  }, [selectedSize, selectedColor, form]);

  // الحصول على معرف المستخدم الحالي
  const getCurrentUserId = async (): Promise<string> => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id || 'unknown';
  };

  // تحديث المنتج محلياً
  const updateProductLocally = (newQuantity: number) => {
    if (!product) return;
    
    
    
    if (selectedSize && selectedColor) {
      // تحديث كمية المقاس المحدد والألوان والمنتج

      // 1. تحديث المقاس المحدد أولاً
      const updatedSizes = selectedColor.sizes?.map(size => {
        if (size.id === selectedSize.id) {
          return { ...size, quantity: newQuantity };
        }
        return size;
      }) || [];

      // 2. حساب إجمالي كمية المقاسات للون المحدد
      const totalSizeQuantity = updatedSizes.reduce((sum, size) => sum + (size.quantity || 0), 0);
      
      // 3. تحديث الألوان مع المقاسات الجديدة وكمية اللون
      const updatedColors = product.colors?.map(color => {
        if (color.id === selectedColor.id) {
          return { 
            ...color, 
            quantity: totalSizeQuantity,
            sizes: updatedSizes
          };
        }
        return color;
      }) || [];
      
      // 4. حساب إجمالي كمية الألوان للمنتج
      const totalColorQuantity = updatedColors.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
      
      // 5. تحديث المنتج والكمية الإجمالية
      product.colors = updatedColors;
      product.stock_quantity = totalColorQuantity;
      product.stockQuantity = totalColorQuantity;
      
      // تحديث الكمية الحالية المعروضة في الواجهة
      setCurrentQuantity(newQuantity);
      
    } else if (selectedColor) {
      // تحديث كمية اللون فقط
      const updatedColors = product.colors?.map(color => {
        if (color.id === selectedColor.id) {
          return { ...color, quantity: newQuantity };
        }
        return color;
      });
      
      // حساب إجمالي كمية الألوان للمنتج
      const totalColorQuantity = updatedColors?.reduce((sum, color) => sum + (color.quantity || 0), 0) || 0;
      
      // تحديث المنتج والكمية الإجمالية
      product.colors = updatedColors;
      product.stock_quantity = totalColorQuantity;
      product.stockQuantity = totalColorQuantity;
      
      // تحديث الكمية الحالية المعروضة في الواجهة
      setCurrentQuantity(newQuantity);
      
    } else {
      // تحديث كمية المنتج الرئيسي فقط
      product.stock_quantity = newQuantity;
      product.stockQuantity = newQuantity;
      
      // تحديث الكمية الحالية المعروضة في الواجهة
      setCurrentQuantity(newQuantity);
    }
    
    // تحديث وقت آخر تعديل للمنتج
    product.updatedAt = new Date();
    
    // للمساعدة في التصحيح، نطبع المنتج المحدث
    
  };

  const closeDialog = () => {
    
    onOpenChange(false);
  };

  // الدالة المساعدة لإكمال عملية التحديث ومزامنة واجهة المستخدم
  const finishUpdateAndRefreshUI = async (newQuantity: number) => {
    // 1. تحديث المنتج محلياً في الذاكرة (لتحديث واجهة المستخدم)
    updateProductLocally(newQuantity);
    
    // 2. إغلاق الحوار
    closeDialog();
    
    // 3. تنفيذ دالة استدعاء التحديث لتحديث القوائم في واجهة المستخدم
    try {
      
      // استخدام Promise.resolve لمنع الانتظار وتفادي إعادة الاستدعاء المتكرر
      await Promise.resolve(onStockUpdated());
      
    } catch (successError) {
      console.error('خطأ في تنفيذ دالة onStockUpdated:', successError);
    }
  };

  // التغير في اختيار اللون
  const handleColorChange = (colorId: string) => {
    if (!product) return;
    
    if (colorId === "all") {
      setSelectedColor(null);
      form.setValue('color_id', "all");
      form.setValue('size_id', "all-sizes");
      return;
    }
    
    const color = product.colors?.find(c => c.id === colorId) || null;
    setSelectedColor(color);
    form.setValue('color_id', colorId);
    form.setValue('size_id', "all-sizes");
  };

  // التغير في اختيار المقاس
  const handleSizeChange = (sizeId: string) => {
    if (!selectedColor || !product) return;
    
    if (sizeId === "all-sizes") {
      setSelectedSize(null);
      form.setValue('size_id', "all-sizes");
      return;
    }
    
    const size = selectedColor.sizes?.find(s => s.id === sizeId) || null;
    setSelectedSize(size);
    form.setValue('size_id', sizeId);
  };

  // Function to set stock quantity directly
  const handleSetStock = async (values: StockUpdateValues) => {
    if (!product) return;
    
    setIsSubmitting(true);
    
    
    try {
      const userId = await getCurrentUserId();
      
      
      // تحديد معرف المتغير (إذا كان هناك لون أو مقاس محدد)
      const variantId = values.size_id !== "all-sizes" ? values.size_id : 
                        values.color_id !== "all" ? values.color_id : 
                        undefined;
      
      // استخدام الدالة الجديدة لتعيين كمية المخزون مع دعم العمل دون اتصال
      const success = await setProductStock({
        product_id: product.id,
        variant_id: variantId,
        stock_quantity: values.stock_quantity,
        reason: 'manual-update',
        notes: values.note || 'تعديل يدوي للمخزون',
        created_by: userId
      });
      
      
      
      if (success) {
        const variantName = selectedSize 
          ? `مقاس ${selectedSize.name} من ${selectedColor?.name}` 
          : (selectedColor ? selectedColor.name : product.name);
          
        toast.success(`تم تحديث مخزون ${variantName} بنجاح`);
        
        // استخدام الدالة المساعدة لتحديث واجهة المستخدم
        await finishUpdateAndRefreshUI(values.stock_quantity);
      } else {
        toast.error('فشل في تحديث المخزون، حاول مرة أخرى');
      }
    } catch (error) {
      console.error('خطأ في تحديث المخزون:', error);
      toast.error('حدث خطأ أثناء تحديث المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Function to adjust stock quantity by adding or subtracting
  const handleAdjustStock = async (values: StockUpdateValues) => {
    if (!product) return;
    
    setIsSubmitting(true);
    
    
    try {
      // تأكد من أن قيمة التعديل هي عدد صحيح
      const adjustment = parseInt(String(values.adjustment), 10);
      
      // فحص إضافي للتأكد من صلاحية القيمة
      if (isNaN(adjustment)) {
        console.error('قيمة التعديل غير صالحة:', values.adjustment);
        toast.error('قيمة التعديل غير صالحة');
        setIsSubmitting(false);
        return;
      }

      if (adjustment === 0) {
        console.warn('لا يمكن تعديل المخزون بقيمة صفر');
        toast.warning('لا يمكن تعديل المخزون بقيمة صفر');
        setIsSubmitting(false);
        return;
      }
      
      // تسجيل التعديل قبل المعالجة
      
      
      // إضافة معالجة الأخطاء للحصول على معرف المستخدم
      let userId;
      try {
        userId = await getCurrentUserId();
        
      } catch (userError) {
        console.error('فشل في الحصول على معرف المستخدم:', userError);
        userId = 'unknown'; // استخدام قيمة افتراضية في حالة الفشل
      }
      
      // تحديد معرف المتغير (إذا كان هناك لون أو مقاس محدد)
      const variantId = values.size_id !== "all-sizes" ? values.size_id : 
                        values.color_id !== "all" ? values.color_id : 
                        undefined;
      
      // استخدام دالة تعديل المخزون مع دعم العمل دون اتصال
      try {
        const success = await updateProductStock({
          product_id: product.id,
          variant_id: variantId,
          quantity: adjustment,
          reason: adjustment > 0 ? 'stock-add' : 'stock-remove',
          notes: values.note || `تعديل يدوي للمخزون ${adjustment > 0 ? 'إضافة' : 'خصم'} ${Math.abs(adjustment)} وحدة`,
          created_by: userId
        });
        
        
        
        if (success) {
          // حساب الكمية الجديدة
          const newQuantity = Math.max(0, currentQuantity + adjustment);
          
          
          // إظهار إشعار النجاح
          const action = adjustment > 0 ? 'إضافة' : 'خصم';
          const amount = Math.abs(adjustment);
          
          const variantName = selectedSize 
            ? `مقاس ${selectedSize.name} من ${selectedColor?.name}` 
            : (selectedColor ? selectedColor.name : product.name);
            
          toast.success(`تم ${action} ${amount} وحدة من ${variantName} بنجاح`);
          
          // استخدام الدالة المساعدة لتحديث واجهة المستخدم
          await finishUpdateAndRefreshUI(newQuantity);
        } else {
          toast.error('فشل في تعديل المخزون، حاول مرة أخرى');
        }
      } catch (stockUpdateError) {
        console.error('خطأ استثنائي في تعديل المخزون:', stockUpdateError);
        toast.error('حدث خطأ غير متوقع أثناء تعديل المخزون، يرجى المحاولة مرة أخرى');
      }
    } catch (error) {
      console.error('خطأ في تعديل المخزون:', error);
      toast.error('حدث خطأ أثناء تعديل المخزون');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = async (values: StockUpdateValues) => {
    if (!product) return;
    
    
    
    if (activeTab === 'set') {
      await handleSetStock(values);
    } else {
      await handleAdjustStock(values);
    }
  };

  // Handle quick adjustments
  const handleQuickAdjustment = (amount: number) => {
    
    form.setValue('adjustment', amount);
  };

  // تحديد حالة المخزون بناءً على الكمية
  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) {
      return <Badge variant="destructive">نفذ من المخزون</Badge>;
    } 
    if (quantity <= 5) {
      return <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-100">منخفض</Badge>;
    } 
    return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100">متوفر</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>تحديث المخزون</DialogTitle>
            {isOffline && (
              <Badge variant="outline" className="gap-1 border-red-500 text-red-500">
                <WifiOff className="h-3 w-3" />
                غير متصل
              </Badge>
            )}
          </div>
          <DialogDescription>
            {product?.name} (الكمية الحالية: {currentQuantity})
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* قسم اختيار المتغيرات إذا كان المنتج يدعمها */}
            {hasVariants && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium">اختر المتغير لتحديث المخزون</h3>
                </div>
                
                {/* اختيار اللون */}
                <FormField
                  control={form.control}
                  name="color_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اللون</FormLabel>
                      <Select
                        onValueChange={(value) => handleColorChange(value)}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="اختر اللون" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">الكل (المنتج الأساسي)</SelectItem>
                          {product.colors?.map((color) => (
                            <SelectItem key={color.id} value={color.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: color.color_code }}
                                />
                                <span>{color.name}</span>
                                <Badge className="mr-1 text-xs bg-blue-100 text-blue-700">
                                  {color.quantity}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* اختيار المقاس إذا كان اللون يدعم المقاسات */}
                {selectedColor && selectedColor.has_sizes && selectedColor.sizes && selectedColor.sizes.length > 0 && (
                  <FormField
                    control={form.control}
                    name="size_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المقاس</FormLabel>
                        <Select
                          onValueChange={(value) => handleSizeChange(value)}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر المقاس" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="all-sizes">كل المقاسات</SelectItem>
                            {selectedColor.sizes?.map((size) => (
                              <SelectItem key={size.id} value={size.id}>
                                <div className="flex items-center gap-2">
                                  <span>{size.name}</span>
                                  <Badge className={`mr-1 text-xs ${size.quantity > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {size.quantity}
                                  </Badge>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                
                <div className="bg-muted/40 p-2 rounded-md mt-2 text-sm">
                  {selectedSize ? (
                    <p>تعديل مخزون: <strong>{selectedColor?.name} - {selectedSize.name}</strong></p>
                  ) : selectedColor ? (
                    <p>تعديل مخزون: <strong>{selectedColor.name}</strong></p>
                  ) : (
                    <p>تعديل المخزون الكلي للمنتج</p>
                  )}
                </div>
              </div>
            )}
            
            <Tabs defaultValue="adjust" onValueChange={(value) => setActiveTab(value as 'set' | 'adjust')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="adjust">تعديل الكمية</TabsTrigger>
                <TabsTrigger value="set">تحديد الكمية</TabsTrigger>
              </TabsList>
              
              <div className="pt-4">
                <TabsContent value="adjust">
                  <FormField
                    control={form.control}
                    name="adjustment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تعديل الكمية</FormLabel>
                        <div className="flex gap-2 mb-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleQuickAdjustment(-1)}
                          >
                            <MinusCircle className="ml-1 h-4 w-4" />
                            -1
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleQuickAdjustment(-5)}
                          >
                            <MinusCircle className="ml-1 h-4 w-4" />
                            -5
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleQuickAdjustment(5)}
                          >
                            <PlusCircle className="ml-1 h-4 w-4" />
                            +5
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleQuickAdjustment(10)}
                          >
                            <PlusCircle className="ml-1 h-4 w-4" />
                            +10
                          </Button>
                        </div>
                        <FormControl>
                          <Input 
                            type="number" 
                            inputMode="numeric" 
                            pattern="[0-9]*" 
                            min={-(currentQuantity)} 
                            step="1"
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          أدخل قيمة موجبة للإضافة أو قيمة سالبة للخصم.
                          {typeof field.value === 'number' && field.value !== 0 && (
                            <span className="block mt-1 text-sm">
                              سيصبح المخزون: {Math.max(0, currentQuantity + field.value)} وحدة
                            </span>
                          )}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
                
                <TabsContent value="set">
                  <FormField
                    control={form.control}
                    name="stock_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الكمية الجديدة</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            inputMode="numeric" 
                            pattern="[0-9]*" 
                            min="0" 
                            step="1"
                            {...field} 
                            onChange={(e) => {
                              const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                              field.onChange(value);
                            }}
                          />
                        </FormControl>
                        <FormDescription>
                          تحديد قيمة جديدة لكمية المخزون
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </TabsContent>
              </div>
              
              {/* Notes field (optional) */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات (اختياري)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="أضف ملاحظات حول سبب تغيير المخزون"
                        className="resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter className="mt-4">
                <Button 
                  variant="outline" 
                  type="button"
                  onClick={closeDialog}
                  disabled={isSubmitting}
                >
                  إلغاء
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                  {activeTab === 'adjust' ? 'تعديل المخزون' : 'تحديث المخزون'}
                </Button>
              </DialogFooter>
            </Tabs>
          </form>
        </Form>
        
        <div className="mt-2 pt-2 border-t flex items-center text-sm text-muted-foreground">
          <History className="ml-1 h-4 w-4" />
          <span>آخر تحديث: {product?.updatedAt ? new Date(product.updatedAt).toLocaleString('ar') : 'غير متوفر'}</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default StockUpdateDialog; 