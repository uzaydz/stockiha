/**
 * واجهة برمجة التطبيقات (API) لخدمة ياليدين
 * يوفر وظائف لإرسال الطلبات إلى خدمة ياليدين API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { YalidineCredentials } from './types';

// URL الأساسي لـ API ياليدين
const YALIDINE_BASE_URL = 'https://api.yalidine.app/v1/';

// معرف مزود ياليدين في قاعدة البيانات
const YALIDINE_PROVIDER_ID = 5;

// وضع التطوير المحلي - قم بتعيينه إلى true للعمل دون اتصال حقيقي بـ API
// في بيئة الإنتاج يجب أن يكون false
const DEV_MODE = false;

/**
 * جلب بيانات اعتماد ياليدين من قاعدة البيانات
 * @param organizationId معرف المؤسسة
 * @returns بيانات الاعتماد أو null في حالة عدم وجودها
 */
export async function getYalidineCredentials(organizationId: string): Promise<YalidineCredentials | null> {
  try {
    // في وضع التطوير، نقوم بإرجاع بيانات اعتماد وهمية
    if (DEV_MODE) {
      console.log('استخدام بيانات اعتماد وهمية في وضع التطوير');
      return {
        api_id: 'dev_api_id',
        api_token: 'dev_api_token'
      };
    }

    console.log('جاري جلب بيانات اعتماد ياليدين من قاعدة البيانات للمؤسسة:', organizationId);

    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', YALIDINE_PROVIDER_ID)
      .single();
    
    if (error) {
      console.error('خطأ في استعلام Supabase:', error);
      return null;
    }
    
    if (!data || !data.api_token || !data.api_key) {
      console.error('لم يتم العثور على بيانات اعتماد ياليدين في قاعدة البيانات');
      return null;
    }
    
    console.log('تم العثور على بيانات اعتماد ياليدين');
    
    return {
      api_id: data.api_token,
      api_token: data.api_key
    };
  } catch (error) {
    console.error('خطأ أثناء جلب بيانات اعتماد ياليدين:', error);
    
    if (DEV_MODE) {
      console.log('استخدام بيانات اعتماد وهمية في وضع التطوير بعد حدوث خطأ');
      return {
        api_id: 'dev_api_id',
        api_token: 'dev_api_token'
      };
    }
    
    return null;
  }
}

/**
 * إنشاء عميل Axios مهيأ لاستخدام API ياليدين
 * @param credentials بيانات اعتماد ياليدين
 * @returns عميل Axios مهيأ
 */
export function createYalidineApiClient(credentials: YalidineCredentials): AxiosInstance {
  console.log('إنشاء عميل API ياليدين');
  
  return axios.create({
    baseURL: YALIDINE_BASE_URL,
    headers: {
      'X-API-ID': credentials.api_id,
      'X-API-TOKEN': credentials.api_token,
      'Content-Type': 'application/json',
      // إضافة رأس لمعالجة مشاكل CORS
      'Accept': 'application/json, text/plain, */*',
    },
    timeout: 15000, // زيادة مهلة الانتظار إلى 15 ثانية
    // السماح بإرسال ملفات تعريف الارتباط عبر النطاقات
    withCredentials: false
  });
}

/**
 * إنشاء عميل API ياليدين للمؤسسة المحددة
 * @param organizationId معرف المؤسسة
 * @returns عميل API ياليدين أو null في حالة عدم توفر بيانات الاعتماد
 */
export async function getYalidineApiClient(organizationId: string): Promise<AxiosInstance | null> {
  const credentials = await getYalidineCredentials(organizationId);
  
  if (!credentials) {
    console.error('فشل جلب بيانات اعتماد ياليدين');
    return null;
  }
  
  return createYalidineApiClient(credentials);
}

/**
 * التحقق من صحة بيانات اعتماد ياليدين للمؤسسة المحددة
 * @param organizationId معرف المؤسسة
 * @returns true إذا كانت بيانات الاعتماد صالحة، false إذا لم تكن صالحة
 */
export async function validateYalidineCredentials(organizationId: string): Promise<boolean> {
  try {
    console.log('جاري التحقق من صحة بيانات اعتماد ياليدين للمؤسسة:', organizationId);
    
    // في وضع التطوير، نعتبر بيانات الاعتماد صالحة دائمًا
    if (DEV_MODE) {
      console.log('تم تجاوز التحقق من بيانات الاعتماد في وضع التطوير');
      return true;
    }

    const apiClient = await getYalidineApiClient(organizationId);
    
    if (!apiClient) {
      console.error('فشل إنشاء عميل API ياليدين');
      return false;
    }
    
    console.log('جاري إرسال طلب اختباري للتحقق من بيانات الاعتماد');
    
    // اختبار الاستعلام للتحقق من صحة بيانات الاعتماد
    const response = await apiClient.get('wilayas/');
    
    console.log('تم استلام رد من خادم ياليدين:', response.status);
    
    return response.status === 200;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error('خطأ أثناء التحقق من صحة بيانات اعتماد ياليدين:', axiosError);
    
    if (axiosError.response) {
      // الخادم رد بحالة خارج نطاق 2xx
      console.error('رد الخادم:', axiosError.response.status, axiosError.response.data);
    } 
    else if (axiosError.request) {
      // تم إجراء الطلب لكن لم يتم استلام رد
      console.error('لم يتم استلام رد من الخادم:', axiosError.request);
    } 
    else {
      // حدث خطأ أثناء إعداد الطلب
      console.error('خطأ في إعداد الطلب:', axiosError.message);
    }
    
    // في وضع التطوير، إذا كان الخطأ متعلق بالشبكة، نعتبر بيانات الاعتماد صالحة
    if (DEV_MODE && (axiosError.code === 'ERR_NETWORK' || axiosError.message === 'Network Error')) {
      console.log('تم تجاوز خطأ الشبكة في وضع التطوير');
      return true;
    }
    
    // التحقق من وجود مشكلات CORS
    if (axiosError.message.includes('CORS') || (axiosError.response && axiosError.response.status === 0)) {
      console.error('يبدو أن هناك مشكلة في سياسة CORS. هذا خطأ شائع في بيئة التطوير ولا علاقة له ببيانات الاعتماد.');
    }
    
    return false;
  }
}

/**
 * التحقق مما إذا كان الخطأ متعلق بالشبكة
 * @param error الخطأ المراد التحقق منه
 * @returns true إذا كان الخطأ متعلق بالشبكة، false في غير ذلك
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AxiosError) {
    return error.code === 'ERR_NETWORK' || error.message === 'Network Error';
  }
  return false;
} 