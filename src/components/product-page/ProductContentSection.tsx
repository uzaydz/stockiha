import React, { memo } from 'react';
import { ProductInfoSection } from './ProductInfoSection';
import { ProductOfferTimerSection } from './ProductOfferTimerSection';
import { ProductVariantsSection } from './ProductVariantsSection';
import { ProductSpecialOffersSection } from './ProductSpecialOffersSection';
import { ProductActionsSection } from './ProductActionsSection';
import { ProductFormSection } from './ProductFormSection';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowDownToLine } from 'lucide-react';
import { scrollToPurchaseForm } from '@/utils/scrollToPurchaseForm';
import { useSafeTranslation } from '@/components/safe-i18n/SafeTranslationProvider';

interface ProductContentSectionProps {
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
  updateCurrentFormData: (data: Record<string, any>) => void;
  className?: string;
  showAddToCart?: boolean;
}

/**
 * مكون قسم المحتوى الرئيسي المحسن للأداء
 * - يجمع جميع الأقسام الفرعية في مكان واحد
 * - يستخدم memo لمنع re-renders غير الضرورية
 * - ينظم تدفق البيانات بين المكونات
 */
export const ProductContentSection = memo<ProductContentSectionProps>(({
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
  setHasTriedToSubmit,
  updateCurrentFormData,
  // تصميم موحد ومتسق مع ألوان وتباعد النظام
  className = "space-y-6",
  showAddToCart = false
}) => {
  // ✅ إصلاح React Error #310: استدعاء hooks بشكل غير مشروط دائماً في أعلى المكون
  // 🔒 Hook calls must always happen in the same order and before any early returns
  const { t } = useSafeTranslation();
  
  // ✅ تأكد من أن جميع المتغيرات تُستخرج بعد useTranslation مباشرة
  const {
    selectedColor,
    selectedSize,
    quantity,
    buyingNow,
    availableStock,
    canPurchase,
  } = state || {};

  const {
    setSelectedColor,
    setSelectedSize,
    setQuantity,
  } = actions || {};

  // إنشاء دوال مع تسجيل للتتبع
  const handleSetSelectedColor = (color: any) => {
    setSelectedColor(color);
  };

  const handleSetSelectedSize = (size: any) => {
    setSelectedSize(size);
  };

  // تمرير سلس للنموذج السفلي (ProductFormRenderer)
  const handleScrollToOrderForm = async () => {
    await scrollToPurchaseForm();
  };

  return (
    <div className={className}>
      {/* قسم المعلومات الأساسية */}
      <ProductInfoSection
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        selectedOffer={selectedOffer}
        quantity={quantity}
        availableStock={availableStock}
        canPurchase={canPurchase}
        onQuantityChange={onQuantityChange}
      />

      {/* قسم مؤقت العرض */}
      <ProductOfferTimerSection product={product} />

      {/* قسم اختيار المتغيرات */}
      <ProductVariantsSection
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        quantity={quantity}
        availableStock={availableStock}
        canPurchase={canPurchase}
        onColorSelect={handleSetSelectedColor}
        onSizeSelect={handleSetSelectedSize}
        onQuantityChange={onQuantityChange}
        showValidation={showValidationErrors || hasTriedToSubmit}
        hasValidationError={!canPurchase && hasTriedToSubmit}
      />

      {/* قسم العروض الخاصة */}
      <ProductSpecialOffersSection
        product={product}
        selectedOffer={selectedOffer}
        quantity={quantity}
        onSelectOffer={setSelectedOffer}
        onQuantityChange={setQuantity}
        setIsQuantityUpdatedByOffer={setIsQuantityUpdatedByOffer}
      />

      {/* قسم أزرار الشراء والميزات */}
      <ProductActionsSection
        totalPrice={finalPriceCalculation?.price ?? 0}
        deliveryFee={summaryData?.deliveryFee || 0}
        canPurchase={canPurchase}
        buyingNow={buyingNow}
        onBuyNow={onBuyNow}
        isCalculatingDelivery={summaryData?.isCalculating || false}
        product={product}
        availableStock={availableStock}
      />

      {showAddToCart && (
        <div
          className="rounded-xl border border-border/50 bg-card/60 backdrop-blur p-3 sm:p-4 shadow-sm"
          role="group"
          aria-label={t('productContent.purchaseActions')}
        >
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* زر اطلب الآن - أساسي وواضح */}
            <Button
              onClick={handleScrollToOrderForm}
              aria-label={t('productContent.orderNow')}
              className="h-12 sm:flex-[1.3] rounded-lg text-base md:text-lg font-bold
                         bg-gradient-to-r from-primary to-primary/90
                         hover:from-primary/90 hover:to-primary
                         shadow-md hover:shadow-lg
                         transition-all duration-200
                         focus-visible:ring-2 focus-visible:ring-primary/30"
              size="lg"
            >
              <ArrowDownToLine className="w-5 h-5 ml-2" />
              {t('productContent.orderNow')}
            </Button>

            {/* زر أضف إلى السلة - ثانوي وأنيق */}
            <Button
              variant="outline"
              onClick={actions?.addToCart}
              disabled={!canPurchase || state?.addingToCart}
              aria-busy={state?.addingToCart ? 'true' : 'false'}
              aria-label={state?.addingToCart ? t('productContent.addingToCart') : t('productContent.addToCart')}
              className="h-12 sm:flex-1 rounded-lg text-base md:text-lg font-semibold
                         border border-border/60 bg-background/80
                         hover:bg-accent/60 hover:text-accent-foreground
                         transition-all duration-200"
              size="lg"
            >
              <ShoppingCart className="w-5 h-5 ml-2" />
              {state?.addingToCart ? t('productContent.addingToCart') : t('productContent.addToCart')}
            </Button>
          </div>
        </div>
      )}

      {/* قسم النماذج والوصف */}
      <ProductFormSection
        formData={formData}
        formStrategy={formStrategy}
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        finalPriceCalculation={finalPriceCalculation}
        summaryData={summaryData}
        quantity={quantity}
        buyingNow={buyingNow}
        isSavingCart={isSavingCart}
        onFormSubmit={onFormSubmit}
        onFormChange={onFormChange}
        onColorSelect={handleSetSelectedColor}
        onSizeSelect={handleSetSelectedSize}
        updateCurrentFormData={updateCurrentFormData}
      />
    </div>
  );
});

ProductContentSection.displayName = 'ProductContentSection';
