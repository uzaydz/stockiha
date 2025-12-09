/**
 * 🛡️ Warranty Settings
 *
 * إعدادات الضمان للمنتجات (الإلكترونيات، الأجهزة، الأثاث)
 */

import { memo, useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, HelpCircle, Info, Calendar, Building, Store, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface WarrantySettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// أنواع الضمان
const WARRANTY_TYPES = [
  { value: 'manufacturer', label: 'ضمان المصنع', icon: Building, description: 'ضمان من الشركة المصنعة' },
  { value: 'store', label: 'ضمان المتجر', icon: Store, description: 'ضمان من متجرك' },
  { value: 'extended', label: 'ضمان ممتد', icon: Star, description: 'ضمان إضافي بسعر إضافي' },
] as const;

// =====================================================
// المكون الرئيسي
// =====================================================

// ⚡ إزالة memo لأن form.watch يحتاج re-render عند التغيير
const WarrantySettings = ({ form, className }: WarrantySettingsProps) => {
  const hasWarranty = form.watch('has_warranty');
  const warrantyDuration = form.watch('warranty_duration_months');
  const warrantyType = form.watch('warranty_type') || 'manufacturer';

  // حساب تاريخ انتهاء الضمان
  const calculateWarrantyEnd = useCallback(() => {
    if (!warrantyDuration) return null;
    const date = new Date();
    date.setMonth(date.getMonth() + warrantyDuration);
    return date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [warrantyDuration]);

  const warrantyEnd = calculateWarrantyEnd();

  // الحصول على معلومات نوع الضمان
  const getWarrantyTypeInfo = useCallback(() => {
    return WARRANTY_TYPES.find(t => t.value === warrantyType) || WARRANTY_TYPES[0];
  }, [warrantyType]);

  const warrantyTypeInfo = getWarrantyTypeInfo();

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-green-50/60 via-emerald-50/40 to-transparent dark:from-green-950/30 dark:via-emerald-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60 p-2.5 rounded-xl shadow-sm">
              <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">الضمان</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="has_warranty"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-green-600 dark:data-[state=checked]:bg-green-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`warranty-content-${hasWarranty}`}>
        {!hasWarranty ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل الضمان لتقديم ضمان على المنتج (مثل: الإلكترونيات، الأجهزة المنزلية، الأثاث)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* نوع الضمان */}
            <FormField
              control={form.control}
              name="warranty_type"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    نوع الضمان
                    <span className="text-destructive">*</span>
                  </FormLabel>
                  <Select
                    value={field.value || 'manufacturer'}
                    onValueChange={(value) => {
                      // التأكد من إرسال قيمة صالحة فقط
                      if (['manufacturer', 'store', 'extended'].includes(value)) {
                        field.onChange(value);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="h-10 bg-background/80 dark:bg-background/60 border-border/60 hover:border-green-500/60 focus:border-green-600 focus:ring-2 focus:ring-green-500/20">
                        <SelectValue placeholder="اختر نوع الضمان" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {WARRANTY_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* مدة الضمان */}
            <FormField
              control={form.control}
              name="warranty_duration_months"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    مدة الضمان
                    <span className="text-destructive">*</span>
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="مدة الضمان بالأشهر من تاريخ البيع"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="مثال: 12"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-green-500/60 focus:border-green-600 focus:ring-2 focus:ring-green-500/20 transition-all duration-300"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        شهر
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* اختصارات شائعة */}
            <div className="flex flex-wrap gap-2">
              {[3, 6, 12, 24, 36].map(months => (
                <button
                  key={months}
                  type="button"
                  onClick={() => form.setValue('warranty_duration_months', months)}
                  className={cn(
                    'px-3 py-1.5 text-xs rounded-lg border transition-all duration-200',
                    warrantyDuration === months
                      ? 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/50 dark:border-green-700 dark:text-green-300'
                      : 'bg-background/50 border-border/60 text-muted-foreground hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-950/30'
                  )}
                >
                  {months} {months === 12 ? 'سنة' : months === 24 ? 'سنتين' : months === 36 ? '3 سنوات' : 'أشهر'}
                </button>
              ))}
            </div>

            {/* ملخص الضمان */}
            {warrantyDuration && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-green-50/60 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/20 border border-green-200/50 dark:border-green-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="font-medium text-sm text-foreground">ملخص الضمان</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <warrantyTypeInfo.icon className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-muted-foreground text-xs">نوع الضمان</span>
                    </div>
                    <span className="font-medium text-foreground">{warrantyTypeInfo.label}</span>
                  </div>
                  <div className="p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                      <span className="text-muted-foreground text-xs">المدة</span>
                    </div>
                    <span className="font-medium text-foreground">
                      {warrantyDuration} شهر
                    </span>
                  </div>
                  {warrantyEnd && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />
                        <span className="text-muted-foreground text-xs">ينتهي في (إذا بيع اليوم)</span>
                      </div>
                      <span className="font-medium text-green-600 dark:text-green-400">{warrantyEnd}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* وصف نوع الضمان */}
            <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">{warrantyTypeInfo.label}:</strong> {warrantyTypeInfo.description}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default WarrantySettings;
