import type { BarcodeSettings } from '@/components/product/barcode/BarcodeSettings';

/**
 * توليد أوراق أنماط CSS للطباعة بناءً على إعدادات الباركود
 */
export const generatePrintStylesheet = (settings: BarcodeSettings): string => {
  const { 
    printFormat, 
    paperSize, 
    orientation, 
    marginTop, 
    marginRight, 
    marginBottom, 
    marginLeft,
    columns,
    rows,
    spacingX,
    spacingY,
    showBorder,
    alignment,
    labelTextAlign,
    colorScheme,
    fontFamily,
    fontColor,
    backgroundColor,
    borderColor,
    customWidth,
    customHeight
  } = settings;

  // تحديد أبعاد الصفحة
  let pageWidth, pageHeight;
  if (paperSize === 'A4') {
    pageWidth = orientation === 'portrait' ? '210mm' : '297mm';
    pageHeight = orientation === 'portrait' ? '297mm' : '210mm';
  } else if (paperSize === 'A5') {
    pageWidth = orientation === 'portrait' ? '148mm' : '210mm';
    pageHeight = orientation === 'portrait' ? '210mm' : '148mm';
  } else if (paperSize === 'label50x90') {
    pageWidth = '90mm';
    pageHeight = '50mm';
  } else if (paperSize === 'custom') {
    pageWidth = `${customWidth}mm`;
    pageHeight = `${customHeight}mm`;
  } else {
    pageWidth = '210mm'; // A4 default
    pageHeight = '297mm';
  }

  // تنسيق الألوان
  let fontColorValue = fontColor;
  let backgroundColorValue = backgroundColor;
  let borderColorValue = borderColor;
  
  if (colorScheme === 'dark') {
    fontColorValue = '#ffffff';
    backgroundColorValue = '#1a1a1a';
    borderColorValue = '#444444';
  } else if (colorScheme === 'light') {
    fontColorValue = '#000000';
    backgroundColorValue = '#ffffff';
    borderColorValue = '#eeeeee';
  }

  return `
    @page {
      size: ${pageWidth} ${pageHeight};
      margin: ${marginTop}mm ${marginRight}mm ${marginBottom}mm ${marginLeft}mm;
    }
    
    @media print {
      body {
        margin: 0;
        padding: 0;
        font-family: ${fontFamily}, sans-serif;
        color: ${fontColorValue};
        background-color: ${backgroundColorValue};
      }
      
      .print-container {
        display: grid;
        grid-template-columns: repeat(${columns}, 1fr);
        gap: ${spacingY}mm ${spacingX}mm;
        page-break-inside: avoid;
      }
      
      .barcode-item {
        padding: 5mm;
        text-align: ${labelTextAlign};
        display: flex;
        flex-direction: column;
        align-items: ${alignment === 'center' ? 'center' : alignment === 'start' ? 'flex-start' : 'flex-end'};
        ${showBorder ? `border: 1px solid ${borderColorValue};` : ''}
        background-color: ${backgroundColorValue};
        color: ${fontColorValue};
        page-break-inside: avoid;
      }
      
      .product-name {
        font-size: 12px;
        margin-bottom: 4px;
        font-weight: bold;
      }
      
      .barcode-value {
        font-family: monospace;
        font-size: 10px;
        margin-top: 2px;
      }
      
      .price {
        font-size: 14px;
        font-weight: bold;
        margin-top: 4px;
      }
      
      .sku {
        font-family: monospace;
        font-size: 10px;
        margin-top: 2px;
      }
      
      img {
        max-width: 100%;
        height: auto;
      }
      
      .no-print {
        display: none;
      }
    }
  `;
};

/**
 * تنظيف وتحضير قيمة الباركود للعرض الصحيح
 * هذه الدالة تضمن أن قيمة الباركود صالحة للطباعة
 */
export const sanitizeBarcodeValue = (value: string): string => {
  if (!value) return '';
  
  // إزالة جميع المسافات في البداية والنهاية
  let sanitized = value.trim();
  
  // تحويل الأحرف العربية إلى لاتينية إذا وجدت
  const arabicToLatinMap: Record<string, string> = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  
  for (const [arabic, latin] of Object.entries(arabicToLatinMap)) {
    sanitized = sanitized.replace(new RegExp(arabic, 'g'), latin);
  }
  
  // إزالة الأحرف الخاصة التي قد تسبب مشاكل في الباركود
  sanitized = sanitized.replace(/[^\w\d\-\.]/g, '');
  
  // التأكد من أن القيمة ليست فارغة بعد التنظيف
  if (!sanitized) {
    return '000000000000';  // قيمة افتراضية في حالة عدم وجود قيمة صالحة
  }
  
  return sanitized;
};

/**
 * توليد قيمة الباركود وفقًا لقواعد محددة
 */
export const generateBarcodeValue = (value: string, type: string): string => {
  if (!value) return '';
  
  // تنظيف القيمة أولاً
  const sanitized = sanitizeBarcodeValue(value);
  
  // تنظيف القيمة من الأحرف غير المسموح بها للباركود
  if (type === 'ean13') {
    // تنظيف للحصول على 13 رقمًا فقط
    const cleanedValue = sanitized.replace(/[^0-9]/g, '').slice(0, 13);
    
    // إذا كان الطول أقل من 13، نضيف أصفارًا في البداية
    if (cleanedValue.length < 13) {
      return cleanedValue.padStart(13, '0');
    }
    
    return cleanedValue;
  } else if (type === 'code39') {
    // تنظيف للحصول على أحرف وأرقام فقط مسموح بها في Code 39
    return sanitized.replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '').toUpperCase();
  } else if (type === 'code128' || type === 'compact128') {
    // للأرقام الطويلة مثل 2007208157077، يمكن تقسيمها إلى أجزاء أصغر
    // إذا كان الطول أكبر من 12 رقمًا وكان مكونًا من أرقام فقط
    if (sanitized.length > 12 && /^\d+$/.test(sanitized)) {
      // استخدم Code128C للأرقام (يشفر كل رقمين معًا)
      return sanitized;
    }
    
    // الحد الأقصى لطول القيمة هو 80 حرفًا
    if (sanitized.length > 80) {
      return sanitized.substring(0, 80);
    }
  }
  
  // في حالة Code 128 نعيد القيمة بعد التنظيف
  return sanitized;
};

/**
 * اختبار صحة الباركود للأنواع المختلفة
 */
export const isValidBarcode = (value: string, type: string): boolean => {
  if (!value) return false;
  
  if (type === 'ean13') {
    // التحقق من أن القيمة تحتوي على 13 رقمًا فقط
    return /^\d{13}$/.test(value);
  } else if (type === 'code39') {
    // التحقق من أن القيمة تحتوي على أحرف مسموح بها في Code 39
    return /^[A-Z0-9\-\.\ \$\/\+\%]+$/.test(value);
  }
  
  // في حالة Code 128، نسمح بأي شيء تقريبًا
  return value.length > 0 && value.length <= 128;
};

/**
 * توليد رمز QR بناءً على القيمة المعطاة
 */
export const getQRCodeUrl = (value: string, size: number = 150): string => {
  // تقليل الحجم الافتراضي من 200 إلى 150 والهامش من 10 إلى 8 لتناسب المساحة الجديدة
  return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}&margin=8&ecc=L&qzone=2`;
};

/**
 * الحصول على URL لصورة الباركود
 */
export const getBarcodeImageUrl = (
  value: string, 
  type: string = 'code128', 
  scale: number = 3,  // زيادة المقياس الافتراضي من 2 إلى 3
  height: number = 70, // زيادة الارتفاع الافتراضي من 60 إلى 70
  includeText: boolean = true,
  textSize: number = 14 // زيادة حجم النص من 12 إلى 14
): string => {
  // التحقق من القيمة وتنظيفها
  const barcodeValue = generateBarcodeValue(value, type);
  
  // تحسين نسب الباركود للطباعة
  let adjustedScale = scale;
  let adjustedHeight = height;
  let barcodeType = type;
  
  // ضبط القيم حسب نوع الباركود
  if (type === 'code128') {
    adjustedScale = Math.max(4, scale); // زيادة من 3 إلى 4
    adjustedHeight = 25; // زيادة من 20 إلى 25
  } else if (type === 'compact128') {
    // نوع جديد: باركود قصير وطويل لتوفير مساحة أكبر
    barcodeType = 'code128'; // نستخدم code128 كأساس
    adjustedScale = Math.max(5, scale); // زيادة من 4 إلى 5
    adjustedHeight = 20; // زيادة من 15 إلى 20
  } else if (type === 'code39') {
    adjustedScale = Math.max(4, scale); // زيادة من 3 إلى 4
    adjustedHeight = 25; // زيادة من 20 إلى 25
  } else if (type === 'ean13') {
    adjustedScale = Math.max(4, scale); // زيادة من 3 إلى 4
    adjustedHeight = 30; // زيادة من 25 إلى 30
  }

  // تحقق نهائي من وجود قيمة صالحة للباركود
  if (!barcodeValue || barcodeValue.length === 0) {
    return '';
  }

  // إضافة خيار "inkspread" لتحسين طباعة الباركود على الطابعات الحرارية
  return `https://bwipjs-api.metafloor.com/?bcid=${barcodeType}&text=${encodeURIComponent(barcodeValue)}&scale=${adjustedScale}&height=${adjustedHeight}&includetext=${includeText ? 'true' : 'false'}&textsize=${textSize}&inkspread=0.25`;
};

/**
 * تنسيق النص للعرض على الباركود
 */
export const formatBarcodeText = (text: string, maxLength: number = 20): string => {
  if (!text) return '';
  
  // اقتصاص النص إذا كان أطول من الحد الأقصى
  if (text.length > maxLength) {
    return `${text.substring(0, maxLength)}...`;
  }
  
  return text;
};

/**
 * تحضير قيمة الباركود للاستخدام مباشرة مع مكتبة JsBarcode
 * هذه الدالة تضمن أن القيمة صالحة للنوع المحدد من الباركود
 * @param value قيمة الباركود الأصلية
 * @param barcodeType نوع الباركود المراد استخدامه
 * @returns القيمة المحضرة الصالحة للنوع المحدد من الباركود
 */
export const prepareBarcodeValue = (value: string, barcodeType: string): string => {
  if (!value || value.trim() === '') {
    return 'DEFAULT0000';
  }

  let preparedValue = value.trim();
  
  // تنظيف وتحضير القيمة حسب نوع الباركود
  if (barcodeType === 'EAN13' || barcodeType === 'ean13') {
    // التأكد من أن القيمة هي 13 رقماً فقط
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    preparedValue = numericValue.padStart(13, '0').substring(0, 13);
  } else if (barcodeType === 'EAN8' || barcodeType === 'ean8') {
    // التأكد من أن القيمة هي 8 أرقام فقط
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    preparedValue = numericValue.padStart(8, '0').substring(0, 8);
  } else if (barcodeType.toUpperCase().startsWith('CODE128') || barcodeType.toLowerCase().startsWith('code128')) {
    // تنظيف الأحرف غير المرئية أو الخاصة
    preparedValue = preparedValue.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  } else if (barcodeType.toUpperCase() === 'CODE39' || barcodeType.toLowerCase() === 'code39') {
    // تحويل للأحرف الكبيرة وإزالة الأحرف غير المدعومة
    preparedValue = preparedValue.toUpperCase().replace(/[^A-Z0-9\-\.\ \$\/\+\%]/g, '');
  } else if (barcodeType.toUpperCase() === 'UPC' || barcodeType.toLowerCase() === 'upc') {
    // التأكد من أن القيمة هي 12 رقماً فقط
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    preparedValue = numericValue.padStart(12, '0').substring(0, 12);
  } else if (barcodeType.toUpperCase() === 'UPCE' || barcodeType.toLowerCase() === 'upce') {
    // التأكد من أن القيمة هي 8 أرقام فقط
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    preparedValue = numericValue.padStart(8, '0').substring(0, 8);
  } else if (barcodeType.toUpperCase() === 'ITF14' || barcodeType.toLowerCase() === 'itf14') {
    // التأكد من أن القيمة هي 14 رقماً فقط
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    preparedValue = numericValue.padStart(14, '0').substring(0, 14);
  } else if (barcodeType.toUpperCase() === 'ITF' || barcodeType.toLowerCase() === 'itf') {
    // التأكد من أن القيمة هي أرقام فقط وعددها زوجي
    const numericValue = preparedValue.replace(/[^0-9]/g, '');
    if (numericValue.length % 2 !== 0) {
      preparedValue = '0' + numericValue; // إضافة صفر في البداية إذا كان العدد فردياً
    } else {
      preparedValue = numericValue;
    }
  } else if (barcodeType.toUpperCase().startsWith('MSI') || barcodeType.toLowerCase().startsWith('msi')) {
    // التأكد من أن القيمة هي أرقام فقط
    preparedValue = preparedValue.replace(/[^0-9]/g, '');
  } else if (barcodeType.toLowerCase() === 'pharmacode') {
    // التأكد من أن القيمة هي أرقام فقط بين 3 و 131070
    const numericValue = parseInt(preparedValue.replace(/[^0-9]/g, ''), 10);
    if (isNaN(numericValue) || numericValue < 3 || numericValue > 131070) {
      preparedValue = '3'; // قيمة افتراضية إذا كانت القيمة غير صالحة
    } else {
      preparedValue = numericValue.toString();
    }
  } else if (barcodeType.toLowerCase() === 'codabar') {
    // التأكد من أن القيمة تبدأ وتنتهي بـ A, B, C, أو D وتحتوي على أرقام وبعض الرموز في الوسط
    const validChars = '0123456789-$:/.+';
    let cleanValue = '';
    
    for (let i = 0; i < preparedValue.length; i++) {
      const char = preparedValue.charAt(i);
      if (validChars.includes(char) || (i === 0 || i === preparedValue.length - 1) && 'ABCD'.includes(char.toUpperCase())) {
        cleanValue += char.toUpperCase();
      }
    }
    
    // إضافة A في البداية والنهاية إذا لم تكن موجودة
    if (!cleanValue.match(/^[ABCD]/i)) {
      cleanValue = 'A' + cleanValue;
    }
    if (!cleanValue.match(/[ABCD]$/i)) {
      cleanValue = cleanValue + 'A';
    }
    
    preparedValue = cleanValue;
  }
  
  // التأكد من أن القيمة ليست فارغة بعد التنظيف
  if (!preparedValue || preparedValue.trim() === '') {
    return 'DEFAULT0000';
  }
  
  return preparedValue;
};
