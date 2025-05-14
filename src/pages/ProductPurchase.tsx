import { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getProductPageData } from '@/api/product-page';
import type { Product, ProductColor, PurchasePageConfig, ProductSize, UpsellDownsellItem } from '@/lib/api/products';
import { FormSettings, CustomFormField } from '@/components/store/order-form/OrderFormTypes';
import { toast } from 'sonner';

// Components
import Navbar from '@/components/Navbar';
import StoreFooter from '@/components/store/StoreFooter';
import { useTenant } from '@/context/TenantContext';
import ProductBreadcrumb from '@/components/store/product/ProductBreadcrumb';

// Custom Components
import ProductGallery from '@/components/store/product/ProductGallery';
import ProductInfo from '@/components/store/product/ProductInfo';
import ProductFeatures from '@/components/store/product/ProductFeatures';
import ProductOptions from '@/components/store/product/ProductOptions';
import ProductDescription from '@/components/store/product/ProductDescription';
import PurchaseTimer from '@/components/store/PurchaseTimer';

// Lazy-loaded components
const OrderForm = lazy(() => import('@/components/store/OrderForm'));
const QuantityOffersDisplay = lazy(() => import('@/components/store/product/QuantityOffersDisplay'));
const UpsellDownsellDisplay = lazy(() => import('@/components/store/product-purchase/UpsellDownsellDisplay'));

// تمديد واجهة FormSettings لإضافة حقل fields
interface ExtendedFormSettings extends FormSettings {
  fields?: CustomFormField[];
}

// مكون فرعي لعرض جزء المعلومات الرئيسية للمنتج
const ProductMainInfo = ({ product, ...props }) => {
  if (!product) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <ProductInfo 
        name={product.name}
        price={product.price}
        discountPrice={product.discount_price}
        currentPrice={props.calculatePrice()}
        rating={product.rating || 0}
        isNew={product.is_new}
        stock={props.getAvailableQuantity()}
        description={product.short_description}
      />
    </motion.div>
  );
};

// مكون فرعي لعرض العداد التنازلي
const ProductTimerSection = ({ timerConfig }) => {
  console.log("تفاصيل المؤقت:", timerConfig);
  
  // إذا لم يكن هناك تكوين للمؤقت أو لم يكن مفعلاً
  if (!timerConfig) {
    console.log("لم يتم توفير تكوين المؤقت");
    return null;
  }
  
  if (!timerConfig.enabled) {
    console.log("المؤقت غير مفعل");
    return null;
  }
  
  if (!timerConfig.endDate) {
    console.log("لم يتم تحديد تاريخ انتهاء للمؤقت");
    return null;
  }
  
  // عرض المؤقت حتى لو كان تاريخ الانتهاء في الماضي (المكون نفسه سيتحقق من ذلك)
  
  // استخدام textAbove أو message أو النص الافتراضي
  const timerTextAbove = timerConfig.textAbove || timerConfig.message || "العرض ينتهي خلال:";
  const timerTextBelow = timerConfig.textBelow || "سارع بالطلب قبل انتهاء العرض - الكمية محدودة";
  
  console.log("معلومات المؤقت النهائية:", { 
    enabled: timerConfig.enabled, 
    endDate: timerConfig.endDate,
    textAbove: timerTextAbove,
    textBelow: timerTextBelow
  });
  
  // استخدام تعليمة key لإجبار React على إعادة رسم المكون عند تغير البيانات
  return (
    <motion.div
      key={`timer-${timerConfig.endDate}`}
      className="mb-6 border border-primary/20 rounded-xl overflow-hidden shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <PurchaseTimer 
        endDate={timerConfig.endDate} 
        textAbove={timerTextAbove} 
        textBelow={timerTextBelow} 
      />
    </motion.div>
  );
};

// إضافة مكون جديد للصورة مع تأثيرات
const ProductGalleryWithAnimation = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <ProductGallery {...props} />
    </motion.div>
  );
};

// مكون لعرض جزء المميزات مع تأثيرات
const ProductFeaturesWithAnimation = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <ProductFeatures {...props} />
    </motion.div>
  );
};

// مكون لعرض خيارات المنتج (الألوان والمقاسات) مع تأثيرات
const ProductOptionsWithAnimation = (props) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <ProductOptions {...props} />
    </motion.div>
  );
};

// مكون لعرض شريط التقدم عند التحميل
const LoadingProgressBar = ({ isVisible }) => {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className="fixed top-0 left-0 right-0 h-1 z-50 bg-primary-foreground overflow-hidden"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ 
              width: ["0%", "30%", "70%", "90%"],
              transition: { 
                times: [0, 0.3, 0.7, 0.9],
                duration: 2.5,
                ease: "easeInOut",
                repeat: Infinity,
                repeatType: "loop"
              }
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Fallback component for Suspense
const SuspenseFallback = () => (
  <div className="flex items-center justify-center p-8 w-full">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
    <span className="ml-2 text-sm text-muted-foreground">جاري التحميل...</span>
  </div>
);

const ProductPurchase = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentOrganization, isLoading: isOrganizationLoading } = useTenant();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPartialLoading, setIsPartialLoading] = useState(true);
  const [selectedColor, setSelectedColor] = useState<ProductColor | null>(null);
  const [sizes, setSizes] = useState<ProductSize[]>([]);
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [loadingSizes, setLoadingSizes] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [customFormFields, setCustomFormFields] = useState<CustomFormField[]>([]);
  const [formSettings, setFormSettings] = useState<ExtendedFormSettings | null>(null);
  const [showStickyButton, setShowStickyButton] = useState(false);
  
  const [effectiveProduct, setEffectiveProduct] = useState<Product | null>(null);
  const [effectivePrice, setEffectivePrice] = useState<number | null>(null);
  
  const [productData, setProductData] = useState<any>(null);
  
  const orderFormRef = useRef<HTMLDivElement>(null);
  const dataFetchedRef = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      if (!orderFormRef.current) return;
      
      const orderFormPosition = orderFormRef.current.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      setShowStickyButton(orderFormPosition > windowHeight);
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToOrderForm = () => {
    if (orderFormRef.current) {
      orderFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    // منع التحميل المتكرر للبيانات عند إعادة تقديم المكون
    if (dataFetchedRef.current) return;
    
    const loadProduct = async () => {
      try {
        setIsLoading(true);
        setIsPartialLoading(true);
        setError(null); 
        
        console.log('بدء تحميل بيانات المنتج للمنظمة:', currentOrganization.id, 'والرابط:', slug);
        
        // تنفيذ التحميل المتوازي للبيانات بدلاً من انتظار كل خطوة
        const productDataPromise = getProductPageData(currentOrganization.id, slug);
        
        // انتظار نتيجة الاستعلام
        const data = await productDataPromise;
        
        if (!data || !data.product) {
          console.error('لم يتم العثور على المنتج أو لم يتم تحميل البيانات بشكل صحيح');
          setError('المنتج غير موجود');
          setIsLoading(false);
          setIsPartialLoading(false);
          return;
        }
        
        console.log('تم تحميل بيانات المنتج بنجاح:', data.product.name);
        console.log('تفاصيل تكوين صفحة الشراء:', data.product.purchase_page_config);
        
        // تم تحميل البيانات الأساسية، نعرض المنتج ونستمر في تحميل التفاصيل
        setProductData(data);
        setProduct(data.product);
        setEffectiveProduct(data.product);
        setIsPartialLoading(false);
        
        // التحقق من وجود تكوين مؤقت العرض
        if (data.product.purchase_page_config?.timer) {
          console.log('تم العثور على تكوين المؤقت:', data.product.purchase_page_config.timer);
          
          // التحقق مما إذا كان المؤقت مفعلاً
          if (data.product.purchase_page_config.timer.enabled) {
            console.log('المؤقت مفعل ويجب أن يظهر في الصفحة');
          } else {
            console.log('المؤقت غير مفعل');
          }
        } else {
          console.log('لم يتم العثور على تكوين المؤقت في إعدادات صفحة الشراء');
        }
        
        // تجهيز الألوان والمقاسات
        if (data.colors && data.colors.length > 0) {
          const defaultColor = data.colors.find(c => c.is_default) || data.colors[0];
          if (defaultColor) {
            setSelectedColor(defaultColor as ProductColor);
            
            if (data.product.use_sizes) {
              loadSizesForColor(defaultColor.id, data.product.id);
            }
          }
        }
        
        // تجهيز إعدادات النموذج
        if (data.form_settings && data.form_settings.length > 0) {
          const fs = data.form_settings[0];
          const extendedSettings: ExtendedFormSettings = {
            id: fs.id,
            name: fs.name,
            is_default: fs.is_default,
            is_active: fs.is_active,
            version: fs.version,
            settings: fs.settings,
            fields: fs.fields
          };
          setFormSettings(extendedSettings);
          
          if (fs.fields && Array.isArray(fs.fields)) {
            const processedFields = fs.fields.map(field => ({
              ...field,
              isVisible: field.isVisible !== undefined ? field.isVisible : true
            })) as CustomFormField[];
            
            setCustomFormFields(processedFields);
          }
        }

        // تعيين علامة لمنع تكرار التحميل
        dataFetchedRef.current = true;
      } catch (error) {
        console.error('Error loading product:', error);
        setError('حدث خطأ أثناء تحميل المنتج');
      } finally {
        setIsLoading(false);
      }
    };

    if (slug && currentOrganization?.id) {
      loadProduct();
    } else if (!isOrganizationLoading && !currentOrganization?.id) {
      setError("Organization context is missing.");
      setIsLoading(false);
      setIsPartialLoading(false);
    }
  }, [slug, currentOrganization, isOrganizationLoading]);

  useEffect(() => {
    if (effectiveProduct) {
      let base = effectiveProduct.discount_price ?? effectiveProduct.price;
      setEffectivePrice(base);
    }
  }, [effectiveProduct]);

  const loadSizesForColor = (colorId: string, productId: string) => {
    setLoadingSizes(true);
    setSizes([]);
    setSelectedSize(null);
    
    try {
      if (productData && productData.sizes) {
        const filteredSizes = productData.sizes.filter(
          (size: ProductSize) => size.color_id === colorId && size.product_id === productId
        );
        
        if (filteredSizes.length > 0) {
          setSizes(filteredSizes);
          const defaultSize = filteredSizes.find(s => s.is_default) || filteredSizes[0];
          setSelectedSize(defaultSize);
        }
      }
    } catch (err) {
      console.error('Error in loadSizesForColor:', err);
    } finally {
      setLoadingSizes(false);
    }
  };

  const handleColorSelect = (color: ProductColor) => {
    setSelectedColor(color);
    setSelectedSize(null);
    
    if (product?.use_sizes) {
      loadSizesForColor(color.id, product.id);
    }
  };

  const handleSizeSelect = (size: ProductSize) => {
    setSelectedSize(size);
    setQuantity(1); 
    if (product && effectiveProduct?.id !== product.id) {
        setEffectiveProduct(product);
        toast.info('تم العودة إلى المنتج الأصلي.');
    }
  };

  const handleQuantityChange = (newQuantity: number) => {
    const max = selectedSize?.quantity ?? selectedColor?.quantity ?? product?.stock_quantity ?? 1;
    if (newQuantity > 0 && newQuantity <= max) {
      setQuantity(newQuantity);
    }
  };

  const calculatePrice = () => {
    if (!product) return 0;
    
    if (selectedSize?.price != null) return selectedSize.price;
    
    if (selectedColor?.price != null) return selectedColor.price;
    
    return product.discount_price ?? product.price;
  };

  const getAvailableQuantity = () => {
    return selectedSize?.quantity ?? selectedColor?.quantity ?? product?.stock_quantity ?? 0;
  };

  // الحصول على تكوين المؤقت من المنتج
  const timerConfig = product?.purchase_page_config?.timer;
  console.log('تكوين المؤقت الحالي:', timerConfig);
  
  // الحصول على عروض الكمية
  const quantityOffers = product?.purchase_page_config?.quantityOffers as any[] | undefined;

  let activeOffer: any | null = null; 
  if (quantityOffers && quantityOffers.length > 0) {
    const applicableOffers = quantityOffers
      .filter(offer => quantity >= offer.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity);
    
    if (applicableOffers.length > 0) {
      activeOffer = applicableOffers[0];
    }
  }

  const handleAcceptOffer = (acceptedItem: UpsellDownsellItem, finalPrice: number, acceptedProduct: Product) => {
    setEffectiveProduct(acceptedProduct); 
    setEffectivePrice(finalPrice);
    setQuantity(1); 
    setSelectedColor(acceptedProduct.colors?.find(c => c.is_default) || acceptedProduct.colors?.[0] || null);
    setSelectedSize(null);
    if (acceptedProduct.use_sizes && acceptedProduct.colors?.length) {
        const defaultColor = acceptedProduct.colors.find(c => c.is_default) || acceptedProduct.colors[0];
        if (defaultColor) {
             loadSizesForColor(defaultColor.id, acceptedProduct.id);
        }
    }

    toast.success(`تم تغيير المنتج إلى: ${acceptedProduct.name}`);
  };

  // عرض بعض المعلومات مبكراً حتى لو لم تكتمل جميع البيانات
  const shouldShowPartialContent = !isLoading && !error && product && !isPartialLoading;
  const shouldShowFullContent = !isLoading && !error && product;

  return (
    <div className="w-full min-h-screen bg-background">
      <Navbar />
      <LoadingProgressBar isVisible={isLoading || isPartialLoading || isOrganizationLoading} />
      <div className="container mx-auto py-4 px-4 md:px-6">
        {isLoading || isOrganizationLoading ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <motion.span 
              className="text-muted-foreground text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              جاري تحميل المنتج...
            </motion.span>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-destructive mb-4">عذراً، حدث خطأ</h2>
              <p className="text-muted-foreground mb-6">{error}</p>
              <button 
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
              >
                العودة للخلف
              </button>
            </motion.div>
          </div>
        ) : shouldShowPartialContent ? (
          <>
            <div className="mb-6">
              <ProductBreadcrumb 
                productName={product.name}
                categoryName={product.category ? product.category.name : "المنتجات"}
                categorySlug={product.category ? product.category.slug : "products"}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="order-1 md:order-1 mb-6 md:mb-0">
                <div className="md:sticky md:top-24">
                  <ProductGalleryWithAnimation 
                    mainImage={product.thumbnail_image}
                    additionalImages={product.additional_images || []}
                    altText={product.name}
                  />
                </div>
              </div>
              
              <div className="order-2 md:order-2 flex flex-col space-y-6">
                <ProductMainInfo 
                  product={product}
                  calculatePrice={calculatePrice}
                  getAvailableQuantity={getAvailableQuantity}
                />
                
                {/* عرض مؤقت العرض إذا كان مفعلاً */}
                {timerConfig?.enabled && (
                  <ProductTimerSection timerConfig={timerConfig} />
                )}
                
                {product.has_fast_shipping || product.has_money_back || product.has_quality_guarantee ? (
                  <div className="mt-2 mb-4">
                    <ProductFeaturesWithAnimation
                      hasFastShipping={product.has_fast_shipping}
                      hasMoneyBack={product.has_money_back}
                      hasQualityGuarantee={product.has_quality_guarantee}
                      fastShippingText={product.fast_shipping_text}
                      moneyBackText={product.money_back_text}
                      qualityGuaranteeText={product.quality_guarantee_text}
                    />
                  </div>
                ) : null}
                
                <div className="mt-2 mb-4">
                  <ProductOptionsWithAnimation
                    colors={productData?.colors || []}
                    sizes={sizes}
                    selectedColor={selectedColor}
                    selectedSize={selectedSize}
                    onColorSelect={handleColorSelect}
                    onSizeSelect={handleSizeSelect}
                    quantity={quantity}
                    maxQuantity={getAvailableQuantity()}
                    onQuantityChange={handleQuantityChange}
                    loadingSizes={loadingSizes}
                    showSizes={product.use_sizes}
                  />
                </div>

                {Array.isArray(quantityOffers) && quantityOffers.length > 0 && (
                  <div className="mt-2 mb-6">
                    <Suspense fallback={<SuspenseFallback />}>
                      <QuantityOffersDisplay 
                        offers={quantityOffers}
                        selectedQuantity={quantity}
                        basePrice={calculatePrice()}
                        maxQuantity={getAvailableQuantity()}
                        onQuantityChange={handleQuantityChange}
                      />
                    </Suspense>
                  </div>
                )}
                
                {shouldShowFullContent && (
                  <div ref={orderFormRef} className="bg-card p-6 rounded-xl shadow-sm mb-8">
                    <h2 className="text-2xl font-bold mb-4">طلب المنتج</h2>
                    <Suspense fallback={<SuspenseFallback />}>
                      <OrderForm
                        productId={effectiveProduct?.id || product.id}
                        productColorId={selectedColor?.id}
                        productSizeId={selectedSize?.id}
                        sizeName={selectedSize?.size_name}
                        basePrice={calculatePrice()}
                        activeOffer={activeOffer}
                        quantity={quantity}
                        customFields={customFormFields}
                        formSettings={formSettings}
                        productColorName={selectedColor?.name}
                        productSizeName={selectedSize?.size_name}
                      />
                    </Suspense>
                  </div>
                )}
              </div>
            </div>
            
            {shouldShowFullContent && (
              <>
                <div className="mt-2 mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200 hidden">
                  <h3 className="font-medium mb-2">بيانات العروض التشخيصية:</h3>
                  <pre className="text-xs overflow-auto p-2 bg-white rounded">
                    config exists: {product.purchase_page_config ? 'yes' : 'no'}<br/>
                    upsells exist: {product.purchase_page_config?.upsells ? 'yes' : 'no'}<br/>
                    upsells length: {product.purchase_page_config?.upsells?.length || 0}<br/>
                    downsells exist: {product.purchase_page_config?.downsells ? 'yes' : 'no'}<br/>
                    downsells length: {product.purchase_page_config?.downsells?.length || 0}
                  </pre>
                </div>

                {product.purchase_page_config?.upsells?.length > 0 && (
                  <div className="mt-4 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                      <span className="inline-block w-1.5 h-6 bg-primary ml-2 rounded-sm"></span>
                      عروض مميزة لك
                    </h2>
                    <Suspense fallback={<SuspenseFallback />}>
                      <UpsellDownsellDisplay 
                        items={product.purchase_page_config.upsells as any}
                        type="upsell"
                        onAcceptOffer={handleAcceptOffer}
                        originalProductName={product.name}
                      />
                    </Suspense>
                  </div>
                )}
                
                {product.purchase_page_config?.downsells?.length > 0 && (
                  <div className="mt-4 mb-8">
                    <h2 className="text-xl font-semibold mb-4 text-foreground flex items-center">
                      <span className="inline-block w-1.5 h-6 bg-primary ml-2 rounded-sm"></span>
                      خيارات بديلة قد تهمك
                    </h2>
                    <Suspense fallback={<SuspenseFallback />}>
                      <UpsellDownsellDisplay 
                        items={product.purchase_page_config.downsells as any}
                        type="downsell"
                        onAcceptOffer={handleAcceptOffer}
                        originalProductName={product.name}
                      />
                    </Suspense>
                  </div>
                )}
                
                <div className="mb-12 bg-card p-6 rounded-xl shadow-sm">
                  <h2 className="text-2xl font-bold mb-4">وصف المنتج</h2>
                  <ProductDescription
                    description={product.description}
                  />
                </div>
              </>
            )}
            
            {showStickyButton && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-4 left-0 right-0 z-50 px-4 md:hidden"
              >
                <button
                  onClick={scrollToOrderForm}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg shadow-lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>اطلب الآن</span>
                </button>
              </motion.div>
            )}
          </>
        ) : null}
      </div>
      
      <StoreFooter />
    </div>
  );
};

export default ProductPurchase; 