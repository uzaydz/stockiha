import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Package, AlertCircle, Hash, Barcode, HelpCircle, Warehouse, TrendingUp } from 'lucide-react';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import ProductSKUBarcode from './ProductSKUBarcode';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

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
  const stockQuantity = form.watch('stock_quantity') || 0;
  const hasVariantsEnabled = form.watch('has_variants');

  const getStockStatus = () => {
    if (stockQuantity === 0) return 'out-of-stock';
    if (stockQuantity <= 10) return 'low-stock';
    return 'in-stock';
  };

  const stockStatus = getStockStatus();

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* SKU and Barcode Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-blue-50/60 via-indigo-50/40 to-transparent dark:from-blue-950/30 dark:via-indigo-950/20 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/60 dark:to-indigo-900/60 p-2.5 rounded-xl shadow-sm">
                <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">الرموز والمعرفات</span>
                <Badge variant="destructive" className="text-xs mr-2 shadow-sm">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-gradient-to-b from-background/50 to-background">
            <ProductSKUBarcode 
              form={form} 
              organizationId={organizationId} 
              productId={productId}
            />
          </CardContent>
        </Card>

        {/* Stock Quantity Section */}
        <Card className="border-border/50 shadow-lg dark:shadow-2xl dark:shadow-black/20 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent rounded-t-lg border-b border-border/30">
            <CardTitle className="text-base font-semibold flex items-center gap-3">
              <div className="bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/15 p-2.5 rounded-xl shadow-sm">
                <Warehouse className="h-4 w-4 text-primary dark:text-primary-foreground" />
              </div>
              <div className="flex-1">
                <span className="text-foreground text-sm">إدارة المخزون</span>
                <Badge variant="destructive" className="text-xs mr-2 shadow-sm">مطلوب</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-5 bg-gradient-to-b from-background/50 to-background">
            {hasVariants && hasVariantsEnabled ? (
              <Alert className="border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-orange-50/60 dark:from-amber-950/40 dark:to-orange-950/30 shadow-sm backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/60 dark:to-amber-800/60 p-2 rounded-xl shadow-sm">
                    <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <AlertDescription className="flex-1">
                    <div className="font-medium text-amber-800 dark:text-amber-200 text-sm mb-1">
                      إدارة المخزون عبر المتغيرات
                    </div>
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      كمية المخزون تُدار عبر المتغيرات (الألوان والمقاسات) في تبويبة المتغيرات
                    </div>
                  </AlertDescription>
                </div>
              </Alert>
            ) : (
              <div className="space-y-5">
                <FormField
                  control={form.control}
                  name="stock_quantity"
                  render={({ field }) => (
                    <FormItem className="space-y-2">
                      <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                        كمية المخزون
                        <span className="text-destructive">*</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center"
                              onClick={(e) => e.preventDefault()}
                            >
                              <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-primary transition-colors cursor-help" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent 
                            className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                            side="top"
                            sideOffset={5}
                          >
                            <p className="text-xs">عدد الوحدات المتوفرة في المخزون. يتم تحديث هذا الرقم تلقائياً مع كل عملية بيع.</p>
                          </TooltipContent>
                        </Tooltip>
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-all duration-300 group-focus-within:scale-110" />
                          <Input 
                            type="number" 
                            min="0" 
                            step="1" 
                            placeholder="0"
                            className="pl-10 h-10 text-sm bg-background/80 dark:bg-background/60 border-border/60 hover:border-primary/60 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg backdrop-blur-sm"
                            {...field}
                            defaultValue={field.value === undefined || field.value === null ? 0 : field.value}
                            disabled={hasVariants && hasVariantsEnabled}
                            onChange={(e) => {
                              const value = parseInt(e.target.value, 10);
                              field.onChange(isNaN(value) ? 0 : value);
                            }}
                          />
                          <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                {/* Stock Status Indicator */}
                <div className={`p-4 rounded-xl border backdrop-blur-sm shadow-sm transition-all duration-300 ${
                  stockStatus === 'out-of-stock' 
                    ? 'bg-gradient-to-r from-red-50/60 to-red-100/40 dark:from-red-950/30 dark:to-red-900/20 border-red-200/50 dark:border-red-800/30'
                    : stockStatus === 'low-stock'
                    ? 'bg-gradient-to-r from-yellow-50/60 to-amber-50/40 dark:from-yellow-950/30 dark:to-amber-950/20 border-yellow-200/50 dark:border-yellow-800/30'
                    : 'bg-gradient-to-r from-green-50/60 to-emerald-50/40 dark:from-green-950/30 dark:to-emerald-950/20 border-green-200/50 dark:border-green-800/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl shadow-sm ${
                      stockStatus === 'out-of-stock'
                        ? 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/60 dark:to-red-800/60'
                        : stockStatus === 'low-stock'
                        ? 'bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/60 dark:to-amber-900/60'
                        : 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/60 dark:to-emerald-900/60'
                    }`}>
                      <Package className={`w-4 h-4 ${
                        stockStatus === 'out-of-stock'
                          ? 'text-red-600 dark:text-red-400'
                          : stockStatus === 'low-stock'
                          ? 'text-yellow-600 dark:text-yellow-400'
                          : 'text-green-600 dark:text-green-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className={`font-medium text-sm ${
                        stockStatus === 'out-of-stock'
                          ? 'text-red-800 dark:text-red-200'
                          : stockStatus === 'low-stock'
                          ? 'text-yellow-800 dark:text-yellow-200'
                          : 'text-green-800 dark:text-green-200'
                      }`}>
                        {stockStatus === 'out-of-stock' 
                          ? 'نفد من المخزون'
                          : stockStatus === 'low-stock'
                          ? 'مخزون منخفض'
                          : 'متوفر في المخزون'
                        }
                      </div>
                      <div className={`text-xs ${
                        stockStatus === 'out-of-stock'
                          ? 'text-red-700 dark:text-red-300'
                          : stockStatus === 'low-stock'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {stockStatus === 'out-of-stock' 
                          ? 'يجب إعادة تعبئة المخزون'
                          : stockStatus === 'low-stock'
                          ? 'فكر في إعادة الطلب قريباً'
                          : `${stockQuantity} وحدة متوفرة`
                        }
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={`text-lg font-bold ${
                        stockStatus === 'out-of-stock'
                          ? 'text-red-700 dark:text-red-300'
                          : stockStatus === 'low-stock'
                          ? 'text-yellow-700 dark:text-yellow-300'
                          : 'text-green-700 dark:text-green-300'
                      }`}>
                        {stockQuantity}
                      </div>
                      <div className="text-xs text-muted-foreground">وحدة</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
