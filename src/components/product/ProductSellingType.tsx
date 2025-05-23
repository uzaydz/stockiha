import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Scale, Package, Layers } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
  
  const [showWeightOptions, setShowWeightOptions] = useState(!isSoldByUnit);
  
  useEffect(() => {
    setShowWeightOptions(!isSoldByUnit);
    
    if (!isSoldByUnit && !form.getValues('unit_type')) {
      form.setValue('unit_type', 'kg');
    }
    
    if (!isSoldByUnit) {
      form.setValue('unit_sale_price', form.getValues('price') || 0);
      form.setValue('unit_purchase_price', form.getValues('purchase_price') || 0);
    }
  }, [isSoldByUnit, form]);
  
  useEffect(() => {
    if (!isSoldByUnit && hasVariants) {
      form.setValue('has_variants', false);
      if (onHasVariantsChange) {
        onHasVariantsChange(false);
      }
      form.setValue('use_sizes', false);
    }
  }, [isSoldByUnit, hasVariants, form, onHasVariantsChange]);

  const handleSellingTypeChange = (value: boolean) => {
    form.setValue('is_sold_by_unit', value);
    setShowWeightOptions(!value);
    
    if (!value && hasVariants) {
      form.setValue('has_variants', false);
      if (onHasVariantsChange) {
        onHasVariantsChange(false);
      }
      form.setValue('use_sizes', false);
    }
  };

  const handleHasVariantsChange = (value: boolean) => {
    form.setValue('has_variants', value);
    if (onHasVariantsChange) {
      onHasVariantsChange(value);
    }
    if (!value) {
      form.setValue('use_variant_prices', false);
      form.setValue('use_sizes', false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Selling Method Selection */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Scale className="h-4 w-4 text-primary" />
            </div>
            طريقة البيع
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div 
              className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                isSoldByUnit 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`} 
              onClick={() => handleSellingTypeChange(true)}
            >
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className={`p-3 rounded-full ${
                  isSoldByUnit ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Package className={`w-6 h-6 ${
                    isSoldByUnit ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <div className="font-semibold text-lg">البيع بالقطعة</div>
                  <div className="text-sm text-muted-foreground">منتج يباع كوحدة واحدة</div>
                </div>
              </div>
              {isSoldByUnit && (
                <div className="absolute top-3 left-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                </div>
              )}
            </div>

            <div 
              className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
                !isSoldByUnit 
                  ? 'border-primary bg-primary/5 shadow-md' 
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`} 
              onClick={() => handleSellingTypeChange(false)}
            >
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className={`p-3 rounded-full ${
                  !isSoldByUnit ? 'bg-primary/20' : 'bg-muted'
                }`}>
                  <Scale className={`w-6 h-6 ${
                    !isSoldByUnit ? 'text-primary' : 'text-muted-foreground'
                  }`} />
                </div>
                <div>
                  <div className="font-semibold text-lg">البيع بالوزن/الحجم</div>
                  <div className="text-sm text-muted-foreground">منتج يباع بالكيلو أو اللتر</div>
                </div>
              </div>
              {!isSoldByUnit && (
                <div className="absolute top-3 left-3">
                  <div className="w-3 h-3 bg-primary rounded-full"></div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weight/Volume Options */}
      {!isSoldByUnit && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-blue-100 p-2 rounded-full">
                <Scale className="h-4 w-4 text-blue-600" />
              </div>
              إعدادات البيع بالوزن/الحجم
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="unit_type"
                render={({ field }) => (
                  <FormItem>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-11 bg-background border-border">
                          <SelectValue placeholder="نوع الوحدة" />
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_sale_price"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="سعر البيع للوحدة"
                        className="h-11 bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="unit_purchase_price"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="سعر الشراء للوحدة"
                        className="h-11 bg-background border-border"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variants Option - Only for unit selling */}
      {isSoldByUnit && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-purple-100 p-2 rounded-full">
                <Layers className="h-4 w-4 text-purple-600" />
              </div>
              المتغيرات والخيارات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-6 border border-border rounded-lg bg-muted/20 hover:bg-muted/30 transition-colors">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="bg-purple-100 p-3 rounded-full">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <div className="font-semibold">المتغيرات (الألوان والمقاسات)</div>
                  <div className="text-sm text-muted-foreground">
                    إضافة ألوان ومقاسات مختلفة للمنتج
                  </div>
                </div>
              </div>
              <Switch
                checked={hasVariants}
                onCheckedChange={handleHasVariantsChange}
              />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 