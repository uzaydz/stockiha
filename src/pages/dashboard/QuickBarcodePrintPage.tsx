import React, { useState, useEffect, useCallback, useMemo } from 'react';
import POSPureLayout from '@/components/pos-layout/POSPureLayout';
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
import { Loader2, Search, Filter, SortAsc, SortDesc, Calendar, Hash, Package, Wifi, WifiOff, Printer, Eye } from 'lucide-react';
// ⚡ استيراد المكونات الجديدة
import BarcodePreview from '@/components/barcode/BarcodePreview';
import PrintHistory from '@/components/barcode/PrintHistory';
import KeyboardShortcutsHelp from '@/components/barcode/KeyboardShortcutsHelp';
import { usePrintShortcuts } from '@/hooks/usePrintShortcuts';
import { printHistoryService } from '@/services/PrintHistoryService';
import JsBarcode from 'jsbarcode';
// Import barcode templates
import { barcodeTemplates, BarcodeTemplate } from '@/config/barcode-templates';
// استيراد دالة تحضير قيم الباركود
import { prepareBarcodeValue, generateBarcodeLocal, generateQRCodeLocal } from '@/lib/barcode-utils';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase';
// ⚡ استيراد الخدمات الجديدة
import { useProductsForPrinting, type ProductForBarcode } from '@/hooks/useProductsForPrinting';
import { tauriPrintService } from '@/services/TauriPrintService';
import { localBarcodeGenerator } from '@/services/LocalBarcodeGenerator';
import { isElectronApp, isDesktopApp } from '@/lib/platform';
import { printSettingsService, type PrintSettings } from '@/services/PrintSettingsService';
// ⚡ نظام الطباعة الموحد
import { usePrinter } from '@/hooks/usePrinter';

// استخدام ProductForBarcode من useProductsForPrinting
// interface ProductForBarcode معرف في useProductsForPrinting.ts

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

// interface PrintSettings تم استبداله بالنوع المستورد من PrintSettingsService

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

// ⚡ خيارات الخطوط - جميعها محلية أو نظام (لا URLs خارجية)
export const fontOptions: FontOption[] = [
  {
    id: "system-ui",
    name: "النظام الافتراضي (System UI)",
    cssValue: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif",
  },
  {
    id: "tajawal",
    name: "تجوال (Tajawal) - عربي ⭐",
    cssValue: "'Tajawal', sans-serif",
    isRTL: true,
    // ⚡ خط محلي - يعمل أوفلاين
  },
  {
    id: "arial",
    name: "آريال (Arial)",
    cssValue: "Arial, sans-serif",
  },
  {
    id: "helvetica",
    name: "هيلفيتيكا (Helvetica)",
    cssValue: "Helvetica, Arial, sans-serif",
  },
  {
    id: "times",
    name: "تايمز (Times New Roman)",
    cssValue: "'Times New Roman', Times, serif",
  },
  {
    id: "courier",
    name: "كوريير (Courier) - للباركود",
    cssValue: "'Courier New', Courier, monospace",
  },
];

// ⚡ توليد QR Code محلياً بدلاً من qr-code-styling
const generateQRCodeForPrint = async (value: string, size: number = 80): Promise<string> => {
  try {
    return await localBarcodeGenerator.generateQRCode(value, {
      width: size,
      height: size,
      margin: 4,
      errorCorrectionLevel: 'L'
    });
  } catch (error) {
    console.warn('[QR] فشل التوليد المحلي، استخدام API خارجي:', error);
    // Fallback للـ API الخارجي
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(value)}&size=${size}x${size}&margin=4&ecc=L`;
  }
};

const QuickBarcodePrintPage = () => {
  const { currentOrganization } = useTenant();
  const [products, setProducts] = useState<SelectedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<SelectedProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectAll, setSelectAll] = useState(false);

  // ⚡ نظام الطباعة الموحد
  const {
    printHtml,
    printBarcodes,
    isElectron: isElectronPrint,
    selectedPrinter,
    isPrinting
  } = usePrinter();

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
    selected_template_id: barcodeTemplates[0]?.id || "default",
    font_family_css: fontOptions[0]?.cssValue || "sans-serif",
  });

  // تحميل الإعدادات عند البدء
  useEffect(() => {
    const loadSettings = async () => {
      if (currentOrganization?.id) {
        const settings = await printSettingsService.getSettings(currentOrganization.id);
        setPrintSettings(settings);
        // تهيئة جدول سجل الطباعة
        await printHistoryService.initTable();
      }
    };
    loadSettings();
  }, [currentOrganization?.id]);

  // حفظ الإعدادات عند التغيير
  useEffect(() => {
    const saveSettings = async () => {
      if (currentOrganization?.id) {
        // debounce الحفظ لتجنب الكتابة المتكررة
        const timeoutId = setTimeout(() => {
          printSettingsService.saveSettings(printSettings, currentOrganization.id);
        }, 1000);
        return () => clearTimeout(timeoutId);
      }
    };
    saveSettings();
  }, [printSettings, currentOrganization?.id]);

  // ⚡ state للمعاينة
  const [showPreview, setShowPreview] = useState(false);

  // ⚡ المنتج المحدد للمعاينة (أول منتج محدد)
  const previewProduct = useMemo(() => {
    return products.find(p => p.selected) || products[0];
  }, [products]);

  // ⚡ دالة إعادة الطباعة من السجل (يجب أن تكون قبل أي return)
  const handleReprint = useCallback((productIds: string[]) => {
    setProducts(prev => prev.map(p => ({
      ...p,
      selected: productIds.includes(p.product_id)
    })));
    toast.info(`تم تحديد ${productIds.length} منتج للطباعة`);
  }, []);

  // ⚡ اختصارات لوحة المفاتيح (يجب أن تكون قبل أي return)
  const { shortcuts } = usePrintShortcuts({
    onPrint: () => {}, // سيتم تحديثه لاحقاً
    onSelectAll: () => {
      if (!selectAll) handleSelectAll();
    },
    onDeselectAll: () => {
      if (selectAll) handleSelectAll();
    },
    onPreview: () => setShowPreview(!showPreview),
    enabled: !isLoading && !error
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
      // إذا لم تكن المؤسسة معروفة بعد، انتظر حتى تتوفر
      if (!currentOrganization?.id) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      // جلب جميع المنتجات على دفعات 1000 لتجاوز حد Supabase
      const pageSize = 1000;
      let offset = 0;
      let allRows: ProductForBarcode[] = [];

      // المحاولة الأولى: استخدام الدالة المحسنة مع pagination
      while (true) {
        const { data: pageData, error: pageError } = await (supabase.rpc as any)(
          'get_products_for_barcode_printing_enhanced',
          {
            p_organization_id: currentOrganization.id,
            p_search_query: null,
            p_sort_by: 'name',
            p_sort_order: 'asc',
            p_stock_filter: 'all',
            p_price_min: null,
            p_price_max: null,
            p_limit: pageSize,
            p_offset: offset,
          }
        );

        if (pageError) {
          // في حال عدم توفر الدالة المحسنة، ارجع إلى الدالة المبسطة القديمة (قد تُرجع 1000 فقط)
          const { data: legacyData, error: legacyError } = await (supabase.rpc as any)(
            'get_products_for_barcode_printing',
            { p_organization_id: currentOrganization.id }
          );
          if (legacyError) throw legacyError;
          allRows = Array.isArray(legacyData) ? legacyData : [];
          break;
        }

        const rows = Array.isArray(pageData) ? pageData : [];
        allRows = allRows.concat(rows);

        if (rows.length < pageSize) break;
        offset += pageSize;
        // تأخير بسيط لتخفيف الضغط على القاعدة
        await new Promise((r) => setTimeout(r, 80));
        // حماية من الحلقات الطويلة جداً (حد أقصى 10000 منتج)
        if (offset >= 10000) break;
      }

      const selectableProducts: SelectedProduct[] = allRows.map((p: ProductForBarcode) => ({
        ...p,
        selected: false,
        print_quantity: p.stock_quantity > 0 ? p.stock_quantity : 1,
        use_stock_quantity: true,
      }));
      setProducts(selectableProducts);
    } catch (err: any) {
      setError(
        `حدث خطأ أثناء جلب المنتجات: ${err.message}. تأكد من أن الدالة get_products_for_barcode_printing معرفة في قاعدة البيانات.`
      );
      toast.error("فشل جلب المنتجات: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentOrganization?.id]);

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
      <POSPureLayout>
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg text-muted-foreground">جاري تحميل المنتجات...</p>
          </div>
        </div>
      </POSPureLayout>
    );
  }

  if (error) {
    return (
      <POSPureLayout>
        <div className="p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchProductsForBarcode} className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </POSPureLayout>
    );
  }

  // ⚡ دالة الطباعة باستخدام Tauri API
  const printViaIframe = async (htmlContent: string): Promise<boolean> => {
    const printContainerId = 'barcode-print-container';
    console.log('[Print] بدء عملية الطباعة...');

    // إزالة container قديم إذا وجد
    const existingContainer = document.getElementById(printContainerId);
    if (existingContainer) {
      existingContainer.remove();
    }
    const existingStyles = document.getElementById('print-styles-temp');
    if (existingStyles) {
      existingStyles.remove();
    }

    // إنشاء container للطباعة
    const printContainer = document.createElement('div');
    printContainer.id = printContainerId;
    printContainer.innerHTML = htmlContent;
    printContainer.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 99999; background: white; overflow: auto;';

    // إضافة styles للطباعة
    const printStyles = document.createElement('style');
    printStyles.id = 'print-styles-temp';
    printStyles.textContent = `
      @media print {
        body > *:not(#${printContainerId}) { display: none !important; }
        #${printContainerId} {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    document.body.appendChild(printContainer);
    console.log('[Print] تم إنشاء container للطباعة');

    // انتظار تحميل المحتوى
    await new Promise(r => setTimeout(r, 1000));

    // ⚡ الطباعة باستخدام window.print
    console.log('[Print] استخدام window.print...');
    try {
      window.focus();
      window.print();
      console.log('[Print] تم استدعاء window.print()');
      toast.success('تم فتح نافذة الطباعة');

      // إزالة العناصر بعد الطباعة
      setTimeout(() => {
        printContainer.remove();
        printStyles.remove();
      }, 2000);

      return true;
    } catch (error: any) {
      console.error('[Print Error]', error);
      printContainer.remove();
      printStyles.remove();
      toast.error(`خطأ في الطباعة: ${error.message}`);
      return false;
    }
  };

  const generateAndPrintBarcodes = async () => {
    const selectedProducts = products.filter(p => p.selected);
    if (selectedProducts.length === 0) {
      toast.error("يرجى اختيار منتج واحد على الأقل للطباعة.");
      return;
    }

    const selectedTemplate = barcodeTemplates.find(t => t.id === printSettings.selected_template_id) || barcodeTemplates[0];
    const selectedFont = fontOptions.find(f => f.cssValue === printSettings.font_family_css) || fontOptions[0];

    // ⚡ محاولة الطباعة المباشرة عبر Electron أولاً
    if (isElectronPrint) {
      try {
        toast.info('جاري تحضير الطباعة المباشرة...');

        // تجهيز بيانات الباركود للطباعة المباشرة
        const barcodeData = selectedProducts.flatMap(product => {
          const itemsToPrintCount = product.use_stock_quantity
            ? (product.stock_quantity > 0 ? product.stock_quantity : 1)
            : product.print_quantity;

          const barcodes = [];
          for (let i = 0; i < itemsToPrintCount; i++) {
            barcodes.push({
              value: product.product_barcode || product.product_sku || product.product_id || 'NO_DATA',
              productName: printSettings.display_product_name ? product.product_name : undefined,
              price: printSettings.display_price ? `${product.product_price} DA` : undefined,
              storeName: printSettings.display_store_name ? product.organization_name : undefined,
              height: 50,
              width: 2,
              showValue: printSettings.display_barcode_value
            });
          }
          return barcodes;
        });

        const result = await printBarcodes(barcodeData, {
          labelSize: {
            width: `${printSettings.label_width}mm`,
            height: `${printSettings.label_height}mm`
          },
          showProductName: printSettings.display_product_name,
          showPrice: printSettings.display_price,
          showStoreName: printSettings.display_store_name
        });

        if (result.success) {
          toast.success('تمت الطباعة بنجاح!');

          // حفظ سجل الطباعة
          if (currentOrganization?.id) {
            const productsForHistory = selectedProducts.map(p => ({
              id: p.product_id,
              name: p.product_name,
              quantity: p.use_stock_quantity ? (p.stock_quantity > 0 ? p.stock_quantity : 1) : p.print_quantity
            }));

            await printHistoryService.addPrintRecord(
              currentOrganization.id,
              productsForHistory,
              {
                templateId: printSettings.selected_template_id,
                labelSize: `${printSettings.label_width}x${printSettings.label_height}`,
                barcodeType: printSettings.barcode_type
              },
              'success'
            );
          }
          return;
        } else {
          console.warn('[Print] فشلت الطباعة المباشرة، التراجع إلى الطباعة العادية:', result.error);
        }
      } catch (err) {
        console.warn('[Print] خطأ في الطباعة المباشرة، التراجع إلى الطباعة العادية:', err);
      }
    }

    // ⚡ توليد الباركودات مسبقاً كـ Data URLs (للطباعة العادية)
    const generateBarcodeDataUrl = (value: string, format: string): string => {
      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, value, {
          format: format,
          lineColor: "#000",
          width: 2,
          height: 50,
          displayValue: printSettings.display_barcode_value,
          fontSize: 10,
          margin: 5,
          ...(selectedTemplate.jsBarcodeOptions || {})
        });
        return canvas.toDataURL('image/png');
      } catch (error) {
        console.warn('[Barcode] فشل توليد الباركود:', value, error);
        // محاولة CODE128 كـ fallback
        try {
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, value, {
            format: 'CODE128',
            lineColor: "#000",
            width: 2,
            height: 50,
            displayValue: printSettings.display_barcode_value,
            fontSize: 10,
            margin: 5
          });
          return canvas.toDataURL('image/png');
        } catch (e2) {
          return '';
        }
      }
    };

    let printHtmlContent = '<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"><title>طباعة الباركود</title>';

    // ⚡ تضمين الخطوط المحلية - يعمل أوفلاين
    let fontImportStyle = '';
    if (selectedFont && selectedFont.id === 'tajawal') {
      // خط Tajawal محلي - للعربية
      fontImportStyle = `
        @font-face {
          font-family: 'Tajawal';
          src: url('/fonts/tajawal-regular.woff2') format('woff2');
          font-weight: 400;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Tajawal';
          src: url('/fonts/tajawal-medium.woff2') format('woff2');
          font-weight: 500;
          font-style: normal;
          font-display: swap;
        }
        @font-face {
          font-family: 'Tajawal';
          src: url('/fonts/tajawal-bold.woff2') format('woff2');
          font-weight: 700;
          font-style: normal;
          font-display: swap;
        }
      `;
    }
    // ⚠️ لا نستخدم URLs خارجية للخطوط - جميع الخطوط الأخرى هي خطوط نظام

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

    // ⚡ توليد الباركودات كصور Data URL مسبقاً (لا يحتاج DOM خارجي)
    for (const product of selectedProducts) {
      const itemsToPrintCount = product.use_stock_quantity ? (product.stock_quantity > 0 ? product.stock_quantity : 1) : product.print_quantity;

      for (let i = 0; i < itemsToPrintCount; i++) {
        const baseUrl = productUrlBase(product.organization_domain, product.organization_subdomain);
        const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
        const productPageUrl = `${baseUrl}/products/${slugPart}`;
        const isFallbackUrl = baseUrl === 'fallback-base-url.com';

        // تحضير قيمة الباركود
        const valueToEncodeForBarcode = product.product_barcode || product.product_sku || product.product_id || 'NO_DATA';
        let barcodeFormatForTemplate = printSettings.barcode_type;
        if (selectedTemplate.id === 'qr-plus-barcode') {
          barcodeFormatForTemplate = 'CODE128';
        }
        const valueToUse = prepareBarcodeValue(valueToEncodeForBarcode, barcodeFormatForTemplate);

        // توليد صورة الباركود
        const barcodeDataUrl = generateBarcodeDataUrl(valueToUse, barcodeFormatForTemplate);

        // توليد QR Code إذا لزم الأمر
        let qrCodeHtml = '';
        if (selectedTemplate.id === 'qr-plus-barcode' && !isFallbackUrl) {
          try {
            const qrDataUrl = await generateQRCodeForPrint(productPageUrl, 80);
            if (qrDataUrl) {
              qrCodeHtml = `<img src="${qrDataUrl}" alt="QR Code" style="width: 80px; height: 80px; image-rendering: crisp-edges;" />`;
            }
          } catch (e) {
            console.warn('[QR] فشل توليد QR Code');
            qrCodeHtml = `<div style="width: 80px; height: 80px; border: 1px dashed #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR</div>`;
          }
        }

        if (selectedTemplate.id === 'qr-plus-barcode') {
          printHtmlContent += `
            <div class="barcode-label template-${selectedTemplate.id}">
              ${printSettings.display_store_name ? `<div class="store-name-header-new">${product.organization_name}</div>` : ''}
              <div class="main-content-wrapper-new">
                <div class="qr-code-container-new">
                  ${qrCodeHtml}
                </div>
                <div class="product-details-area-new">
                  <div class="info-table-new">
                    ${printSettings.display_product_name ?
              `<div class="info-table-row-new product-name-row-new">
                        <span class="info-value-new product-name-value-new">${product.product_name}</span>
                      </div>` : ''}
                    <div class="info-table-row-new barcode-row-new">
                      <div class="barcode-svg-container-new">
                        ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="Barcode" style="max-width: 100%; height: auto;" />` : '<span style="color: red;">خطأ باركود</span>'}
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
          // القالب العادي
          printHtmlContent += `<div class="barcode-label template-${selectedTemplate.id}">
            ${printSettings.display_store_name ? `<p class="org-name">${product.organization_name}</p>` : ''}
            ${printSettings.display_product_name ? `<p class="product-name">${product.product_name}</p>` : ''}
            ${selectedTemplate.id === 'ideal' && (printSettings.display_product_name || printSettings.display_store_name) ? '<div class="divider"></div>' : ''}
            ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="Barcode" style="max-width: 95%; height: auto; max-height: 50%; margin: 0.5mm auto; display: block;" />` : '<span style="color: red;">خطأ باركود</span>'}
            ${printSettings.display_price || printSettings.display_sku ?
              `<div class="price-sku-container">
                ${printSettings.display_price ? `<p class="price">${product.product_price} DA</p>` : ''}
                ${printSettings.display_sku ? `<p class="sku">SKU: ${product.product_sku}</p>` : ''}
              </div>` : ''}
          </div>`;
        }
      }
    }
    printHtmlContent += '</body></html>';

    // ⚡ استخدام iframe للطباعة (يعمل في Tauri)
    toast.info('جاري تحضير الطباعة...');
    const success = await printViaIframe(printHtmlContent);

    // ⚡ حفظ سجل الطباعة
    if (currentOrganization?.id) {
      const productsForHistory = selectedProducts.map(p => ({
        id: p.product_id,
        name: p.product_name,
        quantity: p.use_stock_quantity ? (p.stock_quantity > 0 ? p.stock_quantity : 1) : p.print_quantity
      }));
      
      await printHistoryService.addPrintRecord(
        currentOrganization.id,
        productsForHistory,
        {
          templateId: printSettings.selected_template_id,
          labelSize: `${printSettings.label_width}x${printSettings.label_height}`,
          barcodeType: printSettings.barcode_type
        },
        success ? 'success' : 'failed'
      );
    }
  };


  return (
    <POSPureLayout onRefresh={fetchProductsForBarcode} isRefreshing={isLoading}>
      <div className="p-4 md:p-6 overflow-y-auto h-full">
        {/* ⚡ العنوان مع الأزرار */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">طباعة سريعة للباركود</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
              className="h-8"
            >
              <Eye className="h-4 w-4 ml-1" />
              {showPreview ? 'إخفاء المعاينة' : 'معاينة'}
            </Button>
            <KeyboardShortcutsHelp shortcuts={shortcuts} />
          </div>
        </div>

        {/* ⚡ قسم المعاينة والسجل */}
        {showPreview && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* معاينة الباركود */}
            {previewProduct && (
              <BarcodePreview
                productName={previewProduct.product_name}
                productPrice={previewProduct.product_price}
                productSku={previewProduct.product_sku}
                productBarcode={previewProduct.product_barcode || ''}
                storeName={previewProduct.organization_name}
                barcodeType={printSettings.barcode_type}
                templateId={printSettings.selected_template_id}
                showStoreName={printSettings.display_store_name}
                showProductName={printSettings.display_product_name}
                showPrice={printSettings.display_price}
                showSku={printSettings.display_sku}
                showBarcodeValue={printSettings.display_barcode_value}
                labelWidth={printSettings.label_width}
                labelHeight={printSettings.label_height}
                fontFamily={printSettings.font_family_css}
              />
            )}
            
            {/* سجل الطباعة */}
            {currentOrganization?.id && (
              <PrintHistory
                organizationId={currentOrganization.id}
                onReprint={handleReprint}
              />
            )}
          </div>
        )}

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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.stock_quantity === 0
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
                  { key: "display_store_name", label: "عرض اسم المتجر" },
                  { key: "display_product_name", label: "عرض اسم المنتج" },
                  { key: "display_price", label: "عرض السعر" },
                  { key: "display_sku", label: "عرض SKU" },
                  { key: "display_barcode_value", label: "عرض قيمة الباركود (نص)" }
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
    </POSPureLayout>
  );
};

export default QuickBarcodePrintPage;
