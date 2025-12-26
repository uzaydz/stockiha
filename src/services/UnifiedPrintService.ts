/**
 * UnifiedPrintService - خدمة الطباعة الموحدة
 * ============================================
 *
 * ⚡ تدعم:
 * - الطباعة الصامتة (بدون نافذة)
 * - الطباعة السريعة
 * - فتح درج النقود
 * - القطع التلقائي
 * - صوت التنبيه بعد الطباعة
 * - طباعة نسخ متعددة
 * - جميع أحجام الورق (48mm, 58mm, 80mm)
 * - قوالب مختلفة (Apple, Modern, Classic, Minimal)
 */

import { localPrinterSettingsService, LocalPrinterSettings, DEFAULT_PRINTER_SETTINGS, getDeviceId } from '@/api/localPrinterSettingsService';

// ========================================
// Types & Interfaces
// ========================================

export interface PrintSettings extends LocalPrinterSettings {
  // إعدادات المتجر (من POS Settings)
  store_name?: string;
  store_phone?: string;
  store_address?: string;
  store_logo_url?: string;
  receipt_header_text?: string;
  receipt_footer_text?: string;
  welcome_message?: string;
  currency_symbol?: string;
  currency_position?: 'before' | 'after';
  // العناصر المرئية
  show_store_logo?: boolean;
  show_store_info?: boolean;
  show_customer_info?: boolean;
  show_employee_name?: boolean;
  show_date_time?: boolean;
  show_qr_code?: boolean;
  show_tracking_code?: boolean;
}

export interface PrintJobOptions {
  html: string;
  settings?: Partial<PrintSettings>;
  copies?: number;
  openDrawer?: boolean;
  silent?: boolean;
}

export interface PrintResult {
  success: boolean;
  method: 'electron-silent' | 'electron-webview' | 'browser' | 'pdf';
  error?: string;
  drawerOpened?: boolean;
}

export interface ReceiptData {
  orderId: string;
  items: ReceiptItem[];
  services?: ReceiptService[];
  subtotal: number;
  discount?: number;
  discountAmount?: number;
  tax?: number;
  total: number;
  customerName?: string;
  employeeName?: string;
  paymentMethod?: string;
  amountPaid?: number;
  remainingAmount?: number;
  isPartialPayment?: boolean;
  subscriptionAccountInfo?: {
    username?: string;
    email?: string;
    password?: string;
    notes?: string;
  };
}

// أنواع وحدات البيع
type SellingUnit = 'piece' | 'weight' | 'box' | 'meter';
type SaleType = 'retail' | 'wholesale' | 'partial_wholesale';

export interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
  colorName?: string;
  sizeName?: string;
  // === أنواع البيع المتقدمة ===
  sellingUnit?: SellingUnit;
  // البيع بالوزن
  weight?: number;
  weightUnit?: 'kg' | 'g' | 'lb' | 'oz';
  // البيع بالكرتون
  boxCount?: number;
  unitsPerBox?: number;
  // البيع بالمتر
  length?: number;
  meterUnit?: 'm' | 'cm' | 'ft' | 'inch';
  // === التتبع المتقدم ===
  serialNumbers?: string[];
  batchNumber?: string;
  expiryDate?: string;
  // نوع البيع
  saleType?: SaleType;
  // الضمان
  warrantyMonths?: number;
  hasWarranty?: boolean;
}

export interface ReceiptService {
  name: string;
  price: number;
  duration?: string;
  trackingCode?: string;
}

// أبعاد الورق
export const PAPER_DIMENSIONS = {
  48: { width: 48, pixels: 384, chars: 24 },
  58: { width: 58, pixels: 464, chars: 32 },
  80: { width: 80, pixels: 640, chars: 48 },
} as const;

// ========================================
// ESC/POS Commands
// ========================================

const ESC_POS = {
  // تهيئة الطابعة
  INIT: [0x1B, 0x40],

  // محاذاة النص
  ALIGN_LEFT: [0x1B, 0x61, 0x00],
  ALIGN_CENTER: [0x1B, 0x61, 0x01],
  ALIGN_RIGHT: [0x1B, 0x61, 0x02],

  // حجم الخط
  TEXT_NORMAL: [0x1D, 0x21, 0x00],
  TEXT_DOUBLE_HEIGHT: [0x1D, 0x21, 0x01],
  TEXT_DOUBLE_WIDTH: [0x1D, 0x21, 0x10],
  TEXT_DOUBLE: [0x1D, 0x21, 0x11],

  // نمط الخط
  BOLD_ON: [0x1B, 0x45, 0x01],
  BOLD_OFF: [0x1B, 0x45, 0x00],
  UNDERLINE_ON: [0x1B, 0x2D, 0x01],
  UNDERLINE_OFF: [0x1B, 0x2D, 0x00],

  // قطع الورق
  CUT_FULL: [0x1D, 0x56, 0x00],
  CUT_PARTIAL: [0x1D, 0x56, 0x01],

  // فتح درج النقود
  OPEN_DRAWER_PIN2: [0x1B, 0x70, 0x00, 0x19, 0xFA],
  OPEN_DRAWER_PIN5: [0x1B, 0x70, 0x01, 0x19, 0xFA],

  // صوت التنبيه
  BEEP: [0x1B, 0x42, 0x03, 0x02],

  // تغذية الورق
  LINE_FEED: [0x0A],
  FEED_LINES: (n: number) => [0x1B, 0x64, n],
};

// ========================================
// Unified Print Service Class
// ========================================

class UnifiedPrintService {
  private static instance: UnifiedPrintService;
  private isElectronEnv = false;
  private cachedSettings: LocalPrinterSettings | null = null;
  private settingsOrganizationId: string | null = null;

  private constructor() {
    this.initializeEnvironment();
  }

  static getInstance(): UnifiedPrintService {
    if (!UnifiedPrintService.instance) {
      UnifiedPrintService.instance = new UnifiedPrintService();
    }
    return UnifiedPrintService.instance;
  }

  // ========================================
  // Initialization
  // ========================================

  private initializeEnvironment(): void {
    const w = window as any;
    this.isElectronEnv = Boolean(w.electronAPI);
    if (this.isElectronEnv) {
      console.log('[UnifiedPrint] ✅ Electron environment detected');
    } else {
      console.log('[UnifiedPrint] 📱 Browser environment');
    }
  }

  /**
   * تحميل إعدادات الطابعة المحلية
   */
  async loadSettings(organizationId: string): Promise<LocalPrinterSettings> {
    if (this.cachedSettings && this.settingsOrganizationId === organizationId) {
      return this.cachedSettings;
    }

    try {
      this.cachedSettings = await localPrinterSettingsService.getWithDefaults(organizationId);
      this.settingsOrganizationId = organizationId;
      return this.cachedSettings;
    } catch (error) {
      console.error('[UnifiedPrint] Failed to load settings:', error);
      return {
        ...DEFAULT_PRINTER_SETTINGS,
        organization_id: organizationId,
        device_id: getDeviceId(),
      };
    }
  }

  /**
   * مسح الإعدادات المخزنة مؤقتاً
   */
  clearSettingsCache(): void {
    this.cachedSettings = null;
    this.settingsOrganizationId = null;
  }

  // ========================================
  // Main Print Methods
  // ========================================

  /**
   * طباعة HTML مع الإعدادات
   */
  async print(options: PrintJobOptions): Promise<PrintResult> {
    const settings = {
      ...DEFAULT_PRINTER_SETTINGS,
      ...this.cachedSettings,
      ...options.settings,
    };

    const copies = options.copies ?? settings.print_copies ?? 1;
    const silent = options.silent ?? settings.silent_print ?? true;
    const openDrawer = options.openDrawer ?? settings.open_cash_drawer ?? false;

    console.log('[UnifiedPrint] 🖨️ Starting print job', {
      copies,
      silent,
      openDrawer,
      paperWidth: settings.paper_width,
      printerType: settings.printer_type,
    });

    let result: PrintResult;

    // محاولة الطباعة حسب البيئة
    if (this.isElectronEnv && silent) {
      result = await this.printElectronSilent(options.html, settings, copies);
    } else if (this.isElectronEnv) {
      result = await this.printElectronWebview(options.html, settings, copies);
    } else {
      result = await this.printBrowser(options.html, settings, copies);
    }

    // فتح درج النقود بعد الطباعة الناجحة
    if (result.success && openDrawer) {
      result.drawerOpened = await this.openCashDrawer(settings.printer_name);
    }

    // تشغيل صوت التنبيه
    if (result.success && settings.beep_after_print) {
      this.playBeep();
    }

    return result;
  }

  /**
   * طباعة سريعة (بدون خيارات إضافية)
   */
  async quickPrint(html: string, organizationId?: string): Promise<PrintResult> {
    if (organizationId) {
      await this.loadSettings(organizationId);
    }

    return this.print({
      html,
      silent: true,
    });
  }

  /**
   * طباعة وصل كامل
   */
  async printReceipt(data: ReceiptData, settings: Partial<PrintSettings>): Promise<PrintResult> {
    const html = this.generateReceiptHtml(data, settings);
    return this.print({
      html,
      settings,
      openDrawer: settings.open_cash_drawer,
    });
  }

  // ========================================
  // Print Methods by Environment
  // ========================================

  /**
   * الطباعة الصامتة عبر Electron - محدّث لاستخدام API الصحيح
   */
  private async printElectronSilent(
    html: string,
    settings: LocalPrinterSettings,
    copies: number
  ): Promise<PrintResult> {
    try {
      const w = window as any;

      // التحقق من توفر Electron Print API الجديد
      if (!w.electronAPI?.print?.html) {
        console.warn('[UnifiedPrint] Electron print.html not available, falling back to webview');
        return this.printElectronWebview(html, settings, copies);
      }

      const fullHtml = this.wrapHtmlForPrint(html, settings);
      const paperWidth = settings.paper_width || 58;

      // استخدام Electron Print API الصحيح
      for (let i = 0; i < copies; i++) {
        console.log('[UnifiedPrint] 📄 Sending print job', i + 1, 'of', copies);

        const result = await w.electronAPI.print.html({
          html: fullHtml,
          printerName: settings.printer_name || undefined,
          silent: true,
          // pageSize يحتاج width و height
          pageSize: {
            width: paperWidth * 1000, // microns (58mm = 58000 microns)
            height: 297000, // A4 height in microns - سيتم القطع تلقائياً
          },
          landscape: false,
          margins: {
            marginType: 'none',
          }
        });

        console.log('[UnifiedPrint] Print result:', result);

        if (!result?.success) {
          throw new Error(result?.error || 'Print failed');
        }

        // تأخير بين النسخ
        if (i < copies - 1) {
          await this.delay(300);
        }
      }

      console.log('[UnifiedPrint] ✅ Silent print successful via Electron');
      return { success: true, method: 'electron-silent' };
    } catch (error) {
      console.warn('[UnifiedPrint] Silent print failed, trying webview:', error);
      return this.printElectronWebview(html, settings, copies);
    }
  }

  /**
   * الطباعة عبر WebView في Electron
   */
  private async printElectronWebview(
    html: string,
    settings: LocalPrinterSettings,
    copies: number
  ): Promise<PrintResult> {
    try {
      // إنشاء iframe مخفي للطباعة
      const fullHtml = this.wrapHtmlForPrint(html, settings);

      for (let i = 0; i < copies; i++) {
        await this.printViaIframe(fullHtml);
        if (i < copies - 1) {
          await this.delay(500);
        }
      }

      console.log('[UnifiedPrint] ✅ WebView print successful');
      return { success: true, method: 'electron-webview' };
    } catch (error) {
      console.error('[UnifiedPrint] WebView print failed:', error);
      return {
        success: false,
        method: 'electron-webview',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * الطباعة عبر المتصفح
   */
  private async printBrowser(
    html: string,
    settings: LocalPrinterSettings,
    copies: number
  ): Promise<PrintResult> {
    try {
      const fullHtml = this.wrapHtmlForPrint(html, settings);
      const printWindow = window.open('', '_blank', 'width=400,height=600');

      if (!printWindow) {
        throw new Error('فشل في فتح نافذة الطباعة. تأكد من السماح بالنوافذ المنبثقة.');
      }

      printWindow.document.write(fullHtml);
      printWindow.document.close();

      await this.delay(500);

      for (let i = 0; i < copies; i++) {
        printWindow.print();
        if (i < copies - 1) {
          await this.delay(1000);
        }
      }

      // إغلاق بعد الطباعة
      printWindow.onafterprint = () => printWindow.close();
      setTimeout(() => {
        if (!printWindow.closed) printWindow.close();
      }, 10000);

      console.log('[UnifiedPrint] ✅ Browser print successful');
      return { success: true, method: 'browser' };
    } catch (error) {
      console.error('[UnifiedPrint] Browser print failed:', error);
      return {
        success: false,
        method: 'browser',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * طباعة عبر iframe مخفي
   */
  private printViaIframe(html: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            document.body.removeChild(iframe);
            resolve();
          }, 500);
        } catch (e) {
          document.body.removeChild(iframe);
          reject(e);
        }
      };

      iframe.srcdoc = html;
      document.body.appendChild(iframe);
    });
  }

  // ========================================
  // Cash Drawer
  // ========================================

  /**
   * فتح درج النقود - محدّث لاستخدام API الصحيح
   */
  async openCashDrawer(printerName?: string | null): Promise<boolean> {
    console.log('[UnifiedPrint] 💰 Opening cash drawer...');

    if (!this.isElectronEnv) {
      console.warn('[UnifiedPrint] Cash drawer not supported in browser');
      return false;
    }

    try {
      const w = window as any;

      // استخدام API الصحيح
      if (w.electronAPI?.print?.openCashDrawer) {
        const result = await w.electronAPI.print.openCashDrawer(printerName);
        if (result?.success) {
          console.log('[UnifiedPrint] ✅ Cash drawer opened');
          return true;
        }
        console.warn('[UnifiedPrint] Cash drawer failed:', result?.error);
        return false;
      }

      console.warn('[UnifiedPrint] Cash drawer API not available');
      return false;
    } catch (error) {
      console.error('[UnifiedPrint] Failed to open cash drawer:', error);
      return false;
    }
  }

  // ========================================
  // Receipt HTML Generation
  // ========================================

  /**
   * توليد HTML للوصل
   */
  generateReceiptHtml(data: ReceiptData, settings: Partial<PrintSettings>): string {
    const template = (settings as any).receipt_template || 'apple';

    switch (template) {
      case 'apple':
        return this.generateAppleReceipt(data, settings);
      case 'modern':
        return this.generateModernReceipt(data, settings);
      case 'minimal':
        return this.generateMinimalReceipt(data, settings);
      case 'custom':
        // نفس قالب Apple كقاعدة، مع إمكانية حقن CSS مخصص على مستوى الطبقة التي تعرض HTML
        return this.generateAppleReceipt(data, settings);
      case 'classic':
      default:
        return this.generateClassicReceipt(data, settings);
    }
  }

  /**
   * قالب Apple (أنيق ومرتب)
   */
  private generateAppleReceipt(data: ReceiptData, settings: Partial<PrintSettings>): string {
    const currency = settings.currency_symbol || 'دج';
    const currencyPos = settings.currency_position || 'after';

    const formatPrice = (price: number) => {
      const formatted = price.toLocaleString('en-US', { minimumFractionDigits: 2 });
      return currencyPos === 'before' ? `${currency} ${formatted}` : `${formatted} ${currency}`;
    };

    const formatDate = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      };
      return now.toLocaleDateString('ar-DZ', options);
    };

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; color: #1d1d1f; line-height: 1.4;">
        <!-- Header -->
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid #e5e5e7;">
          ${settings.show_store_logo && settings.store_logo_url ? `
            <img src="${settings.store_logo_url}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; margin-bottom: 8px;">
          ` : ''}
          ${settings.show_store_info ? `
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 4px;">${settings.store_name || ''}</div>
            ${settings.store_phone ? `<div style="font-size: 11px; color: #86868b;">${settings.store_phone}</div>` : ''}
            ${settings.store_address ? `<div style="font-size: 11px; color: #86868b;">${settings.store_address}</div>` : ''}
          ` : ''}
          ${settings.welcome_message ? `<div style="font-size: 12px; color: #0066cc; margin-top: 8px;">${settings.welcome_message}</div>` : ''}
        </div>

        <!-- Order Info -->
        <div style="padding: 12px 0; border-bottom: 1px solid #e5e5e7; font-size: 11px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #86868b;">رقم الطلب</span>
            <span style="font-family: 'SF Mono', monospace; font-weight: 500;">#${data.orderId}</span>
          </div>
          ${settings.show_date_time ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #86868b;">التاريخ</span>
              <span>${formatDate()}</span>
            </div>
          ` : ''}
          ${settings.show_employee_name && data.employeeName ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #86868b;">الموظف</span>
              <span>${data.employeeName}</span>
            </div>
          ` : ''}
          ${settings.show_customer_info && data.customerName ? `
            <div style="display: flex; justify-content: space-between;">
              <span style="color: #86868b;">العميل</span>
              <span>${data.customerName}</span>
            </div>
          ` : ''}
        </div>

        <!-- Items -->
        <div style="padding: 12px 0; border-bottom: 1px solid #e5e5e7;">
          ${data.items.map(item => `
            <div style="margin-bottom: 8px;">
              <div style="display: flex; justify-content: space-between; font-size: 12px;">
                <span style="flex: 1;">${item.name}${item.colorName ? ` - ${item.colorName}` : ''}${item.sizeName ? ` - ${item.sizeName}` : ''}</span>
                <span style="font-weight: 500; margin-right: 8px;">${formatPrice(item.total)}</span>
              </div>
              <div style="font-size: 10px; color: #86868b;">
                ${item.quantity} × ${formatPrice(item.price)}
              </div>
            </div>
          `).join('')}

          ${data.services?.length ? `
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #e5e5e7;">
              <div style="font-size: 11px; font-weight: 600; color: #86868b; margin-bottom: 8px;">الخدمات</div>
              ${data.services.map(service => `
                <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
                  <span>${service.name}${service.duration ? ` (${service.duration})` : ''}</span>
                  <span style="font-weight: 500;">${formatPrice(service.price)}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>

        <!-- Totals -->
        <div style="padding: 12px 0; font-size: 12px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #86868b;">المجموع الفرعي</span>
            <span>${formatPrice(data.subtotal)}</span>
          </div>
          ${data.discountAmount && data.discountAmount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #34c759;">
              <span>الخصم${data.discount ? ` (${data.discount}%)` : ''}</span>
              <span>- ${formatPrice(data.discountAmount)}</span>
            </div>
          ` : ''}
          ${data.tax && data.tax > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span style="color: #86868b;">الضريبة</span>
              <span>${formatPrice(data.tax)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 600; padding-top: 8px; border-top: 2px solid #1d1d1f; margin-top: 8px;">
            <span>المجموع</span>
            <span>${formatPrice(data.total)}</span>
          </div>

          ${data.isPartialPayment ? `
            <div style="margin-top: 12px; padding: 8px; background: #fff3cd; border-radius: 8px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span>المدفوع</span>
                <span style="color: #198754;">${formatPrice(data.amountPaid || 0)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-weight: 600;">
                <span>المتبقي</span>
                <span style="color: #dc3545;">${formatPrice(data.remainingAmount || 0)}</span>
              </div>
            </div>
          ` : ''}
        </div>

        <!-- Payment Method -->
        ${data.paymentMethod ? `
          <div style="text-align: center; padding: 8px 0; font-size: 11px; color: #86868b; border-top: 1px solid #e5e5e7;">
            طريقة الدفع: ${data.paymentMethod}
          </div>
        ` : ''}

        <!-- Footer -->
        <div style="text-align: center; padding-top: 16px; border-top: 1px solid #e5e5e7;">
          ${settings.receipt_footer_text ? `
            <div style="font-size: 11px; color: #86868b; margin-bottom: 8px;">${settings.receipt_footer_text}</div>
          ` : ''}
          ${settings.show_qr_code ? `
            <div style="margin: 12px 0;">
              <div style="width: 64px; height: 64px; background: #f5f5f7; border-radius: 8px; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 10px; color: #86868b;">QR</span>
              </div>
            </div>
          ` : ''}
          <div style="font-size: 10px; color: #86868b;">شكراً لتسوقكم معنا</div>
        </div>
      </div>
    `;
  }

  /**
   * قالب Modern (عصري)
   */
  private generateModernReceipt(data: ReceiptData, settings: Partial<PrintSettings>): string {
    // مشابه لـ Apple مع تعديلات بصرية
    return this.generateAppleReceipt(data, {
      ...settings,
      // يمكن تخصيص الألوان والأنماط هنا
    });
  }

  /**
   * قالب Classic (تقليدي)
   */
  private generateClassicReceipt(data: ReceiptData, settings: Partial<PrintSettings>): string {
    const currency = settings.currency_symbol || 'دج';
    const formatPrice = (price: number) => `${price.toFixed(2)} ${currency}`;

    return `
      <div style="font-family: 'Courier New', monospace; font-size: 11px; line-height: 1.3;">
        <div style="text-align: center; border-bottom: 1px dashed #000; padding-bottom: 8px; margin-bottom: 8px;">
          <div style="font-size: 14px; font-weight: bold;">${settings.store_name || 'المتجر'}</div>
          ${settings.store_phone ? `<div>${settings.store_phone}</div>` : ''}
          ${settings.store_address ? `<div>${settings.store_address}</div>` : ''}
        </div>

        <div style="margin-bottom: 8px;">
          <div>رقم: #${data.orderId}</div>
          <div>التاريخ: ${new Date().toLocaleDateString('ar-DZ')}</div>
          ${data.employeeName ? `<div>الموظف: ${data.employeeName}</div>` : ''}
          ${data.customerName ? `<div>العميل: ${data.customerName}</div>` : ''}
        </div>

        <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 8px 0; margin: 8px 0;">
          ${data.items.map(item => `
            <div style="margin-bottom: 4px;">
              <div>${item.name}</div>
              <div style="display: flex; justify-content: space-between;">
                <span>${item.quantity} x ${formatPrice(item.price)}</span>
                <span>${formatPrice(item.total)}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div style="text-align: left;">
          <div style="display: flex; justify-content: space-between;">
            <span>المجموع الفرعي:</span>
            <span>${formatPrice(data.subtotal)}</span>
          </div>
          ${data.discountAmount ? `
            <div style="display: flex; justify-content: space-between;">
              <span>الخصم:</span>
              <span>-${formatPrice(data.discountAmount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; font-weight: bold; border-top: 1px solid #000; margin-top: 4px; padding-top: 4px;">
            <span>المجموع:</span>
            <span>${formatPrice(data.total)}</span>
          </div>
        </div>

        <div style="text-align: center; margin-top: 16px; font-size: 10px;">
          ${settings.receipt_footer_text || 'شكراً لزيارتكم'}
        </div>
      </div>
    `;
  }

  /**
   * قالب Minimal (بسيط)
   */
  private generateMinimalReceipt(data: ReceiptData, settings: Partial<PrintSettings>): string {
    const currency = settings.currency_symbol || 'دج';
    const formatPrice = (price: number) => `${price.toFixed(2)} ${currency}`;

    return `
      <div style="font-family: sans-serif; font-size: 11px;">
        <div style="text-align: center; margin-bottom: 12px;">
          <strong>${settings.store_name || ''}</strong>
        </div>

        <div style="margin-bottom: 8px; font-size: 10px; color: #666;">
          #${data.orderId} | ${new Date().toLocaleDateString('ar-DZ')}
        </div>

        ${data.items.map(item => `
          <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
            <span>${item.name} x${item.quantity}</span>
            <span>${formatPrice(item.total)}</span>
          </div>
        `).join('')}

        <div style="border-top: 1px solid #000; margin-top: 8px; padding-top: 8px; display: flex; justify-content: space-between; font-weight: bold;">
          <span>المجموع</span>
          <span>${formatPrice(data.total)}</span>
        </div>
      </div>
    `;
  }

  // ========================================
  // HTML Wrapper for Print
  // ========================================

  /**
   * تغليف HTML بأنماط الطباعة الكاملة
   */
  private wrapHtmlForPrint(html: string, settings: LocalPrinterSettings): string {
    const paperWidth = settings.paper_width || 58;
    const fontSize = settings.font_size || 10;
    const lineSpacing = settings.line_spacing || 1.2;
    const margins = {
      top: settings.margin_top || 0,
      bottom: settings.margin_bottom || 0,
      left: settings.margin_left || 0,
      right: settings.margin_right || 0,
    };

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
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @page {
      size: ${paperWidth}mm auto;
      margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm;
    }

    html, body {
      width: ${paperWidth}mm;
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif;
      font-size: ${fontSize}px;
      line-height: ${lineSpacing};
      color: #000;
      background: #fff;
      direction: rtl;
    }

    @media print {
      html, body {
        width: ${paperWidth}mm !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      .no-print {
        display: none !important;
      }
    }

    .receipt-wrapper {
      padding: 4mm;
      max-width: ${paperWidth}mm;
    }
  </style>
</head>
<body>
  <div class="receipt-wrapper">
    ${html}
  </div>
</body>
</html>
    `.trim();
  }

  // ========================================
  // Utility Methods
  // ========================================

  /**
   * تشغيل صوت التنبيه
   */
  playBeep(): void {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();

      oscillator.connect(gain);
      gain.connect(ctx.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.2);
    } catch (e) {
      console.warn('[UnifiedPrint] Beep failed:', e);
    }
  }

  /**
   * تأخير
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * طباعة وصل اختباري
   */
  async printTestReceipt(settings: Partial<PrintSettings>): Promise<PrintResult> {
    const testData: ReceiptData = {
      orderId: 'TEST-001',
      items: [
        { name: 'منتج تجريبي 1', quantity: 2, price: 500, total: 1000 },
        { name: 'منتج تجريبي 2', quantity: 1, price: 750, total: 750 },
      ],
      subtotal: 1750,
      total: 1750,
      employeeName: 'موظف الاختبار',
    };

    return this.printReceipt(testData, {
      ...settings,
      show_store_info: true,
      show_date_time: true,
      show_employee_name: true,
    });
  }

  /**
   * الحصول على قائمة الطابعات - محدّث لاستخدام API الصحيح
   */
  async getAvailablePrinters(): Promise<{ name: string; displayName: string; isDefault: boolean }[]> {
    if (!this.isElectronEnv) {
      console.log('[UnifiedPrint] Not in Electron, returning empty printers list');
      return [];
    }

    try {
      const w = window as any;

      // استخدام API الصحيح
      if (w.electronAPI?.print?.getPrinters) {
        const result = await w.electronAPI.print.getPrinters();
        if (result?.success && Array.isArray(result.printers)) {
          console.log('[UnifiedPrint] Found', result.printers.length, 'printers');
          return result.printers;
        }
        console.warn('[UnifiedPrint] getPrinters failed:', result?.error);
        return [];
      }

      console.warn('[UnifiedPrint] getPrinters API not available');
      return [];
    } catch (error) {
      console.error('[UnifiedPrint] Failed to get printers:', error);
      return [];
    }
  }

  /**
   * التحقق من دعم الطباعة الصامتة
   */
  isSilentPrintSupported(): boolean {
    return this.isElectronEnv;
  }

  /**
   * التحقق من دعم درج النقود
   */
  isCashDrawerSupported(): boolean {
    return this.isElectronEnv;
  }
}

// ========================================
// Export
// ========================================

export const unifiedPrintService = UnifiedPrintService.getInstance();
export { UnifiedPrintService };
export default unifiedPrintService;
