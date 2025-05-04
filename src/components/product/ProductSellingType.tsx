import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { UseFormReturn, useWatch } from "react-hook-form";
import { ProductFormValues } from "@/types/product";

// أنواع وحدات الوزن والحجم الشائعة
const UNIT_TYPES = [
  { value: "kg", label: "كيلوغرام (كغ)" },
  { value: "g", label: "غرام (غ)" },
  { value: "l", label: "لتر (ل)" },
  { value: "ml", label: "ميليلتر (مل)" },
  { value: "m", label: "متر (م)" },
  { value: "cm", label: "سنتيمتر (سم)" },
  { value: "m2", label: "متر مربع (م²)" },
  { value: "m3", label: "متر مكعب (م³)" },
  { value: "pcs", label: "قطعة" },
  { value: "box", label: "صندوق" },
  { value: "pack", label: "عبوة" },
  { value: "pair", label: "زوج" },
  { value: "set", label: "طقم" },
  { value: "other", label: "أخرى" }
];

interface ProductSellingTypeProps {
  form: UseFormReturn<ProductFormValues>;
  onHasVariantsChange?: (hasVariants: boolean) => void;
}

export default function ProductSellingType({ form, onHasVariantsChange }: ProductSellingTypeProps) {
  const isSoldByUnit = form.watch('is_sold_by_unit');
  const hasVariants = form.watch('has_variants');
  const useVariantPrices = form.watch('use_variant_prices');
  
  // عند تغيير طريقة البيع من قطعة إلى وزن/حجم، تعطيل المتغيرات
  useEffect(() => {
    if (!isSoldByUnit && hasVariants) {
      form.setValue('has_variants', false);
      if (onHasVariantsChange) {
        onHasVariantsChange(false);
      }
      form.setValue('use_sizes', false);
    }
  }, [isSoldByUnit, hasVariants, form, onHasVariantsChange]);

  // التعامل مع تغيير طريقة البيع
  const handleSellingTypeChange = (value: boolean) => {
    form.setValue('is_sold_by_unit', value);
    
    // إذا تم التغيير إلى البيع بالوزن/الحجم، تعطيل المتغيرات
    if (!value && hasVariants) {
      form.setValue('has_variants', false);
      if (onHasVariantsChange) {
        onHasVariantsChange(false);
      }
      form.setValue('use_sizes', false);
    }
    
    // إذا لم يتم تعيين نوع الوحدة بعد، تعيين القيمة الافتراضية
    if (!value && !form.getValues('unit_type')) {
      form.setValue('unit_type', 'kg');
    }
    
    // نسخ السعر ونشره في حقول الوحدة
    if (!value) {
      form.setValue('unit_sale_price', form.getValues('price'));
      form.setValue('unit_purchase_price', form.getValues('purchase_price'));
    }
  };

  return (
    <div className="space-y-4">
      <Separator className="my-4" />
      <h3 className="text-lg font-medium">طريقة البيع</h3>
      
      <div className="grid gap-4">
        <FormField
          control={form.control}
          name="is_sold_by_unit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  البيع بالقطعة
                </FormLabel>
                <FormDescription>
                  يباع المنتج كقطعة واحدة، ويمكن إضافة متغيرات مثل الألوان والمقاسات
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={handleSellingTypeChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        
        {!isSoldByUnit && (
          <>
            <FormField
              control={form.control}
              name="unit_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع الوحدة</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value || 'kg'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع الوحدة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {UNIT_TYPES.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر نوع الوحدة التي يباع بها المنتج (كيلوغرام، لتر، الخ)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit_purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الشراء للوحدة الواحدة*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="unit_sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر البيع للوحدة الواحدة*</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value) || 0);
                          // تحديث سعر المنتج الرئيسي ليكون نفس سعر الوحدة
                          form.setValue('price', parseFloat(e.target.value) || 0);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </>
        )}
        
        {isSoldByUnit && hasVariants && (
          <FormField
            control={form.control}
            name="use_variant_prices"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    استخدام أسعار مختلفة للمتغيرات
                  </FormLabel>
                  <FormDescription>
                    تفعيل هذا الخيار يسمح بتعيين أسعار مختلفة لكل لون أو مقاس
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={(value) => {
                      form.setValue('use_variant_prices', value);
                    }}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
} 