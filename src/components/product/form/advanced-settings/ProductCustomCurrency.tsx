import React, { useEffect } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { ProductFormValues } from '@/types/product';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ProductCustomCurrencyProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId: string; 
  productId?: string;    
}

// قائمة العملات المتاحة مؤقتًا، لاحقًا يمكن جلبها من API
const availableCurrencies = [
  { code: 'DZD', name: 'دينار جزائري' },
  { code: 'SAR', name: 'ريال سعودي' },
  { code: 'AED', name: 'درهم إماراتي' },
  { code: 'EGP', name: 'جنيه مصري' },
  { code: 'EUR', name: 'يورو' },
  { code: 'USD', name: 'دولار أمريكي' },
];

const ProductCustomCurrency: React.FC<ProductCustomCurrencyProps> = ({ form }) => {
  const watchUseCustomCurrency = form.watch('advancedSettings.use_custom_currency');
  const watchIsBaseCurrency = form.watch('advancedSettings.is_base_currency');

  useEffect(() => {
    if (watchUseCustomCurrency && watchIsBaseCurrency) {
      form.setValue('advancedSettings.custom_currency_code', 'DZD');
    }
  }, [watchUseCustomCurrency, watchIsBaseCurrency, form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>عملة مخصصة</CardTitle>
        <CardDescription>
          تخصيص عملة العرض والتسعير لهذا المنتج.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name={"advancedSettings.use_custom_currency"}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  استخدام عملة مخصصة لهذا المنتج
                </FormLabel>
                <FormDescription>
                  تجاوز العملة الافتراضية للمتجر واستخدام عملة مخصصة لهذا المنتج فقط.
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked);
                    if (!checked) {
                      // إذا تم تعطيل العملة المخصصة، قم بإلغاء تحديد العملة الأساسية أيضًا
                      form.setValue('advancedSettings.is_base_currency', false);
                      form.setValue('advancedSettings.custom_currency_code', null);
                    }
                  }}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {watchUseCustomCurrency && (
          <>
            <FormField
              control={form.control}
              name={"advancedSettings.is_base_currency"}
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">
                      تعيين كعملة أساسية (دينار جزائري)
                    </FormLabel>
                    <FormDescription>
                      عند التمكين، سيتم استخدام الدينار الجزائري (DZD) لهذا المنتج.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={(checked) => {
                        field.onChange(checked);
                        if (checked) {
                          form.setValue('advancedSettings.custom_currency_code', 'DZD');
                        } else {
                           // إذا لم تعد العملة الأساسية، يمكن للمستخدم اختيار عملة أخرى أو مسحها
                           // اترك custom_currency_code كما هو أو اسمح للمستخدم بتغييره
                        }
                      }}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={"advancedSettings.custom_currency_code"}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>العملة المخصصة</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value || ''} // يجب أن يكون value مُعرفًا
                    disabled={watchIsBaseCurrency} // يتم تعطيله إذا كانت العملة الأساسية مفعلة
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="اختر عملة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCurrencies.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {watchIsBaseCurrency 
                      ? "العملة الأساسية (دينار جزائري) مفعلة." 
                      : "اختر رمز العملة من القائمة."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {!watchUseCustomCurrency && (
          <div className="p-4 bg-muted/50 rounded-md text-sm text-muted-foreground">
            العملة المخصصة غير مفعلة. يتم استخدام العملة الافتراضية للمتجر.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ProductCustomCurrency;
