import React, { memo } from 'react';
import { ProductActions } from '@/components/product/ProductActions';
import ProductFeatures from '@/components/product/ProductFeatures';
import SafeHydrate from '@/utils/SafeHydrate';

interface ProductActionsSectionProps {
  totalPrice: number;
  deliveryFee: number;
  canPurchase: boolean;
  buyingNow: boolean;
  onBuyNow: () => void;
  isCalculatingDelivery: boolean;
  product: any;
  currency?: string;
  availableStock?: number;
  className?: string;
}

/**
 * مكون قسم أزرار الشراء والميزات المحسن للأداء
 * - يحتوي على أزرار الشراء وميزات المنتج
 * - يستخدم memo لمنع re-renders غير الضرورية
 */
export const ProductActionsSection = memo<ProductActionsSectionProps>(({
  totalPrice,
  deliveryFee,
  canPurchase,
  buyingNow,
  onBuyNow,
  isCalculatingDelivery,
  product,
  currency = "دج",
  availableStock,
  className = "space-y-4"
}) => {
  return (
    <div className={className}>
      {/* أزرار الشراء - محمي بـ SafeHydrate لتجنب مشاكل hydration */}
      <SafeHydrate>
        <ProductActions
          totalPrice={totalPrice}
          deliveryFee={deliveryFee}
          canPurchase={canPurchase}
          buyingNow={buyingNow}
          onBuyNow={onBuyNow}
          isCalculatingDelivery={isCalculatingDelivery}
          currency={currency}
          availableStock={availableStock}
        />
      </SafeHydrate>

      {/* ميزات المنتج */}
      <div>
        <ProductFeatures product={product} />
      </div>
    </div>
  );
});

ProductActionsSection.displayName = 'ProductActionsSection';
