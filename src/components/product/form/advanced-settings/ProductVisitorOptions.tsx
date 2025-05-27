import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface ProductVisitorOptionsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductVisitorOptions: React.FC<ProductVisitorOptionsProps> = ({ form }) => {
  const showFakeVisitorCounter = useWatch({
    control: form.control,
    name: 'advancedSettings.show_fake_visitor_counter',
    defaultValue: form.getValues('advancedSettings.show_fake_visitor_counter')
  });
  const enableFakeLowStock = useWatch({
    control: form.control,
    name: 'advancedSettings.enable_fake_low_stock',
    defaultValue: form.getValues('advancedSettings.enable_fake_low_stock')
  });
  const showStockCountdown = useWatch({
    control: form.control,
    name: 'advancedSettings.show_stock_countdown',
    defaultValue: form.getValues('advancedSettings.show_stock_countdown')
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>خيارات الزوار</CardTitle>
        <CardDescription>
          تخصيص تجربة الزائر في صفحة المنتج لزيادة الثقة والمبيعات.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="advancedSettings.show_fake_visitor_counter"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">إظهار عداد زوار وهمي</FormLabel>
                <FormDescription>
                  عرض عدد وهمي للزوار الحاليين لزيادة الإقبال المتصور.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        {showFakeVisitorCounter && (
          <div className="ml-8 space-y-4 border-l pl-6 py-2">
            <FormField
              control={form.control}
              name="advancedSettings.min_fake_visitors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أقل عدد زوار وهمي</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>الحد الأدنى لعدد الزوار الوهمي.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="advancedSettings.max_fake_visitors"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أقصى عدد زوار وهمي</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>الحد الأقصى لعدد الزوار الوهمي.</FormDescription>
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="advancedSettings.enable_fake_low_stock"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">تفعيل تنبيه وهمي بانخفاض المخزون</FormLabel>
                <FormDescription>
                  إظهار رسالة وهمية بأن الكمية المتبقية من المنتج قليلة.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        {enableFakeLowStock && (
          <div className="ml-8 space-y-4 border-l pl-6 py-2">
            <FormField
              control={form.control}
              name="advancedSettings.min_fake_stock_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أقل حد للمخزون الوهمي</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>أقل كمية وهمية للمخزون قبل ظهور التنبيه.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="advancedSettings.max_fake_stock_threshold"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>أقصى حد للمخزون الوهمي</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>أقصى كمية وهمية للمخزون قبل ظهور التنبيه.</FormDescription>
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="advancedSettings.show_stock_countdown"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">إظهار عداد تنازلي للمخزون</FormLabel>
                <FormDescription>
                  عرض عداد تنازلي للكمية المتبقية في المخزون (يمكن أن يكون وهميًا).
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        {showStockCountdown && (
          <div className="ml-8 space-y-4 border-l pl-6 py-2">
            <FormField
              control={form.control}
              name="advancedSettings.stock_countdown_duration_hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة العداد التنازلي (بالساعات)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} value={field.value || 0} onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)} />
                  </FormControl>
                  <FormDescription>عدد الساعات التي سيستمر فيها العداد التنازلي.</FormDescription>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="advancedSettings.reset_stock_countdown_on_zero"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm">إعادة تعيين العداد عند الصفر</FormLabel>
                    <FormDescription>
                      هل يتم إعادة تشغيل العداد تلقائيًا عند وصوله للصفر؟
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductVisitorOptions;
