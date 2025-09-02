import React, { memo } from 'react';
import { ProductInfoSection } from './ProductInfoSection';
import { ProductOfferTimerSection } from './ProductOfferTimerSection';
import { ProductVariantsSection } from './ProductVariantsSection';
import { ProductSpecialOffersSection } from './ProductSpecialOffersSection';
import { ProductActionsSection } from './ProductActionsSection';
import { ProductFormSection } from './ProductFormSection';

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
  className = "space-y-4"
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

  // إنشاء دوال مع تسجيل للتتبع
  const handleSetSelectedColor = (color: any) => {
    setSelectedColor(color);
  };

  const handleSetSelectedSize = (size: any) => {
    setSelectedSize(size);
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
        totalPrice={finalPriceCalculation.price}
        deliveryFee={summaryData?.deliveryFee || 0}
        canPurchase={canPurchase}
        buyingNow={buyingNow}
        onBuyNow={onBuyNow}
        isCalculatingDelivery={summaryData?.isCalculating || false}
        product={product}
        availableStock={availableStock}
      />

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
