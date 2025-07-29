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
  SpecialOffer,
  getProductMainPrice,
  getProductMaxPrice,
  getTotalStock,
  getDefaultColor,
  getDefaultSize,
  getVariantPrice,
  getVariantStock,
  getFinalPrice,
  isProductAvailable,
  getBestSpecialOffer,
  getSpecialOfferSummary
} from '@/lib/api/productComplete';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import SpecialOffersDisplay from '@/components/store/special-offers/SpecialOffersDisplay';

// مكونات فرعية للصفحة
interface ProductImageGalleryProps {
  product: CompleteProduct;
  selectedColor?: ProductColor;
}

const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({ product, selectedColor }) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  // إنشاء قائمة الصور
  const images = useMemo(() => {
    const imageList: string[] = [];
    
    // الصورة الرئيسية
    if (product.images.thumbnail_image) {
      imageList.push(product.images.thumbnail_image);
    }
    
    // صورة اللون المحدد
    if (selectedColor?.image_url && !imageList.includes(selectedColor.image_url)) {
      imageList.unshift(selectedColor.image_url); // ضعها في المقدمة
    }
    
    // الصور الإضافية
    product.images.additional_images.forEach(img => {
      if (!imageList.includes(img.url)) {
        imageList.push(img.url);
      }
    });

    return imageList.length > 0 ? imageList : ['/images/placeholder-product.jpg'];
  }, [product, selectedColor]);

  useEffect(() => {
    // إعادة تعيين الصورة المحددة عند تغيير اللون
    if (selectedColor?.image_url) {
      const colorImageIndex = images.findIndex(img => img === selectedColor.image_url);
      if (colorImageIndex !== -1) {
        setSelectedImageIndex(colorImageIndex);
      }
    }
  }, [selectedColor, images]);

  return (
    <div className="w-full">
      {/* الصورة الرئيسية */}
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
        
        {/* أزرار التنقل */}
        {images.length > 1 && (
          <>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === 0 ? images.length - 1 : prev - 1
              )}
              className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              aria-label="الصورة السابقة"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedImageIndex(prev => 
                prev === images.length - 1 ? 0 : prev + 1
              )}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/80 hover:bg-white rounded-full p-2 shadow-lg transition-all"
              aria-label="الصورة التالية"
            >
              →
            </button>
          </>
        )}

        {/* المؤشرات */}
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

      {/* الصور المصغرة */}
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
                className="w-8 h-8 rounded-full"
                style={{ backgroundColor: color.color_code }}
              />
            ) : color.image_url ? (
              <img
                src={color.image_url}
                alt={color.name}
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs">
                {color.name.charAt(0)}
              </div>
            )}
            
            {selectedColor?.id === color.id && (
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-blue-500"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
            
            {/* مؤشر نفاد المخزون */}
            {color.quantity <= 0 && (
              <div className="absolute inset-0 bg-gray-500/50 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">×</span>
              </div>
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
      <Label className="text-sm font-medium">
        المقاس: {selectedSize?.size_name && (
          <span className="text-gray-600">{selectedSize.size_name}</span>
        )}
      </Label>
      
      <div className="flex flex-wrap gap-2">
        {sizes.map((size) => (
          <motion.button
            key={size.id}
            onClick={() => onSizeSelect(size)}
            disabled={size.quantity <= 0}
            className={`px-4 py-2 text-sm font-medium rounded-lg border transition-all ${
              selectedSize?.id === size.id
                ? 'bg-blue-500 text-white border-blue-500'
                : size.quantity <= 0
                ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                : 'bg-white text-gray-900 border-gray-300 hover:border-gray-400 hover:bg-gray-50'
            }`}
            whileHover={{ scale: size.quantity > 0 ? 1.05 : 1 }}
            whileTap={{ scale: size.quantity > 0 ? 0.95 : 1 }}
          >
            {size.size_name}
            {size.quantity <= 0 && (
              <span className="ml-1 text-xs">(نفد)</span>
            )}
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
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1 && value <= maxQuantity) {
      onQuantityChange(value);
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">الكمية</Label>
      <div className="flex items-center space-x-3 rtl:space-x-reverse">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={disabled || quantity <= 1}
          className="w-10 h-10 p-0"
        >
          -
        </Button>
        
        <Input
          type="number"
          value={quantity}
          onChange={handleInputChange}
          min={1}
          max={maxQuantity}
          disabled={disabled}
          className="w-20 text-center"
        />
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          disabled={disabled || quantity >= maxQuantity}
          className="w-10 h-10 p-0"
        >
          +
        </Button>
      </div>
      
      {maxQuantity <= 10 && (
        <p className="text-xs text-amber-600">
          متوفر {maxQuantity} قطع فقط
        </p>
      )}
    </div>
  );
};

// مكون معلومات السعر
interface PriceDisplayProps {
  product: CompleteProduct;
  quantity: number;
  selectedColor?: ProductColor;
  selectedSize?: ProductSize;
  selectedOffer?: SpecialOffer | null;
}

const PriceDisplay: React.FC<PriceDisplayProps> = ({ 
  product, 
  quantity, 
  selectedColor, 
  selectedSize,
  selectedOffer 
}) => {
  // حساب السعر مع العروض الخاصة
  const offerSummary = getSpecialOfferSummary(product, selectedOffer, quantity);
  const priceInfo = getFinalPrice(product, quantity, selectedColor?.id, selectedSize?.id);
  
  // إذا كان هناك عرض خاص، استخدم أسعاره
  const finalPrice = offerSummary.offerApplied ? offerSummary.finalPrice : priceInfo.price;
  const finalQuantity = offerSummary.offerApplied ? offerSummary.finalQuantity : quantity;
  const savings = offerSummary.savings;

  return (
    <div className="space-y-3">
      {/* السعر النهائي */}
      <div className="space-y-1">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-2xl font-bold text-gray-900">
            {finalPrice.toLocaleString()} دج
          </span>
          
          {priceInfo.isWholesale && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              سعر الجملة
            </Badge>
          )}
          
          {offerSummary.offerApplied && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              عرض خاص
            </Badge>
          )}
        </div>
        
        {/* عرض السعر الأصلي إذا كان هناك توفير */}
        {savings > 0 && (
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
            <span className="line-through text-gray-500">
              {offerSummary.originalPrice.toLocaleString()} دج
            </span>
            <Badge variant="destructive">
              وفر {savings.toLocaleString()} دج
            </Badge>
          </div>
        )}
      </div>

      {/* عرض تفاصيل العرض الخاص */}
      {offerSummary.offerApplied && offerSummary.offerDetails && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm">
            <span className="text-blue-800 font-medium">
              {offerSummary.offerDetails.name}
            </span>
          </div>
          
          {finalQuantity > quantity && (
            <div className="text-xs text-blue-700 mt-1">
              ستحصل على {finalQuantity} قطعة (بدلاً من {quantity})
            </div>
          )}
          
          {offerSummary.offerDetails.freeShipping && (
            <div className="text-xs text-green-700 mt-1 flex items-center">
              <TruckIcon className="w-3 h-3 ml-1" />
              شحن مجاني
            </div>
          )}
        </div>
      )}

      {/* معلومات مستوى الجملة */}
      {priceInfo.wholesaleTier && !offerSummary.offerApplied && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse text-sm text-green-800">
            <CheckCircleIcon className="w-4 h-4" />
            <span>
              سعر الجملة - الحد الأدنى {priceInfo.wholesaleTier.min_quantity} قطع
            </span>
          </div>
        </div>
      )}

      {/* عرض مستويات الجملة المتاحة */}
      {product.wholesale_tiers.length > 0 && !priceInfo.isWholesale && !offerSummary.offerApplied && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900 mb-2">أسعار الجملة:</h4>
          <div className="space-y-1">
            {product.wholesale_tiers.map((tier) => (
              <div key={tier.id} className="flex justify-between text-xs text-blue-800">
                <span>{tier.min_quantity}+ قطع</span>
                <span>{tier.price.toLocaleString()} دج للقطعة</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// المكون الرئيسي
const ProductPurchasePageMax: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, organization } = useAuth();

  // الحالة الأساسية
  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<CompleteProduct | null>(null);
  const [error, setError] = useState<string | null>(null);

  // حالة الاختيارات
  const [selectedColor, setSelectedColor] = useState<ProductColor | undefined>();
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>();
  const [quantity, setQuantity] = useState(1);
  const [isInWishlist, setIsInWishlist] = useState(false);
  
  // حالة العروض الخاصة
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);

  // حالة العمليات
  const [addingToCart, setAddingToCart] = useState(false);
  const [buyingNow, setBuyingNow] = useState(false);

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
        
        console.log('🔄 ProductPurchasePageMax: بدء جلب بيانات المنتج', {
          productId,
          organizationId: organization?.id
        });

        const response = await getProductCompleteData(productId, {
          organizationId: organization?.id,
          dataScope: 'ultra' // جلب جميع البيانات بما في ذلك العروض الخاصة
        });

        if (!response) {
          console.error('❌ ProductPurchasePageMax: لم يتم إرجاع استجابة من الخادم');
          throw new Error('فشل في الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
        }

        if (!response.success) {
          console.error('❌ ProductPurchasePageMax: فشل في جلب البيانات', {
            error: response.error,
            productId,
            organizationId: organization?.id
          });
          
          // معالجة أخطاء محددة
          if (response.error?.code === 'PRODUCT_NOT_FOUND') {
            throw new Error('المنتج غير موجود أو غير متاح حالياً');
          } else if (response.error?.code === 'MISSING_ORGANIZATION_ID') {
            throw new Error('خطأ في تحديد المتجر. يرجى المحاولة مرة أخرى.');
          } else {
            throw new Error(response.error?.message || 'فشل في تحميل بيانات المنتج');
          }
        }

        const productData = response.product;
        
        if (!productData) {
          console.error('❌ ProductPurchasePageMax: بيانات المنتج فارغة');
          throw new Error('بيانات المنتج غير صحيحة');
        }

        console.log('✅ ProductPurchasePageMax: تم جلب بيانات المنتج بنجاح', {
          productId: productData.id,
          productName: productData.name,
          hasVariants: productData.variants?.has_variants
        });

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

      } catch (err) {
        console.error('❌ ProductPurchasePageMax: خطأ في جلب المنتج', err);
        const errorMessage = err instanceof Error ? err.message : 'فشل في تحميل بيانات المنتج';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId, organization?.id]);

  // تحديث المقاس عند تغيير اللون
  useEffect(() => {
    if (selectedColor && selectedColor.has_sizes) {
      const defaultSize = getDefaultSize(selectedColor);
      setSelectedSize(defaultSize || undefined);
    } else {
      setSelectedSize(undefined);
    }
  }, [selectedColor]);

  // اختيار أفضل عرض تلقائياً عند تغيير الكمية
  useEffect(() => {
    if (product && product.special_offers_config?.enabled) {
      const bestOffer = getBestSpecialOffer(product, quantity);
      setSelectedOffer(bestOffer);
    }
  }, [product, quantity]);

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
    if (product.variants.has_variants && !selectedColor) return false;
    if (selectedColor?.has_sizes && !selectedSize) return false;
    return true;
  }, [product, availableStock, selectedColor, selectedSize]);

  // معالجة إضافة إلى السلة
  const handleAddToCart = async () => {
    if (!canPurchase || !product) return;

    try {
      setAddingToCart(true);
      
      // حساب السعر النهائي مع العروض الخاصة
      const offerSummary = getSpecialOfferSummary(product, selectedOffer, quantity);
      
      // هنا يمكن إضافة منطق إضافة المنتج إلى السلة
      // await addToCart({ 
      //   productId: product.id,
      //   quantity: offerSummary.finalQuantity,
      //   price: offerSummary.finalPrice,
      //   selectedColor,
      //   selectedSize,
      //   specialOffer: selectedOffer
      // });
      
      const message = selectedOffer 
        ? `تم إضافة ${offerSummary.finalQuantity} قطعة إلى السلة (${selectedOffer.name})`
        : 'تم إضافة المنتج إلى السلة';
      
      toast.success(message);
    } catch (error) {
      toast.error('فشل في إضافة المنتج إلى السلة');
    } finally {
      setAddingToCart(false);
    }
  };

  // معالجة الشراء المباشر
  const handleBuyNow = async () => {
    if (!canPurchase || !product) return;

    try {
      setBuyingNow(true);
      
      // حساب السعر النهائي مع العروض الخاصة
      const offerSummary = getSpecialOfferSummary(product, selectedOffer, quantity);
      
      // هنا يمكن إضافة منطق الشراء المباشر
      // await proceedToCheckout({ ... });
      
      navigate('/checkout', {
        state: {
          product,
          selectedColor,
          selectedSize,
          quantity: offerSummary.finalQuantity,
          originalQuantity: quantity,
          specialOffer: selectedOffer,
          priceDetails: offerSummary
        }
      });
    } catch (error) {
      toast.error('فشل في عملية الشراء');
    } finally {
      setBuyingNow(false);
    }
  };

  // معالجة إضافة/إزالة من المفضلة
  const handleWishlistToggle = async () => {
    try {
      // هنا يمكن إضافة منطق المفضلة
      setIsInWishlist(!isInWishlist);
      toast.success(isInWishlist ? 'تم إزالة المنتج من المفضلة' : 'تم إضافة المنتج إلى المفضلة');
    } catch (error) {
      toast.error('فشل في تحديث المفضلة');
    }
  };

  // معالجة المشاركة
  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: product?.name,
          text: product?.description,
          url: window.location.href
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('تم نسخ الرابط');
      }
    } catch (error) {
      toast.error('فشل في المشاركة');
    }
  };

  // حالة التحميل
  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <Skeleton className="aspect-square w-full" />
            <div className="grid grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="aspect-square" />
              ))}
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-12 w-1/2" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // حالة الخطأ
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="text-center py-12">
          <CardContent>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'المنتج غير موجود'}
            </h2>
            <p className="text-gray-600 mb-4">
              عذراً، لم نتمكن من العثور على هذا المنتج
            </p>
            <Button onClick={() => navigate('/products')}>
              تصفح المنتجات
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* قسم الصور */}
          <div className="lg:sticky lg:top-8">
            <ProductImageGallery 
              product={product} 
              selectedColor={selectedColor}
            />
          </div>

          {/* قسم المعلومات والشراء */}
          <div className="space-y-6">
            {/* العنوان والمعلومات الأساسية */}
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                    {product.name}
                  </h1>
                  
                  {product.brand && (
                    <p className="text-sm text-gray-600 mb-2">
                      العلامة التجارية: <span className="font-medium">{product.brand}</span>
                    </p>
                  )}
                  
                  {product.sku && (
                    <p className="text-xs text-gray-500">
                      رمز المنتج: {product.sku}
                    </p>
                  )}
                </div>

                {/* أزرار الإجراءات */}
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleWishlistToggle}
                    className="p-2"
                  >
                    {isInWishlist ? (
                      <HeartSolidIcon className="w-5 h-5 text-red-500" />
                    ) : (
                      <HeartIcon className="w-5 h-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="p-2"
                  >
                    <ShareIcon className="w-5 h-5" />
                  </Button>
                </div>
              </div>

              {/* الشارات والميزات */}
              <div className="flex flex-wrap gap-2">
                {product.status.is_new && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    جديد
                  </Badge>
                )}
                {product.status.is_featured && (
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    مميز
                  </Badge>
                )}
                {product.features_and_specs.has_fast_shipping && (
                  <Badge variant="secondary" className="bg-green-100 text-green-800 flex items-center gap-1">
                    <TruckIcon className="w-3 h-3" />
                    شحن سريع
                  </Badge>
                )}
                {product.features_and_specs.has_money_back && (
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 flex items-center gap-1">
                    <ShieldCheckIcon className="w-3 h-3" />
                    ضمان الاسترداد
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* عرض السعر */}
            <PriceDisplay
              product={product}
              quantity={quantity}
              selectedColor={selectedColor}
              selectedSize={selectedSize}
              selectedOffer={selectedOffer}
            />

            <Separator />

            {/* اختيار المتغيرات */}
            <div className="space-y-6">
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
                  sizes={selectedColor.sizes}
                  selectedSize={selectedSize}
                  onSizeSelect={setSelectedSize}
                />
              )}

              {/* اختيار الكمية */}
              <QuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={Math.min(availableStock, 100)}
                disabled={!canPurchase}
              />
            </div>

            {/* العروض الخاصة */}
            {(() => {
              // فحص مؤقت للتشخيص
              
              return product.special_offers_config?.enabled && product.special_offers_config.offers?.length > 0;
            })() && (
              <>
                <Separator />
                <SpecialOffersDisplay
                  config={product.special_offers_config}
                  basePrice={getVariantPrice(product, selectedColor?.id, selectedSize?.id)}
                  onSelectOffer={setSelectedOffer}
                  selectedOfferId={selectedOffer?.id}
                />
              </>
            )}

            <Separator />

            {/* أزرار الشراء */}
            <div className="space-y-3">
              <Button
                onClick={handleBuyNow}
                disabled={!canPurchase || buyingNow}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                {buyingNow ? 'جاري المعالجة...' : 'اشتري الآن'}
              </Button>
              
              <Button
                variant="outline"
                onClick={handleAddToCart}
                disabled={!canPurchase || addingToCart}
                className="w-full h-12 text-lg font-semibold"
                size="lg"
              >
                <ShoppingCartIcon className="w-5 h-5 ml-2" />
                {addingToCart ? 'جاري الإضافة...' : 'أضف إلى السلة'}
              </Button>

              {!canPurchase && (
                <div className="text-center text-sm text-red-600">
                  {!isProductAvailable(product) 
                    ? 'هذا المنتج غير متاح حالياً'
                    : availableStock <= 0
                    ? 'المنتج نفد من المخزون'
                    : 'يرجى اختيار جميع المتغيرات المطلوبة'
                  }
                </div>
              )}
            </div>

            <Separator />

            {/* الوصف */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900">الوصف</h3>
              <div className="prose prose-sm max-w-none text-gray-600">
                <p>{product.description}</p>
              </div>
            </div>

            {/* الميزات */}
            {product.features_and_specs.features.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">الميزات</h3>
                <ul className="space-y-1">
                  {product.features_and_specs.features.map((feature, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircleIcon className="w-4 h-4 text-green-500 ml-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* معلومات الشحن */}
            {product.shipping_and_templates.shipping_info && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <TruckIcon className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-blue-900">معلومات الشحن</h4>
                </div>
                <p className="text-sm text-blue-800 mt-1">
                  {product.shipping_and_templates.shipping_info.name}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPurchasePageMax;
