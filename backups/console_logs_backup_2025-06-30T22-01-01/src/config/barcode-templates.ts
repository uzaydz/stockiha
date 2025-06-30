import type { Options as JsBarcodeOptions } from 'jsbarcode';

export interface BarcodeTemplate {
  id: string;
  name: string;
  description?: string;
  // CSS string that will be injected into the print window
  css: string; 
  // Specific JsBarcode options for this template, overrides general settings if provided
  jsBarcodeOptions?: Partial<JsBarcodeOptions>;
}

const classicTemplateCss = `
  /* Classic Template Styles */
  .barcode-label.template-classic {
    padding: 2mm;
    border: 0.5px solid #888;
  }
  .barcode-label.template-classic .org-name {
    font-size: 7pt;
    font-weight: bold;
    margin-bottom: 1mm;
    text-align: center;
  }
  .barcode-label.template-classic .product-name {
    font-size: 8pt;
    font-weight: bold;
    margin-bottom: 0.5mm;
    text-align: center;
  }
  .barcode-label.template-classic .price {
    font-size: 7pt;
    font-weight: normal;
    margin-top: 0.5mm;
    text-align: center;
  }
  .barcode-label.template-classic .sku {
    font-size: 6pt;
    color: #555;
    margin-top: 0.5mm;
    text-align: center;
  }
  .barcode-label.template-classic svg {
    max-height: 45% !important; /* Allow more space for text */
  }
`;

const compactTemplateCss = `
  /* Compact Template Styles */
  .barcode-label.template-compact {
    padding: 1mm;
    border: none; /* No border for a cleaner look */
  }
  .barcode-label.template-compact .org-name {
    display: none; /* Typically not shown in compact layouts */
  }
  .barcode-label.template-compact .product-name {
    font-size: 7pt;
    font-weight: bold;
    text-align: center;
    margin-bottom: 0.2mm;
    white-space: normal; /* Allow wrapping for longer names */
    line-height: 1.1;
  }
  .barcode-label.template-compact .price {
    font-size: 6.5pt;
    font-weight: bold;
    text-align: center;
    margin-top: 0.2mm;
  }
  .barcode-label.template-compact .sku {
    font-size: 5.5pt;
    color: #333;
    text-align: center;
    margin-top: 0.2mm;
  }
  .barcode-label.template-compact svg {
    max-height: 60% !important; /* Barcode takes more prominence */
    margin-top: 0.5mm;
    margin-bottom: 0.5mm;
  }
`;

const idealTemplateCss = `
  /* Ideal Template Styles */
  .barcode-label.template-ideal {
    padding: 2.5mm; /* More padding for a cleaner, spacious look */
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    display: flex; /* Use flexbox for better control */
    flex-direction: column;
    align-items: center;
    justify-content: space-between; /* Distribute space */
    text-align: center;
  }
  .barcode-label.template-ideal .org-name {
    font-size: 5.5pt; /* Smaller for org name */
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 1mm;
  }
  .barcode-label.template-ideal .product-name {
    font-size: 8pt; /* Prominent product name */
    font-weight: 600; /* Semi-bold */
    margin-bottom: 1mm;
    line-height: 1.15; /* Slightly more line height if it wraps */
  }
  .barcode-label.template-ideal .divider {
    width: 70%;
    height: 0.25mm;
    background-color: #B0B0B0; /* Light gray, will be black on thermal */
    margin-top: 1mm;
    margin-bottom: 1.5mm;
  }
  .barcode-label.template-ideal svg {
    max-height: 35% !important; /* Adjust barcode height relative to other elements */
    width: 90% !important;   /* Ensure it doesn't touch edges */
    margin-top: 0.5mm;
    margin-bottom: 0.5mm;
  }
  .barcode-label.template-ideal .price-sku-container {
    display: flex;
    justify-content: space-around; /* Space out price and SKU if on same "line" */
    width: 100%;
    margin-top: 1mm;
  }
  .barcode-label.template-ideal .price {
    font-size: 7.5pt;
    font-weight: 600;
  }
  .barcode-label.template-ideal .sku {
    font-size: 6pt;
    color: #444;
  }
  /* Hide elements if not checked in settings */
  .barcode-label.template-ideal .org-name:empty,
  .barcode-label.template-ideal .product-name:empty,
  .barcode-label.template-ideal .price:empty,
  .barcode-label.template-ideal .sku:empty,
  .barcode-label.template-ideal .divider:empty {
    display: none;
  }
`;

export const barcodeTemplates: BarcodeTemplate[] = [
  {
    id: "default",
    name: "افتراضي (قياسي)",
    description: "التصميم القياسي الأساسي للملصق.",
    css: `
      /* Default styles - these are the base styles we had before */
      .barcode-label.template-default .org-name {
        font-size: 6pt;
        text-align: center;
      }
      .barcode-label.template-default .product-name {
        font-size: 7pt; 
        font-weight: bold;
        text-align: center;
      }
      .barcode-label.template-default .price {
        font-size: 7pt; 
        font-weight: bold;
        text-align: center;
      }
      .barcode-label.template-default .sku {
        font-size: 6pt;
        text-align: center;
      }
      .barcode-label.template-default svg {
        max-height: 50% !important;
      }
    `,
    jsBarcodeOptions: {
      // No specific overrides for default, uses general settings
    },
  },
  {
    id: "classic",
    name: "كلاسيكي",
    description: "تصميم تقليدي مع حدود واضحة.",
    css: classicTemplateCss,
    jsBarcodeOptions: {
      height: 25, // Slightly shorter barcode for classic look
      fontSize: 7,
    },
  },
  {
    id: "compact",
    name: "مدمج",
    description: "تصميم صغير وموفر للمساحة، مثالي للملصقات الصغيرة.",
    css: compactTemplateCss,
    jsBarcodeOptions: {
      height: 35, // Taller barcode for compact look
      displayValue: false, // Often hide text value in compact to save space
      margin: 1, // Minimal margin
    },
  },
  {
    id: "ideal",
    name: "المثالية",
    description: "تصميم عصري وأنيق مع تركيز على الوضوح.",
    css: idealTemplateCss,
    jsBarcodeOptions: {
      height: 28,        // Specific height for this template's balance
      displayValue: true,  // Usually good to show value for clarity
      fontSize: 7,       // Font size for the displayed barcode value
      textMargin: 1,
      margin: 3,         // Overall margin for the barcode SVG itself
      fontOptions: "normal", // Default font weight for barcode text
      // width: 1.8, // Slightly wider bars if needed
    },
  },
  {
    id: "qr-plus-barcode",
    name: "QR مع باركود (عصري)",
    description: "يعرض QR Code لرابط المنتج بجانب باركود تقليدي.",
    css: `
      /* Styles for qr-plus-barcode template */
      .barcode-label.template-qr-plus-barcode {
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
        align-items: stretch !important;
        padding: 1.5mm !important; /* Reduced padding for more content space */
        height: 100%;
        box-sizing: border-box;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
        overflow: hidden; /* Prevent content from spilling out of the label */
      }
      .barcode-label.template-qr-plus-barcode .store-name-header-new {
        font-size: 6pt !important; /* تقليل حجم الخط لتوفير مساحة أكبر */
        font-weight: bold !important;
        text-align: center;
        width: 100%;
        margin-bottom: 0.5mm; /* تقليل الهامش */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        flex-shrink: 0; /* Do not shrink header */
      }
      .barcode-label.template-qr-plus-barcode .main-content-wrapper-new {
        display: flex !important;
        flex-direction: row !important;
        justify-content: space-between !important;
        align-items: center !important;
        width: 100%;
        flex-grow: 1; /* Allow this section to take available space */
        gap: 1mm; /* تقليل المسافة بين العناصر */
        min-height: 0; /* Crucial for nested flex elements */
        overflow: hidden; /* Prevent internal overflow */
      }
      .barcode-label.template-qr-plus-barcode .qr-code-container-new {
        flex: 0 0 40% !important; /* تقليل مساحة الـ QR Code من 50% إلى 40% */
        max-width: 40% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        align-self: stretch;
        min-height: 0; /* Prevent flex item from growing unexpectedly */
      }
      .barcode-label.template-qr-plus-barcode .qr-code-container-new svg {
        max-width: 90% !important; /* تقليل حجم الـ QR code إلى 90% من مساحة الحاوية */
        max-height: 90% !important;
        object-fit: contain !important;
      }
      .barcode-label.template-qr-plus-barcode .product-details-area-new {
        flex: 1 1 auto !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: center;
        min-width: 0; /* Prevent pushing QR code out */
        overflow: hidden; /* Hide overflow from product details */
      }
      .barcode-label.template-qr-plus-barcode .info-table-new {
        display: flex !important;
        flex-direction: column !important;
        width: 100%;
        justify-content: center;
        flex-shrink: 1; /* Allow shrinking if needed */
      }
      .barcode-label.template-qr-plus-barcode .info-table-row-new {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        border-bottom: 0.2mm solid #444 !important;
        padding: 0.3mm 0.2mm !important; /* تقليل المساحة الداخلية */
        min-height: 3.5mm; /* تقليل الارتفاع الأدنى */
        flex-shrink: 0;
      }
      .barcode-label.template-qr-plus-barcode .product-name-row-new {
         font-size: 7.5pt !important; /* تقليل حجم الخط */
         font-weight: bold !important;
         text-align: center;
         min-height: 5mm; /* تقليل الارتفاع */
         padding: 0.3mm 0.2mm 0.1mm 0.2mm !important;
      }
      .barcode-label.template-qr-plus-barcode .product-name-row-new .info-value-new {
          white-space: normal;
          line-height: 1.1;
          text-overflow: ellipsis;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2; /* Max 2 lines */
          -webkit-box-orient: vertical;
          max-height: 2.2em; /* تقليل الارتفاع الأقصى */
      }
      .barcode-label.template-qr-plus-barcode .barcode-row-new {
         border-bottom: 0.2mm solid #444 !important;
         padding: 0 !important;
         min-height: 12mm !important; /* زيادة المساحة للباركود من 8mm إلى 12mm */
         display: flex;
         align-items: center;
         justify-content: center;
      }
      .barcode-label.template-qr-plus-barcode .barcode-svg-container-new {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .barcode-label.template-qr-plus-barcode .barcode-svg-container-new svg {
        max-width: 100% !important;
        height: 100% !important;
        width: 100% !important;
      }
      
      /* تحسينات خاصة بالطباعة الحرارية للباركود */
      @media print {
        .barcode-label.template-qr-plus-barcode .barcode-svg-container-new svg {
          /* تحسين جودة الطباعة للباركود */
          shape-rendering: crispEdges !important;
          image-rendering: pixelated !important;
          image-rendering: -moz-crisp-edges !important;
          image-rendering: crisp-edges !important;
          /* ضمان عدم تشويه الباركود */
          width: 100% !important;
          height: auto !important;
          max-height: 11mm !important; /* زيادة الحد الأقصى للباركود من 7.5mm إلى 11mm */
          min-height: 10mm !important; /* زيادة الحد الأدنى من 7mm إلى 10mm */
          /* تحسينات إضافية للوضوح */
          filter: contrast(1.5) !important; /* زيادة التباين للطباعة الحرارية */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .barcode-label.template-qr-plus-barcode .barcode-row-new {
          /* ضمان مساحة محسنة للباركود */
          min-height: 12mm !important; /* زيادة من 8mm إلى 12mm */
          max-height: 13mm !important; /* زيادة من 8.5mm إلى 13mm */
          overflow: visible !important;
          /* تحسين التباين للطباعة */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* تحسين النص أسفل الباركود */
        .barcode-label.template-qr-plus-barcode .barcode-svg-container-new svg text {
          font-weight: bold !important;
          font-size: 5pt !important; /* زيادة حجم النص من 4.5pt إلى 5pt */
          fill: #000000 !important;
          stroke: none !important;
        }
        
        /* تحسينات خاصة بـ QR Code للطباعة الحرارية */
        .barcode-label.template-qr-plus-barcode .qr-code-container-new svg {
          shape-rendering: crispEdges !important;
          image-rendering: pixelated !important;
          min-width: 12mm !important; /* تقليل الحد الأدنى للعرض من 15mm إلى 12mm */
          min-height: 12mm !important; /* تقليل الحد الأدنى للارتفاع من 15mm إلى 12mm */
          max-width: 90% !important; /* تقليل الحجم الأقصى */
          max-height: 90% !important; /* تقليل الحجم الأقصى */
          filter: contrast(1.5) !important; /* زيادة التباين للوضوح */
        }
      }
      
       .barcode-label.template-qr-plus-barcode .price-row-new {
        font-size: 8pt !important; /* تقليل حجم خط السعر قليلاً */
        font-weight: bold !important;
        border-bottom: none !important;
        text-align: center;
        min-height: 4mm !important;
        padding: 0.3mm 0.2mm 0.3mm 0.2mm !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .barcode-label.template-qr-plus-barcode .info-label-new {
        display: none !important;
      }
      .barcode-label.template-qr-plus-barcode .info-value-new {
        text-align: center !important;
        width: 100%;
        overflow: hidden !important;
        text-overflow: ellipsis;
        white-space: nowrap; /* Default, product name will override */
      }
      .barcode-label.template-qr-plus-barcode .site-url-footer-new {
        font-size: 5pt !important; /* تقليل حجم الخط للفوتر */
        font-weight: bold !important;
        text-align: center;
        width: 100%;
        margin-top: 0.5mm; /* تقليل الهامش */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #000;
        flex-shrink: 0;
      }
      /* Hide elements not explicitly part of this new design */
      .barcode-label.template-qr-plus-barcode .sku,
      .barcode-label.template-qr-plus-barcode .org-name,
      .barcode-label.template-qr-plus-barcode .price,
      .barcode-label.template-qr-plus-barcode .product-name
      {
        display: none !important;
      }
    `,
    jsBarcodeOptions: {
      height: 40,        // زيادة الارتفاع من 30 إلى 40
      width: 1.5,        // زيادة عرض الخطوط من 1.3 إلى 1.5
      fontSize: 5,       // تقليل حجم الخط
      displayValue: true, // إظهار النص أسفل الباركود
      margin: 0,         // بدون هوامش خارجية
      textMargin: 1,     // زيادة المسافة بين الباركود والنص
      fontOptions: "bold", // نص عريض للوضوح
      flat: true,        // خطوط مسطحة للطباعة الحرارية
      background: "#ffffff",
      lineColor: "#000000",
    },
  },
  // يمكن إضافة المزيد من القوالب هنا
];
