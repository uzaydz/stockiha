/**
 * 🔢 Serial Number Settings
 *
 * إعدادات تتبع الأرقام التسلسلية للمنتجات (الإلكترونيات، الأجهزة، قطع الغيار)
 */

import { memo } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Hash, Info, ShieldCheck, Smartphone, QrCode, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductFormValues } from '@/types/product';

// =====================================================
// الأنواع
// =====================================================

interface SerialNumberSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  className?: string;
}

// =====================================================
// المكون الرئيسي
// =====================================================

// ⚡ إزالة memo لأن form.watch يحتاج re-render عند التغيير
const SerialNumberSettings = ({ form, className }: SerialNumberSettingsProps) => {
  const trackSerialNumbers = form.watch('track_serial_numbers');
  const requireOnSale = form.watch('require_serial_on_sale');

  return (
    <Card className={cn(
      'border-border/50 shadow-md dark:shadow-xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm',
      className
    )}>
      <CardHeader className="pb-4 bg-gradient-to-r from-cyan-50/60 via-teal-50/40 to-transparent dark:from-cyan-950/30 dark:via-teal-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
        <CardTitle className="text-base font-semibold flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-cyan-100 to-teal-100 dark:from-cyan-900/60 dark:to-teal-900/60 p-2.5 rounded-xl shadow-sm">
              <Hash className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            </div>
            <div>
              <span className="text-foreground text-sm">الأرقام التسلسلية</span>
              <Badge variant="outline" className="text-xs mr-2 shadow-sm">اختياري</Badge>
            </div>
          </div>

          {/* زر التفعيل */}
          <FormField
            control={form.control}
            name="track_serial_numbers"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2">
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-cyan-600 dark:data-[state=checked]:bg-cyan-500"
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </CardTitle>
      </CardHeader>

      <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background" key={`serial-content-${trackSerialNumbers}`}>
        {!trackSerialNumbers ? (
          <Alert className="border-muted bg-muted/20">
            <Info className="h-4 w-4 text-muted-foreground" />
            <AlertDescription className="text-muted-foreground text-sm">
              قم بتفعيل تتبع الأرقام التسلسلية لمتابعة كل وحدة على حدة (مثل: الهواتف، الأجهزة الإلكترونية، قطع الغيار)
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-5 animate-in slide-in-from-top-2 duration-300">
            {/* طلب الرقم التسلسلي عند البيع */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50/60 to-teal-50/40 dark:from-cyan-950/30 dark:to-teal-950/20 rounded-xl border border-cyan-200/50 dark:border-cyan-800/30">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-cyan-100 to-cyan-200 dark:from-cyan-900/60 dark:to-cyan-800/60 p-2 rounded-lg shadow-sm">
                  <QrCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <div className="font-medium text-sm text-foreground">
                    طلب الرقم التسلسلي عند البيع
                  </div>
                  <div className="text-xs text-muted-foreground">
                    يجب تحديد الرقم التسلسلي قبل إتمام البيع
                  </div>
                </div>
              </div>
              <FormField
                control={form.control}
                name="require_serial_on_sale"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-cyan-600 dark:data-[state=checked]:bg-cyan-500"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {/* المميزات */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50/40 to-teal-50/30 dark:from-cyan-950/20 dark:to-teal-950/15 border border-cyan-100/50 dark:border-cyan-900/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                    <Smartphone className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="font-medium text-sm text-foreground">تتبع IMEI</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  تسجيل أرقام IMEI للهواتف والأجهزة المحمولة
                </p>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-50/40 to-teal-50/30 dark:from-cyan-950/20 dark:to-teal-950/15 border border-cyan-100/50 dark:border-cyan-900/30">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/50">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <span className="font-medium text-sm text-foreground">ربط بالضمان</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ربط الضمان بالرقم التسلسلي للتحقق السهل
                </p>
              </div>
            </div>

            {/* تنبيه مهم */}
            <Alert className="border-cyan-200/60 bg-gradient-to-r from-cyan-50/80 to-teal-50/60 dark:from-cyan-950/40 dark:to-teal-950/30">
              <AlertCircle className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <AlertDescription className="text-cyan-800 dark:text-cyan-200 text-sm">
                <strong>ملاحظة:</strong> يمكنك إضافة الأرقام التسلسلية عند استلام المخزون أو عند إضافة دفعة جديدة
              </AlertDescription>
            </Alert>

            {/* معلومات إضافية */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-slate-50/60 to-gray-50/40 dark:from-slate-950/30 dark:to-gray-950/20 border border-slate-200/50 dark:border-slate-800/30">
              <h4 className="font-medium text-sm text-foreground mb-3">ما يتم تسجيله لكل رقم تسلسلي:</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  الرقم التسلسلي
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  رقم IMEI (اختياري)
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  تاريخ الاستلام
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  حالة الوحدة
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  بيانات البيع
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                  معلومات الضمان
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SerialNumberSettings;
