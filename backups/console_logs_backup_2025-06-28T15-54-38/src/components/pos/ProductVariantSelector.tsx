import { useState, useEffect } from 'react';
import { Product } from '@/types';
import { ProductColor } from '@/api/store';
import { getProductSizes } from '@/lib/api/productVariants';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2, ShoppingCart, Package, Palette, Ruler, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

  // الحصول على اللون المحدد
  const selectedColor = product.colors?.find(c => c.id === selectedColorId);
  const selectedSize = sizes.find(s => s.id === selectedSizeId);

  // تحديد اللون الافتراضي عند التحميل
  useEffect(() => {
    if (product.colors && product.colors.length > 0) {
      const defaultColor = product.colors.find(c => c.is_default) || product.colors[0];
      if (defaultColor && defaultColor.quantity > 0) {
        setSelectedColorId(defaultColor.id);
      }
    }
  }, [product.colors]);

  // استرجاع مقاسات اللون عند تغيير اللون المحدد
  useEffect(() => {
    if (selectedColorId && product.use_sizes && selectedColor?.has_sizes) {
      setLoadingSizes(true);

      getProductSizes(selectedColorId)
        .then(sizeData => {
          setSizes(sizeData as ProductSize[]);
          setSelectedSizeId(null); // إعادة تعيين المقاس المحدد
          
          // تحديد المقاس الافتراضي إذا وُجد
          const defaultSize = sizeData.find(s => s.is_default) || sizeData[0];
          if (defaultSize && defaultSize.quantity > 0) {
            setSelectedSizeId(defaultSize.id);
          }
        })
        .catch(err => {
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
    <div className="space-y-4 max-w-full mx-auto">
      {/* رأس المنتج */}
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-foreground">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-muted-foreground">{product.description}</p>
        )}
        <Badge variant="outline" className="text-xs">
          كود المنتج: {product.sku}
        </Badge>
      </div>

      <Separator />

      {/* اختيار اللون */}
      {product.colors && product.colors.length > 0 && (
        <Card className="shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-4 w-4" />
              اختر اللون
              <Badge variant="secondary" className="text-xs">
                {product.colors.length} خيار
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="max-h-40">
              <div className="grid grid-cols-1 gap-2">
                {product.colors.map(color => (
                  <button
                    key={color.id}
                    className={cn(
                      "relative p-3 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                      selectedColorId === color.id 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:border-primary/50',
                      color.quantity <= 0 
                        ? 'opacity-50 cursor-not-allowed' 
                        : 'cursor-pointer hover:scale-105'
                    )}
                    onClick={() => color.quantity > 0 && setSelectedColorId(color.id)}
                    disabled={color.quantity <= 0}
                  >
                    {/* مؤشر التحديد */}
                    {selectedColorId === color.id && (
                      <div className="absolute -top-1 -right-1">
                        <CheckCircle2 className="h-4 w-4 text-primary bg-background rounded-full" />
                      </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-6 h-6 rounded-full border-2 border-white shadow-sm flex-shrink-0 relative" 
                        style={{ backgroundColor: color.color_code }}
                      >
                        {/* تأثير بصري للون المحدد */}
                        {selectedColorId === color.id && (
                          <div className="absolute inset-0 rounded-full border-2 border-primary animate-pulse" />
                        )}
                      </div>
                      <div className="flex-1 text-right">
                        <div className="font-medium text-sm">{color.name}</div>
                        <div className="flex items-center justify-between mt-1">
                          <span className={cn(
                            "text-xs",
                            color.quantity <= 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {color.quantity <= 0 ? "نفذت الكمية" : `${color.quantity} متوفر`}
                          </span>
                          {color.price !== undefined && color.price !== product.price && (
                            <Badge variant="outline" className="text-xs">
                              {formatPrice(color.price)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* اختيار المقاس */}
      {product.use_sizes && selectedColor?.has_sizes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Ruler className="h-4 w-4" />
              اختر المقاس
              {!loadingSizes && sizes.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {sizes.length} خيار
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingSizes ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                <span className="text-sm text-muted-foreground">جاري تحميل المقاسات...</span>
              </div>
            ) : (
              <ScrollArea className="max-h-32">
                <div className="grid grid-cols-3 gap-2">
                  {sizes.map(size => (
                    <button
                      key={size.id}
                      className={cn(
                        "relative p-2 rounded-lg border-2 transition-all duration-200 hover:shadow-md",
                        selectedSizeId === size.id 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border hover:border-primary/50',
                        size.quantity <= 0 
                          ? 'opacity-50 cursor-not-allowed' 
                          : 'cursor-pointer hover:scale-105'
                      )}
                      onClick={() => size.quantity > 0 && setSelectedSizeId(size.id)}
                      disabled={size.quantity <= 0}
                    >
                      {/* مؤشر التحديد */}
                      {selectedSizeId === size.id && (
                        <div className="absolute -top-1 -right-1">
                          <CheckCircle2 className="h-3 w-3 text-primary bg-background rounded-full" />
                        </div>
                      )}
                      
                      <div className="text-center">
                        <div className="font-medium text-xs">{size.size_name}</div>
                        <div className="text-xs mt-1">
                          <span className={cn(
                            size.quantity <= 0 ? "text-destructive" : "text-muted-foreground"
                          )}>
                            {size.quantity <= 0 ? "نفذ" : `${size.quantity}`}
                          </span>
                        </div>
                        {size.price !== undefined && size.price !== (selectedColor?.price || product.price) && (
                          <Badge variant="outline" className="text-xs mt-1">
                            {formatPrice(size.price)}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      {/* ملخص السعر والكمية */}
      <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">السعر النهائي</div>
              <div className="text-xl font-bold text-primary">
                {formatPrice(calculatePrice())}
              </div>
              {calculatePrice() !== product.price && (
                <div className="text-xs text-muted-foreground line-through">
                  السعر الأصلي: {formatPrice(product.price)}
                </div>
              )}
            </div>
            
            <div className="text-center">
              <div className="text-xs text-muted-foreground">الكمية المتاحة</div>
              <div className={cn(
                "text-lg font-bold",
                getAvailableQuantity() <= 0 ? "text-destructive" : "text-green-600"
              )}>
                {getAvailableQuantity()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* رسالة تحذيرية إذا لم يتم اختيار المتغيرات المطلوبة */}
      {!canAddToCart() && selectedColorId && (
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <span className="text-xs text-amber-800">
            {!selectedColorId ? "يرجى اختيار لون" : 
             (product.use_sizes && selectedColor?.has_sizes && !selectedSizeId) ? "يرجى اختيار مقاس" :
             getAvailableQuantity() <= 0 ? "هذا المتغير غير متوفر في المخزون" : ""}
          </span>
        </div>
      )}

      {/* أزرار الإجراءات */}
      <div className="flex gap-2 pt-2">
        <Button 
          className="flex-1 h-10 text-sm font-medium transition-all duration-200 hover:scale-105 disabled:hover:scale-100"
          onClick={handleAddToCart}
          disabled={!canAddToCart()}
        >
          <ShoppingCart className="h-4 w-4 mr-2" />
          إضافة إلى السلة
        </Button>
        <Button 
          variant="outline" 
          className="h-10 px-4 text-sm transition-all duration-200 hover:scale-105"
          onClick={onCancel}
        >
          إلغاء
        </Button>
      </div>
    </div>
  );
}
