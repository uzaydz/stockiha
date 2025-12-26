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
import { Loader2, Search, Filter, SortAsc, SortDesc, Calendar, Hash, Package, Wifi, WifiOff, Printer, Eye, X } from 'lucide-react';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
// ⚡ استيراد المكونات الجديدة
import BarcodePreviewEnhanced from '@/components/barcode/BarcodePreviewEnhanced';
import PrintHistory from '@/components/barcode/PrintHistory';
import KeyboardShortcutsHelp from '@/components/barcode/KeyboardShortcutsHelp';
import { usePrintShortcuts } from '@/hooks/usePrintShortcuts';
import { printHistoryService } from '@/services/PrintHistoryService';
import JsBarcode from 'jsbarcode';
// Import barcode templates
import { barcodeTemplates, BarcodeTemplate } from '@/config/barcode-templates';
// استيراد دالة تحضير قيم الباركود
import { prepareBarcodeValue, generateBarcodeLocal, generateQRCodeLocal } from '@/lib/barcode-utils';
import { renderLabelsToHtml, PrintableItem } from '@/utils/barcodeRenderer';
import { useTenant } from '@/context/TenantContext';
// ⚡ استيراد الخدمات الجديدة المحسّنة
import {
  useProductsForBarcodePrintingOffline,
  type ProductForBarcodePrinting
} from '@/hooks/useProductsForBarcodePrintingOffline';
import { tauriPrintService } from '@/services/TauriPrintService';
import { localBarcodeGenerator } from '@/services/LocalBarcodeGenerator';
import { isElectronApp, isDesktopApp } from '@/lib/platform';
import { printSettingsService, type PrintSettings } from '@/services/PrintSettingsService';
// ⚡ نظام الطباعة الموحد
import { usePrinter } from '@/hooks/usePrinter';
// ⚡ مكون Pagination
import { BarcodePagination } from '@/components/barcode/BarcodePagination';

// ⚡ استخدام ProductForBarcodePrinting من useProductsForBarcodePrintingOffline

interface SelectedProduct extends ProductForBarcodePrinting {
  selected: boolean;
  print_quantity: number;
  use_stock_quantity: boolean;
}

// إضافة interface للفلاتر والبحث
interface SearchAndFilter {
  search_query: string;
  sort_by: 'name' | 'price' | 'stock' | 'sku';
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
type GetProductsRpcReturn = ProductForBarcodePrinting[];

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

// ⚡ خيارات الخطوط - جميعها محلية تعمل أوفلاين
export const fontOptions: FontOption[] = [
  // === خطوط عربية ===
  {
    id: "tajawal",
    name: "تجوال (Tajawal) ⭐ - الأفضل للعربية",
    cssValue: "'Tajawal', sans-serif",
    isRTL: true,
  },
  {
    id: "cairo",
    name: "القاهرة (Cairo) - عربي أنيق",
    cssValue: "'Cairo', sans-serif",
    isRTL: true,
  },
  // === خطوط إنجليزية/فرنسية ===
  {
    id: "inter",
    name: "Inter ⭐ - الأفضل للإنجليزية والفرنسية",
    cssValue: "'Inter', sans-serif",
  },
  {
    id: "roboto",
    name: "Roboto - عالمي ومتوازن",
    cssValue: "'Roboto', sans-serif",
  },
  // === خطوط النظام (Fallback) ===
  {
    id: "system-ui",
    name: "النظام الافتراضي (System UI)",
    cssValue: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  {
    id: "arial",
    name: "آريال (Arial) - كلاسيكي",
    cssValue: "Arial, sans-serif",
  },
  {
    id: "times",
    name: "تايمز (Times New Roman) - رسمي",
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
  const [selectAll, setSelectAll] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  // ⚡ state للبحث والفلترة
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

  // ⚡ استخدام useDebouncedSearch مثل POS (تأخير 300ms)
  const {
    inputValue: searchInput,
    debouncedValue: debouncedSearchQuery,
    setInputValue: setSearchInput,
    clearSearch: clearSearchInput,
    isSearching
  } = useDebouncedSearch({
    delay: 300,
    onDebouncedChange: (value) => {
      setSearchAndFilter(prev => ({
        ...prev,
        search_query: value
      }));
    }
  });

  // ⚡ جلب المنتجات من PowerSync مع pagination (يعمل offline!)
  const {
    products: fetchedProducts,
    isLoading,
    error,
    pagination,
    goToPage,
    nextPage,
    previousPage,
    setPageSize,
    refresh,
    totalCount
  } = useProductsForBarcodePrintingOffline({
    initialPageSize: 50,
    searchQuery: searchAndFilter.search_query,
    sortBy: searchAndFilter.sort_by as 'name' | 'price' | 'stock' | 'sku',
    sortOrder: searchAndFilter.sort_order,
    stockFilter: searchAndFilter.stock_filter,
    priceMin: searchAndFilter.price_range.min ? parseFloat(searchAndFilter.price_range.min) : null,
    priceMax: searchAndFilter.price_range.max ? parseFloat(searchAndFilter.price_range.max) : null
  });

  // ⚡ نظام الطباعة الموحد
  const {
    printHtml,
    printBarcodes,
    isElectron: isElectronPrint,
    selectedPrinter,
    setSelectedPrinter,
    isPrinting,
    printers,
    printTest,
    fetchPrinters
  } = usePrinter();

  // ⚡ تحويل المنتجات المجلوبة إلى SelectedProduct مع الاحتفاظ بحالة selected
  const [printQuantities, setPrintQuantities] = useState<Record<string, { quantity: number; useStock: boolean }>>({});

  const products = useMemo<SelectedProduct[]>(() => {
    return fetchedProducts.map(p => ({
      ...p,
      selected: selectedProductIds.has(p.product_id),
      print_quantity: printQuantities[p.product_id]?.quantity ?? (p.stock_quantity > 0 ? p.stock_quantity : 1),
      use_stock_quantity: printQuantities[p.product_id]?.useStock ?? true
    }));
  }, [fetchedProducts, selectedProductIds, printQuantities]);

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
    // ⚡ إعدادات الطباعة التلقائية
    barcode_printer_name: null,
    silent_print: true,
    auto_select_printer: true,
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

  // ⚡ جلب قائمة الطابعات عند تحميل الصفحة (في Electron فقط)
  useEffect(() => {
    if (isElectronPrint) {
      fetchPrinters();
    }
  }, [isElectronPrint, fetchPrinters]);


  // ⚡ المنتج المحدد للمعاينة (أول منتج محدد)
  const previewProduct = useMemo(() => {
    return products.find(p => p.selected) || products[0];
  }, [products]);

  // ⚡ دالة إعادة الطباعة من السجل
  const handleReprint = useCallback((productIds: string[]) => {
    setSelectedProductIds(new Set(productIds));
    setSelectAll(false);
    toast.info(`تم تحديد ${productIds.length} منتج للطباعة`);
  }, []);

  // ⚡ اختصارات لوحة المفاتيح (يجب أن تكون قبل أي return)
  const { shortcuts } = usePrintShortcuts({
    onPrint: () => { }, // سيتم تحديثه لاحقاً
    onSelectAll: () => {
      if (!selectAll) handleSelectAll();
    },
    onDeselectAll: () => {
      if (selectAll) handleSelectAll();
    },
    onPreview: () => { }, // Preview functionality can be added later if needed
    enabled: !isLoading && !error
  });

  // ⚡ رسالة ترحيب
  useEffect(() => {
    toast.info('مرحباً بك في صفحة الطباعة السريعة للباركود!');
  }, []);

  // ⚡ Keyboard shortcuts للبحث
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + F للتركيز على البحث
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInputEl = document.querySelector<HTMLInputElement>('input[placeholder*="ابحث"]');
        searchInputEl?.focus();
      }
      // Esc لمسح البحث
      if (e.key === 'Escape' && searchInput) {
        clearSearchInput();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchInput, clearSearchInput]);

  // دوال التعامل مع البحث والفلترة
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
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
    clearSearchInput();
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

  // ⚡ تحديث دوال التحديد لاستخدام selectedProductIds
  const handleSelectProduct = useCallback((productId: string) => {
    setSelectedProductIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
    setSelectAll(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    if (newSelectAll) {
      // تحديد جميع المنتجات في الصفحة الحالية
      const allIds = new Set(products.map(p => p.product_id));
      setSelectedProductIds(allIds);
    } else {
      // إلغاء تحديد الكل
      setSelectedProductIds(new Set());
    }
  }, [selectAll, products]);

  const handlePrintQuantityChange = useCallback((productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity, 10);
    setPrintQuantities(prev => ({
      ...prev,
      [productId]: {
        quantity: isNaN(numQuantity) || numQuantity < 1 ? 1 : numQuantity,
        useStock: false
      }
    }));
  }, []);

  const handleUseStockQuantityChange = useCallback((productId: string) => {
    const product = products.find(p => p.product_id === productId);
    if (!product) return;

    const currentUseStock = printQuantities[productId]?.useStock ?? true;
    const newUseStock = !currentUseStock;

    setPrintQuantities(prev => ({
      ...prev,
      [productId]: {
        useStock: newUseStock,
        quantity: newUseStock
          ? (product.stock_quantity > 0 ? product.stock_quantity : 1)
          : (prev[productId]?.quantity ?? 1)
      }
    }));
  }, [products, printQuantities]);

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
          <Button onClick={refresh} className="mt-4">
            إعادة المحاولة
          </Button>
        </div>
      </POSPureLayout>
    );
  }

  // ⚡ دالة الطباعة المحسّنة (تدعم Electron و Browser)
  const printViaIframe = async (htmlContent: string): Promise<boolean> => {
    const printContainerId = 'barcode-print-container';
    console.log('[Print] 🖨️ بدء عملية الطباعة...');

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

    // ⚡ تحسين CSS للطباعة الحرارية
    printContainer.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 99999;
      background: white;
      overflow: auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
    `;

    // إضافة styles محسّنة للطباعة
    const printStyles = document.createElement('style');
    printStyles.id = 'print-styles-temp';
    printStyles.textContent = `
      @media print {
        /* إخفاء كل شيء ما عدا محتوى الطباعة */
        body > *:not(#${printContainerId}) { display: none !important; }

        #${printContainerId} {
          position: static !important;
          width: 100% !important;
          height: auto !important;
          overflow: visible !important;
        }

        /* ⚡ تحسينات للطباعة الحرارية */
        * {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color-adjust: exact !important;
        }

        /* تحسين جودة الصور */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
          image-rendering: pixelated;
        }

        /* ⚡ منع تقسيم الملصقات والعناصر */
        .barcode-label {
          page-break-inside: avoid !important;
          page-break-after: always;
          break-inside: avoid !important;
        }
        .barcode-label:last-child {
          page-break-after: auto;
        }
        .barcode-label * {
          page-break-inside: avoid !important;
          break-inside: avoid !important;
        }
      }
    `;
    document.head.appendChild(printStyles);
    document.body.appendChild(printContainer);
    console.log('[Print] ✅ تم إنشاء container للطباعة');

    // ⚡ انتظار تحميل جميع الصور
    const images = printContainer.querySelectorAll('img');
    if (images.length > 0) {
      console.log(`[Print] ⏳ انتظار تحميل ${images.length} صورة...`);
      await Promise.all(
        Array.from(images).map(img => {
          if (img.complete) return Promise.resolve();
          return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve; // تجاهل الأخطاء
            setTimeout(resolve, 2000); // timeout بعد 2 ثانية
          });
        })
      );
      console.log('[Print] ✅ تم تحميل جميع الصور');
    }

    // انتظار إضافي لضمان التحميل الكامل
    await new Promise(r => setTimeout(r, 500));

    // ⚡ الطباعة
    console.log('[Print] 🖨️ استدعاء window.print()...');
    try {
      window.focus();

      // ⚡ استخدام window.print() العادي (المتصفح أو Electron)
      console.log('[Print] 🖨️ استدعاء window.print()...');
      window.print();

      console.log('[Print] ✅ تم استدعاء window.print()');
      toast.success('تم فتح نافذة الطباعة');

      // إزالة العناصر بعد الطباعة
      setTimeout(() => {
        printContainer.remove();
        printStyles.remove();
        console.log('[Print] 🗑️ تم تنظيف عناصر الطباعة');
      }, 2000);

      return true;
    } catch (error: any) {
      console.error('[Print] ❌ خطأ في الطباعة:', error);
      printContainer.remove();
      printStyles.remove();
      toast.error(`خطأ في الطباعة: ${error.message}`);
      return false;
    }
  };


  // ========================================================================
  // ⚡ دالة توليد رابط المنتج لـ QR Code
  // ========================================================================
  const getStoreDomain = (product: SelectedProduct): string => {
    if (product.organization_domain) return product.organization_domain;
    if (product.organization_subdomain) return `${product.organization_subdomain}.stockiha.com`;
    return '';
  };

  const getProductUrl = (product: SelectedProduct): string => {
    const slugPart = product.product_slug ? encodeURIComponent(product.product_slug) : product.product_id;
    const storeDomain = getStoreDomain(product);

    if (storeDomain) {
      return `https://${storeDomain}/product-purchase-max-v3/${slugPart}`;
    }

    return `https://stockiha.com/product-purchase-max-v3/${slugPart}`;
  };

  // ========================================================================
  // ⚡ توليد HTML مخصص لقالب QR + Barcode - محسّن للمسح السريع
  // ========================================================================
  const generateQRPlusBarcodeHtml = async (
    products: SelectedProduct[],
    settings: PrintSettings,
    template: BarcodeTemplate,
    font: typeof fontOptions[0]
  ): Promise<string> => {
    // ⚡ استخدام النظام الجديد المعتمد على React To HTML
    console.log('[Print] 🎨 Generating HTML using React Renderer');

    const printableItems: PrintableItem[] = [];

    // استخدام Promise.all لتسريع العمليات
    await Promise.all(products.map(async (product) => {
      // تحقق من الكمية المطلوبة
      const count = product.use_stock_quantity
        ? (product.stock_quantity > 0 ? product.stock_quantity : 1)
        : product.print_quantity;

      if (count <= 0) return;

      const barcodeValue = product.product_barcode || product.product_sku || product.product_id || '0000';
      const productUrl = getProductUrl(product);

      // توليد الصور (Base64)
      const [barcodeUrl, qrUrl] = await Promise.all([
        generateBarcodeLocal(barcodeValue, 'code128', {
          displayValue: settings.display_barcode_value,
          width: 2,
          height: 50,
          fontSize: 14
        }),
        generateQRCodeLocal(productUrl, { width: 150, height: 150 })
      ]);

      printableItems.push({
        templateId: template.id,
        count: count,
        props: {
          product: product,
          settings: {
            showPrice: settings.display_price,
            showName: settings.display_product_name,
            showStore: settings.display_store_name,
            showSku: settings.display_sku,
            showBarcodeValue: settings.display_barcode_value,
            fontFamily: settings.font_family_css // ⚡ الخط المختار
          },
          barcodeUrl: barcodeUrl, // Base64 image
          qrCodeUrl: qrUrl       // Base64 image
        }
      });
    }));

    // التصيير باستخدام المحرك الجديد
    return renderLabelsToHtml(printableItems, {
      labelWidth: Number(settings.label_width),
      labelHeight: Number(settings.label_height)
    });

  };

  const generateAndPrintBarcodes = async () => {
    const selectedProducts = products.filter(p => p.selected);
    if (selectedProducts.length === 0) {
      toast.error("يرجى اختيار منتج واحد على الأقل للطباعة.");
      return;
    }

    const totalLabels = selectedProducts.reduce((sum, p) => {
      const count = p.use_stock_quantity
        ? (p.stock_quantity > 0 ? p.stock_quantity : 1)
        : p.print_quantity;
      return sum + count;
    }, 0);

    toast.loading(`جاري تحضير ${totalLabels} ملصق...`, { id: 'barcode-generation' });

    const selectedTemplate = barcodeTemplates.find(t => t.id === printSettings.selected_template_id) || barcodeTemplates[0];
    const selectedFont = fontOptions.find(f => f.cssValue === printSettings.font_family_css) || fontOptions[0];

    // ⚡ توليد HTML الموحد لجميع الحالات
    const fullHtml = await generateQRPlusBarcodeHtml(selectedProducts, printSettings, selectedTemplate, selectedFont);

    // ⚡ محاولة الطباعة المباشرة عبر Electron أولاً
    if (isElectronPrint) {
      try {
        toast.info('جاري تحضير الطباعة المباشرة...');

        /* 
           ملاحظة: عند استخدام customHtml مع UnifiedPrintService، 
           يتم تجاهل barcodeData الجزئية لأن HTML هو السيد.
           لذلك نمرر مصفوفة فارغة أو صورية للبيانات، ونعتمد على customHtml.
        */

        // ⚡ نمرر عنصر وهمي لتجاوز التحقق من "empty array" في الـ Main Process
        // لأننا نستخدم customHtml، فلن يتم استخدام هذه البيانات للطباعة الفعلية
        const result = await printBarcodes([{ value: '123456789' }], {
          labelSize: {
            width: `${printSettings.label_width}mm`,
            height: `${printSettings.label_height}mm`
          },
          // نمرر الإعدادات للعلم فقط، لكن HTML هو الذي يحدد المحتوى
          showProductName: printSettings.display_product_name,
          showPrice: printSettings.display_price,
          showStoreName: printSettings.display_store_name,
          showBarcodeValue: printSettings.display_barcode_value,
          showSku: printSettings.display_sku,
          templateId: printSettings.selected_template_id,
          printerName: printSettings.barcode_printer_name || selectedPrinter,
          silent: printSettings.silent_print,
          customHtml: fullHtml // ⚡ هنا السحر: نرسل HTML جاهز تماماً
        });

        if (result.success) {
          toast.success('تمت الطباعة بنجاح!', { id: 'barcode-generation' });

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
          return; // ⚡ خروج مبكر عند النجاح
        } else {
          const errorMsg = result.error || 'غير محدد';
          console.warn('[Print] فشلت الطباعة المباشرة، التراجع إلى الطباعة العادية:', errorMsg);
          console.warn('[Print] Full result:', result);
          toast.loading(`تراجع إلى الطباعة العادية... (السبب: ${errorMsg})`, { id: 'barcode-generation' });
        }
      } catch (err) {
        console.warn('[Print] خطأ في الطباعة المباشرة، التراجع إلى الطباعة العادية:', err);
        console.error('[Print] Error details:', err);
        toast.loading('جاري التحضير للطباعة العادية...', { id: 'barcode-generation' });
      }
    }

    // ⚡ استخدام iframe للطباعة (يعمل في Tauri)
    toast.loading('جاري فتح نافذة الطباعة...', { id: 'barcode-generation' });
    const success = await printViaIframe(fullHtml);

    // ⚡ إخفاء مؤشر التحميل
    toast.dismiss('barcode-generation');

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
    <POSPureLayout onRefresh={refresh} isRefreshing={isLoading}>
      <div className="p-4 md:p-6 overflow-y-auto h-full">
        {/* ⚡ العنوان مع الأزرار */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold">طباعة سريعة للباركود</h1>
          <div className="flex items-center gap-2">
            <KeyboardShortcutsHelp shortcuts={shortcuts} />
          </div>
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
                  تحديد الكل ({selectedProductIds.size} / {products.length})
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
                  placeholder="ابحث بالاسم أو SKU أو الباركود... (Ctrl+F)"
                  value={searchInput}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pr-10 pl-10"
                  title="اضغط Ctrl+F للتركيز، Esc للمسح"
                />
                {/* Loading indicator أثناء الكتابة/البحث */}
                {isSearching && (
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2" title="جاري البحث...">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
                {/* زر Clear */}
                {searchInput && !isSearching && (
                  <button
                    onClick={clearSearchInput}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="مسح البحث (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
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

            {/* عرض إحصائيات النتائج والفلاتر النشطة */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>
                  عرض {products.length} منتج من أصل {totalCount} (صفحة {pagination.currentPage}/{pagination.totalPages})
                </span>
              </div>

              {/* عرض الفلاتر النشطة */}
              <div className="flex flex-wrap items-center gap-2">
                {searchAndFilter.search_query && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    <Search className="h-3 w-3" />
                    <span>بحث: "{searchAndFilter.search_query}"</span>
                  </div>
                )}
                {searchAndFilter.stock_filter !== 'all' && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    <Package className="h-3 w-3" />
                    <span>
                      {searchAndFilter.stock_filter === 'in_stock' && 'متوفر'}
                      {searchAndFilter.stock_filter === 'low_stock' && 'مخزون منخفض'}
                      {searchAndFilter.stock_filter === 'out_of_stock' && 'نفذ من المخزون'}
                    </span>
                  </div>
                )}
                {(searchAndFilter.price_range.min || searchAndFilter.price_range.max) && (
                  <div className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-md text-xs">
                    <Hash className="h-3 w-3" />
                    <span>
                      سعر: {searchAndFilter.price_range.min || '0'} - {searchAndFilter.price_range.max || '∞'}
                    </span>
                  </div>
                )}
                {(searchAndFilter.search_query || searchAndFilter.stock_filter !== 'all' || searchAndFilter.price_range.min || searchAndFilter.price_range.max) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="h-6 px-2 text-xs"
                  >
                    <X className="h-3 w-3 ml-1" />
                    مسح الكل
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* ⚡ Pagination في الأعلى */}
          {totalCount > 0 && (
            <BarcodePagination
              pagination={pagination}
              onPageChange={goToPage}
              onPageSizeChange={setPageSize}
              onNext={nextPage}
              onPrevious={previousPage}
            />
          )}

          {/* رسالة عدم وجود منتجات في النظام */}
          {totalCount === 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                لم يتم العثور على أي منتجات في النظام. قد تحتاج إلى إضافة منتجات أولاً أو التأكد من مزامنة PowerSync.
              </p>
              <Button variant="outline" onClick={refresh}>
                <Search className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            </div>
          )}

          {/* رسالة عدم وجود نتائج بحث */}
          {products.length === 0 && totalCount > 0 && !isLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-lg">
              <Search className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد نتائج</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                لم نجد أي منتجات تطابق معايير البحث والفلترة الحالية.
                {searchInput && (
                  <span className="block mt-2 font-medium">
                    البحث عن: "{searchInput}"
                  </span>
                )}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters}>
                  <X className="h-4 w-4 ml-2" />
                  مسح الفلاتر
                </Button>
                <Button variant="outline" onClick={refresh}>
                  <Search className="h-4 w-4 ml-2" />
                  إعادة البحث
                </Button>
              </div>
            </div>
          )}
          {products.length > 0 && (
            <div className="border rounded-md relative">
              {/* Overlay خفيف فقط أثناء تحميل النتائج (ليس أثناء الكتابة) */}
              {isLoading && !isSearching && (
                <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-20 flex items-center justify-center rounded-md">
                  <div className="flex items-center gap-2 bg-background px-4 py-2 rounded-lg shadow-lg border">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm font-medium">جاري التحديث...</span>
                  </div>
                </div>
              )}
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
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap" title={product.product_name}>
                          {product.product_name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs">{product.product_sku}</code>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline - flex items - center px - 2 py - 1 rounded - full text - xs font - medium ${product.stock_quantity === 0
                          ? 'bg-red-100 text-red-800'
                          : product.stock_quantity <= 5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          } `}>
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

              {/* ⚡ Pagination في الأسفل */}
              {totalCount > 0 && (
                <BarcodePagination
                  pagination={pagination}
                  onPageChange={goToPage}
                  onPageSizeChange={setPageSize}
                  onNext={nextPage}
                  onPrevious={previousPage}
                />
              )}
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

        {/* ⚡ قسم إعدادات الطابعة - جديد */}
        <div className="mb-8 p-6 bg-background rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Printer className="h-5 w-5" />
            2.5 إعدادات الطابعة
            {isElectronPrint && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full ml-2">
                Electron
              </span>
            )}
          </h2>

          {isElectronPrint ? (
            <div className="space-y-4">
              {/* اختيار الطابعة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="printerSelect" className="flex items-center gap-2">
                    <Printer className="h-4 w-4" />
                    اختر الطابعة للباركود
                  </Label>
                  <Select
                    value={printSettings.barcode_printer_name || '__default__'}
                    onValueChange={(value) => {
                      const printerName = value === '__default__' ? null : value;
                      handlePrintSettingChange("barcode_printer_name", printerName);
                      setSelectedPrinter(value === '__default__' ? '' : value);
                    }}
                  >
                    <SelectTrigger id="printerSelect">
                      <SelectValue placeholder="اختر الطابعة..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__default__">الطابعة الافتراضية</SelectItem>
                      {printers.map((printer) => (
                        <SelectItem key={printer.name} value={printer.name}>
                          {printer.displayName || printer.name}
                          {printer.isDefault && ' ⭐ (افتراضية)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {printers.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      لم يتم العثور على طابعات. تأكد من توصيل الطابعة.
                    </p>
                  )}
                </div>

                {/* زر اختبار الطباعة */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Wifi className="h-4 w-4" />
                    اختبار الطابعة
                  </Label>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={printTest}
                    disabled={isPrinting || isLoading}
                  >
                    {isPrinting ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري الطباعة...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 ml-2" />
                        طباعة صفحة اختبار
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    طباعة صفحة اختبار للتأكد من عمل الطابعة بشكل صحيح
                  </p>
                </div>
              </div>

              {/* خيارات الطباعة */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="silentPrint"
                    checked={printSettings.silent_print}
                    onCheckedChange={(checked) => handlePrintSettingChange("silent_print", Boolean(checked))}
                  />
                  <Label htmlFor="silentPrint" className="text-sm cursor-pointer">
                    الطباعة الصامتة (بدون نافذة الطباعة)
                  </Label>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox
                    id="autoSelectPrinter"
                    checked={printSettings.auto_select_printer}
                    onCheckedChange={(checked) => handlePrintSettingChange("auto_select_printer", Boolean(checked))}
                  />
                  <Label htmlFor="autoSelectPrinter" className="text-sm cursor-pointer">
                    اختيار الطابعة تلقائياً
                  </Label>
                </div>
              </div>

              {/* معلومات الطابعة المحددة */}
              {selectedPrinter && printers.find(p => p.name === selectedPrinter) && (
                <div className="mt-4 p-3 bg-muted rounded-lg text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Printer className="h-4 w-4 text-primary" />
                    <span className="font-medium">الطابعة المحددة:</span>
                  </div>
                  <div className="text-muted-foreground">
                    {printers.find(p => p.name === selectedPrinter)?.displayName || selectedPrinter}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center border-2 border-dashed border-muted rounded-lg">
              <WifiOff className="h-12 w-12 text-muted-foreground mb-3 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">الطباعة المباشرة غير متاحة</h3>
              <p className="text-muted-foreground max-w-md mb-4">
                للحصول على أفضل تجربة طباعة مع الطابعات الحرارية، يُرجى استخدام تطبيق سطح المكتب (Electron).
              </p>
              <p className="text-xs text-muted-foreground">
                ستظهر نافذة الطباعة العادية للمتصفح عند الطباعة.
              </p>
            </div>
          )}
        </div>

        {/* قسم معاينة الطباعة */}
        <div className="mb-8 p-6 bg-background rounded-lg border shadow-sm">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            3. معاينة حية للطباعة
          </h2>

          {previewProduct ? (
            <div className="flex justify-center">
              <div className="w-full max-w-2xl">
                <BarcodePreviewEnhanced
                  productName={previewProduct.product_name}
                  productPrice={previewProduct.product_price}
                  productSku={previewProduct.product_sku}
                  productBarcode={previewProduct.product_barcode || ''}
                  productSlug={previewProduct.product_slug || previewProduct.product_id}
                  storeName={previewProduct.organization_name}
                  storeDomain={getStoreDomain(previewProduct)}
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
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-muted rounded-lg">
              <Package className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">لا توجد منتجات محددة</h3>
              <p className="text-muted-foreground max-w-md">
                حدد منتجاً واحداً على الأقل من القائمة أعلاه لرؤية معاينة حية للباركود
              </p>
            </div>
          )}
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
