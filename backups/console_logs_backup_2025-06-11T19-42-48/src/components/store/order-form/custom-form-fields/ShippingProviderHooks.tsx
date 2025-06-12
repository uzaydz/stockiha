import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from '@/lib/supabase-client';
import type { CustomFormField } from "../types"; // Adjusted import path

// تحديث نوع CustomFormField ليشمل formSettings
interface ExtendedCustomFormField extends CustomFormField {
  formSettings?: {
    id?: string;
    settings?: any;
    [key: string]: any;
  };
}

// دالة للبحث عن معرف مزود الشحن المستنسخ
export async function findClonedShippingProviderId(formSettings: any, orgId: string | null | undefined): Promise<string | number | null> {
  
  // إذا كان المعرف غير موجود، نعود مباشرة
  if (!orgId) {
    return null;
  }
  
  // التحقق ما إذا كان هناك "shipping_integration" مفعل في إعدادات النموذج
  if (formSettings?.settings?.shipping_integration?.enabled && 
      formSettings.settings.shipping_integration.provider_id) {
    // في هذه الحالة نرجع null لأننا سنستخدم المزود الافتراضي للمتجر وليس كلون
    return null;
  }
  
  // التحقق مما إذا كانت إعدادات النموذج تحتوي على shipping_clone_id
  if (formSettings?.settings?.shipping_clone_id) {
    // إذا كانت القيمة هي "default_provider" أو "1"، استخدم null لتفعيل المزود الافتراضي للمتجر
    if (formSettings.settings.shipping_clone_id === "default_provider" || 
        formSettings.settings.shipping_clone_id === "1" || 
        formSettings.settings.shipping_clone_id === 1) {
      return null;
    }
    // نرجع معرف الكلون الموجود في إعدادات النموذج
    return formSettings.settings.shipping_clone_id;
  }
  
  // البحث عن مزود شحن افتراضي للمؤسسة
  try {
    
    const { data, error } = await (supabase as any).from('shipping_provider_clones')
      .select('id')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('created_at', { ascending: false }) // ترتيب بحسب تاريخ الإنشاء (الأحدث أولاً)
      .limit(1);
      
    if (error) {
    } else if (data && Array.isArray(data) && data.length > 0) {
      const defaultCloneId = data[0].id;
      
      // حفظ معرف المزود المستنسخ في formSettings إذا كان متاحاً
      if (formSettings && formSettings.id) {
        try {
          // تحديث إعدادات النموذج في قاعدة البيانات
          const updateResult = await (supabase as any).from('form_settings')
            .update({
              settings: {
                ...formSettings.settings,
                shipping_clone_id: defaultCloneId.toString()
              }
            })
            .eq('id', formSettings.id);
        } catch (updateError) {
        }
      }
      
      return defaultCloneId;
    } else {
    }
  } catch (error) {
  }
  
  // إذا وجدنا shipping_integration وليس shipping_clone_id
  if (formSettings?.settings?.shipping_integration?.provider_id) {
    return null; // نعيد null لاستخدام المزود الافتراضي وليس الكلون
  }
  
  // إذا وصلنا إلى هنا، نستخدم القيمة null (وليس 1) لاستخدام المزود الافتراضي
  return null;
}

// دالة مساعدة للحصول على إعدادات مزود الشحن الافتراضية
export function getDefaultShippingProviderSettings(orgId: string | null | undefined, cloneId: string | number | null) {
  
  // إنشاء وظيفة مساعدة لجلب المعلومات من قاعدة البيانات
  async function fetchDefaultSettings() {
    if (!orgId) return null;
    
    try {
      // إذا كان cloneId محدد ومختلف عن القيمة الافتراضية "1"، نحاول الحصول على إعدادات الكلون
      if (cloneId && cloneId !== 1 && cloneId !== "1" && cloneId !== "default_provider") {
        const { data, error } = await (supabase as any).from('shipping_provider_clones')
          .select('*')
          .eq('id', cloneId)
          .single();
          
        if (!error && data) {
          return data;
        }
      } else {
        // إذا كان cloneId غير محدد (null أو 1)، نحاول الحصول على إعدادات مزود الشحن الافتراضي للمتجر
        
        // البحث عن إعدادات مزود الشحن الافتراضي للمؤسسة
        const { data: providerSettings, error: providerError } = await (supabase as any).from('shipping_provider_settings')
          .select('provider_id, settings')
          .eq('organization_id', orgId)
          .eq('is_enabled', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (!providerError && providerSettings && providerSettings.length > 0) {
          const providerId = providerSettings[0].provider_id;
          
          // استرجاع معلومات إضافية عن مزود الشحن من جدول shipping_providers
          const { data: provider, error: providerInfoError } = await (supabase as any).from('shipping_providers')
            .select('*')
            .eq('id', providerId)
            .single();
            
          if (!providerInfoError && provider) {
            
            // إنشاء كائن إعدادات وهمي يحاكي بنية إعدادات shipping_provider_clones
            const defaultSettings = {
              id: null, // توضيح أننا نستخدم المزود الافتراضي وليس كلون
              organization_id: orgId,
              original_provider_id: providerId,
              name: provider.name || "مزود الشحن الافتراضي للمتجر",
              is_active: true, // افتراضياً، نفعل كلا النوعين من التوصيل
              is_home_delivery_enabled: true,
              is_desk_delivery_enabled: true,
              use_unified_price: true,
              unified_home_price: 800, // قيمة افتراضية للتوصيل المنزلي
              unified_desk_price: 300, // قيمة افتراضية للتوصيل للمكتب
              is_free_delivery_home: false,
              is_free_delivery_desk: false,
              provider_code: provider.code || "yalidine", // استخدام رمز المزود من قاعدة البيانات
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              sync_enabled: false
            };
            return defaultSettings;
          }
        }
      }
    } catch (error) {
    }
    
    return null;
  }
  
  // استدعاء الوظيفة المساعدة وانتظار النتيجة
  const settingsPromise = fetchDefaultSettings();
  
  // تعيين قيم افتراضية أثناء انتظار النتيجة
  return {
    id: cloneId, // قد تكون null لتوضيح أننا نستخدم المزود الافتراضي
    organization_id: orgId || '',
    original_provider_id: null, // سيتم تحديثه بعد جلب البيانات
    name: "مزود الشحن الافتراضي",
    is_active: true,
    is_home_delivery_enabled: true,
    is_desk_delivery_enabled: true,
    use_unified_price: true,
    unified_home_price: 800,
    unified_desk_price: 300,
    is_free_delivery_home: false,
    is_free_delivery_desk: false,
    provider_code: "yalidine", // تعيين القيمة الافتراضية إلى yalidine
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_enabled: false,
    // تسجيل الوعد للتحديث اللاحق
    _promise: settingsPromise
  };
}

export const useShippingProviderLogic = (
  formId: string | undefined,
  formFields: any, // Consider a more specific type
  productId: string | null | undefined,
  currentOrganization: any, // Consider a more specific type
  setValue: Function // Consider a more specific type
) => {
  const [clonedShippingProviderId, setClonedShippingProviderId] = useState<string | number | null>(null);
  const [shippingProviderSettings, setShippingProviderSettings] = useState<any | null>(null);
  const [isLoadingShippingSettings, setIsLoadingShippingSettings] = useState<boolean>(false);
  const deliveryTypeUpdateRef = useRef<{ // This ref might need to be managed differently or passed if used by other hooks
    isHomeOnlyDelivery: boolean;
    isDeskOnlyDelivery: boolean;
    hasBeenUpdated: boolean;
    lastValue?: string;
  }>({
    isHomeOnlyDelivery: false,
    isDeskOnlyDelivery: false,
    hasBeenUpdated: false,
    lastValue: undefined
  });

  // دالة لجلب إعدادات مزود الشحن بناءً على المعرف
  const fetchShippingProviderSettings = useCallback(async (cloneId: string | number) => {
    if (cloneId) {
      try {
        
        // استخدام any لتجاوز التحقق من النوع
        const { data, error } = await (supabase as any).from('shipping_provider_clones')
          .select('*')
          .eq('id', cloneId)
          .single();
          
        if (error) {
          return;
        }
        
        if (data) {
          
          // تأكد من أن القيم البوليانية محددة بشكل صحيح وليست null
          const sanitizedData = {
            ...data,
            is_home_delivery_enabled: data.is_home_delivery_enabled === true,
            is_desk_delivery_enabled: data.is_desk_delivery_enabled === true,
            is_free_delivery_home: data.is_free_delivery_home === true,
            is_free_delivery_desk: data.is_free_delivery_desk === true
          };
          
          // ابحث عن رمز المزود إذا كان غير محدد في الكلون
          if (!sanitizedData.provider_code && sanitizedData.original_provider_id) {
            try {
              
              const { data: providerData, error: providerError } = await (supabase as any).from('shipping_providers')
                .select('code, name')
                .eq('id', sanitizedData.original_provider_id)
                .single();
                
              if (!providerError && providerData) {
                
                // أضف رمز المزود إلى الإعدادات
                sanitizedData.provider_code = providerData.code;
              }
            } catch (providerError) {
            }
          }
          
          // تحقق من المزود الافتراضي للمتجر إذا كان original_provider_id = 1 (ياليدين)
          if (sanitizedData.original_provider_id === 1 && currentOrganization?.id) {
            try {
              
              const { data: defaultProviderData, error: defaultProviderError } = await (supabase as any).from('shipping_provider_settings')
                .select('provider_id')
                .eq('organization_id', currentOrganization.id)
                .eq('is_enabled', true)
                .order('created_at', { ascending: false })
                .limit(1);
                
              if (!defaultProviderError && defaultProviderData && defaultProviderData.length > 0) {
                const defaultProviderId = defaultProviderData[0].provider_id;
                
                // إذا كان المزود الافتراضي للمتجر ليس ياليدين، ابحث عن رمزه
                // التحقق الشامل من أن defaultProviderId صالح قبل البحث
                if (defaultProviderId !== 1 && 
                    defaultProviderId !== null && 
                    defaultProviderId !== undefined &&
                    !isNaN(Number(defaultProviderId)) && 
                    Number(defaultProviderId) > 0) {
                  
                  const numericProviderId = Number(defaultProviderId);
                  const { data: defaultProvider, error: defaultProviderInfoError } = await (supabase as any).from('shipping_providers')
                    .select('code, name')
                    .eq('id', numericProviderId)
                    .single();
                    
                  if (!defaultProviderInfoError && defaultProvider) {
                    
                    // استخدم رمز المزود الافتراضي للمتجر
                    sanitizedData.provider_code = defaultProvider.code;
                    sanitizedData.original_provider_id = defaultProviderId;
                  }
                }
              }
            } catch (defaultProviderError) {
            }
          }
          
          // تخزين إعدادات مزود الشحن
          
          setShippingProviderSettings(sanitizedData);
          
          // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
          deliveryTypeUpdateRef.current.hasBeenUpdated = false;
        }
      } catch (error) {
        
        // تعيين إعدادات افتراضية في حالة الخطأ
        const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, cloneId);
        setShippingProviderSettings(defaultSettings);
        
        // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
        deliveryTypeUpdateRef.current.hasBeenUpdated = false;
      }
    } else {
      
      // استخدام إعدادات افتراضية
      const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
      setShippingProviderSettings(defaultSettings);
      
      // إعادة تعيين مرجع التحديث لتمكين التحديث في useEffect
      deliveryTypeUpdateRef.current.hasBeenUpdated = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization, setShippingProviderSettings, deliveryTypeUpdateRef]); // Added dependencies for useCallback

  // استخراج معرف مزود الشحن المستنسخ
  useEffect(() => {
    if (!currentOrganization) return;
    
    const getShippingCloneId = async () => {
      try {
        // تمكين حالة التحميل
        setIsLoadingShippingSettings(true);
        
        // تحضير كائن formSettings من البيانات المتاحة
        let settingsObj: any = null;
        
        if (formFields && formFields.length > 0) {
          // البحث عن الحقل الذي يحتوي على formSettings
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
        
        // البحث عن shipping_clone_id للمنتج المحدد
        if (productId) {
          
          try {
            const { data, error } = await (supabase as any).from('products')
              .select('shipping_clone_id, purchase_page_config')
              .eq('id', productId)
              .single();
              
            if (error) {
            } else if (data) {
              
              // التحقق من وجود قيمة سليمة ليست 1 أو default_provider
              if (data.shipping_clone_id && 
                  data.shipping_clone_id !== "1" && 
                  data.shipping_clone_id !== 1 && 
                  data.shipping_clone_id !== "default_provider") {
                const cloneId = data.shipping_clone_id;
                setClonedShippingProviderId(cloneId);
                await fetchShippingProviderSettings(cloneId);
                setIsLoadingShippingSettings(false);
                return;
              } else if (data.purchase_page_config && 
                        data.purchase_page_config.shipping_clone_id && 
                        data.purchase_page_config.shipping_clone_id !== "1" && 
                        data.purchase_page_config.shipping_clone_id !== 1 && 
                        data.purchase_page_config.shipping_clone_id !== "default_provider") {
                const cloneId = data.purchase_page_config.shipping_clone_id;
                setClonedShippingProviderId(cloneId);
                await fetchShippingProviderSettings(cloneId);
                setIsLoadingShippingSettings(false);
                return;
              } else if (data.shipping_clone_id === "1" || 
                        data.shipping_clone_id === 1 || 
                        data.shipping_clone_id === "default_provider" ||
                        (data.purchase_page_config && 
                         (data.purchase_page_config.shipping_clone_id === "1" || 
                          data.purchase_page_config.shipping_clone_id === 1 || 
                          data.purchase_page_config.shipping_clone_id === "default_provider"))) {
                // نجعل القيمة null للإشارة إلى استخدام المزود الافتراضي للمتجر
                setClonedShippingProviderId(null);
                // تعيين إعدادات افتراضية
                const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
                setShippingProviderSettings(defaultSettings);
                setIsLoadingShippingSettings(false);
                return;
              } else {
              }
            } else {
            }
          } catch (error) {
          }
        } else {
        }
        
        // التحقق ما إذا كان النموذج يحتوي على shipping_integration
        if (settingsObj?.settings?.shipping_integration?.enabled && 
            settingsObj.settings.shipping_integration.provider_id) {
          
          // نستخدم إعدادات مزود الشحن الافتراضي للمتجر
          setClonedShippingProviderId(null);
          
          // تعيين إعدادات افتراضية ثم انهاء حالة التحميل
          const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
          setShippingProviderSettings(defaultSettings);
          
          setIsLoadingShippingSettings(false);
          return;
        }
        
        // إذا وصلنا إلى هنا، نبحث عن مزود شحن افتراضي باستخدام findClonedShippingProviderId
        const cloneId = await findClonedShippingProviderId(settingsObj, currentOrganization?.id);
        
        if (cloneId) {
          // تم العثور على كلون لمزود الشحن
          setClonedShippingProviderId(cloneId);
          await fetchShippingProviderSettings(cloneId);
        } else {
          // لم يتم العثور على كلون، نستخدم إعدادات المزود الافتراضي للمتجر
          
          // تعيين قيمة null لـ clonedShippingProviderId لتوضيح أننا نستخدم مزود المتجر الافتراضي
          setClonedShippingProviderId(null);
          
          // تعيين إعدادات افتراضية للمزود
          const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
          setShippingProviderSettings(defaultSettings);
        }
        
        // إنهاء حالة التحميل
        setIsLoadingShippingSettings(false);
      } catch (error) {
        
        // تعيين حالة "لا توجد إعدادات" باستخدام الإعدادات الافتراضية في حالة الخطأ
        const defaultSettings = getDefaultShippingProviderSettings(currentOrganization?.id, null);
        setShippingProviderSettings(defaultSettings);
        setClonedShippingProviderId(null);
        
        setIsLoadingShippingSettings(false);
      }
    };
    
    getShippingCloneId();
  }, [formId, currentOrganization, formFields, productId, setValue, fetchShippingProviderSettings]); // fetchShippingProviderSettings is now stable

  return {
    clonedShippingProviderId,
    shippingProviderSettings,
    isLoadingShippingSettings,
    fetchShippingProviderSettings, // Exporting this to be used by other hooks/components if needed
    deliveryTypeUpdateRef // Exporting ref - careful with its usage across hooks
  };
};
