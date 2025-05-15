import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductColor } from '@/api/store';
import { getProductSizes } from '@/lib/api/productVariants';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [quantity, setQuantity] = useState(1);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [loadingSizes, setLoadingSizes] = useState(false);

  // استرجاع اللون المحدد
  const selectedColor = product.colors?.find(color => color.id === selectedColorId);
  
  // استرجاع المقاس المحدد
  const selectedSize = sizes.find(size => size.id === selectedSizeId);

  // طباعة تشخيصية للمساعدة في تحديد المشكلة
  useEffect(() => {
    console.log("ProductVariantSelector تم تحميله:", {
      productName: product.name,
      productId: product.id,
      hasVariants: product.has_variants,
      useSizes: product.use_sizes,
      colors: product.colors,
      colorsCount: product.colors?.length
    });
  }, [product]);

  // تلقائياً اختر اللون الافتراضي أو الأول
  useEffect(() => {
    if (product.colors && product.colors.length > 0) {
      // ابحث عن اللون الافتراضي
      const defaultColor = product.colors.find(color => color.is_default);
      if (defaultColor) {
        setSelectedColorId(defaultColor.id);
      } else {
        // اختر أول لون متوفر
        setSelectedColorId(product.colors[0].id);
      }
    }
  }, [product.colors]);

  // استرجاع مقاسات اللون عند تغيير اللون المحدد
  useEffect(() => {
    if (selectedColorId && product.use_sizes && selectedColor?.has_sizes) {
      setLoadingSizes(true);
      console.log("تحميل المقاسات للون:", selectedColorId);
      
      getProductSizes(selectedColorId)
        .then(sizeData => {
          console.log("تم تحميل المقاسات:", sizeData);
          // نستخدم Type Assertion للتأكد من توافق البيانات مع الواجهة ProductSize
          setSizes(sizeData as ProductSize[]);
          setSelectedSizeId(null); // إعادة تعيين المقاس المحدد
        })
        .catch(err => {
          console.error("خطأ في تحميل المقاسات:", err);
          toast.error("حدث خطأ أثناء تحميل المقاسات");
        })
        .finally(() => {
          setLoadingSizes(false);
        });
    } else {
      setSizes([]);
      setSelectedSizeId(null);
    }
  }, [selectedColorId, product.use_sizes, selectedColor?.has_sizes]);

  // حساب السعر النهائي بناءً على المتغيرات المحددة
  const calculatePrice = () => {
    if (selectedSize && selectedSize.price !== undefined) {
      return selectedSize.price;
    }
    
    if (selectedColor && selectedColor.price !== undefined) {
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
    if (!product.colors || product.colors.length === 0) {
      return product.stock_quantity > 0;
    }

    // تعديل الشرط ليعمل مع أي منتج له ألوان بغض النظر عن has_variants
    if (product.colors && product.colors.length > 0) {
      if (!selectedColorId) return false;
      
      // إذا كان المنتج يستخدم المقاسات واللون يحتوي على مقاسات
      if (product.use_sizes && selectedColor?.has_sizes) {
        // يجب اختيار المقاس
        if (!selectedSizeId) return false;
      }
    }
    
    return getAvailableQuantity() > 0;
  };

  // إضافة المنتج للسلة
  const handleAddToCart = () => {
    if (!canAddToCart()) return;
    
    // إذا لم يكن للمنتج ألوان أو اللون غير محدد، أضف المنتج مباشرة
    if (!product.colors || product.colors.length === 0 || !selectedColorId) {
      onAddToCart(product, undefined, undefined, product.price);
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
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold">{product.name}</h3>
      
      {/* اختيار اللون */}
      {product.colors && product.colors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">اختر اللون:</h4>
          <ScrollArea className="max-h-60">
            <div className="flex flex-wrap gap-2">
              {product.colors.map(color => (
                <button
                  key={color.id}
                  className={`p-2 rounded-md border ${selectedColorId === color.id ? 'ring-2 ring-primary' : ''} ${color.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => setSelectedColorId(color.id)}
                  disabled={color.quantity <= 0}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-5 h-5 rounded-full" 
                      style={{ backgroundColor: color.color_code }}
                    />
                    <span>{color.name}</span>
                    {color.quantity <= 0 && (
                      <span className="text-xs text-destructive">(نفذت الكمية)</span>
                    )}
                    {color.price !== undefined && color.price !== product.price && (
                      <span className="text-sm text-muted-foreground">
                        ({color.price.toLocaleString()} دج)
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
      
      {/* اختيار المقاس */}
      {product.use_sizes && selectedColor?.has_sizes && (
        <div className="space-y-2">
          <h4 className="font-medium">اختر المقاس:</h4>
          {loadingSizes ? (
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              <span>جاري تحميل المقاسات...</span>
            </div>
          ) : (
            <ScrollArea className="max-h-60">
              <div className="flex flex-wrap gap-2">
                {sizes.map(size => (
                  <button
                    key={size.id}
                    className={`p-2 rounded-md border ${selectedSizeId === size.id ? 'ring-2 ring-primary' : ''} ${size.quantity <= 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => setSelectedSizeId(size.id)}
                    disabled={size.quantity <= 0}
                  >
                    <div className="flex items-center gap-2">
                      <span>{size.size_name}</span>
                      {size.quantity <= 0 && (
                        <span className="text-xs text-destructive">(نفذت الكمية)</span>
                      )}
                      {size.price !== undefined && size.price !== (selectedColor?.price || product.price) && (
                        <span className="text-sm text-muted-foreground">
                          ({size.price.toLocaleString()} دج)
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      )}
      
      {/* معلومات السعر والكمية */}
      <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg">
        <div>
          <h4 className="font-medium">السعر:</h4>
          <div className="text-xl font-bold">{calculatePrice().toLocaleString()} دج</div>
        </div>
        <div>
          <h4 className="font-medium">الكمية المتاحة:</h4>
          <div className="text-center">{getAvailableQuantity()}</div>
        </div>
      </div>
      
      {/* أزرار الإضافة أو الإلغاء */}
      <div className="flex gap-2 pt-4">
        <Button 
          variant="default" 
          className="flex-1"
          onClick={handleAddToCart}
          disabled={!canAddToCart()}
        >
          إضافة إلى السلة
        </Button>
        <Button 
          variant="outline" 
          onClick={onCancel}
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
} 