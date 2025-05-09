/**
 * تكامل خدمة الشحن ياليدين مع النماذج
 * 
 * هذه الوحدة توفر وظائف للتفاعل مع خدمة الشحن ياليدين من النماذج
 */

import { supabase } from '@/lib/supabase-client';
import { ShippingProvider } from './shippingService';
import { 
  validateYalidineCredentials,
  getProvinces as fetchProvinces,
  getMunicipalitiesByDeliveryType,
  getCenters,
  getCentersByCommune,
  calculateDeliveryPrice,
  Province,
  Municipality,
  Center,
  DeliveryType
} from './yalidine';

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
    console.log('فحص تكوين ياليدين لـ المؤسسة:', organizationId);
    
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
    
    console.log('جدول بيانات الشحن موجود، جاري فحص بيانات المؤسسة');
    
    // التحقق من وجود بيانات اعتماد ياليدين للمؤسسة المحددة
    const { data: yalidineSettings, error: settingsError } = await supabase
      .from('shipping_provider_settings')
      .select('id, provider_id, api_key, api_token, created_at')
      .eq('organization_id', organizationId)
      .eq('provider_id', 5)  // ياليدين ID = 5
      .single();
    
    if (settingsError) {
      console.error('خطأ في جلب بيانات اعتماد ياليدين للمؤسسة:', settingsError);
      return { 
        success: false, 
        message: 'لم يتم العثور على بيانات اعتماد ياليدين للمؤسسة: ' + settingsError.message
      };
    }
    
    if (!yalidineSettings || !yalidineSettings.api_key || !yalidineSettings.api_token) {
      console.error('بيانات اعتماد ياليدين غير مكتملة أو غير موجودة');
      return { 
        success: false, 
        message: 'بيانات اعتماد ياليدين غير مكتملة أو غير موجودة' 
      };
    }
    
    console.log('تم العثور على بيانات اعتماد ياليدين للمؤسسة');
    
    // إخفاء معلومات حساسة قبل الإرجاع
    const safeData = {
      ...yalidineSettings,
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
 * جلب قائمة الولايات من مزود ياليدين
 * @param organizationId معرف المؤسسة
 */
export async function getProvinces(
  organizationId: string
): Promise<Province[]> {
  try {
    // التحقق من وجود بيانات اعتماد صالحة
    const isValid = await validateYalidineCredentials(organizationId);
    
    if (!isValid) {
      console.error('بيانات اعتماد ياليدين غير صالحة');
      return [];
    }
    
    return await fetchProvinces(organizationId);
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
    return await getMunicipalitiesByDeliveryType(
      organizationId,
      provinceId,
      deliveryType
    );
  } catch (error) {
    console.error('خطأ في جلب البلديات:', error);
    return [];
  }
}

/**
 * جلب مراكز التوصيل حسب الولاية
 * @param organizationId معرف المؤسسة
 * @param provinceId معرف الولاية
 */
export async function getDeliveryCenters(
  organizationId: string,
  provinceId: string
): Promise<Center[]> {
  try {
    return await getCenters(organizationId, provinceId);
  } catch (error) {
    console.error('خطأ في جلب مراكز التوصيل:', error);
    return [];
  }
}

/**
 * جلب مراكز التوصيل حسب البلدية
 * @param organizationId معرف المؤسسة
 * @param communeId معرف البلدية
 */
export async function getDeliveryCentersByCommune(
  organizationId: string,
  communeId: string
): Promise<Center[]> {
  try {
    return await getCentersByCommune(organizationId, communeId);
  } catch (error) {
    console.error('خطأ في جلب مراكز التوصيل للبلدية:', error);
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
 * @param weight وزن الشحنة بالكيلوغرام (اختياري)
 */
export async function getDeliveryPrice(
  organizationId: string,
  fromProvinceId: string,
  toProvinceId: string,
  toCommuneId: string,
  deliveryType: DeliveryType,
  weight: number = 1
): Promise<number | null> {
  try {
    const price = await calculateDeliveryPrice(
      organizationId,
      fromProvinceId,
      toProvinceId,
      toCommuneId,
      deliveryType,
      weight
    );
    
    return price;
  } catch (error) {
    console.error('خطأ في حساب سعر التوصيل:', error);
    return null;
  }
}

// تصدير الأنواع
export type { Province, Municipality, Center, DeliveryType }; 