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
import { Loader2, Search, Filter, SortAsc, SortDesc, Calendar, Hash, Package } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import QRCodeStyling from 'qr-code-styling'; // Import QRCodeStyling
// Import barcode templates
import { barcodeTemplates, BarcodeTemplate } from '@/config/barcode-templates';
// استيراد دالة تحضير قيم الباركود
import { prepareBarcodeValue } from '@/lib/barcode-utils';

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

// إضافة interface للفلاتر والبحث
interface SearchAndFilter {
  search_query: string;
  sort_by: 'name' | 'price' | 'stock' | 'created_at' | 'sku';
  sort_order: 'asc' | 'desc';
  stock_filter: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  price_range: {
    min: string;
    max: string;
  };
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
  const [filteredProducts, setFilteredProducts] = useState<SelectedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);
  
  // إضافة state للبحث والفلترة
  const [searchAndFilter, setSearchAndFilter] = useState<SearchAndFilter>({
    search_query: '',
    sort_by: 'name',
    sort_order: 'asc',
    stock_filter: 'all',
    price_range: {
      min: '',
      max: ''
    }
  });

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

  // دالة الفلترة والبحث
  const filterAndSortProducts = useCallback((products: SelectedProduct[], filters: SearchAndFilter): SelectedProduct[] => {
    let filtered = [...products];

    // تطبيق البحث
    if (filters.search_query.trim()) {
      const searchTerm = filters.search_query.toLowerCase().trim();
      filtered = filtered.filter(product => 
        product.product_name.toLowerCase().includes(searchTerm) ||
        product.product_sku.toLowerCase().includes(searchTerm) ||
        (product.product_barcode && product.product_barcode.toLowerCase().includes(searchTerm))
      );
    }

    // تطبيق فلتر المخزون
    switch (filters.stock_filter) {
      case 'in_stock':
        filtered = filtered.filter(product => product.stock_quantity > 5);
        break;
      case 'low_stock':
        filtered = filtered.filter(product => product.stock_quantity > 0 && product.stock_quantity <= 5);
        break;
      case 'out_of_stock':
        filtered = filtered.filter(product => product.stock_quantity === 0);
        break;
      // 'all' case doesn't need filtering
    }

    // تطبيق فلتر نطاق السعر
    if (filters.price_range.min) {
      const minPrice = parseFloat(filters.price_range.min);
      if (!isNaN(minPrice)) {
        filtered = filtered.filter(product => {
          const price = typeof product.product_price === 'string' 
            ? parseFloat(product.product_price) 
            : product.product_price;
          return price >= minPrice;
        });
      }
    }

    if (filters.price_range.max) {
      const maxPrice = parseFloat(filters.price_range.max);
      if (!isNaN(maxPrice)) {
        filtered = filtered.filter(product => {
          const price = typeof product.product_price === 'string' 
            ? parseFloat(product.product_price) 
            : product.product_price;
          return price <= maxPrice;
        });
      }
    }

    // تطبيق الترتيب
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (filters.sort_by) {
        case 'name':
          aValue = a.product_name.toLowerCase();
          bValue = b.product_name.toLowerCase();
          break;
        case 'price':
          aValue = typeof a.product_price === 'string' ? parseFloat(a.product_price) : a.product_price;
          bValue = typeof b.product_price === 'string' ? parseFloat(b.product_price) : b.product_price;
          break;
        case 'stock':
          aValue = a.stock_quantity;
          bValue = b.stock_quantity;
          break;
        case 'sku':
          aValue = a.product_sku.toLowerCase();
          bValue = b.product_sku.toLowerCase();
          break;
        case 'created_at':
          // نظراً لأن البيانات لا تحتوي على created_at، سنستخدم الترتيب الحالي
          return 0;
        default:
          return 0;
      }

      if (filters.sort_order === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, []);

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
        setProducts([]);
      }
    } catch (err: any) {
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

  // تطبيق الفلاتر عند تغيير المنتجات أو الفلاتر
  useEffect(() => {
    const filtered = filterAndSortProducts(products, searchAndFilter);
    setFilteredProducts(filtered);
    setSelectAll(false); // إعادة تعيين تحديد الكل عند تغيير الفلاتر
  }, [products, searchAndFilter, filterAndSortProducts]);

  useEffect(() => {
    // Initial toast message
    toast.info('مرحباً بك في صفحة الطباعة السريعة للباركود!');
  }, []);

  // دوال التعامل مع البحث والفلترة
  const handleSearchChange = (value: string) => {
    setSearchAndFilter(prev => ({
      ...prev,
      search_query: value
    }));
  };

  const handleSortChange = (field: SearchAndFilter['sort_by']) => {
    setSearchAndFilter(prev => ({
      ...prev,
      sort_by: field,
      // عكس الترتيب إذا كان نفس الحقل
      sort_order: prev.sort_by === field && prev.sort_order === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = <K extends keyof SearchAndFilter>(
    key: K,
    value: SearchAndFilter[K]
  ) => {
    setSearchAndFilter(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setSearchAndFilter({
      search_query: '',
      sort_by: 'name',
      sort_order: 'asc',
      stock_filter: 'all',
      price_range: {
        min: '',
        max: ''
      }
    });
  };

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

      // تأخير أطول للسماح للـ DOM والـ CSS والمكتبات بالتحميل
      const renderDelay = selectedTemplate.id === 'qr-plus-barcode' ? 500 : 
                         (selectedFont && selectedFont.url) ? 300 : 100;

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

            // تحضير وتنظيف قيمة الباركود
            let barcodeFormatForTemplate = printSettings.barcode_type;
            
            // استخدام code128 كنوع افتراضي في حال كان النوع المحدد سيسبب خطأ
            if (selectedTemplate.id === 'qr-plus-barcode') {
              barcodeFormatForTemplate = 'CODE128'; // استخدام نوع أكثر مرونة لقبول قيم متنوعة
            }
            
            // استخدام الدالة الجديدة لتحضير قيمة الباركود
            const valueToUse = prepareBarcodeValue(valueToEncodeForBarcode, barcodeFormatForTemplate);

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
                // إضافة خيارات لتجنب الأخطاء
                valid: function(valid) {
                  if (!valid) {
                    if (targetBarcodeSvgElement) {
                      // إذا كان هناك خطأ، استخدم CODE128 كآخر محاولة
                      try {
                        JsBarcode(targetBarcodeSvgElement, valueToUse, {
                          ...barcodeOptions,
                          format: 'CODE128',
                        });
                      } catch (finalError) {
                        // عرض رسالة خطأ أكثر تفصيلاً
                        targetBarcodeSvgElement.innerHTML = `
                          <text x="10" y="15" fill="red" font-size="8" font-weight="bold">خطأ في الباركود</text>
                          <text x="10" y="25" fill="red" font-size="6">${valueToUse.substring(0, 10)}${valueToUse.length > 10 ? '...' : ''}</text>
                        `;
                      }
                    }
                  }
                }
            };

            if (targetBarcodeSvgElement) {
              try {
                JsBarcode(targetBarcodeSvgElement, valueToUse, barcodeOptions);
              } catch (e: any) {
                // في حالة الخطأ، حاول مرة أخرى باستخدام CODE128 الأكثر مرونة
                try {
                  // تجربة استخدام نوع باركود أكثر مرونة
                  const fallbackValue = prepareBarcodeValue(valueToUse, 'CODE128');
                  JsBarcode(targetBarcodeSvgElement, fallbackValue, {
                    ...barcodeOptions,
                    format: 'CODE128',
                  });
                } catch (e2: any) {
                  // إذا فشلت كل المحاولات، اعرض رسالة خطأ
                  targetBarcodeSvgElement.innerHTML = `
                    <text x="10" y="15" fill="red" font-size="8" font-weight="bold">خطأ في الباركود</text>
                    <text x="10" y="25" fill="red" font-size="6">${valueToUse.substring(0, 10)}${valueToUse.length > 10 ? '...' : ''}</text>
                  `;
                  // سجل الخطأ في وحدة التحكم للتصحيح
                  (printWindow as any).console.error(`[Barcode Error] Failed to generate barcode for value: ${valueToUse}`, e, e2);
                }
              }
            }

            // Generate QR Code if the template is qr-plus-barcode
            if (selectedTemplate.id === 'qr-plus-barcode') {
              const qrCodeElement = printWindow.document.getElementById(qrCodeContainerId);
              
              // إضافة تحقق أفضل من وجود العنصر والبيانات
              if (qrCodeElement && productPageUrl && !isFallbackUrl) {
                try {
                  // إعداد العنصر للحصول على قياسات صحيحة
                  (qrCodeElement as HTMLElement).style.display = 'flex';
                  (qrCodeElement as HTMLElement).style.justifyContent = 'center';
                  (qrCodeElement as HTMLElement).style.alignItems = 'center';
                  (qrCodeElement as HTMLElement).style.minWidth = '20mm';
                  (qrCodeElement as HTMLElement).style.minHeight = '20mm';

                  // حساب الحجم مع ضمان حد أدنى آمن
                  const containerWidth = Math.max((qrCodeElement as HTMLElement).offsetWidth || 80, 60);
                  const containerHeight = Math.max((qrCodeElement as HTMLElement).offsetHeight || 80, 60);
                  const containerSize = Math.min(containerWidth, containerHeight);
                  const qrActualSize = Math.max(containerSize, 60); // حد أدنى 60 بكسل

                  (printWindow as any).console.log(`[QR Debug ${uniqueSuffix}] Container: ${containerWidth}x${containerHeight}, Final Size: ${qrActualSize}`);

                  // إنشاء QR Code مع إعدادات محسّنة
                  const qrCodeInstance = new QRCodeStyling({
                    width: qrActualSize,
                    height: qrActualSize,
                    type: 'svg',
                    data: productPageUrl,
                    margin: 4, // تقليل الهامش لمساحة أكبر
                    dotsOptions: {
                      type: "square",
                      color: "#000000",
                    },
                    backgroundOptions: {
                      color: "#ffffff"
                    },
                    cornersSquareOptions: {
                      type: "square",
                      color: "#000000"
                    },
                    cornersDotOptions: {
                      type: "square",
                      color: "#000000"
                    },
                    qrOptions: {
                      errorCorrectionLevel: 'L', // أقل كثافة للطباعة الأوضح
                      typeNumber: 0 // دع المكتبة تختار الحجم المناسب
                    }
                  });

                  // محاولة متعددة للحصول على SVG
                  const generateQRWithFallback = async () => {
                    try {
                      // المحاولة الأولى: استخدام getRawData
                      const svgData = await qrCodeInstance.getRawData("svg");
                      
                      if (svgData) {
                        let svgString = '';
                        
                        if (typeof svgData === 'string') {
                          svgString = svgData;
                        } else if (svgData instanceof Blob) {
                          svgString = await svgData.text();
                        } else {
                          svgString = svgData.toString();
                        }
                        
                        if (svgString && svgString.includes('<svg')) {
                          (qrCodeElement as HTMLElement).innerHTML = svgString;
                          (printWindow as any).console.log(`[QR Success ${uniqueSuffix}] QR Code generated successfully`);
                          return true;
                        }
                      }
                    } catch (qrError) {
                      (printWindow as any).console.warn(`[QR Warning ${uniqueSuffix}] getRawData failed:`, qrError);
                    }
                    
                    // المحاولة الثانية: استخدام append
                    try {
                      (qrCodeElement as HTMLElement).innerHTML = '';
                      await qrCodeInstance.append(qrCodeElement as HTMLElement);
                      
                      // التحقق من وجود SVG
                      const svgElement = (qrCodeElement as HTMLElement).querySelector('svg');
                      if (svgElement) {
                        (printWindow as any).console.log(`[QR Success ${uniqueSuffix}] QR Code appended successfully`);
                        return true;
                      }
                                         } catch (appendError) {
                       (printWindow as any).console.warn(`[QR Warning ${uniqueSuffix}] append failed:`, appendError);
                     }
                    
                    // المحاولة الثالثة: استخدام خدمة خارجية كـ fallback
                    try {
                      const fallbackUrl = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(productPageUrl)}&size=${qrActualSize}x${qrActualSize}&margin=4&ecc=L&format=svg`;
                      
                      const response = await fetch(fallbackUrl);
                      if (response.ok) {
                        const svgContent = await response.text();
                        if (svgContent && svgContent.includes('<svg')) {
                          (qrCodeElement as HTMLElement).innerHTML = svgContent;
                          (printWindow as any).console.log(`[QR Success ${uniqueSuffix}] Fallback QR Code loaded`);
                          return true;
                        }
                      }
                                         } catch (fallbackError) {
                       (printWindow as any).console.warn(`[QR Warning ${uniqueSuffix}] Fallback failed:`, fallbackError);
                     }
                    
                    return false;
                  };
                  
                  // تنفيذ التوليد مع معالجة الأخطاء
                  generateQRWithFallback().then(success => {
                    if (!success) {
                      // إذا فشلت كل المحاولات، عرض رسالة أو باركود احتياطي
                      (qrCodeElement as HTMLElement).innerHTML = `
                        <div style="width: ${qrActualSize}px; height: ${qrActualSize}px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; color: #666;">
                          <div>لم يتم تحميل<br/>رمز QR<br/><small>${productPageUrl.substring(0, 20)}...</small></div>
                        </div>
                      `;
                      (printWindow as any).console.error(`[QR Error ${uniqueSuffix}] All QR generation methods failed`);
                    }
                                     }).catch(promiseError => {
                     (printWindow as any).console.error(`[QR Error ${uniqueSuffix}] QR generation promise failed:`, promiseError);
                    (qrCodeElement as HTMLElement).innerHTML = `
                      <div style="width: ${qrActualSize}px; height: ${qrActualSize}px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; color: #666;">
                        <div>خطأ في تحميل<br/>رمز QR</div>
                      </div>
                    `;
                  });
                  
                } catch (qrError: any) {
                  (printWindow as any).console.error(`[QR Error ${uniqueSuffix}] QR Code generation failed:`, qrError);
                  if (qrCodeElement) {
                    (qrCodeElement as HTMLElement).innerHTML = `
                      <div style="width: 60px; height: 60px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px; text-align: center; color: #666;">
                        <div>خطأ QR</div>
                      </div>
                    `;
                  }
                }
              } else {
                // عرض رسالة توضيحية عند عدم توفر البيانات
                let reason = "بيانات غير متوفرة";
                if (!qrCodeElement) reason = "عنصر QR غير موجود";
                else if (isFallbackUrl) reason = "نطاق المتجر غير محدد";
                else if (!productPageUrl) reason = "رابط المنتج فارغ";
                
                (printWindow as any).console.warn(`[QR Warning ${uniqueSuffix}] Cannot generate QR: ${reason}`);
                if (qrCodeElement) {
                  (qrCodeElement as HTMLElement).innerHTML = `
                    <div style="width: 60px; height: 60px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 7px; text-align: center; color: #999;">
                      <div>${reason}</div>
                    </div>
                  `;
                }
              }
            }
          }
        });

        printWindow.focus();
        
        // التأكد من تحميل كافة العناصر قبل الطباعة
        const initiateActualPrint = () => {
          if (printWindow && printWindow.document) {
            const pWindow = printWindow as Window & { document: Document & { fonts: FontFaceSet } };
            
            // تأخير إضافي للـ QR codes لضمان التحميل الكامل
            const finalDelay = selectedTemplate.id === 'qr-plus-barcode' ? 2000 : 1000;
            
            setTimeout(() => {
              if (pWindow.document.fonts && typeof pWindow.document.fonts.ready === 'function') {
                (pWindow.document.fonts.ready as Promise<FontFaceSet>).then(() => {
                  pWindow.print();
                }).catch(printError => {
                  pWindow.print(); 
                });
              } else {
                pWindow.print();
              }
            }, finalDelay);
          } else {
            toast.error("فشل تهيئة نافذة الطباعة بشكل كامل.");
          }
        };
        
        // بدء عملية الطباعة
        initiateActualPrint();
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
                    تحديد الكل ({products.filter(p => p.selected).length} / {filteredProducts.length})
                </label>
                </div>
            )}
          </div>

          {/* قسم البحث والفلترة */}
          <div className="mb-6 space-y-4">
            {/* شريط البحث */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="ابحث بالاسم أو SKU أو الباركود..."
                  value={searchAndFilter.search_query}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="whitespace-nowrap"
              >
                <Filter className="h-4 w-4 ml-2" />
                مسح الفلاتر
              </Button>
            </div>

            {/* فلاتر متقدمة */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* ترتيب حسب */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  ترتيب حسب
                </Label>
                <Select 
                  value={`${searchAndFilter.sort_by}-${searchAndFilter.sort_order}`} 
                  onValueChange={(value) => {
                    const [field, order] = value.split('-') as [SearchAndFilter['sort_by'], 'asc' | 'desc'];
                    setSearchAndFilter(prev => ({ ...prev, sort_by: field, sort_order: order }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">الاسم (أ-ي)</SelectItem>
                    <SelectItem value="name-desc">الاسم (ي-أ)</SelectItem>
                    <SelectItem value="price-asc">السعر (من الأقل)</SelectItem>
                    <SelectItem value="price-desc">السعر (من الأعلى)</SelectItem>
                    <SelectItem value="stock-asc">المخزون (من الأقل)</SelectItem>
                    <SelectItem value="stock-desc">المخزون (من الأكثر)</SelectItem>
                    <SelectItem value="sku-asc">SKU (أ-ي)</SelectItem>
                    <SelectItem value="sku-desc">SKU (ي-أ)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* فلتر المخزون */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">حالة المخزون</Label>
                <Select 
                  value={searchAndFilter.stock_filter} 
                  onValueChange={(value: SearchAndFilter['stock_filter']) => 
                    handleFilterChange('stock_filter', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع المنتجات</SelectItem>
                    <SelectItem value="in_stock">متوفر (أكثر من 5)</SelectItem>
                    <SelectItem value="low_stock">مخزون منخفض (1-5)</SelectItem>
                    <SelectItem value="out_of_stock">نفد المخزون (0)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* نطاق السعر - الحد الأدنى */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">السعر من</Label>
                <Input
                  type="number"
                  placeholder="الحد الأدنى"
                  value={searchAndFilter.price_range.min}
                  onChange={(e) => handleFilterChange('price_range', {
                    ...searchAndFilter.price_range,
                    min: e.target.value
                  })}
                />
              </div>

              {/* نطاق السعر - الحد الأعلى */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">السعر إلى</Label>
                <Input
                  type="number"
                  placeholder="الحد الأعلى"
                  value={searchAndFilter.price_range.max}
                  onChange={(e) => handleFilterChange('price_range', {
                    ...searchAndFilter.price_range,
                    max: e.target.value
                  })}
                />
              </div>
            </div>

            {/* عرض إحصائيات النتائج */}
            <div className="flex justify-between items-center text-sm text-muted-foreground">
              <span>
                عرض {filteredProducts.length} من أصل {products.length} منتج
              </span>
              {searchAndFilter.search_query && (
                <span>نتائج البحث عن: "{searchAndFilter.search_query}"</span>
              )}
            </div>
          </div>

          {products.length === 0 && !isLoading && (
            <p className="text-muted-foreground text-center py-8">
              لم يتم العثور على منتجات. قد تحتاج إلى إضافة منتجات أولاً أو التحقق من الدالة `get_products_for_barcode_printing` في قاعدة البيانات.
            </p>
          )}
          {filteredProducts.length === 0 && products.length > 0 && (
            <div className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                لا توجد منتجات تطابق معايير البحث والفلترة
              </p>
              <Button variant="outline" onClick={clearFilters} className="mt-2">
                مسح الفلاتر
              </Button>
            </div>
          )}
          {filteredProducts.length > 0 && (
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
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange('name')}>
                      <div className="flex items-center gap-2">
                        اسم المنتج
                        {searchAndFilter.sort_by === 'name' && (
                          searchAndFilter.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange('sku')}>
                      <div className="flex items-center gap-2">
                        SKU
                        {searchAndFilter.sort_by === 'sku' && (
                          searchAndFilter.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange('stock')}>
                      <div className="flex items-center justify-center gap-2">
                        المخزون
                        {searchAndFilter.sort_by === 'stock' && (
                          searchAndFilter.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[120px] text-center cursor-pointer hover:bg-muted/50" onClick={() => handleSortChange('price')}>
                      <div className="flex items-center justify-center gap-2">
                        السعر
                        {searchAndFilter.sort_by === 'price' && (
                          searchAndFilter.sort_order === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />
                        )}
                      </div>
                    </TableHead>
                    <TableHead className="w-[150px] text-center">عدد النسخ</TableHead>
                    <TableHead className="w-[180px] text-center">استخدام كمية المخزون</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product) => (
                    <TableRow key={product.product_id} className={product.selected ? 'bg-muted/50' : ''}>
                      <TableCell>
                        <Checkbox
                          id={`select-${product.product_id}`}
                          checked={product.selected}
                          onCheckedChange={() => handleSelectProduct(product.product_id)}
                          aria-label={`Select ${product.product_name}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={product.product_name}>
                          {product.product_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{product.product_sku}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock_quantity === 0 
                            ? 'bg-red-100 text-red-800' 
                            : product.stock_quantity <= 5 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {product.stock_quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">
                          {typeof product.product_price === 'number' 
                            ? product.product_price.toFixed(2) 
                            : parseFloat(product.product_price).toFixed(2)
                          } د.ج
                        </span>
                      </TableCell>
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
