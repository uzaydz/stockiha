/**
 * 📏 Meter Selling Settings
 *
 * إعدادات البيع بالمتر للمنتجات (أقمشة، كابلات، أنابيب)
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
import { Ruler, HelpCircle, DollarSign, Info, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface MeterSellingSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// وحدات القياس المتاحة
const METER_UNITS = [
  { value: 'm', label: 'متر (م)', factor: 1 },
  { value: 'cm', label: 'سنتيمتر (سم)', factor: 0.01 },
  { value: 'ft', label: 'قدم (ft)', factor: 0.3048 },
  { value: 'inch', label: 'بوصة (inch)', factor: 0.0254 },
] as const;

// =====================================================
// المكون الرئيسي
// =====================================================

const MeterSellingSettings = ({ form, className }: MeterSellingSettingsProps) => {
  // ⚡ استخدام useWatch لضمان التحديث الصحيح عند تغيير القيم
  const sellByMeter = useWatch({ control: form.control, name: 'sell_by_meter' });
  const meterUnit = useWatch({ control: form.control, name: 'meter_unit' }) || 'm';
  const pricePerMeter = useWatch({ control: form.control, name: 'price_per_meter' });
  const purchasePricePerMeter = useWatch({ control: form.control, name: 'purchase_price_per_meter' });
  const rollLength = useWatch({ control: form.control, name: 'roll_length' });

  // حساب هامش الربح
  const calculateMargin = useCallback(() => {
    if (!pricePerMeter || !purchasePricePerMeter || purchasePricePerMeter === 0) return null;
    const margin = ((pricePerMeter - purchasePricePerMeter) / purchasePricePerMeter) * 100;
    return margin.toFixed(1);
  }, [pricePerMeter, purchasePricePerMeter]);

  // حساب سعر الرول الكامل
  const calculateRollPrice = useCallback(() => {
    if (!pricePerMeter || !rollLength) return null;
    return (pricePerMeter * rollLength).toFixed(2);
  }, [pricePerMeter, rollLength]);

  const margin = calculateMargin();
  const rollPrice = calculateRollPrice();

  // الحصول على تسمية الوحدة
  const getUnitLabel = useCallback(() => {
    const unit = METER_UNITS.find(u => u.value === meterUnit);
    return unit?.label.split(' ')[0] || 'متر';
  }, [meterUnit]);

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-purple-50/60 via-violet-50/40 to-transparent dark:from-purple-950/30 dark:via-violet-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/60 dark:to-violet-900/60 p-2.5 rounded-xl shadow-sm">
              <Ruler className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">البيع بالمتر</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="sell_by_meter"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-purple-600 dark:data-[state=checked]:bg-purple-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`meter-content-${sellByMeter}`}>
        {!sellByMeter ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل البيع بالمتر لبيع المنتج حسب الطول (مثل: الأقمشة، الكابلات، الأنابيب، الحبال)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* وحدة القياس */}
            <FormField
              control={form.control}
              name="meter_unit"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    وحدة القياس
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value || 'm'}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background/80 dark:bg-background/60 border-border/60 hover:border-purple-500/60 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20">
                        <SelectValue placeholder="اختر وحدة القياس" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {METER_UNITS.map(unit => (
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
              {/* سعر البيع للمتر */}
              <FormField
                control={form.control}
                name="price_per_meter"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر البيع لكل {getUnitLabel()}
                      <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <DollarSign className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-purple-500/60 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج/{meterUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* سعر الشراء للمتر */}
              <FormField
                control={form.control}
                name="purchase_price_per_meter"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      سعر الشراء لكل {getUnitLabel()}
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="تكلفة شراء كل وحدة طول (للحساب الداخلي)"
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
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-purple-500/60 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20 transition-all duration-300"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          دج/{meterUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ⚡ الأمتار المتاحة للبيع (المخزون) */}
            <FormField
              control={form.control}
              name="available_length"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded text-xs font-bold">المخزون</span>
                    الأمتار المتاحة للبيع
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Ruler className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-purple-500" />
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        placeholder="مثال: 100"
                        className="h-10 pr-10 text-sm bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800 hover:border-purple-500/60 focus:border-purple-600 focus:ring-2 focus:ring-purple-500/20"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        {meterUnit}
                      </div>
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    إجمالي الأمتار المتوفرة حالياً للبيع (سيتم خصمها عند كل عملية بيع)
                  </p>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* الحدود وطول الرول */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* الحد الأدنى */}
              <FormField
                control={form.control}
                name="min_meters"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      الحد الأدنى للطول
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="أقل طول يمكن للعميل شراؤه"
                      >
                        <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                      </span>
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0.5"
                          className="h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          {meterUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              {/* طول الرول */}
              <FormField
                control={form.control}
                name="roll_length"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                      طول الرول/البكرة
                      <span
                        className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                        title="الطول الكلي للرول أو البكرة (مفيد لحساب المخزون)"
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
                          step="0.1"
                          placeholder="مثال: 50"
                          className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                        />
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                          {meterUnit}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            {/* ملخص التسعير */}
            {pricePerMeter && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-purple-50/60 to-violet-50/40 dark:from-purple-950/30 dark:to-violet-950/20 border border-purple-200/50 dark:border-purple-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Ruler className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="font-medium text-sm text-foreground">ملخص التسعير بالمتر</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="p-2 bg-background/50 rounded-lg">
                    <span className="text-muted-foreground text-xs block mb-1">سعر البيع</span>
                    <span className="font-medium text-purple-600 dark:text-purple-400">
                      {pricePerMeter} دج/{meterUnit}
                    </span>
                  </div>
                  {purchasePricePerMeter && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">سعر الشراء</span>
                      <span className="font-medium text-foreground">
                        {purchasePricePerMeter} دج/{meterUnit}
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
                  {rollPrice && rollLength && (
                    <div className="p-2 bg-background/50 rounded-lg">
                      <span className="text-muted-foreground text-xs block mb-1">سعر الرول ({rollLength} {meterUnit})</span>
                      <span className="font-medium text-foreground">
                        {rollPrice} دج
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

export default MeterSellingSettings;
