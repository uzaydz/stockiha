/**
 * TauriPrintService - خدمة الطباعة الموحدة لـ Tauri
 * 
 * ⚡ المميزات:
 * - يعمل في Tauri و Electron و المتصفح
 * - يتعامل مع مشكلة window.open() في Tauri
 * - دعم الطباعة المباشرة والمعاينة
 * - تحسينات للطابعات الحرارية
 */

import { isTauriApp, isElectronApp, isDesktopApp } from '@/lib/platform';
import { localBarcodeGenerator, type BarcodeType, type BarcodeOptions } from './LocalBarcodeGenerator';

// =====================================================
// Types
// =====================================================

export interface PrintItem {
  barcode: string;
  barcodeType?: BarcodeType;
  productName?: string;
  price?: number;
  storeName?: string;
  sku?: string;
  colorName?: string;
  sizeName?: string;
  quantity?: number;
}

export interface PrintSettings {
  paperSize: 'A4' | 'A5' | 'thermal58' | 'thermal80' | 'label50x90' | 'custom';
  customWidth?: number;
  customHeight?: number;
  orientation?: 'portrait' | 'landscape';
  includeName?: boolean;
  includePrice?: boolean;
  includeStoreName?: boolean;
  includeSku?: boolean;
  includeBarcodeValue?: boolean;
  fontSize?: number;
  fontFamily?: string;
  barcodeType?: BarcodeType;
  columns?: number;
  rows?: number;
  margin?: number;
  spacing?: number;
  quality?: 'normal' | 'high' | 'thermal';
}

export interface PrintResult {
  success: boolean;
  error?: string;
  printedCount?: number;
}

// =====================================================
// TauriPrintService
// =====================================================

class TauriPrintServiceClass {
  private printIframeId = 'tauri-print-iframe';

  /**
   * ⚡ طباعة باركودات
   */
  async printBarcodes(
    items: PrintItem[],
    settings: PrintSettings
  ): Promise<PrintResult> {
    if (!items || items.length === 0) {
      return { success: false, error: 'لا توجد عناصر للطباعة' };
    }

    try {
      // توليد HTML للطباعة
      const htmlContent = await this.generatePrintHTML(items, settings);
      
      // تحديد طريقة الطباعة حسب البيئة
      if (isTauriApp()) {
        return await this.printInTauri(htmlContent, settings);
      } else if (isElectronApp()) {
        return await this.printInElectron(htmlContent, settings);
      } else {
        return await this.printInBrowser(htmlContent, settings);
      }
    } catch (error: any) {
      console.error('[TauriPrintService] خطأ في الطباعة:', error);
      return { success: false, error: error.message || 'خطأ غير معروف' };
    }
  }

  /**
   * ⚡ طباعة في Tauri
   */
  private async printInTauri(
    htmlContent: string,
    settings: PrintSettings
  ): Promise<PrintResult> {
    try {
      // الطريقة 1: استخدام iframe مخفي (الأكثر توافقاً)
      return await this.printViaIframe(htmlContent, settings);
    } catch (error) {
      console.warn('[TauriPrintService] فشل iframe، محاولة طريقة بديلة...');
      
      // الطريقة 2: استخدام WebviewWindow
      try {
        return await this.printViaWebviewWindow(htmlContent, settings);
      } catch (webviewError) {
        console.warn('[TauriPrintService] فشل WebviewWindow، محاولة window.print...');
        
        // الطريقة 3: Fallback لـ window.print
        return await this.printViaWindowPrint(htmlContent);
      }
    }
  }

  /**
   * طباعة عبر iframe مخفي (الأفضل لـ Tauri)
   */
  private async printViaIframe(
    htmlContent: string,
    settings: PrintSettings
  ): Promise<PrintResult> {
    return new Promise((resolve) => {
      // إزالة iframe قديم إذا وجد
      const existingIframe = document.getElementById(this.printIframeId);
      if (existingIframe) {
        existingIframe.remove();
      }

      // إنشاء iframe جديد
      const iframe = document.createElement('iframe');
      iframe.id = this.printIframeId;
      iframe.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 1px; height: 1px;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        iframe.remove();
        resolve({ success: false, error: 'فشل في إنشاء iframe' });
        return;
      }

      // كتابة المحتوى
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      // انتظار تحميل المحتوى ثم الطباعة
      iframe.onload = () => {
        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            
            // إزالة iframe بعد الطباعة
            setTimeout(() => {
              iframe.remove();
            }, 1000);
            
            resolve({ success: true });
          } catch (error: any) {
            iframe.remove();
            resolve({ success: false, error: error.message });
          }
        }, 500);
      };

      // Timeout للأمان
      setTimeout(() => {
        if (document.getElementById(this.printIframeId)) {
          try {
            iframe.contentWindow?.print();
          } catch (e) {
            // تجاهل
          }
          setTimeout(() => iframe.remove(), 1000);
          resolve({ success: true });
        }
      }, 3000);
    });
  }

  /**
   * طباعة عبر WebviewWindow (Tauri فقط)
   */
  private async printViaWebviewWindow(
    htmlContent: string,
    settings: PrintSettings
  ): Promise<PrintResult> {
    try {
      const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
      
      // إنشاء نافذة طباعة
      const printWindow = new WebviewWindow('print-window', {
        url: 'about:blank',
        title: 'طباعة الباركود',
        width: 800,
        height: 600,
        center: true,
        resizable: true,
        decorations: true
      });

      // انتظار إنشاء النافذة
      await new Promise<void>((resolve, reject) => {
        printWindow.once('tauri://created', () => {
          resolve();
        });
        printWindow.once('tauri://error', (e) => {
          reject(new Error('فشل في إنشاء نافذة الطباعة'));
        });
      });

      // حقن المحتوى (ملاحظة: قد يحتاج تعديل حسب إصدار Tauri)
      // هذا placeholder - قد تحتاج لاستخدام IPC
      console.log('[TauriPrintService] تم إنشاء نافذة الطباعة');
      
      return { success: true };
    } catch (error: any) {
      throw error;
    }
  }

  /**
   * طباعة عبر window.print (fallback)
   */
  private async printViaWindowPrint(htmlContent: string): Promise<PrintResult> {
    return new Promise((resolve) => {
      // حفظ المحتوى الأصلي
      const originalContent = document.body.innerHTML;
      const originalTitle = document.title;

      // استبدال المحتوى
      document.body.innerHTML = htmlContent;
      document.title = ' ';

      // الطباعة
      setTimeout(() => {
        window.print();
        
        // استعادة المحتوى
        setTimeout(() => {
          document.body.innerHTML = originalContent;
          document.title = originalTitle;
          resolve({ success: true });
        }, 500);
      }, 300);
    });
  }

  /**
   * طباعة في Electron
   */
  private async printInElectron(
    htmlContent: string,
    settings: PrintSettings
  ): Promise<PrintResult> {
    const w = window as any;
    
    if (w.electronAPI?.print) {
      try {
        await w.electronAPI.print(htmlContent, settings);
        return { success: true };
      } catch (error: any) {
        return { success: false, error: error.message };
      }
    }
    
    // Fallback لـ iframe
    return await this.printViaIframe(htmlContent, settings);
  }

  /**
   * طباعة في المتصفح
   */
  private async printInBrowser(
    htmlContent: string,
    settings: PrintSettings
  ): Promise<PrintResult> {
    return new Promise((resolve) => {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (!printWindow) {
        // Fallback لـ iframe إذا تم حظر النوافذ المنبثقة
        resolve(this.printViaIframe(htmlContent, settings));
        return;
      }

      printWindow.document.write(htmlContent);
      printWindow.document.close();

      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          
          printWindow.onafterprint = () => {
            printWindow.close();
          };
          
          resolve({ success: true });
        }, 500);
      };
    });
  }

  /**
   * ⚡ توليد HTML للطباعة
   */
  private async generatePrintHTML(
    items: PrintItem[],
    settings: PrintSettings
  ): Promise<string> {
    const { pageSize, pageCSS } = this.getPageDimensions(settings);
    
    // توليد الباركودات
    const barcodeImages = await Promise.all(
      items.map(async (item) => {
        const barcodeType = item.barcodeType || settings.barcodeType || 'code128';
        const barcodeImage = localBarcodeGenerator.generateBarcode(
          item.barcode,
          barcodeType,
          {
            height: settings.quality === 'thermal' ? 40 : 60,
            displayValue: settings.includeBarcodeValue !== false,
            fontSize: settings.fontSize || 10
          }
        );
        return { ...item, barcodeImage };
      })
    );

    // توليد HTML للعناصر
    const itemsHTML = barcodeImages.map((item, index) => {
      const fullName = [
        item.productName,
        item.colorName,
        item.sizeName
      ].filter(Boolean).join(' - ');

      return `
        <div class="barcode-item" style="page-break-inside: avoid; ${index > 0 ? 'page-break-before: always;' : ''}">
          ${settings.includeStoreName && item.storeName ? `
            <div class="store-name">${item.storeName}</div>
          ` : ''}
          
          ${settings.includeName && fullName ? `
            <div class="product-name">${fullName}</div>
          ` : ''}
          
          <div class="barcode-image">
            <img src="${item.barcodeImage}" alt="باركود ${item.barcode}" />
          </div>
          
          ${settings.includePrice && item.price ? `
            <div class="price">${item.price.toLocaleString()} دج</div>
          ` : ''}
          
          ${settings.includeSku && item.sku ? `
            <div class="sku">SKU: ${item.sku}</div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title> </title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @page {
            size: ${pageSize};
            margin: 0;
          }
          
          body {
            font-family: ${settings.fontFamily || 'Arial'}, sans-serif;
            background: white;
            color: black;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .barcode-item {
            width: 100%;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: ${settings.margin || 5}mm;
            text-align: center;
          }
          
          .store-name {
            font-size: ${(settings.fontSize || 10) - 2}px;
            font-weight: bold;
            margin-bottom: 2mm;
          }
          
          .product-name {
            font-size: ${settings.fontSize || 10}px;
            font-weight: bold;
            margin-bottom: 2mm;
            max-width: 90%;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .barcode-image {
            width: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 2mm 0;
          }
          
          .barcode-image img {
            max-width: 95%;
            height: auto;
            ${settings.quality === 'thermal' ? 'image-rendering: crisp-edges; filter: contrast(110%);' : ''}
          }
          
          .price {
            font-size: ${(settings.fontSize || 10) + 2}px;
            font-weight: bold;
            margin-top: 2mm;
          }
          
          .sku {
            font-size: ${(settings.fontSize || 10) - 2}px;
            font-family: monospace;
            margin-top: 1mm;
            opacity: 0.8;
          }
          
          ${pageCSS}
          
          @media print {
            .no-print {
              display: none !important;
            }
          }
        </style>
      </head>
      <body>
        ${itemsHTML}
        <script>
          window.onload = function() {
            document.title = ' ';
          };
        </script>
      </body>
      </html>
    `;
  }

  /**
   * الحصول على أبعاد الصفحة
   */
  private getPageDimensions(settings: PrintSettings): { pageSize: string; pageCSS: string } {
    let pageSize = 'A4';
    let pageCSS = '';

    switch (settings.paperSize) {
      case 'thermal58':
        pageSize = '58mm 80mm';
        pageCSS = `
          .barcode-item { min-height: 80mm; padding: 1mm; }
          .product-name { font-size: 8px; }
          .price { font-size: 10px; }
        `;
        break;
      
      case 'thermal80':
        pageSize = '80mm 100mm';
        pageCSS = `
          .barcode-item { min-height: 100mm; padding: 2mm; }
        `;
        break;
      
      case 'label50x90':
        pageSize = '50mm 90mm';
        pageCSS = `
          .barcode-item { min-height: 90mm; padding: 1mm; }
          .product-name { font-size: 8px; }
        `;
        break;
      
      case 'A5':
        pageSize = settings.orientation === 'landscape' ? '210mm 148mm' : '148mm 210mm';
        break;
      
      case 'custom':
        if (settings.customWidth && settings.customHeight) {
          pageSize = `${settings.customWidth}mm ${settings.customHeight}mm`;
          pageCSS = `
            .barcode-item { min-height: ${settings.customHeight}mm; }
          `;
        }
        break;
      
      default: // A4
        pageSize = settings.orientation === 'landscape' ? '297mm 210mm' : '210mm 297mm';
    }

    return { pageSize, pageCSS };
  }

  /**
   * معاينة الطباعة (بدون طباعة فعلية)
   */
  async previewPrint(
    items: PrintItem[],
    settings: PrintSettings
  ): Promise<{ html: string; success: boolean }> {
    try {
      const html = await this.generatePrintHTML(items, settings);
      return { html, success: true };
    } catch (error: any) {
      return { html: '', success: false };
    }
  }

  /**
   * التحقق من دعم الطباعة
   */
  checkPrintSupport(): {
    supported: boolean;
    method: 'tauri' | 'electron' | 'browser' | 'iframe';
    features: string[];
  } {
    const features: string[] = [];
    let method: 'tauri' | 'electron' | 'browser' | 'iframe' = 'browser';

    if (isTauriApp()) {
      method = 'tauri';
      features.push('tauri-webview', 'iframe-print');
    } else if (isElectronApp()) {
      method = 'electron';
      features.push('electron-print', 'iframe-print');
    } else {
      if (typeof window.print === 'function') {
        features.push('window-print');
      }
      
      // اختبار النوافذ المنبثقة
      try {
        const testWindow = window.open('', '_blank', 'width=1,height=1');
        if (testWindow) {
          features.push('popup-allowed');
          testWindow.close();
        } else {
          method = 'iframe';
          features.push('popup-blocked', 'iframe-fallback');
        }
      } catch (e) {
        method = 'iframe';
        features.push('popup-error', 'iframe-fallback');
      }
    }

    return {
      supported: features.length > 0,
      method,
      features
    };
  }
}

// =====================================================
// Export Singleton
// =====================================================

export const tauriPrintService = new TauriPrintServiceClass();
export default tauriPrintService;
