import { supabase } from '@/lib/supabase-client';

export interface CustomShippingRates {
  [provinceId: string]: {
    home_delivery: number;
    office_delivery: number;
  };
}

export interface CustomShippingSettings {
  // الحقول الجديدة من قاعدة البيانات
  use_uniform_rates?: boolean;
  uniform_home_rate?: number;
  uniform_office_rate?: number;
  free_home_delivery?: boolean;
  free_office_delivery?: boolean;
  
  // الحقول القديمة للتوافق
  use_unified_price?: boolean;
  unified_home_price?: number;
  unified_desk_price?: number;
  is_free_delivery_home?: boolean;
  is_free_delivery_desk?: boolean;
  
  // الأسعار المخصصة بحسب الولاية
  custom_rates?: CustomShippingRates;
  shipping_rates?: CustomShippingRates;
  
  // السعر الافتراضي
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
    console.log('🔍 [getCustomShippingSettings] بدء البحث عن:', organizationId);
    
    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('api_key', 'custom_shipping')
      .eq('is_enabled', true)
      .single();

    console.log('🔍 [getCustomShippingSettings] نتيجة الاستعلام:', {
      data,
      error,
      hasData: !!data,
      hasError: !!error
    });

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    const result = { 
      success: true, 
      data: data || null 
    };
    
    console.log('🔍 [getCustomShippingSettings] النتيجة النهائية:', result);
    
    return result;
  } catch (error) {
    console.error('❌ [getCustomShippingSettings] خطأ:', error);
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
    console.log('🔍 [calculateCustomShippingPrice] بدء الحساب:', {
      organizationId,
      provinceId,
      deliveryType
    });
    
    const settings = await getCustomShippingSettings(organizationId);
    
    console.log('🔍 [calculateCustomShippingPrice] إعدادات الشحن:', {
      settingsSuccess: settings.success,
      settingsData: settings.data,
      hasSettings: !!settings.data
    });
    
    if (!settings.success || !settings.data) {
      console.log('❌ [calculateCustomShippingPrice] لا توجد إعدادات شحن مخصصة');
      return 0;
    }

    const shippingSettings = settings.data.settings as CustomShippingSettings;
    
    console.log('🔍 [calculateCustomShippingPrice] إعدادات الشحن المخصصة:', {
      useUniformRates: shippingSettings.use_uniform_rates,
      uniformHomeRate: shippingSettings.uniform_home_rate,
      uniformOfficeRate: shippingSettings.uniform_office_rate,
      freeHomeDelivery: shippingSettings.free_home_delivery,
      freeOfficeDelivery: shippingSettings.free_office_delivery,
      useUnifiedPrice: shippingSettings.use_unified_price,
      unifiedHomePrice: shippingSettings.unified_home_price,
      unifiedDeskPrice: shippingSettings.unified_desk_price,
      isFreeDeliveryHome: shippingSettings.is_free_delivery_home,
      isFreeDeliveryDesk: shippingSettings.is_free_delivery_desk,
      hasCustomRates: !!shippingSettings.custom_rates,
      hasShippingRates: !!shippingSettings.shipping_rates,
      customRatesKeys: shippingSettings.custom_rates ? Object.keys(shippingSettings.custom_rates) : [],
      shippingRatesKeys: shippingSettings.shipping_rates ? Object.keys(shippingSettings.shipping_rates) : [],
      defaultPrice: shippingSettings.default_price
    });

    // 🆕 التحقق من الأسعار الموحدة الجديدة أولاً
    if (shippingSettings.use_uniform_rates) {
      console.log('✅ [calculateCustomShippingPrice] استخدام الأسعار الموحدة الجديدة');
      
      if (deliveryType === 'home') {
        if (shippingSettings.free_home_delivery) {
          console.log('✅ [calculateCustomShippingPrice] التوصيل للمنزل مجاني');
          return 0;
        }
        const price = shippingSettings.uniform_home_rate || 0;
        console.log('✅ [calculateCustomShippingPrice] سعر التوصيل للمنزل:', price);
        return price;
      } else {
        if (shippingSettings.free_office_delivery) {
          console.log('✅ [calculateCustomShippingPrice] التوصيل للمكتب مجاني');
          return 0;
        }
        const price = shippingSettings.uniform_office_rate || 0;
        console.log('✅ [calculateCustomShippingPrice] سعر التوصيل للمكتب:', price);
        return price;
      }
    }
    
    // التحقق من الأسعار الموحدة القديمة (للتوافق)
    if (shippingSettings.use_unified_price) {
      console.log('✅ [calculateCustomShippingPrice] استخدام الأسعار الموحدة القديمة');
      
      if (deliveryType === 'home') {
        if (shippingSettings.is_free_delivery_home) {
          console.log('✅ [calculateCustomShippingPrice] التوصيل للمنزل مجاني (قديم)');
          return 0;
        }
        const price = shippingSettings.unified_home_price || 0;
        console.log('✅ [calculateCustomShippingPrice] سعر التوصيل للمنزل (قديم):', price);
        return price;
      } else {
        if (shippingSettings.is_free_delivery_desk) {
          console.log('✅ [calculateCustomShippingPrice] التوصيل للمكتب مجاني (قديم)');
          return 0;
        }
        const price = shippingSettings.unified_desk_price || 0;
        console.log('✅ [calculateCustomShippingPrice] سعر التوصيل للمكتب (قديم):', price);
        return price;
      }
    }

    // البحث عن أسعار مخصصة بحسب الولاية (الحقول الجديدة)
    if (shippingSettings.shipping_rates && shippingSettings.shipping_rates[provinceId]) {
      const provinceRates = shippingSettings.shipping_rates[provinceId];
      
      if (deliveryType === 'home') {
        return provinceRates.home_delivery || 0;
      } else {
        return provinceRates.office_delivery || 0;
      }
    }
    
    // البحث عن أسعار مخصصة بحسب الولاية (الحقول القديمة)
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
