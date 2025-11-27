/**
 * LocalBarcodeGenerator - توليد الباركود محلياً بدون APIs خارجية
 * 
 * ⚡ المميزات:
 * - يعمل أوفلاين بالكامل
 * - أسرع من APIs الخارجية (لا يحتاج طلبات شبكة)
 * - Cache للباركودات المولدة
 * - دعم أنواع متعددة: Code128, Code39, EAN13, QR
 * - استيراد ثابت (لا dynamic imports)
 */

import JsBarcode from 'jsbarcode';
// ⚡ استيراد ثابت لمكتبة QR Code
import QRCode from 'qrcode';

// =====================================================
// Types
// =====================================================

export type BarcodeType = 'code128' | 'code39' | 'ean13' | 'upc' | 'itf14' | 'msi' | 'pharmacode' | 'codabar' | 'compact128';

export interface BarcodeOptions {
  width?: number;
  height?: number;
  displayValue?: boolean;
  fontSize?: number;
  textMargin?: number;
  margin?: number;
  background?: string;
  lineColor?: string;
  fontOptions?: string;
  flat?: boolean;
}

export interface QRCodeOptions {
  width?: number;
  height?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

// =====================================================
// LocalBarcodeGenerator
// =====================================================

class LocalBarcodeGeneratorClass {
  // Cache للباركودات المولدة (لتجنب إعادة التوليد)
  private barcodeCache = new Map<string, string>();
  private qrCache = new Map<string, string>();
  private maxCacheSize = 500;

  /**
   * ⚡ توليد باركود محلياً
   */
  generateBarcode(
    value: string,
    type: BarcodeType = 'code128',
    options: BarcodeOptions = {}
  ): string {
    if (!value || value.trim() === '') {
      console.warn('[LocalBarcodeGenerator] قيمة فارغة للباركود');
      return '';
    }

    // تنظيف القيمة
    const cleanValue = this.sanitizeValue(value, type);
    
    // التحقق من Cache
    const cacheKey = `${type}:${cleanValue}:${JSON.stringify(options)}`;
    if (this.barcodeCache.has(cacheKey)) {
      return this.barcodeCache.get(cacheKey)!;
    }

    try {
      // إنشاء canvas
      const canvas = document.createElement('canvas');
      
      // تحديد نوع الباركود لـ JsBarcode
      const jsFormat = this.mapTypeToJsBarcode(type);
      
      // إعدادات افتراضية محسنة للطباعة
      const defaultOptions: BarcodeOptions = {
        width: type === 'compact128' ? 1.5 : 2,
        height: type === 'compact128' ? 40 : 60,
        displayValue: true,
        fontSize: 12,
        textMargin: 2,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
        fontOptions: 'bold',
        flat: true
      };

      const mergedOptions = { ...defaultOptions, ...options };

      // توليد الباركود
      JsBarcode(canvas, cleanValue, {
        format: jsFormat,
        width: mergedOptions.width,
        height: mergedOptions.height,
        displayValue: mergedOptions.displayValue,
        fontSize: mergedOptions.fontSize,
        textMargin: mergedOptions.textMargin,
        margin: mergedOptions.margin,
        background: mergedOptions.background,
        lineColor: mergedOptions.lineColor,
        fontOptions: mergedOptions.fontOptions,
        flat: mergedOptions.flat
      });

      // تحويل إلى Data URL
      const dataUrl = canvas.toDataURL('image/png');
      
      // حفظ في Cache
      this.addToCache(this.barcodeCache, cacheKey, dataUrl);
      
      return dataUrl;
    } catch (error) {
      console.error('[LocalBarcodeGenerator] خطأ في توليد الباركود:', error);
      return '';
    }
  }

  /**
   * ⚡ توليد باركود كـ SVG (أفضل للطباعة)
   */
  generateBarcodeSVG(
    value: string,
    type: BarcodeType = 'code128',
    options: BarcodeOptions = {}
  ): string {
    if (!value || value.trim() === '') {
      return '';
    }

    const cleanValue = this.sanitizeValue(value, type);
    const cacheKey = `svg:${type}:${cleanValue}:${JSON.stringify(options)}`;
    
    if (this.barcodeCache.has(cacheKey)) {
      return this.barcodeCache.get(cacheKey)!;
    }

    try {
      // إنشاء عنصر SVG
      const svgNS = 'http://www.w3.org/2000/svg';
      const svg = document.createElementNS(svgNS, 'svg');
      
      const jsFormat = this.mapTypeToJsBarcode(type);
      
      const defaultOptions: BarcodeOptions = {
        width: type === 'compact128' ? 1.5 : 2,
        height: type === 'compact128' ? 40 : 60,
        displayValue: true,
        fontSize: 12,
        textMargin: 2,
        margin: 5,
        background: '#ffffff',
        lineColor: '#000000',
        fontOptions: 'bold'
      };

      const mergedOptions = { ...defaultOptions, ...options };

      JsBarcode(svg, cleanValue, {
        format: jsFormat,
        width: mergedOptions.width,
        height: mergedOptions.height,
        displayValue: mergedOptions.displayValue,
        fontSize: mergedOptions.fontSize,
        textMargin: mergedOptions.textMargin,
        margin: mergedOptions.margin,
        background: mergedOptions.background,
        lineColor: mergedOptions.lineColor,
        fontOptions: mergedOptions.fontOptions
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      this.addToCache(this.barcodeCache, cacheKey, svgString);
      
      return svgString;
    } catch (error) {
      console.error('[LocalBarcodeGenerator] خطأ في توليد SVG:', error);
      return '';
    }
  }

  /**
   * ⚡ توليد QR Code محلياً (استيراد ثابت - يعمل أوفلاين)
   */
  async generateQRCode(
    value: string,
    options: QRCodeOptions = {}
  ): Promise<string> {
    if (!value || value.trim() === '') {
      return '';
    }

    const cacheKey = `qr:${value}:${JSON.stringify(options)}`;
    if (this.qrCache.has(cacheKey)) {
      return this.qrCache.get(cacheKey)!;
    }

    try {
      // ⚡ استخدام مكتبة qrcode مباشرة (استيراد ثابت)
      const dataUrl = await QRCode.toDataURL(value, {
        width: options.width || 150,
        margin: options.margin || 2,
        errorCorrectionLevel: options.errorCorrectionLevel || 'L',
        color: {
          dark: options.color?.dark || '#000000',
          light: options.color?.light || '#ffffff'
        }
      });
      
      this.addToCache(this.qrCache, cacheKey, dataUrl);
      return dataUrl;
    } catch (error) {
      console.error('[LocalBarcodeGenerator] خطأ في توليد QR:', error);
      // Fallback: إرجاع placeholder
      return this.generateQRPlaceholder(value);
    }
  }

  /**
   * توليد placeholder للـ QR
   */
  private generateQRPlaceholder(value: string): string {
    const canvas = document.createElement('canvas');
    canvas.width = 150;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 150, 150);
      ctx.strokeStyle = '#cccccc';
      ctx.strokeRect(5, 5, 140, 140);
      ctx.fillStyle = '#666666';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('QR Code', 75, 70);
      ctx.fillText(value.substring(0, 20), 75, 85);
    }
    
    return canvas.toDataURL('image/png');
  }

  // ⚡ تم إزالة loadQRCodeStyling و blobToDataURL - نستخدم مكتبة qrcode مباشرة

  /**
   * تنظيف قيمة الباركود حسب النوع
   */
  private sanitizeValue(value: string, type: BarcodeType): string {
    let sanitized = value.trim();

    // تحويل الأرقام العربية إلى لاتينية
    const arabicToLatin: Record<string, string> = {
      '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
      '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
    };
    
    for (const [arabic, latin] of Object.entries(arabicToLatin)) {
      sanitized = sanitized.replace(new RegExp(arabic, 'g'), latin);
    }

    switch (type) {
      case 'ean13':
        // 13 رقم فقط
        sanitized = sanitized.replace(/[^0-9]/g, '').padStart(13, '0').substring(0, 13);
        break;
      
      case 'upc':
        // 12 رقم فقط
        sanitized = sanitized.replace(/[^0-9]/g, '').padStart(12, '0').substring(0, 12);
        break;
      
      case 'code39':
        // أحرف كبيرة وأرقام ورموز محددة
        sanitized = sanitized.toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
        break;
      
      case 'itf14':
        // 14 رقم فقط
        sanitized = sanitized.replace(/[^0-9]/g, '').padStart(14, '0').substring(0, 14);
        break;
      
      case 'code128':
      case 'compact128':
      default:
        // إزالة الأحرف غير المرئية
        sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
        // الحد الأقصى 80 حرف
        if (sanitized.length > 80) {
          sanitized = sanitized.substring(0, 80);
        }
        break;
    }

    // التأكد من وجود قيمة
    if (!sanitized) {
      return 'DEFAULT0000';
    }

    return sanitized;
  }

  /**
   * تحويل نوع الباركود لـ JsBarcode
   */
  private mapTypeToJsBarcode(type: BarcodeType): string {
    const mapping: Record<BarcodeType, string> = {
      'code128': 'CODE128',
      'compact128': 'CODE128',
      'code39': 'CODE39',
      'ean13': 'EAN13',
      'upc': 'UPC',
      'itf14': 'ITF14',
      'msi': 'MSI',
      'pharmacode': 'pharmacode',
      'codabar': 'codabar'
    };
    return mapping[type] || 'CODE128';
  }

  /**
   * إضافة للـ Cache مع تنظيف تلقائي
   */
  private addToCache(cache: Map<string, string>, key: string, value: string): void {
    // تنظيف Cache إذا امتلأ
    if (cache.size >= this.maxCacheSize) {
      const keysToDelete = Array.from(cache.keys()).slice(0, 100);
      keysToDelete.forEach(k => cache.delete(k));
    }
    cache.set(key, value);
  }

  /**
   * مسح Cache
   */
  clearCache(): void {
    this.barcodeCache.clear();
    this.qrCache.clear();
    console.log('[LocalBarcodeGenerator] تم مسح Cache');
  }

  /**
   * الحصول على حجم Cache
   */
  getCacheSize(): { barcodes: number; qrCodes: number } {
    return {
      barcodes: this.barcodeCache.size,
      qrCodes: this.qrCache.size
    };
  }

  /**
   * التحقق من صحة قيمة الباركود
   */
  isValidBarcode(value: string, type: BarcodeType): boolean {
    if (!value || value.trim() === '') return false;

    const sanitized = this.sanitizeValue(value, type);

    switch (type) {
      case 'ean13':
        return /^\d{13}$/.test(sanitized);
      case 'upc':
        return /^\d{12}$/.test(sanitized);
      case 'code39':
        return /^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(sanitized);
      case 'itf14':
        return /^\d{14}$/.test(sanitized);
      case 'code128':
      case 'compact128':
      default:
        return sanitized.length > 0 && sanitized.length <= 80;
    }
  }
}

// =====================================================
// Export Singleton
// =====================================================

export const localBarcodeGenerator = new LocalBarcodeGeneratorClass();
export default localBarcodeGenerator;
