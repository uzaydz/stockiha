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

  return `
    @media print {
      @page {
        size: ${pageSize};
        margin: 0;
      }
      
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        font-family: 'Helvetica Neue', Helvetica, 'Segoe UI', -apple-system, BlinkMacSystemFont, ${settings.fontFamily}, sans-serif !important;
        color: ${settings.colorScheme === 'custom' && settings.fontColor ? settings.fontColor : '#000000'} !important;
        background-color: ${settings.colorScheme === 'custom' && settings.backgroundColor ? settings.backgroundColor : '#ffffff'} !important;
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
        
        /* تحسينات خاصة للطابعات الحرارية */
        ${isThermal ? `
        font-variant-numeric: tabular-nums !important;
        letter-spacing: 0.5px !important;
        font-synthesis: none !important;
        text-rendering: optimizeSpeed !important;
        -webkit-font-smoothing: none !important;
        font-smooth: never !important;
        ${thermalSettings?.dithering ? 'image-rendering: crisp-edges !important;' : ''}
        ` : ''}
      }
      
      .barcode-page {
        page-break-inside: avoid !important;
        page-break-after: always !important;
        position: relative !important;
        width: 100% !important;
        height: 100vh !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .barcode-page:last-child {
        page-break-after: avoid !important;
      }
      
      .barcode-container {
        position: relative !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: flex-start !important;
        text-align: center !important;
        box-sizing: border-box !important;
        padding: ${containerPadding} !important;
        
        /* أبعاد للمحتوى بدون دوران */
        width: 90% !important;
        height: 95% !important;
        max-width: 90% !important;
        max-height: 95% !important;
        
        /* لا نطبق دوران هنا، فقط نترك الصفحة تحدد الاتجاه */
        ${isSmallLabel ? `
        width: 95% !important;
        height: 98% !important;
        max-width: 95% !important;
        max-height: 98% !important;
        ` : ''}
      }
      
      .product-name {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        color: #000000 !important;
        font-weight: bold !important;
        word-break: break-word !important;
        hyphens: auto !important;
        line-height: 1.1 !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        margin-bottom: ${nameMargin} !important;
        font-size: ${actualFontSize}px !important;
        
        /* نسب مناسبة للمحتوى */
        height: 25% !important;
        
        /* تحسينات للطابعات الحرارية */
        ${isThermal ? `
        line-height: 0.9 !important;
        letter-spacing: 0.2px !important;
        height: 22% !important;
        ` : ''}
      }
      
      .barcode-image {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        margin: ${elementSpacing} 0 !important;
        
        /* نسب مناسبة للمحتوى */
        height: 50% !important;
        
        /* تحسينات للطابعات الحرارية */
        ${isThermal ? `
        height: 56% !important;
        margin: 0.5mm 0 !important;
        ` : ''}
      }
      
      .barcode-image img {
        max-width: 100% !important;
        max-height: 100% !important;
        width: auto !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto !important;
        
        /* تحسينات جودة الصورة للطابعات الحرارية */
        ${isThermal ? `
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: crisp-edges !important;
        image-rendering: pixelated !important;
        filter: contrast(${thermalSettings?.contrast || 100}%) !important;
        ` : `
        image-rendering: auto !important;
        `}
      }
      
      .price-text {
        width: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        color: #000000 !important;
        font-weight: bold !important;
        overflow: hidden !important;
        box-sizing: border-box !important;
        margin-top: ${priceMargin} !important;
        font-size: ${priceFontSize}px !important;
        
        /* نسب مناسبة للمحتوى */
        height: 25% !important;
        
        /* تحسينات للطابعات الحرارية */
        ${isThermal ? `
        line-height: 0.9 !important;
        letter-spacing: 0.2px !important;
        height: 22% !important;
        ` : ''}
      }
      
      /* إخفاء العناصر الفارغة وإعادة توزيع المساحة */
      .price-text:empty {
        display: none !important;
      }
      
      /* ضبط التوزيع عند عدم وجود بعض العناصر */
      .barcode-container:has(.product-name:empty) .barcode-image {
        height: 70% !important;
        ${isThermal ? `
        height: 75% !important;
        ` : ''}
      }
      
      .barcode-container:has(.price-text:empty) .barcode-image {
        height: 70% !important;
        ${isThermal ? `
        height: 75% !important;
        ` : ''}
      }
      
      .barcode-container:has(.product-name:empty):has(.price-text:empty) .barcode-image {
        height: 85% !important;
        ${isThermal ? `
        height: 90% !important;
        ` : ''}
      }
    }
    
    @media screen {
      .barcode-page {
        min-height: 100vh;
        border: 1px solid #ddd;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        background: #f9f9f9;
      }
      
      .barcode-container {
        max-width: 70%;
        max-height: 70%;
        border: 2px solid #333;
        padding: 8mm;
        background: #ffffff;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        border-radius: 4px;
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: ${elementSpacing};
      }
      
      .product-name,
      .price-text {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      
      .barcode-image {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-grow: 1;
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