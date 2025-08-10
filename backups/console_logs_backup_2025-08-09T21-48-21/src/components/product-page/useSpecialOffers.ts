import { useState, useEffect, useMemo } from 'react';
import { 
  getBestSpecialOffer,
  getSpecialOfferSummary,
  type SpecialOffer 
} from '@/lib/api/productComplete';

interface UseSpecialOffersProps {
  product: any;
  quantity: number;
  priceInfo: any;
}

export const useSpecialOffers = ({
  product,
  quantity,
  priceInfo
}: UseSpecialOffersProps) => {
  const [selectedOffer, setSelectedOffer] = useState<SpecialOffer | null>(null);
  const [isQuantityUpdatedByOffer, setIsQuantityUpdatedByOffer] = useState(false);

  // اختيار أفضل عرض تلقائياً عند تغيير الكمية
  useEffect(() => {
    if (product && (product as any).special_offers_config?.enabled) {
      // تجاهل التحديث إذا كان بسبب اختيار عرض
      if (isQuantityUpdatedByOffer) {
        setIsQuantityUpdatedByOffer(false);
        return;
      }

      const bestOffer = getBestSpecialOffer(product as any, quantity);
      
      // التحقق من أن العرض المقترح مختلف عن العرض الحالي لتجنب التحديث المستمر
      if (bestOffer?.id !== selectedOffer?.id) {
        setSelectedOffer(bestOffer);
      }
    }
  }, [product, quantity, isQuantityUpdatedByOffer, selectedOffer?.id]);

  // حساب السعر النهائي مع العروض الخاصة
  const finalPriceCalculation = useMemo(() => {
    if (!product) return { price: 0, quantity: 0, savings: 0, offerApplied: false };
    
    const offerSummary = getSpecialOfferSummary(product as any, selectedOffer, quantity);
    
    return {
      // استخدام السعر الصحيح - offerSummary.finalPrice يحتوي على السعر الكلي للعرض
      // بينما priceInfo?.price يحتوي على السعر الكلي العادي (مضروب في الكمية)
      price: offerSummary.offerApplied ? offerSummary.finalPrice : (priceInfo?.price || 0),
      quantity: offerSummary.finalQuantity,
      savings: offerSummary.savings,
      offerApplied: offerSummary.offerApplied
    };
  }, [product, selectedOffer, quantity, priceInfo?.price]);

  return {
    selectedOffer,
    setSelectedOffer,
    isQuantityUpdatedByOffer,
    setIsQuantityUpdatedByOffer,
    finalPriceCalculation
  };
};


