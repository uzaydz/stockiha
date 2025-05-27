/**
 * دوال مساعدة للطباعة المحسّنة والمقسّمة
 * الملف الرئيسي الذي يجمع جميع مكونات الطباعة
 */

// استيراد الأنواع
export type * from './printTypes';

// استيراد الأنماط
export { 
  getCleanPrintCSS, 
  getSeparatePrintCSS, 
  getMultiplePrintCSS 
} from './printStyles';

// استيراد السكريبتات
export { 
  getCleanPrintScript, 
  getSimplePrintScript, 
  getInteractivePrintScript 
} from './printScripts';

// استيراد حساب الأبعاد
export { 
  calculatePageDimensions,
  calculateMultipleDimensions,
  calculateSingleBarcodeDimensions,
  optimizeForThermalPrinter,
  optimizeForHighQuality
} from './printDimensions';

// استيراد إدارة النوافذ
export { 
  createCleanPrintWindow,
  createSimplePrintWindow,
  createPreviewPrintWindow,
  checkPrintSupport,
  showPrintError
} from './printWindow';

// استيراد الطباعة المفردة
export { 
  printSingleBarcode,
  printSingleBarcodeWithPreview,
  quickPrintSingleBarcode,
  printCustomSingleBarcode
} from './printSingle';

// استيراد المكونات الجديدة للاستخدام الداخلي
import { createCleanPrintWindow, showPrintError, checkPrintSupport } from './printWindow';
import { calculatePageDimensions, calculateMultipleDimensions, optimizeForThermalPrinter } from './printDimensions';
import { getSeparatePrintCSS, getMultiplePrintCSS } from './printStyles';
import { printSingleBarcode as printSingleBarcodeFunction } from './printSingle';
import type { BarcodeItem, PrintSettings, MultiplePrintSettings, ThermalPrinterSettings } from './printTypes';

/**
 * طباعة كل باركود في صفحة منفصلة - نسخة محسّنة
 */
export const printSeparateBarcodes = (
  items: BarcodeItem[],
  settings: PrintSettings,
  thermalSettings?: ThermalPrinterSettings
): void => {
  // فحص دعم الطباعة
  const printSupport = checkPrintSupport();
  if (!printSupport.supported) {
    showPrintError('متصفحك لا يدعم الطباعة');
    return;
  }

  if (printSupport.popupBlocked) {
    showPrintError('تم حظر النوافذ المنبثقة. يرجى السماح بها للطباعة');
    return;
  }

  if (!items || items.length === 0) {
    showPrintError('لا توجد عناصر للطباعة');
    return;
  }

  try {
    // حساب الأبعاد
    const dimensions = calculatePageDimensions(settings);
    
    // تحسينات للطابعات الحرارية
    const optimizedDimensions = settings.quality === 'thermal' 
      ? optimizeForThermalPrinter(dimensions)
      : dimensions;

  // إنشاء صفحة منفصلة لكل عنصر
  const pages = items.map((item, index) => {
    const fullName = [
      item.productName,
      item.colorName,
      item.sizeName
    ].filter(Boolean).join(' - ');
    
    return `
      <div class="barcode-page page-${index}" style="
        width: 100%;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
          padding: ${optimizedDimensions.marginSize};
        box-sizing: border-box;
        ${index > 0 ? 'page-break-before: always;' : ''}
        page-break-inside: avoid;
        page-break-after: ${index < items.length - 1 ? 'always' : 'avoid'};
      ">
        <div class="barcode-container">
          <!-- اسم المتجر في الأعلى -->
          ${settings.includeStoreName && settings.storeName ? `
            <div class="store-name">
              ${settings.storeName}
            </div>
          ` : ''}
          
          <!-- اسم المنتج -->
            ${settings.includeName && fullName ? `
            <div class="product-name">
              ${fullName}
          </div>
            ` : ''}
          
          <!-- الباركود في الوسط -->
          <div class="barcode-image">
              <img src="${item.barcodeImageUrl}" alt="باركود ${item.value}" />
          </div>
          
          <!-- السعر في الأسفل -->
            ${settings.includePrice && item.price ? `
            <div class="price-text">
              ${item.price.toLocaleString()} دج
            </div>
            ` : ''}
        </div>
      </div>
    `;
  });
  
  const allItemsHtml = pages.join('');
  
    // إنشاء المحتوى مع CSS محسّن
  const content = `
    ${allItemsHtml}
    <style>
        ${getSeparatePrintCSS(optimizedDimensions, settings, thermalSettings)}
     </style>
  `;
  
    const printWindow = createCleanPrintWindow(
      content, 
      'طباعة ملصقات منفصلة',
      true,
      thermalSettings
    );
  
  if (!printWindow) {
      showPrintError('تم منع فتح نافذة الطباعة من قبل المتصفح');
    }
    
  } catch (error) {
    showPrintError('حدث خطأ غير متوقع في الطباعة');
  }
};

/**
 * طباعة عدة باركودات بتنسيق grid - نسخة محسّنة
 */
export const printMultipleBarcodes = (
  items: BarcodeItem[],
  settings: MultiplePrintSettings,
  thermalSettings?: ThermalPrinterSettings
): void => {
  // فحص دعم الطباعة
  const printSupport = checkPrintSupport();
  if (!printSupport.supported) {
    showPrintError('متصفحك لا يدعم الطباعة');
    return;
  }

  if (printSupport.popupBlocked) {
    showPrintError('تم حظر النوافذ المنبثقة. يرجى السماح بها للطباعة');
    return;
  }

  if (!items || items.length === 0) {
    showPrintError('لا توجد عناصر للطباعة');
    return;
  }

  try {
    // حساب أبعاد الشبكة
    const gridDimensions = calculateMultipleDimensions(
      settings.columns,
      settings.rows,
      settings.paperSize
    );

    // إنشاء عناصر الشبكة
    const gridItems = items.map(item => {
    const fullName = [
      item.productName,
      item.colorName,
      item.sizeName
    ].filter(Boolean).join(' - ');
    
      return `
        <div class="grid-item">
          ${settings.includeStoreName && settings.storeName ? `
          <div class="store-name">${settings.storeName}</div>
          ` : ''}
          
          ${settings.includeName && fullName ? `
          <div class="product-name">${fullName}</div>
          ` : ''}
          
          <div class="barcode-image-container">
            <img src="${item.barcodeImageUrl}" alt="باركود ${item.value}" />
          </div>
          
          ${settings.includePrice && item.price ? `
          <div class="price-text">${item.price.toLocaleString()} دج</div>
          ` : ''}
      </div>
    `;
    }).join('');
  
  const content = `
      <div class="grid-container">
        ${gridItems}
    </div>
    
    <style>
        ${getMultiplePrintCSS(
          settings.columns,
          settings.rows,
          gridDimensions.pageSize,
          gridDimensions.itemSpacing,
          gridDimensions.gridGap
        )}
    </style>
  `;
  
    const printWindow = createCleanPrintWindow(
      content, 
      'طباعة باركودات متعددة',
      true,
      thermalSettings
    );
  
  if (!printWindow) {
      showPrintError('تم منع فتح نافذة الطباعة من قبل المتصفح');
    }
    
  } catch (error) {
    showPrintError('حدث خطأ غير متوقع في الطباعة');
  }
};

/**
 * دالة مساعدة لإنشاء إعدادات طابعة حرارية
 */
export const createThermalSettings = (options?: Partial<ThermalPrinterSettings>): ThermalPrinterSettings => {
  return {
    density: options?.density || 'normal',
    speed: options?.speed || 'normal',
    dithering: options?.dithering ?? true,
    contrast: options?.contrast || 110,
    ...options
  };
};

/**
 * دالة مساعدة لإنشاء إعدادات طباعة افتراضية
 */
export const createDefaultPrintSettings = (overrides?: Partial<PrintSettings>): PrintSettings => {
  return {
    paperSize: 'A4',
    includeName: true,
    includePrice: true,
    showSku: false,
    fontSize: 8,
    fontFamily: 'Arial',
    orientation: 'portrait',
    colorScheme: 'default',
    barcodeType: 'code128',
    quality: 'normal',
    ...overrides
  };
};

/**
 * دالة مساعدة للتحقق من صحة إعدادات الطباعة
 */
export const validatePrintSettings = (settings: PrintSettings): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (settings.fontSize < 4 || settings.fontSize > 32) {
    errors.push('حجم الخط يجب أن يكون بين 4 و 32');
  }
  
  if (settings.paperSize === 'custom' && (!settings.customWidth || !settings.customHeight)) {
    errors.push('يجب تحديد العرض والارتفاع للحجم المخصص');
  }
  
  if (settings.customWidth && (settings.customWidth < 10 || settings.customWidth > 500)) {
    errors.push('العرض المخصص يجب أن يكون بين 10 و 500 مم');
  }
  
  if (settings.customHeight && (settings.customHeight < 10 || settings.customHeight > 500)) {
    errors.push('الارتفاع المخصص يجب أن يكون بين 10 و 500 مم');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

// التصدير الافتراضي للتوافق
export default {
  printSingleBarcode: printSingleBarcodeFunction,
  printSeparateBarcodes,
  printMultipleBarcodes,
  createCleanPrintWindow,
  createThermalSettings,
  createDefaultPrintSettings,
  validatePrintSettings,
  checkPrintSupport,
  showPrintError
};
