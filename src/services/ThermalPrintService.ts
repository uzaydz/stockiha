/**
 * خدمة الطباعة الحرارية
 *
 * ⚡ MIGRATED: From Tauri to Electron
 *
 * تدعم الطباعة الصامتة في Electron والطباعة العادية في المتصفح
 * متوافقة مع جميع مقاسات الورق الحراري (48mm, 58mm, 80mm)
 */

import { POSSettings } from '@/types/posSettings';
import { isElectron } from '@/lib/desktop';

// أبعاد الورق الحراري بالبكسل (203 DPI)
export const PAPER_SIZES = {
  48: { width: 384, chars: 24 },   // 48mm
  58: { width: 464, chars: 32 },   // 58mm - الأكثر شيوعاً
  80: { width: 640, chars: 48 },   // 80mm
} as const;

export interface PrintJob {
  html: string;
  settings: Partial<POSSettings>;
  copies?: number;
}

export interface PrintResult {
  success: boolean;
  method: 'electron-silent' | 'electron-webview' | 'browser';
  error?: string;
}

/**
 * خدمة الطباعة الحرارية
 */
class ThermalPrintService {
  private static instance: ThermalPrintService;
  private isElectronEnv = false;
  private defaultSettings: Partial<POSSettings> = {
    paper_width: 58,
    font_size: 10,
    line_spacing: 1.2,
    print_density: 'normal',
    auto_cut: true,
    silent_print: true,
    print_copies: 1,
    open_cash_drawer: false,
    margin_top: 0,
    margin_bottom: 0,
    margin_left: 0,
    margin_right: 0,
  };

  private constructor() {
    this.checkEnvironment();
  }

  static getInstance(): ThermalPrintService {
    if (!ThermalPrintService.instance) {
      ThermalPrintService.instance = new ThermalPrintService();
    }
    return ThermalPrintService.instance;
  }

  /**
   * التحقق من بيئة Electron
   */
  private checkEnvironment(): void {
    this.isElectronEnv = isElectron();
    if (this.isElectronEnv) {
      console.log('[ThermalPrint] Running in Electron environment');
    } else {
      console.log('[ThermalPrint] Running in browser environment');
    }
  }

  /**
   * الطباعة الرئيسية
   */
  async print(job: PrintJob): Promise<PrintResult> {
    const settings = { ...this.defaultSettings, ...job.settings };
    const copies = job.copies || settings.print_copies || 1;

    // محاولة الطباعة الصامتة في Electron
    if (this.isElectronEnv && settings.silent_print) {
      const result = await this.printElectronSilent(job.html, settings, copies);
      if (result.success) return result;
    }

    // محاولة الطباعة عبر WebView في Electron
    if (this.isElectronEnv) {
      const result = await this.printElectronWebview(job.html, settings, copies);
      if (result.success) return result;
    }

    // الطباعة عبر المتصفح كخيار أخير
    return this.printBrowser(job.html, settings, copies);
  }

  /**
   * الطباعة الصامتة عبر Electron (بدون نافذة)
   */
  private async printElectronSilent(
    html: string,
    settings: Partial<POSSettings>,
    copies: number
  ): Promise<PrintResult> {
    try {
      const w = window as any;
      if (!w.electronAPI?.print) {
        throw new Error('Electron print not available');
      }

      const fullHtml = this.wrapHtmlForPrint(html, settings);

      await w.electronAPI.print(fullHtml, {
        printer_name: settings.printer_name,
        paper_width: settings.paper_width,
        copies,
        silent: true,
      });

      // تشغيل صوت التنبيه إذا مفعل
      if (settings.beep_after_print) {
        this.playBeep();
      }

      return { success: true, method: 'electron-silent' };
    } catch (error) {
      console.warn('[ThermalPrint] Silent print failed:', error);
      return {
        success: false,
        method: 'electron-silent',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * الطباعة عبر WebView في Electron
   */
  private async printElectronWebview(
    html: string,
    settings: Partial<POSSettings>,
    copies: number
  ): Promise<PrintResult> {
    try {
      // إنشاء iframe مخفي للطباعة
      const printFrame = this.createPrintFrame(html, settings);
      document.body.appendChild(printFrame);

      // انتظار تحميل المحتوى
      await new Promise(resolve => setTimeout(resolve, 300));

      // طباعة عدة نسخ
      for (let i = 0; i < copies; i++) {
        printFrame.contentWindow?.print();
        if (i < copies - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // تنظيف
      document.body.removeChild(printFrame);

      if (settings.beep_after_print) {
        this.playBeep();
      }

      return { success: true, method: 'electron-webview' };
    } catch (error) {
      console.warn('[ThermalPrint] WebView print failed:', error);
      return {
        success: false,
        method: 'electron-webview',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * الطباعة عبر المتصفح
   */
  private async printBrowser(
    html: string,
    settings: Partial<POSSettings>,
    copies: number
  ): Promise<PrintResult> {
    try {
      // إنشاء نافذة طباعة جديدة
      const printWindow = window.open('', '_blank', 'width=400,height=600');

      if (!printWindow) {
        throw new Error('فشل في فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.');
      }

      // كتابة HTML للطباعة
      const fullHtml = this.wrapHtmlForPrint(html, settings);
      printWindow.document.write(fullHtml);
      printWindow.document.close();

      // انتظار تحميل المحتوى
      await new Promise(resolve => setTimeout(resolve, 500));

      // طباعة
      printWindow.print();

      // إغلاق النافذة بعد الطباعة
      printWindow.onafterprint = () => {
        printWindow.close();
      };

      // إغلاق بعد 10 ثواني كاحتياط
      setTimeout(() => {
        if (!printWindow.closed) {
          printWindow.close();
        }
      }, 10000);

      if (settings.beep_after_print) {
        this.playBeep();
      }

      return { success: true, method: 'browser' };
    } catch (error) {
      console.error('[ThermalPrint] Browser print failed:', error);
      return {
        success: false,
        method: 'browser',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * إنشاء إطار مخفي للطباعة
   */
  private createPrintFrame(html: string, settings: Partial<POSSettings>): HTMLIFrameElement {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:absolute;width:0;height:0;border:0;visibility:hidden;';
    frame.srcdoc = this.wrapHtmlForPrint(html, settings);
    return frame;
  }

  /**
   * تغليف HTML بأنماط الطباعة
   */
  private wrapHtmlForPrint(html: string, settings: Partial<POSSettings>): string {
    const paperWidth = settings.paper_width || 58;
    const pixelWidth = PAPER_SIZES[paperWidth as keyof typeof PAPER_SIZES]?.width || 464;

    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>وصل</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: ${paperWidth}mm auto;
      margin: ${settings.margin_top || 0}mm ${settings.margin_right || 0}mm ${settings.margin_bottom || 0}mm ${settings.margin_left || 0}mm;
    }

    @media print {
      html, body {
        width: ${paperWidth}mm;
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: ${settings.font_size || 10}px;
      line-height: ${settings.line_spacing || 1.2};
      color: #000;
      background: #fff;
      direction: rtl;
      width: ${pixelWidth}px;
      max-width: 100%;
    }

    .receipt-container {
      padding: 8px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
    ${html}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * تشغيل صوت التنبيه
   */
  private playBeep(): void {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (e) {
      console.warn('[ThermalPrint] Beep failed:', e);
    }
  }

  /**
   * الحصول على قائمة الطابعات المتاحة
   */
  async getAvailablePrinters(): Promise<string[]> {
    if (!this.isElectronEnv) {
      return [];
    }

    try {
      const w = window as any;
      if (w.electronAPI?.getPrinters) {
        return await w.electronAPI.getPrinters();
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * فتح درج النقود
   */
  async openCashDrawer(printerName?: string): Promise<boolean> {
    if (!this.isElectronEnv) {
      console.warn('[ThermalPrint] Cash drawer not supported in browser');
      return false;
    }

    try {
      const w = window as any;
      if (w.electronAPI?.openCashDrawer) {
        await w.electronAPI.openCashDrawer(printerName);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[ThermalPrint] Failed to open cash drawer:', error);
      return false;
    }
  }

  /**
   * طباعة وصل اختباري
   */
  async printTestReceipt(settings: Partial<POSSettings>): Promise<PrintResult> {
    const testHtml = `
      <div style="text-align: center; padding: 10px 0;">
        <h2 style="font-size: 14px; font-weight: bold; margin-bottom: 8px;">
          ${settings.store_name || 'اختبار الطباعة'}
        </h2>
        <p style="font-size: 11px; color: #666; margin-bottom: 16px;">
          وصل اختباري
        </p>

        <div style="border-top: 1px dashed #ccc; border-bottom: 1px dashed #ccc; padding: 12px 0; margin: 12px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>عرض الورق:</span>
            <span style="font-weight: bold;">${settings.paper_width || 58} مم</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>حجم الخط:</span>
            <span style="font-weight: bold;">${settings.font_size || 10}px</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 6px;">
            <span>نوع الطابعة:</span>
            <span style="font-weight: bold;">${settings.printer_type === 'thermal' ? 'حرارية' : 'عادية'}</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span>الطباعة الصامتة:</span>
            <span style="font-weight: bold;">${settings.silent_print ? 'مفعلة' : 'معطلة'}</span>
          </div>
        </div>

        <p style="font-size: 10px; color: #999;">
          ${new Date().toLocaleString('ar-DZ')}
        </p>

        <p style="font-size: 11px; margin-top: 16px;">
          ✓ الطباعة تعمل بشكل صحيح
        </p>
      </div>
    `;

    return this.print({ html: testHtml, settings });
  }

  /**
   * تحويل HTML إلى صيغة ESC/POS (للطباعة المباشرة)
   */
  htmlToEscPos(html: string, settings: Partial<POSSettings>): Uint8Array {
    // هذه دالة مبسطة - يمكن توسيعها لدعم كامل أوامر ESC/POS
    const commands: number[] = [];

    // ESC @ - تهيئة الطابعة
    commands.push(0x1B, 0x40);

    // ضبط محاذاة النص للوسط
    commands.push(0x1B, 0x61, 0x01);

    // ضبط حجم الخط
    const fontSize = settings.font_size || 10;
    if (fontSize >= 14) {
      commands.push(0x1D, 0x21, 0x11); // خط كبير
    } else if (fontSize >= 12) {
      commands.push(0x1D, 0x21, 0x01); // خط متوسط
    } else {
      commands.push(0x1D, 0x21, 0x00); // خط عادي
    }

    // تحويل HTML إلى نص بسيط
    const textContent = html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim();

    // إضافة النص
    const encoder = new TextEncoder();
    commands.push(...encoder.encode(textContent));

    // قطع الورق إذا مفعل
    if (settings.auto_cut) {
      commands.push(0x0A, 0x0A, 0x0A); // أسطر فارغة
      commands.push(0x1D, 0x56, 0x00); // قطع كامل
    }

    // فتح درج النقود إذا مفعل
    if (settings.open_cash_drawer) {
      commands.push(0x1B, 0x70, 0x00, 0x19, 0xFA);
    }

    return new Uint8Array(commands);
  }
}

// تصدير نسخة واحدة من الخدمة
export const thermalPrintService = ThermalPrintService.getInstance();

// تصدير الفئة للاختبار
export { ThermalPrintService };
