/**
 * طباعة الباركودات المفردة المحسّنة
 */

import { createCleanPrintWindow, showPrintError, checkPrintSupport } from './printWindow';
import { calculateSingleBarcodeDimensions } from './printDimensions';
import type { BarcodeSize, ThermalPrinterSettings } from './printTypes';

/**
 * طباعة باركود مفرد بتنسيق نظيف ومحسّن
 */
export const printSingleBarcode = (
  barcodeImageUrl: string, 
  value: string, 
  productName?: string,
  price?: number,
  size: BarcodeSize = 'medium',
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

  try {
    // حساب الأبعاد
    const dimensions = calculateSingleBarcodeDimensions(size);
    
    // إنشاء المحتوى
    const content = generateSingleBarcodeContent(
      barcodeImageUrl,
      value,
      dimensions,
      productName,
      price,
      thermalSettings
    );
    
    // إنشاء نافذة الطباعة
    const printWindow = createCleanPrintWindow(
      content, 
      `طباعة باركود: ${value}`,
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
 * إنشاء محتوى الباركود المفرد
 */
const generateSingleBarcodeContent = (
  barcodeImageUrl: string,
  value: string,
  dimensions: ReturnType<typeof calculateSingleBarcodeDimensions>,
  productName?: string,
  price?: number,
  thermalSettings?: ThermalPrinterSettings
): string => {
  const {
    width,
    height,
    barcodeSize,
    fontSize,
    priceSize,
    spacing,
    padding
  } = dimensions;

  return `
    <div style="
      text-align: center;
      padding: ${padding};
      font-family: 'Helvetica Neue', Helvetica, 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      height: 95%;
      box-sizing: border-box;
      gap: ${spacing};
      background: white;
      ${thermalSettings ? `
        font-variant-numeric: tabular-nums;
        letter-spacing: 0.3px;
      ` : ''}
    ">
      ${productName ? `
        <div style="
          font-size: ${fontSize}px; 
          font-weight: bold; 
          margin-bottom: ${spacing};
          color: #000000;
          line-height: 1.1;
          word-break: break-word;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 25%;
          overflow: hidden;
          flex-shrink: 0;
          width: 100%;
          hyphens: auto;
          ${thermalSettings ? 'letter-spacing: 0.2px;' : ''}
        ">${productName}</div>
      ` : ''}
      
      <div style="
        margin: 0;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-grow: 1;
        max-height: ${productName && price ? '50%' : '70%'};
        width: 100%;
      ">
        <img 
          src="${barcodeImageUrl}" 
          alt="باركود ${value}" 
          style="
            max-width: ${barcodeSize}; 
            max-height: 100%;
            width: auto;
            height: auto;
            object-fit: contain;
            display: block;
            ${thermalSettings ? `
              image-rendering: crisp-edges;
              filter: contrast(${thermalSettings.contrast || 110}%);
            ` : 'image-rendering: auto;'}
          " 
          onload="this.style.opacity = '1'"
          onerror="this.style.display = 'none'; console.error('فشل تحميل الباركود');"
          style="opacity: 0; transition: opacity 0.3s;"
        />
      </div>
      
      ${price ? `
        <div style="
          font-size: ${priceSize}px; 
          font-weight: bold; 
          margin-top: ${spacing};
          color: #000000;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 25%;
          overflow: hidden;
          flex-shrink: 0;
          width: 100%;
          text-align: center;
          ${thermalSettings ? 'letter-spacing: 0.2px;' : ''}
        ">${formatPrice(price)}</div>
      ` : ''}
    </div>
    
    <style>
      @media print {
        @page {
          size: ${width} ${height};
          margin: 0;
        }
        
        body {
          margin: 0;
          padding: ${padding};
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        
        /* تحسينات إضافية للطابعات الحرارية */
        ${thermalSettings ? `
        body {
          font-variant-numeric: tabular-nums !important;
          letter-spacing: 0.3px !important;
          text-rendering: optimizeSpeed !important;
        }
        
        img {
          image-rendering: crisp-edges !important;
          filter: contrast(${thermalSettings.contrast || 110}%) !important;
        }
        ` : ''}
      }
      
      @media screen {
        body {
          background: #f5f5f5;
          padding: 20px;
        }
        
        /* إضافة border للمعاينة */
        > div {
          border: 2px solid #333;
          background: white;
          box-shadow: 0 4px 8px rgba(0,0,0,0.1);
          border-radius: 4px;
          max-width: 400px;
          margin: 0 auto;
          min-height: 300px;
        }
      }
    </style>
  `;
};

/**
 * تنسيق السعر بشكل مناسب
 */
const formatPrice = (price: number): string => {
  try {
    // تنسيق الأرقام مع فواصل الآلاف
    const formattedPrice = price.toLocaleString('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
    
    return `${formattedPrice} دج`;
  } catch (error) {
    // fallback في حالة عدم دعم التنسيق
    return `${price.toLocaleString()} دج`;
  }
};

/**
 * طباعة باركود مفرد مع معاينة
 */
export const printSingleBarcodeWithPreview = (
  barcodeImageUrl: string, 
  value: string, 
  productName?: string,
  price?: number,
  size: BarcodeSize = 'medium',
  thermalSettings?: ThermalPrinterSettings
): void => {
  try {
    const dimensions = calculateSingleBarcodeDimensions(size);
    const content = generateSingleBarcodeContent(
      barcodeImageUrl,
      value,
      dimensions,
      productName,
      price,
      thermalSettings
    );
    
    // إنشاء نافذة معاينة
    const previewWindow = createCleanPrintWindow(
      content, 
      `معاينة باركود: ${value}`,
      false, // لا تطبع تلقائياً
      thermalSettings
    );
    
    if (!previewWindow) {
      showPrintError('تم منع فتح نافذة المعاينة من قبل المتصفح');
    }
    
  } catch (error) {
    showPrintError('حدث خطأ في إنشاء المعاينة');
  }
};

/**
 * طباعة سريعة للباركود المفرد
 */
export const quickPrintSingleBarcode = (
  barcodeImageUrl: string,
  value: string
): void => {
  try {
    const quickContent = `
      <div style="text-align: center; padding: 5mm;">
        <img src="${barcodeImageUrl}" alt="باركود ${value}" style="max-width: 100%; height: auto;" />
      </div>
      <style>
        @media print {
          @page { size: 60mm 35mm; margin: 0; }
          body { margin: 0; padding: 5mm; }
        }
      </style>
    `;
    
    const printWindow = createCleanPrintWindow(quickContent, `طباعة سريعة: ${value}`);
    
    if (!printWindow) {
      showPrintError('فشل في الطباعة السريعة');
    }
    
  } catch (error) {
    showPrintError('حدث خطأ في الطباعة السريعة');
  }
};

/**
 * طباعة باركود مفرد مع إعدادات مخصصة
 */
export const printCustomSingleBarcode = (options: {
  barcodeImageUrl: string;
  value: string;
  productName?: string;
  price?: number;
  width: string;
  height: string;
  fontSize: number;
  showBorder?: boolean;
  backgroundColor?: string;
  thermalSettings?: ThermalPrinterSettings;
}): void => {
  try {
    const {
      barcodeImageUrl,
      value,
      productName,
      price,
      width,
      height,
      fontSize,
      showBorder = false,
      backgroundColor = 'white',
      thermalSettings
    } = options;

    const content = `
      <div style="
        text-align: center;
        padding: 2mm;
        font-family: Arial, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
        background: ${backgroundColor};
        ${showBorder ? 'border: 1px solid #000;' : ''}
        ${thermalSettings ? 'font-variant-numeric: tabular-nums; letter-spacing: 0.3px;' : ''}
      ">
        ${productName ? `
          <div style="font-size: ${fontSize}px; font-weight: bold; margin-bottom: 1mm; word-break: break-word;">
            ${productName}
          </div>
        ` : ''}
        
        <div style="flex-grow: 1; display: flex; align-items: center; justify-content: center;">
          <img 
            src="${barcodeImageUrl}" 
            alt="باركود ${value}" 
            style="
              max-width: 100%; 
              max-height: 100%; 
              ${thermalSettings ? 'image-rendering: crisp-edges; filter: contrast(' + (thermalSettings.contrast || 110) + '%);' : ''}
            " 
          />
        </div>
        
        ${price ? `
          <div style="font-size: ${fontSize}px; font-weight: bold; margin-top: 1mm;">
            ${formatPrice(price)}
          </div>
        ` : ''}
      </div>
      
      <style>
        @media print {
          @page { size: ${width} ${height}; margin: 0; }
          body { margin: 0; padding: 0; }
        }
      </style>
    `;

    const printWindow = createCleanPrintWindow(content, `طباعة مخصصة: ${value}`, true, thermalSettings);
    
    if (!printWindow) {
      showPrintError('فشل في الطباعة المخصصة');
    }
    
  } catch (error) {
    showPrintError('حدث خطأ في الطباعة المخصصة');
  }
};
