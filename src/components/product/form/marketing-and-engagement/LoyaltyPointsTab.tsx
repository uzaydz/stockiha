import React from 'react';
import { UseFormReturn, Controller } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Award, DollarSign, Settings, CalendarClock, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface LoyaltyPointsTabProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const LoyaltyPointsTab: React.FC<LoyaltyPointsTabProps> = ({ form, organizationId, productId }) => {
  const { control, watch } = form;

  const loyaltyPointsEnabled = watch('marketingSettings.loyalty_points_enabled');
  const redeemPointsEnabled = watch('marketingSettings.redeem_points_for_discount');

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Award className="mr-2 h-6 w-6" />
          نقاط الولاء
        </CardTitle>
        <CardDescription>
          قم بإعداد وتخصيص برنامج نقاط الولاء لمنتجاتك لتعزيز تفاعل العملاء ومكافأتهم.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <FormField
          control={control}
          name="marketingSettings.loyalty_points_enabled"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base font-semibold">تفعيل نظام نقاط الولاء</FormLabel>
                <FormDescription>
                  قم بتشغيل أو إيقاف برنامج نقاط الولاء لهذا المنتج.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value || false}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {loyaltyPointsEnabled && (
          <div className="space-y-6 pt-6 border-t">
            {/* Section for Naming Loyalty Points */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  تسمية نقاط الولاء
                </CardTitle>
                <CardDescription>اختر أسماء معبرة لعملة الولاء الخاصة بك.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="marketingSettings.loyalty_points_name_singular"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم النقطة (مفرد)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: نقطة، نجمة، جوهرة" value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="marketingSettings.loyalty_points_name_plural"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>اسم النقاط (جمع)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="مثال: نقاط، نجوم، جواهر" value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section for Earning Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  قواعد كسب النقاط
                </CardTitle>
                <CardDescription>حدد كيف يمكن للعملاء كسب نقاط الولاء.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="marketingSettings.points_per_currency_unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النقاط المكتسبة لكل وحدة عملة منفقة</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="مثال: 1 (نقطة لكل دينار)" value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || null)} />
                      </FormControl>
                      <FormDescription>كم نقطة يكتسب العميل مقابل كل وحدة من عملة المتجر (مثلاً: دينار، دولار).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="marketingSettings.min_purchase_to_earn_points"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحد الأدنى لمبلغ الشراء لكسب النقاط (اختياري)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="مثال: 5000 (دينار)" value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || null)} />
                      </FormControl>
                      <FormDescription>إذا تم تحديده، يجب أن يتجاوز العميل هذا المبلغ لكسب النقاط.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={control}
                  name="marketingSettings.max_points_per_order"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الحد الأقصى للنقاط التي يمكن كسبها في طلب واحد (اختياري)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} placeholder="مثال: 1000 (نقطة)" value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || null)} />
                      </FormControl>
                      <FormDescription>لتحديد سقف أعلى للنقاط المكتسبة في كل عملية شراء.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Section for Redeeming Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                  <DollarSign className="w-5 h-5 mr-2 transform -scale-x-100" /> {/* Flipped icon for redeem */}
                  قواعد استبدال النقاط
                </CardTitle>
                <CardDescription>حدد كيف يمكن للعملاء استبدال نقاطهم.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="marketingSettings.redeem_points_for_discount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">السماح باستبدال النقاط بخصم ثابت</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value || false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {redeemPointsEnabled && (
                  <div className="pl-4 ml-4 border-l space-y-4 mt-2">
                    <FormField
                      control={control}
                      name="marketingSettings.points_needed_for_fixed_discount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>النقاط المطلوبة للحصول على الخصم</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="مثال: 500 (نقطة)" value={field.value || ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || null)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={control}
                      name="marketingSettings.fixed_discount_value_for_points"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>قيمة الخصم الثابت (بعملة المتجر)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} placeholder="مثال: 250 (دينار)" value={field.value || ''} onChange={e => field.onChange(parseFloat(e.target.value) || null)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Section for Points Expiration */}
            <Card className="bg-muted/30">
              <CardHeader>
                <CardTitle className="text-md flex items-center">
                   <CalendarClock className="w-5 h-5 mr-2" />
                  صلاحية النقاط
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={control}
                  name="marketingSettings.points_expiration_months"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <FormLabel>مدة صلاحية النقاط (بالأشهر)</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger type="button"> {/* Important for accessibility */}
                              <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>أدخل 0 إذا كنت لا تريد أن تنتهي صلاحية النقاط.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <Input type="number" {...field} placeholder="مثال: 12 (شهرًا)" value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) ?? 0)} />
                      </FormControl>
                      <FormDescription>
                        كم شهرًا تبقى النقاط صالحة قبل أن تنتهي صلاحيتها (0 يعني لا تنتهي أبدًا).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoyaltyPointsTab; 