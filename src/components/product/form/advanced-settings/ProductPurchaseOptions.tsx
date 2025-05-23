import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormDescription } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
// import { Input } from "@/components/ui/input";

interface ProductPurchaseOptionsProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string;
  productId?: string;
}

const ProductPurchaseOptions: React.FC<ProductPurchaseOptionsProps> = ({ form }) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>خيارات الشراء</CardTitle>
        <CardDescription>
          إدارة إعدادات متعلقة بعملية الشراء لهذا المنتج.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="advancedSettings.skip_cart"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">تجاوز السلة (شراء مباشر)</FormLabel>
                <FormDescription>
                  إرسال المستخدم مباشرة إلى صفحة الدفع عند النقر على زر الشراء.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="advancedSettings.enable_stock_notification"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">تفعيل إشعار توفر المخزون</FormLabel>
                <FormDescription>
                  السماح للمستخدمين بالاشتراك لتلقي إشعار عند توفر المنتج مرة أخرى.
                </FormDescription>
              </div>
              <FormControl>
                <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

export default ProductPurchaseOptions; 