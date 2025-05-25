/**
 * سكريبتات JavaScript المحسّنة للطباعة النظيفة
 */

import type { ThermalPrinterSettings } from './printTypes';

/**
 * JavaScript لإعداد الطباعة وإزالة العناوين/التذييلات مع تحسينات إضافية
 */
export const getCleanPrintScript = (autoTrigger: boolean = true, thermalSettings?: ThermalPrinterSettings): string => {
  const thermalMode = !!thermalSettings;
  const contrast = thermalSettings?.contrast || 110;
  
  return `
    <script>
      // إعدادات الطباعة المحسّنة
      const PRINT_CONFIG = {
        autoTrigger: ${autoTrigger},
        imageLoadTimeout: 3000,
        printDelay: 800,
        retryAttempts: 3,
        thermalMode: ${thermalMode}
      };
      
      let printAttempts = 0;
      let imagesLoaded = false;
      
      // تعطيل عناوين وتذييلات المتصفح بطرق متعددة
      function setupPrintEnvironment() {
        // إضافة CSS قوي لإزالة العناوين والتذييلات
        const style = document.createElement('style');
        style.innerHTML = \`
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            
            /* إخفاء أي عناصر إضافية قد يضيفها المتصفح */
            .print-header, .print-footer, 
            header, footer,
            nav, .nav, .navigation,
            .browser-print-header, .browser-print-footer {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              overflow: hidden !important;
            }
            
            /* تحسينات للطابعات الحرارية */
            \${PRINT_CONFIG.thermalMode ? \`
            * {
              font-variant-numeric: tabular-nums !important;
              letter-spacing: 0.3px !important;
              text-rendering: optimizeSpeed !important;
            }
            img {
              image-rendering: -webkit-optimize-contrast !important;
              image-rendering: crisp-edges !important;
              filter: contrast(${contrast}%) !important;
            }
            \` : ''}
          }
        \`;
        document.head.appendChild(style);
        
        // محاولة تعديل title لتقليل النص المعروض
        document.title = '';
        
        // إزالة أي meta tags قد تؤثر على الطباعة
        const metaTags = document.querySelectorAll('meta');
        metaTags.forEach(meta => {
          if (meta.name === 'description' || meta.name === 'keywords') {
            meta.remove();
          }
        });
      }
      
      // تحسين جودة الصور قبل الطباعة
      function optimizeImages() {
        const images = document.querySelectorAll('img');
        images.forEach(img => {
          if (PRINT_CONFIG.thermalMode) {
            // تحسينات خاصة للطابعات الحرارية
            img.style.imageRendering = 'crisp-edges';
            img.style.filter = \`contrast(${contrast}%)\`;
          } else {
            // تحسينات للطابعات العادية
            img.style.imageRendering = 'auto';
          }
        });
      }
      
      // وظيفة الطباعة المحسّنة مع معالجة الأخطاء
      function performPrint() {
        try {
          setupPrintEnvironment();
          optimizeImages();
          
          // تعديل العنوان إلى فراغ لتقليل النص المعروض
          const originalTitle = document.title;
          document.title = ' ';
          
          // التأكد من التركيز على النافذة
          window.focus();
          
          // تطبيق الطباعة
          setTimeout(() => {
            window.print();
            
            // استعادة العنوان الأصلي بعد الطباعة
            setTimeout(() => {
              document.title = originalTitle;
            }, 100);
          }, PRINT_CONFIG.printDelay);
          
        } catch (error) {
          console.error('خطأ في الطباعة:', error);
          
          // محاولة إعادة المحاولة
          if (printAttempts < PRINT_CONFIG.retryAttempts) {
            printAttempts++;
            setTimeout(performPrint, 1000);
          } else {
            alert('حدث خطأ في الطباعة. يرجى المحاولة مرة أخرى.');
          }
        }
      }
      
      // تحميل الصور بشكل محسّن
      function loadImages() {
        return new Promise((resolve) => {
          const images = document.querySelectorAll('img');
          let loadedCount = 0;
          const totalImages = images.length;
          
          if (totalImages === 0) {
            resolve(true);
            return;
          }
          
          const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= totalImages) {
              imagesLoaded = true;
              resolve(true);
            }
          };
          
          // إعداد timeout للتأكد من عدم التعليق
          const timeout = setTimeout(() => {
            console.warn('انتهت مهلة تحميل الصور، سيتم المتابعة');
            imagesLoaded = true;
            resolve(true);
          }, PRINT_CONFIG.imageLoadTimeout);
          
          images.forEach(img => {
            if (img.complete && img.naturalHeight !== 0) {
              checkComplete();
            } else {
              img.onload = () => {
                clearTimeout(timeout);
                checkComplete();
              };
              img.onerror = () => {
                console.warn('فشل تحميل صورة:', img.src);
                clearTimeout(timeout);
                checkComplete();
              };
            }
          });
        });
      }
      
      // معالج أحداث ما قبل الطباعة
      window.onbeforeprint = function() {
        setupPrintEnvironment();
        optimizeImages();
      };
      
      // معالج أحداث ما بعد الطباعة
      window.onafterprint = function() {
        setTimeout(() => {
          window.close();
        }, 500);
      };
      
      // معالج تحميل النافذة
      window.onload = async function() {
        try {
          // تطبيق إعدادات إضافية قبل الطباعة
          document.body.style.margin = '0';
          document.body.style.padding = '0';
          document.documentElement.style.margin = '0';
          document.documentElement.style.padding = '0';
          
          // انتظار تحميل جميع الصور
          await loadImages();
          
          if (PRINT_CONFIG.autoTrigger) {
            performPrint();
          }
          
        } catch (error) {
          console.error('خطأ في إعداد الطباعة:', error);
          if (PRINT_CONFIG.autoTrigger) {
            // محاولة الطباعة حتى لو حدث خطأ
            setTimeout(performPrint, 1000);
          }
        }
      };
      
      // منع عرض شريط العنوان أو التذييل إذا أمكن
      window.addEventListener('beforeprint', function() {
        // إعداد الصفحة للطباعة بدون هوامش
        const printStyle = document.createElement('style');
        printStyle.media = 'print';
        printStyle.innerHTML = \`
          @page {
            margin: 0 !important;
          }
          body {
            margin: 0 !important;
            padding: 0 !important;
          }
        \`;
        document.head.appendChild(printStyle);
      });
      
      // وظائف مساعدة متاحة عالمياً
      window.triggerPrint = performPrint;
      window.optimizeForThermal = optimizeImages;
      
      // معالجة أخطاء JavaScript
      window.onerror = function(msg, url, lineNo, columnNo, error) {
        console.error('خطأ JavaScript:', {
          message: msg,
          source: url,
          line: lineNo,
          column: columnNo,
          error: error
        });
        return false;
      };
      
    </script>
  `;
};

/**
 * سكريبت مبسط للطباعة السريعة
 */
export const getSimplePrintScript = (): string => {
  return `
    <script>
      window.onload = function() {
        document.title = ' ';
        setTimeout(() => {
          window.focus();
          window.print();
        }, 500);
      };
      
      window.onafterprint = function() {
        setTimeout(() => window.close(), 300);
      };
    </script>
  `;
};

/**
 * سكريبت محسّن للطباعة التفاعلية
 */
export const getInteractivePrintScript = (): string => {
  return `
    <script>
      let printInProgress = false;
      
      function safePrint() {
        if (printInProgress) return;
        printInProgress = true;
        
        try {
          document.title = ' ';
          window.focus();
          window.print();
        } catch (error) {
          console.error('خطأ في الطباعة:', error);
          alert('حدث خطأ في الطباعة');
        } finally {
          setTimeout(() => {
            printInProgress = false;
          }, 1000);
        }
      }
      
      function closeWindow() {
        try {
          window.close();
        } catch (error) {
          console.warn('لا يمكن إغلاق النافذة تلقائياً');
        }
      }
      
      // إضافة أحداث للأزرار
      document.addEventListener('DOMContentLoaded', function() {
        const printButton = document.querySelector('[onclick*="print"]');
        const closeButton = document.querySelector('[onclick*="close"]');
        
        if (printButton) {
          printButton.onclick = safePrint;
        }
        
        if (closeButton) {
          closeButton.onclick = closeWindow;
        }
        
        // اختصارات لوحة المفاتيح
        document.addEventListener('keydown', function(e) {
          if (e.ctrlKey && e.key === 'p') {
            e.preventDefault();
            safePrint();
          }
          if (e.key === 'Escape') {
            closeWindow();
          }
        });
      });
      
      window.onafterprint = function() {
        setTimeout(closeWindow, 500);
      };
    </script>
  `;
}; 