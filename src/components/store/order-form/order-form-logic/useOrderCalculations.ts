import { useMemo } from "react";

// Assuming ActiveOfferType is defined elsewhere, possibly in OrderFormTypes.ts
// If not, it needs to be defined or imported.
interface ActiveOfferType {
  type: string;
  discountValue?: number;
  freeShipping?: boolean;
  // Add any other properties of activeOffer used in calculations
  id?: string | number; // Example, adjust as needed
  minQuantity?: number; // Example, adjust as needed
}

export const useOrderCalculations = (
  basePrice: number,
  quantity: number,
  activeOffer: ActiveOfferType | null | undefined
) => {
  const subtotal = useMemo(() => basePrice * quantity, [basePrice, quantity]);

  const discountAmount = useMemo(() => {
    if (!activeOffer) return 0;
    if (activeOffer.type === "discount_percentage" && activeOffer.discountValue) {
      return subtotal * (activeOffer.discountValue / 100);
    } else if (activeOffer.type === "discount_fixed" && activeOffer.discountValue) {
      return activeOffer.discountValue;
    }
    return 0;
  }, [activeOffer, subtotal]);

  const hasFreeShipping = useMemo(() => {
    return activeOffer && (activeOffer.type === "free_shipping" || activeOffer.freeShipping === true);
  }, [activeOffer]);

  return {
    subtotal,
    discountAmount,
    hasFreeShipping,
  };
}; 