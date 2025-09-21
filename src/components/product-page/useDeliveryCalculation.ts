import { useState, useEffect, useMemo } from 'react';
import { 
  calculateDeliveryFeesOptimized,
  type DeliveryCalculationResult 
} from '@/lib/delivery-calculator';

interface UseDeliveryCalculationProps {
  organizationId: string | null;
  product: any;
  formData: Record<string, any>;
  quantity: number;
}

export const useDeliveryCalculation = ({
  organizationId,
  product,
  formData,
  quantity
}: UseDeliveryCalculationProps) => {
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // حساب رسوم التوصيل مع debouncing محسن
  useEffect(() => {
    let canceled = false;

    const calculateDelivery = async () => {
      const provinceValue =
        (formData as any).province ||
        (formData as any).wilaya ||
        (formData as any).wilaya_id ||
        (formData as any).state;
      const municipalityValue =
        (formData as any).municipality ||
        (formData as any).commune ||
        (formData as any).commune_id ||
        (formData as any).city_id ||
        (formData as any).city;

      if (!organizationId || !provinceValue || !municipalityValue) {
        if (!canceled) {
          setDeliveryCalculation(null);
        }
        return;
      }

      setIsCalculatingDelivery(true);

      try {
        const rawType =
          (formData as any).delivery_type ||
          (formData as any).delivery ||
          (formData as any).delivery_method ||
          (formData as any).shipping_type ||
          (formData as any).fixedDeliveryType ||
          (formData as any)['توصيل'];

        const norm = String(rawType || '').toLowerCase();
        const isDesk = norm.includes('desk') || norm.includes('office') || norm.includes('pickup');
        const deliveryType: 'desk' | 'home' = isDesk ? 'desk' : 'home';

        const weight = 1;
        const productPrice = product?.pricing?.price || 0;

        let shippingProvider: {
          code: string;
          name: string;
          type: 'yalidine' | 'zrexpress' | 'ecotrack' | 'custom' | 'clone';
        } = {
          code: 'yalidine',
          name: 'ياليدين',
          type: 'yalidine'
        };

        if (product?.shipping_and_templates?.shipping_info) {
          const shippingInfo = product.shipping_and_templates.shipping_info;

          if (shippingInfo.type === 'provider' && shippingInfo.code) {
            shippingProvider = {
              code: shippingInfo.code,
              name: shippingInfo.name || shippingInfo.code,
              type: shippingInfo.code as typeof shippingProvider.type
            };
          } else if (shippingInfo.type === 'clone') {
            shippingProvider = {
              code: 'clone',
              name: shippingInfo.name || 'شحن موحد',
              type: 'clone'
            };
          } else {
            const rawShippingProviderId =
              (product?.shipping_and_templates as any)?.shipping_provider_id ||
              (product as any)?.shipping_provider_id;

            if (rawShippingProviderId === 2) {
              shippingProvider = {
                code: 'zrexpress',
                name: 'ZR Express',
                type: 'zrexpress'
              };
            } else if (rawShippingProviderId === 1) {
              shippingProvider = {
                code: 'yalidine',
                name: 'ياليدين',
                type: 'yalidine'
              };
            } else if (rawShippingProviderId) {
              shippingProvider = {
                code: `provider_${rawShippingProviderId}`,
                name: `مقدم الخدمة ${rawShippingProviderId}`,
                type: 'custom'
              };
            }
          }
        }

        const deliveryInput = {
          organizationId,
          selectedProvinceId: provinceValue,
          selectedMunicipalityId: municipalityValue,
          deliveryType,
          weight,
          productPrice,
          quantity,
          shippingProvider,
          productShippingInfo: product?.shipping_and_templates?.shipping_info || undefined
        };

        const result = await calculateDeliveryFeesOptimized(deliveryInput);

        if (!canceled) {
          setDeliveryCalculation(result);
        }
      } catch (error) {
        if (!canceled) {
          setDeliveryCalculation(null);
        }
      } finally {
        if (!canceled) {
          setIsCalculatingDelivery(false);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      calculateDelivery().catch(() => {
        if (!canceled) {
          setDeliveryCalculation(null);
          setIsCalculatingDelivery(false);
        }
      });
    }, 300);

    return () => {
      canceled = true;
      clearTimeout(timeoutId);
    };
  }, [
    organizationId, 
    formData.province, 
    formData.municipality, 
    formData.delivery_type, 
    formData.shipping_type,
    formData.fixedDeliveryType,
    product?.pricing?.price,
    quantity
  ]);

  // حساب بيانات الملخص
  const summaryData = useMemo(() => {
    if (!product) return null;

    return {
      selectedProvince: deliveryCalculation?.selectedProvince || null,
      selectedMunicipality: deliveryCalculation?.selectedMunicipality || null,
      deliveryType: deliveryCalculation?.deliveryType || 'home',
      deliveryFee: deliveryCalculation?.deliveryFee || 0,
      isCalculating: isCalculatingDelivery,
      shippingProvider: deliveryCalculation?.shippingProvider || {
        name: 'ياليدين',
        code: 'yalidine'
      },
      calculationMethod: deliveryCalculation?.calculationMethod
    }
  }, [product, deliveryCalculation, isCalculatingDelivery]);

  return {
    deliveryCalculation,
    isCalculatingDelivery,
    summaryData
  }
};
