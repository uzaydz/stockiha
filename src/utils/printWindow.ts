/**
 * إدارة نوافذ الطباعة المحسّنة
 */

import { getCleanPrintCSS } from './printStyles';
import { getCleanPrintScript, getInteractivePrintScript } from './printScripts';
import type { ThermalPrinterSettings } from './printTypes';

/**
 * إنشاء نافذة طباعة محسّنة بدون عناوين وتذييلات
 */
export const createCleanPrintWindow = (
  htmlContent: string, 
  title: string = 'طباعة',
  autoTrigger: boolean = true,
  thermalSettings?: ThermalPrinterSettings
): Window | null => {
  // محاولة فتح النافذة مع إعدادات محسّنة
  const windowFeatures = [
    'width=800',
    'height=600',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=yes',
    'resizable=yes',
    'directories=no',
    'titlebar=no'
  ].join(',');

  const printWindow = window.open('', '_blank', windowFeatures);
  
  if (!printWindow) {
    console.error('فشل في فتح نافذة الطباعة');
    return null;
  }

  try {
    // إنشاء محتوى HTML محسّن
    const enhancedHtml = generateEnhancedHTML(htmlContent, title, autoTrigger, thermalSettings);
    
    // كتابة المحتوى
    printWindow.document.write(enhancedHtml);
    printWindow.document.close();
    
    // إضافة معالجات الأحداث
    setupWindowEventHandlers(printWindow);
    
    return printWindow;
    
  } catch (error) {
    console.error('خطأ في إنشاء نافذة الطباعة:', error);
    printWindow.close();
    return null;
  }
};

/**
 * إنشاء محتوى HTML محسّن للطباعة
 */
const generateEnhancedHTML = (
  content: string,
  title: string,
  autoTrigger: boolean,
  thermalSettings?: ThermalPrinterSettings
): string => {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title> </title>
        <meta name="robots" content="noindex, nofollow">
        <meta name="googlebot" content="noindex, nofollow">
        <meta name="print-ready" content="true">
        <style>
          ${getCleanPrintCSS()}
          
          /* تحسينات إضافية لنافذة الطباعة */
          .print-window-container {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            background: white;
          }
          
          .print-controls {
            position: fixed;
            top: 10px;
            right: 10px;
            z-index: 1000;
            background: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid #ddd;
          }
          
          .print-button, .close-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin: 0 2px;
            font-size: 14px;
            font-weight: 500;
            transition: background-color 0.2s;
          }
          
          .close-button {
            background: #6c757d;
          }
          
          .print-button:hover {
            background: #0056b3;
          }
          
          .close-button:hover {
            background: #545b62;
          }
          
          .print-content {
            flex: 1;
            width: 100%;
            margin: 0;
            padding: 0;
          }
          
          /* إخفاء الأزرار عند الطباعة */
          @media print {
            .print-controls {
              display: none !important;
            }
            
            .print-window-container {
              min-height: auto;
            }
          }
          
          /* تحسينات خاصة للطابعات الحرارية */
          ${thermalSettings ? `
          @media print {
            body {
              font-variant-numeric: tabular-nums !important;
              letter-spacing: 0.3px !important;
            }
            
            img {
              image-rendering: crisp-edges !important;
              filter: contrast(${thermalSettings.contrast || 110}%) !important;
            }
          }
          ` : ''}
        </style>
      </head>
      <body>
        <div class="print-window-container">
          <div class="print-controls screen-only">
            <button class="print-button" onclick="window.triggerPrint ? window.triggerPrint() : window.print()" title="طباعة (Ctrl+P)">
              🖨️ طباعة
            </button>
            <button class="close-button" onclick="window.close()" title="إغلاق (Esc)">
              ❌ إغلاق
            </button>
          </div>
          <div class="print-content">
            ${content}
          </div>
        </div>
        ${autoTrigger ? getCleanPrintScript(true, thermalSettings) : getInteractivePrintScript()}
      </body>
    </html>
  `;
};

/**
 * إعداد معالجات أحداث النافذة
 */
const setupWindowEventHandlers = (printWindow: Window): void => {
  try {
    // معالج خطأ التحميل
    printWindow.addEventListener('error', (event) => {
      console.error('خطأ في نافذة الطباعة:', event.error);
    });

    // معالج اكتمال التحميل
    printWindow.addEventListener('load', () => {
      // التأكد من التركيز على النافذة
      setTimeout(() => {
        printWindow.focus();
      }, 100);
    });

    // معالج فقدان التركيز (منع إغلاق النافذة بالخطأ)
    printWindow.addEventListener('blur', () => {
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.focus();
        }
      }, 200);
    });

    // معالج محاولة الإغلاق
    printWindow.addEventListener('beforeunload', (event) => {
      // لا نفعل شيئاً، فقط نسمح بالإغلاق
      return undefined;
    });

  } catch (error) {
    console.warn('تعذر إعداد معالجات أحداث النافذة:', error);
  }
};

/**
 * إنشاء نافذة طباعة مبسطة للاستخدام السريع
 */
export const createSimplePrintWindow = (
  htmlContent: string,
  title: string = 'طباعة سريعة'
): Window | null => {
  const printWindow = window.open('', '_blank', 'width=600,height=400');
  
  if (!printWindow) {
    return null;
  }

  const simpleHTML = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title> </title>
        <style>
          ${getCleanPrintCSS()}
          body { margin: 0; padding: 10px; font-family: Arial, sans-serif; }
        </style>
      </head>
      <body>
        ${htmlContent}
        <script>
          window.onload = function() {
            setTimeout(() => { window.print(); }, 500);
          };
          window.onafterprint = function() {
            setTimeout(() => { window.close(); }, 300);
          };
        </script>
      </body>
    </html>
  `;

  printWindow.document.write(simpleHTML);
  printWindow.document.close();
  
  return printWindow;
};

/**
 * إنشاء نافذة طباعة مع معاينة
 */
export const createPreviewPrintWindow = (
  htmlContent: string,
  title: string = 'معاينة الطباعة'
): Window | null => {
  const printWindow = createCleanPrintWindow(htmlContent, title, false);
  
  if (!printWindow) {
    return null;
  }

  // إضافة أزرار إضافية للمعاينة
  try {
    const previewControls = `
      <div style="
        position: fixed; 
        bottom: 20px; 
        left: 50%; 
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8); 
        color: white; 
        padding: 10px 20px; 
        border-radius: 25px;
        z-index: 1001;
        display: flex;
        gap: 10px;
        align-items: center;
      " class="screen-only">
        <button onclick="window.print()" style="
          background: #28a745; 
          color: white; 
          border: none; 
          padding: 8px 15px; 
          border-radius: 15px; 
          cursor: pointer;
        ">✅ تأكيد الطباعة</button>
        <button onclick="window.close()" style="
          background: #dc3545; 
          color: white; 
          border: none; 
          padding: 8px 15px; 
          border-radius: 15px; 
          cursor: pointer;
        ">❌ إلغاء</button>
      </div>
    `;
    
    printWindow.document.body.insertAdjacentHTML('beforeend', previewControls);
  } catch (error) {
    console.warn('تعذر إضافة أزرار المعاينة:', error);
  }

  return printWindow;
};

/**
 * فحص دعم الطباعة في المتصفح
 */
export const checkPrintSupport = (): {
  supported: boolean;
  popupBlocked: boolean;
  features: string[];
} => {
  const features: string[] = [];
  let popupBlocked = false;
  
  // فحص دعم الطباعة الأساسي
  const basicSupport = typeof window.print === 'function';
  if (basicSupport) features.push('basic-print');
  
  // فحص دعم فتح النوافذ
  try {
    const testWindow = window.open('', '_blank', 'width=1,height=1');
    if (testWindow) {
      features.push('popup-allowed');
      testWindow.close();
    } else {
      popupBlocked = true;
    }
  } catch (error) {
    popupBlocked = true;
  }
  
  // فحص دعم CSS للطباعة
  if (typeof window.matchMedia === 'function') {
    try {
      const printMedia = window.matchMedia('print');
      if (printMedia) features.push('css-print-media');
    } catch (error) {
      // المتصفح لا يدعم matchMedia
    }
  }
  
  return {
    supported: basicSupport,
    popupBlocked,
    features
  };
};

/**
 * عرض رسالة خطأ في حالة فشل الطباعة
 */
export const showPrintError = (error: string): void => {
  const errorMessage = `
    <div style="
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: #f8d7da;
      color: #721c24;
      padding: 20px;
      border: 1px solid #f5c6cb;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      text-align: center;
      font-family: Arial, sans-serif;
    ">
      <h3 style="margin: 0 0 10px 0;">⚠️ خطأ في الطباعة</h3>
      <p style="margin: 0 0 15px 0;">${error}</p>
      <button onclick="this.parentElement.remove()" style="
        background: #721c24;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 4px;
        cursor: pointer;
      ">إغلاق</button>
    </div>
  `;
  
  document.body.insertAdjacentHTML('beforeend', errorMessage);
  
  // إزالة الرسالة تلقائياً بعد 5 ثوانٍ
  setTimeout(() => {
    const errorElement = document.querySelector('[style*="position: fixed"][style*="background: #f8d7da"]');
    if (errorElement) {
      errorElement.remove();
    }
  }, 5000);
}; 