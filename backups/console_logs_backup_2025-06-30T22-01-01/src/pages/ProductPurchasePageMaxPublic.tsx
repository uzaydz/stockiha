import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  HeartIcon, 
  ShareIcon,
  StarIcon,
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import { 
  getProductCompleteData, 
  CompleteProduct, 
  ProductColor, 
  ProductSize,
  getProductMainPrice,
  getProductMaxPrice,
  getTotalStock,
  getDefaultColor,
  getDefaultSize,
  getVariantPrice,
  getVariantStock,
  getFinalPrice,
  isProductAvailable
} from '@/lib/api/productComplete';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// مكونات فرعية للصفحة (نفس المكونات من الصفحة الأصلية)
interface ProductImageGalleryProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ product, selectedColor }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const images = useMemo(() => {
    const imageList: string[] = [];
    
    if (product.images.thumbnail_image) {
      imageList.push(product.images.thumbnail_image);
    }
    
    if (selectedColor?.image_url && !imageList.includes(selectedColor.image_url)) {
      imageList.unshift(selectedColor.image_url);
    }
    
    product.images.additional_images.forEach(img => {
      if (!imageList.includes(img.url)) {
        imageList.push(img.url);
      }
    });

    return imageList.length > 0 ? imageList : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  useEffect(() => {
    if (selectedColor?.image_url) {
      const colorImageIndex = images.findIndex(img => img === selectedColor.image_url);
      if (colorImageIndex !== -1) {
        setSelectedImageIndex(colorImageIndex);
      }
    }
  }, [selectedColor, images]);

  return (
    <div className="w-full">
      <motion.div 
        className="relative aspect-square mb-4 overflow-hidden rounded-xl bg-gray-100"
        layout
      >
        <motion.img
          key={images[selectedImageIndex]}
          src={images[selectedImageIndex]}
          alt={product.name}
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = '/images/placeholder-product.jpg';
          }}
        />
        
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === 0 ? images.length - 1 : prev - 1
              )}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === images.length - 1 ? 0 : prev + 1
              )}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
            >
              →
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setSelectedImageIndex(index)}
                className={`w-2 h-2 rounded-full transition-all ${
                  index === selectedImageIndex ? 'bg-white' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}
      </motion.div>

      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 4).map((image, index) => (
            <motion.button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`aspect-square overflow-hidden rounded-lg border-2 transition-all ${
                index === selectedImageIndex 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src={image}
                alt={`${product.name} - ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/images/placeholder-product.jpg';
                }}
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

// مكون اختيار اللون
interface ColorSelectorProps {
  colors: ProductColor[];
  selectedColor?: ProductColor;
  onColorSelect: (color: ProductColor) => void;
}

const ColorSelector: React.FC<ColorSelectorProps> = ({ colors, selectedColor, onColorSelect }) => {
  if (!colors.length) return null;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        اللون: {selectedColor?.name && (
          <span className="text-gray-600">{selectedColor.name}</span>
        )}
      </Label>
      
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <motion.button
            key={color.id}
            onClick={() => onColorSelect(color)}
            className={`relative flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all ${
              selectedColor?.id === color.id 
                ? 'border-blue-500 ring-2 ring-blue-200' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            title={color.name}
          >
            {color.color_code ? (
              <div 
                className="w-8 h-8 rounded-full border border-gray-200"
                style={{ backgroundColor: color.color_code }}
              />
            ) : (
              <span className="text-xs text-center px-1">
                {color.name.slice(0, 3)}
              </span>
            )}
            
            {selectedColor?.id === color.id && (
              <motion.div 
                className="absolute inset-0 rounded-full border-2 border-blue-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// مكون اختيار المقاس
interface SizeSelectorProps {
  sizes: ProductSize[];
  selectedSize?: ProductSize;
  onSizeSelect: (size: ProductSize) => void;
}

const SizeSelector: React.FC<SizeSelectorProps> = ({ sizes, selectedSize, onSizeSelect }) => {
  if (!sizes.length) return null;

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">المقاس</Label>
      
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <motion.button
            key={size.id}
            onClick={() => onSizeSelect(size)}
            className={`px-4 py-2 border rounded-lg transition-all ${
              selectedSize?.id === size.id 
                ? 'border-blue-500 bg-blue-50 text-blue-700' 
                : 'border-gray-300 hover:border-gray-400 bg-white'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {size.size_name}
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// مكون اختيار الكمية
interface QuantitySelectorProps {
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  maxQuantity: number;
  disabled?: boolean;
}

const QuantitySelector: React.FC<QuantitySelectorProps> = ({ 
  quantity, 
  onQuantityChange, 
  maxQuantity, 
  disabled = false 
}) => {
  
  const handleDecrease = () => {
    if (quantity > 1) {
      onQuantityChange(quantity - 1);
    }
  };

  const handleIncrease = () => {
    if (quantity < maxQuantity) {
      onQuantityChange(quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const validValue = Math.min(Math.max(value, 1), maxQuantity);
    onQuantityChange(validValue);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">الكمية</Label>
      
      <div className="flex items-center space-x-2 space-x-reverse">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={disabled || quantity <= 1}
          className="w-8 h-8 p-0"
        >
          -
        </Button>
        
        <Input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          disabled={disabled}
          min={1}
          max={maxQuantity}
          className="w-16 text-center"
        />
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={disabled || quantity >= maxQuantity}
          className="w-8 h-8 p-0"
        >
          +
        </Button>
        
        <span className="text-sm text-gray-500 mr-2">
          متوفر: {maxQuantity}
        </span>
      </div>
    </div>
  );
};

// مكون عرض الأسعار
interface PriceDisplayProps {
  product: CompleteProduct;
  quantity: number;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ 
  product, 
  quantity, 
  selectedColor, 
  selectedSize 
}) => {
  const priceInfo = useMemo(() => {
    return getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
  }, [product, quantity, selectedColor, selectedSize]);

  const totalPrice = priceInfo.price * quantity;

  return (
    <div className="space-y-2">
      <div className="flex items-baseline space-x-2 space-x-reverse">
        <span className="text-3xl font-bold text-green-600">
          {priceInfo.price.toLocaleString()} دج
        </span>
        
        {priceInfo.originalPrice > priceInfo.price && (
          <span className="text-lg text-gray-500 line-through">
            {priceInfo.originalPrice.toLocaleString()} دج
          </span>
        )}
        
        {priceInfo.isWholesale && (
          <Badge variant="secondary" className="text-xs">
            سعر الجملة
          </Badge>
        )}
      </div>
      
      {quantity > 1 && (
        <div className="text-sm text-gray-600">
          المجموع: <span className="font-semibold text-lg text-green-600">
            {totalPrice.toLocaleString()} دج
          </span>
        </div>
      )}
    </div>
  );
};

// الصفحة الرئيسية العامة
const ProductPurchasePageMaxPublic: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  
  // الحالة
  const [product, setProduct] = useState<CompleteProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // اختيارات المستخدم
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>();
  const [quantity, setQuantity] = useState(1);
  
  // حالة العمليات
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);
  const [isInWishlist, setIsInWishlist] = useState(false);

  // جلب بيانات المنتج
  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('معرف المنتج غير صحيح');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // جلب المنتج بدون تحديد منظمة (سيتم استخراجها من المنتج)
        const response = await getProductCompleteData(productId, {
          organizationId: undefined, // لا نحدد منظمة
          dataScope: 'ultra'
        });

        if (!response || !response.success) {
          throw new Error('فشل في جلب بيانات المنتج');
        }

        const productData = response.product;
        setProduct(productData);

        // تعيين الاختيارات الافتراضية
        if (productData.variants.has_variants) {
          const defaultColor = getDefaultColor(productData);
          setSelectedColor(defaultColor || undefined);
          
          if (defaultColor && defaultColor.has_sizes) {
            const defaultSize = getDefaultSize(defaultColor);
            setSelectedSize(defaultSize || undefined);
          }
        }

        setQuantity(1);

      } catch (err) {
        console.error('خطأ في جلب المنتج:', err);
        setError('فشل في تحميل بيانات المنتج');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  // تحديث المقاس عند تغيير اللون
  useEffect(() => {
    if (selectedColor && selectedColor.has_sizes) {
      const defaultSize = getDefaultSize(selectedColor);
      setSelectedSize(defaultSize || undefined);
    } else {
      setSelectedSize(undefined);
    }
  }, [selectedColor]);

  // حساب المخزون المتاح
  const availableStock = useMemo(() => {
    if (!product) return 0;
    return getVariantStock(product, selectedColor?.id, selectedSize?.id);
  }, [product, selectedColor, selectedSize]);

  // تحديد إمكانية الشراء
  const canPurchase = useMemo(() => {
    if (!product) return false;
    if (!isProductAvailable(product)) return false;
    if (availableStock <= 0) return false;
    if (quantity <= 0 || quantity > availableStock) return false;
    if (product.variants.has_variants && !selectedColor) return false;
    if (selectedColor?.has_sizes && !selectedSize) return false;
    return true;
  }, [product, availableStock, quantity, selectedColor, selectedSize]);

  // معالجة إضافة إلى السلة
  const handleAddToCart = async () => {
    if (!canPurchase) return;
    
    try {
      setAddingToCart(true);
      
      // هنا يمكن إضافة منطق إضافة إلى السلة
      // بدون تسجيل دخول (مثل localStorage أو session)
      toast.success('تم إضافة المنتج إلى السلة!');
      
    } catch (error) {
      console.error('خطأ في إضافة المنتج إلى السلة:', error);
      toast.error('فشل في إضافة المنتج إلى السلة');
    } finally {
      setAddingToCart(false);
    }
  };

  // معالجة الشراء المباشر
  const handleBuyNow = async () => {
    if (!canPurchase) return;
    
    try {
      setBuyingNow(true);
      
      // هنا يمكن توجيه إلى صفحة الشراء مباشرة
      // مع تمرير بيانات المنتج والاختيارات
      toast.success('سيتم توجيهك لإتمام الشراء...');
      
      // مثال: توجيه إلى صفحة الدفع
      // navigate('/checkout', { 
      //   state: { 
      //     products: [{ 
      //       product, 
      //       selectedColor, 
      //       selectedSize, 
      //       quantity 
      //     }] 
      //   } 
      // });
      
    } catch (error) {
      console.error('خطأ في بدء عملية الشراء:', error);
      toast.error('فشل في بدء عملية الشراء');
    } finally {
      setBuyingNow(false);
    }
  };

  // معالجة المشاركة
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: `تسوق ${product?.name} بأفضل الأسعار`,
          url: window.location.href,
        });
      } else {
        // نسخ الرابط إلى الحافظة
        await navigator.clipboard.writeText(window.location.href);
        toast.success('تم نسخ رابط المنتج!');
      }
    } catch (error) {
      console.error('خطأ في المشاركة:', error);
      toast.error('فشل في مشاركة المنتج');
    }
  };

  // معالجة قائمة الأماني
  const handleWishlistToggle = async () => {
    // يمكن تنفيذ هذا باستخدام localStorage أو session
    setIsInWishlist(!isInWishlist);
    toast.success(
      isInWishlist ? 'تم إزالة المنتج من المفضلة' : 'تم إضافة المنتج إلى المفضلة'
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              <Skeleton className="w-full aspect-square rounded-xl" />
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>
            <div className="space-y-6">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              خطأ في تحميل المنتج
            </h3>
            <p className="text-gray-600 mb-4">
              {error || 'المنتج غير موجود أو غير متاح'}
            </p>
            <Button onClick={() => window.location.reload()}>
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط العلوي البسيط */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">
              متجر إلكتروني
            </h1>
            <div className="flex items-center space-x-4 space-x-reverse">
              <Button variant="outline" size="sm">
                سلة التسوق (0)
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* محتوى الصفحة */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* معرض الصور */}
          <div>
            <ProductImageGallery product={product} selectedColor={selectedColor} />
          </div>

          {/* تفاصيل المنتج */}
          <div className="space-y-6">
            {/* العنوان والسعر */}
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {product.name}
              </h1>
              
              {product.description && (
                <p className="text-gray-600 mb-4">
                  {product.description}
                </p>
              )}
              
              <PriceDisplay 
                product={product}
                quantity={quantity}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
              />
            </div>

            <Separator />

            {/* اختيار اللون */}
            {product.variants.has_variants && (
              <ColorSelector
                colors={product.variants.colors}
                selectedColor={selectedColor}
                onColorSelect={setSelectedColor}
              />
            )}

            {/* اختيار المقاس */}
            {selectedColor?.has_sizes && (
              <SizeSelector
                sizes={selectedColor.sizes || []}
                selectedSize={selectedSize}
                onSizeSelect={setSelectedSize}
              />
            )}

            {/* اختيار الكمية */}
            <QuantitySelector
              quantity={quantity}
              onQuantityChange={setQuantity}
              maxQuantity={availableStock}
              disabled={!canPurchase}
            />

            <Separator />

            {/* أزرار الإجراءات */}
            <div className="space-y-3">
              <Button
                onClick={handleBuyNow}
                disabled={!canPurchase || buyingNow}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {buyingNow ? 'جاري المعالجة...' : 'اشتري الآن'}
              </Button>
              
              <Button
                onClick={handleAddToCart}
                disabled={!canPurchase || addingToCart}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <ShoppingCartIcon className="w-5 h-5 ml-2" />
                {addingToCart ? 'جاري الإضافة...' : 'أضف إلى السلة'}
              </Button>
              
              <div className="flex space-x-2 space-x-reverse">
                <Button
                  onClick={handleWishlistToggle}
                  variant="outline"
                  className="flex-1"
                >
                  {isInWishlist ? (
                    <HeartSolidIcon className="w-5 h-5 ml-2 text-red-500" />
                  ) : (
                    <HeartIcon className="w-5 h-5 ml-2" />
                  )}
                  المفضلة
                </Button>
                
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="flex-1"
                >
                  <ShareIcon className="w-5 h-5 ml-2" />
                  مشاركة
                </Button>
              </div>
            </div>

            {/* معلومات إضافية */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t">
              {product.features_and_specs.has_fast_shipping && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                  <TruckIcon className="w-4 h-4 text-blue-500" />
                  <span>شحن سريع</span>
                </div>
              )}
              
              {product.features_and_specs.has_money_back && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                  <ShieldCheckIcon className="w-4 h-4 text-green-500" />
                  <span>ضمان الاسترداد</span>
                </div>
              )}
              
              {product.features_and_specs.has_quality_guarantee && (
                <div className="flex items-center space-x-2 space-x-reverse text-sm text-gray-600">
                  <CheckCircleIcon className="w-4 h-4 text-purple-500" />
                  <span>ضمان الجودة</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPurchasePageMaxPublic; 