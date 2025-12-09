import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductColor } from '@/api/store';
// import { getProductSizes } from '@/lib/api/productVariants'; // لم يعد ضرورياً - المقاسات تأتي مع المنتج
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingCart, AlertCircle, Check } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ensureArray } from '@/context/POSDataContext';

// التعريف الصحيح للواجهة ProductSize بناءً على ما ترجعه getProductSizes
interface ProductSize {
  id: string;
  color_id: string;
  product_id: string;
  size_name: string;
  quantity: number;
  price?: number | null;
  barcode?: string | null;
  is_default: boolean;
}

interface ProductVariantSelectorProps {
  product: Product;
  onAddToCart: (product: Product, colorId: string | undefined, sizeId: string | undefined, variantPrice: number, colorName?: string, colorCode?: string, sizeName?: string, variantImage?: string) => void;
  onCancel: () => void;
}

export default function ProductVariantSelector({
  product,
  onAddToCart,
  onCancel
}: ProductVariantSelectorProps) {
  const [selectedColorId, setSelectedColorId] = useState<string | null>(null);
  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);

  // ✅ استخدام ensureArray للتعامل مع JSON strings من SQLite
  const productColors = ensureArray(product.colors) as any[];
  const productColorsAlt = ensureArray((product as any).product_colors) as any[];
  const productVariants = ensureArray((product as any).variants) as any[];
  
  // 🔍 DEBUG: عرض بيانات الألوان
  useEffect(() => {
    console.log('%c[ProductVariantSelector] 🎨 Product colors check:', 'color: #9C27B0; font-weight: bold', {
      product_name: product.name,
      product_id: product.id,
      has_variants: product.has_variants,
      colors_from_product: productColors.length,
      colors_from_product_colors: productColorsAlt.length,
      colors_from_variants: productVariants.length,
      raw_colors: product.colors,
      raw_product_colors: (product as any).product_colors,
      raw_variants: (product as any).variants,
      sample_color: productColors[0] || productColorsAlt[0] || productVariants[0]
    });
  }, [product.id, product.name, productColors.length, productColorsAlt.length, productVariants.length]);
  
  // استخدام الألوان من أي مصدر متاح
  const finalColors = productColors.length > 0 
    ? productColors 
    : productColorsAlt.length > 0 
      ? productColorsAlt 
      : productVariants;

  // الحصول على اللون المحدد
  const selectedColor = finalColors.find(c => c.id === selectedColorId);
  const selectedSize = sizes.find(s => s.id === selectedSizeId);

  // تحديد اللون الافتراضي عند التحميل
  useEffect(() => {
    if (finalColors && finalColors.length > 0) {
      const defaultColor = finalColors.find(c => c.is_default) || finalColors[0];
      if (defaultColor && (defaultColor.quantity ?? 0) > 0) {
        setSelectedColorId(defaultColor.id);
        console.log('%c[ProductVariantSelector] ✅ Selected default color:', 'color: #4CAF50; font-weight: bold', {
          color_id: defaultColor.id,
          color_name: defaultColor.name,
          has_sizes: defaultColor.has_sizes,
          sizes_count: defaultColor.sizes?.length || defaultColor.product_sizes?.length || 0
        });
      }
    } else {
      // إعادة تعيين selectedColorId إذا لم تكن هناك ألوان
      setSelectedColorId(null);
    }
  }, [finalColors.length, product.colors, productColors.length, productColorsAlt.length, productVariants.length]);

  // استخدام المقاسات القادمة مع المنتج (بدون استدعاء إضافي)
  useEffect(() => {
    if (selectedColorId && selectedColor?.has_sizes) {
      // المقاسات موجودة في selectedColor.sizes مباشرة!
      const colorSizes = (selectedColor as any).sizes || [];
      setSizes(colorSizes as ProductSize[]);
      setSelectedSizeId(null);
      
      // تحديد المقاس الافتراضي
      const defaultSize = colorSizes.find((s: any) => s.is_default) || colorSizes[0];
      if (defaultSize && defaultSize.quantity > 0) {
        setSelectedSizeId(defaultSize.id);
      }
    } else {
      setSizes([]);
      setSelectedSizeId(null);
    }
  }, [selectedColorId, selectedColor?.has_sizes, selectedColor]);

  // حساب السعر النهائي بناءً على المتغيرات المحددة
  const calculatePrice = () => {
    if (selectedSize && selectedSize.price !== undefined && selectedSize.price !== null) {
      return selectedSize.price;
    }
    
    if (selectedColor && selectedColor.price !== undefined && selectedColor.price !== null) {
      return selectedColor.price;
    }
    
    return product.price;
  };

  // حساب الكمية المتاحة
  const getAvailableQuantity = () => {
    if (selectedSize) {
      return selectedSize.quantity;
    }
    
    if (selectedColor) {
      return selectedColor.quantity;
    }
    
    return product.stock_quantity;
  };

  // التحقق مما إذا كان يمكن إضافة المنتج
  const canAddToCart = () => {
    // إذا لم يكن للمنتج ألوان، يمكن إضافته مباشرة
    if (!finalColors || finalColors.length === 0) {
      return product.stock_quantity > 0;
    }

    // تعديل الشرط ليعمل مع أي منتج له ألوان بغض النظر عن has_variants
    if (finalColors && finalColors.length > 0) {
      if (!selectedColorId) return false;
      

      if (selectedColor?.has_sizes && sizes.length > 0) {
        // يجب اختيار المقاس
        if (!selectedSizeId) return false;
      }
      // إذا كان has_sizes = true لكن لا توجد مقاسات، يمكن الإضافة بدون مقاس
    }
    
    return getAvailableQuantity() > 0;
  };

  // إضافة المنتج للسلة
  const handleAddToCart = () => {
    if (!canAddToCart()) return;
    
    // إذا لم يكن للمنتج ألوان أو اللون غير محدد، أضف المنتج مباشرة
    if (!finalColors || finalColors.length === 0 || !selectedColorId) {
      onAddToCart(product, undefined, undefined, product.price);
      toast.success(`تم إضافة ${product.name} إلى السلة`);
      return;
    }
    
    const variantPrice = calculatePrice();
    onAddToCart(
      product, 
      selectedColorId, 
      selectedSizeId || undefined, 
      variantPrice,
      selectedColor?.name,
      selectedColor?.color_code,
      selectedSize?.size_name,
      selectedColor?.image_url
    );
    
    // رسالة نجاح مخصصة
    const variantDetails = [];
    if (selectedColor?.name) variantDetails.push(`اللون: ${selectedColor.name}`);
    if (selectedSize?.size_name) variantDetails.push(`المقاس: ${selectedSize.size_name}`);
    
    const message = variantDetails.length > 0 
      ? `تم إضافة ${product.name} (${variantDetails.join(', ')}) إلى السلة`
      : `تم إضافة ${product.name} إلى السلة`;
    
    toast.success(message);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-DZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price) + ' دج';
  };

  return (
    <div className="space-y-3">
      {/* رأس */}
      <div className="text-center">
        <h3 className="text-sm font-medium text-foreground">{product.name}</h3>
      </div>

      {/* اللون */}
      {finalColors && finalColors.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">اللون</label>
          <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
            {finalColors.map(color => (
              <button
                key={color.id}
                className={cn(
                  "relative flex items-center gap-2 px-2.5 py-2 rounded-md border transition-all",
                  selectedColorId === color.id 
                    ? 'border-primary bg-primary/10' 
                    : 'border-border hover:border-primary/30',
                  color.quantity <= 0 && 'opacity-30 cursor-not-allowed'
                )}
                onClick={() => color.quantity > 0 && setSelectedColorId(color.id)}
                disabled={color.quantity <= 0}
              >
                <div 
                  className="w-5 h-5 rounded-full border flex-shrink-0" 
                  style={{ backgroundColor: color.color_code }}
                />
                <span className="text-xs font-medium">{color.name}</span>
                <span className={cn(
                  "text-[10px] ml-auto",
                  color.quantity <= 0 ? "text-red-500" : "text-muted-foreground"
                )}>
                  {color.quantity}
                </span>
                {selectedColorId === color.id && (
                  <Check className="h-3 w-3 text-primary absolute -top-1 -right-1" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* المقاس */}
      {selectedColor?.has_sizes ? (
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">المقاس</label>
          {loadingSizes ? (
            <div className="flex items-center justify-center py-3 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin ml-1.5" />
              <span className="text-xs">تحميل...</span>
            </div>
          ) : sizes.length === 0 ? (
            <div className="p-2 text-xs bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-center">
              <p className="text-amber-800 dark:text-amber-200">لا توجد مقاسات لهذا اللون</p>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">يمكنك الإضافة بدون مقاس</p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {sizes.map(size => (
                <button
                  key={size.id}
                  className={cn(
                    "relative px-3 py-2 rounded-md border transition-all min-w-[60px]",
                    selectedSizeId === size.id 
                      ? 'border-primary bg-primary/10' 
                      : 'border-border hover:border-primary/30',
                    size.quantity <= 0 && 'opacity-30 cursor-not-allowed'
                  )}
                  onClick={() => size.quantity > 0 && setSelectedSizeId(size.id)}
                  disabled={size.quantity <= 0}
                >
                  <div className="text-center">
                    <div className="text-sm font-medium">{size.size_name}</div>
                    <div className={cn(
                      "text-[10px] mt-0.5",
                      size.quantity <= 0 ? "text-red-500" : "text-muted-foreground"
                    )}>
                      {size.quantity <= 0 ? "نفذ" : size.quantity}
                    </div>
                  </div>
                  {selectedSizeId === size.id && (
                    <Check className="h-3 w-3 text-primary absolute -top-1 -right-1" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        selectedColorId && selectedColor && !selectedColor.has_sizes && (
          <div className="p-2 text-xs text-muted-foreground bg-muted/30 rounded-md text-center">
            هذا اللون ليس له مقاسات
          </div>
        )
      )}

      {/* الملخص والأزرار */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-2 py-1.5 bg-muted/30 rounded-md">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">السعر:</span>
            <span className="text-sm font-bold text-primary">{formatPrice(calculatePrice())}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">متوفر:</span>
            <span className={cn(
              "text-sm font-bold",
              getAvailableQuantity() <= 0 ? "text-red-500" : "text-green-600"
            )}>
              {getAvailableQuantity()}
            </span>
          </div>
        </div>
        
        {!canAddToCart() && (
          <div className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-md">
            <AlertCircle className="h-3 w-3 text-amber-600" />
            <span className="text-xs text-amber-800 dark:text-amber-200">
              {!selectedColorId ? "اختر لون" : 
               (product.use_sizes && selectedColor?.has_sizes && !selectedSizeId) ? "اختر مقاس" : "غير متوفر"}
            </span>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            className="flex-1 h-9 text-sm"
            onClick={handleAddToCart}
            disabled={!canAddToCart()}
          >
            <ShoppingCart className="h-3.5 w-3.5 ml-1.5" />
            إضافة
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            className="h-9 px-3"
            onClick={onCancel}
          >
            إلغاء
          </Button>
        </div>
      </div>
    </div>
  );
}
