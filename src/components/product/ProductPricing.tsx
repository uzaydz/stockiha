import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";

interface ProductPricingProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductPricing({ form }: ProductPricingProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>سعر البيع*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
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

        <FormField
          control={form.control}
          name="purchase_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>سعر الشراء*</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
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
      </div>

      <FormField
        control={form.control}
        name="compare_at_price"
        render={({ field }) => (
          <FormItem>
            <FormLabel>سعر المقارنة (السعر القديم)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={field.value || ''}
                onChange={(e) => {
                  const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                  field.onChange(value);
                }}
              />
            </FormControl>
            <FormDescription>
              يُظهر هذا السعر كسعر مخفض ويعرض نسبة الخصم
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <Separator className="my-4" />
      
      <div className="space-y-4">
        <div className="flex flex-col space-y-1.5">
          <h3 className="text-lg font-semibold">خيارات البيع</h3>
          <p className="text-sm text-muted-foreground">
            حدد طرق البيع المسموح بها لهذا المنتج
          </p>
        </div>

        <FormField
          control={form.control}
          name="allow_retail"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-x-reverse space-y-0">
              <FormControl>
                <Checkbox 
                  checked={field.value} 
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>بيع بالتجزئة</FormLabel>
                <p className="text-sm text-muted-foreground">
                  يُسمح بالبيع بالتجزئة لهذا المنتج
                </p>
              </div>
            </FormItem>
          )}
        />

        <div>
          <div className="flex items-center justify-between mb-2">
            <FormField
              control={form.control}
              name="allow_wholesale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>تفعيل البيع بالجملة</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="wholesale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر الجملة (دج)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      disabled={!form.watch('allow_wholesale')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="min_wholesale_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحد الأدنى لكمية الجملة</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="10"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                      disabled={!form.watch('allow_wholesale')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <FormField
              control={form.control}
              name="allow_partial_wholesale"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-x-reverse space-y-0">
                  <FormControl>
                    <Switch 
                      checked={field.value} 
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel>تفعيل البيع بالجملة الجزئية</FormLabel>
                  </div>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="partial_wholesale_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>سعر الجملة الجزئية (دج)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                        field.onChange(value);
                      }}
                      disabled={!form.watch('allow_partial_wholesale')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="min_partial_wholesale_quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحد الأدنى لكمية الجملة الجزئية</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      placeholder="5"
                      value={field.value || ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                        field.onChange(value);
                      }}
                      disabled={!form.watch('allow_partial_wholesale')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 