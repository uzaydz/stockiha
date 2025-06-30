import { UseFormReturn } from "react-hook-form";
import { CustomFormField, OrderFormValues, FormSettings, ShippingIntegration } from "./OrderFormTypes";
import { supabase } from '@/lib/supabase-client';

/**
 * تحديد الحقول المتوفرة في النموذج المخصص
 */
export const getAvailableCustomFields = (customFields: CustomFormField[]): Set<string> => {
  const fieldNames = new Set<string>();
  
  if (!customFields || customFields.length === 0) {
    return fieldNames;
  }
  
  customFields.filter(field => field.isVisible).forEach(field => {
    fieldNames.add(field.name);
  });
  
  return fieldNames;
};

/**
 * جمع البيانات من النموذج المخصص
 * @param form - عنصر النموذج
 * @param customFields - تعريف الحقول المخصصة
 */
export function collectCustomFormData(form: HTMLFormElement, customFields: CustomFormField[]): Record<string, any> | null {
  try {
    // تستخدم FormData لجمع البيانات من النموذج
    const formData = new FormData(form);
    const result: Record<string, any> = {};
    
    // جمع البيانات من حقول النموذج المخصصة
    for (const field of customFields) {
      if (!field.isVisible) continue;
      
      // معالجة الحقول حسب النوع
      if (field.type === 'checkbox') {
        result[field.name] = formData.get(field.name) === 'on';
      } else if (field.type === 'radio') {
        result[field.name] = formData.get(field.name);
      } else {
        result[field.name] = formData.get(field.name);
      }
    }
    
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * التحقق من صحة النموذج المخصص
 * @param form - عنصر النموذج
 * @param customFields - تعريف الحقول المخصصة
 */
export function validateCustomForm(form: HTMLFormElement, customFields: CustomFormField[]): { isValid: boolean; errorMessages: string[] } {
  const errorMessages: string[] = [];
  
  // التحقق من حقول النموذج المخصصة
  for (const field of customFields) {
    if (!field.isVisible || !field.required) continue;
    
    const element = form.elements.namedItem(field.name) as HTMLInputElement | HTMLSelectElement | null;
    if (!element) continue;
    
    let value = element.value.trim();
    
    // التحقق من القيمة حسب نوع الحقل
    if (field.type === 'checkbox') {
      if (!(element as HTMLInputElement).checked) {
        errorMessages.push(`${field.label} مطلوب`);
      }
    } else if (value === '') {
      errorMessages.push(`${field.label} مطلوب`);
    } else if (field.validation) {
      // التحقق من الطول
      if (field.validation.minLength && value.length < field.validation.minLength) {
        errorMessages.push(`${field.label} يجب أن يكون على الأقل ${field.validation.minLength} أحرف`);
      }
      
      if (field.validation.maxLength && value.length > field.validation.maxLength) {
        errorMessages.push(`${field.label} يجب أن لا يتجاوز ${field.validation.maxLength} أحرف`);
      }
      
      // التحقق من النمط
      if (field.validation.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(value)) {
          errorMessages.push(field.validation.message || `${field.label} غير صحيح`);
        }
      }
    }
  }
  
  return {
    isValid: errorMessages.length === 0,
    errorMessages
  };
}

/**
 * نقل البيانات من النموذج المخصص إلى النموذج العادي
 * @param formData - بيانات النموذج المخصص
 * @param targetForm - النموذج الهدف
 * @param customFields - تعريف الحقول المخصصة
 */
export function transferCustomFormData(formData: Record<string, any>, targetForm: any, customFields: CustomFormField[]): void {
  // تحديد الحقول المشتركة
  const commonFields = {
    fullName: ['name', 'full_name', 'fullname'],
    phone: ['phone', 'phone_number', 'phonenumber', 'mobile', 'cell'],
    province: ['province', 'state', 'wilaya', 'region'],
    municipality: ['municipality', 'city', 'town', 'commune'],
    address: ['address', 'full_address', 'street_address'],
    notes: ['notes', 'comment', 'comments', 'additional_info']
  };
  
  // البحث في الحقول المخصصة ونقل القيم المناسبة
  for (const [targetField, sourceNames] of Object.entries(commonFields)) {
    for (const sourceName of sourceNames) {
      const field = customFields.find(f => f.name.toLowerCase() === sourceName.toLowerCase() && f.isVisible);
      if (field && formData[field.name]) {
        targetForm.setValue(targetField, formData[field.name]);
        break;
      }
    }
  }
}

/**
 * التحقق من اتصال قاعدة البيانات
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('health_check').select('*').limit(1);
    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * حساب رسوم التوصيل بناءً على إعدادات النموذج ومزود الشحن
 * @param formSettings - إعدادات النموذج
 * @param deliveryOption - خيار التوصيل (منزل أو مكتب)
 * @param wilayaId - رقم الولاية
 * @param shippingCloneId - رقم مزود الشحن المستنسخ (إذا كان موجود)
 */
export async function calculateShippingFee(
  formSettings: FormSettings | null,
  deliveryOption: 'home' | 'desk',
  wilayaId?: number | string,
  shippingCloneId?: number
): Promise<number> {
  // التحقق من وجود معرف مزود شحن مستنسخ
  if (shippingCloneId) {
    try {
      // جلب بيانات المزود المستنسخ
      const { data: cloneData, error: cloneError } = await supabase
        .from('shipping_provider_clones')
        .select('*')
        .eq('id', shippingCloneId)
        .single();
      
      if (cloneError || !cloneData) {
        return deliveryOption === 'home' ? 400 : 350;
      }
      
      // التحقق من وجود أسعار موحدة
      if (cloneData.use_unified_price) {
        if (deliveryOption === 'home') {
          // التحقق من التوصيل المجاني للمنزل
          if (cloneData.is_free_delivery_home) {
            return 0;
          }
          return cloneData.unified_home_price || 400;
        } else {
          // التحقق من التوصيل المجاني للمكتب
          if (cloneData.is_free_delivery_desk) {
            return 0;
          }
          return cloneData.unified_desk_price || 350;
        }
      } else if (wilayaId) {
        // البحث عن أسعار مخصصة للولاية
        const { data: priceData, error: priceError } = await supabase
          .from('shipping_clone_prices')
          .select('home_price, desk_price')
          .eq('clone_id', shippingCloneId)
          .eq('province_id', wilayaId.toString())
          .single();
        
        if (priceError || !priceData) {
          if (deliveryOption === 'home') {
            // التحقق من التوصيل المجاني للمنزل
            if (cloneData.is_free_delivery_home) {
              return 0;
            }
            return cloneData.unified_home_price || 400;
          } else {
            // التحقق من التوصيل المجاني للمكتب
            if (cloneData.is_free_delivery_desk) {
              return 0;
            }
            return cloneData.unified_desk_price || 350;
          }
        }
        
        // استخدام الأسعار المخصصة
        if (deliveryOption === 'home') {
          // التحقق من التوصيل المجاني للمنزل
          if (cloneData.is_free_delivery_home) {
            return 0;
          }
          return priceData.home_price || cloneData.unified_home_price || 400;
        } else {
          // التحقق من التوصيل المجاني للمكتب
          if (cloneData.is_free_delivery_desk) {
            return 0;
          }
          return priceData.desk_price || cloneData.unified_desk_price || 350;
        }
      }
    } catch (error) {
    }
  }
  
  // التحقق من وجود إعدادات النموذج وتكامل الشحن
  if (!formSettings || 
      !formSettings.settings?.shipping_integration?.enabled || 
      !formSettings.settings?.shipping_integration?.provider_id || 
      !wilayaId) {
    // إرجاع الرسوم الافتراضية إذا لم يكن هناك تكامل
    return deliveryOption === 'home' ? 400 : 350;
  }
  
  const providerId = formSettings.settings.shipping_integration.provider_id;
  const providerCode = formSettings.settings.shipping_integration.provider_code || 'yalidine';
  
  try {
    // البحث عن بيانات مزود الشحن لمعرفة نوعه
    const { data: providerData, error: providerError } = await supabase
      .from('shipping_providers')
      .select('code')
      .eq('id', providerId)
      .single();
      
    const isZRExpress = providerData?.code === 'zrexpress' || providerCode === 'zrexpress';
    
    if (isZRExpress) {
      // استخدام استعلام مخصص للحصول على أسعار ZR Express
      const { data: zrData, error: zrError } = await supabase
        .from('zr_express_tarification')
        .select('domicile, stopdesk')
        .eq('id_wilaya', wilayaId.toString())
        .single();
        
      if (!zrError && zrData) {
        if (deliveryOption === 'home') {
          return zrData.domicile || 400;
        } else {
          return zrData.stopdesk || 350;
        }
      }
      
      // إذا لم نجد أسعار ZR Express، نحاول استخدام الأسعار العامة
      const { data: generalRates, error: generalError } = await supabase
        .from('shipping_rates')
        .select('home_price, desk_price')
        .eq('provider_id', providerId)
        .eq('to_region', wilayaId.toString())
        .single();
        
      if (!generalError && generalRates) {
        return deliveryOption === 'home' ? generalRates.home_price : generalRates.desk_price;
      }
    } else {
      // البحث عن رسوم التوصيل في قاعدة البيانات لمزودي الشحن الآخرين
      const { data, error } = await supabase
        .from('shipping_rates')
        .select('home_price, desk_price')
        .eq('provider_id', providerId)
        .eq('to_region', wilayaId.toString())
        .single();
      
      if (!error && data) {
        return deliveryOption === 'home' ? data.home_price : data.desk_price;
      }
    }
  } catch (error) {
  }
  
  // إرجاع الرسوم الافتراضية في حالة الفشل
  return deliveryOption === 'home' ? 400 : 350;
}

/**
 * الحصول على معلومات مزود الشحن المستنسخ
 * @param cloneId - معرف المزود المستنسخ
 */
export async function getShippingProviderClone(cloneId: number) {

  try {
    const { data, error } = await supabase
      .from('shipping_provider_clones')
      .select('*')
      .eq('id', cloneId)
      .single();
    
    if (error) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

/**
 * الحصول على الولايات المتاحة لمزود الشحن المستنسخ
 * @param cloneId - معرف المزود المستنسخ
 * @param deliveryType - نوع التوصيل (منزل أو مكتب)
 */
export async function getAvailableProvincesForClone(cloneId: number, deliveryType: 'home' | 'desk') {
  try {
    // التحقق من معلومات المزود المستنسخ أولاً
    const { data: cloneData, error: cloneError } = await supabase
      .from('shipping_provider_clones')
      .select('*')
      .eq('id', cloneId)
      .single();
    
    if (cloneError || !cloneData) {
      return [];
    }
    
    // التحقق من نوع التوصيل المدعوم
    if (deliveryType === 'home' && !cloneData.is_home_delivery_enabled) {
      
      return [];
    }
    
    if (deliveryType === 'desk' && !cloneData.is_desk_delivery_enabled) {
      
      return [];
    }
    
    // الحصول على أسعار التوصيل للولايات
    const { data: pricesData, error: pricesError } = await supabase
      .from('shipping_clone_prices')
      .select('province_id, province_name, home_price, desk_price')
      .eq('clone_id', cloneId);
    
    if (pricesError) {
      return [];
    }
    
    // تصفية الولايات بناءً على نوع التوصيل
    const availableProvinces = pricesData.filter(price => {
      if (deliveryType === 'home') {
        // إذا كان السعر المنزلي null، فهذا يعني أن التوصيل للمنزل غير متوفر في هذه الولاية
        return price.home_price !== null;
      } else {
        // إذا كان سعر المكتب null، فهذا يعني أن التوصيل للمكتب غير متوفر في هذه الولاية
        return price.desk_price !== null;
      }
    }).map(price => ({
      id: price.province_id,
      name: price.province_name
    }));
    
    return availableProvinces;
  } catch (error) {
    return [];
  }
}

// دالة مساعدة للحصول على إعدادات مزود الشحن
export const getShippingProviderSettings = async (organizationId: string, providerId?: string | number) => {
  try {
    // البحث عن إعدادات مزود الشحن للمؤسسة
    const query = supabase
      .from('shipping_provider_settings')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_enabled', true);

    if (providerId) {
      query.eq('provider_id', providerId);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.log('⚠️ خطأ في جلب إعدادات مزود الشحن:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.log('⚠️ خطأ عام في getShippingProviderSettings:', error);
    return null;
  }
};

// دالة للحصول على معرف مزود الشحن الافتراضي
export const getDefaultShippingProviderId = async (organizationId: string) => {
  try {
    const settings = await getShippingProviderSettings(organizationId);
    return settings?.provider_id || 1; // ياليدين كافتراضي
  } catch (error) {
    console.log('⚠️ خطأ في getDefaultShippingProviderId:', error);
    return 1; // ياليدين كافتراضي
  }
};
