import { useParams, useNavigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTenant } from '@/context/TenantContext';
import type { Product, UpsellDownsellItem } from '@/lib/api/products';
import QueryVisualizer from '@/components/debug/QueryVisualizer';
import React from 'react';

// Components
import Navbar from '@/components/Navbar';
import StoreFooter from '@/components/store/StoreFooter';
import ProductBreadcrumb from '@/components/store/product/ProductBreadcrumb';
import ProductDescription from '@/components/store/product/ProductDescription';

// مكونات العروض والمؤقت
import OfferTimer from '@/components/store/OfferTimer';

// مكونات تتبع التحويلات
import ProductTrackingWrapper from '@/components/tracking/ProductTrackingWrapper';

// استيراد المكونات المستخرجة الجديدة
import {
  useProductState,
  useProductDataLoader,
  useProductSelection,
  useProductPrice,
  useStickyButtonLogic,
  // مكونات واجهة المستخدم
  ProductMainInfo,
  ProductTimerSection,
  ProductGalleryWithAnimation,
  ProductFeaturesWithAnimation,
  ProductOptionsWithAnimation,
  LoadingProgressBar,
  SuspenseFallback,
  LoadingState,
  ErrorState,
  StickyButton,
  // مكونات أخرى
  UpsellDownsellDisplay
} from '@/components/store/product-purchase';

// Lazy-loaded components
const OrderForm = lazy(() => import('@/components/store/OrderForm'));
const QuantityOffersDisplay = lazy(() => import('@/components/store/product/QuantityOffersDisplay'));

const ProductPurchase = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { currentOrganization, isLoading: isOrganizationLoading } = useTenant();
  
  // استخدام الخطافات المستخرجة
  const {
    product,
    setProduct,
    isLoading,
    setIsLoading,
    selectedColor,
    setSelectedColor,
    sizes,
    setSizes,
    selectedSize,
    setSelectedSize,
    quantity,
    setQuantity,
    error,
    setError,
    customFormFields,
    setCustomFormFields,
    formSettings,
    setFormSettings,
    effectiveProduct,
    setEffectiveProduct,
    effectivePrice,
    setEffectivePrice,
    marketingSettings,
    setMarketingSettings,
    orderFormRef,
    dataFetchedRef
  } = useProductState();

  // استخدام خطاف تحميل بيانات المنتج
  useProductDataLoader({
    slug,
    organizationId: currentOrganization?.id,
    isOrganizationLoading,
    setIsLoading,
    setError,
    setProduct,
    setEffectiveProduct,
    setSelectedColor,
    setSizes,
    setSelectedSize,
    setFormSettings,
    setCustomFormFields,
    setMarketingSettings,
    dataFetchedRef
  });

  // استخدام خطاف معالجة اختيار المنتج
  const {
    handleColorSelect,
    handleSizeSelect,
    handleQuantityChange,
    handleAcceptOffer
  } = useProductSelection({
    product,
    setSelectedColor,
    setSelectedSize,
    setSizes,
    setQuantity,
    setEffectiveProduct,
    effectiveProduct
  });

  // استخدام خطاف حساب الأسعار
  const {
    calculatePrice,
    getAvailableQuantity
  } = useProductPrice({
    product,
    selectedSize,
    selectedColor,
    effectiveProduct,
    setEffectivePrice
  });

  // استخدام خطاف الزر اللاصق
  const { showStickyButton, scrollToOrderForm } = useStickyButtonLogic(orderFormRef);

  // معالجة تغيير الكمية
  const handleProductQuantityChange = (newQuantity: number) => {
    handleQuantityChange(newQuantity, getAvailableQuantity());
    
    // تتبع add_to_cart عند زيادة الكمية
    if (newQuantity > quantity && product && typeof window !== 'undefined') {
      try {
        fetch('/api/conversion-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            product_id: effectiveProduct?.id || product.id,
            event_type: 'add_to_cart',
            platform: 'multiple',
            custom_data: {
              product_name: product.name,
              quantity: newQuantity,
              unit_price: calculatePrice(),
              total_price: calculatePrice() * newQuantity,
              currency: 'DZD',
              selected_color: selectedColor?.name,
              selected_size: selectedSize?.size_name,
              page_type: 'product_view'
            }
          })
        });

        // تتبع البكسل أيضاً
        if ((window as any).trackConversion) {
          (window as any).trackConversion('add_to_cart', {
            value: calculatePrice() * newQuantity,
            currency: 'DZD',
            content_type: 'product',
            content_ids: [effectiveProduct?.id || product.id],
            num_items: newQuantity
          });
        }
      } catch (error) {
        console.warn('تحذير: فشل في تتبع add_to_cart:', error);
      }
    }
  };

  // استخدام إعدادات مؤقت العرض من الحالة المنفصلة
  const offerTimerEnabled = marketingSettings?.offer_timer_enabled || false;
  const offerTimerSettings = marketingSettings && offerTimerEnabled ? {
    offer_timer_enabled: marketingSettings.offer_timer_enabled || false,
    offer_timer_title: marketingSettings.offer_timer_title || undefined,
    offer_timer_type: (marketingSettings.offer_timer_type as 'evergreen' | 'specific_date' | 'fixed_duration_per_visitor') || 'evergreen',
    offer_timer_end_date: marketingSettings.offer_timer_end_date || undefined,
    offer_timer_duration_minutes: marketingSettings.offer_timer_duration_minutes || 60,
    offer_timer_text_above: marketingSettings.offer_timer_text_above || undefined,
    offer_timer_text_below: marketingSettings.offer_timer_text_below || undefined,
    offer_timer_end_action: (marketingSettings.offer_timer_end_action as 'hide' | 'show_message' | 'redirect') || 'hide',
    offer_timer_end_action_message: marketingSettings.offer_timer_end_action_message || undefined,
    offer_timer_end_action_url: marketingSettings.offer_timer_end_action_url || undefined,
    offer_timer_restart_for_new_session: marketingSettings.offer_timer_restart_for_new_session || false,
    offer_timer_cookie_duration_days: marketingSettings.offer_timer_cookie_duration_days || 30,
    offer_timer_show_on_specific_pages_only: marketingSettings.offer_timer_show_on_specific_pages_only || false,
    offer_timer_specific_page_urls: marketingSettings.offer_timer_specific_page_urls || []
  } : null;

  // تسجيل حالة مؤقت العرض في وضع التطوير
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🕐 حالة مؤقت العرض:', {
        productId: product?.id,
        marketingSettings,
        offerTimerEnabled,
        offerTimerSettings,
      });
    }
  }, [product?.id, marketingSettings, offerTimerEnabled, offerTimerSettings]);

  const timerConfig = product?.purchase_page_config?.timer;
  const quantityOffers = product?.purchase_page_config?.quantityOffers as any[] | undefined;

  let activeOffer: any | null = null; 
  if (quantityOffers && quantityOffers.length > 0) {
    const applicableOffers = quantityOffers
      .filter(offer => quantity >= offer.minQuantity)
      .sort((a, b) => b.minQuantity - a.minQuantity);
    if (applicableOffers.length > 0) activeOffer = applicableOffers[0];
  }

  const shouldShowPartialContent = !isLoading && !error && product;
  const shouldShowFullContent = !isLoading && !error && product;

  return (
    <div className="w-full min-h-screen bg-background">
      <Navbar />
      <LoadingProgressBar isVisible={isLoading || isOrganizationLoading} />
      <div className="container mx-auto py-4 px-4 md:px-6">
        {isLoading || isOrganizationLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState error={error} onBack={() => navigate(-1)} />
        ) : shouldShowPartialContent ? (
          <>
            {/* Product Breadcrumb - START */}
            {(() => {
              let categoryName: string | undefined = "المنتجات";
              let categorySlug: string | undefined = "products";

              const category = product.category;

              if (category && typeof category === 'object' && category !== null) {
                // After these checks, we are reasonably sure category is the object type.
                // We use type assertion as a last resort to satisfy the linter.
                categoryName = (category as { name: string; slug: string }).name;
                categorySlug = (category as { name: string; slug: string }).slug;
              } else if (typeof category === 'string') {
                categoryName = category;
                categorySlug = "products"; 
              }

              return (
                <div className="mb-6">
                  <ProductBreadcrumb 
                    productName={product.name}
                    categoryName={categoryName}
                    categorySlug={categorySlug}
                  />
                </div>
              );
            })()}
            {/* Product Breadcrumb - END */}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
              <div className="order-1 md:order-1 mb-6 md:mb-0">
                <div className="md:sticky md:top-24">
                  <ProductGalleryWithAnimation 
                    mainImage={product.thumbnail_image}
                    additionalImages={product.additional_images || []}
                    productName={product.name}
                  />
                </div>
              </div>
              
              <div className="order-2 md:order-2 flex flex-col space-y-6">
                <ProductMainInfo 
                  product={product}
                  calculatePrice={calculatePrice}
                />
                
                {/* عرض مؤقت العرض من إعدادات المنتج */}
                {offerTimerEnabled && offerTimerSettings && (
                  <OfferTimer 
                    settings={offerTimerSettings}
                    position="below-price"
                    showProgress={false}
                    className="mb-4"
                  />
                )}
                
                {/* عرض مؤقت العرض القديم إذا كان مفعلاً (للتوافق العكسي) */}
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
                    colors={product?.colors || []}
                    sizes={sizes}
                    selectedColor={selectedColor}
                    selectedSize={selectedSize}
                    onColorSelect={handleColorSelect}
                    onSizeSelect={handleSizeSelect}
                    quantity={quantity}
                    maxQuantity={getAvailableQuantity()}
                    onQuantityChange={handleProductQuantityChange}
                    loadingSizes={false}
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
                        onQuantityChange={handleProductQuantityChange}
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
            
            <AnimatePresence>
              {showStickyButton && (
                <StickyButton onClick={scrollToOrderForm} />
              )}
            </AnimatePresence>
          </>
        ) : null}
      </div>
      
      {/* تتبع التحويلات - تحميل البكسلات وتتبع عرض المحتوى */}
      {product && (
        <ProductTrackingWrapper
          productId={effectiveProduct?.id || product.id}
          eventType="view_content"
          value={calculatePrice()}
          currency="DZD"
          customData={{
            product_name: product.name,
            category: typeof product.category === 'object' ? 
              (product.category as { name: string }).name : 
              product.category,
            page_type: 'product_view',
            selected_color: selectedColor?.name,
            selected_size: selectedSize?.size_name,
            quantity: quantity
          }}
          loadPixels={true} // تحميل البكسلات في صفحة المنتج
        />
      )}
      
      {/* إضافة عارض استعلامات Supabase */}
      <div className="container mx-auto py-6 px-4 md:px-6">
        <QueryVisualizer />
      </div>
      <StoreFooter />
    </div>
  );
};

export default ProductPurchase; 