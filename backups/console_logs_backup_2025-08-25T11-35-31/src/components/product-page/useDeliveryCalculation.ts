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
    const calculateDelivery = async () => {
      if (!organizationId || !formData.province || !formData.municipality) {
        setDeliveryCalculation(null);
        return;
      }

      setIsCalculatingDelivery(true);
      
      try {
        const deliveryType: 'desk' | 'home' = (
          formData.delivery_type === 'desk' || 
          formData.shipping_type === 'desk' ||
          formData.fixedDeliveryType === 'desk'
        ) ? 'desk' : 'home';

        const weight = 1; 
        const productPrice = product?.pricing?.price || 0;
        
        // تحديد شركة التوصيل المناسبة بناءً على إعدادات المنتج
        let shippingProvider: {
          code: string;
          name: string;
          type: 'yalidine' | 'zrexpress' | 'ecotrack' | 'custom' | 'clone';
        } = {
          code: 'yalidine',
          name: 'ياليدين', 
          type: 'yalidine'
        };

        // 🆕 التحقق من طريقة الشحن أولاً
        const shippingMethodType = (product as any)?.shipping_method_type || 
                                  product?.shipping_and_templates?.shipping_method_type;
        
        // إضافة console.log لتتبع القيم
        console.log('🔍 [useDeliveryCalculation] Debug Info:', {
          productId: product?.id,
          productName: product?.name,
          shippingMethodType,
          shippingProviderId: (product as any)?.shipping_provider_id || 
                              product?.shipping_and_templates?.shipping_provider_id,
          shippingAndTemplates: product?.shipping_and_templates,
          productKeys: Object.keys(product || {}),
          hasShippingMethodType: 'shipping_method_type' in (product || {}),
          productType: typeof product,
          isProductObject: product && typeof product === 'object'
        });
        
        if (shippingMethodType === 'custom') {
          // إذا كانت طريقة الشحن مخصصة
          shippingProvider = {
            code: 'custom',
            name: 'طريقة شحن مخصصة',
            type: 'custom'
          };
        } else if (product?.shipping_and_templates?.shipping_info) {
          if (product.shipping_and_templates.shipping_info.type === 'provider' && product.shipping_and_templates.shipping_info.code) {
            shippingProvider = {
              code: product.shipping_and_templates.shipping_info.code,
              name: product.shipping_and_templates.shipping_info.name || product.shipping_and_templates.shipping_info.code,
              type: product.shipping_and_templates.shipping_info.code as any
            };
          } else if (product.shipping_and_templates.shipping_info.type === 'clone') {
            // في حالة استخدام clone (أسعار موحدة)
            shippingProvider = {
              code: 'clone',
              name: product.shipping_and_templates.shipping_info.name || 'شحن موحد',
              type: 'clone'
            };
          } else {
            // FALLBACK: في حالة عدم وجود shipping_info، نحاول استخدام البيانات الخام
            const rawShippingProviderId = (product?.shipping_and_templates as any)?.shipping_provider_id || (product as any)?.shipping_provider_id;
            
            if (rawShippingProviderId === 2) {
              // ZR Express provider ID = 2
              shippingProvider = {
                code: 'zrexpress',
                name: 'ZR Express',
                type: 'zrexpress'
              };
            } else if (rawShippingProviderId === 1) {
              // Yalidine provider ID = 1
              shippingProvider = {
                code: 'yalidine',
                name: 'ياليدين',
                type: 'yalidine'
              };
            } else if (rawShippingProviderId) {
              // مقدم خدمة آخر
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
          selectedProvinceId: formData.province,
          selectedMunicipalityId: formData.municipality,
          deliveryType,
          weight,
          productPrice,
          quantity,
          shippingProvider,
          productShippingInfo: (() => {
            // إذا كانت طريقة الشحن مخصصة، إنشاء معلومات شحن مخصصة
            if (shippingMethodType === 'custom') {
              return {
                type: 'provider' as const,
                id: 0,
                name: 'طريقة شحن مخصصة',
                code: 'custom'
              };
            }
            // وإلا استخدام المعلومات الموجودة
            return product?.shipping_and_templates?.shipping_info || undefined;
          })()
        };

        const result = await calculateDeliveryFeesOptimized(deliveryInput);
        
        setDeliveryCalculation(result);
        
      } catch (error) {
        setDeliveryCalculation(null);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    const timeoutId = setTimeout(calculateDelivery, 1000); // زيادة debounce time
    return () => clearTimeout(timeoutId);
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
    };
  }, [product, deliveryCalculation, isCalculatingDelivery]);

  return {
    deliveryCalculation,
    isCalculatingDelivery,
    summaryData
  };
};






