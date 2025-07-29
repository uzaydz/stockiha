import React, { useState, useEffect } from 'react';
import { Loader2, Save, X, Palette, AlertCircle, Check, Sparkles } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductColor } from '@/types/product';
import { generateVariantBarcode } from '@/lib/api/products';
import { generateLocalVariantBarcode } from '@/lib/api/indexedDBProducts';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ImageUploader from '@/components/ui/ImageUploader';
import ColorPicker from './ColorPicker';

// نموذج بيانات إدخال اللون
const colorFormSchema = z.object({
  name: z.string().min(1, { message: 'اسم اللون مطلوب' }),
  color_code: z.string().min(1, { message: 'كود اللون مطلوب' }),
  quantity: z.coerce.number().nonnegative({ message: 'الكمية يجب أن تكون صفر أو أكثر' }).default(0),
  price: z.coerce.number().nonnegative({ message: 'السعر يجب أن يكون صفر أو أكثر' }).optional(),
  purchase_price: z.coerce.number().nonnegative({ message: 'سعر الشراء يجب أن يكون صفر أو أكثر' }).optional(),
  image_url: z.string().optional(),
  barcode: z.string().optional(),
  is_default: z.boolean().default(false),
  has_sizes: z.boolean().default(false),
});

type ColorFormValues = z.infer<typeof colorFormSchema>;

interface ColorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingColor: ProductColor | null;
  colors: ProductColor[];
  onSubmit: (values: ColorFormValues) => Promise<void>;
  basePrice: number;
  basePurchasePrice: number;
  useVariantPrices: boolean;
  useSizes: boolean;
  productId: string;
}

const ColorFormDialog: React.FC<ColorFormDialogProps> = ({
  open,
  onOpenChange,
  editingColor,
  colors,
  onSubmit,
  basePrice,
  basePurchasePrice,
  useVariantPrices,
  useSizes,
  productId,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [suggestedColors] = useState<string[]>([
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57',
    '#A8E6CF', '#88D8C0', '#FFE0B2', '#81D4FA', '#E1BEE7'
  ]);
  const [duplicateCheck, setDuplicateCheck] = useState<{hasError: boolean, message: string}>({
    hasError: false, 
    message: ''
  });

  const form = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
    defaultValues: {
      name: '',
      color_code: '#000000',
      quantity: 0,
      price: basePrice,
      purchase_price: basePurchasePrice,
      image_url: '',
      is_default: false,
      barcode: '',
      has_sizes: false,
    },
  });

  // فحص الألوان المكررة
  const checkDuplicateColor = (colorName: string, colorCode: string) => {
    const isDuplicateName = colors.some(c => 
      c.name.toLowerCase() === colorName.toLowerCase() && 
      c.id !== editingColor?.id
    );
    
    const isDuplicateCode = colors.some(c => 
      c.color_code.toUpperCase() === colorCode.toUpperCase() && 
      c.id !== editingColor?.id
    );
    
    if (isDuplicateName) {
      setDuplicateCheck({hasError: true, message: 'اسم اللون موجود بالفعل'});
    } else if (isDuplicateCode) {
      setDuplicateCheck({hasError: true, message: 'كود اللون موجود بالفعل'});
    } else {
      setDuplicateCheck({hasError: false, message: ''});
    }
  };

  // توليد الباركود
  const handleGenerateBarcode = async () => {
    try {
      setGeneratingBarcode(true);
      
      let generatedBarcode;
      
      if (navigator.onLine) {
        if (editingColor && editingColor.product_id && editingColor.id) {
          generatedBarcode = await generateVariantBarcode(editingColor.product_id, editingColor.id);
        } else {
          const timestamp = Date.now();
          const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
          generatedBarcode = `TEMP-${timestamp}-${random}`;
        }
      } else {
        const baseBarcode = editingColor?.barcode || '';
        generatedBarcode = generateLocalVariantBarcode(baseBarcode);
      }
      
      if (generatedBarcode) {
        form.setValue('barcode', generatedBarcode);
        toast.success('تم توليد الباركود بنجاح');
      } else {
        toast.error('فشل في توليد الباركود');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  // إعداد النموذج عند فتح النافذة
  useEffect(() => {
    if (open) {
      if (editingColor) {
        form.reset({
          name: editingColor.name,
          color_code: editingColor.color_code,
          quantity: editingColor.quantity,
          // إذا لم تكن أسعار متغيرة مفعلة، استخدم السعر الأساسي بدلاً من سعر اللون المحفوظ
          price: useVariantPrices ? editingColor.price : basePrice,
          purchase_price: useVariantPrices ? editingColor.purchase_price : basePurchasePrice,
          image_url: editingColor.image_url,
          is_default: editingColor.is_default,
          barcode: editingColor.barcode || '',
          has_sizes: editingColor.has_sizes || false,
        });
      } else {
        form.reset({
          name: '',
          color_code: '#000000',
          quantity: 0,
          price: useVariantPrices ? 0 : basePrice,
          purchase_price: basePurchasePrice,
          image_url: '',
          barcode: '',
          is_default: colors.length === 0,
          has_sizes: false,
        });
      }
      setDuplicateCheck({hasError: false, message: ''});
    }
  }, [open, editingColor, form, basePrice, basePurchasePrice, useVariantPrices, colors.length]);

  // التعامل مع إرسال النموذج
  const handleSubmit = async (values: ColorFormValues) => {
    if (duplicateCheck.hasError) {
      toast.error(duplicateCheck.message);
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (error) {
      // الخطأ سيتم التعامل معه في المكون الأب
    } finally {
      setIsSaving(false);
    }
  };

  // فلترة الألوان المقترحة
  const availableSuggestedColors = suggestedColors.filter(color => 
    !colors.some(c => c.color_code.toUpperCase() === color.toUpperCase())
  ).slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {editingColor ? 'قم بتعديل معلومات اللون' : 'أضف لوناً جديداً لمنتجك'}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="space-y-4 p-4 min-h-0">
            {/* تحذير من الألوان المكررة */}
            {duplicateCheck.hasError && (
              <Alert className="border-destructive/50 bg-destructive/5">
                <AlertCircle className="h-4 w-4 text-destructive" />
                <AlertDescription className="text-destructive">
                  {duplicateCheck.message}
                </AlertDescription>
              </Alert>
            )}

            {/* معاينة اللون */}
            <Card className="border-2 border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-primary/2 to-secondary/5 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* منطقة الصورة واللون */}
                  <div className="relative flex-shrink-0">
                    <div className="relative w-16 h-16 group">
                      {form.watch('image_url') ? (
                        <>
                          {/* الصورة مع تأثير اللون */}
                          <div className="relative w-full h-full rounded-xl overflow-hidden shadow-lg ring-2 ring-background">
                            <img 
                              src={form.watch('image_url')} 
                              alt="معاينة اللون" 
                              className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                            />
                            {/* طبقة اللون الشفافة */}
                            <div 
                              className="absolute inset-0 bg-opacity-20 mix-blend-multiply"
                              style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                            />
                          </div>
                          {/* نقطة اللون */}
                          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-3 border-background shadow-lg flex items-center justify-center">
                            <div 
                              className="w-4 h-4 rounded-full shadow-sm"
                              style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          {/* مربع اللون فقط */}
                          <div 
                            className="w-full h-full rounded-xl shadow-lg ring-2 ring-background flex items-center justify-center text-white font-bold text-lg transition-all duration-300 group-hover:scale-105"
                            style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                          >
                            <span className="drop-shadow-md">
                              {form.watch('name')?.charAt(0)?.toUpperCase() || '؟'}
                            </span>
                          </div>
                          {/* تأثير اللمعان */}
                          <div className="absolute inset-2 rounded-lg bg-gradient-to-tr from-white/20 to-transparent pointer-events-none" />
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* معلومات اللون */}
                  <div className="flex-1 min-w-0">
                    <div className="space-y-2">
                      {/* الاسم والكود */}
                      <div className="space-y-1">
                        <h3 className="font-bold text-lg text-foreground leading-tight">
                          {form.watch('name') || 'اسم اللون'}
                        </h3>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-sm border border-border shadow-sm"
                            style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                          />
                          <p className="text-sm text-muted-foreground font-mono">
                            {form.watch('color_code') || '#000000'}
                          </p>
                        </div>
                      </div>
                      
                      {/* الأسعار والكميات */}
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-medium">
                          <span className="text-green-600 dark:text-green-400">
                            {form.watch('price') || 0} دج
                          </span>
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <span className="text-blue-600 dark:text-blue-400">
                            {form.watch('quantity') || 0} قطعة
                          </span>
                        </Badge>
                        {form.watch('barcode') && (
                          <Badge variant="outline" className="text-xs">
                            <span className="text-purple-600 dark:text-purple-400">
                              {form.watch('barcode')}
                            </span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                {/* المعلومات الأساسية */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">المعلومات الأساسية</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>اسم اللون*</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="مثال: أحمر" 
                                {...field} 
                                onChange={(e) => {
                                  field.onChange(e);
                                  checkDuplicateColor(e.target.value, form.getValues('color_code'));
                                }}
                                className="font-medium"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="color_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>كود اللون*</FormLabel>
                            <FormControl>
                              <div className="space-y-3">
                                <ColorPicker 
                                  value={field.value} 
                                  onChange={(color) => {
                                    field.onChange(color);
                                    checkDuplicateColor(form.getValues('name'), color);
                                  }}
                                />
                                
                                {/* الألوان المقترحة */}
                                {availableSuggestedColors.length > 0 && (
                                  <div className="space-y-2">
                                    <label className="text-sm text-muted-foreground">ألوان مقترحة:</label>
                                    <div className="flex gap-2 flex-wrap">
                                      {availableSuggestedColors.map((color, index) => (
                                        <button
                                          key={index}
                                          type="button"
                                          className="group relative w-8 h-8 rounded-full border-2 border-white dark:border-gray-700 shadow-md hover:scale-110 hover:shadow-lg transition-all duration-200"
                                          style={{ backgroundColor: color }}
                                          onClick={() => {
                                            field.onChange(color);
                                            checkDuplicateColor(form.getValues('name'), color);
                                          }}
                                          title={`استخدام اللون ${color}`}
                                        >
                                          {field.value === color && (
                                            <div className="absolute inset-0 flex items-center justify-center">
                                              <Check className="h-3 w-3 text-white drop-shadow-md" />
                                            </div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* التسعير والكميات */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الكمية*</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                min="0" 
                                {...field} 
                                disabled={useSizes && form.getValues('has_sizes')}
                                className="text-center font-medium"
                              />
                            </FormControl>
                            {useSizes && form.getValues('has_sizes') && (
                              <FormDescription className="text-xs text-center">
                                سيتم حساب الكمية من المقاسات
                              </FormDescription>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              سعر البيع*
                              {!useVariantPrices && (
                                <Badge variant="secondary" className="text-xs ml-2">افتراضي</Badge>
                              )}
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  disabled={!useVariantPrices}
                                  {...field} 
                                  className="text-center font-medium pr-8"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  دج
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="purchase_price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>سعر الشراء</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input 
                                  type="number" 
                                  min="0" 
                                  step="0.01"
                                  disabled={!useVariantPrices}
                                  {...field} 
                                  className="text-center font-medium pr-8"
                                />
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                                  دج
                                </span>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* الصورة والإعدادات المتقدمة */}
                <Card>
                  <CardContent className="p-4 space-y-4">
                    {/* الباركود والصورة في صف واحد */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الباركود</FormLabel>
                            <div className="flex gap-2">
                              <FormControl>
                                <Input 
                                  placeholder="باركود متغير المنتج" 
                                  {...field} 
                                />
                              </FormControl>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleGenerateBarcode}
                                disabled={generatingBarcode}
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

                      <FormField
                        control={form.control}
                        name="image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="flex items-center gap-2">
                              <span>صورة اللون</span>
                              <Badge variant="secondary" className="text-xs">
                                اختيارية
                              </Badge>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                {field.value ? (
                                  // عرض الصورة المرفوعة
                                  <div className="relative group">
                                    <div className="w-full h-16 rounded-lg overflow-hidden border-2 border-border bg-muted">
                                      <img 
                                        src={field.value} 
                                        alt="صورة اللون" 
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => field.onChange('')}
                                      className="absolute top-1 right-1 h-6 w-6 p-0 bg-white/90 hover:bg-white dark:bg-gray-800/90"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={() => document.getElementById('color-image-input')?.click()}
                                      className="absolute bottom-1 right-1 h-6 px-2 text-xs bg-white/90 hover:bg-white dark:bg-gray-800/90"
                                    >
                                      تغيير
                                    </Button>
                                  </div>
                                ) : (
                                  // منطقة رفع الصورة المبسطة
                                  <div 
                                    onClick={() => document.getElementById('color-image-input')?.click()}
                                    className="w-full h-16 border-2 border-dashed border-primary/30 bg-primary/5 rounded-lg flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/10 transition-all duration-200 group"
                                  >
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground group-hover:text-foreground">
                                      <div 
                                        className="w-6 h-6 rounded-full border border-border"
                                        style={{ backgroundColor: form.watch('color_code') || '#000000' }}
                                      />
                                      <span>انقر لإضافة صورة</span>
                                    </div>
                                  </div>
                                )}
                                
                                {/* حقل الرفع المخفي */}
                                <input
                                  id="color-image-input"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      // هنا يمكن إضافة منطق رفع الصورة
                                      const reader = new FileReader();
                                      reader.onload = (event) => {
                                        field.onChange(event.target?.result as string);
                                      };
                                      reader.readAsDataURL(file);
                                    }
                                  }}
                                />
                              </div>
                            </FormControl>
                            <FormDescription className="text-xs text-muted-foreground">
                              صورة توضيحية للون (PNG, JPG, WEBP)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* الإعدادات */}
                    <div className="space-y-3 pt-3 border-t">
                      {useSizes && (
                        <FormField
                          control={form.control}
                          name="has_sizes"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm">يحتوي على مقاسات متعددة</FormLabel>
                                <FormDescription className="text-xs">
                                  تفعيل هذا الخيار سيسمح بإضافة مقاسات مختلفة لهذا اللون
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="is_default"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={colors.length === 0}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm">اللون الافتراضي</FormLabel>
                              <FormDescription className="text-xs">
                                هذا اللون سيظهر افتراضياً عند عرض المنتج
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </form>
            </Form>
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex gap-2 w-full">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 ml-1" />
              إلغاء
            </Button>
            
            <Button 
              type="button" 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSaving || duplicateCheck.hasError}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 ml-2" />
                  {editingColor ? 'تحديث اللون' : 'إضافة اللون'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColorFormDialog; 