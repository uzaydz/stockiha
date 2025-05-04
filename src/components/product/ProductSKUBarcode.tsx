import React, { useState } from 'react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { generateAutomaticSku, generateAutomaticBarcode } from '@/lib/api/products';

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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-3">
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
                  {generatingSku && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                  توليد
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="space-y-3">
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>الباركود</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input placeholder="الرمز الشريطي" {...field} />
                </FormControl>
                <Button 
                  type="button"
                  variant="outline"
                  onClick={handleGenerateBarcode}
                  disabled={generatingBarcode}
                >
                  {generatingBarcode && <Loader2 className="ml-1 h-4 w-4 animate-spin" />}
                  توليد
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