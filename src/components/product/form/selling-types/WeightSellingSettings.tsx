/**
 * 🏋️ Weight Selling Settings
 *
 * إعدادات البيع بالوزن للمنتجات (كيلو، جرام، رطل، أونصة)
 */

import { useCallback } from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Scale, HelpCircle, DollarSign, Package, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface WeightSellingSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// وحدات الوزن المتاحة
const WEIGHT_UNITS = [
  { value: 'kg', label: 'كيلوغرام (كغ)', factor: 1 },
  { value: 'g', label: 'جرام (غ)', factor: 0.001 },
  { value: 'lb', label: 'رطل (lb)', factor: 0.453592 },
  { value: 'oz', label: 'أونصة (oz)', factor: 0.0283495 },
] as const;

// =====================================================
// المكون الرئيسي
// =====================================================

const WeightSellingSettings = ({ form, className }: WeightSellingSettingsProps) => {
  // ⚡ استخدام useWatch لضمان التحديث الصحيح عند تغيير القيم
  const sellByWeight = useWatch({ control: form.control, name: 'sell_by_weight' });
  const weightUnit = useWatch({ control: form.control, name: 'weight_unit' }) || 'kg';
  const pricePerUnit = useWatch({ control: form.control, name: 'price_per_weight_unit' });
  const purchasePricePerUnit = useWatch({ control: form.control, name: 'purchase_price_per_weight_unit' });

  // حساب هامش الربح
  const calculateMargin = useCallback(() => {
    if (!pricePerUnit || !purchasePricePerUnit || purchasePricePerUnit === 0) return null;
    const margin = ((pricePerUnit - purchasePricePerUnit) / purchasePricePerUnit) * 100;
    return margin.toFixed(1);
  }, [pricePerUnit, purchasePricePerUnit]);

  const margin = calculateMargin();

  // الحصول على تسمية الوحدة
  const getUnitLabel = useCallback(() => {
    const unit = WEIGHT_UNITS.find(u => u.value === weightUnit);
    return unit?.label.split(' ')[0] || 'كيلوغرام';
  }, [weightUnit]);

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-emerald-50/60 via-green-50/40 to-transparent dark:from-emerald-950/30 dark:via-green-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/60 dark:to-green-900/60 p-2.5 rounded-xl shadow-sm">
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">البيع بالوزن</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="sell_by_weight"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-emerald-600 dark:data-[state=checked]:bg-emerald-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`weight-content-${sellByWeight}`}>
        {!sellByWeight ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل البيع بالوزن لبيع المنتج حسب الوزن (مثل: الخضروات، الفواكه، اللحوم، التوابل)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* وحدة الوزن */}
            <FormField
              control={form.control}
              name="weight_unit"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    وحدة الوزن
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value || 'kg'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background/80 dark:bg-background/60 border-border/60 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20">
                        <SelectValue placeholder="اختر وحدة الوزن" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WEIGHT_UNITS.map(unit => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* الأسعار */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* سعر البيع للوحدة */}
              <FormField
                control={form.control}
                name="price_per_weight_unit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر البيع لكل {getUnitLabel()}
                      <span className="text-destructive">*</span>
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="السعر الذي سيدفعه العميل لكل وحدة وزن"
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
                          step="0.01"
                          placeholder="0.00"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج/{weightUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* سعر الشراء للوحدة */}
              <FormField
                control={form.control}
                name="purchase_price_per_weight_unit"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر الشراء لكل {getUnitLabel()}
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="تكلفة شراء كل وحدة وزن (للحساب الداخلي)"
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
                          step="0.01"
                          placeholder="0.00"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج/{weightUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ⚡ الوزن المتاح للبيع (المخزون) */}
            <FormField
              control={form.control}
              name="available_weight"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded text-xs font-bold">المخزون</span>
                    الوزن المتاح للبيع
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Scale className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-emerald-500" />
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="مثال: 50"
                        className="h-10 pr-10 text-sm bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 hover:border-emerald-500/60 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        {weightUnit}
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    إجمالي الوزن المتوفر حالياً للبيع (سيتم خصمه عند كل عملية بيع)
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* الحدود */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* الحد الأدنى */}
              <FormField
                control={form.control}
                name="min_weight"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      الحد الأدنى للوزن
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="أقل كمية يمكن للعميل شراؤها"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.1"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          {weightUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* الحد الأقصى */}
              <FormField
                control={form.control}
                name="max_weight"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      الحد الأقصى للوزن
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="أقصى كمية يمكن للعميل شراؤها (اتركه فارغاً لعدم وجود حد)"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="غير محدود"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          {weightUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* متوسط وزن القطعة */}
            <FormField
              control={form.control}
              name="average_item_weight"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    متوسط وزن القطعة الواحدة
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="مفيد لتقدير عدد القطع عند البيع (مثل: متوسط وزن التفاحة الواحدة)"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Package className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="مثال: 0.15 للتفاح"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        {weightUnit}/قطعة
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* ملخص وهامش الربح */}
            {pricePerUnit && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/60 to-green-50/40 dark:from-emerald-950/30 dark:to-green-950/20 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Scale className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="font-medium text-sm text-foreground">ملخص التسعير بالوزن</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-background/50 rounded-lg">
                    <span className="text-muted-foreground text-xs block mb-1">سعر البيع</span>
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      {pricePerUnit} دج/{weightUnit}
                    </span>
                  </div>
                  {purchasePricePerUnit && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">سعر الشراء</span>
                      <span className="font-medium text-foreground">
                        {purchasePricePerUnit} دج/{weightUnit}
                      </span>
                    </div>
                  )}
                  {margin && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">هامش الربح</span>
                      <span className={cn(
                        'font-medium',
                        parseFloat(margin) > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      )}>
                        {margin}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WeightSellingSettings;
