import React, { useMemo, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { Separator } from '@/components/ui/separator';

// المكونات المستوردة
import ProductImageGalleryV2 from '@/components/product/ProductImageGalleryV2';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';
import ProductFeatures from '@/components/product/ProductFeatures';
import ProductFormRenderer from '@/components/product/ProductFormRenderer';
import ProductOfferTimer from '@/components/product/ProductOfferTimer';
import SpecialOffersDisplay from '@/components/store/special-offers/SpecialOffersDisplay';
import { ProductHeader } from '@/components/product/ProductHeader';
import { ProductDescription } from '@/components/product/ProductDescription';
import { ProductActions } from '@/components/product/ProductActions';

interface ProductMainSectionProps {
  product: any;
  state: any;
  actions: any;
  formData: any;
  formStrategy: any;
  summaryData: any;
  finalPriceCalculation: any;
  selectedOffer: any;
  isQuantityUpdatedByOffer: boolean;
  showValidationErrors: boolean;
  hasTriedToSubmit: boolean;
  submittedFormData: Record<string, any>;
  isSavingCart: boolean;
  onFormChange: (data: Record<string, any>) => void;
  onFormSubmit: (data: Record<string, any>) => void;
  onBuyNow: () => void;
  onQuantityChange: (quantity: number) => void;
  setSelectedOffer: (offer: any) => void;
  setIsQuantityUpdatedByOffer: (value: boolean) => void;
  setShowValidationErrors: (value: boolean) => void;
  setHasTriedToSubmit: (value: boolean) => void;
}

export const ProductMainSection: React.FC<ProductMainSectionProps> = React.memo(({
  product,
  state,
  actions,
  formData,
  formStrategy,
  summaryData,
  finalPriceCalculation,
  selectedOffer,
  isQuantityUpdatedByOffer,
  showValidationErrors,
  hasTriedToSubmit,
  submittedFormData,
  isSavingCart,
  onFormChange,
  onFormSubmit,
  onBuyNow,
  onQuantityChange,
  setSelectedOffer,
  setIsQuantityUpdatedByOffer,
  setShowValidationErrors,
  setHasTriedToSubmit
}) => {
  const {
    selectedColor,
    selectedSize,
    quantity,
    buyingNow,
    availableStock,
    canPurchase,
  } = state;

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
  } = actions;

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

  return (
    <div className="container mx-auto px-4 py-8 pt-20">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
        {/* قسم الصور */}
        <motion.div 
          className="lg:sticky lg:top-28"
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
              selectedOffer={selectedOffer}
              quantity={quantity}
              hideSpecialOfferDetails={(product as any).special_offers_config?.enabled && (product as any).special_offers_config?.offers?.length > 0}
            />
          </motion.div>

          {/* الكمية - يُخفى عندما تكون العروض الخاصة مُفعّلة */}
          {!((product as any).special_offers_config?.enabled && (product as any).special_offers_config?.offers?.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
              className="pt-3"
            >
              <ProductQuantitySelector
                quantity={quantity}
                onQuantityChange={onQuantityChange}
                maxQuantity={Math.min(availableStock, 100)}
                disabled={!canPurchase}
              />
            </motion.div>
          )}

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
              showValidation={showValidationErrors || hasTriedToSubmit}
              hasValidationError={!canPurchase && hasTriedToSubmit}
            />
          </motion.div>

          <Separator className="bg-border/50 dark:bg-border/30" />

          {/* العروض الخاصة */}
          {product.special_offers_config?.enabled && product.special_offers_config.offers?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.35 }}
              className="py-2"
            >
              <SpecialOffersDisplay
                config={product.special_offers_config}
                basePrice={product.pricing?.price || 0}
                onSelectOffer={(offer) => {
                  setSelectedOffer(offer);
                  
                  // تحديث الكمية تلقائياً لتتناسب مع العرض
                  if (offer) {
                    if (offer.quantity !== quantity) {
                      setIsQuantityUpdatedByOffer(true);
                      setQuantity(offer.quantity);
                    }
                  } else {
                    // إذا تم إلغاء العرض (اختيار "قطعة واحدة")، الرجوع للكمية 1
                    if (quantity !== 1) {
                      setIsQuantityUpdatedByOffer(true);
                      setQuantity(1);
                    }
                  }
                }}
                selectedOfferId={selectedOffer?.id}
              />
            </motion.div>
          )}

          {product.special_offers_config?.enabled && product.special_offers_config.offers?.length > 0 && (
            <Separator className="bg-border/50 dark:bg-border/30" />
          )}

          {/* أزرار الشراء */}
          <ProductActions
            totalPrice={finalPriceCalculation.price}
            deliveryFee={summaryData?.deliveryFee || 0}
            canPurchase={canPurchase}
            buyingNow={buyingNow}
            onBuyNow={onBuyNow}
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
                onFormSubmit={onFormSubmit}
                onFormChange={onFormChange}
                isLoading={buyingNow}
                isSubmitting={buyingNow}
                isLoadingDeliveryFee={summaryData?.isCalculating || false}
                isCalculatingDelivery={summaryData?.isCalculating || false}
                deliveryFee={summaryData?.deliveryFee}
                className="mb-4"
                // تمرير بيانات المنتج والمزامنة
                product={{
                  has_variants: product.variants?.has_variants,
                  colors: product.variants?.colors,
                  stock_quantity: product.inventory?.stock_quantity
                }}
                selectedColor={selectedColor}
                selectedSize={selectedSize}
                onColorSelect={setSelectedColor}
                onSizeSelect={setSelectedSize}
                // إضافة البيانات المالية
                subtotal={finalPriceCalculation.price}
                total={finalPriceCalculation.price + (summaryData?.deliveryFee || 0)}
                quantity={quantity}
                // إضافة معلومات الموقع للتحقق من التوصيل المجاني
                selectedProvince={summaryData?.selectedProvince ? {
                  id: summaryData.selectedProvince.id.toString(),
                  name: summaryData.selectedProvince.name
                } : undefined}
                selectedMunicipality={summaryData?.selectedMunicipality ? {
                  id: summaryData.selectedMunicipality.id.toString(),
                  name: summaryData.selectedMunicipality.name
                } : undefined}
              />

              {/* مؤشر حفظ الطلب المتروك */}
              {isSavingCart && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-3 mb-4"
                >
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                  <span>جاري حفظ بياناتك...</span>
                </motion.div>
              )}

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
                    advancedDescription={(product as any).advanced_description}
                    product={product}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
});

ProductMainSection.displayName = 'ProductMainSection';

