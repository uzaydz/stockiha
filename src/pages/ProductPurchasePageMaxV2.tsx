import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShoppingCartIcon, 
  HeartIcon, 
  ShareIcon,
  TruckIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

import useProductPurchase from '@/hooks/useProductPurchase';
import { useProductPage } from '@/context/ProductPageContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// مكونات محسنة للصفحة
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import ProductFeatures from '@/components/product/ProductFeatures';
import ProductShippingInfo from '@/components/product/ProductShippingInfo';

import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductPurchaseSummary from '@/components/product/ProductPurchaseSummary';

// 🆕 إضافة مكون مؤقت العرض المحسن
import ProductOfferTimer from '@/components/product/ProductOfferTimer';

// استيراد حاسبة التوصيل الجديدة 🆕
import { 
  calculateDeliveryFeesOptimized,
  getProvinceById, 
  getMunicipalityById,
  testDeliveryData,
  type DeliveryCalculationResult 
} from '@/lib/delivery-calculator';

// ====================================================================
// 🚀 تحسينات الأداء الذكية - نظام SmartProviderWrapper التلقائي
// ✅ النظام يحدد تلقائياً أن هذه صفحة 'public-product' ويحمل فقط:
//    - ProductPageContext (3-4 استدعاءات فقط)
//    - بدون UnifiedDataContext (يوفر 200+ منتج)
//    - بدون OrganizationDataContext (يوفر فئات + إعدادات + موظفين)
//    - بدون DashboardDataProvider (يوفر تحليلات + مبيعات)
// ✅ من 30+ استدعاء إلى 3-4 استدعاءات فقط!
// ====================================================================

const ProductPurchasePageMaxV2: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { organization } = useProductPage();
  
  // حالة لبيانات النموذج المدخلة
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, any>>({});
  
  // حالة حساب رسوم التوصيل 🆕
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // استخدام hook المخصص لإدارة حالة المنتج (أولاً بدون organizationId)
  const [state, actions] = useProductPurchase({
    productId,
    organizationId: organization?.id || undefined,
    dataScope: 'ultra'
  });

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

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
    addToCart,
    buyNow,
    toggleWishlist,
    shareProduct
  } = actions;

  // الحصول على organizationId مع تثبيت القيمة (بعد تعريف product)
  const organizationId = useMemo(() => {
    // أولوية للمنظمة الحالية، ثم منظمة المنتج كبديل
    const id = (organization as any)?.id || (product?.organization as any)?.id || null;
    return id;
  }, [(organization as any)?.id, (product?.organization as any)?.id]);

  // 🆕 إعداد مؤقت العرض - مع معالجة أفضل للأنواع المختلفة
  const marketingSettings = product?.marketing_settings as any; // النوع الآمن
  const offerTimerEnabled = marketingSettings?.offer_timer_enabled === true;
  
  const offerTimerSettings = useMemo(() => {
    if (!marketingSettings || !offerTimerEnabled) return null;
    
    // تحديد نوع المؤقت - إذا كان specific_date لكن لا توجد end_date، استخدم evergreen
    let timerType = marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor';
    if (timerType === 'specific_date' && !marketingSettings.offer_timer_end_date) {
      timerType = 'evergreen';
    }
    
    // إذا لم يكن هناك duration للـ evergreen، استخدم 60 دقيقة افتراضياً
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
  }, [marketingSettings, offerTimerEnabled]);

  // تسجيل حالة مؤقت العرض في وضع التطوير
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
    }
  }, [product?.id, marketingSettings, offerTimerEnabled, offerTimerSettings]);

  // مراقبة بيانات المنظمة مع المنتج 🔍
  useEffect(() => {
  }, [organization, organizationId, product]);

  // حساب رسوم التوصيل عند تغيير البيانات 🆕 (مع debouncing)
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

        // وزن المنتج افتراضي 1 كيلو (يمكن تحسينه لاحقاً من إعدادات المنتج)
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
            code: 'yalidine', // افتراضياً ياليدين
            name: 'ياليدين',
            type: 'yalidine' as const
          },
          // 🆕 إضافة معلومات الشحن من المنتج
          productShippingInfo: product?.shipping_and_templates?.shipping_info || undefined
        };

        // استخدام النسخة المحسنة الجديدة التي تدعم جميع شركات التوصيل
        const result = await calculateDeliveryFeesOptimized(deliveryInput);

        setDeliveryCalculation(result);
        
      } catch (error) {
        setDeliveryCalculation(null);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    // إضافة debouncing بتأخير 500ms لتجنب الطلبات المتعددة السريعة
    const timeoutId = setTimeout(calculateDelivery, 500);
    
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

  // حساب بيانات الملخص التفاعلية 🔄
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
  }, [product, deliveryCalculation, isCalculatingDelivery, submittedFormData]);

  // معالجة الشراء المباشر مع التنقل
  const handleBuyNow = async () => {
    const result = await buyNow();
    if (result.success) {
      navigate('/checkout', {
        state: {
          orderData: result.data,
          fromProductPage: true
        }
      });
    }
  };

  // اختبار البيانات عند التحميل 🧪
  React.useEffect(() => {
    const testResults = testDeliveryData();
  }, []);

  // حالة التحميل
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Skeleton للصور */}
            <div className="space-y-4">
              <Skeleton className="aspect-square w-full rounded-xl" />
              <div className="grid grid-cols-4 gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="aspect-square rounded-lg" />
                ))}
              </div>
            </div>
            
            {/* Skeleton للمعلومات */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-8 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="flex space-x-2">
                  <Skeleton className="h-6 w-16" />
                  <Skeleton className="h-6 w-20" />
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Skeleton className="h-12 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
              
              <Separator />
              
              <div className="space-y-4">
                <Skeleton className="h-6 w-20" />
                <div className="flex space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="w-12 h-12 rounded-full" />
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // حالة الخطأ
  if (error || !product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-2xl">😔</span>
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {error || 'المنتج غير موجود'}
            </h2>
            
            <p className="text-gray-600 mb-6">
              عذراً، لم نتمكن من العثور على هذا المنتج أو حدث خطأ في تحميله
            </p>
            
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/products')}
                className="w-full"
              >
                تصفح المنتجات
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
                className="w-full"
              >
                العودة للرئيسية
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* شريط التنقل العلوي */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="flex items-center gap-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              رجوع
            </Button>
            
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleWishlist}
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
                onClick={shareProduct}
                className="p-2"
              >
                <ShareIcon className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* قسم الصور */}
          <div className="lg:sticky lg:top-24">
            <ProductImageGalleryV2 
              product={product} 
              selectedColor={selectedColor}
            />
          </div>

          {/* قسم المعلومات والشراء */}
          <div className="space-y-6">
            {/* العنوان والمعلومات الأساسية */}
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div>
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

              {/* الشارات والميزات */}
              <div className="flex flex-wrap items-center gap-2">
                {product.status.is_new && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    <CheckCircleIcon className="w-3 h-3 ml-1" />
                    جديد
                  </Badge>
                )}
                
                {product.status.is_featured && (
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">
                    مميز
                  </Badge>
                )}
                
                {availableStock > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                    متوفر
                  </Badge>
                )}
                
                {availableStock <= 5 && availableStock > 0 && (
                  <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                    كمية محدودة
                  </Badge>
                )}
              </div>

              {/* الوصف */}
              {product.description && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}
            </motion.div>

            <Separator />

            {/* عرض السعر */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <ProductPriceDisplay
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                quantity={quantity}
              />
            </motion.div>

            {/* 🆕 مؤقت العرض المحسن */}
            {offerTimerEnabled && offerTimerSettings && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
                className="my-6"
              >
                <ProductOfferTimer 
                  settings={offerTimerSettings}
                  theme="default"
                  className="w-full"
                />
              </motion.div>
            )}

            <Separator />

            {/* اختيار المتغيرات والكمية */}
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <ProductVariantSelector
                product={product}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorSelect={setSelectedColor}
                onSizeSelect={setSelectedSize}
              />

              <ProductQuantitySelector
                quantity={quantity}
                onQuantityChange={setQuantity}
                maxQuantity={Math.min(availableStock, 100)}
                disabled={!canPurchase}
              />
            </motion.div>

            <Separator />

            {/* أزرار الشراء */}
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Button
                onClick={handleBuyNow}
                disabled={!canPurchase || buyingNow}
                className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                {buyingNow ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    جاري المعالجة...
                  </div>
                ) : (
                  `اشتري الآن - ${totalPrice.toLocaleString()} دج`
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={addToCart}
                disabled={!canPurchase || addingToCart}
                className="w-full h-12 text-lg font-semibold border-2"
                size="lg"
              >
                <ShoppingCartIcon className="w-5 h-5 ml-2" />
                {addingToCart ? 'جاري الإضافة...' : 'أضف إلى السلة'}
              </Button>
            </motion.div>

            {/* معلومات المخزون */}
            {availableStock > 0 && (
              <motion.div 
                className="p-4 bg-green-50 rounded-lg border border-green-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700 font-medium">
                    متوفر في المخزون
                  </span>
                  <span className="text-green-600">
                    {availableStock} قطعة متبقية
                  </span>
                </div>
              </motion.div>
            )}

            <Separator />

            {/* ميزات المنتج */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              <ProductFeatures product={product} />
            </motion.div>

            <Separator />

            {/* معلومات الشحن */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.6 }}
            >
              <ProductShippingInfo product={product} />
            </motion.div>

            {/* النماذج (مخصص أو افتراضي) 🆕 */}
            {formData && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.7 }}
              >
                <Separator className="mb-6" />
                <ProductFormRenderer
                  formData={formData}
                  formStrategy={formStrategy}
                  onFormSubmit={(data) => {
                    setSubmittedFormData(data);
                    // هنا يمكن معالجة بيانات النموذج لإنشاء الطلب
                  }}
                  onFormChange={(data) => {
                    setSubmittedFormData(data);
                  }}
                  loading={buyingNow}
                  className="mb-4"
                />
                
                {/* إظهار معلومات النموذج للتطوير */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs">
                    <div className="font-medium text-gray-700 mb-1">
                      🔧 معلومات النموذج (وضع التطوير):
                    </div>
                    <div className="text-gray-600">
                      <span className="font-medium">النوع:</span> {formStrategy} <br />
                      <span className="font-medium">الاسم:</span> {formData.name} <br />
                      <span className="font-medium">عدد الحقول:</span> {formData.fields.length} <br />
                      <span className="font-medium">نموذج مخصص:</span> {hasCustomForm ? 'نعم' : 'لا'}
                    </div>
                  </div>
                )}

                {/* ملخص الطلب 🆕 */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.8 }}
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
                      price_modifier: selectedColor.price ? selectedColor.price - product.pricing?.price : 0
                    } : undefined}
                    selectedSize={selectedSize ? {
                      name: selectedSize.size_name,
                      value: selectedSize.size_name,
                      price_modifier: selectedSize.price ? selectedSize.price - product.pricing?.price : 0
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
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};



export default ProductPurchasePageMaxV2;

/* 
🎉 تم حل مشكلة الأداء بنجاح!

✅ النتيجة: من 30+ استدعاء API إلى 3-4 استدعاءات فقط
✅ SmartProviderWrapper يحدد تلقائياً نوع الصفحة ويحمل الـ providers المناسبة فقط
✅ لا حاجة لتعديل الكود في المستقبل - النظام ذكي وتلقائي

📊 الإحصائيات:
- صفحات المنتجات: ProductPageContext فقط
- صفحات المتجر: TenantContext + OrganizationDataContext + ShopContext  
- لوحة التحكم: جميع الـ contexts (للوظائف الكاملة)
- صفحات المصادقة: AuthContext فقط
- صفحات الهبوط: الحد الأدنى من الـ contexts

🔧 للمطورين: 
- لإضافة صفحة جديدة، فقط حدد نوعها في determinePageType()
- لتخصيص الـ providers، عدّل PROVIDER_CONFIGS
*/
