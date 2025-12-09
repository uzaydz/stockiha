/**
 * 📅 Expiry Tracking Settings
 *
 * إعدادات تتبع الصلاحية للمنتجات (للصيدليات، الأغذية، مستحضرات التجميل)
 */

import { useCallback } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, HelpCircle, Info, Bell, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface ExpiryTrackingSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// =====================================================
// المكون الرئيسي
// =====================================================

// ⚡ إزالة memo لأن form.watch يحتاج re-render عند التغيير
const ExpiryTrackingSettings = ({ form, className }: ExpiryTrackingSettingsProps) => {
  const trackExpiry = form.watch('track_expiry');
  const defaultExpiryDays = form.watch('default_expiry_days');
  const alertDaysBefore = form.watch('alert_days_before');

  // حساب تاريخ الصلاحية المتوقع
  const calculateExpectedExpiry = useCallback(() => {
    if (!defaultExpiryDays) return null;
    const date = new Date();
    date.setDate(date.getDate() + defaultExpiryDays);
    return date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [defaultExpiryDays]);

  // حساب تاريخ التنبيه
  const calculateAlertDate = useCallback(() => {
    if (!defaultExpiryDays || !alertDaysBefore) return null;
    const date = new Date();
    date.setDate(date.getDate() + defaultExpiryDays - alertDaysBefore);
    return date.toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [defaultExpiryDays, alertDaysBefore]);

  const expectedExpiry = calculateExpectedExpiry();
  const alertDate = calculateAlertDate();

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-amber-50/60 via-orange-50/40 to-transparent dark:from-amber-950/30 dark:via-orange-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/60 dark:to-orange-900/60 p-2.5 rounded-xl shadow-sm">
              <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">تتبع الصلاحية</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="track_expiry"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-amber-600 dark:data-[state=checked]:bg-amber-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`expiry-content-${trackExpiry}`}>
        {!trackExpiry ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل تتبع الصلاحية لمراقبة تواريخ انتهاء المنتجات (مثل: الأدوية، الأغذية، مستحضرات التجميل)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* مدة الصلاحية الافتراضية */}
            <FormField
              control={form.control}
              name="default_expiry_days"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    مدة الصلاحية الافتراضية
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="عدد الأيام الافتراضي لصلاحية المنتج من تاريخ الإنتاج"
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
                        placeholder="مثال: 365"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        يوم
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* التنبيه قبل انتهاء الصلاحية */}
            <FormField
              control={form.control}
              name="alert_days_before"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                    التنبيه قبل الانتهاء بـ
                    <span
                      className="inline-flex items-center justify-center p-1 rounded-md hover:bg-muted/50 transition-colors"
                      title="عدد الأيام التي سيتم إرسال تنبيه قبلها من انتهاء الصلاحية"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                    </span>
                  </FormLabel>
                  <FormControl>
                    <div className="relative group">
                      <Bell className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="مثال: 30"
                        className="h-10 pr-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-amber-500/60 focus:border-amber-600 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-xs text-muted-foreground">
                        يوم
                      </div>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* معاينة التواريخ */}
            {defaultExpiryDays && (
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-800/30">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span className="font-medium text-sm text-foreground">معاينة (إذا تم إنشاء الدفعة اليوم)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-background/50 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span className="text-muted-foreground text-xs">تاريخ انتهاء الصلاحية</span>
                    </div>
                    <span className="font-medium text-foreground">{expectedExpiry}</span>
                  </div>
                  {alertDate && alertDaysBefore && (
                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <Bell className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
                        <span className="text-muted-foreground text-xs">تاريخ التنبيه</span>
                      </div>
                      <span className="font-medium text-orange-600 dark:text-orange-400">{alertDate}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* تنبيه FIFO */}
            <Alert className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                <strong>نصيحة:</strong> سيتم بيع المنتجات الأقرب لانتهاء الصلاحية أولاً (FIFO) لتقليل الهدر
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ExpiryTrackingSettings;
