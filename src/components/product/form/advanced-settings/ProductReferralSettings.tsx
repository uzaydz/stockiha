import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductReferralSettingsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductReferralSettings: React.FC<ProductReferralSettingsProps> = ({ form }) => {
  const watchEnableReferralProgram = useWatch({
    control: form.control,
    name: 'advancedSettings.enable_referral_program',
    defaultValue: form.getValues('advancedSettings.enable_referral_program')
  });

  const watchEnableBuyerDiscount = useWatch({
    control: form.control,
    name: 'advancedSettings.enable_buyer_discount',
    defaultValue: form.getValues('advancedSettings.enable_buyer_discount')
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>إعدادات الإحالة (Affiliate)</CardTitle>
        <CardDescription>
          تكوين برنامج الإحالة لهذا المنتج للسماح للآخرين بالترويج له مقابل عمولة وتقديم خصومات للمشترين عبر الإحالة.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="advancedSettings.enable_referral_program"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">تفعيل برنامج الإحالة لهذا المنتج</FormLabel>
                <FormDescription>
                  السماح للمسوقين بالعمولة بالترويج لهذا المنتج.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {watchEnableReferralProgram && (
          <div className="space-y-6 rounded-lg border p-4 ml-4 border-l-4 border-primary pl-6">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">إعدادات عمولة المسوق:</p>
            <FormField
              control={form.control}
              name="advancedSettings.referral_commission_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع عمولة الإحالة</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value ?? undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر نوع العمولة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية (%)</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    اختر ما إذا كانت العمولة نسبة من سعر المنتج أو مبلغًا ثابتًا.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="advancedSettings.referral_commission_value"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>قيمة عمولة الإحالة</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        placeholder="مثال: 10 أو 5.5" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseFloat(value));
                        }}
                    />
                  </FormControl>
                  <FormDescription>
                    أدخل قيمة العمولة (رقم للنسبة المئوية، أو مبلغ ثابت).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="advancedSettings.referral_cookie_duration_days"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>مدة صلاحية ملف تعريف الارتباط (كوكيز) للإحالة (بالأيام)</FormLabel>
                  <FormControl>
                    <Input 
                        type="number" 
                        placeholder="مثال: 30" 
                        {...field} 
                        value={field.value ?? ''} 
                        onChange={e => {
                            const value = e.target.value;
                            field.onChange(value === '' ? null : parseInt(value, 10));
                        }}
                    />
                  </FormControl>
                  <FormDescription>
                    المدة التي سيبقى فيها ملف تعريف الارتباط صالحًا لاحتساب الإحالة بعد نقرة الزائر.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <hr className="my-4" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">إعدادات خصم المشتري عبر الإحالة:</p>
            <FormField
              control={form.control}
              name="advancedSettings.enable_buyer_discount"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">تفعيل خصم للمشتري</FormLabel>
                    <FormDescription>
                      هل يحصل المشتري الذي يستخدم رابط الإحالة على خصم؟
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            {watchEnableBuyerDiscount && (
              <div className="ml-6 pl-4 border-l space-y-4">
                <FormField
                  control={form.control}
                  name="advancedSettings.buyer_discount_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نسبة الخصم للمشتري (%)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            placeholder="مثال: 5" 
                            {...field} 
                            value={field.value ?? ''} 
                            onChange={e => {
                                const value = e.target.value;
                                field.onChange(value === '' ? null : parseInt(value, 10));
                            }}
                            min="0"
                            max="100"
                        />
                      </FormControl>
                      <FormDescription>
                        نسبة الخصم التي سيحصل عليها المشتري عند استخدام رابط الإحالة (0-100%).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductReferralSettings; 