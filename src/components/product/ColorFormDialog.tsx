import React, { useState, useEffect } from 'react';
import { Loader2, Save, X, Ruler, Palette, AlertTriangle } from 'lucide-react';
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
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import ProductSizeManager from './ProductSizeManager';
import {
  ColorFormHeader,
  ColorInputSection,
  ColorDetailsForm,
  ColorSettings,
} from './ColorFormDialog/index';

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
  const [activeTab, setActiveTab] = useState<"details" | "sizes">("details");

  const [duplicateCheck, setDuplicateCheck] = useState<{hasError: boolean, message: string}>({
    hasError: false, 
    message: ''
  });

  const form = useForm<ColorFormValues>({
    resolver: zodResolver(colorFormSchema),
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

  // إعداد النموذج عند فتح النافذة
  useEffect(() => {
    if (open) {
      if (editingColor) {
        form.reset({
          name: editingColor.name,
          color_code: editingColor.color_code,
          quantity: editingColor.quantity,
          price: useVariantPrices ? editingColor.price : basePrice,
          purchase_price: useVariantPrices ? editingColor.purchase_price : basePurchasePrice,
          image_url: editingColor.image_url,
          is_default: editingColor.is_default,
          barcode: editingColor.barcode || '',
          has_sizes: editingColor.has_sizes || false,
        });
        
        if (editingColor.has_sizes && editingColor.sizes && editingColor.sizes.length > 0) {
          const totalQuantity = editingColor.sizes.reduce((sum, size) => sum + size.quantity, 0);
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
      }
      setDuplicateCheck({hasError: false, message: ''});
      setActiveTab("details");
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
      if (!editingColor && tempSizes.length > 0 && onSizesChange) {
        const tempColorId = `temp-${Date.now()}`;
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
    if (editingColor) {
      return editingColor.sizes || [];
    }
    return tempSizes;
  };

  // إدارة المقاسات للون الحالي
  const handleSizesChange = (sizes: ProductSize[]) => {
    if (editingColor && onSizesChange) {
      onSizesChange(editingColor.id, sizes);
    } else if (onSizesChange) {
      onSizesChange(`temp-${Date.now()}`, sizes);
      const totalQuantity = sizes.reduce((sum, size) => sum + size.quantity, 0);
      form.setValue('quantity', totalQuantity);
      
      if (sizes.length > tempSizes.length) {
        toast.success('تم إضافة مقاس جديد');
      } else if (sizes.length < tempSizes.length) {
        toast.info('تم حذف مقاس');
      }
    }
  };

  // الحصول على معرف اللون الحالي
  const getCurrentColorId = (): string => {
    if (editingColor) {
      return editingColor.id;
    }
    return `temp-${Date.now()}`;
  };



  const currentColorValue = form.watch('color_code') || '#6366f1';
  const currentName = form.watch('name') || '';
  const currentPrice = form.watch('price') || 0;
  const currentQuantity = form.watch('quantity') || 0;
  const currentImage = form.watch('image_url') || '';
  const hasSizes = form.watch('has_sizes') || false;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[95vh] sm:h-[90vh] p-0 gap-0 flex flex-col bg-white dark:bg-slate-900">
        {/* Header - ثابت في الأعلى */}
        <div className="flex-shrink-0">
          <ColorFormHeader
            isEditing={!!editingColor}
            colorName={currentName}
            colorCode={currentColorValue}
            imageUrl={currentImage}
            price={currentPrice}
            quantity={currentQuantity}
          />
        </div>

        {/* المحتوى الرئيسي - قابل للتمرير */}
        <div className="flex-1 min-h-0 flex flex-col">
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "details" | "sizes")} 
            className="h-full flex flex-col"
          >
            {/* التبويبات - ثابتة */}
            <div className="flex-shrink-0 border-b bg-slate-50/50 dark:bg-slate-800/50 px-4 sm:px-6 pt-4">
              <TabsList className="grid w-full max-w-md grid-cols-2 bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
                <TabsTrigger 
                  value="details" 
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white text-sm"
                >
                  <Palette className="h-4 w-4" />
                  <span className="hidden sm:inline">تفاصيل اللون</span>
                  <span className="sm:hidden">التفاصيل</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="sizes" 
                  disabled={!useSizes || !hasSizes}
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-white disabled:opacity-50 text-sm"
                >
                  <Ruler className="h-4 w-4" />
                  <span className="hidden sm:inline">المقاسات</span>
                  <span className="sm:hidden">المقاسات</span>
                  {hasSizes && (
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  )}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* محتوى التبويبات - قابل للتمرير */}
            <div className="flex-1 min-h-0 bg-slate-50/30 dark:bg-slate-900/30">
              <TabsContent value="details" className="h-full m-0">
                <div className="h-full overflow-y-auto">
                  <div className="p-4 sm:p-6 pb-6">
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
                        {/* إدخال اللون */}
                        <ColorInputSection
                          form={form}
                          duplicateError={duplicateCheck}
                          onNameChange={(name) => checkDuplicateColor(name, form.getValues('color_code'))}
                          onColorChange={(color) => checkDuplicateColor(form.getValues('name'), color)}
                        />

                        {/* تفاصيل اللون */}
                        <ColorDetailsForm
                          form={form}
                          useVariantPrices={useVariantPrices}
                          useSizes={useSizes}
                        />

                        {/* الإعدادات المتقدمة */}
                        <ColorSettings
                          form={form}
                          useSizes={useSizes}
                          colorsCount={colors.length}
                          generatingBarcode={generatingBarcode}
                          onGenerateBarcode={handleGenerateBarcode}
                          getCurrentSizes={getCurrentSizes}
                        />
                      </form>
                    </Form>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="sizes" className="h-full m-0">
                <div className="h-full overflow-y-auto">
                  <div className="p-4 sm:p-6">
                    {useSizes && hasSizes ? (
                      <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
                        <CardContent className="p-4 sm:p-6">
                          <div className="flex items-center gap-2 mb-6">
                            <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 rounded-xl">
                              <Ruler className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                                إدارة مقاسات اللون
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400">
                                أضف وأدر المقاسات المختلفة لهذا اللون
                              </p>
                            </div>
                          </div>
                          
                          <ProductSizeManager
                            sizes={getCurrentSizes()}
                            onChange={handleSizesChange}
                            basePrice={form.watch('price') || basePrice}
                            colorId={getCurrentColorId()}
                            productId={productId}
                            useVariantPrices={useVariantPrices}
                          />
                        </CardContent>
                      </Card>
                    ) : (
                      <Card className="border-2 border-dashed border-slate-300 dark:border-slate-600">
                        <CardContent className="flex flex-col items-center justify-center py-12 sm:py-16 text-center">
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-full flex items-center justify-center mb-4 sm:mb-6">
                            <Ruler className="h-8 w-8 sm:h-10 sm:w-10 text-slate-400" />
                          </div>
                          <h3 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2 sm:mb-3">
                            المقاسات غير مفعلة
                          </h3>
                          <p className="text-slate-600 dark:text-slate-400 mb-4 sm:mb-6 max-w-md leading-relaxed text-sm sm:text-base">
                            لاستخدام المقاسات، يجب أولاً تفعيل خيار "يحتوي على مقاسات متعددة" في الإعدادات المتقدمة
                          </p>
                          <Button
                            variant="outline"
                            onClick={() => setActiveTab("details")}
                            className="gap-2 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
                          >
                            <AlertTriangle className="h-4 w-4" />
                            تفعيل المقاسات
                          </Button>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Footer - ثابت في الأسفل */}
        <div className="flex-shrink-0 border-t bg-white dark:bg-slate-900 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4 ml-2" />
              إلغاء
            </Button>
            
            <Button 
              type="button" 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSaving || duplicateCheck.hasError}
              className="flex-1 h-11 sm:h-12 text-sm sm:text-base gap-2 bg-primary hover:bg-primary/90"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الحفظ...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {editingColor ? 'تحديث اللون' : 'إضافة اللون'}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ColorFormDialog;
