/**
 * ⚡ Hook لإدارة عمليات مسح الباركود
 * يفصل منطق السكانر عن المكون الرئيسي
 */

import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

interface BarcodeScannerOptions {
  scanBarcode: (barcode: string) => Promise<{ success: boolean; data?: any; message?: string }>;
  getProductById: (id: string) => any;
  isReturnMode: boolean;
  isLossMode: boolean;
  addItemToCart: (product: any) => void;
  addItemToReturnCart: (product: any) => void;
  addItemToLossCart: (product: any) => void;
  handleProductWithVariants: (product: any) => void;
  playAddToCart: () => void;
  playClick: () => void;
  playError: () => void;
}

export const usePOSBarcodeScanner = ({
  scanBarcode,
  getProductById,
  isReturnMode,
  isLossMode,
  addItemToCart,
  addItemToReturnCart,
  addItemToLossCart,
  handleProductWithVariants,
  playAddToCart,
  playClick,
  playError
}: BarcodeScannerOptions) => {
  const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
  const [isCameraBusy, setIsCameraBusy] = useState(false);
  const cameraProcessingRef = useRef(false);

  // ⚡ البحث بالباركود
  const handleBarcodeLookup = useCallback(async (barcode: string, source: 'manual' | 'camera' = 'manual') => {
    const formattedBarcode = (barcode || '').trim();

    if (!formattedBarcode) {
      toast.error('⚠️ الرجاء إدخال باركود صالح');
      return;
    }

    if (source === 'camera') {
      if (cameraProcessingRef.current) {
        return;
      }
      cameraProcessingRef.current = true;
      setIsCameraBusy(true);
    }

    const toastId = `${source}-scan-${formattedBarcode}`;
    toast.loading(source === 'camera' ? `📷 جاري قراءة ${formattedBarcode}` : `🔍 جاري البحث عن ${formattedBarcode}`, {
      id: toastId,
      duration: 4000
    });

    try {
      const response = await scanBarcode(formattedBarcode);

      if (response?.success && response.data) {
        const scannedProduct: any = response.data;
        const cachedProduct = getProductById(scannedProduct.id);
        const fullProduct = cachedProduct || scannedProduct;

        if (!fullProduct) {
          toast.error('❌ لم يتم العثور على بيانات هذا المنتج', { id: toastId, duration: 3000 });
          return;
        }

        // ⚡ وضع الخسائر
        if (isLossMode) {
          if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
            handleProductWithVariants(fullProduct);
            toast.dismiss(toastId);
          } else {
            addItemToLossCart(fullProduct);
            playClick();
            toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى سلة الخسائر`, { id: toastId, duration: 2000 });
          }
        } else if (isReturnMode) {
          addItemToReturnCart(fullProduct);
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى سلة الإرجاع`, { id: toastId, duration: 2000 });
        } else if (fullProduct.has_variants && fullProduct.colors && fullProduct.colors.length > 0) {
          handleProductWithVariants(fullProduct);
          toast.dismiss(toastId);
        } else {
          addItemToCart(fullProduct);
          playAddToCart();
          toast.success(`✅ تم إضافة "${fullProduct.name || 'منتج'}" إلى السلة`, { id: toastId, duration: 2000 });
        }

        if (source === 'camera') {
          setIsCameraScannerOpen(false);
        }
      } else {
        const message = response?.message || 'لم يتم العثور على المنتج لهذا الباركود';
        toast.error(`❌ ${message}`, { id: toastId, duration: 3000 });
        playError();
      }
    } catch (error) {
      toast.error(`💥 تعذر معالجة الباركود: ${formattedBarcode}`, { id: toastId, duration: 3000 });
      playError();
    } finally {
      if (source === 'camera') {
        cameraProcessingRef.current = false;
        setIsCameraBusy(false);
      }
    }
  }, [
    scanBarcode, getProductById, isReturnMode, isLossMode,
    addItemToReturnCart, addItemToLossCart, handleProductWithVariants,
    addItemToCart, playClick, playAddToCart, playError
  ]);

  return {
    isCameraScannerOpen,
    setIsCameraScannerOpen,
    isCameraBusy,
    handleBarcodeLookup
  };
};

export default usePOSBarcodeScanner;
