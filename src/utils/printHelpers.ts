/**
 * printHelpers.ts - أدوات مساعدة للطباعة المحسّنة
 * 
 * ⚡ المميزات:
 * - تأخيرات ديناميكية بدلاً من ثابتة
 * - معاينة حقيقية للطباعة
 * - فحص توفر الطابعة
 */

// =====================================================
// 8. التأخيرات الديناميكية
// =====================================================

/**
 * انتظار تحميل الخطوط في نافذة معينة
 */
export const waitForFonts = async (targetWindow: Window, timeout: number = 3000): Promise<boolean> => {
  try {
    const doc = targetWindow.document as Document & { fonts?: FontFaceSet };
    
    if (doc.fonts && typeof doc.fonts.ready !== 'undefined') {
      // استخدام Promise.race للتأكد من عدم الانتظار للأبد
      await Promise.race([
        doc.fonts.ready,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Font timeout')), timeout))
      ]);
      return true;
    }
    
    // إذا لم تكن fonts API متاحة، انتظر قليلاً
    await sleep(100);
    return true;
  } catch (error) {
    console.warn('[printHelpers] تحميل الخطوط تجاوز الوقت المحدد');
    return false;
  }
};

/**
 * انتظار تحميل الصور في نافذة معينة
 */
export const waitForImages = async (targetWindow: Window, timeout: number = 5000): Promise<boolean> => {
  try {
    const images = targetWindow.document.querySelectorAll('img');
    
    if (images.length === 0) return true;
    
    const imagePromises = Array.from(images).map(img => {
      if (img.complete) return Promise.resolve();
      
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve(); // لا نريد أن نفشل بسبب صورة واحدة
      });
    });
    
    await Promise.race([
      Promise.all(imagePromises),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Images timeout')), timeout))
    ]);
    
    return true;
  } catch (error) {
    console.warn('[printHelpers] تحميل الصور تجاوز الوقت المحدد');
    return false;
  }
};

/**
 * انتظار اكتمال DOM
 */
export const waitForDOM = (targetWindow: Window): Promise<void> => {
  return new Promise((resolve) => {
    if (targetWindow.document.readyState === 'complete') {
      resolve();
    } else {
      targetWindow.addEventListener('load', () => resolve(), { once: true });
    }
  });
};

/**
 * انتظار ذكي - ينتظر فقط ما هو ضروري
 */
export const smartWait = async (
  targetWindow: Window,
  options: {
    waitForFonts?: boolean;
    waitForImages?: boolean;
    minDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<void> => {
  const {
    waitForFonts: shouldWaitForFonts = true,
    waitForImages: shouldWaitForImages = true,
    minDelay = 50,
    maxDelay = 3000
  } = options;

  const startTime = Date.now();
  
  // انتظار DOM أولاً
  await waitForDOM(targetWindow);
  
  // انتظار الخطوط والصور بالتوازي
  const promises: Promise<boolean>[] = [];
  
  if (shouldWaitForFonts) {
    promises.push(waitForFonts(targetWindow, maxDelay));
  }
  
  if (shouldWaitForImages) {
    promises.push(waitForImages(targetWindow, maxDelay));
  }
  
  if (promises.length > 0) {
    await Promise.all(promises);
  }
  
  // التأكد من الحد الأدنى للتأخير
  const elapsed = Date.now() - startTime;
  if (elapsed < minDelay) {
    await sleep(minDelay - elapsed);
  }
};

// =====================================================
// 9. المعاينة الحقيقية
// =====================================================

export interface PreviewOptions {
  width?: number;
  height?: number;
  scale?: number;
}

/**
 * إنشاء معاينة للطباعة في عنصر معين
 */
export const createPrintPreview = (
  htmlContent: string,
  containerElement: HTMLElement,
  options: PreviewOptions = {}
): HTMLIFrameElement => {
  const { width = 300, height = 200, scale = 0.5 } = options;
  
  // إزالة أي معاينة سابقة
  const existingPreview = containerElement.querySelector('.print-preview-iframe');
  if (existingPreview) {
    existingPreview.remove();
  }
  
  // إنشاء iframe للمعاينة
  const iframe = document.createElement('iframe');
  iframe.className = 'print-preview-iframe';
  iframe.style.cssText = `
    width: ${width}px;
    height: ${height}px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: white;
    transform: scale(${scale});
    transform-origin: top left;
    pointer-events: none;
  `;
  
  containerElement.appendChild(iframe);
  
  // كتابة المحتوى
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }
  
  return iframe;
};

/**
 * تحديث المعاينة
 */
export const updatePrintPreview = (
  iframe: HTMLIFrameElement,
  htmlContent: string
): void => {
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (iframeDoc) {
    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();
  }
};

// =====================================================
// 10. فحص توفر الطابعة
// =====================================================

export interface PrinterStatus {
  available: boolean;
  canPrint: boolean;
  reason?: string;
}

/**
 * فحص إمكانية الطباعة
 */
export const checkPrintAvailability = (): PrinterStatus => {
  // التحقق من وجود window.print
  if (typeof window.print !== 'function') {
    return {
      available: false,
      canPrint: false,
      reason: 'دالة الطباعة غير متوفرة في هذا المتصفح'
    };
  }
  
  // التحقق من السماح بالنوافذ المنبثقة (تقريبي)
  // لا يمكن التحقق بشكل مباشر، لكن يمكننا التحقق من بعض المؤشرات
  
  // التحقق من وضع الطباعة
  if (window.matchMedia) {
    const printMedia = window.matchMedia('print');
    // هذا لا يعني بالضرورة وجود طابعة، لكنه يعني دعم الطباعة
  }
  
  return {
    available: true,
    canPrint: true
  };
};

/**
 * فحص نافذة الطباعة
 */
export const validatePrintWindow = (printWindow: Window | null): PrinterStatus => {
  if (!printWindow) {
    return {
      available: false,
      canPrint: false,
      reason: 'فشل فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.'
    };
  }
  
  if (printWindow.closed) {
    return {
      available: false,
      canPrint: false,
      reason: 'تم إغلاق نافذة الطباعة'
    };
  }
  
  try {
    // محاولة الوصول للـ document للتأكد من عدم وجود مشاكل أمان
    const doc = printWindow.document;
    if (!doc) {
      return {
        available: false,
        canPrint: false,
        reason: 'لا يمكن الوصول لمحتوى نافذة الطباعة'
      };
    }
  } catch (error) {
    return {
      available: false,
      canPrint: false,
      reason: 'خطأ في الوصول لنافذة الطباعة (قد تكون مشكلة أمان)'
    };
  }
  
  return {
    available: true,
    canPrint: true
  };
};

/**
 * طباعة آمنة مع التحقق
 */
export const safePrint = async (
  printWindow: Window,
  options: {
    onBeforePrint?: () => void;
    onAfterPrint?: () => void;
    onError?: (error: string) => void;
  } = {}
): Promise<boolean> => {
  const { onBeforePrint, onAfterPrint, onError } = options;
  
  // التحقق من صلاحية النافذة
  const status = validatePrintWindow(printWindow);
  if (!status.canPrint) {
    onError?.(status.reason || 'خطأ غير معروف');
    return false;
  }
  
  try {
    // انتظار ذكي
    await smartWait(printWindow, {
      waitForFonts: true,
      waitForImages: true,
      minDelay: 100,
      maxDelay: 3000
    });
    
    onBeforePrint?.();
    
    // الطباعة
    printWindow.focus();
    printWindow.print();
    
    onAfterPrint?.();
    
    return true;
  } catch (error: any) {
    onError?.(error.message || 'خطأ أثناء الطباعة');
    return false;
  }
};

// =====================================================
// أدوات مساعدة
// =====================================================

/**
 * تأخير بسيط
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * تنفيذ مع timeout
 */
export const withTimeout = <T>(
  promise: Promise<T>,
  timeout: number,
  fallback: T
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeout))
  ]);
};
