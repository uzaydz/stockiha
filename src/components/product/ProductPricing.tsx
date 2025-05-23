import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { DollarSign, ShoppingBag, Percent, Plus, Trash2, TrendingUp } from 'lucide-react';
import { useFieldArray } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductPricingProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductPricing({ form }: ProductPricingProps) {
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "wholesale_tiers",
  });

  const price = form.watch("price");
  const purchasePrice = form.watch("purchase_price");

  let profitMargin: number | null = null;
  let profitPercentage: number | null = null;

  if (typeof price === 'number' && typeof purchasePrice === 'number' && purchasePrice > 0) {
    profitMargin = price - purchasePrice;
    profitPercentage = (profitMargin / purchasePrice) * 100;
  }

  return (
    <div className="space-y-6">
      {/* Basic Pricing Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <DollarSign className="h-4 w-4 text-primary" />
            </div>
            التسعير الأساسي
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="سعر البيع *"
                        className="pl-10 h-11 bg-background border-border"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseFloat(e.target.value));
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="purchase_price"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <ShoppingBag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="سعر الشراء *"
                        className="pl-10 h-11 bg-background border-border"
                        {...field}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === '' ? null : parseFloat(val));
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="compare_at_price"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="سعر المقارنة (السعر القديم)"
                      className="pl-10 h-11 bg-background border-border"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Profit Analysis Section */}
      {(typeof price === 'number' || typeof purchasePrice === 'number') && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
              تحليل الربحية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-2 rounded-full">
                    <DollarSign className="h-4 w-4 text-blue-600" />
                  </div>
                  <span className="font-medium">هامش الربح</span>
                </div>
                <Badge variant="outline" className="text-base">
                  {profitMargin !== null ? `${profitMargin.toFixed(2)} د.إ` : 'غير محدد'}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-center gap-3">
                  <div className="bg-emerald-100 p-2 rounded-full">
                    <Percent className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="font-medium">نسبة الربح</span>
                </div>
                <Badge variant="outline" className="text-base">
                  {profitPercentage !== null ? `${profitPercentage.toFixed(2)}%` : 'غير محدد'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Wholesale Tiers Section */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-full">
                <ShoppingBag className="h-4 w-4 text-primary" />
              </div>
              أسعار الجملة
            </CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ min_quantity: undefined, price_per_unit: undefined })}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              إضافة سعر
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">لا توجد أسعار جملة</p>
              <p className="text-xs">انقر "إضافة سعر" لإنشاء واحدة</p>
            </div>
          ) : (
            <div className="space-y-3">
              {fields.map((item, index) => (
                <div key={item.id} className="flex gap-3 p-4 border border-border rounded-lg bg-muted/20">
                  <FormField
                    control={form.control}
                    name={`wholesale_tiers.${index}.min_quantity`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="1"
                            placeholder="الحد الأدنى للكمية"
                            className="h-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseInt(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`wholesale_tiers.${index}.price_per_unit`}
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="السعر للوحدة"
                            className="h-10"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value));
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(index)}
                    className="px-3 hover:bg-red-50 hover:border-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 