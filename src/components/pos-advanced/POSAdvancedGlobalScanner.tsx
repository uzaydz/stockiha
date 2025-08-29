import React, { useCallback } from 'react';
import { toast } from "sonner";
import { Product } from '@/types';
import { useGlobalBarcodeScanner } from '@/hooks/useGlobalBarcodeScanner';
import GlobalScannerIndicator from '@/components/pos-advanced/GlobalScannerIndicator';

interface POSAdvancedGlobalScannerProps {
  products: Product[];
  isReturnMode: boolean;
  isScannerLoading: boolean;
  scanBarcode: (barcode: string) => Promise<{ success: boolean; data?: Product }>;
  addItemToCart: (product: Product) => void;
  addItemToReturnCart: (product: Product) => void;
  handleProductWithVariants: (product: Product) => void;
}

export const POSAdvancedGlobalScanner: React.FC<POSAdvancedGlobalScannerProps> = ({
  products,
  isReturnMode,
  isScannerLoading,
  scanBarcode,
  addItemToCart,
  addItemToReturnCart,
  handleProductWithVariants
}) => {
  // السكانر العالمي - يعمل في أي مكان في الصفحة مع البحث المحلي
  const globalScanner = useGlobalBarcodeScanner({
    onBarcodeScanned: useCallback(async (barcode, product) => {
      let productToAdd = product;
      const toastId = `scan-${barcode}`;

      try {
        // إذا لم يتم العثور على المنتج محلياً، ابحث عنه عبر الـ API
        if (!productToAdd) {
          toast.loading(`🔍 جاري البحث عن الباركود: ${barcode}...`, { id: toastId });
          const response = await scanBarcode(barcode);
          
          if (response.success && response.data) {
            productToAdd = response.data;
          } else {
            toast.error(`❌ لم يتم العثور على المنتج للباركود: ${barcode}`, { id: toastId });
            return; // إنهاء العملية إذا لم يتم العثور على المنتج
          }
        }

        // إذا تم العثور على منتج (محلياً أو عبر API)
        if (productToAdd) {
          const fullProduct = products.find(p => p.id === productToAdd.id);
          
          if (fullProduct) {
            if (isReturnMode) {
              addItemToReturnCart(fullProduct);
              toast.success(`✅ تم إضافة "${fullProduct.name}" إلى سلة الإرجاع`, { id: toastId, duration: 2000 });
            } else {
              if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
                handleProductWithVariants(fullProduct);
                toast.dismiss(toastId); // إغلاق الإشعار لأن نافذة المتغيرات ستظهر
              } else {
                addItemToCart(fullProduct);
                toast.success(`✅ تم إضافة "${fullProduct.name}" إلى السلة`, { id: toastId, duration: 2000 });
              }
            }
          } else {
            toast.error(`لم يتم العثور على المنتج ${productToAdd.id} في البيانات المحدثة`, { id: toastId });
          }
        }
      } catch (error) {
        toast.error(`💥 خطأ أثناء البحث عن الباركود: ${barcode}`, { id: toastId });
      }
    }, [products, isReturnMode, scanBarcode, addItemToCart, addItemToReturnCart, handleProductWithVariants]),
    enableGlobalScanning: true,
    minBarcodeLength: 8,
    maxBarcodeLength: 20,
    scanTimeout: 200,
    allowedKeys: /^[0-9a-zA-Z]$/
  });

  return (
    <GlobalScannerIndicator
      isEnabled={true}
      isProcessing={isScannerLoading || globalScanner.isProcessing}
      currentBuffer={globalScanner.currentBuffer}
    />
  );
};
