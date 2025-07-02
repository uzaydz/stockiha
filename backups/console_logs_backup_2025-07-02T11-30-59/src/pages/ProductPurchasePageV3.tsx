import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

// استيراد المكونات الجديدة المحسنة
import { NavbarMain } from '@/components/navbar/NavbarMain';
import { ProductHeader } from '@/components/product/ProductHeader';
import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductActions } from '@/components/product/ProductActions';

import { ProductPageSkeleton } from '@/components/product/ProductPageSkeleton';
import { ProductErrorPage } from '@/components/product/ProductErrorPage';

// المكونات الموجودة مسبقاً
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import ProductFeatures from '@/components/product/ProductFeatures';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductPurchaseSummary from '@/components/product/ProductPurchaseSummary';
import ProductOfferTimer from '@/components/product/ProductOfferTimer';

// الـ Hooks والسياق
import useProductPurchase from '@/hooks/useProductPurchase';
import { useProductPage } from '@/context/ProductPageContext';

// حاسبة التوصيل
import { 
  calculateDeliveryFeesOptimized,
  type DeliveryCalculationResult 
} from '@/lib/delivery-calculator';

// الأنواع
interface Product {
  id: string;
  name: string;
  brand?: string;
  sku?: string;
  description?: string;
  status: {
    is_new?: boolean;
    is_featured?: boolean;
  };
  pricing?: {
    price: number;
  };
  images?: {
    thumbnail_image?: string;
    additional_images?: Array<{ url: string }>;
  };
  marketing_settings?: any;
  shipping_and_templates?: {
    shipping_info?: any;
  };
  organization?: {
    id: string;
  };
  // إضافة خصائص الألوان والمقاسات
  variants?: {
    has_variants?: boolean;
    colors?: Array<{
      id: string;
      name: string;
      color_code?: string;
      image_url?: string;
      sizes?: Array<{
        id: string;
        size_name: string;
        price?: number;
      }>;
    }>;
  };
}

const ProductPurchasePageV3: React.FC = React.memo(() => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { organization } = useProductPage();
  
  // ⏱️ قياس وقت تحميل الصفحة
  const [pageStartTime] = useState(() => {
    const startTime = performance.now();
    console.log('🚀 ProductPurchasePageV3: بدء تحميل الصفحة', { 
      productId, 
      timestamp: new Date().toISOString(),
      startTime: startTime 
    });
    return startTime;
  });
  
  // حالات المكون
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // استخدام hook المخصص لإدارة حالة المنتج - مع منع الطلبات المكررة
  const [state, actions] = useProductPurchase({
    productId,
    organizationId: organization?.id || undefined,
    dataScope: 'ultra'
  });

  // مراقبة عدد الـ renders لتتبع الطلبات المكررة
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // تسجيل عدد الـ renders للكشف عن المشاكل - فقط في بيئة التطوير
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && renderCountRef.current > 8) {
      console.warn(`⚠️ ProductPurchasePageV3: عدد renders مرتفع: ${renderCountRef.current}`);
    }
  }, []);

  const {
    product,
    loading,
    error,
    selectedColor,
    selectedSize,
    quantity,
    addingToCart,
    buyingNow,
    isInWishlist,
    availableStock,
    canPurchase,
    priceInfo,
    totalPrice,
    formData,
    hasCustomForm,
    formStrategy
  } = state;

  // ⏱️ تتبع وقت تحميل البيانات
  useEffect(() => {
    if (product && !loading) {
      const loadTime = performance.now() - pageStartTime;
      console.log('📦 ProductPurchasePageV3: تم تحميل بيانات المنتج', {
        loadTimeMs: Math.round(loadTime),
        loadTimeSec: (loadTime / 1000).toFixed(2),
        productName: product.name,
        hasVariants: !!product.variants?.has_variants,
        hasImages: !!(product.images?.additional_images?.length || product.images?.thumbnail_image),
        hasForm: !!formData
      });
    }
  }, [product, loading, pageStartTime, formData]);

  // ⏱️ تتبع وقت اكتمال تحميل النموذج
  useEffect(() => {
    if (formData && product && !loading) {
      const formLoadTime = performance.now() - pageStartTime;
      console.log('📝 ProductPurchasePageV3: تم تحميل النموذج', {
        formLoadTimeMs: Math.round(formLoadTime),
        formLoadTimeSec: (formLoadTime / 1000).toFixed(2),
        formStrategy,
        formFieldsCount: Object.keys(formData).length
      });
    }
  }, [formData, product, loading, pageStartTime, formStrategy]);

  // ⏱️ تتبع وقت تحميل المتغيرات (الألوان والمقاسات)
  useEffect(() => {
    if (product?.variants?.has_variants && product.variants.colors?.length) {
      const variantsLoadTime = performance.now() - pageStartTime;
      console.log('🎨 ProductPurchasePageV3: تم تحميل المتغيرات', {
        variantsLoadTimeMs: Math.round(variantsLoadTime),
        colorsCount: product.variants.colors.length,
        totalSizes: product.variants.colors.reduce((total, color) => total + (color.sizes?.length || 0), 0)
      });
    }
  }, [product?.variants, pageStartTime]);

  // ⏱️ تتبع حساب رسوم التوصيل
  useEffect(() => {
    if (deliveryCalculation) {
      const deliveryTime = performance.now() - pageStartTime;
      console.log('🚚 ProductPurchasePageV3: تم حساب رسوم التوصيل', {
        deliveryTimeMs: Math.round(deliveryTime),
        deliveryFee: deliveryCalculation.deliveryFee,
        deliveryType: deliveryCalculation.deliveryType,
        calculationMethod: deliveryCalculation.calculationMethod
      });
    }
  }, [deliveryCalculation, pageStartTime]);

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    addToCart,
    buyNow,
    toggleWishlist,
    shareProduct
  } = actions;

  // استدعاء useCallback خارج أي شروط مشروطة
  const handleFormSubmit = useCallback((data: Record<string, any>) => {
    setSubmittedFormData(data);
  }, []);

  const handleFormChange = useCallback((data: Record<string, any>) => {
    setSubmittedFormData(data);
  }, []);

  // الحصول على organizationId مع تثبيت القيمة
  const organizationId = useMemo(() => {
    const id = (organization as any)?.id || (product?.organization as any)?.id || null;
    return id;
  }, [(organization as any)?.id, (product?.organization as any)?.id]);

  // إعداد مؤقت العرض
  const offerTimerSettings = useMemo(() => {
    if (!product?.marketing_settings) return null;
    
    const marketingSettings = product.marketing_settings as any;
    const offerTimerEnabled = marketingSettings?.offer_timer_enabled === true;
    
    if (!offerTimerEnabled) return null;
    
    let timerType = marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
    if (timerType === 'specific_date' && !marketingSettings.offer_timer_end_date) {
      timerType = 'evergreen';
    }
    
    const duration = marketingSettings.offer_timer_duration_minutes || 60;
    
    return {
      offer_timer_enabled: true,
      offer_timer_title: marketingSettings.offer_timer_title || 'عرض خاص',
      offer_timer_type: timerType,
      offer_timer_end_date: marketingSettings.offer_timer_end_date || undefined,
      offer_timer_duration_minutes: duration,
      offer_timer_text_above: marketingSettings.offer_timer_text_above || 'عرض محدود الوقت',
      offer_timer_text_below: marketingSettings.offer_timer_text_below || 'استفد من العرض قبل انتهاء الوقت',
      offer_timer_end_action: (marketingSettings.offer_timer_end_action as 'hide' | 'show_message' | 'redirect') || 'hide',
      offer_timer_end_action_message: marketingSettings.offer_timer_end_action_message || undefined,
      offer_timer_end_action_url: marketingSettings.offer_timer_end_action_url || undefined,
      offer_timer_restart_for_new_session: marketingSettings.offer_timer_restart_for_new_session || false,
      offer_timer_cookie_duration_days: marketingSettings.offer_timer_cookie_duration_days || 30,
      offer_timer_show_on_specific_pages_only: marketingSettings.offer_timer_show_on_specific_pages_only || false,
      offer_timer_specific_page_urls: marketingSettings.offer_timer_specific_page_urls || []
    };
  }, [product?.marketing_settings]);

  // حساب رسوم التوصيل مع debouncing محسن
  useEffect(() => {
    const calculateDelivery = async () => {
      if (!organizationId || !submittedFormData.province || !submittedFormData.municipality) {
        setDeliveryCalculation(null);
        return;
      }

      setIsCalculatingDelivery(true);
      
      try {
        const deliveryType: 'desk' | 'home' = (
          submittedFormData.delivery_type === 'desk' || 
          submittedFormData.shipping_type === 'desk' ||
          submittedFormData.fixedDeliveryType === 'desk'
        ) ? 'desk' : 'home';

        const weight = 1; 
        const productPrice = product?.pricing?.price || 0;
        
        const deliveryInput = {
          organizationId,
          selectedProvinceId: submittedFormData.province,
          selectedMunicipalityId: submittedFormData.municipality,
          deliveryType,
          weight,
          productPrice,
          quantity,
          shippingProvider: {
            code: 'yalidine',
            name: 'ياليدين',
            type: 'yalidine' as const
          },
          productShippingInfo: product?.shipping_and_templates?.shipping_info || undefined
        };

        const result = await calculateDeliveryFeesOptimized(deliveryInput);
        setDeliveryCalculation(result);
        
      } catch (error) {
        setDeliveryCalculation(null);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    const timeoutId = setTimeout(calculateDelivery, 1000); // زيادة debounce time
    return () => clearTimeout(timeoutId);
  }, [
    organizationId, 
    submittedFormData.province, 
    submittedFormData.municipality, 
    submittedFormData.delivery_type, 
    submittedFormData.shipping_type,
    submittedFormData.fixedDeliveryType,
    product?.pricing?.price,
    quantity
  ]);

  // حساب بيانات الملخص
  const summaryData = useMemo(() => {
    if (!product) return null;

    return {
      selectedProvince: deliveryCalculation?.selectedProvince || null,
      selectedMunicipality: deliveryCalculation?.selectedMunicipality || null,
      deliveryType: deliveryCalculation?.deliveryType || 'home',
      deliveryFee: deliveryCalculation?.deliveryFee || 0,
      isCalculating: isCalculatingDelivery,
      shippingProvider: deliveryCalculation?.shippingProvider || {
        name: 'ياليدين',
        code: 'yalidine'
      },
      calculationMethod: deliveryCalculation?.calculationMethod
    };
  }, [product, deliveryCalculation, isCalculatingDelivery]);

  // معالجة الشراء المباشر
  const handleBuyNow = useCallback(async () => {
    const result = await buyNow();
    if (result.success) {
      navigate('/checkout', {
        state: {
          orderData: result.data,
          fromProductPage: true
        }
      });
    }
  }, [buyNow, navigate]);

  // معالجة إعادة المحاولة
  const handleRetry = useCallback(() => {
    window.location.reload();
  }, []);

  // ⏱️ تتبع وقت اكتمال عرض الصفحة
  useEffect(() => {
    if (product && !loading && !error) {
      // تأخير صغير للتأكد من اكتمال عرض جميع المكونات
      const timeoutId = setTimeout(() => {
        const totalTime = performance.now() - pageStartTime;
                 console.log('✅ ProductPurchasePageV3: اكتملت الصفحة بالكامل', {
           totalTimeMs: Math.round(totalTime),
           totalTimeSec: (totalTime / 1000).toFixed(2),
           componentsLoaded: {
             product: !!product,
             images: !!(product.images?.additional_images?.length || product.images?.thumbnail_image),
             variants: !!product.variants?.has_variants,
             form: !!formData,
             deliveryCalculation: !!deliveryCalculation
           },
           performance: totalTime < 1000 ? '🚀 سريع جداً' : 
                       totalTime < 2000 ? '⚡ سريع' : 
                       totalTime < 3000 ? '✓ جيد' : '⚠️ بطيء',
           breakdown: {
             productId,
             imageCount: product.images?.additional_images?.length || 0,
             variantCount: product.variants?.colors?.length || 0,
             formFields: formData ? Object.keys(formData).length : 0,
             hasDeliveryCalculation: !!deliveryCalculation
           }
         });

         // 📊 ملخص الأداء النهائي
         console.groupCollapsed('📊 تقرير الأداء الشامل - ProductPurchasePageV3');
         console.log('⏱️ الوقت الإجمالي:', `${(totalTime / 1000).toFixed(2)} ثانية`);
         console.log('🚀 تقييم الأداء:', totalTime < 1000 ? 'ممتاز' : totalTime < 2000 ? 'جيد جداً' : totalTime < 3000 ? 'جيد' : 'يحتاج تحسين');
         console.log('📦 المنتج:', product.name);
         console.log('🎨 المتغيرات:', product.variants?.has_variants ? `${product.variants.colors?.length || 0} ألوان` : 'لا توجد');
         console.log('📝 النموذج:', formData ? `${Object.keys(formData).length} حقل` : 'لا يوجد');
         console.log('🚚 التوصيل:', deliveryCalculation ? `${deliveryCalculation.deliveryFee} دج` : 'غير محسوب');
         console.groupEnd();
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [product, loading, error, pageStartTime, formData, deliveryCalculation]);

  // حالة التحميل
  if (loading) {
    console.log('⏳ ProductPurchasePageV3: عرض شاشة التحميل');
    return <ProductPageSkeleton />;
  }

  // حالة الخطأ
  if (error || !product) {
    const errorTime = performance.now() - pageStartTime;
    console.log('❌ ProductPurchasePageV3: حدث خطأ', {
      errorTimeMs: Math.round(errorTime),
      error: error || 'منتج غير موجود'
    });
    return (
      <ProductErrorPage 
        error={error}
        onRetry={handleRetry}
      />
    );
  }

  // ⏱️ تسجيل بداية عرض المكونات
  console.log('🎨 ProductPurchasePageV3: بدء عرض المكونات', {
    renderTimeMs: Math.round(performance.now() - pageStartTime),
    productId,
    hasFormData: !!formData,
    hasDeliveryCalculation: !!deliveryCalculation
  });

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* النافبار الرئيسي */}
      <NavbarMain 
        className="bg-background/95 backdrop-blur-md border-b border-border/20"
        hideCategories={true}
      />

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* قسم الصور */}
          <motion.div 
            className="lg:sticky lg:top-24"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <ProductImageGalleryV2 
              product={product} 
              selectedColor={selectedColor}
            />
          </motion.div>

          {/* قسم المعلومات والشراء */}
          <motion.div 
            className="space-y-4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* رأس المنتج */}
            <ProductHeader
              name={product.name}
              brand={product.brand}
              status={product.status}
              availableStock={availableStock}
            />

            {/* عرض السعر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="pt-2"
            >
              <ProductPriceDisplay
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                quantity={quantity}
              />
            </motion.div>

            {/* الكمية */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="pt-3"
            >
              <ProductQuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={Math.min(availableStock, 100)}
                disabled={!canPurchase}
              />
            </motion.div>

            {/* مؤقت العرض */}
            {offerTimerSettings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.15 }}
                className="my-6"
              >
                <ProductOfferTimer 
                  settings={offerTimerSettings}
                  theme="default"
                  className="w-full"
                />
              </motion.div>
            )}

            <Separator className="bg-border/50 dark:bg-border/30" />

            {/* اختيار المتغيرات */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <ProductVariantSelector
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorSelect={setSelectedColor}
                onSizeSelect={setSelectedSize}
              />
            </motion.div>

            <Separator className="bg-border/50 dark:bg-border/30" />

            {/* أزرار الشراء */}
            <ProductActions
              totalPrice={totalPrice}
              deliveryFee={summaryData?.deliveryFee || 0}
              canPurchase={canPurchase}
              buyingNow={buyingNow}
              onBuyNow={handleBuyNow}
              isCalculatingDelivery={summaryData?.isCalculating || false}
              currency="دج"
            />

            {/* ميزات المنتج */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <ProductFeatures product={product} />
            </motion.div>

            {/* النماذج */}
            {formData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.7 }}
              >
                <Separator className="mb-6 bg-border/50 dark:bg-border/30" />
                <ProductFormRenderer
                  formData={formData}
                  formStrategy={formStrategy}
                  onFormSubmit={handleFormSubmit}
                  onFormChange={handleFormChange}
                  loading={buyingNow}
                  className="mb-4"
                  // تمرير بيانات المنتج والمزامنة
                  product={{
                    has_variants: product.variants?.has_variants,
                    colors: product.variants?.colors
                  }}
                  selectedColor={selectedColor}
                  selectedSize={selectedSize}
                  onColorSelect={setSelectedColor}
                  onSizeSelect={setSelectedSize}
                />

                {/* ملخص الطلب */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.8 }}
                  className="mt-6"
                >
                  <ProductPurchaseSummary
                    productName={product.name}
                    productImage={product.images?.additional_images?.[0]?.url || product.images?.thumbnail_image}
                    basePrice={product.pricing?.price || 0}
                    quantity={quantity}
                    selectedColor={selectedColor ? {
                      name: selectedColor.name,
                      value: selectedColor.color_code || '#000000',
                      price_modifier: selectedColor.price ? selectedColor.price - (product.pricing?.price || 0) : 0
                    } : undefined}
                    selectedSize={selectedSize ? {
                      name: selectedSize.size_name,
                      value: selectedSize.size_name,
                      price_modifier: selectedSize.price ? selectedSize.price - (product.pricing?.price || 0) : 0
                    } : undefined}
                    subtotal={priceInfo.price * quantity}
                    discount={priceInfo.discount}
                    deliveryFee={summaryData?.deliveryFee || 0}
                    total={totalPrice + (summaryData?.deliveryFee || 0)}
                    isLoadingDeliveryFee={summaryData?.isCalculating || false}
                    deliveryType={summaryData?.deliveryType || 'home'}
                    selectedProvince={summaryData?.selectedProvince}
                    selectedMunicipality={summaryData?.selectedMunicipality ? {
                      id: summaryData.selectedMunicipality.id,
                      name: summaryData.selectedMunicipality.name
                    } : undefined}
                    shippingProvider={summaryData?.shippingProvider ? {
                      name: summaryData.shippingProvider.name,
                      logo: summaryData.shippingProvider.logo
                    } : undefined}
                    currency="دج"
                  />
                </motion.div>

                {/* الوصف - تحت ملخص الطلب */}
                {product.description && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.9 }}
                    className="mt-6"
                  >
                    <ProductDescription 
                      description={product.description}
                      maxLength={200}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
});

ProductPurchasePageV3.displayName = 'ProductPurchasePageV3';

export default ProductPurchasePageV3; 