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
        font-size: 6.5pt !important; /* Adjusted for space */
        font-weight: bold !important; /* Ensured bold as per previous, and user request */
        text-align: center;
        width: 100%;
        margin-bottom: 1mm; /* Adjusted margin */
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
        gap: 1.5mm; /* Reduced gap */
        min-height: 0; /* Crucial for nested flex elements */
        overflow: hidden; /* Prevent internal overflow */
      }
      .barcode-label.template-qr-plus-barcode .qr-code-container-new {
        flex: 0 0 40% !important; /* Slightly reduced to give more space to details */
        max-width: 40% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        align-self: stretch;
        min-height: 0; /* Prevent flex item from growing unexpectedly */
      }
      .barcode-label.template-qr-plus-barcode .qr-code-container-new svg {
        max-width: 100% !important;
        max-height: 100% !important;
        object-fit: contain !important;
      }
      .barcode-label.template-qr-plus-barcode .product-details-area-new {
        flex: 1 1 auto !important; /* Allow to grow and shrink */
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
        border-bottom: 0.2mm solid #444 !important; /* Thinner border */
        padding: 0.4mm 0.3mm !important; /* Reduced padding */
        min-height: 4mm; /* Adjusted min-height */
        flex-shrink: 0; /* Prevent rows from shrinking too much individually */
      }
      .barcode-label.template-qr-plus-barcode .product-name-row-new {
         font-size: 8.5pt !important; /* Increased product name font size */
         font-weight: bold !important;
         text-align: center;
         min-height: 6mm; /* Adjusted */
         padding: 0.4mm 0.3mm 0.1mm 0.3mm !important;
      }
      .barcode-label.template-qr-plus-barcode .product-name-row-new .info-value-new {
          white-space: normal;
          line-height: 1.2;
          text-overflow: ellipsis;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2; /* Max 2 lines */
          -webkit-box-orient: vertical;
          max-height: 2.4em; /* line-height * 2 */
      }
      .barcode-label.template-qr-plus-barcode .barcode-row-new {
         border-bottom: 0.2mm solid #444 !important;
         padding: 0 !important;
         min-height: 10mm; /* تقليل المساحة لتوفير مجال للسعر */
         display: flex;
         align-items: center;
         justify-content: center; /* توسيط الباركود */
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
        height: 100% !important; /* يملأ كامل الارتفاع */
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
          max-height: 9.5mm !important; /* تقليل الحد الأقصى */
          min-height: 8mm !important; /* تقليل الحد الأدنى */
          /* تحسينات إضافية للوضوح */
          filter: contrast(1.3) !important; /* زيادة التباين للطباعة الحرارية */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        .barcode-label.template-qr-plus-barcode .barcode-row-new {
          /* ضمان مساحة محسنة للباركود */
          min-height: 10mm !important;
          max-height: 10.5mm !important;
          overflow: visible !important;
          /* تحسين التباين للطباعة */
          -webkit-print-color-adjust: exact !important;
          color-adjust: exact !important;
        }
        /* تحسين النص أسفل الباركود */
        .barcode-label.template-qr-plus-barcode .barcode-svg-container-new svg text {
          font-weight: bold !important;
          font-size: 5pt !important; /* تقليل حجم النص */
          fill: #000000 !important;
          stroke: none !important;
        }
      }
      
       .barcode-label.template-qr-plus-barcode .price-row-new {
        font-size: 9pt !important; /* زيادة حجم خط السعر للوضوح */
        font-weight: bold !important;
        border-bottom: none !important;
        text-align: center;
        min-height: 4.5mm !important; /* زيادة المساحة المخصصة للسعر */
        padding: 0.5mm 0.3mm 0.5mm 0.3mm !important; /* زيادة padding للسعر */
        display: flex !important; /* ضمان الظهور */
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
        font-size: 5.5pt !important; /* Adjusted for space */
        font-weight: bold !important; /* Added bold as per user request */
        text-align: center;
        width: 100%;
        margin-top: 1mm; /* Adjusted margin */
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        color: #000;
        flex-shrink: 0; /* Do not shrink footer */
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
      height: 35,        // تقليل الارتفاع قليلاً لتوفير مساحة للسعر
      width: 1.0,        // تقليل عرض الخطوط لتوفير مساحة
      fontSize: 5,       // تقليل حجم الخط أكثر
      displayValue: true, // إظهار النص أسفل الباركود
      margin: 0,         // بدون هوامش خارجية
      textMargin: 0,     // بدون مسافة بين الباركود والنص (مدمج تماماً)
      fontOptions: "bold", // نص عريض للوضوح
      flat: true,        // خطوط مسطحة للطباعة الحرارية
      background: "#ffffff",
      lineColor: "#000000",
    },
  },
  // يمكن إضافة المزيد من القوالب هنا
];
