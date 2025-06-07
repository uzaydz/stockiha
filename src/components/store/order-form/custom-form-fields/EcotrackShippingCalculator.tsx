import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import { useOrganization } from '@/hooks/useOrganization';

interface Props {
  wilayaId: string;
  isHomeDelivery: boolean;
  providerCode: string;
  onPriceCalculated: (price: number) => void;
}

// Helper function to check if provider is Ecotrack-based
const isEcotrackProvider = (providerCode: string): boolean => {
  const ecotrackProviders = [
    'ecotrack',
    'anderson_delivery',
    'areex', 
    'ba_consult',
    'conexlog',
    'coyote_express',
    'dhd',
    'distazero',
    'e48hr_livraison',
    'fretdirect',
    'golivri',
    'mono_hub',
    'msm_go',
    'negmar_express',
    'packers',
    'prest',
    'rb_livraison',
    'rex_livraison',
    'rocket_delivery',
    'salva_delivery',
    'speed_delivery',
    'tsl_express',
    'worldexpress'
  ];
  
  return ecotrackProviders.includes(providerCode);
};

// Function to calculate Ecotrack shipping prices
const calculateEcotrackShippingPrice = async (
  organizationId: string,
  providerCode: string,
  wilayaId: string,
  deliveryType: 'home' | 'desk'
): Promise<{ success: boolean; price: number; error?: string }> => {
  try {
    console.log('🌿 [EcotrackCalculator] بدء حساب سعر Ecotrack:', {
      organizationId,
      providerCode,
      wilayaId,
      deliveryType
    });

    // Get provider settings
    const { data: providerSettings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select(`
        *,
        shipping_providers!inner(code, base_url)
      `)
      .eq('organization_id', organizationId)
      .eq('shipping_providers.code', providerCode)
      .eq('is_enabled', true)
      .single();

    if (settingsError || !providerSettings) {
      console.error('❌ [EcotrackCalculator] لا توجد إعدادات للشركة:', settingsError);
      return {
        success: false,
        price: 0,
        error: 'لا توجد إعدادات لشركة التوصيل'
      };
    }

    const { api_token, shipping_providers } = providerSettings;
    const baseUrl = shipping_providers.base_url;

    if (!api_token) {
      console.error('❌ [EcotrackCalculator] لا يوجد API token');
      return {
        success: false,
        price: 0,
        error: 'لا يوجد API token للشركة'
      };
    }

    console.log('🔗 [EcotrackCalculator] إعدادات الشركة:', {
      baseUrl,
      hasToken: !!api_token
    });

    // Call Ecotrack API
    const response = await fetch(`${baseUrl}/api/v1/get/fees?to_wilaya_id=${wilayaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${api_token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 [EcotrackCalculator] استجابة API:', {
      status: response.status,
      statusText: response.statusText
    });

    if (!response.ok) {
      console.error('❌ [EcotrackCalculator] خطأ HTTP:', response.status);
      return {
        success: false,
        price: 0,
        error: `خطأ في API: ${response.status}`
      };
    }

    const data = await response.json();
    console.log('📊 [EcotrackCalculator] بيانات الاستجابة:', data);

    if (data.success && data.data && data.data.length > 0) {
      const rate = data.data[0];
      let price = 0;

      if (deliveryType === 'home') {
        price = parseFloat(rate.price_domicile || rate.price_local || '0');
      } else {
        price = parseFloat(rate.price_local || rate.price_domicile || '0');
      }

      console.log('✅ [EcotrackCalculator] السعر المحسوب:', {
        deliveryType,
        price_domicile: rate.price_domicile,
        price_local: rate.price_local,
        finalPrice: price
      });

      return {
        success: true,
        price: price
      };
    }

    console.warn('⚠️ [EcotrackCalculator] لا توجد أسعار متاحة');
    return {
      success: false,
      price: 0,
      error: 'لا توجد أسعار متاحة لهذه الولاية'
    };

  } catch (error) {
    console.error('❌ [EcotrackCalculator] خطأ في الحساب:', error);
    return {
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
};

export function EcotrackShippingCalculator({ wilayaId, isHomeDelivery, providerCode, onPriceCalculated }: Props) {
  const { organization } = useOrganization();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function calculatePrice() {
      if (!organization?.id || !wilayaId || !isEcotrackProvider(providerCode)) {
        setError('معلومات غير كاملة أو شركة توصيل غير مدعومة');
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await calculateEcotrackShippingPrice(
          organization.id,
          providerCode,
          wilayaId,
          isHomeDelivery ? 'home' : 'desk'
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
  }, [organization?.id, wilayaId, isHomeDelivery, providerCode, onPriceCalculated]);

  if (isLoading) {
    return <div className="text-sm text-green-600">جاري حساب سعر الشحن عبر Ecotrack...</div>;
  }

  if (error) {
    return <div className="text-sm text-red-500">{error}</div>;
  }

  return null;
} 