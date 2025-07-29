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
      console.log('🎯 [GlobalBarcodeScanner] تم اكتشاف باركود:', buffer);
      
      if (onBarcodeScannedRef.current && !isProcessingRef.current) {
        isProcessingRef.current = true;
        
        // البحث في البيانات المحملة محلياً
        const foundProduct = searchByBarcode(buffer);
        
        if (foundProduct) {
          console.log('✅ [GlobalBarcodeScanner] تم العثور على المنتج:', foundProduct);
          toast.success(`✅ تم العثور على: ${foundProduct.name}`, {
            duration: 2000,
            position: "top-center"
          });
          
          try {
            onBarcodeScannedRef.current(buffer, foundProduct);
          } catch (error) {
            console.error('❌ [GlobalBarcodeScanner] خطأ في معالجة الباركود:', error);
          }
        } else {
          console.warn('⚠️ [GlobalBarcodeScanner] لم يتم العثور على منتج للباركود:', buffer);
          toast.warning(`⚠️ لم يتم العثور على منتج للباركود: ${buffer}`, {
            duration: 3000,
            position: "top-center"
          });
          
          // إرسال الباركود حتى لو لم يتم العثور على منتج (للمعالجة اليدوية)
          try {
            onBarcodeScannedRef.current(buffer, null);
          } catch (error) {
            console.error('❌ [GlobalBarcodeScanner] خطأ في معالجة الباركود:', error);
          }
        }
        
        // إعادة تعيين المعالجة بعد فترة قصيرة
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 500);
      }
    } else if (buffer.length > maxBarcodeLength) {
      console.warn('⚠️ [GlobalBarcodeScanner] باركود طويل جداً، يتم تجاهله:', buffer);
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    barcodeBufferRef.current = '';
  }, [minBarcodeLength, maxBarcodeLength, searchByBarcode]);

  // معالجة أحداث لوحة المفاتيح
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    console.log('⌨️ [GlobalBarcodeScanner] مفتاح تم الضغط عليه:', event.key, 'Type:', event.type);
    
    if (!enableGlobalScanning) {
      console.log('🚫 [GlobalBarcodeScanner] السكانر معطل');
      return;
    }
    
    if (isProcessingRef.current) {
      console.log('⏳ [GlobalBarcodeScanner] معالجة جارية، تجاهل المفتاح');
      return;
    }

    const currentTime = Date.now();
    const timeDifference = currentTime - lastKeypressTimeRef.current;
    
    // تجاهل الأحداث إذا كان المستخدم يكتب في حقل input
    const target = event.target as HTMLElement;
    console.log('🎯 [GlobalBarcodeScanner] الهدف:', target.tagName, (target as any).type, target.contentEditable);
    
    if (target && (
      target.tagName === 'INPUT' || 
      target.tagName === 'TEXTAREA' || 
      target.contentEditable === 'true' ||
      target.getAttribute('role') === 'textbox'
    )) {
      console.log('📝 [GlobalBarcodeScanner] تجاهل - المستخدم يكتب في حقل نص');
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
      console.log('🚫 [GlobalBarcodeScanner] إلغاء مسح الباركود');
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
      console.log('🔄 [GlobalBarcodeScanner] فترة انتظار طويلة، بدء جديد');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      barcodeBufferRef.current = '';
    }

    // إضافة الرمز للـ buffer
    barcodeBufferRef.current += event.key;
    lastKeypressTimeRef.current = currentTime;

    console.log(`🔤 [GlobalBarcodeScanner] رمز جديد: ${event.key}, Buffer: ${barcodeBufferRef.current}`);

    // تنظيف timeout السابق
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // تعيين timeout جديد للمعالجة التلقائية (timeout تكيفي حسب سرعة الكتابة)
    const adaptiveTimeout = timeDifference < 30 ? 100 : scanTimeout; // إذا كانت السرعة عالية، timeout أقل
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ [GlobalBarcodeScanner] انتهت مهلة الانتظار، معالجة الباركود');
      processBarcodeIfComplete();
    }, adaptiveTimeout);

    // معالجة فورية إذا وصل للحد الأقصى أو كان الباركود طويل بما فيه الكفاية
    if (barcodeBufferRef.current.length >= maxBarcodeLength) {
      console.log('⚡ [GlobalBarcodeScanner] وصل للحد الأقصى، معالجة فورية');
      processBarcodeIfComplete();
    } else if (barcodeBufferRef.current.length >= 13 && timeDifference < 50) {
      // إذا كان الباركود 13 رقم أو أكثر والفترة بين الأرقام قصيرة جداً (ماسح ضوئي سريع)
      console.log('🚀 [GlobalBarcodeScanner] باركود طويل مع سرعة عالية، معالجة فورية');
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      processBarcodeIfComplete();
    }
  }, [enableGlobalScanning, allowedKeys, processBarcodeIfComplete, scanTimeout, maxBarcodeLength]);

  // تسجيل وإلغاء تسجيل event listeners
  useEffect(() => {
    if (!enableGlobalScanning) return;

    console.log('🚀 [GlobalBarcodeScanner] تفعيل السكانر العالمي');
    
    // إضافة event listener
    document.addEventListener('keydown', handleKeyPress, true);
    
    // تنظيف عند إلغاء المكون
    return () => {
      console.log('🛑 [GlobalBarcodeScanner] إيقاف السكانر العالمي');
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
      console.log('🧪 [GlobalBarcodeScanner] محاكاة مسح:', barcode);
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