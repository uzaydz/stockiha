import { useState, useEffect } from 'react';
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { 
  DollarSign, 
  ShoppingBag, 
  Percent, 
  Plus, 
  Trash2, 
  TrendingUp, 
  Calculator,
  ArrowRight,
  ShoppingCart,
  Package,
  AlertCircle,
  CheckCircle,
  Info,
  HelpCircle
} from 'lucide-react';
import { useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

interface ProductPricingProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductPricing({ form }: ProductPricingProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "wholesale_tiers",
  });

  const price = form.watch("price");
  const purchasePrice = form.watch("purchase_price");
  const compareAtPrice = form.watch("compare_at_price");

  // حسابات الربحية المتقدمة
  let profitMargin: number | null = null;
  let profitPercentage: number | null = null;
  let marginPercentage: number | null = null;
  let discountFromOriginal: number | null = null;

  if (typeof price === 'number' && typeof purchasePrice === 'number' && purchasePrice > 0) {
    profitMargin = price - purchasePrice;
    profitPercentage = (profitMargin / purchasePrice) * 100;
    marginPercentage = (profitMargin / price) * 100;
  }

  if (typeof compareAtPrice === 'number' && typeof price === 'number' && compareAtPrice > price) {
    discountFromOriginal = ((compareAtPrice - price) / compareAtPrice) * 100;
  }

  // تنسيق الأرقام بالدينار الجزائري
  const formatDZD = (value: number | null | undefined) => {
    if (value === null || value === undefined || isNaN(value)) return 'غير محدد';
    return new Intl.NumberFormat('ar-DZ', {
      style: 'currency',
      currency: 'DZD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  // حالة التحليل
  const getAnalysisStatus = () => {
    if (!price || !purchasePrice) return 'incomplete';
    if (profitMargin && profitMargin > 0) return 'profitable';
    if (profitMargin && profitMargin === 0) return 'break-even';
    return 'loss';
  };

  const analysisStatus = getAnalysisStatus();

  return (
      <div className="space-y-4 sm:space-y-5 lg:space-y-6">
        {/* Basic Pricing Section */}
        <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm">
                <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-foreground text-xs sm:text-sm truncate block">الأسعار الأساسية</span>
                <Badge variant="destructive" className="text-[10px] sm:text-xs mr-0 sm:mr-2 shadow-sm mt-1 sm:mt-0 sm:inline-block">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 space-y-3 sm:space-y-4 lg:space-y-5 bg-gradient-to-b from-background/50 to-background">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-5">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        سعر البيع
                        <span className="text-destructive ml-1">*</span>
                      </FormLabel>
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="السعر الذي سيدفعه العميل لشراء المنتج. هذا هو السعر الظاهر في المتجر."
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                          دج
                        </div>
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchase_price"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        سعر الشراء
                      </FormLabel>
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="التكلفة التي دفعتها لشراء المنتج. يساعد في حساب الربح وإدارة المخزون."
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                          دج
                        </div>
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="compare_at_price"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FormLabel className="text-sm font-medium text-foreground">
                        السعر الأصلي (قبل التخفيض)
                      </FormLabel>
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="السعر الأصلي قبل التخفيض. يظهر مشطوباً بجانب السعر الحالي لإظهار قيمة التوفير."
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </div>
                    <FormControl>
                      <div className="relative group">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                          دج
                        </div>
                        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {discountFromOriginal && discountFromOriginal > 0 && (
                <div className="flex items-center justify-center p-4 bg-gradient-to-r from-green-50/60 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/20 rounded-xl border border-green-200/50 dark:border-green-800/30 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">نسبة التوفير</div>
                    <div className="text-lg font-bold text-green-700 dark:text-green-300">
                      {discountFromOriginal.toFixed(1)}%
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Advanced Profit Analysis Section */}
        {(typeof price === 'number' || typeof purchasePrice === 'number') && (
          <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-transparent dark:from-emerald-950/30 dark:via-green-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3 flex-wrap">
                <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm flex-shrink-0 ${
                  analysisStatus === 'profitable' ? 'bg-emerald-100' :
                  analysisStatus === 'break-even' ? 'bg-yellow-100' :
                  analysisStatus === 'loss' ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <TrendingUp className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${
                    analysisStatus === 'profitable' ? 'text-emerald-600' :
                    analysisStatus === 'break-even' ? 'text-yellow-600' :
                    analysisStatus === 'loss' ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
                <span className="text-foreground text-xs sm:text-sm">تحليل الربحية</span>
                <Badge 
                  variant={
                    analysisStatus === 'profitable' ? 'default' :
                    analysisStatus === 'break-even' ? 'secondary' :
                    analysisStatus === 'loss' ? 'destructive' : 'outline'
                  }
                  className="text-[10px] sm:text-xs shadow-sm"
                >
                  {analysisStatus === 'profitable' ? 'مربح' :
                   analysisStatus === 'break-even' ? 'نقطة التعادل' :
                   analysisStatus === 'loss' ? 'خسارة' : 'غير مكتمل'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background">
              {/* Status Alert */}
              {analysisStatus !== 'incomplete' && (
                <Alert className={
                  analysisStatus === 'profitable' ? 'border-green-200 bg-green-50' :
                  analysisStatus === 'break-even' ? 'border-yellow-200 bg-yellow-50' :
                  'border-red-200 bg-red-50'
                }>
                  {analysisStatus === 'profitable' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                   analysisStatus === 'break-even' ? <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                   <AlertCircle className="h-4 w-4 text-red-600" />}
                  <AlertDescription className={
                    analysisStatus === 'profitable' ? 'text-green-800' :
                    analysisStatus === 'break-even' ? 'text-yellow-800' :
                    'text-red-800'
                  }>
                    {analysisStatus === 'profitable' && 
                      `هذا المنتج مربح! ستحقق ربحاً قدره ${formatDZD(profitMargin)} لكل وحدة مباعة.`}
                    {analysisStatus === 'break-even' && 
                      'هذا المنتج في نقطة التعادل. لن تحقق ربحاً أو خسارة.'}
                    {analysisStatus === 'loss' && 
                      `هذا المنتج يحقق خسارة قدرها ${formatDZD(Math.abs(profitMargin || 0))} لكل وحدة مباعة.`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Profit Metrics Grid */}
              {analysisStatus !== 'incomplete' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mt-4 sm:mt-5 lg:mt-6">
                  <div className="p-4 bg-gradient-to-br from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">هامش الربح</div>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                        {formatDZD(profitMargin)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-xs text-purple-600 dark:text-purple-400 font-medium mb-1">نسبة الربح</div>
                      <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                        {profitPercentage ? `${profitPercentage.toFixed(1)}%` : 'غير محدد'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gradient-to-br from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 rounded-xl border border-amber-200/50 dark:border-amber-800/30 backdrop-blur-sm">
                    <div className="text-center">
                      <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">هامش الربح %</div>
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-300">
                        {marginPercentage ? `${marginPercentage.toFixed(1)}%` : 'غير محدد'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Wholesale Tiers Section */}
        <Card className="border-border/50 shadow-md sm:shadow-lg dark:shadow-xl sm:dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3 sm:pb-4 p-3 sm:p-4 lg:p-5 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <CardTitle className="text-sm sm:text-base font-semibold flex items-center gap-2 sm:gap-3 flex-1">
                <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 p-2 sm:p-2.5 rounded-lg sm:rounded-xl shadow-sm flex-shrink-0">
                  <ShoppingBag className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-foreground text-xs sm:text-sm truncate block">أسعار الجملة</span>
                  <Badge variant="outline" className="text-[10px] sm:text-xs mr-0 sm:mr-2 shadow-sm mt-1 sm:mt-0 sm:inline-block">اختياري</Badge>
                </div>
              </CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ min_quantity: undefined, price_per_unit: undefined })}
                className="h-8 sm:h-9 gap-1 sm:gap-1.5 px-2.5 sm:px-3 text-xs sm:text-sm border-border/60 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/30 dark:hover:from-amber-950/20 dark:hover:to-orange-950/10 hover:border-amber-300/50 dark:hover:border-amber-600/30 transition-all duration-300 shadow-sm hover:shadow-md w-full sm:w-auto"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                إضافة سعر
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:p-6 bg-gradient-to-b from-background/50 to-background">
            {fields.length === 0 ? (
              <div className="text-center py-8 bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 rounded-xl border border-dashed border-border/60 backdrop-blur-sm">
                <div className="relative">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-3 text-muted-foreground/40 dark:text-muted-foreground/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-muted/20 to-muted/10 rounded-full" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground font-medium mb-1">لا توجد أسعار جملة</p>
                <p className="text-xs text-muted-foreground/70">انقر "إضافة سعر" لإنشاء مستويات تسعير للكميات الكبيرة</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fields.map((item, index) => (
                  <div key={item.id} className="flex gap-3 p-4 border border-border/60 rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 dark:from-muted/15 dark:to-muted/5 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300">
                    <FormField
                      control={form.control}
                      name={`wholesale_tiers.${index}.min_quantity`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type="number"
                                min="1"
                                placeholder="الحد الأدنى للكمية"
                                className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseInt(e.target.value));
                                }}
                              />
                              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`wholesale_tiers.${index}.price_per_unit`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormControl>
                            <div className="relative group">
                              <Input
                                type="number"
                                min="0"
                                step="1"
                                placeholder="السعر للوحدة"
                                className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm pr-10"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(parseFloat(e.target.value));
                                }}
                              />
                              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground bg-background/80 dark:bg-background/60 px-1 rounded">
                                دج
                              </div>
                              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                            </div>
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => remove(index)}
                      className="h-10 w-10 p-0 border-border/60 hover:bg-destructive/10 hover:border-destructive/50 hover:text-destructive transition-all duration-300 shadow-sm hover:shadow-md"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
  );
}
