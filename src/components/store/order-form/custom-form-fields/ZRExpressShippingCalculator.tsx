import { useEffect, useState } from 'react';
import { calculateShippingPrice } from '@/api/zrexpress/service';
import { useOrganization } from '@/hooks/useOrganization';

interface Props {
  wilayaId: string;
  isHomeDelivery: boolean;
  onPriceCalculated: (price: number) => void;
}

export function ZRExpressShippingCalculator({ wilayaId, isHomeDelivery, onPriceCalculated }: Props) {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculatePrice() {
      if (!organization?.id || !wilayaId) {
        setError('معلومات المنظمة أو الولاية غير متوفرة');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await calculateShippingPrice(
          organization.id,
          wilayaId,
          isHomeDelivery
        );

        if (result.success && typeof result.price === 'number') {
          onPriceCalculated(result.price);
        } else {
          setError(result.error || 'حدث خطأ أثناء حساب سعر الشحن');
          // استخدام السعر الافتراضي في حالة الخطأ
          onPriceCalculated(isHomeDelivery ? 800 : 300);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'حدث خطأ أثناء الاتصال بخدمة الشحن';
        setError(errorMessage);
        // استخدام السعر الافتراضي في حالة الخطأ
        onPriceCalculated(isHomeDelivery ? 800 : 300);
      } finally {
        setIsLoading(false);
      }
    }

    calculatePrice();
  }, [organization?.id, wilayaId, isHomeDelivery, onPriceCalculated]);

  if (isLoading) {
    return <div className="text-sm text-gray-500">جاري حساب سعر الشحن...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return null;
}
