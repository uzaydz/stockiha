import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues, ProductColor } from "@/types/product";
import ProductColorManager from './ProductColorManager';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Palette, Layers, AlertTriangle, Settings } from 'lucide-react';

interface ProductVariantsProps {
  form: UseFormReturn<ProductFormValues>;
  productColors?: ProductColor[];
  onProductColorsChange?: (colors: ProductColor[]) => void;
  mainImageUrl?: string;
  useVariantPrices?: boolean;
  productId?: string;
}

export default function ProductVariants({ 
  form, 
  productColors = [], 
  onProductColorsChange = () => {}, 
  mainImageUrl = '',
  useVariantPrices: externalUseVariantPrices,
  productId = ''
}: ProductVariantsProps) {
  const [useSizes, setUseSizes] = useState(false);

  const watchHasVariants = form.watch('has_variants');
  const watchPrice = form.watch('price');
  const watchPurchasePrice = form.watch('purchase_price');
  const useVariantPrices = externalUseVariantPrices !== undefined ? externalUseVariantPrices : form.watch('use_variant_prices');
  const isSoldByUnit = form.watch('is_sold_by_unit');
  
  // تسجيل بيانات التحقق
  console.log('🔍 ProductVariants - الألوان المستقبلة:', productColors);
  console.log('🔍 ProductVariants - watchHasVariants:', watchHasVariants);
  console.log('🔍 ProductVariants - isSoldByUnit:', isSoldByUnit);
  console.log('🔍 ProductVariants - سيتم عرض ProductColorManager؟', watchHasVariants && isSoldByUnit);
  
  // تحديث السعر في الألوان عند تغيير السعر الأساسي وعدم استخدام أسعار متغيرة
  useEffect(() => {
    if (!useVariantPrices && productColors.length > 0) {
      // فحص ما إذا كانت هناك حاجة فعلية لتحديث الألوان
      const needsUpdate = productColors.some(color => color.price !== watchPrice);
      
      // فقط قم بالتحديث إذا كانت هناك حاجة لذلك
      if (needsUpdate) {
        const updatedColors = productColors.map(color => ({
          ...color,
          price: watchPrice,
          purchase_price: watchPurchasePrice // تحديث سعر الشراء أيضًا
        }));
        onProductColorsChange(updatedColors);
      }
    }
  }, [watchPrice, watchPurchasePrice, useVariantPrices, productColors, onProductColorsChange]);

  // لا يمكن استخدام المتغيرات إذا كان المنتج يباع بالوزن/الحجم
  useEffect(() => {
    if (!isSoldByUnit && watchHasVariants) {
      form.setValue('has_variants', false);
    }
  }, [isSoldByUnit, watchHasVariants, form]);

  // تعامل مع تغيير حالة المتغيرات
  const handleHasVariantsChange = (hasVariants: boolean) => {
    // لا يمكن تفعيل المتغيرات إذا كان المنتج يباع بالوزن/الحجم
    if (!isSoldByUnit && hasVariants) {
      return;
    }
    
    form.setValue('has_variants', hasVariants);
    
    // إذا تم تفعيل المتغيرات وليس هناك ألوان، إضافة لون افتراضي
    if (hasVariants && productColors.length === 0) {
      const defaultColor: ProductColor = {
        id: Date.now().toString(),
        name: 'اللون الافتراضي',
        color_code: '#000000',
        quantity: form.getValues('stock_quantity'),
        price: form.getValues('price'),
        purchase_price: form.getValues('purchase_price'),
        is_default: true,
        image_url: mainImageUrl,
        has_sizes: useSizes,
        sizes: useSizes ? [] : undefined
      };
      onProductColorsChange([defaultColor]);
    }
  };

  // التعامل مع تغيير استخدام المقاسات
  const handleUseSizesChange = (newValue: boolean) => {
    setUseSizes(newValue);
    form.setValue('use_sizes', newValue);
    
    // تحديث الألوان لتعكس التغيير في استخدام المقاسات
    if (productColors.length > 0) {
      const updatedColors = productColors.map(color => ({
        ...color,
        has_sizes: newValue,
        sizes: newValue ? (color.sizes || []) : undefined
      }));
      onProductColorsChange(updatedColors);
    }
  };

  return (
    <div className="space-y-6">
      {/* Variants Settings */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            إعدادات المتغيرات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            control={form.control}
            name="has_variants"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between p-6 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className="bg-purple-100 p-3 rounded-full">
                      <Palette className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <FormLabel className="text-base font-semibold">
                        تفعيل المتغيرات (الألوان والمقاسات)
                      </FormLabel>
                      <div className="text-sm text-muted-foreground">
                        إضافة ألوان ومقاسات مختلفة للمنتج
                      </div>
                    </div>
                  </div>
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={handleHasVariantsChange}
                      disabled={!isSoldByUnit}
                    />
                  </FormControl>
                </div>
              </FormItem>
            )}
          />

          {!isSoldByUnit && (
            <Alert className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="flex items-center gap-2">
                  <div className="bg-amber-100 p-1.5 rounded-full">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <span className="font-medium">
                    لا يمكن استخدام المتغيرات مع المنتجات التي تباع بالوزن/الحجم
                  </span>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Variants Configuration */}
      {watchHasVariants && isSoldByUnit && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Settings className="h-4 w-4 text-blue-600" />
              </div>
              إعدادات تفصيلية
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Sizes Toggle */}
            <FormField
              control={form.control}
              name="use_sizes"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <div className="bg-green-100 p-2 rounded-full">
                        <Layers className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <FormLabel className="font-medium">استخدام المقاسات</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          إضافة مقاسات مختلفة لكل لون
                        </div>
                      </div>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={handleUseSizesChange}
                      />
                    </FormControl>
                  </div>
                </FormItem>
              )}
            />

            {/* Colors Manager */}
            <ProductColorManager
              colors={productColors}
              onChange={onProductColorsChange}
              basePrice={watchPrice}
              basePurchasePrice={watchPurchasePrice}
              useVariantPrices={useVariantPrices}
              onUseVariantPricesChange={(value) => form.setValue('use_variant_prices', value)}
              useSizes={useSizes}
              onUseSizesChange={handleUseSizesChange}
              productId={productId}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
