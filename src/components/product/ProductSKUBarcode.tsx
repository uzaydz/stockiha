import React, { useState } from 'react';
import { FormControl, FormField, FormItem, FormMessage, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Hash, Barcode, ScanLine, Wand2, HelpCircle } from "lucide-react";
import { UseFormReturn } from "react-hook-form";
import { ProductFormValues } from "@/types/product";
import { generateAutomaticSku, generateAutomaticBarcode } from '@/lib/api/products';
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
    } finally {
      setGeneratingBarcode(false);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* SKU Field */}
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="sku"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                رمز المنتج (SKU)
                <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      onClick={(e) => e.preventDefault()}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                    side="top"
                    sideOffset={5}
                  >
                    <p className="text-xs">رمز فريد لتعريف المنتج في النظام. يساعد في تتبع المخزون والمبيعات.</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 transition-all duration-300">
                  <Hash size={18} />
                </div>
                <FormControl>
                  <Input 
                    placeholder="مثال: PROD-001" 
                    className="pl-10 h-10 text-sm bg-background border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                    {...field} 
                  />
                </FormControl>
                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <div className="flex justify-between items-center mt-2">
                <FormMessage className="text-xs" />
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateSku}
                  disabled={generatingSku}
                  className="flex items-center gap-2 text-xs bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border-blue-200/50 dark:border-blue-800/30 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {generatingSku ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  توليد تلقائي
                </Button>
              </div>
            </FormItem>
          )}
        />
      </div>

      {/* Barcode Field */}
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem className="space-y-2">
              <FormLabel className="text-sm font-medium text-foreground flex items-center gap-2">
                الباركود
                <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center"
                      onClick={(e) => e.preventDefault()}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-muted-foreground hover:text-blue-600 transition-colors cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent 
                    className="max-w-xs z-50 bg-popover border border-border shadow-lg"
                    side="top"
                    sideOffset={5}
                  >
                    <p className="text-xs">رمز الباركود للمنتج. يساعد في عمليات البيع السريعة والمسح الضوئي.</p>
                  </TooltipContent>
                </Tooltip>
              </FormLabel>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-blue-600 transition-all duration-300">
                  <Barcode size={18} />
                </div>
                <FormControl>
                  <Input 
                    placeholder="مثال: 1234567890123" 
                    className="pl-10 h-10 text-sm bg-background border-border/60 hover:border-blue-500/60 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20 transition-all duration-300 shadow-sm hover:shadow-md focus:shadow-lg"
                    {...field} 
                  />
                </FormControl>
                <div className="absolute inset-0 rounded-md bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 pointer-events-none" />
              </div>
              <div className="flex justify-between items-center mt-2">
                <FormMessage className="text-xs" />
                <Button 
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateBarcode}
                  disabled={generatingBarcode}
                  className="flex items-center gap-2 text-xs bg-blue-50/50 hover:bg-blue-100/50 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border-blue-200/50 dark:border-blue-800/30 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200 transition-all duration-300 shadow-sm hover:shadow-md"
                >
                  {generatingBarcode ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Wand2 className="h-3 w-3" />
                  )}
                  توليد EAN-13
                </Button>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

export default ProductSKUBarcode;
