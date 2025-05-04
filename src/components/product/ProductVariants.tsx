import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues, ProductColor } from "@/types/product";
import ProductColorManager from './ProductColorManager';

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
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="has_variants"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">
                تفعيل المتغيرات (الألوان والمقاسات)
              </FormLabel>
            </div>
            <FormControl>
              <Switch 
                checked={field.value} 
                onCheckedChange={handleHasVariantsChange}
                // تعطيل الخيار إذا كان المنتج يباع بالوزن/الحجم
                disabled={!isSoldByUnit}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {!isSoldByUnit && watchHasVariants && (
        <div className="text-yellow-600 text-sm p-2 bg-yellow-50 rounded-md">
          لا يمكن استخدام المتغيرات مع المنتجات التي تباع بالوزن/الحجم.
        </div>
      )}

      {watchHasVariants && isSoldByUnit && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center mb-2">
            <FormField
              control={form.control}
              name="use_sizes"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={handleUseSizesChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>استخدام المقاسات</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

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
        </div>
      )}
    </div>
  );
} 