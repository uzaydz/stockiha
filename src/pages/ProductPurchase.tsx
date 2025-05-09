import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Check, ChevronRight, ChevronLeft, Star, ArrowRight, Tag, Box, Truck, ShoppingCart, RefreshCw, Shield } from 'lucide-react';
import type { Product as ApiProduct, ProductColor } from '@/api/store';
import type { ProductSize } from '@/types/product';
import { getProductImages, getProductColors } from '@/lib/api/productVariants';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProductColorSelector from '../components/store/ProductColorSelector';
import ProductSizeSelector from '../components/store/ProductSizeSelector';
import OrderForm from '../components/store/OrderForm';
import { useTenant } from '@/context/TenantContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import Navbar from '@/components/Navbar';
import StoreFooter from '@/components/store/StoreFooter';
import { getProductBySlug } from '@/api/store';
import { supabase } from '@/lib/supabase';
import { getFormSettingsForProduct } from '@/api/form-settings';
import { FormField } from '@/api/form-settings';

// توسعة واجهة المنتج لتتضمن الميزات الجديدة
interface Product extends ApiProduct {
  has_fast_shipping?: boolean;
  has_money_back?: boolean;
  has_quality_guarantee?: boolean;
  fast_shipping_text?: string;
  money_back_text?: string;
  quality_guarantee_text?: string;
}

const ProductFeatureCard = ({ icon, text }: { icon: React.ReactNode; text: string }) => (
  <div className="flex items-start space-x-3 space-x-reverse border rounded-lg p-3 bg-primary/5">
    <div className="text-primary shrink-0 mt-0.5">{icon}</div>
    <div className="text-sm font-medium">{text}</div>
  </div>
);

const ProductPurchase = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentOrganization } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [customFormFields, setCustomFormFields] = useState<FormField[]>([]);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        const productData = await getProductBySlug(currentOrganization.id, slug);
        if (!productData) {
          setError('المنتج غير موجود');
          return;
        }
        
        setProduct(productData as Product);
        setActiveImage(productData.imageUrl);
        
        // If the product has colors, set the default one
        if (productData.colors && productData.colors.length > 0) {
          const defaultColor = productData.colors.find(c => c.is_default) || productData.colors[0];
          setSelectedColor(defaultColor);
          
          // إذا كان المنتج يستخدم المقاسات، قم بتحميل المقاسات للون الافتراضي
          if (productData.use_sizes && defaultColor) {
            loadSizesForColor(defaultColor.id, productData.id);
          }
        }

        // تحميل إعدادات النموذج المخصصة للمنتج
        try {
          console.log('جاري تحميل إعدادات النموذج للمنتج:', productData.id);
          const formFields = await getFormSettingsForProduct(currentOrganization.id, productData.id);
          if (formFields && Array.isArray(formFields) && formFields.length > 0) {
            console.log('تم تحميل حقول النموذج المخصصة للمنتج:', formFields);
            setCustomFormFields(formFields);
          } else {
            console.log('لا توجد حقول مخصصة للمنتج، استخدام الحقول الافتراضية');
            setCustomFormFields([]);
          }
        } catch (formError) {
          console.error('Error loading form settings:', formError);
          // لا ترمي خطأ فقط سجل في السجل واستمر بالحقول الافتراضية
          setCustomFormFields([]);
        }
      } catch (error) {
        console.error('Error loading product:', error);
        setError('حدث خطأ أثناء تحميل المنتج');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug && currentOrganization?.id) {
      loadProduct();
    }
  }, [slug, currentOrganization]);

  // دالة جديدة لتحميل المقاسات الخاصة بلون معين
  const loadSizesForColor = async (colorId: string, productId: string) => {
    try {
      setLoadingSizes(true);
      setSizes([]);
      setSelectedSize(null);
      
      const { data, error } = await supabase
        .from('product_sizes')
        .select('*')
        .eq('color_id', colorId)
        .eq('product_id', productId);
      
      if (error) {
        console.error('Error loading sizes:', error);
        return;
      }
      
      if (data && data.length > 0) {
        const sizesData = data.map(size => ({
          id: size.id,
          color_id: size.color_id,
          product_id: size.product_id,
          size_name: size.size_name,
          quantity: size.quantity,
          price: size.price ? parseFloat(size.price) : undefined,
          barcode: size.barcode,
          is_default: size.is_default
        }));
        
        setSizes(sizesData);
        
        // تعيين المقاس الافتراضي
        const defaultSize = sizesData.find(s => s.is_default) || sizesData[0];
        setSelectedSize(defaultSize);
      }
    } catch (err) {
      console.error('Error in loadSizesForColor:', err);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
    // Reset selected size when color changes
    setSelectedSize(null);
    
    // If color has its own image, set it as active
    if (color.image_url) {
      setActiveImage(color.image_url);
    }
    
    // إذا كان المنتج يستخدم المقاسات، قم بتحميل المقاسات للون المحدد
    if (product?.use_sizes) {
      loadSizesForColor(color.id, product.id);
    }
  };

  // دالة جديدة للتعامل مع اختيار المقاس
  const handleSizeSelect = (size: ProductSize) => {
    setSelectedSize(size);
    
    // تحديث الكمية المتاحة بناءً على المقاس المحدد
    setQuantity(1);
  };

  const handleQuantityChange = (newQuantity: number) => {
    // إذا كان هناك مقاس محدد، استخدم كمية المقاس، وإلا استخدم كمية اللون أو المنتج
    const max = selectedSize ? selectedSize.quantity : (selectedColor ? selectedColor.quantity : (product?.stock_quantity || 1));
    if (newQuantity > 0 && newQuantity <= max) {
      setQuantity(newQuantity);
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;
    
    // إذا كان هناك مقاس محدد وله سعر خاص، استخدمه
    if (selectedSize && selectedSize.price !== undefined) {
      return selectedSize.price;
    }
    
    // If color has specific price, use it
    if (selectedColor && selectedColor.price !== undefined) {
      return selectedColor.price;
    }
    
    // Otherwise use product price
    return product.discount_price || product.price;
  };

  const calculateTotal = () => {
    return calculatePrice() * quantity;
  };

  // دالة للحصول على الكمية المتاحة
  const getAvailableQuantity = () => {
    if (selectedSize) {
      return selectedSize.quantity;
    }
    
    if (selectedColor) {
      return selectedColor.quantity;
    }
    
    return product?.stock_quantity || 0;
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse">جاري تحميل المنتج...</p>
        </div>
        <StoreFooter />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto p-8 bg-red-50 dark:bg-red-900/20 rounded-lg shadow-lg"
          >
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">عذراً!</h2>
            <p className="text-lg text-red-700 dark:text-red-300 mb-6">{error || 'المنتج غير موجود'}</p>
            <Button 
              variant="outline" 
              className="transition-all duration-300 hover:bg-red-100 dark:hover:bg-red-800/20"
              onClick={() => navigate(-1)}
            >
              <ArrowRight className="ml-2 h-4 w-4" />
              العودة للمتجر
            </Button>
          </motion.div>
        </div>
        <StoreFooter />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 flex-grow">
        {/* شريط التنقل */}
        <div className="flex items-center text-sm text-muted-foreground mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-auto hover:bg-transparent hover:text-primary"
            onClick={() => navigate('/')}
          >
            الرئيسية
          </Button>
          <ChevronLeft className="mx-2 h-4 w-4" />
          <Button 
            variant="ghost" 
            size="sm" 
            className="p-0 h-auto hover:bg-transparent hover:text-primary"
            onClick={() => navigate('/products')}
          >
            المنتجات
          </Button>
          <ChevronLeft className="mx-2 h-4 w-4" />
          <span className="text-foreground font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* صور المنتج */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 lg:sticky lg:top-8 lg:self-start max-h-[calc(100vh-8rem)] overflow-hidden"
            style={{ position: 'sticky' }}
          >
            <div className="aspect-square overflow-hidden rounded-2xl border bg-background shadow-sm">
              <motion.img
                key={activeImage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={activeImage}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            </div>
            
            {/* الصور الإضافية */}
            {(product.additional_images && product.additional_images.length > 0) ? (
              <Carousel className="w-full">
                <CarouselContent>
                  {/* الصورة الرئيسية */}
                  <CarouselItem className="basis-1/4 sm:basis-1/5 md:basis-1/6">
                    <div 
                      className={`relative aspect-square rounded-xl overflow-hidden border ${activeImage === product.imageUrl ? 'border-primary ring-2 ring-primary/20' : 'border-border'} cursor-pointer hover:opacity-90 transition-all duration-300`}
                      onClick={() => setActiveImage(product.imageUrl)}
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                      {activeImage === product.imageUrl && (
                        <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </div>
                  </CarouselItem>
                  
                  {/* الصور الإضافية */}
                  {product.additional_images.map((imageUrl, index) => (
                    <CarouselItem key={index} className="basis-1/4 sm:basis-1/5 md:basis-1/6">
                      <div 
                        className={`relative aspect-square rounded-xl overflow-hidden border ${activeImage === imageUrl ? 'border-primary ring-2 ring-primary/20' : 'border-border'} cursor-pointer hover:opacity-90 transition-all duration-300`}
                        onClick={() => setActiveImage(imageUrl)}
                      >
                        <img
                          src={imageUrl}
                          alt={`${product.name} - ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                        {activeImage === imageUrl && (
                          <div className="absolute inset-0 bg-primary/10 flex items-center justify-center">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0" />
                <CarouselNext className="right-0" />
              </Carousel>
            ) : null}
          </motion.div>

          {/* تفاصيل المنتج */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-8"
          >
            {/* العنوان والعلامات */}
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                {product.is_new && (
                  <Badge className="bg-blue-500 hover:bg-blue-600 rounded-full px-3">جديد</Badge>
                )}
                {product.discount_price && (
                  <Badge className="bg-red-500 hover:bg-red-600 rounded-full px-3">
                    خصم {Math.round(((product.price - product.discount_price) / product.price) * 100)}%
                  </Badge>
                )}
                <Badge className="bg-green-500 hover:bg-green-600 rounded-full px-3" variant="secondary">
                  متوفر
                </Badge>
              </div>
              <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              
              {/* التقييم */}
              <div className="flex items-center mt-3">
                {[...Array(5)].map((_, i) => (
                  <Star 
                    key={i} 
                    className={`h-5 w-5 ${i < Math.floor(product.rating || 0) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} 
                  />
                ))}
                <span className="mr-2 text-sm text-muted-foreground">
                  {product.rating?.toFixed(1)} ({Math.floor(Math.random() * 100) + 50} تقييم)
                </span>
              </div>
            </div>

            {/* الأسعار */}
            <div className="space-y-3 bg-muted/30 p-5 rounded-xl border">
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-primary">
                  {calculatePrice().toLocaleString()} د.ج
                </span>
                
                {product.discount_price && (
                  <span className="text-lg text-muted-foreground line-through">
                    {product.price.toLocaleString()} د.ج
                  </span>
                )}
              </div>
              
              {/* حالة المخزون */}
              <div className="text-sm flex items-center">
                {getAvailableQuantity() > 0 ? (
                  <>
                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                    <span className="text-green-600 dark:text-green-400">
                      متوفر في المخزون ({getAvailableQuantity()} قطعة)
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                    <span className="text-red-600 dark:text-red-400">غير متوفر</span>
                  </>
                )}
              </div>

              {/* مزايا إضافية */}
              <div className="flex flex-col gap-2 pt-3 text-sm">
                {product?.has_fast_shipping && (
                  <div className="flex items-center text-muted-foreground">
                    <Truck className="h-4 w-4 mr-2" />
                    <span>{product.fast_shipping_text || 'شحن سريع لجميع الولايات (1-3 أيام)'}</span>
                  </div>
                )}
                {product?.has_money_back && (
                  <div className="flex items-center text-muted-foreground">
                    <Box className="h-4 w-4 mr-2" />
                    <span>{product.money_back_text || 'ضمان استرداد المال خلال 14 يوم'}</span>
                  </div>
                )}
                {product?.has_quality_guarantee && (
                  <div className="flex items-center text-muted-foreground">
                    <Tag className="h-4 w-4 mr-2" />
                    <span>{product.quality_guarantee_text || 'ضمان جودة المنتج'}</span>
                  </div>
                )}
                {!product?.has_fast_shipping && !product?.has_money_back && !product?.has_quality_guarantee && (
                  <>
                    <div className="flex items-center text-muted-foreground">
                      <Truck className="h-4 w-4 mr-2" />
                      <span>شحن سريع لجميع الولايات (1-3 أيام)</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Box className="h-4 w-4 mr-2" />
                      <span>ضمان استرداد المال خلال 14 يوم</span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Tag className="h-4 w-4 mr-2" />
                      <span>ضمان جودة المنتج</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* اختيار اللون */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center">
                  <span className="inline-block w-3 h-3 bg-primary rounded-full mr-2"></span>
                  اختر اللون:
                </h3>
                <ProductColorSelector
                  colors={product.colors}
                  selectedColor={selectedColor}
                  onSelectColor={handleColorSelect}
                />
              </div>
            )}
            
            {/* اختيار المقاس - إضافة جديدة */}
            {product.use_sizes && selectedColor && selectedColor.has_sizes && sizes.length > 0 && !loadingSizes && (
              <div className="space-y-3">
                <h3 className="font-medium flex items-center">
                  <span className="inline-block w-3 h-3 bg-primary rounded-full mr-2"></span>
                  اختر المقاس:
                </h3>
                <ProductSizeSelector
                  sizes={sizes}
                  selectedSize={selectedSize}
                  onSelectSize={handleSizeSelect}
                />
              </div>
            )}
            
            {/* حالة تحميل المقاسات */}
            {product.use_sizes && selectedColor && selectedColor.has_sizes && loadingSizes && (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                <span className="text-sm text-muted-foreground">جاري تحميل المقاسات...</span>
              </div>
            )}
            
            {/* الكمية */}
            <div className="space-y-3">
              <h3 className="font-medium flex items-center">
                <span className="inline-block w-3 h-3 bg-primary rounded-full mr-2"></span>
                الكمية:
              </h3>
              <div className="flex items-center space-x-4 space-x-reverse">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <span className="w-12 h-10 flex items-center justify-center text-center font-medium text-lg border rounded-lg">
                  {quantity}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= getAvailableQuantity()}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* نموذج الطلب (مباشرة بدون زر) */}
            <motion.div
              id="order-form-section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-6 pt-6 border-t"
            >
              <OrderForm
                productId={product.id}
                price={selectedSize?.price || product.price}
                deliveryFee={product.delivery_fee || 0}
                productColorId={selectedColor?.id || null}
                productSizeId={selectedSize?.id || null}
                sizeName={selectedSize?.size_name || null}
                quantity={quantity}
                customFields={customFormFields}
              />
            </motion.div>
          </motion.div>
        </div>
        
        {/* وصف المنتج - موضوع أسفل الصفحة بالكامل */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full mt-12 mb-8"
        >
          <div className="border-t pt-8">
            <h2 className="text-2xl font-semibold mb-4">وصف المنتج</h2>
            <div className="bg-muted/20 p-6 rounded-xl border">
              <p className="text-muted-foreground leading-relaxed">{product.description}</p>
            </div>
          </div>
        </motion.div>
      </div>
      <StoreFooter />
    </div>
  );
};

export default ProductPurchase; 