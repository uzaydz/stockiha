import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Package, AlertCircle, Hash, Barcode } from 'lucide-react';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import ProductSKUBarcode from './ProductSKUBarcode';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProductInventoryProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId?: string;
  hasVariants?: boolean;
  productId?: string;
}

export default function ProductInventory({ 
  form, 
  organizationId = '', 
  hasVariants = false, 
  productId = '' 
}: ProductInventoryProps) {
  return (
    <div className="space-y-6">
      {/* SKU and Barcode Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Hash className="h-4 w-4 text-primary" />
            </div>
            الرموز والمعرفات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductSKUBarcode 
            form={form} 
            organizationId={organizationId} 
            productId={productId}
          />
        </CardContent>
      </Card>

      {/* Stock Quantity Section */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <div className="bg-blue-100 p-2 rounded-full">
              <Package className="h-4 w-4 text-blue-600" />
            </div>
            إدارة المخزون
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hasVariants && form.watch('has_variants') ? (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center gap-2">
                    <div className="bg-amber-100 p-1.5 rounded-full">
                      <Package className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="font-medium">
                      كمية المخزون تُدار عبر المتغيرات (الألوان والمقاسات)
                    </span>
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input 
                            type="number" 
                            min="0" 
                            step="1" 
                            placeholder="كمية المخزون *"
                            className="pl-10 h-11 bg-background border-border"
                            {...field}
                            defaultValue={field.value === undefined || field.value === null ? 0 : field.value}
                            disabled={hasVariants && form.watch('has_variants')}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-border">
                  <div className="text-center">
                    <div className="bg-green-100 p-3 rounded-full w-fit mx-auto mb-2">
                      <Package className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-sm font-medium">إدارة مبسطة</div>
                    <div className="text-xs text-muted-foreground">
                      كمية موحدة للمنتج
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 