import React, { memo, useCallback } from 'react';
import { Separator } from '@/components/ui/separator';
import SpecialOffersDisplay from '@/components/store/special-offers/SpecialOffersDisplay';

interface ProductSpecialOffersSectionProps {
  product: any;
  selectedOffer?: any;
  quantity: number;
  onSelectOffer: (offer: any) => void;
  onQuantityChange: (quantity: number) => void;
  setIsQuantityUpdatedByOffer: (value: boolean) => void;
  className?: string;
}

/**
 * مكون قسم العروض الخاصة المحسن للأداء
 * - يستخدم useCallback لمنع إعادة إنشاء الدوال
 * - يظهر فقط عندما تكون العروض مفعلة
 */
export const ProductSpecialOffersSection = memo<ProductSpecialOffersSectionProps>(({
  product,
  selectedOffer,
  quantity,
  onSelectOffer,
  onQuantityChange,
  setIsQuantityUpdatedByOffer,
  className = "py-2"
}) => {
  // فحص إذا كانت العروض الخاصة مفعلة
  const hasSpecialOffers = product.special_offers_config?.enabled && 
    product.special_offers_config.offers?.length > 0;

  // لا تظهر إذا لم تكن هناك عروض خاصة
  if (!hasSpecialOffers) {
    return null;
  }

  // معالج اختيار العرض مع تحديث الكمية تلقائياً
  const handleOfferSelect = useCallback((offer: any) => {
    onSelectOffer(offer);
    
    // تحديث الكمية تلقائياً لتتناسب مع العرض
    if (offer) {
      if (offer.quantity !== quantity) {
        setIsQuantityUpdatedByOffer(true);
        onQuantityChange(offer.quantity);
      }
    } else {
      // إذا تم إلغاء العرض (اختيار "قطعة واحدة")، الرجوع للكمية 1
      if (quantity !== 1) {
        setIsQuantityUpdatedByOffer(true);
        onQuantityChange(1);
      }
    }
  }, [quantity, onSelectOffer, onQuantityChange, setIsQuantityUpdatedByOffer]);

  return (
    <>
      <div className={className}>
        <SpecialOffersDisplay
          config={product.special_offers_config}
          basePrice={product.pricing?.price || 0}
          onSelectOffer={handleOfferSelect}
          selectedOfferId={selectedOffer?.id}
        />
      </div>
      
      <Separator className="bg-border/50 dark:bg-border/30" />
    </>
  );
});

ProductSpecialOffersSection.displayName = 'ProductSpecialOffersSection';
