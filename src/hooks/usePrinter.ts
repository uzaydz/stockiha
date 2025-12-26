/**
 * 🖨️ usePrinter - Hook موحد للطباعة في Electron
 * ================================================
 *
 * يوفر واجهة موحدة للطباعة تعمل مع:
 * - Electron (طباعة صامتة مباشرة)
 * - المتصفح (fallback)
 *
 * الميزات:
 * - قائمة الطابعات المتاحة
 * - طباعة الإيصالات (POS)
 * - طباعة الباركود
 * - طباعة HTML (فواتير/تقارير)
 * - فتح درج النقود
 * - صوت بعد الطباعة
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePrinterSettings } from './usePrinterSettings';
import { isElectronApp } from '@/lib/platform';
import { toast } from 'sonner';

// ============================================================================
// Types
// ============================================================================

export interface Printer {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface PrintResult {
  success: boolean;
  error?: string;
}

export interface ReceiptItem {
  type: 'text' | 'barCode' | 'qrCode' | 'image' | 'table';
  value: string;
  style?: Record<string, string>;
  height?: number;
  width?: number;
  displayValue?: boolean;
  position?: 'above' | 'below';
  [key: string]: any;
}

export interface BarcodeItem {
  value: string;
  productName?: string;
  price?: number | string;
  storeName?: string;
  height?: number;
  width?: number;
  showValue?: boolean;
}

export interface PrintReceiptOptions {
  copies?: number;
  silent?: boolean;
  printerName?: string;
  pageSize?: string;
  margin?: string;
}

export interface PrintHtmlOptions {
  silent?: boolean;
  printerName?: string;
  pageSize?: string;
  landscape?: boolean;
}

export interface PrintBarcodeOptions {
  silent?: boolean;
  printerName?: string;
  labelSize?: { width: string; height: string };
  showProductName?: boolean;
  showPrice?: boolean;
  showStoreName?: boolean;
  showBarcodeValue?: boolean;
  showSku?: boolean;
  // ⚡ إعدادات القالب والتنسيق
  templateId?: string;
  fontFamily?: string;
  barcodeType?: string;
  // ⚡ تسريع طباعة الباركود (electron-pos-printer)
  timeOutPerLine?: number;
  // ⚡ HTML مخصص للقوالب المعقدة (QR codes, etc)
  customHtml?: string;
}

// ============================================================================
// Hook
// ============================================================================

export function usePrinter() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  const {
    settings,
    updatePrinterSetting: updateSetting,
    savePrinterSettings: saveSettings
  } = usePrinterSettings();

  // التحقق من توفر Electron
  const isElectron = useMemo(() => isElectronApp(), []);

  // ========================================================================
  // جلب قائمة الطابعات
  // ========================================================================
  const fetchPrinters = useCallback(async (): Promise<Printer[]> => {
    if (!isElectron) {
      console.warn('[usePrinter] Not in Electron, skipping printer detection');
      return [];
    }

    try {
      setIsLoading(true);
      const result = await window.electronAPI.print.getPrinters();

      if (result.success && result.printers) {
        setPrinters(result.printers);

        // تحديد الطابعة الافتراضية إذا لم يتم اختيار طابعة
        const defaultPrinter = result.printers.find((p: Printer) => p.isDefault);
        if (defaultPrinter && !selectedPrinter) {
          setSelectedPrinter(defaultPrinter.name);
        }

        // استخدام الطابعة المحفوظة في الإعدادات إذا وجدت
        if (settings.printer_name) {
          const savedPrinter = result.printers.find((p: Printer) => p.name === settings.printer_name);
          if (savedPrinter) {
            setSelectedPrinter(savedPrinter.name);
          }
        }

        return result.printers;
      }
      return [];
    } catch (error) {
      console.error('[usePrinter] Failed to fetch printers:', error);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isElectron, selectedPrinter, settings.printer_name]);

  // ========================================================================
  // صوت بعد الطباعة
  // ========================================================================
  const playBeep = useCallback(() => {
    if (!settings.beep_after_print) return;

    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const audioContext = new AudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 100);
    } catch (e) {
      console.warn('[usePrinter] Beep failed:', e);
    }
  }, [settings.beep_after_print]);

  // ========================================================================
  // فتح درج النقود
  // ========================================================================
  const openCashDrawer = useCallback(async (): Promise<PrintResult> => {
    if (!isElectron) {
      console.warn('[usePrinter] Cash drawer not supported in browser');
      return { success: false, error: 'غير مدعوم في المتصفح' };
    }

    try {
      const result = await window.electronAPI.print.openCashDrawer(selectedPrinter);
      if (result.success) {
        console.log('[usePrinter] Cash drawer opened');
      }
      return result;
    } catch (error) {
      console.error('[usePrinter] Open cash drawer failed:', error);
      return { success: false, error: (error as Error).message };
    }
  }, [isElectron, selectedPrinter]);

  // ========================================================================
  // طباعة إيصال POS
  // ========================================================================
  const printReceipt = useCallback(async (
    receiptData: ReceiptItem[],
    options?: PrintReceiptOptions
  ): Promise<PrintResult> => {
    if (!isElectron) {
      return printReceiptBrowser(receiptData);
    }

    try {
      setIsPrinting(true);

      const result = await window.electronAPI.print.receipt({
        data: receiptData,
        printerName: options?.printerName || selectedPrinter || settings.printer_name,
        pageSize: options?.pageSize || `${settings.paper_width}mm`,
        copies: options?.copies || settings.print_copies || 1,
        silent: options?.silent ?? settings.silent_print,
        margin: options?.margin || `${settings.margin_top || 0}mm ${settings.margin_right || 0}mm ${settings.margin_bottom || 0}mm ${settings.margin_left || 0}mm`
      });

      if (result.success) {
        playBeep();

        if (settings.open_cash_drawer) {
          await openCashDrawer();
        }

        toast.success('تمت الطباعة بنجاح');
      } else {
        toast.error(`فشل في الطباعة: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`خطأ في الطباعة: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, selectedPrinter, settings, playBeep, openCashDrawer]);

  // ========================================================================
  // طباعة HTML (فواتير/تقارير)
  // ========================================================================
  const printHtml = useCallback(async (
    html: string,
    options?: PrintHtmlOptions
  ): Promise<PrintResult> => {
    if (!isElectron) {
      return printHtmlBrowser(html);
    }

    try {
      setIsPrinting(true);

      // تحويل pageSize للتنسيق الصحيح
      let pageSize: string | { width: number; height: number } = options?.pageSize || 'A4';

      // إذا كان string مثل '58mm' نحوله لـ object
      if (typeof pageSize === 'string' && pageSize.endsWith('mm')) {
        const widthMm = parseInt(pageSize.replace('mm', ''), 10);
        pageSize = {
          width: widthMm * 1000, // microns
          height: 297000 // A4 height in microns
        };
      } else if (pageSize === 'A4') {
        pageSize = {
          width: 210000, // 210mm in microns
          height: 297000 // 297mm in microns
        };
      } else if (pageSize === 'A5') {
        pageSize = {
          width: 148000, // 148mm in microns
          height: 210000 // 210mm in microns
        };
      } else if (typeof pageSize === 'string') {
        // الإبقاء على strings أخرى مثل 'Legal', 'Letter'
        // سيتم التعامل معها في printManager.cjs
      }

      const result = await window.electronAPI.print.html({
        html,
        printerName: options?.printerName || selectedPrinter,
        silent: options?.silent ?? settings.silent_print,
        pageSize,
        landscape: options?.landscape || false
      });

      if (result.success) {
        playBeep();
        console.log('[usePrinter] تمت الطباعة بنجاح');
      } else {
        console.warn('[usePrinter] فشل في الطباعة:', result.error);
      }

      return result;
    } catch (error) {
      const errorMsg = (error as Error).message;
      console.error('[usePrinter] خطأ في الطباعة:', errorMsg);
      return { success: false, error: errorMsg };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, selectedPrinter, settings, playBeep]);

  // ========================================================================
  // طباعة باركود
  // ========================================================================
  const printBarcodes = useCallback(async (
    barcodes: BarcodeItem[],
    options?: PrintBarcodeOptions
  ): Promise<PrintResult> => {
    console.log('[usePrinter] 🔍 printBarcodes called');
    console.log('[usePrinter] isElectron:', isElectron);
    console.log('[usePrinter] window.electronAPI exists:', !!window.electronAPI);
    console.log('[usePrinter] window.electronAPI.print exists:', !!window.electronAPI?.print);
    console.log('[usePrinter] window.electronAPI.print.barcode exists:', typeof window.electronAPI?.print?.barcode);

    if (!isElectron) {
      console.warn('[usePrinter] ⚠️ Not in Electron, using browser fallback');
      toast.warning('طباعة الباركود تعمل بشكل أفضل في تطبيق سطح المكتب');
      return printBarcodesBrowser(barcodes);
    }

    try {
      setIsPrinting(true);

      console.log('[usePrinter] 🚀 Calling window.electronAPI.print.barcode...');
      console.log('[usePrinter] 📋 Options:', {
        barcodesCount: barcodes.length,
        printerName: options?.printerName || selectedPrinter,
        templateId: options?.templateId || 'default',
        hasCustomHtml: !!options?.customHtml,
        customHtmlLength: options?.customHtml?.length || 0
      });

      const result = await window.electronAPI.print.barcode({
        barcodes,
        printerName: options?.printerName || selectedPrinter,
        silent: options?.silent ?? settings.silent_print,
        labelSize: options?.labelSize || { width: '50mm', height: '30mm' },
        showProductName: options?.showProductName ?? true,
        showPrice: options?.showPrice ?? true,
        showStoreName: options?.showStoreName ?? false,
        showBarcodeValue: options?.showBarcodeValue ?? true,
        showSku: options?.showSku ?? false,
        // ⚡ إعدادات القالب والتنسيق
        templateId: options?.templateId || 'default',
        fontFamily: options?.fontFamily || 'system-ui',
        barcodeType: options?.barcodeType || 'CODE128',
        timeOutPerLine: options?.timeOutPerLine,
        // ⚡ HTML مخصص للقوالب المعقدة
        customHtml: options?.customHtml
      });

      if (result.success) {
        playBeep();
        toast.success(`تمت طباعة ${barcodes.length} باركود`);
      } else {
        toast.error(`فشل في طباعة الباركود: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`خطأ في طباعة الباركود: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, selectedPrinter, settings, playBeep]);

  // ========================================================================
  // طباعة صفحة اختبار
  // ========================================================================
  const printTest = useCallback(async (): Promise<PrintResult> => {
    if (!isElectron) {
      toast.warning('طباعة الاختبار متاحة فقط في تطبيق سطح المكتب');
      return { success: false, error: 'غير مدعوم في المتصفح' };
    }

    try {
      setIsPrinting(true);
      toast.info('جاري طباعة صفحة الاختبار...');

      const result = await window.electronAPI.print.test(selectedPrinter);

      if (result.success) {
        toast.success('تمت طباعة صفحة الاختبار');
      } else {
        toast.error(`فشل في الاختبار: ${result.error}`);
      }

      return result;
    } catch (error) {
      const errorMsg = (error as Error).message;
      toast.error(`خطأ في الاختبار: ${errorMsg}`);
      return { success: false, error: errorMsg };
    } finally {
      setIsPrinting(false);
    }
  }, [isElectron, selectedPrinter]);

  // ========================================================================
  // حفظ الطابعة المختارة في الإعدادات
  // ========================================================================
  const selectPrinter = useCallback(async (printerName: string) => {
    setSelectedPrinter(printerName);
    await updateSetting('printer_name', printerName);
  }, [updateSetting]);

  // ========================================================================
  // تحميل الطابعات عند بدء التشغيل
  // ========================================================================
  useEffect(() => {
    if (isElectron) {
      fetchPrinters();
    }
  }, [isElectron]);

  // ========================================================================
  // Return
  // ========================================================================
  return {
    // البيانات
    printers,
    selectedPrinter,
    isLoading,
    isPrinting,
    settings,
    isElectron,

    // الإجراءات
    setSelectedPrinter: selectPrinter,
    fetchPrinters,
    printReceipt,
    printHtml,
    printBarcodes,
    openCashDrawer,
    printTest,
    playBeep,
    updateSetting,
    saveSettings,
  };
}

// ============================================================================
// Browser Fallbacks
// ============================================================================

function printReceiptBrowser(data: ReceiptItem[]): PrintResult {
  try {
    const html = convertReceiptToHtml(data);
    return printHtmlBrowser(html);
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

function printHtmlBrowser(html: string): PrintResult {
  try {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
      return { success: false, error: 'Popup blocked' };
    }

    printWindow.document.write(html);
    printWindow.document.close();

    // انتظار تحميل المحتوى
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    // fallback إذا لم يعمل onload
    setTimeout(() => {
      if (!printWindow.closed) {
        printWindow.print();
        printWindow.close();
      }
    }, 1000);

    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

function printBarcodesBrowser(barcodes: BarcodeItem[]): PrintResult {
  // في المتصفح، نستخدم TauriPrintService القديم أو نظهر رسالة
  console.warn('[usePrinter] Barcode printing in browser requires TauriPrintService');
  return { success: false, error: 'استخدم تطبيق سطح المكتب لطباعة الباركود' };
}

function convertReceiptToHtml(data: ReceiptItem[]): string {
  let html = `
    <!DOCTYPE html>
    <html dir="rtl">
    <head>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', 'Lucida Console', monospace;
          font-size: 12px;
          width: 80mm;
          margin: 0 auto;
          padding: 5mm;
          background: white;
        }
        p { margin: 2px 0; }
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: bold; }
        .barcode-placeholder {
          text-align: center;
          font-family: monospace;
          font-size: 14px;
          padding: 10px;
          border: 1px dashed #ccc;
          margin: 5px 0;
        }
        @media print {
          body { width: 80mm; margin: 0; padding: 2mm; }
          @page { size: 80mm auto; margin: 0; }
        }
      </style>
    </head>
    <body>
  `;

  for (const item of data) {
    if (item.type === 'text') {
      const style = item.style || {};
      const classes = [];
      if (style.textAlign === 'center') classes.push('center');
      if (style.textAlign === 'right') classes.push('right');
      if (style.textAlign === 'left') classes.push('left');
      if (style.fontWeight === 'bold') classes.push('bold');

      const inlineStyle = Object.entries(style)
        .filter(([key]) => !['textAlign', 'fontWeight'].includes(key))
        .map(([key, value]) => {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          return `${cssKey}: ${value}`;
        })
        .join('; ');

      html += `<p class="${classes.join(' ')}" style="${inlineStyle}">${item.value || ''}</p>`;
    } else if (item.type === 'barCode') {
      html += `<div class="barcode-placeholder">[${item.value}]</div>`;
    } else if (item.type === 'qrCode') {
      html += `<div class="barcode-placeholder">[QR: ${item.value}]</div>`;
    }
  }

  html += '</body></html>';
  return html;
}

// ============================================================================
// Export
// ============================================================================

export default usePrinter;
