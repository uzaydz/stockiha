import React, { memo } from 'react';
import { Separator } from '@/components/ui/separator';
import ProductVariantSelector from '@/components/product/ProductVariantSelector';
import ProductQuantitySelector from '@/components/product/ProductQuantitySelector';

interface ProductVariantsSectionProps {
  product: any;
  selectedColor?: any;
  selectedSize?: any;
  quantity: number;
  availableStock: number;
  canPurchase: boolean;
  onColorSelect: (color: any) => void;
  onSizeSelect: (size: any) => void;
  onQuantityChange: (quantity: number) => void;
  showValidation: boolean;
  hasValidationError: boolean;
  className?: string;
}

/**
 * مكون قسم اختيار المتغيرات والكمية المحسن للأداء
 * - يحتوي على اختيار الألوان والمقاسات
 * - يحتوي على اختيار الكمية أسفل المتغيرات
 * - يستخدم memo لمنع re-renders غير الضرورية
 */
export const ProductVariantsSection = memo<ProductVariantsSectionProps>(({
  product,
  selectedColor,
  selectedSize,
  quantity,
  availableStock,
  canPurchase,
  onColorSelect,
  onSizeSelect,
  onQuantityChange,
  showValidation,
  hasValidationError,
  className = "space-y-6"
}) => {
  // فحص إذا كانت العروض الخاصة مفعلة
  const hasSpecialOffers = (product as any).special_offers_config?.enabled && 
    (product as any).special_offers_config?.offers?.length > 0;

  return (
    <div className={className}>
      <Separator className="bg-border/50 dark:bg-border/30" />
      
      <ProductVariantSelector
        product={product}
        selectedColor={selectedColor}
        selectedSize={selectedSize}
        onColorSelect={onColorSelect}
        onSizeSelect={onSizeSelect}
        showValidation={showValidation}
        hasValidationError={hasValidationError}
      />

      {/* الكمية - يُخفى عندما تكون العروض الخاصة مُفعّلة */}
      {!hasSpecialOffers && (
        <div className="pt-3">
          <ProductQuantitySelector
            quantity={quantity}
            onQuantityChange={onQuantityChange}
            maxQuantity={Math.min(availableStock, 100)}
            disabled={!canPurchase}
          />
        </div>
      )}
    </div>
  );
});

ProductVariantsSection.displayName = 'ProductVariantsSection';
