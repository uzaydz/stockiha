import React, { useEffect, useState } from 'react';
import { calculateCustomShippingPrice } from '@/lib/api/custom-shipping';

interface CustomShippingCalculatorProps {
  organizationId: string;
  provinceId: string;
  deliveryType: 'home' | 'desk';
  onPriceCalculated: (price: number) => void;
}

export const CustomShippingCalculator: React.FC<CustomShippingCalculatorProps> = ({
  organizationId,
  provinceId,
  deliveryType,
  onPriceCalculated
}) => {
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const calculatePrice = async () => {
      if (!organizationId || !provinceId) {
        onPriceCalculated(0);
        return;
      }

      setIsCalculating(true);

      try {
        // استخدام دالة حساب السعر المخصصة الجديدة
        const price = await calculateCustomShippingPrice(
          organizationId,
          provinceId,
          deliveryType
        );
        
        onPriceCalculated(price);

      } catch (error) {
        onPriceCalculated(0);
      } finally {
        setIsCalculating(false);
      }
    };

    calculatePrice();
  }, [organizationId, provinceId, deliveryType, onPriceCalculated]);

  // هذا المكون لا يعرض أي واجهة مرئية، فهو فقط لحساب السعر
  return null;
};

export default CustomShippingCalculator;
