import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from '@/lib/supabase';
import type { CustomFormField } from "../types"; // Adjusted import path
import { getSupabaseClient } from '@/lib/supabase';
import { withCache, SHORT_CACHE_TTL } from '@/lib/cache/storeCache';

// تحديث نوع CustomFormField ليشمل formSettings
interface ExtendedCustomFormField extends CustomFormField {
  formSettings?: {
    id?: string;
    settings?: any;
    [key: string]: any;
  };
}

// دالة للعثور على معرف مزود الشحن المستنسخ (تم تبسيطها)
export async function findClonedShippingProviderId(formSettings: any, orgId: string | null | undefined): Promise<string | number | null> {
  if (!orgId) return null;
  
  try {
    // البحث عن إعدادات مزود الشحن للمؤسسة مباشرة
    const { data: providerSettings, error: providerError } = await (supabase as any).from('shipping_provider_settings')
      .select('provider_id, settings')
      .eq('organization_id', orgId)
      .eq('is_enabled', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (providerError) {
      console.log('⚠️ خطأ في جلب إعدادات مزود الشحن:', providerError);
      return null;
    }
    
    return providerSettings ? providerSettings.provider_id : null;
    
  } catch (error) {
    console.log('⚠️ خطأ عام في findClonedShippingProviderId:', error);
    return null;
  }
}

// دالة مساعدة للحصول على إعدادات مزود الشحن الافتراضية
export function getDefaultShippingProviderSettings(orgId: string | null | undefined, providerId: string | number | null) {
  
  // إنشاء وظيفة مساعدة لجلب المعلومات من قاعدة البيانات
  async function fetchDefaultSettings() {
    if (!orgId) return null;
    
    try {
      // البحث عن إعدادات مزود الشحن للمؤسسة
      const { data: providerSettings, error: providerError } = await (supabase as any).from('shipping_provider_settings')
        .select('provider_id, settings')
        .eq('organization_id', orgId)
        .eq('is_enabled', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (providerError) {
        console.log('⚠️ خطأ في جلب إعدادات مزود الشحن:', providerError);
      } else if (providerSettings) {
        const currentProviderId = providerId || providerSettings.provider_id;
        
        // استرجاع معلومات إضافية عن مزود الشحن من جدول shipping_providers
        const { data: provider, error: providerInfoError } = await (supabase as any).from('shipping_providers')
          .select('*')
          .eq('id', currentProviderId)
          .maybeSingle();
          
        if (providerInfoError) {
          console.log('⚠️ خطأ في جلب معلومات مزود الشحن:', providerInfoError);
        } else if (provider) {
          
          // إنشاء كائن إعدادات مبسط
          const defaultSettings = {
            id: currentProviderId,
            organization_id: orgId,
            original_provider_id: currentProviderId,
            name: provider.name || "مزود الشحن الافتراضي للمتجر",
            is_active: true,
            is_home_delivery_enabled: true,
            is_desk_delivery_enabled: true,
            use_unified_price: true,
            unified_home_price: providerSettings.settings?.unified_home_price || 800,
            unified_desk_price: providerSettings.settings?.unified_desk_price || 300,
            is_free_delivery_home: providerSettings.settings?.is_free_delivery_home || false,
            is_free_delivery_desk: providerSettings.settings?.is_free_delivery_desk || false,
            provider_code: provider.code || "yalidine",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_enabled: false,
            settings: providerSettings.settings
          };
          return defaultSettings;
        }
      }
    } catch (error) {
      console.log('⚠️ خطأ عام في fetchDefaultSettings:', error);
    }
    
    return null;
  }
  
  // استدعاء الوظيفة المساعدة وانتظار النتيجة
  const settingsPromise = fetchDefaultSettings();
  
  // إرجاع Promise بدلاً من القيمة مباشرة
  return settingsPromise.then(settings => {
    if (settings) {
      return settings;
    }
    
    // إرجاع إعدادات افتراضية في حالة عدم وجود أي إعدادات
    return {
      id: providerId || 1,
      organization_id: orgId,
      original_provider_id: providerId || 1,
      name: "مزود الشحن الافتراضي",
      is_active: true,
      is_home_delivery_enabled: true,
      is_desk_delivery_enabled: true,
      use_unified_price: true,
      unified_home_price: 800,
      unified_desk_price: 300,
      is_free_delivery_home: false,
      is_free_delivery_desk: false,
      provider_code: "yalidine",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_enabled: false
    };
  }).catch(error => {
    console.log('⚠️ خطأ في معالجة الإعدادات الافتراضية:', error);
    
    // إرجاع إعدادات افتراضية أساسية في حالة الخطأ
    return {
      id: providerId || 1,
      organization_id: orgId,
      original_provider_id: providerId || 1,
      name: "مزود الشحن الافتراضي",
      is_active: true,
      is_home_delivery_enabled: true,
      is_desk_delivery_enabled: true,
      use_unified_price: true,
      unified_home_price: 800,
      unified_desk_price: 300,
      is_free_delivery_home: false,
      is_free_delivery_desk: false,
      provider_code: "yalidine",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sync_enabled: false
    };
  });
}

export const useShippingProviderLogic = (
  formId: string | undefined,
  formFields: any,
  productId: string | null | undefined,
  currentOrganization: any,
  setValue: Function
) => {
  const [shippingProviderId, setShippingProviderId] = useState<string | number | null>(null);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<any>(null);
  const [isLoadingShippingSettings, setIsLoadingShippingSettings] = useState(false);
  
  // مرجع للتحديث في useEffect
  const deliveryTypeUpdateRef = useRef({
    hasBeenUpdated: false
  });

  // دالة محسنة لجلب إعدادات مزود الشحن مع cache
  const fetchShippingProviderSettings = useCallback(async (providerId: string | number) => {
    if (!providerId || !currentOrganization) {
      setShippingProviderSettings(null);
      return;
    }

    const cacheKey = `shipping_provider_settings:${currentOrganization.id}:${providerId}`;

    setIsLoadingShippingSettings(true);

    try {
      const settings = await withCache(cacheKey, async () => {
        // جلب إعدادات مزود الشحن من shipping_provider_settings
        const { data: providerSettings, error: settingsError } = await (supabase as any).from('shipping_provider_settings')
          .select('*')
          .eq('organization_id', currentOrganization.id)
          .eq('provider_id', providerId)
          .eq('is_enabled', true)
          .maybeSingle();

        if (settingsError) {
          console.log('⚠️ خطأ في جلب إعدادات مزود الشحن:', settingsError);
          throw settingsError;
        }

        if (providerSettings) {
          // جلب معلومات المزود الأصلي
          const { data: providerInfoArray, error: providerError } = await (supabase as any).from('shipping_providers')
            .select('*')
            .eq('id', providerId)
            .limit(1);
            
          const providerInfo = providerInfoArray && providerInfoArray.length > 0 ? providerInfoArray[0] : null;

          if (!providerError && providerInfo) {
            const sanitizedData = {
              id: providerId,
              organization_id: currentOrganization.id,
              original_provider_id: providerId,
              name: providerInfo.name || "مزود الشحن",
              is_active: providerSettings.is_enabled,
              is_home_delivery_enabled: providerSettings.settings?.is_home_delivery_enabled ?? true,
              is_desk_delivery_enabled: providerSettings.settings?.is_desk_delivery_enabled ?? true,
              use_unified_price: providerSettings.settings?.use_unified_price ?? true,
              unified_home_price: providerSettings.settings?.unified_home_price || 800,
              unified_desk_price: providerSettings.settings?.unified_desk_price || 300,
              is_free_delivery_home: providerSettings.settings?.is_free_delivery_home || false,
              is_free_delivery_desk: providerSettings.settings?.is_free_delivery_desk || false,
              provider_code: providerInfo.code || "yalidine",
              created_at: providerSettings.created_at,
              updated_at: providerSettings.updated_at,
              sync_enabled: false,
              settings: providerSettings.settings
            };
            return sanitizedData;
          }
        }
        
        console.log('⚠️ لم يتم العثور على إعدادات مزود الشحن:', providerId);
        
        // استخدام إعدادات افتراضية
        return await getDefaultShippingProviderSettings(currentOrganization?.id, providerId);
      }, SHORT_CACHE_TTL);
      
      setShippingProviderSettings(settings);

    } catch (error) {
      console.log('⚠️ خطأ عام في fetchShippingProviderSettings:', error);
      
      // تعيين إعدادات افتراضية في حالة الخطأ
      const defaultSettings = await getDefaultShippingProviderSettings(currentOrganization?.id, providerId);
      setShippingProviderSettings(defaultSettings);
    }
    
    setIsLoadingShippingSettings(false);
  }, [currentOrganization]);

  // استخراج معرف مزود الشحن
  useEffect(() => {
    if (!currentOrganization) return;
    
    const getShippingProviderId = async () => {
      try {
        setIsLoadingShippingSettings(true);
        
        // تحضير كائن formSettings من البيانات المتاحة
        let settingsObj: any = null;
        
        if (formFields && formFields.length > 0) {
          const fieldWithSettings = formFields.find((field: ExtendedCustomFormField) => 
            field && typeof field === 'object' && 'formSettings' in field && field.formSettings
          ) as ExtendedCustomFormField | undefined;
          
          if (fieldWithSettings && fieldWithSettings.formSettings) {
            settingsObj = { 
              id: formId, 
              settings: {}, 
              ...fieldWithSettings.formSettings 
            };
          } else {
            settingsObj = { id: formId, settings: {} };
          }
        }
        
        // البحث عن shipping_provider_id للمنتج المحدد
        if (productId) {
          try {
            // استخدام limit(1) بدلاً من single() لتجنب PGRST116
            const { data, error } = await (supabase as any).from('products')
              .select('shipping_provider_id')
              .eq('id', productId)
              .limit(1);
              
            if (error) {
              console.log('⚠️ خطأ في جلب بيانات المنتج:', error);
            } else if (data && data.length > 0 && data[0].shipping_provider_id) {
              const providerId = data[0].shipping_provider_id;
              setShippingProviderId(providerId);
              await fetchShippingProviderSettings(providerId);
              setIsLoadingShippingSettings(false);
              return;
            }
          } catch (error) {
            console.log('⚠️ خطأ في استدعاء جدول products:', error);
          }
        }
        
        // التحقق ما إذا كان النموذج يحتوي على shipping_integration
        if (settingsObj?.settings?.shipping_integration?.enabled && 
            settingsObj.settings.shipping_integration.provider_id) {
          
          const providerId = settingsObj.settings.shipping_integration.provider_id;
          setShippingProviderId(providerId);
          await fetchShippingProviderSettings(providerId);
          setIsLoadingShippingSettings(false);
          return;
        }
        
        // البحث عن مزود شحن افتراضي للمؤسسة
        const providerId = await findClonedShippingProviderId(settingsObj, currentOrganization?.id);
        
        if (providerId) {
          setShippingProviderId(providerId);
          await fetchShippingProviderSettings(providerId);
        } else {
          // استخدام المزود الافتراضي (ياليدين)
          setShippingProviderId(1);
          
          try {
            const defaultSettings = await getDefaultShippingProviderSettings(currentOrganization?.id, 1);
            setShippingProviderSettings(defaultSettings);
          } catch (error) {
            console.log('⚠️ خطأ في جلب الإعدادات الافتراضية:', error);
            setShippingProviderSettings(null);
          }
        }
        
        setIsLoadingShippingSettings(false);
      } catch (error) {
        console.log('⚠️ خطأ عام في getShippingProviderId:', error);
        
        try {
          const defaultSettings = await getDefaultShippingProviderSettings(currentOrganization?.id, 1);
          setShippingProviderSettings(defaultSettings);
        } catch (settingsError) {
          console.log('⚠️ خطأ في جلب الإعدادات الافتراضية في catch:', settingsError);
          setShippingProviderSettings(null);
        }
        setShippingProviderId(1);
        
        setIsLoadingShippingSettings(false);
      }
    };
    
    getShippingProviderId();
  }, [formId, currentOrganization, formFields, productId, setValue, fetchShippingProviderSettings]);

  return {
    shippingProviderId,
    shippingProviderSettings,
    isLoadingShippingSettings,
    fetchShippingProviderSettings,
    deliveryTypeUpdateRef
  };
};
