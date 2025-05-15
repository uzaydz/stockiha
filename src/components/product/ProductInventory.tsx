import { useState } from 'react';
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Package, LayoutGrid, Info } from 'lucide-react';
import { toast } from 'sonner';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  generateAutomaticSku, 
  generateAutomaticBarcode 
} from '@/lib/api/products';
import { 
  generateLocalSku, 
  generateLocalEAN13 
} from '@/lib/api/indexedDBProducts';

interface ProductInventoryProps {
  form: UseFormReturn<ProductFormValues>;
  organizationId?: string;
  hasVariants?: boolean;
}

export default function ProductInventory({ form, organizationId = '', hasVariants = false }: ProductInventoryProps) {
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      let sku = '';
      
      // محاولة توليد SKU من الخادم أولاً
      if (navigator.onLine) {
        try {
          sku = await generateAutomaticSku(organizationId);
        } catch (error) {
          // عند فشل الطلب من الخادم، نجرب الطريقة المحلية
          sku = await generateLocalSku();
        }
      } else {
        // إذا كان المستخدم غير متصل بالإنترنت، نستخدم التوليد المحلي مباشرة
        sku = await generateLocalSku();
      }
      
      if (sku) {
        form.setValue('sku', sku);
        toast.success('تم توليد رمز SKU بنجاح');
      } else {
        toast.error('فشل في توليد رمز SKU');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد رمز SKU');
    } finally {
      setGeneratingSku(false);
    }
  };
  
  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      let barcode = '';
      
      // محاولة توليد باركود من الخادم أولاً
      if (navigator.onLine) {
        try {
          barcode = await generateAutomaticBarcode();
        } catch (error) {
          // عند فشل الطلب من الخادم، نجرب الطريقة المحلية
          barcode = generateLocalEAN13();
        }
      } else {
        // إذا كان المستخدم غير متصل بالإنترنت، نستخدم التوليد المحلي مباشرة
        barcode = generateLocalEAN13();
      }
      
      if (barcode) {
        form.setValue('barcode', barcode);
        toast.success('تم توليد الباركود بنجاح');
      } else {
        toast.error('فشل في توليد الباركود');
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-2 shadow-sm hover:shadow-md transition-shadow">
        <div className="bg-muted/30 p-3 border-b flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium">إدارة المخزون</h3>
        </div>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="stock_quantity"
              render={({ field }) => (
                <FormItem>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <Package size={18} />
                    </span>
                    <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                      الكمية في المخزون*
                    </span>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0" 
                        step="1" 
                        placeholder="0"
                        className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                        {...field}
                        onChange={(e) => {
                          field.onChange(parseInt(e.target.value));
                        }}
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {hasVariants ? (
              <div className="flex items-center justify-center h-16 bg-muted/20 rounded-md">
                <Badge variant="outline" className="flex items-center gap-1">
                  <Info className="h-3 w-3" />
                  <span>يتم إدارة المخزون بناءً على المتغيرات</span>
                </Badge>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 