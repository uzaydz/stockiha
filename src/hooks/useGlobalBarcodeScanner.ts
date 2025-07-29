import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { useAllProductsForScanner } from './useAllProductsForScanner';

interface GlobalBarcodeScannerOptions {
  onBarcodeScanned?: (barcode: string, product?: any) => void;
  enableGlobalScanning?: boolean;
  minBarcodeLength?: number;
  maxBarcodeLength?: number;
  scanTimeout?: number; // مدة انتظار قبل تنفيذ البحث (بالملي ثانية)
  allowedKeys?: RegExp; // الرموز المسموحة في الباركود
}

export const useGlobalBarcodeScanner = ({
  onBarcodeScanned,
  enableGlobalScanning = true,
  minBarcodeLength = 8,
  maxBarcodeLength = 20,
  scanTimeout = 200,
  allowedKeys = /^[0-9a-zA-Z]$/
}: GlobalBarcodeScannerOptions = {}) => {
  const barcodeBufferRef = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeypressTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  
  // استخدام البيانات المحملة محلياً
  const { searchByBarcode, isReady, stats } = useAllProductsForScanner();

  // تحديث المرجع عند تغيير الدالة
  useEffect(() => {
    onBarcodeScannedRef.current = onBarcodeScanned;
  }, [onBarcodeScanned]);

  // معالجة الباركود المكتمل
  const processBarcodeIfComplete = useCallback(() => {
    const buffer = barcodeBufferRef.current;
    
    if (buffer.length >= minBarcodeLength && buffer.length <= maxBarcodeLength) {
      
      if (onBarcodeScannedRef.current && !isProcessingRef.current) {
        isProcessingRef.current = true;
        
        // البحث في البيانات المحملة محلياً
        const foundProduct = searchByBarcode(buffer);
        
        if (foundProduct) {
          toast.success(`✅ تم العثور على: ${foundProduct.name}`, {
            duration: 2000,
            position: "top-center"
          });
          
          try {
            onBarcodeScannedRef.current(buffer, foundProduct);
          } catch (error) {
          }
        } else {
          toast.warning(`⚠️ لم يتم العثور على منتج للباركود: ${buffer}`, {
            duration: 3000,
            position: "top-center"
          });
          
          // إرسال الباركود حتى لو لم يتم العثور على منتج (للمعالجة اليدوية)
          try {
            onBarcodeScannedRef.current(buffer, null);
          } catch (error) {
          }
        }
        
        // إعادة تعيين المعالجة بعد فترة قصيرة
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 500);
      }
    } else if (buffer.length > maxBarcodeLength) {
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    barcodeBufferRef.current = '';
  }, [minBarcodeLength, maxBarcodeLength, searchByBarcode]);

  // معالجة أحداث لوحة المفاتيح
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    
    if (!enableGlobalScanning) {
      return;
    }
    
    if (isProcessingRef.current) {
      return;
    }

    const currentTime = Date.now();
    const timeDifference = currentTime - lastKeypressTimeRef.current;
    
    // تجاهل الأحداث إذا كان المستخدم يكتب في حقل input
    const target = event.target as HTMLElement;
    
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.contentEditable === 'true' ||
      target.getAttribute('role') === 'textbox'
    )) {
      return;
    }

    // منع الاختصارات والمفاتيح الخاصة
    if (event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    // مفاتيح خاصة للتحكم
    if (event.key === 'Enter') {
      event.preventDefault();
      processBarcodeIfComplete();
      return;
    }

    if (event.key === 'Escape') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      barcodeBufferRef.current = '';
      return;
    }

    // التحقق من صحة الرمز
    if (!allowedKeys.test(event.key)) {
      return;
    }

    // إذا كان هناك فترة طويلة بين الضغطات، نبدأ من جديد
    if (timeDifference > 100 && barcodeBufferRef.current.length > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      barcodeBufferRef.current = '';
    }

    // إضافة الرمز للـ buffer
    barcodeBufferRef.current += event.key;
    lastKeypressTimeRef.current = currentTime;

    // تنظيف timeout السابق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // تعيين timeout جديد للمعالجة التلقائية (timeout تكيفي حسب سرعة الكتابة)
    const adaptiveTimeout = timeDifference < 30 ? 100 : scanTimeout; // إذا كانت السرعة عالية، timeout أقل
    timeoutRef.current = setTimeout(() => {
      processBarcodeIfComplete();
    }, adaptiveTimeout);

    // معالجة فورية إذا وصل للحد الأقصى أو كان الباركود طويل بما فيه الكفاية
    if (barcodeBufferRef.current.length >= maxBarcodeLength) {
      processBarcodeIfComplete();
    } else if (barcodeBufferRef.current.length >= 13 && timeDifference < 50) {
      // إذا كان الباركود 13 رقم أو أكثر والفترة بين الأرقام قصيرة جداً (ماسح ضوئي سريع)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      processBarcodeIfComplete();
    }
  }, [enableGlobalScanning, allowedKeys, processBarcodeIfComplete, scanTimeout, maxBarcodeLength]);

  // تسجيل وإلغاء تسجيل event listeners
  useEffect(() => {
    if (!enableGlobalScanning) return;

    // إضافة event listener
    document.addEventListener('keydown', handleKeyPress, true);
    
    // تنظيف عند إلغاء المكون
    return () => {
      document.removeEventListener('keydown', handleKeyPress, true);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      barcodeBufferRef.current = '';
    };
  }, [enableGlobalScanning]); // إزالة handleKeyPress و clearBuffer من dependencies

  // تنظيف عند تغيير الخيارات
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // دالة محاكاة المسح
  const simulateScan = useCallback((barcode: string) => {
    if (onBarcodeScannedRef.current) {
      onBarcodeScannedRef.current(barcode);
    }
  }, []);

  // دالة تنظيف محسنة
  const clearBufferStable = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    barcodeBufferRef.current = '';
  }, []);

  return {
    currentBuffer: barcodeBufferRef.current,
    clearBuffer: clearBufferStable,
    isProcessing: isProcessingRef.current,
    simulateScan
  };
};
