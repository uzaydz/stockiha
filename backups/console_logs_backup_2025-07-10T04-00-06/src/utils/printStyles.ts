/**
 * أنماط CSS المحسّنة للطباعة النظيفة
 */

import type { PrintSettings, PageDimensions, ThermalPrinterSettings } from './printTypes';

/**
 * CSS أساسي لطباعة نظيفة مع إزالة العناوين والتذييلات
 */
export const getCleanPrintCSS = (): string => {
  return `
    .no-print {
      display: none !important;
    }
    
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      @page {
        margin: 0 !important;
        size: auto !important;
        
        /* إزالة العناوين والتذييلات بالكامل */
        @top-left { content: "" !important; }
        @top-center { content: "" !important; }
        @top-right { content: "" !important; }
        @bottom-left { content: "" !important; }
        @bottom-center { content: "" !important; }
        @bottom-right { content: "" !important; }
      }
      
      @page :first {
        margin-top: 0 !important;
      }
      
      @page :left {
        margin-left: 0 !important;
      }
      
      @page :right {
        margin-right: 0 !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: white !important;
        font-family: 'Helvetica Neue', Helvetica, 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
        width: 100% !important;
        height: 100% !important;
        overflow: visible !important;
        font-size: 12px !important;
        line-height: 1.2 !important;
      }
      
      /* إخفاء العناوين والتذييلات الافتراضية للمتصفح */
      body::before,
      body::after,
      html::before,
      html::after {
        display: none !important;
        content: none !important;
      }
      
      .print-only {
        display: block !important;
      }
      
      .screen-only {
        display: none !important;
      }
      
      /* منع قطع الصفحات في أماكن خاطئة */
      .page-break-avoid {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      
      .page-break-before {
        page-break-before: always !important;
        break-before: page !important;
      }
      
      .page-break-after {
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    
    @media screen {
      .print-only {
        display: none !important;
      }
      
      .screen-only {
        display: block !important;
      }
    }
  `;
};

/**
 * إنشاء CSS محسّن للطباعة المنفصلة
 */
export const getSeparatePrintCSS = (
  dimensions: PageDimensions,
  settings: PrintSettings,
  thermalSettings?: ThermalPrinterSettings
): string => {
  const { 
    pageSize, 
    containerPadding, 
    actualFontSize, 
    priceFontSize, 
    nameMargin, 
    priceMargin, 
    elementSpacing,
    containerMaxWidth,
    isThermal,
    isSmallLabel
  } = dimensions;

  // التحقق مما إذا كان التنسيق مخصصاً
  const isCustomFormat = settings.paperSize === 'custom';
  
  // تحديد الأبعاد للتنسيق المخصص
  const customWidth = isCustomFormat ? `${settings.customWidth}mm` : '100%';
  const customHeight = isCustomFormat ? `${settings.customHeight}mm` : '100%';
  
  // حساب أحجام الخط بناءً على أبعاد الورق المخصص
  const customFontSize = isCustomFormat 
    ? Math.max(Math.min(settings.customWidth, settings.customHeight) * 0.08, 8)
    : actualFontSize;
    
  const customPriceFontSize = isCustomFormat
    ? Math.max(customFontSize * 1.2, 10)
    : priceFontSize;
    
  const customStoreFontSize = isCustomFormat
    ? Math.max(customFontSize * 0.8, 6)
    : Math.max(actualFontSize - 2, 8);

  return `
    @media print {
      @page {
        size: auto !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        font-family: ${settings.fontFamily}, sans-serif !important;
        color: ${settings.colorScheme === 'custom' && settings.fontColor ? settings.fontColor : '#000000'} !important;
        background-color: ${settings.colorScheme === 'custom' && settings.backgroundColor ? settings.backgroundColor : '#ffffff'} !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        width: 100% !important;
        height: 100% !important;
      }

      .barcode-page {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        page-break-before: always !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        break-before: page !important;
        break-after: page !important;
        break-inside: avoid !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
        min-width: 100% !important;
        min-height: 100% !important;
      }

      .barcode-page:first-child {
        page-break-before: avoid !important;
        break-before: avoid !important;
      }

      .barcode-page:last-child {
        page-break-after: avoid !important;
        break-after: avoid !important;
      }

      .barcode-container {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: ${isCustomFormat ? '1mm' : containerPadding} !important;
        margin: 0 !important;
        box-sizing: border-box !important;
        overflow: hidden !important;
      }

      .store-name {
        width: 100% !important;
        font-size: ${customStoreFontSize}px !important;
        line-height: 1 !important;
        font-weight: bold !important;
        text-align: center !important;
        margin: 0 0 0.5mm 0 !important;
        padding: 0 !important;
        white-space: nowrap !important;
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        flex: 0 0 auto !important;
      }

      .product-name {
        width: 100% !important;
        font-size: ${customFontSize}px !important;
        line-height: 1.1 !important;
        font-weight: bold !important;
        text-align: center !important;
        margin: 0 0 0.5mm 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        flex: 0 0 auto !important;
      }

      .barcode-image {
        width: 100% !important;
        flex: 1 1 auto !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        margin: 0.5mm 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
      }

      .barcode-image img {
        max-width: 98% !important;
        max-height: 98% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }

      .price-text {
        width: 100% !important;
        font-size: ${customPriceFontSize}px !important;
        line-height: 1 !important;
        font-weight: bold !important;
        text-align: center !important;
        margin: 0.5mm 0 0 0 !important;
        padding: 0 !important;
        flex: 0 0 auto !important;
      }

      .sku {
        width: 100% !important;
        font-family: monospace !important;
        font-size: ${Math.max(customFontSize * 0.8, 6)}px !important;
        text-align: center !important;
        margin: 0.5mm 0 0 0 !important;
        padding: 0 !important;
        opacity: 0.8 !important;
        flex: 0 0 auto !important;
      }
    }
    
    @media screen {
      .barcode-page {
        width: ${customWidth} !important;
        height: ${customHeight} !important;
        margin: 10px auto !important;
        padding: 0 !important;
        background: #ffffff !important;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1) !important;
        overflow: hidden !important;
      }
    }
  `;
};

/**
 * CSS محسّن للطباعة المتعددة
 */
export const getMultiplePrintCSS = (
  columns: number,
  rows: number,
  pageSize: string,
  itemSpacing: string = '2mm',
  gridGap: string = '1mm'
): string => {
  return `
    @media print {
      @page {
        size: ${pageSize};
        margin: 5mm;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        font-family: 'Helvetica Neue', Helvetica, 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      
      .grid-container {
        display: grid !important;
        grid-template-columns: repeat(${columns}, 1fr) !important;
        grid-template-rows: repeat(${rows}, 1fr) !important;
        gap: ${gridGap} !important;
        width: 100% !important;
        height: 100% !important;
        box-sizing: border-box !important;
      }
      
      .grid-item {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        padding: ${itemSpacing} !important;
        box-sizing: border-box !important;
        border: 0.5px solid #ddd !important;
        page-break-inside: avoid !important;
        overflow: hidden !important;
      }
      
      .grid-item img {
        max-width: 100% !important;
        max-height: 60% !important;
        width: auto !important;
        height: auto !important;
        object-fit: contain !important;
      }
      
      .grid-item .product-name {
        font-size: 6px !important;
        font-weight: bold !important;
        margin-bottom: 1mm !important;
        line-height: 1.0 !important;
        overflow: hidden !important;
        max-height: 20% !important;
      }
      
      .grid-item .price-text {
        font-size: 6px !important;
        font-weight: bold !important;
        margin-top: 1mm !important;
        overflow: hidden !important;
        max-height: 20% !important;
      }
    }
    
    @media screen {
      .grid-container {
        display: grid;
        grid-template-columns: repeat(${columns}, 1fr);
        gap: ${gridGap};
        width: 100%;
        padding: 10px;
        box-sizing: border-box;
      }
      
      .grid-item {
        border: 1px solid #ddd;
        padding: ${itemSpacing};
        text-align: center;
        background: white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
    }
  `;
};
