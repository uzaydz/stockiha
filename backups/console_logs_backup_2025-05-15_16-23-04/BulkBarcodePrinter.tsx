import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Printer, Download, Save, RotateCw, Check, Palette, Ruler } from 'lucide-react';
import { toast } from 'sonner';
import type { Product } from '@/lib/api/products';
import { ProductColor, ProductSize } from '@/types/product';
import { getProductColors, getProductSizes } from '@/lib/api/productVariants';
import { 
  getBarcodeImageUrl, 
  generateBarcodeValue,
  sanitizeBarcodeValue 
} from '@/lib/barcode-utils';
import BarcodeSettings, { 
  BarcodeSettings as BarcodeSettingsType, 
  DEFAULT_BARCODE_SETTINGS 
} from './BarcodeSettings';
import BarcodePrintPreview from './BarcodePrintPreview';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { FormDescription } from '@/components/ui/form';

// إضافة خيارات الطباعة للألوان والمقاسات
export type ColorPrintOption = 'default' | 'selected' | 'all';
export type SizePrintOption = 'default' | 'selected' | 'all';

// توسيع واجهة إعدادات الباركود لتشمل خيارات الألوان والمقاسات
export interface ExtendedBarcodeSettings extends BarcodeSettingsType {
  colorPrintOption: ColorPrintOption;
  sizePrintOption: SizePrintOption;
  selectedColors: string[];
  selectedSizes: Record<string, string[]>; // معرف اللون: [معرفات المقاسات]
}

// إضافة الإعدادات الافتراضية الموسعة
export const DEFAULT_EXTENDED_BARCODE_SETTINGS: ExtendedBarcodeSettings = {
  ...DEFAULT_BARCODE_SETTINGS,
  colorPrintOption: 'default',
  sizePrintOption: 'default',
  selectedColors: [],
  selectedSizes: {}
};

// إصلاح أخطاء اللينتر بتعديل واجهة المنتج
interface ExtendedProduct extends Product {
  has_variants?: boolean;
  use_sizes?: boolean;
}

interface BulkBarcodePrinterProps {
  products: ExtendedProduct[];
  isButtonVisible?: boolean;
  defaultSelectedProducts?: string[];
  title?: string;
  buttonText?: string;
}

// واجهة لتخزين معلومات المقاس مع اللون والمنتج
interface SizeWithDetails {
  sizeId: string;
  sizeName: string;
  barcode: string | null;
  price: number | null;
  colorId: string;
  colorName: string;
  colorCode: string;
  productId: string;
  productName: string;
}

const BulkBarcodePrinter = ({ 
  products, 
  isButtonVisible = true,
  defaultSelectedProducts = [],
  title = "طباعة الباركود للمنتجات",
  buttonText = "طباعة الباركود"
}: BulkBarcodePrinterProps) => {
  const [open, setOpen] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>(defaultSelectedProducts);
  const [settings, setSettings] = useState<ExtendedBarcodeSettings>({
    ...DEFAULT_EXTENDED_BARCODE_SETTINGS
  });
  const [activeTab, setActiveTab] = useState<string>('select');
  const [isLoading, setIsLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [savedSettings, setSavedSettings] = useState<{ name: string; settings: ExtendedBarcodeSettings }[]>([]);
  const [currentSavedSettingName, setCurrentSavedSettingName] = useState<string | null>(null);
  
  // إضافة متغيرات حالة للألوان والمقاسات
  const [productColorsState, setProductColors] = useState<Record<string, ProductColor[]>>({});
  const [productSizesState, setProductSizes] = useState<Record<string, ProductSize[]>>({});
  const [loadingColors, setLoadingColors] = useState(false);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [selectedColorsByProduct, setSelectedColorsByProduct] = useState<Record<string, string[]>>({});
  const [selectedSizesByColor, setSelectedSizesByColor] = useState<Record<string, string[]>>({});

  // تحميل الإعدادات المحفوظة من التخزين المحلي
  useEffect(() => {
    const loadSavedSettings = () => {
      try {
        const savedSettingsJson = localStorage.getItem('barcodeSettings');
        if (savedSettingsJson) {
          const settings = JSON.parse(savedSettingsJson);
          setSavedSettings(settings);
        }
      } catch (e) {
        console.error('Error loading saved barcode settings:', e);
      }
    };
    
    loadSavedSettings();
  }, []);

  // إضافة وظيفة لتحميل ألوان المنتجات المختارة
  const loadProductColors = async (productIds: string[]) => {
    if (productIds.length === 0) return;
    
    setLoadingColors(true);
    
    try {
      const colorsByProduct: Record<string, ProductColor[]> = {};
      
      // تحميل الألوان لكل منتج على حدة
      for (const productId of productIds) {
        if (productColorsState[productId]) continue; // تخطي إذا كانت الألوان محملة مسبقًا
        
        const colors = await getProductColors(productId);
        colorsByProduct[productId] = colors;
      }
      
      setProductColors(prev => ({
        ...prev,
        ...colorsByProduct
      }));
    } catch (error) {
      console.error('Error loading product colors:', error);
      toast.error('حدث خطأ أثناء تحميل ألوان المنتجات');
    } finally {
      setLoadingColors(false);
    }
  };

  // إضافة وظيفة لتحميل مقاسات اللون
  const loadColorSizes = async (colorId: string, productId: string) => {
    const cacheKey = `${colorId}`;
    
    if (productSizesState[cacheKey]) return; // تخطي إذا كانت المقاسات محملة مسبقًا
    
    setLoadingSizes(true);
    
    try {
      const sizes = await getProductSizes(colorId);
      
      setProductSizes(prev => ({
        ...prev,
        [cacheKey]: sizes
      }));
    } catch (error) {
      console.error('Error loading color sizes:', error);
      toast.error('حدث خطأ أثناء تحميل مقاسات اللون');
    } finally {
      setLoadingSizes(false);
    }
  };

  // وظيفة للتعامل مع اختيار المنتجات وتحميل ألوانها
  const handleProductSelection = async (productId: string, selected: boolean) => {
    const newSelectedProducts = selected
      ? [...selectedProducts, productId]
      : selectedProducts.filter(id => id !== productId);
    
    setSelectedProducts(newSelectedProducts);
    
    // تحميل ألوان المنتجات المختارة إذا تم اختيار منتج جديد
    if (selected) {
      await loadProductColors([productId]);
    }
  };
  
  // وظيفة للتعامل مع اختيار جميع المنتجات
  const handleSelectAllProducts = async (select: boolean) => {
    const newSelectedProducts = select ? products.map(p => p.id) : [];
    setSelectedProducts(newSelectedProducts);
    
    // تحميل ألوان المنتجات المختارة
    if (select) {
      await loadProductColors(newSelectedProducts);
    }
  };

  // وظيفة للتعامل مع اختيار اللون
  const handleColorSelection = (productId: string, colorId: string, selected: boolean) => {
    setSelectedColorsByProduct(prev => {
      const currentSelected = prev[productId] || [];
      
      const newSelected = selected
        ? [...currentSelected, colorId]
        : currentSelected.filter(id => id !== colorId);
      
      return {
        ...prev,
        [productId]: newSelected
      };
    });
    
    // تحميل مقاسات اللون إذا تم اختياره
    if (selected) {
      loadColorSizes(colorId, productId);
    }
  };

  // وظيفة للتعامل مع اختيار المقاس
  const handleSizeSelection = (colorId: string, sizeId: string, selected: boolean) => {
    setSelectedSizesByColor(prev => {
      const currentSelected = prev[colorId] || [];
      
      const newSelected = selected
        ? [...currentSelected, sizeId]
        : currentSelected.filter(id => id !== sizeId);
      
      return {
        ...prev,
        [colorId]: newSelected
      };
    });
  };

  // إعادة تعيين الحالة عند فتح النافذة أو إغلاقها
  const resetState = () => {
    setSelectedProducts(defaultSelectedProducts);
    setSettings({
      ...DEFAULT_EXTENDED_BARCODE_SETTINGS
    });
    setActiveTab('select');
    setShowPreview(false);
    setIsLoading(false);
    setCurrentSavedSettingName(null);
    setProductColors({});
    setProductSizes({});
    setSelectedColorsByProduct({});
    setSelectedSizesByColor({});
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetState();
    }
    setOpen(newOpen);
  };

  const toggleSelectProduct = (productId: string) => {
    const isSelected = selectedProducts.includes(productId);
    handleProductSelection(productId, !isSelected);
  };

  const selectAllProducts = () => {
    const allSelected = selectedProducts.length === products.length;
    handleSelectAllProducts(!allSelected);
  };

  const handleSettingsChange = (newSettings: Partial<ExtendedBarcodeSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
    setCurrentSavedSettingName(null); // عند تغيير الإعدادات، نحن لم نعد نستخدم إعدادات محفوظة
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleGeneratePreview = () => {
    if (selectedProducts.length === 0) {
      toast.error("الرجاء اختيار منتج واحد على الأقل");
      return;
    }

    setIsLoading(true);
    
    // محاكاة جلب البيانات
    setTimeout(() => {
      setIsLoading(false);
      setShowPreview(true);
      setActiveTab('preview');
    }, 800);
  };

  // تعديل وظيفة الطباعة للتعامل مع الألوان والمقاسات
  const handlePrint = () => {
    try {
      // تجميع المنتجات المختارة مع إضافة الألوان والمقاسات المطلوبة
      const selectedProductsIds = selectedProducts;
      const selectedProductsData = products.filter(p => selectedProductsIds.includes(p.id));
      
      // إضافة طباعة تصحيحية لتتبع المنتجات المختارة
      console.log('المنتجات المختارة:', selectedProductsData);
      
      // إعداد مصفوفة لجميع العناصر التي سيتم طباعتها
      const itemsToPrint: {
        productId: string;
        productName: string;
        barcode: string;
        price: number;
        colorName?: string;
        colorCode?: string;
        sizeName?: string;
      }[] = [];
      
      // إضافة المنتجات العادية غير المتغيرة
      const regularProducts = selectedProductsData.filter(p => !p.has_variants);
      console.log('المنتجات العادية:', regularProducts);
      
      regularProducts.forEach(product => {
        // عدد النسخ لكل منتج
        for (let i = 0; i < settings.copiesPerProduct; i++) {
          if (product.barcode || product.sku) {
            itemsToPrint.push({
              productId: product.id,
              productName: product.name,
              barcode: product.barcode || product.sku,
              price: product.price
            });
          }
        }
      });
      
      // إضافة المنتجات ذات الألوان والمقاسات
      const variantProducts = selectedProductsData.filter(p => p.has_variants);
      console.log('منتجات متعددة الألوان:', variantProducts);
      
      variantProducts.forEach(product => {
        // طباعة معلومات المنتج للتشخيص
        console.log(`معالجة المنتج: ${product.name} (${product.id})`);
        console.log(`الألوان المتاحة:`, productColorsState[product.id]);
        
        const productColorsArr = productColorsState[product.id] || [];
        
        // تحديد الألوان المطلوب طباعتها حسب الإعدادات
        let colorsToPrint: ProductColor[] = [];
        
        if (settings.colorPrintOption === 'all') {
          // طباعة جميع الألوان
          colorsToPrint = productColorsArr;
          console.log('تم اختيار طباعة جميع الألوان:', colorsToPrint.length);
        } else if (settings.colorPrintOption === 'selected') {
          // طباعة الألوان المحددة فقط
          const selectedColorIds = selectedColorsByProduct[product.id] || [];
          console.log('معرفات الألوان المختارة:', selectedColorIds);
          colorsToPrint = productColorsArr.filter(color => selectedColorIds.includes(color.id));
          console.log('الألوان المختارة للطباعة:', colorsToPrint.length);
        } else {
          // طباعة اللون الافتراضي فقط
          colorsToPrint = productColorsArr.filter(color => color.is_default);
          console.log('الألوان الافتراضية للطباعة:', colorsToPrint.length);
        }
        
        // إذا لم يتم العثور على ألوان، أضف المنتج الأساسي
        if (colorsToPrint.length === 0 && (product.barcode || product.sku)) {
          console.log('لم يتم العثور على ألوان، إضافة المنتج الأساسي');
          itemsToPrint.push({
            productId: product.id,
            productName: product.name,
            barcode: product.barcode || product.sku,
            price: product.price
          });
        }
        
        // معالجة كل لون
        colorsToPrint.forEach(color => {
          console.log(`معالجة اللون: ${color.name} (${color.id}), has_sizes=${color.has_sizes}`);
          
          // إذا كان المنتج يستخدم المقاسات واللون يدعم المقاسات
          if (product.use_sizes && color.has_sizes) {
            const colorSizes = productSizesState[color.id] || [];
            console.log(`المقاسات المتاحة للون ${color.name}:`, colorSizes);
            
            // تحديد المقاسات المطلوب طباعتها حسب الإعدادات
            let sizesToPrint: ProductSize[] = [];
            
            if (settings.sizePrintOption === 'all') {
              // طباعة جميع المقاسات
              sizesToPrint = colorSizes;
              console.log('تم اختيار طباعة جميع المقاسات:', sizesToPrint.length);
            } else if (settings.sizePrintOption === 'selected') {
              // طباعة المقاسات المحددة فقط
              const selectedSizeIds = selectedSizesByColor[color.id] || [];
              console.log('معرفات المقاسات المختارة:', selectedSizeIds);
              sizesToPrint = colorSizes.filter(size => selectedSizeIds.includes(size.id));
              console.log('المقاسات المختارة للطباعة:', sizesToPrint.length);
            } else {
              // طباعة المقاس الافتراضي فقط
              sizesToPrint = colorSizes.filter(size => size.is_default);
              console.log('المقاسات الافتراضية للطباعة:', sizesToPrint.length);
            }
            
            // إذا لم يتم العثور على مقاسات، أضف اللون الأساسي
            if (sizesToPrint.length === 0) {
              console.log('لم يتم العثور على مقاسات، إضافة اللون الأساسي');
              for (let i = 0; i < settings.copiesPerProduct; i++) {
                itemsToPrint.push({
                  productId: product.id,
                  productName: product.name,
                  barcode: color.barcode || product.barcode || product.sku,
                  price: color.price || product.price,
                  colorName: color.name,
                  colorCode: color.color_code
                });
              }
            } else {
              // إضافة كل مقاس إلى قائمة الطباعة
              sizesToPrint.forEach(size => {
                console.log(`إضافة المقاس ${size.size_name} للون ${color.name}`);
                for (let i = 0; i < settings.copiesPerProduct; i++) {
                  // تحقق من وجود باركود صالح
                  const barcode = size.barcode || color.barcode || product.barcode || product.sku;
                  if (barcode) {
                    itemsToPrint.push({
                      productId: product.id,
                      productName: product.name,
                      barcode: barcode,
                      price: size.price || color.price || product.price,
                      colorName: color.name,
                      colorCode: color.color_code,
                      sizeName: size.size_name
                    });
                  } else {
                    console.warn(`لا يوجد باركود صالح للمقاس ${size.size_name} للون ${color.name}`);
                  }
                }
              });
            }
          } else {
            // إذا كان اللون بدون مقاسات، إضافته مباشرة
            console.log(`إضافة اللون ${color.name} بدون مقاسات`);
            for (let i = 0; i < settings.copiesPerProduct; i++) {
              // تحقق من وجود باركود صالح
              const barcode = color.barcode || product.barcode || product.sku;
              if (barcode) {
                itemsToPrint.push({
                  productId: product.id,
                  productName: product.name,
                  barcode: barcode,
                  price: color.price || product.price,
                  colorName: color.name,
                  colorCode: color.color_code
                });
              } else {
                console.warn(`لا يوجد باركود صالح للون ${color.name}`);
              }
            }
          }
        });
      });
      
      // طباعة العناصر النهائية للتصحيح
      console.log('العناصر النهائية للطباعة:', itemsToPrint);
      
      // التحقق من وجود عناصر للطباعة
      if (itemsToPrint.length === 0) {
        toast.error("لم يتم العثور على عناصر صالحة للطباعة. يرجى التأكد من وجود باركود صالح للمنتجات المختارة.");
        return;
      }
      
      // فتح نافذة طباعة جديدة
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("تم منع فتح نافذة الطباعة من قبل المتصفح");
        return;
      }
      
      // إعداد محتوى HTML للطباعة
      let barcodeItems = '';
      
      // القيم المحسوبة بناءً على إعدادات الباركود
      const barcodeScale = settings.barcodeSize === 'small' ? 1 : 
                          settings.barcodeSize === 'large' ? 2 : 
                          settings.barcodeSize === 'custom' ? settings.scaleValue : 1.5;
                          
      const barcodeHeight = settings.barcodeSize === 'small' ? 40 : 
                           settings.barcodeSize === 'large' ? 80 : 
                           settings.barcodeSize === 'custom' ? settings.heightValue : 60;
      
      const fontSize = settings.fontSize;
      
      // عداد للباركودات التي تم إنشاؤها بنجاح
      let successfulBarcodes = 0;
      
      // إنشاء عناصر الباركود لكل عنصر
      itemsToPrint.forEach(item => {
        const barcodeValue = sanitizeBarcodeValue(item.barcode);
        
        // تخطي العناصر التي ليس لديها باركود صالح
        if (!barcodeValue) {
          console.warn('عنصر بدون باركود صالح:', item.productName);
          return;
        }
        
        // التنسيق المناسب لكل نوع باركود
        const formattedBarcodeValue = settings.barcodeType === 'ean13' 
          ? generateBarcodeValue(barcodeValue, 'ean13')
          : settings.barcodeType === 'code39'
          ? generateBarcodeValue(barcodeValue, 'code39')
          : generateBarcodeValue(barcodeValue, 'code128');
        
        // URL صورة الباركود - تحسين المقاييس للقراءة
        const barcodeImageUrl = getBarcodeImageUrl(
          formattedBarcodeValue, 
          settings.barcodeType, 
          barcodeScale, 
          barcodeHeight, 
          settings.includeText,
          settings.textSize
        );
        
        // إذا لم يتم إنشاء URL باركود صالح، تخطى هذا العنصر
        if (!barcodeImageUrl) {
          console.warn('فشل في إنشاء باركود للعنصر:', item.productName);
          return;
        }
        
        // زيادة عداد الباركودات الناجحة
        successfulBarcodes++;
        
        // اسم المنتج مع التقصير إذا كان طويلاً جدًا
        const productName = item.productName.length > 20 
          ? `${item.productName.substring(0, 20)}...` 
          : item.productName;
        
        // بناء نص العنوان الذي يعرض اسم المنتج، واللون والمقاس إذا وجدوا
        let titleText = productName;
        
        if (item.colorName) {
          titleText += ` - ${item.colorName}`;
        }
        
        if (item.sizeName) {
          titleText += ` - ${item.sizeName}`;
        }
        
        // بناء عنصر HTML للباركود
        barcodeItems += `
          <div class="barcode-item">
            ${settings.includeName ? `<div class="product-name">${titleText}</div>` : ''}
            <div class="barcode-image-container">
              <img src="${barcodeImageUrl}" alt="باركود ${formattedBarcodeValue}" class="barcode-image" onerror="this.style.display='none'; this.parentNode.innerHTML += '<div style=\\'color:red; font-size:10px;\\'>خطأ في الباركود</div>';">
            </div>
            ${settings.showSku ? `<div class="sku">SKU: ${item.barcode}</div>` : ''}
            ${settings.includePrice ? `<div class="price">${item.price.toLocaleString()} دج</div>` : ''}
          </div>
        `;
      });
      
      // التحقق من وجود باركودات ناجحة
      if (successfulBarcodes === 0) {
        toast.error("لم يتم إنشاء أي باركود صالح للطباعة. تأكد من توفر قيم باركود صالحة للمنتجات المختارة.");
        printWindow.close();
        return;
      }
      
      // HTML محتوى الصفحة
      const cssStyles = `
        @page {
          size: ${settings.paperSize === 'A4' ? 'A4' : 
                 settings.paperSize === 'A5' ? 'A5' : 
                 settings.paperSize === 'label50x90' ? '90mm 50mm' : 
                 `${settings.customWidth}mm ${settings.customHeight}mm`};
          margin: ${settings.marginTop}mm ${settings.marginRight}mm ${settings.marginBottom}mm ${settings.marginLeft}mm;
          ${settings.orientation === 'landscape' ? 'orientation: landscape;' : ''}
        }
        
        body {
          margin: 0;
          padding: 0;
          font-family: ${settings.fontFamily}, sans-serif;
          color: ${settings.colorScheme === 'dark' ? '#ffffff' : 
                 settings.colorScheme === 'custom' ? settings.fontColor : '#000000'};
          background-color: ${settings.colorScheme === 'dark' ? '#1a1a1a' : 
                            settings.colorScheme === 'custom' ? settings.backgroundColor : '#ffffff'};
        }
        
        .print-container {
          display: grid;
          grid-template-columns: repeat(${settings.columns}, 1fr);
          gap: ${settings.spacingY}mm ${settings.spacingX}mm;
          page-break-inside: avoid;
        }
        
        .barcode-item {
          padding: 5mm;
          text-align: ${settings.labelTextAlign};
          display: flex;
          flex-direction: column;
          align-items: ${settings.alignment === 'center' ? 'center' : settings.alignment === 'start' ? 'flex-start' : 'flex-end'};
          ${settings.showBorder ? `border: 1px solid ${settings.colorScheme === 'dark' ? '#444444' : 
                   settings.colorScheme === 'custom' ? settings.borderColor : '#eeeeee'};` : ''}
          background-color: ${settings.colorScheme === 'dark' ? '#1a1a1a' : 
                   settings.colorScheme === 'custom' ? settings.backgroundColor : '#ffffff'};
          color: ${settings.colorScheme === 'dark' ? '#ffffff' : 
                 settings.colorScheme === 'custom' ? settings.fontColor : '#000000'};
          page-break-inside: avoid;
        }
        
        .barcode-image-container {
          display: flex;
          justify-content: center;
          width: 100%;
          margin: 3px 0;
          min-height: 20mm;
        }
        
        .barcode-image {
          max-width: 100%;
          height: auto;
          object-fit: contain;
          width: auto !important;
          display: inline-block !important;
        }
        
        .product-name {
          font-size: ${settings.fontSize}px;
          margin-bottom: 4px;
          font-weight: bold;
        }
        
        .barcode-value {
          font-family: monospace;
          font-size: ${Math.max(settings.fontSize - 2, 8)}px;
          margin-top: 2px;
        }
        
        .price {
          font-size: ${Math.max(settings.fontSize + 2, 14)}px;
          font-weight: bold;
          margin-top: 4px;
        }
        
        .sku {
          font-family: monospace;
          font-size: ${Math.max(settings.fontSize - 2, 8)}px;
          margin-top: 2px;
        }
        
        img {
          max-width: 100%;
          height: auto;
        }
        
        .print-buttons {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 20px 0;
        }
        
        .print-button {
          padding: 8px 16px;
          background: #0066cc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .close-button {
          padding: 8px 16px;
          background: #f44336;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        @media print {
          .print-buttons {
            display: none !important;
          }
        }
      `;
      
      printWindow.document.write(`
        <html>
          <head>
            <title>طباعة الباركود</title>
            <meta charset="UTF-8">
            <style>${cssStyles}</style>
          </head>
          <body>
            <div class="print-buttons">
              <button class="print-button" onclick="window.print()">طباعة</button>
              <button class="close-button" onclick="window.close()">إغلاق</button>
            </div>
            
            <div class="print-container">
              ${barcodeItems}
            </div>
            
            <script>
              // التأكد من تحميل جميع الصور قبل الطباعة
              window.onload = function() {
                const images = document.querySelectorAll('img');
                let loadedCount = 0;
                const totalImages = images.length;
                
                if (totalImages === 0) {
                  // إذا لم يكن هناك صور، اعرض رسالة خطأ وأغلق النافذة
                  alert('لم يتم إنشاء باركودات صالحة للطباعة');
                  return;
                }
                
                function checkAllImagesLoaded() {
                  loadedCount++;
                  if (loadedCount === totalImages) {
                    // انتظر قليلاً للتأكد من رسم الصور بشكل كامل
                    setTimeout(function() {
                      window.print();
                    }, 1000);
                  }
                }
                
                images.forEach(function(img) {
                  if (img.complete) {
                    checkAllImagesLoaded();
                  } else {
                    img.onload = checkAllImagesLoaded;
                    img.onerror = checkAllImagesLoaded;
                  }
                });
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      // عرض رسالة نجاح
      toast.success(`تم إنشاء ${selectedProducts.length * settings.copiesPerProduct} باركود جاهز للطباعة`);
    } catch (error) {
      console.error('Error generating barcodes:', error);
      toast.error('حدث خطأ أثناء إنشاء الباركود');
    }
  };
  
  const handleSaveSettings = () => {
    try {
      // طلب اسم للإعدادات من المستخدم
      const name = prompt("أدخل اسماً لحفظ هذه الإعدادات:");
      if (!name) return;
      
      // حفظ الإعدادات الجديدة
      const newSavedSettings = [...savedSettings];
      const existingIndex = newSavedSettings.findIndex(s => s.name === name);
      
      if (existingIndex >= 0) {
        // تحديث إعدادات موجودة
        if (confirm(`الإعدادات "${name}" موجودة بالفعل. هل تريد استبدالها؟`)) {
          newSavedSettings[existingIndex] = { name, settings };
        } else {
          return;
        }
      } else {
        // إضافة إعدادات جديدة
        newSavedSettings.push({ name, settings });
      }
      
      // حفظ في التخزين المحلي
      localStorage.setItem('barcodeSettings', JSON.stringify(newSavedSettings));
      setSavedSettings(newSavedSettings);
      setCurrentSavedSettingName(name);
      
      toast.success(`تم حفظ الإعدادات "${name}" بنجاح`);
    } catch (e) {
      console.error('Error saving barcode settings:', e);
      toast.error("حدث خطأ أثناء حفظ الإعدادات");
    }
  };
  
  const loadSavedSettings = (name: string) => {
    const settingsToLoad = savedSettings.find(s => s.name === name);
    if (settingsToLoad) {
      setSettings(settingsToLoad.settings);
      setCurrentSavedSettingName(name);
      toast.success(`تم تحميل الإعدادات "${name}"`);
    }
  };

  // سأضيف مكون واجهة المستخدم الخاص بخيارات الألوان والمقاسات
  const renderColorAndSizeOptions = () => {
    // عرض فقط إذا كان هناك منتجات مختارة
    if (selectedProducts.length === 0) {
      return (
        <div className="text-center text-muted-foreground">
          الرجاء اختيار منتج واحد على الأقل لتفعيل خيارات الألوان والمقاسات
        </div>
      );
    }
    
    // جمع المنتجات التي تستخدم الألوان والمقاسات
    const selectedProductsWithVariants = products.filter(
      p => selectedProducts.includes(p.id) && p.has_variants
    );
    
    const hasProductsWithVariants = selectedProductsWithVariants.length > 0;
    const hasProductsWithSizes = selectedProductsWithVariants.some(p => p.use_sizes);
    
    if (!hasProductsWithVariants) {
      return (
        <div className="text-center text-muted-foreground">
          المنتجات المختارة لا تحتوي على ألوان أو مقاسات
        </div>
      );
    }
    
    return (
      <div className="space-y-6 pt-4">
        {/* خيارات طباعة الألوان */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium flex items-center">
            <Palette className="w-5 h-5 ml-2" />
            خيارات طباعة الألوان
          </h3>
          
          <RadioGroup
            value={settings.colorPrintOption}
            onValueChange={(value: ColorPrintOption) => 
              handleSettingsChange({ colorPrintOption: value })
            }
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="default" id="color-default" />
              <Label htmlFor="color-default">طباعة اللون الافتراضي فقط</Label>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="selected" id="color-selected" />
              <Label htmlFor="color-selected">طباعة ألوان محددة</Label>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="all" id="color-all" />
              <Label htmlFor="color-all">طباعة جميع الألوان</Label>
            </div>
          </RadioGroup>
          
          {/* عند اختيار خيار "طباعة ألوان محددة" عرض قائمة بالألوان المتاحة لكل منتج */}
          {settings.colorPrintOption === 'selected' && (
            <div className="mt-4 border rounded-md p-3 space-y-4">
              <h4 className="font-medium">اختر الألوان للطباعة</h4>
              
              {/* عرض ألوان المنتجات */}
              {selectedProductsWithVariants.map(product => {
                const productHasColors = productColorsState[product.id]?.length > 0;
                
                if (!productHasColors && !loadingColors) {
                  return (
                    <div key={product.id} className="text-muted-foreground text-sm">
                      المنتج {product.name} لا يحتوي على ألوان
                    </div>
                  );
                }
                
                return (
                  <div key={product.id} className="space-y-2">
                    <h5 className="text-sm font-medium">{product.name}</h5>
                    
                    {loadingColors ? (
                      <div className="flex items-center text-sm text-muted-foreground">
                        <RotateCw className="animate-spin w-4 h-4 ml-2" />
                        جاري تحميل الألوان...
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {productColorsState[product.id]?.map(color => (
                          <div key={color.id} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              checked={selectedColorsByProduct[product.id]?.includes(color.id) || false}
                              onCheckedChange={(checked) => {
                                handleColorSelection(product.id, color.id, !!checked);
                              }}
                              id={`color-${product.id}-${color.id}`}
                            />
                            <Label 
                              htmlFor={`color-${product.id}-${color.id}`}
                              className="flex items-center"
                            >
                              <span 
                                className="w-4 h-4 rounded-full inline-block ml-2" 
                                style={{ backgroundColor: color.color_code }}
                              />
                              {color.name}
                              {color.is_default && (
                                <span className="text-xs text-muted-foreground mr-1">(افتراضي)</span>
                              )}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* خيارات طباعة المقاسات - فقط إذا كان هناك منتجات تستخدم المقاسات */}
        {hasProductsWithSizes && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center">
              <Ruler className="w-5 h-5 ml-2" />
              خيارات طباعة المقاسات
            </h3>
            
            <RadioGroup
              value={settings.sizePrintOption}
              onValueChange={(value: SizePrintOption) => 
                handleSettingsChange({ sizePrintOption: value })
              }
              className="flex flex-col space-y-2"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="default" id="size-default" />
                <Label htmlFor="size-default">طباعة المقاس الافتراضي فقط</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="selected" id="size-selected" />
                <Label htmlFor="size-selected">طباعة مقاسات محددة</Label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="all" id="size-all" />
                <Label htmlFor="size-all">طباعة جميع المقاسات</Label>
              </div>
            </RadioGroup>
            
            {/* عند اختيار خيار "طباعة مقاسات محددة" عرض قائمة بالمقاسات المتاحة لكل لون */}
            {settings.sizePrintOption === 'selected' && (
              <div className="mt-4 border rounded-md p-3 space-y-4">
                <h4 className="font-medium">اختر المقاسات للطباعة</h4>
                
                {/* عرض مقاسات الألوان المختارة */}
                {selectedProductsWithVariants.map(product => {
                  // عرض فقط للمنتجات التي تستخدم المقاسات
                  if (!product.use_sizes) return null;
                  
                  const productColorIds = settings.colorPrintOption === 'all'
                    ? productColorsState[product.id]?.map(c => c.id) || []
                    : settings.colorPrintOption === 'selected'
                      ? selectedColorsByProduct[product.id] || []
                      : productColorsState[product.id]?.filter(c => c.is_default)?.map(c => c.id) || [];
                  
                  if (productColorIds.length === 0) {
                    return (
                      <div key={product.id} className="text-muted-foreground text-sm">
                        لم يتم اختيار ألوان للمنتج {product.name}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={product.id} className="space-y-3">
                      <h5 className="text-sm font-medium">{product.name}</h5>
                      
                      {productColorIds.map(colorId => {
                        const color = productColorsState[product.id]?.find(c => c.id === colorId);
                        
                        if (!color || !color.has_sizes) return null;
                        
                        const colorSizes = productSizesState[colorId] || [];
                        const isLoadingSizes = loadingSizes && !productSizesState[colorId];
                        
                        return (
                          <div key={colorId} className="border-t pt-2 space-y-2">
                            <h6 className="text-xs font-medium flex items-center">
                              <span 
                                className="w-3 h-3 rounded-full inline-block ml-2" 
                                style={{ backgroundColor: color.color_code }}
                              />
                              {color.name}
                            </h6>
                            
                            {isLoadingSizes ? (
                              <div className="flex items-center text-xs text-muted-foreground">
                                <RotateCw className="animate-spin w-3 h-3 ml-2" />
                                جاري تحميل المقاسات...
                              </div>
                            ) : colorSizes.length === 0 ? (
                              <div className="text-xs text-muted-foreground">
                                لا توجد مقاسات لهذا اللون
                              </div>
                            ) : (
                              <div className="grid grid-cols-3 gap-2">
                                {colorSizes.map(size => (
                                  <div key={size.id} className="flex items-center space-x-2 space-x-reverse">
                                    <Checkbox
                                      checked={selectedSizesByColor[colorId]?.includes(size.id) || false}
                                      onCheckedChange={(checked) => {
                                        handleSizeSelection(colorId, size.id, !!checked);
                                      }}
                                      id={`size-${colorId}-${size.id}`}
                                    />
                                    <Label 
                                      htmlFor={`size-${colorId}-${size.id}`}
                                      className="text-xs"
                                    >
                                      {size.size_name}
                                      {size.is_default && (
                                        <span className="text-xs text-muted-foreground mr-1">(افتراضي)</span>
                                      )}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {isButtonVisible && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="flex items-center"
        >
          <Printer className="h-4 w-4 ml-2" />
          {buttonText}
        </Button>
      )}
      
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              اختر المنتجات ثم اضبط إعدادات الطباعة
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="select">1. اختيار المنتجات</TabsTrigger>
              <TabsTrigger value="settings">2. إعدادات الطباعة</TabsTrigger>
              <TabsTrigger value="preview" disabled={selectedProducts.length === 0}>3. معاينة</TabsTrigger>
            </TabsList>
            
            <TabsContent value="select" className="flex-1 overflow-y-auto space-y-4">
              {/* قائمة المنتجات للاختيار */}
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">اختر المنتجات للطباعة</h3>
                <Button 
                  variant="link" 
                  onClick={selectAllProducts}
                  size="sm"
                >
                  {selectedProducts.length === products.length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                </Button>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>المنتج</TableHead>
                    <TableHead>الباركود</TableHead>
                    <TableHead className="text-left">السعر</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                        />
                      </TableCell>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.barcode || product.sku || 'غير محدد'}</TableCell>
                      <TableCell className="text-left">{product.price.toLocaleString()} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              <div className="pt-4">
                <Button 
                  variant="default" 
                  onClick={() => handleTabChange('settings')}
                  disabled={selectedProducts.length === 0}
                >
                  التالي: إعدادات الطباعة
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="settings" className="flex-1 overflow-y-auto space-y-4">
              {/* إعدادات الطباعة */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">إعدادات الطباعة</h3>
                
                <BarcodeSettings
                  settings={settings}
                  onChange={handleSettingsChange}
                  savedSettings={savedSettings}
                  onSaveSettings={handleSaveSettings}
                  currentSavedSettingName={currentSavedSettingName}
                  onLoadSavedSettings={loadSavedSettings}
                />
                
                {/* إضافة خيارات الألوان والمقاسات */}
                {renderColorAndSizeOptions()}
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleTabChange('select')}
                  >
                    السابق: اختيار المنتجات
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={handleGeneratePreview}
                    disabled={selectedProducts.length === 0}
                  >
                    التالي: معاينة الطباعة
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="preview" className="flex-1 overflow-y-auto relative">
              {/* معاينة الطباعة */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium flex justify-between items-center">
                  <span>معاينة الطباعة</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handlePrint}
                    disabled={!showPreview}
                    className="flex items-center"
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    طباعة
                  </Button>
                </h3>
                
                <BarcodePrintPreview
                  products={products}
                  selectedProducts={selectedProducts}
                  settings={settings}
                  onPrint={handlePrint}
                  isLoading={isLoading}
                />
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => handleTabChange('settings')}
                  >
                    السابق: إعدادات الطباعة
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          
          <DialogFooter>
            <Button onClick={() => setOpen(false)} variant="outline">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default BulkBarcodePrinter; 