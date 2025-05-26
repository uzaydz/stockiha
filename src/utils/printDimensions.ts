/**
 * حساب أبعاد الطباعة المحسّنة
 */

import type { PrintSettings, PageDimensions, PaperSizeType } from './printTypes';

/**
 * حساب أبعاد الصفحة والعناصر بناءً على الإعدادات
 */
export const calculatePageDimensions = (settings: PrintSettings): PageDimensions => {
  // تحديد نوع الورق
  const paperType = settings.paperSize as PaperSizeType;
  const isCustom = paperType === 'custom';
  const isThermal = paperType.includes('thermal') || paperType === 'label50x90';
  const isSmallLabel = isThermal || 
    (isCustom && settings.customWidth && settings.customHeight && 
     settings.customWidth <= 70 && settings.customHeight <= 120);

  // إعدادات افتراضية
  let pageSize = 'A4';
  let marginSize = '1mm';
  let containerMaxWidth = '95%';
  let actualFontSize = Math.max(6, Math.min(settings.fontSize, 12));
  let priceFontSize = actualFontSize;
  let barcodeSize = '100%';
  let nameMargin = '1mm';
  let priceMargin = '1mm';
  let elementSpacing = '0.2mm';
  let containerPadding = '1mm';

  // حساب الأبعاد بناءً على نوع الورق
  switch (paperType) {
    case 'label50x90':
      pageSize = '50mm 90mm';
      marginSize = '1mm';
      containerMaxWidth = '98%';
      actualFontSize = Math.max(4, Math.min(settings.fontSize, 12));
      priceFontSize = actualFontSize;
      nameMargin = '0.5mm';
      priceMargin = '0.5mm';
      elementSpacing = '0.1mm';
      containerPadding = '1mm';
      break;

    case 'thermal58':
      pageSize = '58mm 80mm';
      marginSize = '0.5mm';
      containerMaxWidth = '98%';
      actualFontSize = Math.max(4, Math.min(settings.fontSize, 10));
      priceFontSize = actualFontSize;
      nameMargin = '0.3mm';
      priceMargin = '0.3mm';
      elementSpacing = '0.1mm';
      containerPadding = '0.5mm';
      break;

    case 'thermal80':
      pageSize = '80mm 100mm';
      marginSize = '1mm';
      containerMaxWidth = '98%';
      actualFontSize = Math.max(5, Math.min(settings.fontSize, 14));
      priceFontSize = actualFontSize;
      nameMargin = '0.5mm';
      priceMargin = '0.5mm';
      elementSpacing = '0.2mm';
      containerPadding = '1mm';
      break;

    case 'thermal110':
      pageSize = '110mm 120mm';
      marginSize = '1mm';
      containerMaxWidth = '96%';
      actualFontSize = Math.max(6, Math.min(settings.fontSize, 16));
      priceFontSize = actualFontSize;
      nameMargin = '0.5mm';
      priceMargin = '0.5mm';
      elementSpacing = '0.2mm';
      containerPadding = '1mm';
      break;

    case 'A5':
      pageSize = settings.orientation === 'landscape' ? '210mm 148mm' : '148mm 210mm';
      marginSize = '2mm';
      containerMaxWidth = '94%';
      actualFontSize = Math.max(6, Math.min(settings.fontSize, 20));
      priceFontSize = actualFontSize;
      nameMargin = '0.5mm';
      priceMargin = '0.5mm';
      elementSpacing = '0.3mm';
      containerPadding = '1.5mm';
      break;

    case 'custom':
      if (settings.customWidth && settings.customHeight) {
        if (isSmallLabel) {
          // للملصقات الصغيرة، استخدم الأبعاد الفعلية
          pageSize = `${settings.customWidth}mm ${settings.customHeight}mm`;
          marginSize = '0.5mm';
          containerMaxWidth = '98%';
          actualFontSize = Math.max(4, Math.min(settings.fontSize, 14));
          elementSpacing = '0.1mm';
          containerPadding = '0.5mm';
        } else {
          // للأحجام الكبيرة، طبق الاتجاه
          pageSize = settings.orientation === 'landscape' ? 
            `${settings.customHeight}mm ${settings.customWidth}mm` : 
            `${settings.customWidth}mm ${settings.customHeight}mm`;
          marginSize = '2mm';
          containerMaxWidth = '92%';
          actualFontSize = Math.max(6, Math.min(settings.fontSize, 24));
          elementSpacing = '0.3mm';
          containerPadding = '2mm';
        }
        nameMargin = '0.5mm';
        priceMargin = '0.5mm';
        priceFontSize = actualFontSize;
        
        // تحسينات إضافية للأحجام المخصصة الصغيرة جداً
        if (settings.customWidth <= 40 || settings.customHeight <= 60) {
          marginSize = '0.2mm';
          containerMaxWidth = '99%';
          actualFontSize = Math.max(3, Math.min(settings.fontSize, 10));
          priceFontSize = actualFontSize;
          elementSpacing = '0.05mm';
          containerPadding = '0.2mm';
          nameMargin = '0.2mm';
          priceMargin = '0.2mm';
        }
      }
      break;

    default: // A4
      pageSize = settings.orientation === 'landscape' ? '297mm 210mm' : '210mm 297mm';
      marginSize = '3mm';
      containerMaxWidth = '90%';
      actualFontSize = Math.max(8, Math.min(settings.fontSize, 28));
      priceFontSize = actualFontSize;
      nameMargin = '1mm';
      priceMargin = '1mm';
      elementSpacing = '0.5mm';
      containerPadding = '3mm';
      break;
  }

  // تطبيق تعديلات الجودة
  if (settings.quality === 'thermal') {
    // تحسينات خاصة بالطابعات الحرارية
    actualFontSize = Math.max(actualFontSize - 1, 4);
    priceFontSize = actualFontSize;
    elementSpacing = '0.1mm';
  } else if (settings.quality === 'high') {
    // تحسينات للجودة العالية - نسمح بخط أكبر
    actualFontSize = Math.min(actualFontSize + 2, 32); // زيادة الحد الأقصى للجودة العالية
    priceFontSize = actualFontSize;
    elementSpacing = '0.3mm';
  }

  // تطبيق تعديلات المسافات المخصصة
  if (settings.spacing) {
    elementSpacing = `${settings.spacing}mm`;
  }

  // تطبيق تعديلات الهامش المخصص
  if (settings.margin) {
    marginSize = `${settings.margin}mm`;
    containerPadding = `${settings.margin}mm`;
  }

  return {
    pageSize,
    marginSize,
    containerMaxWidth,
    actualFontSize,
    priceFontSize,
    barcodeSize,
    nameMargin,
    priceMargin,
    elementSpacing,
    containerPadding,
    isSmallLabel,
    isThermal
  };
};

/**
 * حساب أبعاد الطباعة المتعددة
 */
export const calculateMultipleDimensions = (
  columns: number,
  rows: number,
  paperSize: string,
  customWidth?: number,
  customHeight?: number
) => {
  let pageSize = 'A4';
  let itemSpacing = '2mm';
  let gridGap = '1mm';
  let fontSize = 6;

  switch (paperSize) {
    case 'thermal58':
      pageSize = '58mm 200mm'; // طويل للطباعة المتعددة
      itemSpacing = '0.5mm';
      gridGap = '0.3mm';
      fontSize = 4;
      break;

    case 'thermal80':
      pageSize = '80mm 200mm';
      itemSpacing = '1mm';
      gridGap = '0.5mm';
      fontSize = 5;
      break;

    case 'thermal110':
      pageSize = '110mm 200mm';
      itemSpacing = '1.5mm';
      gridGap = '1mm';
      fontSize = 6;
      break;

    case 'A5':
      pageSize = 'A5';
      itemSpacing = '1.5mm';
      gridGap = '1mm';
      fontSize = 7;
      break;

    case 'custom':
      if (customWidth && customHeight) {
        pageSize = `${customWidth}mm ${customHeight}mm`;
        
        // حساب المسافات بناءً على الحجم
        const avgDimension = (customWidth + customHeight) / 2;
        if (avgDimension < 80) {
          itemSpacing = '0.5mm';
          gridGap = '0.3mm';
          fontSize = 4;
        } else if (avgDimension < 150) {
          itemSpacing = '1mm';
          gridGap = '0.5mm';
          fontSize = 5;
        } else {
          itemSpacing = '2mm';
          gridGap = '1mm';
          fontSize = 7;
        }
      }
      break;

    default: // A4
      pageSize = 'A4';
      itemSpacing = '3mm';
      gridGap = '2mm';
      fontSize = 8;
      break;
  }

  return {
    pageSize,
    itemSpacing,
    gridGap,
    fontSize,
    itemWidth: `calc((100% - ${gridGap} * ${columns - 1}) / ${columns})`,
    itemHeight: `calc((100% - ${gridGap} * ${rows - 1}) / ${rows})`
  };
};

/**
 * حساب أبعاد الباركود المفرد
 */
export const calculateSingleBarcodeDimensions = (size: 'small' | 'medium' | 'large') => {
  const sizes = {
    small: {
      width: '40mm',
      height: '25mm',
      barcodeSize: '100%',
      fontSize: 4,
      priceSize: 4,
      spacing: '0.1mm',
      padding: '0.5mm'
    },
    medium: {
      width: '60mm',
      height: '35mm',
      barcodeSize: '100%',
      fontSize: 6,
      priceSize: 6,
      spacing: '0.2mm',
      padding: '1mm'
    },
    large: {
      width: '90mm',
      height: '50mm',
      barcodeSize: '100%',
      fontSize: 8,
      priceSize: 8,
      spacing: '0.3mm',
      padding: '1.5mm'
    }
  };

  return sizes[size];
};

/**
 * تحسين الأبعاد للطابعات الحرارية
 */
export const optimizeForThermalPrinter = (dimensions: PageDimensions): PageDimensions => {
  return {
    ...dimensions,
    actualFontSize: Math.max(dimensions.actualFontSize - 1, 4),
    priceFontSize: Math.max(dimensions.priceFontSize - 1, 4),
    elementSpacing: '0.1mm',
    nameMargin: '0.2mm',
    priceMargin: '0.2mm',
    containerPadding: '0.5mm'
  };
};

/**
 * تحسين الأبعاد للجودة العالية
 */
export const optimizeForHighQuality = (dimensions: PageDimensions): PageDimensions => {
  return {
    ...dimensions,
    actualFontSize: Math.min(dimensions.actualFontSize + 2, 20),
    priceFontSize: Math.min(dimensions.priceFontSize + 2, 20),
    elementSpacing: '0.5mm',
    nameMargin: '1mm',
    priceMargin: '1mm',
    containerPadding: '2mm'
  };
}; 