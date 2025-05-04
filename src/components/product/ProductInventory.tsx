import { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
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
          console.log('تم توليد SKU من الخادم:', sku);
        } catch (error) {
          console.error('خطأ في توليد SKU من الخادم:', error);
          // عند فشل الطلب من الخادم، نجرب الطريقة المحلية
          sku = await generateLocalSku();
          console.log('تم توليد SKU محلياً:', sku);
        }
      } else {
        // إذا كان المستخدم غير متصل بالإنترنت، نستخدم التوليد المحلي مباشرة
        sku = await generateLocalSku();
        console.log('تم توليد SKU محلياً (بسبب عدم الاتصال):', sku);
      }
      
      if (sku) {
        form.setValue('sku', sku);
        toast.success('تم توليد رمز SKU بنجاح');
      } else {
        toast.error('فشل في توليد رمز SKU');
      }
    } catch (error) {
      console.error('خطأ عام في توليد SKU:', error);
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
          console.log('تم توليد الباركود من الخادم:', barcode);
        } catch (error) {
          console.error('خطأ في توليد الباركود من الخادم:', error);
          // عند فشل الطلب من الخادم، نجرب الطريقة المحلية
          barcode = generateLocalEAN13();
          console.log('تم توليد الباركود محلياً:', barcode);
        }
      } else {
        // إذا كان المستخدم غير متصل بالإنترنت، نستخدم التوليد المحلي مباشرة
        barcode = generateLocalEAN13();
        console.log('تم توليد الباركود محلياً (بسبب عدم الاتصال):', barcode);
      }
      
      if (barcode) {
        form.setValue('barcode', barcode);
        toast.success('تم توليد الباركود بنجاح');
      } else {
        toast.error('فشل في توليد الباركود');
      }
    } catch (error) {
      console.error('خطأ عام في توليد الباركود:', error);
      toast.error('حدث خطأ أثناء توليد الباركود');
    } finally {
      setGeneratingBarcode(false);
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="stock_quantity"
        render={({ field }) => (
          <FormItem>
            <FormLabel>الكمية في المخزون*</FormLabel>
            <FormControl>
              <Input 
                type="number" 
                min="0" 
                step="1" 
                placeholder="0"
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رمز المنتج (SKU)*</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="رمز المنتج" {...field} />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGenerateSku}
                    disabled={generatingSku}
                  >
                    {generatingSku ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'توليد'
                    )}
                  </Button>
                </div>
                <FormDescription>
                  رمز تعريفي فريد للمنتج في نظامك
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="barcode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الباركود</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input placeholder="رمز الباركود (اختياري)" {...field} />
                  </FormControl>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGenerateBarcode}
                    disabled={generatingBarcode}
                  >
                    {generatingBarcode ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'توليد'
                    )}
                  </Button>
                </div>
                <FormDescription>
                  رمز EAN-13 لاستخدامه مع قارئات الباركود
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
} 