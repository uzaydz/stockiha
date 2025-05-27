import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Scale, Package, Layers, Settings, HelpCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
    <TooltipProvider>
      <div className="space-y-6">
        {/* Selling Method Selection */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Scale className="h-4 w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">طريقة البيع</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center mr-2"
                      onClick={(e) => e.preventDefault()}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                    side="top"
                    sideOffset={5}
                  >
                    <p className="text-xs">اختر كيف سيتم بيع المنتج: بالقطعة الواحدة أم بالوزن/الحجم. هذا يؤثر على طريقة عرض السعر والكمية.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div 
                className={`relative p-5 border-2 rounded-2xl cursor-pointer transition-all duration-500 group overflow-hidden ${
                  isSoldByUnit 
                    ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15 dark:from-primary/20 dark:via-primary/10 dark:to-primary/25 shadow-xl shadow-primary/20 dark:shadow-primary/30 scale-[1.02]' 
                    : 'border-border/60 hover:border-primary/50 hover:bg-gradient-to-br hover:from-muted/30 hover:to-muted/10 dark:hover:from-muted/20 dark:hover:to-muted/5 hover:shadow-lg hover:scale-[1.01] backdrop-blur-sm'
                }`} 
                onClick={() => handleSellingTypeChange(true)}
              >
                <div className="flex items-center space-x-4 space-x-reverse relative z-10">
                  <div className={`p-3 rounded-2xl transition-all duration-500 shadow-md ${
                    isSoldByUnit 
                      ? 'bg-gradient-to-br from-primary/30 to-primary/20 dark:from-primary/40 dark:to-primary/30 shadow-primary/20' 
                      : 'bg-gradient-to-br from-muted to-muted/80 dark:from-muted/60 dark:to-muted/40 group-hover:from-primary/20 group-hover:to-primary/10 dark:group-hover:from-primary/30 dark:group-hover:to-primary/20'
                  }`}>
                    <Package className={`w-5 h-5 transition-all duration-500 ${
                      isSoldByUnit ? 'text-primary dark:text-primary-foreground scale-110' : 'text-muted-foreground group-hover:text-primary group-hover:scale-110'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold text-lg mb-1 transition-colors duration-300 ${
                      isSoldByUnit ? 'text-primary dark:text-primary-foreground' : 'text-foreground'
                    }`}>البيع بالقطعة</div>
                    <div className="text-sm text-muted-foreground">منتج يباع كوحدة واحدة</div>
                  </div>
                </div>
                {isSoldByUnit && (
                  <div className="absolute top-3 left-3 z-20">
                    <div className="w-3 h-3 bg-primary rounded-full shadow-lg animate-pulse"></div>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none ${
                  isSoldByUnit ? 'opacity-100' : 'group-hover:opacity-100'
                }`} />
              </div>

              <div 
                className={`relative p-5 border-2 rounded-2xl cursor-pointer transition-all duration-500 group overflow-hidden ${
                  !isSoldByUnit 
                    ? 'border-primary bg-gradient-to-br from-primary/10 via-primary/5 to-primary/15 dark:from-primary/20 dark:via-primary/10 dark:to-primary/25 shadow-xl shadow-primary/20 dark:shadow-primary/30 scale-[1.02]' 
                    : 'border-border/60 hover:border-primary/50 hover:bg-gradient-to-br hover:from-muted/30 hover:to-muted/10 dark:hover:from-muted/20 dark:hover:to-muted/5 hover:shadow-lg hover:scale-[1.01] backdrop-blur-sm'
                }`} 
                onClick={() => handleSellingTypeChange(false)}
              >
                <div className="flex items-center space-x-4 space-x-reverse relative z-10">
                  <div className={`p-3 rounded-2xl transition-all duration-500 shadow-md ${
                    !isSoldByUnit 
                      ? 'bg-gradient-to-br from-primary/30 to-primary/20 dark:from-primary/40 dark:to-primary/30 shadow-primary/20' 
                      : 'bg-gradient-to-br from-muted to-muted/80 dark:from-muted/60 dark:to-muted/40 group-hover:from-primary/20 group-hover:to-primary/10 dark:group-hover:from-primary/30 dark:group-hover:to-primary/20'
                  }`}>
                    <Scale className={`w-5 h-5 transition-all duration-500 ${
                      !isSoldByUnit ? 'text-primary dark:text-primary-foreground scale-110' : 'text-muted-foreground group-hover:text-primary group-hover:scale-110'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className={`font-bold text-lg mb-1 transition-colors duration-300 ${
                      !isSoldByUnit ? 'text-primary dark:text-primary-foreground' : 'text-foreground'
                    }`}>البيع بالوزن/الحجم</div>
                    <div className="text-sm text-muted-foreground">منتج يباع بالكيلو أو اللتر</div>
                  </div>
                </div>
                {!isSoldByUnit && (
                  <div className="absolute top-3 left-3 z-20">
                    <div className="w-3 h-3 bg-primary rounded-full shadow-lg animate-pulse"></div>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 transition-opacity duration-500 pointer-events-none ${
                  !isSoldByUnit ? 'opacity-100' : 'group-hover:opacity-100'
                }`} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weight/Volume Options */}
        {!isSoldByUnit && (
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm animate-in slide-in-from-top-2 duration-500">
            <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/40 dark:via-indigo-950/30 dark:to-transparent rounded-t-lg border-b border-border/30">
              <CardTitle className="text-base font-semibold flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
                  <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <span className="text-foreground text-sm">إعدادات البيع بالوزن/الحجم</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center mr-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent 
                      className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                      side="top"
                      sideOffset={5}
                    >
                      <p className="text-xs">حدد نوع الوحدة وأسعار البيع والشراء للوحدة الواحدة. هذا مفيد للمنتجات التي تباع بالوزن أو الحجم.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <FormField
                  control={form.control}
                  name="unit_type"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        نوع الوحدة
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">اختر وحدة القياس المناسبة للمنتج (كيلو، لتر، متر، إلخ).</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm">
                            <SelectValue placeholder="اختر نوع الوحدة" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-background/95 dark:bg-background/90 backdrop-blur-md border-border/60 shadow-xl">
                          {UNIT_TYPES.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value} className="hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors text-sm">
                              <span className="text-foreground">{unit.label}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_sale_price"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        سعر البيع للوحدة
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">السعر الذي سيدفعه العميل مقابل وحدة واحدة من المنتج.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                            دج
                          </div>
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit_purchase_price"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        سعر الشراء للوحدة
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">التكلفة التي دفعتها لشراء وحدة واحدة من المنتج. يساعد في حساب الربح.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Input
                            type="number"
                            placeholder="0.00"
                            className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                            دج
                          </div>
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product Variants Section */}
        {isSoldByUnit && (
          <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm animate-in slide-in-from-top-2 duration-500">
            <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/60 via-indigo-50/40 to-transparent dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-transparent rounded-t-lg border-b border-border/30">
              <CardTitle className="text-base font-semibold flex items-center gap-3">
                <div className="bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
                  <Layers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <span className="text-foreground text-sm">متغيرات المنتج</span>
                  <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
              <div className="relative overflow-hidden group">
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-50/60 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/60 dark:to-purple-800/60 p-2.5 rounded-xl shadow-sm">
                      <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <div className="font-medium text-sm text-foreground flex items-center gap-2">
                        تفعيل المتغيرات
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-purple-600 transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">المتغيرات تسمح بإضافة ألوان وأحجام مختلفة للمنتج الواحد، مما يوفر خيارات أكثر للعملاء.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="text-xs text-muted-foreground">إضافة ألوان وأحجام مختلفة للمنتج</div>
                    </div>
                  </div>
                  <FormField
                    control={form.control}
                    name="has_variants"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={handleHasVariantsChange}
                            className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500 shadow-sm"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 to-indigo-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl pointer-events-none" />
              </div>
              
              {hasVariants && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/20 rounded-xl border border-green-200/50 dark:border-green-800/30 backdrop-blur-sm animate-in slide-in-from-top-1 duration-300">
                  <div className="flex items-center gap-3 text-green-700 dark:text-green-300">
                    <div className="bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/60 dark:to-green-800/60 p-2 rounded-lg shadow-sm">
                      <Settings className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm font-medium">تم تفعيل المتغيرات</span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2 mr-8">
                    يمكنك الآن إضافة ألوان وأحجام مختلفة في تبويبة "المتغيرات"
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  );
}
