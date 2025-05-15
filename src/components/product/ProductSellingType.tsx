import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { UseFormReturn, useWatch } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Layers, SplitSquareVertical, ChevronsUpDown, Scale, Ruler, ShoppingBag, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

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
  // هام: true = البيع بالقطعة، false = البيع بالوزن
  const isSoldByUnit = form.watch('is_sold_by_unit');
  const hasVariants = form.watch('has_variants');
  const useVariantPrices = form.watch('use_variant_prices');
  
  // تستخدم لعرض/إخفاء خيارات البيع بالوزن
  const [showWeightOptions, setShowWeightOptions] = useState(!isSoldByUnit);
  
  // تحديث حالة عرض خيارات البيع بالوزن عند تغيير isSoldByUnit
  useEffect(() => {
    
    setShowWeightOptions(!isSoldByUnit);
    
    // تأكد من تعيين قيمة unit_type عند البيع بالوزن
    if (!isSoldByUnit && !form.getValues('unit_type')) {
      form.setValue('unit_type', 'kg');
    }
    
    // تحديث أسعار الوحدة عند التغيير للبيع بالوزن
    if (!isSoldByUnit) {
      // نسخ قيم الأسعار من المنتج الأساسي إلى حقول الوحدة
      form.setValue('unit_sale_price', form.getValues('price') || 0);
      form.setValue('unit_purchase_price', form.getValues('purchase_price') || 0);
    }
  }, [isSoldByUnit, form]);
  
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
    
    
    // تعيين القيمة في النموذج (true = بالقطعة، false = بالوزن)
    form.setValue('is_sold_by_unit', value);
    
    // التأكد من تحديث حالة عرض خيارات البيع بالوزن فوراً
    setShowWeightOptions(!value);
    
    // إذا تم التغيير إلى البيع بالوزن/الحجم، تعطيل المتغيرات
    if (!value && hasVariants) {
      form.setValue('has_variants', false);
      if (onHasVariantsChange) {
        onHasVariantsChange(false);
      }
      form.setValue('use_sizes', false);
    }
  };

  // التعامل مع تغيير خاصية المتغيرات
  const handleHasVariantsChange = (value: boolean) => {
    form.setValue('has_variants', value);
    if (onHasVariantsChange) {
      onHasVariantsChange(value);
    }
    // إذا تم تعطيل المتغيرات، يجب تعطيل استخدام الأسعار المختلفة للمتغيرات أيضاً
    if (!value) {
      form.setValue('use_variant_prices', false);
      form.setValue('use_sizes', false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-3 border-b">
          <h3 className="text-lg font-medium flex items-center gap-2">
            <ChevronsUpDown className="h-5 w-5 text-primary" />
            طريقة البيع
          </h3>
        </CardHeader>
        <CardContent className="p-5 space-y-6">
          {/* قسم طريقة البيع الرئيسي */}
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className={cn(
                "overflow-hidden transition-all", 
                isSoldByUnit ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/50"
              )}>
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="is_sold_by_unit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-1">
                            <SplitSquareVertical className="h-4 w-4 text-blue-500" />
                            البيع بالقطعة
                          </FormLabel>
                          <FormDescription className="text-xs">
                            يباع المنتج كقطعة واحدة، ويمكن إضافة متغيرات مثل الألوان والمقاسات
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === true}
                            onCheckedChange={(checked) => handleSellingTypeChange(checked)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card className={cn(
                "overflow-hidden transition-all", 
                !isSoldByUnit ? "bg-primary/10 border-primary/30" : "bg-muted/10 border-border/50"
              )}>
                <CardContent className="p-4">
                  <FormField
                    control={form.control}
                    name="is_sold_by_unit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg p-2">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base flex items-center gap-1">
                            <Scale className="h-4 w-4 text-amber-500" />
                            البيع بالوزن/الحجم
                          </FormLabel>
                          <FormDescription className="text-xs">
                            يباع المنتج بالوزن أو الحجم (كيلوغرام، لتر، متر، الخ)
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value === false}
                            onCheckedChange={(checked) => handleSellingTypeChange(!checked)}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* إضافة زر تفعيل خاصية المتغيرات فقط عند البيع بالقطعة */}
            {isSoldByUnit && (
              <FormField
                control={form.control}
                name="has_variants"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 bg-muted/20">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base flex items-center gap-1">
                        <Layers className="h-4 w-4 text-primary" />
                        تفعيل المتغيرات
                      </FormLabel>
                      <FormDescription>
                        تفعيل هذا الخيار يسمح بإضافة متغيرات مثل الألوان والمقاسات للمنتج
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={handleHasVariantsChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            )}
          </div>
          
          {/* خيارات البيع بالوزن/الحجم */}
          {showWeightOptions && (
            <Card className="border border-dashed bg-muted/10 mt-4">
              <CardHeader className="pb-2 pt-4">
                <h3 className="text-md font-medium flex items-center gap-2">
                  <Scale className="h-4 w-4 text-amber-500" />
                  إعدادات البيع بالوزن/الحجم
                </h3>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="unit_type"
                    render={({ field }) => (
                      <FormItem>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <Ruler size={18} />
                          </span>
                          <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                            نوع الوحدة
                          </Badge>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || 'kg'}
                              defaultValue="kg"
                            >
                              <SelectTrigger className="h-16 pt-6 pl-10">
                                <SelectValue placeholder="اختر نوع الوحدة" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNIT_TYPES.map((unit) => (
                                  <SelectItem key={unit.value} value={unit.value}>
                                    {unit.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                        </div>
                        <FormDescription className="mt-1 text-xs">
                          اختر نوع الوحدة التي يباع بها المنتج (كيلوغرام، لتر، الخ)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <FormField
                      control={form.control}
                      name="unit_purchase_price"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              <ShoppingBag size={18} />
                            </span>
                            <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                              سعر الشراء للوحدة
                            </Badge>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pt-6 pl-10 h-16"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="unit_sale_price"
                      render={({ field }) => (
                        <FormItem>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              <DollarSign size={18} />
                            </span>
                            <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                              سعر البيع للوحدة
                            </Badge>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                                className="pt-6 pl-10 h-16"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value) || 0);
                                  // تحديث سعر المنتج الرئيسي ليكون نفس سعر الوحدة
                                  form.setValue('price', parseFloat(e.target.value) || 0);
                                }}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* خيارات أسعار المتغيرات */}
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
        </CardContent>
      </Card>
    </div>
  );
} 