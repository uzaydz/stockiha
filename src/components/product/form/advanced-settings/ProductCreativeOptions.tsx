import React from 'react';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";

interface ProductCreativeOptionsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductCreativeOptions: React.FC<ProductCreativeOptionsProps> = ({ form }) => {
  const showPopularityBadge = useWatch({
    control: form.control,
    name: 'advancedSettings.show_popularity_badge',
    defaultValue: form.getValues('advancedSettings.show_popularity_badge')
  });

  const popularBadgeSuggestions = ["الأكثر مبيعًا", "رائج الآن", "حصري", "جديد", "مميز"];

  return (
    <Card>
      <CardHeader>
        <CardTitle>خيارات إبداعية</CardTitle>
        <CardDescription>
          تفعيل مؤثرات بصرية وميزات إبداعية لصفحة المنتج لتعزيز الجاذبية.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="advancedSettings.show_popularity_badge"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">إظهار شارة الشعبية</FormLabel>
                <FormDescription>
                  عرض شارة تشير إلى مدى شعبية المنتج.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        {showPopularityBadge && (
          <div className="ml-8 space-y-2 border-l pl-6 py-2">
            <FormField
              control={form.control}
              name="advancedSettings.popularity_badge_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نص شارة الشعبية</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="مثال: الأكثر مبيعًا" 
                      {...field} 
                      value={field.value ?? ''} 
                    />
                  </FormControl>
                  <FormDescription>
                    اختر من المقترحات أو اكتب نصًا مخصصًا. المقترحات: {popularBadgeSuggestions.join(", ")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="advancedSettings.enable_gift_wrapping"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">تفعيل خيار تغليف الهدايا</FormLabel>
                <FormDescription>
                  السماح للعملاء بطلب تغليف المنتج كهدية (قد يتطلب تكلفة إضافية).
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default ProductCreativeOptions;
