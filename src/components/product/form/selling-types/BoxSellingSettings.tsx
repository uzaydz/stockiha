/**
 * 📦 Box Selling Settings
 *
 * إعدادات البيع بالكرتون/الصندوق للمنتجات
 */

import { useCallback } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Box, HelpCircle, DollarSign, Package, Info, Barcode, Calculator } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface BoxSellingSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// =====================================================
// المكون الرئيسي
// =====================================================

const BoxSellingSettings = ({ form, className }: BoxSellingSettingsProps) => {
  // ⚡ استخدام useWatch لضمان التحديث الصحيح عند تغيير القيم
  const sellByBox = useWatch({ control: form.control, name: 'sell_by_box' });
  const unitsPerBox = useWatch({ control: form.control, name: 'units_per_box' }) || 1;
  const boxPrice = useWatch({ control: form.control, name: 'box_price' });
  const boxPurchasePrice = useWatch({ control: form.control, name: 'box_purchase_price' });
  const unitPrice = useWatch({ control: form.control, name: 'price' });
  const allowSingleUnit = useWatch({ control: form.control, name: 'allow_single_unit_sale' });

  // حساب سعر الوحدة من الكرتون
  const calculateUnitPriceFromBox = useCallback(() => {
    if (!boxPrice || !unitsPerBox || unitsPerBox === 0) return null;
    return (boxPrice / unitsPerBox).toFixed(2);
  }, [boxPrice, unitsPerBox]);

  // حساب هامش الربح للكرتون
  const calculateBoxMargin = useCallback(() => {
    if (!boxPrice || !boxPurchasePrice || boxPurchasePrice === 0) return null;
    const margin = ((boxPrice - boxPurchasePrice) / boxPurchasePrice) * 100;
    return margin.toFixed(1);
  }, [boxPrice, boxPurchasePrice]);

  // حساب التوفير عند شراء كرتون
  const calculateSavings = useCallback(() => {
    if (!unitPrice || !boxPrice || !unitsPerBox) return null;
    const totalIfSingle = unitPrice * unitsPerBox;
    if (totalIfSingle <= boxPrice) return null;
    const savings = ((totalIfSingle - boxPrice) / totalIfSingle) * 100;
    return savings.toFixed(1);
  }, [unitPrice, boxPrice, unitsPerBox]);

  const unitPriceFromBox = calculateUnitPriceFromBox();
  const boxMargin = calculateBoxMargin();
  const savings = calculateSavings();

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
              <Box className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">البيع بالكرتون</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="sell_by_box"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`box-content-${sellByBox}`}>
        {!sellByBox ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل البيع بالكرتون لبيع المنتج بالصندوق/الكرتون (مثل: المشروبات، العصائر، المعلبات)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* عدد الوحدات في الكرتون */}
            <FormField
              control={form.control}
              name="units_per_box"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    عدد الوحدات في الكرتون
                    <span className="text-destructive">*</span>
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="عدد القطع/الوحدات داخل الكرتون الواحد"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="مثال: 24"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        وحدة
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* الأسعار */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* سعر بيع الكرتون */}
              <FormField
                control={form.control}
                name="box_price"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر بيع الكرتون
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* سعر شراء الكرتون */}
              <FormField
                control={form.control}
                name="box_purchase_price"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر شراء الكرتون
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="تكلفة شراء الكرتون الكامل (للحساب الداخلي)"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="0"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ⚡ عدد الصناديق المتاحة (المخزون) */}
            <FormField
              control={form.control}
              name="available_boxes"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded text-xs font-bold">المخزون</span>
                    عدد الصناديق المتاحة
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Box className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-500" />
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="مثال: 20"
                        className="h-10 pr-10 text-sm bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        صندوق
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    إجمالي الصناديق المتوفرة حالياً للبيع (سيتم خصمها عند كل عملية بيع)
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* باركود الكرتون */}
            <FormField
              control={form.control}
              name="box_barcode"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    باركود الكرتون
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="باركود خاص بالكرتون الكامل (مختلف عن باركود الوحدة)"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Barcode className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="text"
                        placeholder="باركود الكرتون (اختياري)"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* السماح ببيع الوحدة المفردة */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/30">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/60 dark:to-blue-800/60 p-2 rounded-lg shadow-sm">
                  <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground flex items-center gap-2">
                    السماح ببيع الوحدة المفردة
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="هل يمكن للعميل شراء وحدة واحدة فقط بدلاً من الكرتون الكامل؟"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">بيع القطعة الواحدة بجانب الكرتون</div>
                </div>
              </div>
              <FormField
                control={form.control}
                name="allow_single_unit_sale"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-blue-600 dark:data-[state=checked]:bg-blue-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* ملخص التسعير */}
            {boxPrice && unitsPerBox && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50/60 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 border border-blue-200/50 dark:border-blue-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calculator className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-sm text-foreground">ملخص التسعير بالكرتون</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="p-2 bg-background/50 rounded-lg">
                    <span className="text-muted-foreground text-xs block mb-1">سعر الكرتون</span>
                    <span className="font-medium text-blue-600 dark:text-blue-400">
                      {boxPrice} دج
                    </span>
                  </div>
                  <div className="p-2 bg-background/50 rounded-lg">
                    <span className="text-muted-foreground text-xs block mb-1">الوحدات</span>
                    <span className="font-medium text-foreground">
                      {unitsPerBox} وحدة
                    </span>
                  </div>
                  {unitPriceFromBox && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">سعر الوحدة</span>
                      <span className="font-medium text-foreground">
                        {unitPriceFromBox} دج
                      </span>
                    </div>
                  )}
                  {boxMargin && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">هامش الربح</span>
                      <span className={cn(
                        'font-medium',
                        parseFloat(boxMargin) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {boxMargin}%
                      </span>
                    </div>
                  )}
                </div>

                {/* عرض التوفير */}
                {savings && parseFloat(savings) > 0 && (
                  <div className="mt-3 p-2 bg-green-100/50 dark:bg-green-900/30 rounded-lg border border-green-200/50 dark:border-green-800/30">
                    <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                      <Badge className="bg-green-600 text-white text-xs">توفير {savings}%</Badge>
                      <span className="text-xs">عند شراء الكرتون بدلاً من الوحدات المفردة</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BoxSellingSettings;
