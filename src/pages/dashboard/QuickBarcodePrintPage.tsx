import React, { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling'; // Import QRCodeStyling
// Import barcode templates
import { barcodeTemplates, BarcodeTemplate } from '@/config/barcode-templates';

// Define the product data structure based on the SQL query
interface ProductForBarcode {
  product_id: string;
  product_name: string;
  product_price: string | number;
  product_sku: string;
  product_barcode: string | null;
  stock_quantity: number;
  organization_name: string;
  product_slug: string | null; // Added from RPC
  organization_domain: string | null; // Added from RPC
  organization_subdomain: string | null; // Added from RPC
}

interface SelectedProduct extends ProductForBarcode {
  selected: boolean;
  print_quantity: number;
  use_stock_quantity: boolean;
}

interface PrintSettings {
  label_width: number; // in mm
  label_height: number; // in mm
  barcode_type: string;
  display_store_name: boolean;
  display_product_name: boolean;
  display_price: boolean;
  display_sku: boolean;
  display_barcode_value: boolean;
  custom_width: string; // for input field
  custom_height: string; // for input field
  selected_label_size: string;
  selected_template_id: string; // New setting for template
  font_family_css: string; // New setting for font family
}

// Define the expected RPC function structure for Supabase client
// This helps TypeScript understand the RPC call better.
// Replace 'public' with your actual schema if it's different.
type GetProductsRpcArgs = any; // Changed to any to resolve linter issue temporarily
type GetProductsRpcReturn = ProductForBarcode[];

const barcodeTypes = [
  "CODE128", "CODE128A", "CODE128B", "CODE128C",
  "EAN13", "EAN8", "EAN5", "EAN2",
  "UPC", "UPCE",
  "CODE39",
  "ITF14", "ITF",
  "MSI", "MSI10", "MSI11", "MSI1010", "MSI1110",
  "pharmacode",
  "codabar"
];

const predefinedLabelSizes: { [key: string]: { width: number; height: number } } = {
  "50x30": { width: 50, height: 30 },
  "60x40": { width: 60, height: 40 },
  "70x50": { width: 70, height: 50 },
  "custom": { width: 0, height: 0 }, // Placeholder for custom
};

// Define Font Options (can be moved to a separate file like src/config/font-options.ts later)
export interface FontOption {
  id: string;
  name: string;
  cssValue: string;
  isRTL?: boolean;
  url?: string; // For @import url in print window if it's a web font
}

export const fontOptions: FontOption[] = [
  {
    id: "system-ui",
    name: "النظام الافتراضي (System UI)",
    cssValue: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  },
  {
    id: "tajawal",
    name: "تجوال (Tajawal) - عربي",
    cssValue: "'Tajawal', sans-serif",
    isRTL: true,
    url: "https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700&display=swap",
  },
  {
    id: "roboto",
    name: "روبوتو (Roboto) - إنجليزي",
    cssValue: "'Roboto', sans-serif",
    url: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
  {
    id: "arial",
    name: "آريال (Arial)",
    cssValue: "Arial, sans-serif",
  },
  // Add more fonts here, e.g., Cairo for Arabic, Lato/Open Sans for English
];

const QuickBarcodePrintPage = () => {
  const [products, setProducts] = useState<SelectedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  const [printSettings, setPrintSettings] = useState<PrintSettings>({
    label_width: 50,
    label_height: 30,
    barcode_type: "CODE128",
    display_store_name: true,
    display_product_name: true,
    display_price: true,
    display_sku: true,
    display_barcode_value: true,
    custom_width: "50",
    custom_height: "30",
    selected_label_size: "50x30",
    selected_template_id: barcodeTemplates[0]?.id || "default", // Default to the first template
    font_family_css: fontOptions[0]?.cssValue || "sans-serif", // Default to system font
  });

  const fetchProductsForBarcode = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // @ts-ignore - Assuming 'get_products_for_barcode_printing' is a valid RPC function in Supabase
      const { data, error: dbError } = await supabase.rpc<
        GetProductsRpcArgs,
        GetProductsRpcReturn
      >('get_products_for_barcode_printing', {}); // Pass empty object if no args

      if (dbError) {
        throw dbError;
      }
      
      // Log the raw data received from the RPC call for debugging
      console.log("Raw data from get_products_for_barcode_printing:", data);

      if (Array.isArray(data)) {
        const selectableProducts: SelectedProduct[] = data.map(
          (p: ProductForBarcode) => ({
            ...p,
            selected: false,
            print_quantity: p.stock_quantity > 0 ? p.stock_quantity : 1,
            use_stock_quantity: true,
          })
        );
        setProducts(selectableProducts);
      } else {
        console.warn("Data received from RPC is not an array:", data);
        setProducts([]);
      }
    } catch (err: any) {
      console.error("Error fetching products for barcode:", err);
      setError(
        `حدث خطأ أثناء جلب المنتجات: ${err.message}. تأكد من أن الدالة get_products_for_barcode_printing معرفة في قاعدة البيانات.`
      );
      toast.error("فشل جلب المنتجات: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProductsForBarcode();
  }, [fetchProductsForBarcode]);

  useEffect(() => {
    // Initial toast message
    toast.info('مرحباً بك في صفحة الطباعة السريعة للباركود!');
  }, []);

  const handleSelectProduct = (productId: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.product_id === productId ? { ...p, selected: !p.selected } : p
      )
    );
    setSelectAll(false); // Uncheck selectAll if any individual product is deselected
  };

  const handleSelectAll = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);
    setProducts((prevProducts) =>
      prevProducts.map((p) => ({ ...p, selected: newSelectAll }))
    );
  };
  
  const handlePrintQuantityChange = (
    productId: string,
    quantity: string
  ) => {
    const numQuantity = parseInt(quantity, 10);
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.product_id === productId
          ? {
              ...p,
              print_quantity:
                isNaN(numQuantity) || numQuantity < 1 ? 1 : numQuantity,
              use_stock_quantity: false,
            }
          : p
      )
    );
  };

  const handleUseStockQuantityChange = (productId: string) => {
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        if (p.product_id === productId) {
          const shouldUseStock = !p.use_stock_quantity;
          return {
            ...p,
            use_stock_quantity: shouldUseStock,
            print_quantity:
              shouldUseStock
                ? p.stock_quantity > 0
                  ? p.stock_quantity
                  : 1
                : p.print_quantity,
          };
        }
        return p;
      })
    );
  };

  const handlePrintSettingChange = <K extends keyof PrintSettings>(
    key: K,
    value: PrintSettings[K]
  ) => {
    setPrintSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleLabelSizeChange = (value: string) => {
    handlePrintSettingChange("selected_label_size", value);
    if (value === "custom") {
      // Keep custom values if switching to custom, otherwise reset if switching from custom to predefined
      handlePrintSettingChange("label_width", parseFloat(printSettings.custom_width) || 50);
      handlePrintSettingChange("label_height", parseFloat(printSettings.custom_height) || 30);
    } else {
      const size = predefinedLabelSizes[value];
      handlePrintSettingChange("label_width", size.width);
      handlePrintSettingChange("label_height", size.height);
      // Optionally update custom_width and custom_height to reflect the selected predefined size
      handlePrintSettingChange("custom_width", size.width.toString());
      handlePrintSettingChange("custom_height", size.height.toString());
    }
  };

  const handleCustomDimensionChange = (dimension: 'width' | 'height', value: string) => {
    const numericValue = parseFloat(value);
    if (dimension === 'width') {
      handlePrintSettingChange("custom_width", value);
      if (!isNaN(numericValue) && numericValue > 0) {
        handlePrintSettingChange("label_width", numericValue);
      }
    } else {
      handlePrintSettingChange("custom_height", value);
      if (!isNaN(numericValue) && numericValue > 0) {
        handlePrintSettingChange("label_height", numericValue);
      }
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-6 flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto py-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchProductsForBarcode} className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </Layout>
    );
  }

  const generateAndPrintBarcodes = () => {
    const selectedProducts = products.filter(p => p.selected);
    if (selectedProducts.length === 0) {
      toast.error("يرجى اختيار منتج واحد على الأقل للطباعة.");
      return;
    }

    const selectedTemplate = barcodeTemplates.find(t => t.id === printSettings.selected_template_id) || barcodeTemplates[0];
    const selectedFont = fontOptions.find(f => f.cssValue === printSettings.font_family_css) || fontOptions[0];

    let printHtmlContent = '<html><head><title>طباعة الباركود</title>';
    
    let fontImportStyle = '';
    if (selectedFont && selectedFont.url) {
      fontImportStyle = `@import url(\'${selectedFont.url}\');\n`;
    }

    printHtmlContent += `<style>
      ${fontImportStyle}
      /* Base Print Styles */
      @media print {
        @page { size: ${printSettings.label_width}mm ${printSettings.label_height}mm; margin: 0mm; }
        body {
          margin: 0;
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-start;
          align-items: flex-start;
          gap: 0;
          font-family: ${printSettings.font_family_css} !important;
          direction: ${selectedFont?.isRTL ? 'rtl' : 'ltr'};
        }
        .barcode-label {
          width: ${printSettings.label_width}mm !important;
          height: ${printSettings.label_height}mm !important;
          page-break-inside: avoid;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-sizing: border-box;
          padding: 1mm;
          font-family: ${printSettings.font_family_css} !important;
        }
        .barcode-label > * {
           font-family: ${printSettings.font_family_css} !important;
        }
        .barcode-label p {
          margin: 0.2mm 0;
          font-size: 6pt;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          width: 100%;
        }
        .barcode-label .org-name {}
        .barcode-label .product-name {}
        .barcode-label .price {}
        .barcode-label .sku {}
        .barcode-label svg { max-width: 95% !important; height: auto !important; max-height: 50% !important; margin: 0.5mm auto; display: block;}
      }
      ${selectedTemplate.css}
      
      /* تحسينات خاصة بالطباعة الحرارية */
      @media print {
        .barcode-label.template-qr-plus-barcode .qr-code-container-new svg {
          /* تحسين جودة الطباعة للطباعة الحرارية */
          shape-rendering: crispEdges !important;
          image-rendering: pixelated !important;
          image-rendering: -moz-crisp-edges !important;
          image-rendering: crisp-edges !important;
        }
      }
    </style></head><body>`;

    const productUrlBase = (domain: string | null, subdomain: string | null): string => {
      if (domain) {
        return `https://${domain}`;
      }
      if (subdomain) {
        return `https://${subdomain}.stockiha.com`;
      }
      return 'fallback-base-url.com'; // Fallback if neither is present
    };

    selectedProducts.forEach(product => {
      const itemsToPrintCount = product.use_stock_quantity ? (product.stock_quantity > 0 ? product.stock_quantity : 1) : product.print_quantity;
      for (let i = 0; i < itemsToPrintCount; i++) {
        const uniqueSuffix = `${product.product_id}-print-${i}`;
        const barcodeSvgId = `barcode-${uniqueSuffix}`;
        const qrCodeContainerId = `qrcode-${uniqueSuffix}`;
        
        const baseUrl = productUrlBase(product.organization_domain, product.organization_subdomain);
        const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
        const productPageUrl = `${baseUrl}/products/${slugPart}`;
        const isFallbackUrl = baseUrl === 'fallback-base-url.com';

        if (selectedTemplate.id === 'qr-plus-barcode') {
          printHtmlContent += `
            <div class="barcode-label template-${selectedTemplate.id}">
              ${printSettings.display_store_name ? `<div class="store-name-header-new">${product.organization_name}</div>` : ''}
              <div class="main-content-wrapper-new">
                <div id="${qrCodeContainerId}" class="qr-code-container-new">
                  鬓
                </div>
                <div class="product-details-area-new">
                  <div class="info-table-new">
                    ${printSettings.display_product_name ? 
                      `<div class="info-table-row-new product-name-row-new">
                        <span class="info-value-new product-name-value-new">${product.product_name}</span>
                      </div>` : ''}
                    <div class="info-table-row-new barcode-row-new">
                      <div class="barcode-svg-container-new">
                        <svg id="${barcodeSvgId}"></svg>
                      </div>
                    </div>
                    ${printSettings.display_price ? 
                      `<div class="info-table-row-new price-row-new">
                        <span class="info-value-new price-value-new">${product.product_price} DA</span>
                      </div>` : ''}
                  </div>
                </div>
              </div>
              <div class="site-url-footer-new">${baseUrl}</div>
            </div>`;
        } else {
          // Existing template structure
          printHtmlContent += `<div class="barcode-label template-${selectedTemplate.id}">
            ${printSettings.display_store_name ? `<p class="org-name">${product.organization_name}</p>` : ''}
            ${printSettings.display_product_name ? `<p class="product-name">${product.product_name}</p>` : ''}
            ${selectedTemplate.id === 'ideal' && (printSettings.display_product_name || printSettings.display_store_name) ? '<div class="divider"></div>' : ''}
            <svg id="${barcodeSvgId}"></svg>
            ${printSettings.display_price || printSettings.display_sku ? 
              `<div class="price-sku-container">
                ${printSettings.display_price ? `<p class="price">${product.product_price} DA</p>` : ''}
                ${printSettings.display_sku ? `<p class="sku">SKU: ${product.product_sku}</p>` : ''}
              </div>` : ''}
          </div>`;
        }
      }
    });
    printHtmlContent += '</body></html>';

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printHtmlContent);
      printWindow.document.close();

      // Delay to allow DOM to be ready and CSS to be applied (especially for fonts)
      const renderDelay = (selectedFont && selectedFont.url) || selectedTemplate.id === 'qr-plus-barcode' ? 100 : 50; // Longer delay if webfonts or QR codes are involved

      setTimeout(() => {
        selectedProducts.forEach(product => {
          const itemsToPrintCount = product.use_stock_quantity ? (product.stock_quantity > 0 ? product.stock_quantity : 1) : product.print_quantity;
          for (let i = 0; i < itemsToPrintCount; i++) {
            const uniqueSuffix = `${product.product_id}-print-${i}`;
            const barcodeSvgId = `barcode-${uniqueSuffix}`;
            const qrCodeContainerId = `qrcode-${uniqueSuffix}`;

            const valueToEncodeForBarcode = product.product_barcode || product.product_sku || product.product_id || 'NO_DATA';
            const targetBarcodeSvgElement = printWindow.document.getElementById(barcodeSvgId) as HTMLElement | null;

            // Define these once before the if/else block for QR code generation
            const baseUrl = productUrlBase(product.organization_domain, product.organization_subdomain);
            const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
            const productPageUrl = `${baseUrl}/products/${slugPart}`;
            const isFallbackUrl = baseUrl === 'fallback-base-url.com';

            // Combine general JsBarcode options with template-specific options
            let barcodeFormatForTemplate = printSettings.barcode_type;
            if (selectedTemplate.id === 'qr-plus-barcode') {
              barcodeFormatForTemplate = 'EAN13'; // EAN-13 للمنتجات التجارية - معيار عالمي
            }

            const barcodeOptions: JsBarcode.Options = {
              format: barcodeFormatForTemplate,
              lineColor: "#000",
              width: 1.5, // Default, will be overridden by template options if specified
              height: 30, // Default, will be overridden by template options if specified
              displayValue: printSettings.display_barcode_value,
              font: selectedFont?.cssValue || "sans-serif", // Use the full CSS value string for font
              fontOptions: selectedFont?.isRTL ? "rtl" : "", // Keep RTL if applicable, remove forced bold for now
              fontSize: 8, // This is a default, will be overridden by template specific
              textMargin: 0, // This is a default, will be overridden by template specific
              margin: 2, // Default margin for JsBarcode SVG, will be overridden by template specific
              ...(selectedTemplate.jsBarcodeOptions || {}), // Spread template options
            };

            if (targetBarcodeSvgElement) {
              try {
                JsBarcode(targetBarcodeSvgElement, valueToEncodeForBarcode, barcodeOptions);
              } catch (e: any) {
                console.error(`JsBarcode error for ${barcodeSvgId}:`, e);
                if (targetBarcodeSvgElement) targetBarcodeSvgElement.innerHTML = '<text x="10" y="20" fill="red" font-size="10">Error</text>';
              }
            }

            // Generate QR Code if the template is qr-plus-barcode
            if (selectedTemplate.id === 'qr-plus-barcode') {
              const qrCodeElement = printWindow.document.getElementById(qrCodeContainerId);
              // baseUrl, slugPart, productPageUrl, and isFallbackUrl are already defined above

              // Logging for debugging
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Target Container ID: ${qrCodeContainerId}`);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] QR Code Element found:`, qrCodeElement);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Base URL for QR: ${baseUrl}`);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Product Slug for QR: ${product.product_slug}`);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Product ID for QR (fallback): ${product.product_id}`);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Product Page URL for QR: ${productPageUrl}`);
              (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Is Fallback URL: ${isFallbackUrl}`);

              if (qrCodeElement && productPageUrl && !isFallbackUrl) {
                try {
                  (qrCodeElement as HTMLElement).style.display = 'flex';
                  (qrCodeElement as HTMLElement).style.justifyContent = 'center'; // Center SVG in container
                  (qrCodeElement as HTMLElement).style.alignItems = 'center'; // Center SVG in container
                  // Remove fixed width/height from JS style, let CSS or SVG itself control it within the 8mm box from template
                  // (qrCodeElement as HTMLElement).style.width = '8mm'; 
                  // (qrCodeElement as HTMLElement).style.height = '8mm';

                  (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] QR Container offsetWidth: ${(qrCodeElement as HTMLElement).offsetWidth}, offsetHeight: ${(qrCodeElement as HTMLElement).offsetHeight}`);
                  
                  const containerSize = Math.min((qrCodeElement as HTMLElement).offsetWidth, (qrCodeElement as HTMLElement).offsetHeight);
                  // زيادة الحد الأدنى للحجم للطباعة الحرارية - من 48px إلى 80px
                  const qrActualSize = Math.max(containerSize, 80); // زيادة الحد الأدنى لتحسين الطباعة الحرارية

                  (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Calculated QR Code Size (target): ${qrActualSize}`);

                  if (qrActualSize >= 20) { // Check if size is reasonable, library might have its own internal minimum
                    const qrCodeInstance = new QRCodeStyling({
                      width: qrActualSize,
                      height: qrActualSize,
                      type: 'svg', 
                      data: productPageUrl,
                      margin: 6, // زيادة الهامش حول QR Code لتحسين الوضوح
                      dotsOptions: {
                        type: "rounded", // تغيير شكل النقاط إلى مستدير
                        color: "#000000", // أسود
                        // roundSize: true // تدوير حجم النقاط لتحسين الطباعة - تم التعليق عليه للتجربة
                      },
                      backgroundOptions: {
                        color: "#ffffff" // أبيض (افتراضي)
                      },
                      cornersSquareOptions: {
                        type: "rounded",   // مربعات زوايا مستديرة
                        color: "#000000"  // أسود
                      },
                      cornersDotOptions: {
                        type: "rounded",   // نقاط (مستديرة) داخل مربعات الزوايا
                        color: "#000000"  // أسود
                      },
                      imageOptions: {
                        hideBackgroundDots: true, // إخفاء النقاط خلف الصورة إذا وجدت
                        margin: 0 // عدم إضافة هامش للصورة لتوفير مساحة أكبر للنقاط
                      },
                      qrOptions: {
                        errorCorrectionLevel: 'L', // تغيير إلى L للطباعة الحرارية - لرمز أقل كثافة
                        typeNumber: 0 // السماح للمكتبة باختيار أفضل حجم تلقائياً
                      }
                    });
                    // Clear any previous content (e.g., error messages or old QR codes)
                    (qrCodeElement as HTMLElement).innerHTML = ''; 

                    // New method: Get SVG data as string and set innerHTML
                    qrCodeInstance.getRawData("svg").then((svgData) => {
                      if (svgData && typeof svgData === 'string') {
                        (qrCodeElement as HTMLElement).innerHTML = svgData;
                        (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] QR Code SVG string injected into element.`);
                      } else if (svgData && svgData instanceof Blob) {
                        // If it's a Blob, read its text content
                        svgData.text().then(text => {
                          (qrCodeElement as HTMLElement).innerHTML = text;
                          (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] QR Code SVG (from Blob.text()) injected into element.`);
                        }).catch(blobError => {
                          (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] Error reading Blob text:`, blobError);
                          if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">Blob Read Err</p>';
                        });
                      } else if (svgData) {
                        // Attempt to convert if it's not a string or Blob but exists (e.g. Buffer)
                        try {
                            const svgStringFromBuffer = svgData.toString();
                            (qrCodeElement as HTMLElement).innerHTML = svgStringFromBuffer;
                            (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] QR Code SVG (from buffer/blob.toString()) injected into element.`);
                        } catch (conversionError) {
                            (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] getRawData("svg") returned non-string and failed to convert:`, svgData, conversionError);
                            if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">SVG Type Err</p>';
                        }
                      } else {
                        (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] getRawData("svg") returned null or empty.`);
                        if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">SVG Data Err</p>';
                      }
                    }).catch(error => {
                      (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] Error calling getRawData("svg"):`, error);
                      if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">SVG Promise Err</p>';
                    });
                  } else {
                    (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] QR Code size is 0 or invalid (${qrActualSize}), cannot generate QR code.`);
                    if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">QR Size Err</p>';
                  }
                } catch (qrError: any) {
                  (printWindow as any).console.error(`[QR Debug ${uniqueSuffix}] Error generating or appending QR Code:`, qrError);
                  if(qrCodeElement) (qrCodeElement as HTMLElement).innerHTML = '<p style="color:red; font-size:5pt;">QR Error</p>';
                }
              } else {
                let reason = "Unknown issue.";
                if (!qrCodeElement) reason = `QR Code container (${qrCodeContainerId}) not found.`;
                else if (isFallbackUrl) reason = "Product URL is a fallback (missing domain/subdomain).";
                else if (!productPageUrl) reason = "Product Page URL is empty or null.";
                
                (printWindow as any).console.warn(`[QR Debug ${uniqueSuffix}] Cannot generate QR. Reason: ${reason} (URL: ${productPageUrl})`);
                if(qrCodeElement) qrCodeElement.innerHTML = `<p style="color:orange; font-size:5pt;">QR Data? (${reason.substring(0,30)})</p>`;
              }
            }
          }
        });

        printWindow.focus();
        // Ensure printWindow and its document are fully available
        if (printWindow && printWindow.document) {
            const pWindow = printWindow as Window & { document: Document & { fonts: FontFaceSet } };
            if (pWindow.document.fonts && typeof pWindow.document.fonts.ready === 'function') {
                (pWindow.document.fonts.ready as Promise<FontFaceSet>).then(() => { // Explicitly cast to Promise<FontFaceSet>
                    pWindow.print();
                }).catch(error => {
                    console.error("Error waiting for fonts to load, printing immediately:", error);
                    pWindow.print(); 
                });
            } else {
                console.warn("document.fonts.ready API not available, using fallback timeout for printing.");
                setTimeout(() => {
                    pWindow.print();
                }, 1500);
            }
        } else {
             // Fallback if printWindow or printWindow.document is somehow null, though unlikely after previous checks
            console.error("Print window or its document not available for printing.");
            toast.error("فشل تهيئة نافذة الطباعة بشكل كامل.");
        }
      }, renderDelay);

    } else {
      toast.error("فشل فتح نافذة الطباعة. يرجى التأكد من السماح بالنوافذ المنبثقة.");
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">طباعة سريعة للباركود</h1>
        </div>

        {/* قسم اختيار المنتجات */}
        <div className="mb-8 p-6 bg-background rounded-lg border shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">1. اختيار المنتجات</h2>
            {products.length > 0 && (
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Checkbox
                    id="selectAllProducts"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                />
                <label
                    htmlFor="selectAllProducts"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                    تحديد الكل ({products.filter(p => p.selected).length} / {products.length})
                </label>
                </div>
            )}
          </div>

          {products.length === 0 && !isLoading && (
            <p className="text-muted-foreground text-center py-8">
              لم يتم العثور على منتجات. قد تحتاج إلى إضافة منتجات أولاً أو التحقق من الدالة `get_products_for_barcode_printing` في قاعدة البيانات.
            </p>
          )}
          {products.length > 0 && (
            <div className="max-h-[500px] overflow-y-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-[50px]">
                       <Checkbox
                        id="headerSelectAll"
                        checked={selectAll}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all rows"
                      />
                    </TableHead>
                    <TableHead>اسم المنتج</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-center">المخزون</TableHead>
                    <TableHead className="w-[150px] text-center">عدد النسخ</TableHead>
                    <TableHead className="w-[180px] text-center">استخدام كمية المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.product_id} className={product.selected ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          id={`select-${product.product_id}`}
                          checked={product.selected}
                          onCheckedChange={() => handleSelectProduct(product.product_id)}
                          aria-label={`Select ${product.product_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.product_sku}</TableCell>
                      <TableCell className="text-center">{product.stock_quantity}</TableCell>
                      <TableCell className="text-center">
                        <Input
                          type="number"
                          min="1"
                          value={product.print_quantity}
                          onChange={(e) => handlePrintQuantityChange(product.product_id, e.target.value)}
                          className="w-20 text-center mx-auto"
                          disabled={product.use_stock_quantity}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                           id={`useStock-${product.product_id}`}
                           checked={product.use_stock_quantity}
                           onCheckedChange={() => handleUseStockQuantityChange(product.product_id)}
                           aria-label={`Use stock quantity for ${product.product_name}`}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* قسم إعدادات الطباعة */}
        <div className="mb-8 p-6 bg-background rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">2. إعدادات الطباعة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-8">
            {/* Column 1: Label Size & Barcode Type */}
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="labelSize">حجم الملصق (مم)</Label>
                <Select value={printSettings.selected_label_size} onValueChange={handleLabelSizeChange}>
                  <SelectTrigger id="labelSize"><SelectValue placeholder="اختر حجم الملصق" /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(predefinedLabelSizes).map((key) => (
                      <SelectItem key={key} value={key}>
                        {key === "custom" ? "مخصص" : `${predefinedLabelSizes[key].width}x${predefinedLabelSizes[key].height} mm`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {printSettings.selected_label_size === "custom" && (
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    <div>
                      <Label htmlFor="customWidth" className="text-xs">العرض (مم)</Label>
                      <Input id="customWidth" type="number" value={printSettings.custom_width} onChange={(e) => handleCustomDimensionChange('width', e.target.value)} placeholder="العرض" />
                    </div>
                    <div>
                      <Label htmlFor="customHeight" className="text-xs">الارتفاع (مم)</Label>
                      <Input id="customHeight" type="number" value={printSettings.custom_height} onChange={(e) => handleCustomDimensionChange('height', e.target.value)} placeholder="الارتفاع" />
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="barcodeType">نوع الباركود</Label>
                <Select value={printSettings.barcode_type} onValueChange={(value) => handlePrintSettingChange("barcode_type", value)}>
                  <SelectTrigger id="barcodeType"><SelectValue placeholder="اختر نوع الباركود" /></SelectTrigger>
                  <SelectContent>
                    {barcodeTypes.map((type) => (<SelectItem key={type} value={type}>{type}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Column 2: Template Selection */}
            <div className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="templateSelect">اختر قالب التصميم</Label>
                    <Select 
                        value={printSettings.selected_template_id} 
                        onValueChange={(value) => handlePrintSettingChange("selected_template_id", value)}
                    >
                        <SelectTrigger id="templateSelect">
                        <SelectValue placeholder="اختر قالبًا" />
                        </SelectTrigger>
                        <SelectContent>
                        {barcodeTemplates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                            {template.name}
                            {template.description && <span className="text-xs text-muted-foreground ml-2 rtl:mr-2 rtl:ml-0">- {template.description}</span>}
                            </SelectItem>
                        ))}
                        </SelectContent>
                    </Select>
                </div>
            
                {/* Font Selection Dropdown */}
                <div className="space-y-2">
                  <Label htmlFor="fontFamilySelect">اختر نوع الخط</Label>
                  <Select 
                    value={printSettings.font_family_css} 
                    onValueChange={(value) => handlePrintSettingChange("font_family_css", value)}
                  >
                    <SelectTrigger id="fontFamilySelect">
                      <SelectValue placeholder="اختر خطًا" />
                    </SelectTrigger>
                    <SelectContent>
                      {fontOptions.map((font) => (
                        <SelectItem key={font.id} value={font.cssValue} style={{ fontFamily: font.cssValue }}>
                          {font.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
            </div>

            {/* Column 3 & 4: Display Options (spread over two columns if needed or keep in one) */}
            <div className="space-y-3 md:col-span-2 lg:col-span-2">
              <Label>المعلومات المعروضة على الملصق:</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4">
                {[ 
                  {key: "display_store_name", label: "عرض اسم المتجر"},
                  {key: "display_product_name", label: "عرض اسم المنتج"},
                  {key: "display_price", label: "عرض السعر"},
                  {key: "display_sku", label: "عرض SKU"},
                  {key: "display_barcode_value", label: "عرض قيمة الباركود (نص)"}
                ].map(item => (
                  <div key={item.key} className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox 
                      id={item.key} 
                      checked={printSettings[item.key as keyof PrintSettings] as boolean}
                      onCheckedChange={(checked) => handlePrintSettingChange(item.key as keyof PrintSettings, Boolean(checked))} 
                    />
                    <Label htmlFor={item.key} className="text-sm whitespace-nowrap">{item.label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* قسم معاينة الطباعة */}
        <div className="mb-8 p-6 bg-background rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4">3. معاينة الطباعة</h2>
          <p className="text-muted-foreground">سيتم إنشاء معاينة دقيقة للملصقات في نافذة الطباعة المنبثقة بناءً على الإعدادات والمنتجات المحددة.
            تأكد من أن أبعاد الملصق ونوع الباركود والقالب والخط صحيحان.</p>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => window.history.back()}>إلغاء</Button>
          <Button
            onClick={generateAndPrintBarcodes}
            disabled={products.filter((p) => p.selected).length === 0}
          >
            طباعة المحدد
          </Button>
        </div>
      </div>
    </Layout>
  );
};

export default QuickBarcodePrintPage; 