import React, { memo } from 'react';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';

interface ProductInfoSectionProps {
  product: any;
  selectedColor?: any;
  selectedSize?: any;
  selectedOffer?: any;
  quantity: number;
  availableStock: number;
  canPurchase: boolean;
  onQuantityChange: (quantity: number) => void;
  className?: string;
}

/**
 * مكون قسم المعلومات الأساسية للمنتج
 * - يحتوي على السعر فقط
 * - محسن للأداء مع memo
 * - تم إزالة ProductHeader لتجنب التكرار
 */
export const ProductInfoSection = memo<ProductInfoSectionProps>(({
  product,
  selectedColor,
  selectedSize,
  selectedOffer,
  quantity,
  availableStock,
  canPurchase,
  onQuantityChange,
  className = "space-y-4"
}) => {
  // فحص إذا كانت العروض الخاصة مفعلة
  const hasSpecialOffers = (product as any).special_offers_config?.enabled && 
    (product as any).special_offers_config?.offers?.length > 0;

  return (
    <div className={className}>
      {/* عرض السعر */}
      <div className="pt-2">
        <ProductPriceDisplay
          product={product}
          selectedColor={selectedColor}
          selectedSize={selectedSize}
          selectedOffer={selectedOffer}
          quantity={quantity}
          hideSpecialOfferDetails={hasSpecialOffers}
        />
      </div>
    </div>
  );
});

ProductInfoSection.displayName = 'ProductInfoSection';
