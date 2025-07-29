import { useState, useEffect, useMemo } from 'react';
import { 
  calculateDeliveryFeesOptimized,
  type DeliveryCalculationResult 
} from '@/lib/delivery-calculator';

interface UseDeliveryCalculationProps {
  organizationId: string | null;
  submittedFormData: Record<string, any>;
  product: any;
  quantity: number;
}

interface DeliveryCalculationHookResult {
  deliveryCalculation: DeliveryCalculationResult | null;
  isCalculatingDelivery: boolean;
  summaryData: {
    selectedProvince: any;
    selectedMunicipality: any;
    deliveryType: 'desk' | 'home';
    deliveryFee: number;
    isCalculating: boolean;
    shippingProvider: {
      name: string;
      code: string;
      logo?: string;
    };
    calculationMethod?: string;
  } | null;
}

export const useDeliveryCalculation = ({
  organizationId,
  submittedFormData,
  product,
  quantity
}: UseDeliveryCalculationProps): DeliveryCalculationHookResult => {
  const [deliveryCalculation, setDeliveryCalculation] = useState<DeliveryCalculationResult | null>(null);
  const [isCalculatingDelivery, setIsCalculatingDelivery] = useState(false);

  // حساب رسوم التوصيل عند تغيير البيانات (مع debouncing)
  useEffect(() => {
    const calculateDelivery = async () => {
      console.log('🚛 بدء useEffect حساب التوصيل - فحص شامل:', {
        organizationId,
        hasOrganizationId: !!organizationId,
        submittedFormDataProvince: submittedFormData.province,
        submittedFormDataMunicipality: submittedFormData.municipality,
        hasProvince: !!submittedFormData.province,
        hasMunicipality: !!submittedFormData.municipality,
        allSubmittedFormData: submittedFormData,
        allSubmittedFormDataKeys: Object.keys(submittedFormData || {}),
        canCalculate: !!(organizationId && submittedFormData.province && submittedFormData.municipality)
      });
      
      if (!organizationId || !submittedFormData.province || !submittedFormData.municipality) {
        console.log('⚠️ شروط حساب التوصيل غير مكتملة:', {
          missingOrganizationId: !organizationId,
          missingProvince: !submittedFormData.province,
          missingMunicipality: !submittedFormData.municipality,
          organizationId,
          provinceValue: submittedFormData.province,
          municipalityValue: submittedFormData.municipality
        });
        setDeliveryCalculation(null);
        return;
      }

      console.log('✅ جميع الشروط مكتملة، بدء حساب التوصيل...');
      setIsCalculatingDelivery(true);
      
      try {
        const deliveryType: 'desk' | 'home' = (
          submittedFormData.delivery_type === 'desk' || 
          submittedFormData.shipping_type === 'desk' ||
          submittedFormData.fixedDeliveryType === 'desk'
        ) ? 'desk' : 'home';
        
        console.log('🚚 تحديد نوع التوصيل:', {
          deliveryTypeField: submittedFormData.delivery_type,
          shippingTypeField: submittedFormData.shipping_type,
          fixedDeliveryTypeField: submittedFormData.fixedDeliveryType,
          finalDeliveryType: deliveryType,
          isDeskDelivery: deliveryType === 'desk',
          allFormData: submittedFormData
        });
        
        // وزن المنتج افتراضي 1 كيلو (يمكن تحسينه لاحقاً من إعدادات المنتج)
        const weight = 1; 
        const productPrice = product?.pricing?.price || 0;
        
        const deliveryInput = {
          organizationId,
          selectedProvinceId: submittedFormData.province,
          selectedMunicipalityId: submittedFormData.municipality,
          deliveryType,
          weight,
          productPrice,
          quantity,
          shippingProvider: {
            code: 'yalidine', // افتراضياً ياليدين
            name: 'ياليدين',
            type: 'yalidine' as const
          },
          // إضافة معلومات الشحن من المنتج
          productShippingInfo: product?.shipping_and_templates?.shipping_info || undefined
        };
        
        console.log('📦 بيانات الدخل لحاسبة التوصيل:', deliveryInput);
        
        // استخدام النسخة المحسنة الجديدة التي تدعم جميع شركات التوصيل
        const result = await calculateDeliveryFeesOptimized(deliveryInput);

        console.log('🚚 نتيجة حساب التوصيل - تفاصيل شاملة:', {
          result,
          deliveryFee: result?.deliveryFee,
          selectedProvince: result?.selectedProvince,
          selectedMunicipality: result?.selectedMunicipality,
          deliveryType: result?.deliveryType,
          calculationMethod: result?.calculationMethod,
          provider: result?.shippingProvider,
          success: !!result
        });
        
        setDeliveryCalculation(result);
        
      } catch (error) {
        console.error('❌ خطأ في حساب رسوم التوصيل - تفاصيل الخطأ:', {
          error,
          errorMessage: error?.message,
          errorStack: error?.stack,
          inputData: {
            organizationId,
            province: submittedFormData.province,
            municipality: submittedFormData.municipality,
            productPrice: product?.pricing?.price,
            quantity
          }
        });
        setDeliveryCalculation(null);
      } finally {
        setIsCalculatingDelivery(false);
      }
    };

    // إضافة debouncing بتأخير 500ms لتجنب الطلبات المتعددة السريعة
    const timeoutId = setTimeout(calculateDelivery, 500);
    
    return () => clearTimeout(timeoutId);
  }, [
    organizationId, 
    submittedFormData.province, 
    submittedFormData.municipality, 
    submittedFormData.delivery_type, 
    submittedFormData.shipping_type,
    submittedFormData.fixedDeliveryType,
    product?.pricing?.price,
    quantity
  ]);

  // حساب بيانات الملخص التفاعلية
  const summaryData = useMemo(() => {
    if (!product) return null;

    console.log('🔍 Summary Data Debug:', {
      deliveryCalculation,
      isCalculatingDelivery,
      submittedFormData,
      hasProvinceAndMunicipality: !!(submittedFormData.province && submittedFormData.municipality)
    });

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
  }, [product, deliveryCalculation, isCalculatingDelivery, submittedFormData]);

  return {
    deliveryCalculation,
    isCalculatingDelivery,
    summaryData
  };
}; 