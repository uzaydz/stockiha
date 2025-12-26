import type { Options as JsBarcodeBaseOptions } from 'jsbarcode';

// ⚡ Extended JsBarcode Options - يشمل خصائص إضافية للطباعة الحرارية
export type JsBarcodeOptions = JsBarcodeBaseOptions & {
  flat?: boolean;  // خطوط مسطحة (مهمة للطباعة الحرارية)
};

export interface BarcodeTemplate {
  id: string;
  name: string;
  description?: string;
  // CSS string that will be injected into the print window
  css: string;
  // Specific JsBarcode options for this template, overrides general settings if provided
  jsBarcodeOptions?: Partial<JsBarcodeOptions>;
}

// ========================================
// 🎨 Classic Template - كلاسيكي مرن (Flexible Classic)
// ========================================
const classicTemplateCss = `
  .barcode-label.template-classic {
    width: 100% !important;
    height: 100% !important;
    padding: 1mm !important; /* تقليل الهوامش */
    background: #fff;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: space-between !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
  }
  
  .barcode-label.template-classic .org-name {
    font-size: 7pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #444;
    width: 100%;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-bottom: 0.2mm;
    border-bottom: 0.5px solid #eee;
    flex-shrink: 0; /* منع تقلص الاسم */
  }
  
  .barcode-label.template-classic .product-name {
    font-size: 8pt;
    font-weight: 600;
    text-align: center;
    line-height: 1.1;
    margin: 0.5mm 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    flex-grow: 1; /* السماح بالتمدد */
    flex-shrink: 1; /* السماح بالتقلص */
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .barcode-label.template-classic svg,
  .barcode-label.template-classic img {
    width: auto !important;
    max-width: 95% !important;
    height: auto !important;
    max-height: 45% !important; /* تقليل الحد الاقصى للارتفاع */
    object-fit: contain;
    flex-shrink: 1; /* الباركود ينكمش عند الضرورة */
    min-height: 0; /* مهم لـ Flexbox */
  }
  
  .barcode-label.template-classic .price-sku-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin-top: 0.5mm;
    padding-top: 0.5mm;
    border-top: 0.5px solid #eee;
    flex-shrink: 0;
  }
  
  .barcode-label.template-classic .price {
    font-size: 10pt;
    font-weight: 800;
    color: #000;
  }
  
  .barcode-label.template-classic .sku {
    font-size: 6pt;
    color: #666;
    font-family: monospace;
  }
`;

// ========================================
// 📦 Compact Template - مدمج ذكي (Smart Compact)
// ========================================
const compactTemplateCss = `
  .barcode-label.template-compact {
    width: 100% !important;
    height: 100% !important;
    padding: 0.5mm !important;
    background: #fff;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
  }
  
  .barcode-label.template-compact .product-name {
    font-size: 8pt;
    font-weight: 700;
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 100%;
    margin-bottom: 0.2mm;
    flex-shrink: 0;
  }
  
  .barcode-label.template-compact svg,
  .barcode-label.template-compact img {
    width: auto !important;
    max-width: 98% !important;
    height: auto !important;
    max-height: 60% !important;
    object-fit: contain;
    flex-grow: 1;
    flex-shrink: 1;
    min-height: 0;
  }
  
  .barcode-label.template-compact .price {
    font-size: 10pt;
    font-weight: 900;
    text-align: center;
    margin-top: 0.2mm;
    width: 100%;
    flex-shrink: 0;
  }
  
  .barcode-label.template-compact .org-name,
  .barcode-label.template-compact .sku {
    display: none;
  }
`;

// ========================================
// ✨ Ideal Template - عصري مفتوح (Airy Modern)
// ========================================
const idealTemplateCss = `
  .barcode-label.template-ideal {
    width: 100% !important;
    height: 100% !important;
    padding: 1.5mm !important;
    background: #fff;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
  }
  
  .barcode-label.template-ideal .org-name {
    font-size: 6pt;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    width: 100%;
    text-align: center;
    margin-bottom: 0.5mm;
    flex-shrink: 0;
  }
  
  .barcode-label.template-ideal .main-content {
    display: flex;
    flex-direction: row;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    flex-grow: 1;
    min-height: 0; /* يسمح للانكماش */
  }
  
  .barcode-label.template-ideal .text-details {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 1mm;
    min-width: 0; /* لمنع تجاوز النص */
  }
  
  .barcode-label.template-ideal .product-name {
    font-size: 9pt;
    font-weight: 700;
    line-height: 1.1;
    margin-bottom: 1mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  
  .barcode-label.template-ideal .price {
    font-size: 11pt;
    font-weight: 900;
  }
  
  .barcode-label.template-ideal .barcode-container {
    width: 45%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }
  
  .barcode-label.template-ideal svg,
  .barcode-label.template-ideal img {
    width: 100% !important;
    height: auto !important;
    max-height: 100% !important;
    object-fit: contain;
  }
  
  .barcode-label.template-ideal .sku {
    display: none;
  }
`;

// ========================================
// 📱 QR + Barcode Template - التصميم المثالي (Perfect Layout)
// ========================================
const qrPlusBarcodeCss = `
  /* ============================================
   * QR + Barcode Template - ULTIMATE DESIGN
   * تصميم احترافي متناسق جداً (Golden Ratio Layout)
   * ============================================ */
  
  /* الحاوية الرئيسية للملصق */
  .barcode-label.template-qr-plus-barcode {
    width: 100% !important;
    height: 100% !important;
    padding: 0.5mm !important; /* تقليل الهوامش لأقصى حد */
    box-sizing: border-box !important;
    background: #fff;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
    font-family: 'Tajawal', 'Segoe UI', sans-serif;
  }

  /* 1️⃣ رأس الملصق: اسم المتجر */
  .store-name-header-new {
    flex: 0 0 auto;
    width: 100%;
    text-align: center;
    font-size: 6pt !important;
    font-weight: 800 !important;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #444;
    border-bottom: 0.5px solid #eaeaea;
    padding-bottom: 0.2mm;
    margin-bottom: 0.2mm;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 2️⃣ الجسم الرئيسي: QR + تفاصيل */
  .main-content-wrapper-new {
    flex: 1 1 auto; /* يأخذ المساحة المتبقية */
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.5mm !important;
    min-height: 0; /* مهم للـ Flexbox */
    width: 100%;
  }

  /* --- القسم الأيمن: QR Code --- */
  .qr-code-container-new {
    flex: 0 0 32% !important;
    width: 32% !important;
    display: flex;
    justify-content: center;
    align-items: center;
    min-width: 0; /* لمنع الانفجار */
  }

  .qr-code-container-new img,
  .qr-code-container-new svg {
    width: 100% !important;
    height: auto !important;
    max-height: 100% !important;
    object-fit: contain;
    /* إزالة الحدود من الصورة نفسها */
    border: none !important;
  }

  /* --- القسم الأيسر: تفاصيل المنتج --- */
  .product-details-area-new {
    flex: 0 0 66% !important;
    width: 66% !important;
    display: flex;
    flex-direction: column;
    justify-content: center; /* توسيط عمودي */
    height: 100%;
    min-width: 0;
  }

  .info-table-new {
    display: flex;
    flex-direction: column;
    gap: 0.5mm;
    width: 100%;
    height: 100%;
    justify-content: space-around;
  }

  .info-table-row-new {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
  }

  /* اسم المنتج */
  .product-name-row-new {
    flex: 1 1 auto; /* قابل للتمدد */
    min-height: 0;
  }
  .info-value-new.product-name-value-new {
    font-size: 7.5pt !important;
    font-weight: 700 !important;
    line-height: 1.1 !important;
    text-align: center;
    display: -webkit-box;
    -webkit-line-clamp: 2; /* سطرين كحد أقصى */
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* الباركود */
  .barcode-row-new {
    flex: 1 1 auto;
    margin: 0.5mm 0;
    min-height: 0;
  }
  .barcode-svg-container-new {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
  }
  .barcode-svg-container-new img,
  .barcode-svg-container-new svg {
    width: 95% !important;
    height: auto !important;
    max-height: 100% !important; /* سيتم ضبطه تلقائياً */
    object-fit: contain;
  }

  /* السعر */
  .price-row-new {
    flex: 0 0 auto;
  }
  .info-value-new.price-value-new {
    font-size: 9pt !important;
    font-weight: 900 !important;
    color: #000;
  }

  /* 3️⃣ تذييل: رابط الموقع (اختياري) */
  .site-url-footer-new {
    display: none; /* مخفي لتوفير المساحة */
  }
`;

// ========================================
// � Premium Template - بوتيك فاخر (Boutique Luxury)
// ========================================
const premiumTemplateCss = `
  .barcode-label.template-premium {
    width: 100% !important;
    height: 100% !important;
    padding: 0 !important;
    background: #fff;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
    page-break-inside: avoid !important;
  }
  
  /* رأس أسود مميز */
  .barcode-label.template-premium .header {
    background: #000;
    color: #fff;
    padding: 0.5mm 0;
    text-align: center;
    width: 100%;
    margin-bottom: 0.5mm;
    flex-shrink: 0;
  }
  
  .barcode-label.template-premium .org-name {
    font-size: 7pt;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: #fff;
    text-transform: uppercase;
  }
  
  .barcode-label.template-premium .content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0 1mm;
    width: 100%;
    min-height: 0;
  }
  
  .barcode-label.template-premium .product-name {
    font-size: 8pt;
    font-weight: 800;
    text-align: center;
    margin-bottom: 0.5mm;
    width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex-shrink: 0;
  }
  
  .barcode-label.template-premium svg,
  .barcode-label.template-premium img {
    width: auto !important;
    max-width: 95% !important;
    height: auto !important;
    max-height: 60% !important;
    object-fit: contain;
    flex-shrink: 1;
    min-height: 0;
  }
  
  .barcode-label.template-premium .footer {
    padding: 0.5mm 2mm;
    display: flex;
    justify-content: center;
    align-items: center;
    border-top: 1px dotted #ccc;
    margin-top: 0.5mm;
    width: 90%;
    align-self: center;
    flex-shrink: 0;
  }
  
  .barcode-label.template-premium .price {
    font-size: 10pt;
    font-weight: 900;
  }
  
  .barcode-label.template-premium .sku {
    display: none;
  }
  
  @media print {
    .barcode-label.template-premium .header {
      background: #000 !important;
      color: #fff !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
  }
`;

// ========================================
// 📤 Export Templates
// ========================================
export const barcodeTemplates: BarcodeTemplate[] = [
  {
    id: "default",
    name: "افتراضي (قياسي)",
    description: "التصميم القياسي - مرن ومحسن",
    css: `
      /* Default styles - Base template */
      .barcode-label.template-default {
        width: 100% !important;
        height: 100% !important;
        padding: 1mm !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: space-between !important;
        background: #fff;
        overflow: hidden !important;
        page-break-inside: avoid !important;
        box-sizing: border-box !important;
      }
      .barcode-label.template-default .org-name {
        font-size: 6pt;
        text-align: center;
        color: #555;
        flex-shrink: 0;
      }
      .barcode-label.template-default .product-name {
        font-size: 7.5pt; 
        font-weight: 700;
        text-align: center;
        margin: 0.5mm 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0;
      }
      .barcode-label.template-default .price {
        font-size: 9pt; 
        font-weight: 700;
        text-align: center;
        flex-shrink: 0;
      }
      .barcode-label.template-default .sku {
        font-size: 5.5pt;
        text-align: center;
        color: #666;
        font-family: 'Courier New', monospace;
        flex-shrink: 0;
      }
      .barcode-label.template-default svg,
      .barcode-label.template-default img {
        width: auto !important;
        max-width: 95% !important;
        height: auto !important;
        max-height: 50% !important;
        object-fit: contain;
        flex-shrink: 1;
        min-height: 0;
      }
      
      @media print {
        .barcode-label.template-default svg {
          shape-rendering: crispEdges !important;
        }
      }
    `,
    jsBarcodeOptions: {
      height: 35,
      width: 2,
      fontSize: 10,
      margin: 2,
      displayValue: true,
      fontOptions: "bold",
    },
  },
  {
    id: "classic",
    name: "كلاسيكي",
    description: "تصميم تقليدي مرن",
    css: classicTemplateCss,
    jsBarcodeOptions: {
      height: 30, // تقليل الارتفاع ليتناسب مع الملصقات الصغيرة
      width: 1.8,
      fontSize: 9,
      margin: 1,
      displayValue: true,
      flat: true,
    },
  },
  {
    id: "compact",
    name: "مدمج",
    description: "تصميم مركز للملصقات الصغيرة",
    css: compactTemplateCss,
    jsBarcodeOptions: {
      height: 40,
      width: 2.0,
      displayValue: false,
      margin: 0,
      flat: true,
    },
  },
  {
    id: "ideal",
    name: "المثالي",
    description: "تصميم عصري واسع",
    css: idealTemplateCss,
    jsBarcodeOptions: {
      height: 32,
      width: 1.8,
      displayValue: true,
      fontSize: 8,
      textMargin: 1,
      margin: 2,
      fontOptions: "bold",
      flat: true,
    },
  },
  {
    id: "qr-plus-barcode",
    name: "QR + باركود (المثالي)",
    description: "الأفضل للمسح السريع والتوافق",
    css: qrPlusBarcodeCss,
    jsBarcodeOptions: {
      // ⚡ إعدادات محسّنة للمسح السريع
      height: 40,
      width: 1.8,
      fontSize: 8,
      displayValue: true,
      margin: 0,
      textMargin: 1,
      fontOptions: "bold",
      flat: true,
      background: "#ffffff",
      lineColor: "#000000",
    },
  },
  {
    id: "premium",
    name: "احترافي (Boutique)",
    description: "تصميم فاخر للعلامات التجارية",
    css: premiumTemplateCss,
    jsBarcodeOptions: {
      height: 30,
      width: 1.8,
      fontSize: 8,
      displayValue: true,
      margin: 1,
      textMargin: 1,
      fontOptions: "bold",
      flat: true,
    },
  },
];

// ========================================
// 🔧 Helper Functions
// ========================================

/**
 * الحصول على قالب بالـ ID
 */
export const getTemplateById = (id: string): BarcodeTemplate => {
  return barcodeTemplates.find(t => t.id === id) || barcodeTemplates[0];
};

/**
 * الحصول على خيارات الباركود المحسّنة للمسح
 */
export const getOptimizedBarcodeOptions = (templateId: string): Partial<JsBarcodeOptions> => {
  const template = getTemplateById(templateId);

  // دمج الإعدادات الافتراضية مع إعدادات القالب
  const baseOptions: Partial<JsBarcodeOptions> = {
    format: "CODE128",
    lineColor: "#000000",
    background: "#ffffff",
    flat: true, // مهم للطباعة الحرارية
  };

  return {
    ...baseOptions,
    ...template.jsBarcodeOptions,
  };
};

/**
 * التحقق من أن الباركود قابل للمسح
 * يُرجع true إذا كانت الإعدادات مثالية للمسح
 */
export const isScanOptimized = (options: Partial<JsBarcodeOptions>): boolean => {
  const minHeight = 25;
  const minWidth = 1.5;

  return (
    (options.height ?? 0) >= minHeight &&
    (options.width ?? 0) >= minWidth &&
    options.flat === true
  );
};
