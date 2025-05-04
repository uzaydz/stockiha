import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader, Printer, Download, Eye, Save, ChevronLeft, ChevronRight } from 'lucide-react';
import BarcodeDisplay from '@/components/ui/BarcodeDisplay';
import type { Product } from '@/lib/api/products';
import { ProductColor, ProductSize } from '@/types/product';
import type { BarcodeSettings } from './BarcodeSettings';
import { ExtendedBarcodeSettings } from './BulkBarcodePrinter'; 
import { generatePrintStylesheet } from '@/lib/barcode-utils';
import { getProductColors, getProductSizes } from '@/lib/api/productVariants';

// تعريف واجهة للمنتج الموسع
interface ExtendedProduct extends Product {
  has_variants?: boolean;
  use_sizes?: boolean;
}

// تعريف عنصر المعاينة الذي سيعرض في الشبكة
interface PreviewItem {
  productId: string;
  productName: string;
  barcode: string;
  price: number;
  colorName?: string;
  colorCode?: string;
  sizeName?: string;
}

interface BarcodePrintPreviewProps {
  products: ExtendedProduct[];
  selectedProducts: string[];
  settings: ExtendedBarcodeSettings;
  onPrint: () => void;
  isLoading?: boolean;
}

const BarcodePrintPreview = ({ 
  products, 
  selectedProducts, 
  settings, 
  onPrint,
  isLoading = false 
}: BarcodePrintPreviewProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
  const [productColors, setProductColors] = useState<Record<string, ProductColor[]>>({});
  const [productSizes, setProductSizes] = useState<Record<string, ProductSize[]>>({});
  const [loadingData, setLoadingData] = useState(false);
  
  // تحميل بيانات الألوان والمقاسات
  useEffect(() => {
    const loadProductData = async () => {
      if (selectedProducts.length === 0) return;
      
      setLoadingData(true);
      
      try {
        const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
        const productsWithVariants = selectedProductsData.filter(p => p.has_variants);
        
        // تحميل الألوان لكل منتج
        const colorsPromises = productsWithVariants.map(async (product) => {
          try {
            const colors = await getProductColors(product.id);
            return { productId: product.id, colors };
          } catch (error) {
            console.error(`Error loading colors for product ${product.id}:`, error);
            return { productId: product.id, colors: [] };
          }
        });
        
        const colorsResults = await Promise.all(colorsPromises);
        const colorsMap: Record<string, ProductColor[]> = {};
        
        colorsResults.forEach(result => {
          colorsMap[result.productId] = result.colors;
        });
        
        setProductColors(colorsMap);
        
        // تحميل المقاسات لكل لون
        const sizesPromises: Promise<{ colorId: string; sizes: ProductSize[] }>[] = [];
        
        colorsResults.forEach(result => {
          const product = productsWithVariants.find(p => p.id === result.productId);
          
          if (product?.use_sizes) {
            result.colors.forEach(color => {
              if (color.has_sizes) {
                sizesPromises.push(
                  getProductSizes(color.id)
                    .then(sizes => ({ colorId: color.id, sizes }))
                    .catch(error => {
                      console.error(`Error loading sizes for color ${color.id}:`, error);
                      return { colorId: color.id, sizes: [] };
                    })
                );
              }
            });
          }
        });
        
        const sizesResults = await Promise.all(sizesPromises);
        const sizesMap: Record<string, ProductSize[]> = {};
        
        sizesResults.forEach(result => {
          sizesMap[result.colorId] = result.sizes;
        });
        
        setProductSizes(sizesMap);
        
        // إنشاء عناصر المعاينة
        generatePreviewItems(selectedProductsData, colorsMap, sizesMap);
      } catch (error) {
        console.error('Error loading product data:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadProductData();
  }, [products, selectedProducts]);
  
  // إنشاء عناصر المعاينة بناءً على الألوان والمقاسات المختارة
  const generatePreviewItems = (
    selectedProductsData: ExtendedProduct[], 
    colorsMap: Record<string, ProductColor[]>, 
    sizesMap: Record<string, ProductSize[]>
  ) => {
    const items: PreviewItem[] = [];
    
    // إضافة المنتجات العادية
    const regularProducts = selectedProductsData.filter(p => !p.has_variants);
    regularProducts.forEach(product => {
      if (product.barcode || product.sku) {
        items.push({
          productId: product.id,
          productName: product.name,
          barcode: product.barcode || product.sku,
          price: product.price
        });
      }
    });
    
    // إضافة المنتجات ذات الألوان والمقاسات
    const variantProducts = selectedProductsData.filter(p => p.has_variants);
    
    variantProducts.forEach(product => {
      const productColorsArr = colorsMap[product.id] || [];
      
      // تحديد الألوان المطلوب معاينتها
      let colorsToPrint: ProductColor[] = [];
      
      if (settings.colorPrintOption === 'all') {
        // معاينة جميع الألوان
        colorsToPrint = productColorsArr;
      } else if (settings.colorPrintOption === 'selected' && settings.selectedColors && settings.selectedColors.length > 0) {
        // معاينة الألوان المحددة فقط
        colorsToPrint = productColorsArr.filter(color => settings.selectedColors.includes(color.id));
      } else {
        // معاينة اللون الافتراضي فقط
        colorsToPrint = productColorsArr.filter(color => color.is_default);
      }
      
      // إذا لم يتم العثور على ألوان، أضف المنتج الأساسي
      if (colorsToPrint.length === 0 && (product.barcode || product.sku)) {
        items.push({
          productId: product.id,
          productName: product.name,
          barcode: product.barcode || product.sku,
          price: product.price
        });
      }
      
      // معالجة كل لون
      colorsToPrint.forEach(color => {
        // إذا كان المنتج يستخدم المقاسات واللون يدعم المقاسات
        if (product.use_sizes && color.has_sizes) {
          const colorSizes = sizesMap[color.id] || [];
          
          // تحديد المقاسات المطلوب معاينتها
          let sizesToPrint: ProductSize[] = [];
          
          if (settings.sizePrintOption === 'all') {
            // معاينة جميع المقاسات
            sizesToPrint = colorSizes;
          } else if (settings.sizePrintOption === 'selected' && settings.selectedSizes && settings.selectedSizes[color.id] && settings.selectedSizes[color.id].length > 0) {
            // معاينة المقاسات المحددة فقط
            sizesToPrint = colorSizes.filter(size => 
              settings.selectedSizes[color.id]?.includes(size.id)
            );
          } else {
            // معاينة المقاس الافتراضي فقط
            sizesToPrint = colorSizes.filter(size => size.is_default);
          }
          
          // إذا لم يتم العثور على مقاسات، أضف اللون الأساسي
          if (sizesToPrint.length === 0) {
            items.push({
              productId: product.id,
              productName: product.name,
              barcode: color.barcode || product.barcode || product.sku,
              price: color.price || product.price,
              colorName: color.name,
              colorCode: color.color_code
            });
          } else {
            // إضافة كل مقاس
            sizesToPrint.forEach(size => {
              items.push({
                productId: product.id,
                productName: product.name,
                barcode: size.barcode || color.barcode || product.barcode || product.sku,
                price: size.price || color.price || product.price,
                colorName: color.name,
                colorCode: color.color_code,
                sizeName: size.size_name
              });
            });
          }
        } else {
          // إذا كان اللون بدون مقاسات، إضافته مباشرة
          items.push({
            productId: product.id,
            productName: product.name,
            barcode: color.barcode || product.barcode || product.sku,
            price: color.price || product.price,
            colorName: color.name,
            colorCode: color.color_code
          });
        }
      });
    });
    
    setPreviewItems(items);
    
    // حساب عدد العناصر في الصفحة الواحدة بناءً على الإعدادات
    const itemsPerPage = settings.columns * settings.rows;
    
    // حساب عدد الصفحات
    const pages = Math.ceil(items.length / itemsPerPage);
    setTotalPages(pages > 0 ? pages : 1);
    
    // ضمان أن الصفحة الحالية لا تتجاوز إجمالي الصفحات
    if (currentPage > pages) {
      setCurrentPage(pages > 0 ? pages : 1);
    }
  };
  
  // الانتقال إلى صفحة معينة
  const navigateToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };
  
  // تحديد إعدادات حجم الباركود
  const getBarcodeSize = () => {
    if (settings.barcodeSize === 'custom') {
      return {
        scaleValue: settings.scaleValue,
        heightValue: settings.heightValue,
        fontSize: settings.fontSize
      };
    }
    
    switch (settings.barcodeSize) {
      case 'small':
        return { scaleValue: 1, heightValue: 40, fontSize: 10 };
      case 'large':
        return { scaleValue: 2, heightValue: 80, fontSize: 14 };
      default: // medium
        return { scaleValue: 1.5, heightValue: 60, fontSize: 12 };
    }
  };
  
  // توليد CSS لطباعة الصفحة
  const getPrintCSS = () => {
    return generatePrintStylesheet(settings);
  };
  
  // عرض صفحة فارغة في حالة عدم اختيار أي منتجات
  if (selectedProducts.length === 0) {
    return (
      <Card className="border rounded-lg p-4 mt-4">
        <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground p-0">
          <Eye className="h-8 w-8 mb-2" />
          <p>اختر منتجًا لعرض المعاينة</p>
        </CardContent>
      </Card>
    );
  }
  
  // عرض حالة التحميل
  if (isLoading || loadingData) {
    return (
      <Card className="border rounded-lg p-4 mt-4">
        <CardContent className="flex flex-col items-center justify-center h-40 p-0">
          <Loader className="h-8 w-8 mb-2 animate-spin" />
          <p>جاري تحضير المعاينة...</p>
        </CardContent>
      </Card>
    );
  }
  
  // الحالة عند عدم وجود عناصر للمعاينة
  if (previewItems.length === 0) {
    return (
      <Card className="border rounded-lg p-4 mt-4">
        <CardContent className="flex flex-col items-center justify-center h-40 text-muted-foreground p-0">
          <Eye className="h-8 w-8 mb-2" />
          <p>لا توجد باركودات صالحة للمعاينة. تأكد من توفر قيم باركود للمنتجات المختارة.</p>
        </CardContent>
      </Card>
    );
  }
  
  const barcodeSize = getBarcodeSize();
  
  // حساب المؤشرات للعناصر التي ستظهر في الصفحة الحالية
  const itemsPerPage = settings.columns * settings.rows;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, previewItems.length);
  const currentPageItems = previewItems.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium">معاينة الطباعة: <span className="text-sm font-normal text-muted-foreground">({previewItems.length} عنصر)</span></h3>
        <div className="flex items-center gap-2">
          <span className="text-sm">الصفحة {currentPage} من {totalPages}</span>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateToPage(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => navigateToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <Card className="border rounded-lg">
        <CardContent className="pt-6">
          <div 
            className={`grid gap-4`}
            style={{
              gridTemplateColumns: `repeat(${Math.min(settings.columns, 3)}, 1fr)`,
              alignItems: settings.alignment,
              textAlign: settings.labelTextAlign as any
            }}
          >
            {currentPageItems.map((item, index) => (
              <div 
                key={`${item.productId}-${item.colorName || ''}-${item.sizeName || ''}-${index}`} 
                className={`border p-2 rounded flex flex-col items-${settings.alignment}`}
                style={{
                  backgroundColor: settings.backgroundColor,
                  color: settings.fontColor,
                  fontFamily: settings.fontFamily,
                  borderColor: settings.showBorder ? settings.borderColor : 'transparent'
                }}
              >
                {settings.includeName && (
                  <p className="text-sm font-medium mb-1">
                    {item.productName}
                    {item.colorName && ` - ${item.colorName}`}
                    {item.sizeName && ` - ${item.sizeName}`}
                  </p>
                )}
                
                <div className="flex justify-center w-full">
                  <BarcodeDisplay 
                    value={item.barcode}
                    height={barcodeSize.heightValue}
                    width={barcodeSize.scaleValue}
                    fontSize={barcodeSize.fontSize}
                    bcid={settings.barcodeType}
                    includeText={settings.includeText}
                    showControls={false}
                  />
                </div>
                
                {settings.showSku && (
                  <p className="text-xs mt-1 font-mono">
                    SKU: {item.barcode}
                  </p>
                )}
                
                {settings.includePrice && (
                  <p className="mt-1 text-sm font-bold">
                    {item.price.toLocaleString()} دج
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-2 text-xs text-muted-foreground">
        <p>
          التنسيق النهائي للطباعة: {settings.paperSize === 'A4' ? 'A4' : settings.paperSize === 'A5' ? 'A5' : 'ملصق'} |
          التخطيط: {settings.columns} × {settings.rows} |
          المنتجات المحددة: {selectedProducts.length} |
          إجمالي الملصقات: {selectedProducts.length * settings.copiesPerProduct}
        </p>
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: getPrintCSS() }} />
      
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => {}}>
          <Save className="h-4 w-4 ml-2" />
          حفظ الإعدادات
        </Button>
        <Button onClick={onPrint}>
          <Printer className="h-4 w-4 ml-2" />
          طباعة الباركود
        </Button>
      </div>
    </div>
  );
};

export default BarcodePrintPreview; 