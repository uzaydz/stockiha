/**
 * تكامل خدمة الشحن ياليدين مع النماذج
 * 
 * هذه الوحدة توفر وظائف للتفاعل مع خدمة الشحن ياليدين من النماذج
 */

import { supabase } from '@/lib/supabase-client';
import { ShippingProvider } from './shippingService';
import { 
  getProvinces as fetchProvinces,
  getMunicipalitiesByDeliveryType,
  getCenters as fetchCenters,
  getCentersByCommune as fetchCentersByCommune,
  calculateDeliveryPrice as calculateYalidineDeliveryPrice,
  Province,
  Municipality,
  Center,
  DeliveryType
} from './yalidine/service';
import { validateYalidineCredentials } from './yalidine';

// تصدير الأنواع ليتم استخدامها في الواجهة
export type { Province, Municipality, Center, DeliveryType };

/**
 * التحقق من قاعدة البيانات وبيانات اعتماد ياليدين
 * @param organizationId معرف المؤسسة
 * @returns نتيجة التشخيص
 */
export async function checkYalidineConfiguration(organizationId: string): Promise<{
  success: boolean;
  message: string;
  data?: any;
}> {
  try {
    
    
    // التحقق من وجود جدول shipping_provider_settings
    const { data: tableInfo, error: tableError } = await supabase
      .from('shipping_provider_settings')
      .select('id, provider_id')
      .limit(1);
    
    if (tableError) {
      console.error('خطأ في الوصول إلى جدول بيانات الشحن:', tableError);
      return { 
        success: false, 
        message: 'فشل الوصول إلى جدول بيانات الشحن: ' + tableError.message 
      };
    }
    
    
    
    // التحقق من وجود بيانات اعتماد ياليدين للمؤسسة المحددة
    const { data: yalidineSettings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('id, provider_id, api_key, api_token, created_at')
      .eq('organization_id', organizationId)
      .eq('provider_id', 1)  // ياليدين ID = 1 بدلاً من 5
      .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب الخطأ إذا لم يتم العثور على نتائج
    
    if (settingsError && settingsError.code !== 'PGRST116') {
      // PGRST116 هو خطأ "لم يتم العثور على نتائج" وهو ما نتوقعه في بعض الحالات
      console.error('خطأ في جلب بيانات اعتماد ياليدين للمؤسسة:', settingsError);
      return { 
        success: false, 
        message: 'حدث خطأ أثناء البحث عن بيانات اعتماد ياليدين: ' + settingsError.message
      };
    }
    
    if (!yalidineSettings || !yalidineSettings.api_key || !yalidineSettings.api_token) {
      console.error('بيانات اعتماد ياليدين غير مكتملة أو غير موجودة');
      return { 
        success: false, 
        message: 'بيانات اعتماد ياليدين غير مكتملة أو غير موجودة' 
      };
    }
    
    
    
    // إخفاء معلومات حساسة قبل الإرجاع
    const safeData = {
      ...yalidineSettings,
      organization_id: organizationId,
      api_key: yalidineSettings.api_key.substring(0, 3) + '****',
      api_token: yalidineSettings.api_token.substring(0, 3) + '****',
    };
    
    return {
      success: true,
      message: 'تم التحقق من تكوين ياليدين بنجاح',
      data: safeData
    };
  } catch (error) {
    console.error('خطأ أثناء فحص تكوين ياليدين:', error);
    return { 
      success: false, 
      message: 'خطأ غير متوقع: ' + (error instanceof Error ? error.message : String(error)) 
    };
  }
}

/**
 * جلب الولايات من ياليدين
 * @param organizationId معرف المؤسسة
 * @returns قائمة بالولايات
 */
export async function getProvinces(organizationId: string): Promise<Province[]> {
  try {
    
    const provinces = await fetchProvinces(organizationId);
    
    // ترتيب الولايات أبجديًا بالعربية
    return provinces.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('خطأ في جلب الولايات:', error);
    return [];
  }
}

/**
 * جلب البلديات حسب الولاية ونوع التوصيل
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 * @param deliveryType نوع التوصيل (منزلي أو مكتب)
 */
export async function getMunicipalities(
  organizationId: string,
  provinceId: string,
  deliveryType: DeliveryType
): Promise<Municipality[]> {
  try {
    
    
    // استخدام الوظيفة المخصصة لتصفية البلديات حسب نوع التوصيل
    const municipalities = await getMunicipalitiesByDeliveryType(
      organizationId,
      provinceId,
      deliveryType,
      '' // إضافة وسيط toWilayaName فارغ هنا
    );
    
    // ترتيب البلديات أبجديًا بالعربية
    return municipalities.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('خطأ في جلب البلديات:', error);
    return [];
  }
}

/**
 * جلب مراكز الاستلام لولاية محددة
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 * @returns قائمة بمراكز الاستلام
 */
export async function getCenters(
  organizationId: string,
  provinceId: string
): Promise<Center[]> {
  try {
    
    
    const centers = await fetchCenters(organizationId, provinceId);
    
    // ترتيب المراكز أبجديًا بالعربية
    return centers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('خطأ في جلب مراكز الاستلام:', error);
    return [];
  }
}

/**
 * جلب مراكز الاستلام لبلدية محددة
 * @param organizationId معرف المؤسسة
 * @param communeId معرف البلدية
 * @returns قائمة بمراكز الاستلام في البلدية المحددة
 */
export async function getCentersByCommune(
  organizationId: string,
  communeId: string
): Promise<Center[]> {
  try {
    
    
    const centers = await fetchCentersByCommune(organizationId, communeId);
    
    // ترتيب المراكز أبجديًا بالعربية
    return centers.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
  } catch (error) {
    console.error('خطأ في جلب مراكز الاستلام للبلدية:', error);
    return [];
  }
}

/**
 * حساب سعر التوصيل
 * @param organizationId معرف المؤسسة
 * @param fromProvinceId معرف ولاية الإرسال
 * @param toProvinceId معرف ولاية الاستلام
 * @param toCommuneId معرف بلدية الاستلام
 * @param deliveryType نوع التوصيل (منزلي أو مكتب)
 * @param weight وزن الشحنة (اختياري)
 * @returns سعر التوصيل
 */
export async function getDeliveryPrice(
  organizationId: string,
  fromProvinceId: string,
  toProvinceId: string,
  toCommuneId: string,
  deliveryType: DeliveryType,
  weight?: number
): Promise<number | null> {
  try {
    
    
    const price = await calculateYalidineDeliveryPrice(
      organizationId,
      fromProvinceId,
      toProvinceId,
      toCommuneId,
      deliveryType,
      weight || 1
    );
    
    return price;
  } catch (error) {
    console.error('خطأ في حساب سعر التوصيل:', error);
    return null;
  }
}

/**
 * يربط إعدادات النموذج مع مزود الشحن
 * @param formId - معرف النموذج
 * @param shippingSettings - إعدادات الشحن
 * @returns 
 */
export async function updateFormShippingIntegration(
  formId: string, 
  shippingSettings: {
    enabled: boolean;
    provider: string | null;
  }
) {
  try {
    // تحديث إعدادات النموذج في قاعدة البيانات
    const { data, error } = await supabase
      .from('form_settings')
      .update({
        settings: {
          shipping_integration: {
            enabled: shippingSettings.enabled,
            provider_id: shippingSettings.provider
          }
        },
        version: supabase.rpc('increment_version', { row_id: formId })
      })
      .eq('id', formId)
      .select('id, version, settings')
      .single();

    if (error) throw error;
    
    return { 
      success: true, 
      data,
      message: 'تم تحديث إعدادات الشحن بنجاح'
    };
  } catch (error) {
    console.error('Error updating form shipping integration:', error);
    return { 
      success: false, 
      error,
      message: 'حدث خطأ أثناء تحديث إعدادات الشحن'
    };
  }
}

/**
 * يجلب إعدادات الشحن المرتبطة بالنموذج
 * @param formId - معرف النموذج
 * @returns 
 */
export async function getFormShippingIntegration(formId: string) {
  try {
    const { data, error } = await supabase
      .from('form_settings')
      .select('settings')
      .eq('id', formId)
      .single();

    if (error) throw error;
    
    const shippingIntegration = data?.settings?.shipping_integration || {
      enabled: false,
      provider_id: null
    };
    
    return { 
      success: true, 
      data: {
        enabled: shippingIntegration.enabled,
        provider: shippingIntegration.provider_id
      }
    };
  } catch (error) {
    console.error('Error fetching form shipping integration:', error);
    return { 
      success: false, 
      error,
      data: {
        enabled: false,
        provider: null
      }
    };
  }
} 