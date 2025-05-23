import { supabase } from '@/lib/supabase';

interface ZRExpressSettings {
  api_token: string;
  api_key: string;
  base_url: string;
}

interface ShippingCalculationResult {
  success: boolean;
  price: number;
  error: string | null;
}

type SupabaseFunction = 'calculate_zrexpress_shipping';

export interface TarificationResponse {
  success: boolean;
  price: number;
  error?: string;
}

export async function getZRExpressSettings(organizationId: string): Promise<ZRExpressSettings | null> {
  try {
    console.log('Fetching ZR Express settings for organization:', organizationId);
    
    const { data: provider, error: providerError } = await supabase
      .from('shipping_providers')
      .select('id, base_url')
      .eq('code', 'zrexpress')
      .single();

    if (providerError || !provider) {
      console.error('Error fetching ZR Express provider:', providerError);
      return null;
    }

    console.log('Found ZR Express provider:', provider);

    const { data: settings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', provider.id)
      .single();

    if (settingsError || !settings) {
      console.error('Error fetching ZR Express settings:', settingsError);
      return null;
    }

    console.log('Found ZR Express settings:', { ...settings, api_token: '***', api_key: '***' });

    return {
      api_token: settings.api_token || '',
      api_key: settings.api_key || '',
      base_url: provider.base_url
    };
  } catch (error) {
    console.error('Error in getZRExpressSettings:', error);
    return null;
  }
}

// التحقق من صحة UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export async function calculateShippingPrice(
  organizationId: string,
  wilayaId: string,
  isHomeDelivery: boolean | string = true
): Promise<TarificationResponse> {
  try {
    // تحسين منطق التحقق للتعامل مع قيم مختلفة
    let correctedIsHomeDelivery: boolean;
    
    if (typeof isHomeDelivery === 'boolean') {
      correctedIsHomeDelivery = isHomeDelivery;
    } else if (typeof isHomeDelivery === 'string') {
      // اعتبار 'desk' هو دائما false (ليس توصيل منزلي)
      if (isHomeDelivery === 'desk') {
        correctedIsHomeDelivery = false;
      } else {
        // اعتبار 'home' أو 'true' هو true (توصيل منزلي)
        correctedIsHomeDelivery = (isHomeDelivery === 'home' || isHomeDelivery === 'true');
      }
    } else {
      // القيمة الافتراضية إذا لم يتم تحديد نوع التوصيل
      correctedIsHomeDelivery = true;
    }
    
    console.log('Calculating shipping price:', {
      organizationId,
      wilayaId,
      isHomeDelivery,
      correctedIsHomeDelivery,
      isHomeDeliveryType: typeof isHomeDelivery
    });

    if (!isValidUUID(organizationId)) {
      console.error('Invalid organization ID:', organizationId);
      return {
        success: false,
        price: 0,
        error: 'معرف المنظمة غير صالح'
      };
    }

    console.log('Calling calculateZRExpressShipping Edge Function...');
    
    // استدعاء Edge Function بدلاً من دالة PostgreSQL
    const { data, error } = await supabase.functions.invoke('calculate-zrexpress-shipping', {
      method: 'POST',
      body: {
        organizationId,
        wilayaId,
        isHomeDelivery: correctedIsHomeDelivery // استخدام القيمة المصححة
      }
    });

    if (error) {
      console.error('Error calling ZR Express Edge Function:', error);
      return {
        success: false,
        price: 0,
        error: error.message
      };
    }

    if (!data) {
      console.error('No data received from Edge Function');
      return {
        success: false,
        price: 0,
        error: 'لم يتم استلام بيانات من الخادم'
      };
    }

    console.log('Received shipping calculation result:', data);

    return {
      success: data.success,
      price: data.price,
      error: data.error || undefined
    };

  } catch (error) {
    console.error('Error calculating ZR Express shipping price:', error);
    return {
      success: false,
      price: 0,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
} 