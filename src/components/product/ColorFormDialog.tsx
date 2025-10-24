import React, { useState, useEffect, useRef } from 'react';
import { Loader2, Save, X, Palette, AlertTriangle, Image, Hash, DollarSign, Package, Settings, Upload, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ProductColor, ProductSize } from '@/types/product';
import { generateVariantBarcode } from '@/lib/api/products';
import { generateLocalVariantBarcode } from '@/lib/api/indexedDBProducts';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import ImageUploader from '@/components/ui/ImageUploader';
import ProductSizeManager from './ProductSizeManager';

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
  onSizesChange?: (colorId: string, sizes: ProductSize[]) => void;
  tempSizes?: ProductSize[];
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
  onSizesChange,
  tempSizes = [],
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);
  const [tempColorId] = useState(() => `temp-${Date.now()}`);

  const [duplicateCheck, setDuplicateCheck] = useState<{hasError: boolean, message: string}>({
    hasError: false, 
    message: ''
  });

  // الحصول على اللون الحالي من قائمة الألوان (للحصول على المقاسات المحدثة)
  const currentEditingColor = editingColor 
    ? colors.find(c => c.id === editingColor.id) || editingColor
    : null;

  const form = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema) as any,
    defaultValues: {
      name: '',
      color_code: '#6366f1',
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

  // معالجة تغيير صورة اللون
  const handleColorImageChange = (imageUrl: string) => {
    form.setValue('image_url', imageUrl);
  };

  // إعداد النموذج عند فتح النافذة
  useEffect(() => {
    if (open) {
      if (editingColor) {
        // استخدام currentEditingColor للحصول على المقاسات المحدثة
        const colorToEdit = currentEditingColor || editingColor;
        
        form.reset({
          name: colorToEdit.name,
          color_code: colorToEdit.color_code,
          quantity: colorToEdit.quantity,
          price: useVariantPrices ? colorToEdit.price : basePrice,
          purchase_price: useVariantPrices ? colorToEdit.purchase_price : basePurchasePrice,
          image_url: colorToEdit.image_url,
          is_default: colorToEdit.is_default,
          barcode: colorToEdit.barcode || '',
          has_sizes: colorToEdit.has_sizes || false,
        });
        
        // لا حاجة لتعيين معاينة الصورة - ImageUploader يتولى ذلك
        
        if (colorToEdit.has_sizes && colorToEdit.sizes && colorToEdit.sizes.length > 0) {
          const totalQuantity = colorToEdit.sizes.reduce((sum, size) => sum + size.quantity, 0);
          form.setValue('quantity', totalQuantity);
        }
      } else {
        form.reset({
          name: '',
          color_code: '#6366f1',
          quantity: 0,
          price: useVariantPrices ? 0 : basePrice,
          purchase_price: basePurchasePrice,
          image_url: '',
          barcode: '',
          is_default: colors.length === 0,
          has_sizes: false,
        });
        // لا حاجة لتعيين معاينة الصورة - ImageUploader يتولى ذلك
      }
      setDuplicateCheck({hasError: false, message: ''});
    }
  }, [open, editingColor, currentEditingColor, form, basePrice, basePurchasePrice, useVariantPrices, colors.length]);

  // التعامل مع إرسال النموذج
  const handleSubmit = async (values: ColorFormValues) => {
    if (duplicateCheck.hasError) {
      toast.error(duplicateCheck.message);
      return;
    }

    setIsSaving(true);
    try {
      if (!editingColor && tempSizes.length > 0 && onSizesChange) {
        onSizesChange(tempColorId, tempSizes);
      }
      
      await onSubmit(values);
      onOpenChange(false);
      toast.success(editingColor ? 'تم تحديث اللون بنجاح' : 'تم إضافة اللون بنجاح');
    } catch (error) {
      // الخطأ سيتم التعامل معه في المكون الأب
    } finally {
      setIsSaving(false);
    }
  };

  // الحصول على المقاسات الحالية للون
  const getCurrentSizes = (): ProductSize[] => {
    if (currentEditingColor) {
      return currentEditingColor.sizes || [];
    }
    return tempSizes;
  };

  // إدارة المقاسات للون الحالي
  const handleSizesChange = (sizes: ProductSize[]) => {
    // حساب الكمية الإجمالية من المقاسات
    const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
    
    if (currentEditingColor && onSizesChange) {
      onSizesChange(currentEditingColor.id, sizes);
      // تحديث الكمية في النموذج
      form.setValue('quantity', totalQuantity);
    } else if (onSizesChange) {
      onSizesChange(tempColorId, sizes);
      // تحديث الكمية في النموذج
      form.setValue('quantity', totalQuantity);
    }
  };

  // الحصول على معرف اللون الحالي
  const getCurrentColorId = (): string => {
    if (currentEditingColor) {
      return currentEditingColor.id;
    }
    return tempColorId;
  };



  const hasSizes = form.watch('has_sizes') || false;

  // تحديث الكمية عند تفعيل/إلغاء تفعيل المقاسات أو تغيير المقاسات
  useEffect(() => {
    if (hasSizes) {
      // عند تفعيل المقاسات، احسب الكمية من المقاسات الموجودة
      const currentSizes = currentEditingColor?.sizes || tempSizes;
      const totalQuantity = currentSizes.reduce((sum, size) => sum + size.quantity, 0);
      form.setValue('quantity', totalQuantity);
    } else {
      // عند إلغاء تفعيل المقاسات، يمكن للمستخدم إدخال الكمية يدوياً
      // لا نفعل شيئاً هنا، نترك الكمية كما هي
    }
  }, [hasSizes, form, currentEditingColor?.sizes, tempSizes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {editingColor ? 'تعديل اللون' : 'إضافة لون جديد'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* معلومات أساسية */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم اللون</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="أحمر، أزرق، أخضر"
                          onChange={(e) => {
                            field.onChange(e);
                            checkDuplicateColor(e.target.value, form.getValues('color_code'));
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                      {duplicateCheck.hasError && (
                        <p className="text-sm text-red-500 flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {duplicateCheck.message}
                        </p>
                      )}
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اللون</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input 
                            {...field} 
                            type="color"
                            className="w-14 h-10 p-1 border rounded cursor-pointer"
                            onChange={(e) => {
                              field.onChange(e);
                              checkDuplicateColor(form.getValues('name'), e.target.value);
                            }}
                          />
                          <Input 
                            value={field.value}
                            placeholder="#6366f1"
                            onChange={(e) => {
                              field.onChange(e);
                              checkDuplicateColor(form.getValues('name'), e.target.value);
                            }}
                            className="flex-1 font-mono"
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* تحميل الصورة */}
              <FormField
                control={form.control}
                name="image_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>صورة اللون (اختياري)</FormLabel>
                    <FormControl>
                      <ImageUploader
                        imageUrl={field.value || ''}
                        onImageUploaded={handleColorImageChange}
                        label=""
                        folder="product-colors"
                        maxSizeInMB={5}
                        className="w-full"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* الكمية والأسعار */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min="0" 
                          disabled={hasSizes}
                          placeholder="0"
                          className={hasSizes ? "bg-muted cursor-not-allowed" : ""}
                        />
                      </FormControl>
                      {hasSizes && (
                        <p className="text-xs text-muted-foreground">
                          تلقائي من المقاسات
                        </p>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {useVariantPrices && (
                  <>
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>سعر البيع</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="0" step="0.01" placeholder="0" />
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
                            <Input {...field} type="number" min="0" step="0.01" placeholder="0" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
              </div>

              {/* الإعدادات */}
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between py-2">
                  <Label className="text-sm font-medium">اللون الافتراضي</Label>
                  <FormField
                    control={form.control}
                    name="is_default"
                    render={({ field }) => (
                      <FormItem>
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

                {useSizes && (
                  <div className="flex items-center justify-between py-2">
                    <Label className="text-sm font-medium">يحتوي على مقاسات</Label>
                    <FormField
                      control={form.control}
                      name="has_sizes"
                      render={({ field }) => (
                        <FormItem>
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
                )}

                <FormField
                  control={form.control}
                  name="barcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">الباركود (اختياري)</FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input {...field} placeholder="اختياري" className="flex-1" />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleGenerateBarcode}
                            disabled={generatingBarcode}
                            size="sm"
                          >
                            {generatingBarcode ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'توليد'
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* إدارة المقاسات */}
            {useSizes && hasSizes && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3">إدارة المقاسات</h3>
                <ProductSizeManager
                  sizes={getCurrentSizes()}
                  onChange={handleSizesChange}
                  basePrice={form.watch('price') || basePrice}
                  colorId={getCurrentColorId()}
                  productId={productId}
                  useVariantPrices={useVariantPrices}
                />
              </div>
            )}

            {/* أزرار التحكم */}
            <div className="flex gap-2 pt-4 border-t">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                <X className="h-4 w-4 ml-2" />
                إلغاء
              </Button>
              
              <Button 
                type="submit"
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
                    {editingColor ? 'تحديث' : 'إضافة'}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default ColorFormDialog;
