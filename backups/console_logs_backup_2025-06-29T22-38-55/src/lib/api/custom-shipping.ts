import { supabase } from '@/lib/supabase-client';

export interface CustomShippingRates {
  [provinceId: string]: {
    home_delivery: number;
    office_delivery: number;
  };
}

export interface CustomShippingSettings {
  use_unified_price?: boolean;
  unified_home_price?: number;
  unified_desk_price?: number;
  is_free_delivery_home?: boolean;
  is_free_delivery_desk?: boolean;
  custom_rates?: CustomShippingRates;
  default_price?: number;
}

/**
 * إنشاء أو تحديث إعدادات الشحن المخصصة للمؤسسة
 */
export async function createOrUpdateCustomShipping(
  organizationId: string,
  settings: CustomShippingSettings
) {
  try {
    // التحقق من وجود إعدادات مخصصة موجودة
    const { data: existingSettings } = await supabase
      .from('shipping_provider_settings')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('api_key', 'custom_shipping')
      .single();

    const shippingSettings = {
      organization_id: organizationId,
      provider_id: null, // null للطرق المخصصة
      api_key: 'custom_shipping',
      api_token: 'custom_shipping_token',
      is_enabled: true,
      settings: settings as any,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (existingSettings) {
      // تحديث الإعدادات الموجودة
      const { data, error } = await supabase
        .from('shipping_provider_settings')
        .update({
          settings: settings as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingSettings.id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } else {
      // إنشاء إعدادات جديدة
      const { data, error } = await supabase
        .from('shipping_provider_settings')
        .insert(shippingSettings)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' 
    };
  }
}

/**
 * جلب إعدادات الشحن المخصصة للمؤسسة
 */
export async function getCustomShippingSettings(organizationId: string) {
  try {
    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('api_key', 'custom_shipping')
      .eq('is_enabled', true)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    return { 
      success: true, 
      data: data || null 
    };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      data: null 
    };
  }
}

/**
 * تفعيل أو إلغاء تفعيل الشحن المخصص
 */
export async function toggleCustomShipping(organizationId: string, isEnabled: boolean) {
  try {
    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .update({ 
        is_enabled: isEnabled,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('api_key', 'custom_shipping')
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع' 
    };
  }
}

/**
 * حساب سعر التوصيل المخصص
 */
export async function calculateCustomShippingPrice(
  organizationId: string,
  provinceId: string,
  deliveryType: 'home' | 'desk'
): Promise<number> {
  try {
    const { data: settings } = await getCustomShippingSettings(organizationId);
    
    if (!settings.success || !settings.data) {
      return 0;
    }

    const shippingSettings = settings.data.settings as CustomShippingSettings;

    // التحقق من الأسعار الموحدة أولاً
    if (shippingSettings.use_unified_price) {
      if (deliveryType === 'home') {
        if (shippingSettings.is_free_delivery_home) {
          return 0;
        }
        return shippingSettings.unified_home_price || 0;
      } else {
        if (shippingSettings.is_free_delivery_desk) {
          return 0;
        }
        return shippingSettings.unified_desk_price || 0;
      }
    }

    // البحث عن أسعار مخصصة بحسب الولاية
    if (shippingSettings.custom_rates && shippingSettings.custom_rates[provinceId]) {
      const provinceRates = shippingSettings.custom_rates[provinceId];
      
      if (deliveryType === 'home') {
        return provinceRates.home_delivery || 0;
      } else {
        return provinceRates.office_delivery || 0;
      }
    }

    // إذا لم نجد سعر محدد، نستخدم السعر الافتراضي
    return shippingSettings.default_price || 0;

  } catch (error) {
    return 0;
  }
}
