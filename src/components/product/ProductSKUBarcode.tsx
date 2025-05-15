import React, { useState } from 'react';
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Hash, Barcode, ScanLine, Wand2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { generateAutomaticSku, generateAutomaticBarcode } from '@/lib/api/products';
import { Badge } from "@/components/ui/badge";

interface ProductSKUBarcodeProps {
  form: UseFormReturn<ProductFormValues>;
  productId: string;
  organizationId: string;
}

const ProductSKUBarcode: React.FC<ProductSKUBarcodeProps> = ({
  form,
  productId,
  organizationId
}) => {
  const [generatingSku, setGeneratingSku] = useState(false);
  const [generatingBarcode, setGeneratingBarcode] = useState(false);

  const handleGenerateSku = async () => {
    setGeneratingSku(true);
    try {
      if (!navigator.onLine) {
        // وظيفة لتوليد رقم تسلسلي محلي للمنتج
        const localSku = `SKU-${Date.now().toString().slice(-8)}`;
        form.setValue('sku', localSku);
      } else {
        // استدعاء API لتوليد SKU تلقائياً
        const newSku = await generateAutomaticSku(organizationId);
        form.setValue('sku', newSku);
      }
    } catch (error) {
      console.error('خطأ في توليد رمز المنتج:', error);
    } finally {
      setGeneratingSku(false);
    }
  };

  const handleGenerateBarcode = async () => {
    setGeneratingBarcode(true);
    try {
      if (!navigator.onLine) {
        // وظيفة لتوليد باركود محلي للمنتج
        const localBarcode = `BC${Date.now().toString().slice(-12)}`;
        form.setValue('barcode', localBarcode);
      } else {
        // استدعاء API لتوليد باركود تلقائياً
        const newBarcode = await generateAutomaticBarcode();
        form.setValue('barcode', newBarcode);
      }
    } catch (error) {
      console.error('خطأ في توليد الباركود:', error);
    } finally {
      setGeneratingBarcode(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div>
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Hash size={18} />
                </span>
                <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                  رمز المنتج (SKU)*
                </span>
                <FormControl>
                  <Input 
                    placeholder="رمز المنتج" 
                    className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                    {...field} 
                  />
                </FormControl>
              </div>
              <div className="flex justify-end mt-2">
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSku}
                  disabled={generatingSku}
                  className="flex items-center gap-1 text-xs"
                >
                  {generatingSku ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  توليد تلقائي
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div>
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Barcode size={18} />
                </span>
                <span className="absolute right-3 top-[13px] text-xs text-muted-foreground">
                  الباركود (اختياري)
                </span>
                <FormControl>
                  <Input 
                    placeholder="الرمز الشريطي" 
                    className="pt-6 pl-10 bg-background border-2 h-16 focus:border-primary transition-colors"
                    {...field} 
                  />
                </FormControl>
              </div>
              <div className="flex justify-end mt-2">
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBarcode}
                  disabled={generatingBarcode}
                  className="flex items-center gap-1 text-xs"
                >
                  {generatingBarcode ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  توليد EAN-13
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ProductSKUBarcode; 