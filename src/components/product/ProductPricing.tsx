import { FormControl, FormField, FormItem, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { DollarSign, ShoppingBag, Percent, Store, Truck, Package, ShoppingCart } from 'lucide-react';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProductPricingProps {
  form: UseFormReturn<ProductFormValues>;
}

export default function ProductPricing({ form }: ProductPricingProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <DollarSign size={18} />
                </span>
                <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                  سعر البيع*
                </span>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                    {...field}
                    onChange={(e) => {
                      field.onChange(parseFloat(e.target.value));
                    }}
                  />
                </FormControl>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="purchase_price"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <ShoppingBag size={18} />
                </span>
                <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                  سعر الشراء*
                </span>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                    {...field}
                    onChange={(e) => {
                      field.onChange(parseFloat(e.target.value));
                    }}
                  />
                </FormControl>
              </div>
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
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <Percent size={18} />
              </span>
              <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                سعر المقارنة (السعر القديم)
              </span>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                  value={field.value || ''}
                  onChange={(e) => {
                    const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                    field.onChange(value);
                  }}
                />
              </FormControl>
            </div>
            <FormDescription className="text-xs mt-1">
              يُظهر هذا السعر كسعر مخفض ويعرض نسبة الخصم
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="bg-muted/30 p-5 rounded-lg mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Store className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">خيارات البيع</h3>
        </div>
        
        <p className="text-sm text-muted-foreground mb-4">
          حدد طرق البيع المسموح بها لهذا المنتج
        </p>

        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="allow_retail"
            render={({ field }) => (
              <FormItem className="flex items-center gap-3 bg-background p-3 rounded-md shadow-sm border border-border/50 hover:border-primary/30 transition-colors">
                <FormControl>
                  <Checkbox 
                    checked={field.value} 
                    onCheckedChange={field.onChange}
                    className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                  />
                </FormControl>
                <div className="leading-none flex-1">
                  <p className="font-medium mb-1 flex items-center gap-1">
                    <ShoppingCart className="h-4 w-4 text-blue-500" />
                    بيع بالتجزئة
                  </p>
                  <p className="text-xs text-muted-foreground">
                    يُسمح بالبيع بالتجزئة لهذا المنتج
                  </p>
                </div>
              </FormItem>
            )}
          />

          <div className={cn(
            "rounded-md border border-border/50 overflow-hidden transition-all",
            form.watch('allow_wholesale') ? "bg-background" : "bg-muted/40"
          )}>
            <div className="p-4">
              <FormField
                control={form.control}
                name="allow_wholesale"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-amber-500" />
                      <p className="font-medium">تفعيل البيع بالجملة</p>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-border/30 transition-all",
              !form.watch('allow_wholesale') && "opacity-60"
            )}>
              <FormField
                control={form.control}
                name="wholesale_price"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <DollarSign size={16} />
                      </span>
                      <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                        سعر الجملة
                      </Badge>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pt-6 pl-10 h-16"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                          disabled={!form.watch('allow_wholesale')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="min_wholesale_quantity"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Package size={16} />
                      </span>
                      <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                        الحد الأدنى للكمية
                      </Badge>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="10"
                          className="pt-6 pl-10 h-16"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                          disabled={!form.watch('allow_wholesale')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className={cn(
            "rounded-md border border-border/50 overflow-hidden transition-all",
            form.watch('allow_partial_wholesale') ? "bg-background" : "bg-muted/40"
          )}>
            <div className="p-4">
              <FormField
                control={form.control}
                name="allow_partial_wholesale"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-green-500" />
                      <p className="font-medium">تفعيل البيع بالجملة الجزئية</p>
                    </div>
                    <FormControl>
                      <Switch 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-primary"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className={cn(
              "grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-t border-border/30 transition-all",
              !form.watch('allow_partial_wholesale') && "opacity-60"
            )}>
              <FormField
                control={form.control}
                name="partial_wholesale_price"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <DollarSign size={16} />
                      </span>
                      <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                        سعر الجملة الجزئية
                      </Badge>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          className="pt-6 pl-10 h-16"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                            field.onChange(value);
                          }}
                          disabled={!form.watch('allow_partial_wholesale')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="min_partial_wholesale_quantity"
                render={({ field }) => (
                  <FormItem>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <Package size={16} />
                      </span>
                      <Badge variant="outline" className="absolute right-3 top-[13px] text-[10px] bg-muted/40">
                        الحد الأدنى للكمية الجزئية
                      </Badge>
                      <FormControl>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="5"
                          className="pt-6 pl-10 h-16"
                          value={field.value || ''}
                          onChange={(e) => {
                            const value = e.target.value === '' ? undefined : parseInt(e.target.value);
                            field.onChange(value);
                          }}
                          disabled={!form.watch('allow_partial_wholesale')}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 