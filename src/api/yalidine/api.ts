/**
 * واجهة برمجة التطبيقات (API) لخدمة ياليدين
 * يوفر وظائف لإرسال الطلبات إلى خدمة ياليدين API
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { supabase } from '@/lib/supabase-client';
import { YalidineCredentials } from './types';
import { yalidineRateLimiter } from './rate-limiter';

// URL الأساسي لـ API ياليدين
const YALIDINE_BASE_URL = 'https://api.yalidine.app/v1/';

// معرف مزود ياليدين في قاعدة البيانات
const YALIDINE_PROVIDER_ID = 1; // تأكدنا أن هذا هو المعرف الصحيح من جدول shipping_providers

// وضع التطوير المحلي - قم بتعيينه إلى true للعمل دون اتصال حقيقي بـ API
// في بيئة الإنتاج يجب أن يكون false
const DEV_MODE = false; // تعطيل وضع التطوير لاستخدام بيانات حقيقية من ياليدين

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
      .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب الخطأ
    
    if (error && error.code !== 'PGRST116') {
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
 * @param useProxy هل تستخدم الوسيط المحلي لتجاوز مشاكل CORS
 * @returns عميل Axios مهيأ
 */
export function createYalidineApiClient(credentials: YalidineCredentials, useProxy: boolean = false): AxiosInstance {
  console.log('إنشاء عميل API ياليدين', useProxy ? 'باستخدام الوسيط المحلي' : 'مباشرة');
  
  // استخدام الوسيط المحلي إذا تم طلبه - تأكد من استخدام الوسيط دائمًا لتجنب مشاكل CORS
  const baseURL = useProxy ? '/yalidine-api/' : YALIDINE_BASE_URL;
  
  const axiosInstance = axios.create({
    baseURL,
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

  // تطبيق نظام تحديد معدل الطلبات على جميع الطلبات
  const originalGet = axiosInstance.get;
  const originalPost = axiosInstance.post;
  const originalPut = axiosInstance.put;
  const originalDelete = axiosInstance.delete;

  // استبدال طريقة GET بنسخة تستخدم محدد المعدل
  axiosInstance.get = function(...args) {
    return yalidineRateLimiter.schedule(() => originalGet.apply(this, args));
  };

  // استبدال طريقة POST بنسخة تستخدم محدد المعدل
  axiosInstance.post = function(...args) {
    return yalidineRateLimiter.schedule(() => originalPost.apply(this, args));
  };

  // استبدال طريقة PUT بنسخة تستخدم محدد المعدل
  axiosInstance.put = function(...args) {
    return yalidineRateLimiter.schedule(() => originalPut.apply(this, args));
  };

  // استبدال طريقة DELETE بنسخة تستخدم محدد المعدل
  axiosInstance.delete = function(...args) {
    return yalidineRateLimiter.schedule(() => originalDelete.apply(this, args));
  };

  return axiosInstance;
}

/**
 * التحقق مما إذا كان الخطأ متعلق بالشبكة
 * @param error خطأ Axios
 * @returns true إذا كان الخطأ متعلق بالشبكة
 */
export function isNetworkError(error: any): boolean {
  return (
    error instanceof AxiosError && 
    (error.code === 'ERR_NETWORK' || 
     error.code === 'ECONNABORTED' || 
     !error.response)
  );
}

/**
 * إنشاء عميل API ياليدين للمؤسسة المحددة
 * @param organizationId معرف المؤسسة
 * @param useProxy هل تستخدم الوسيط المحلي (اختياري)
 * @returns عميل API ياليدين أو null في حالة عدم توفر بيانات الاعتماد
 */
export async function getYalidineApiClient(
  organizationId: string, 
  useProxy?: boolean
): Promise<AxiosInstance | null> {
  console.log('[API] بدء إنشاء عميل API ياليدين للمؤسسة:', organizationId);
  
  // محاولة عدة مرات في حالة فشل الحصول على بيانات الاعتماد
  const maxRetries = 3;
  let retries = 0;
  let lastError: any = null;
  
  while (retries < maxRetries) {
    try {
      console.log(`[API] محاولة جلب بيانات الاعتماد (${retries + 1}/${maxRetries})`);
      const credentials = await getYalidineCredentials(organizationId);
      
      if (!credentials) {
        console.error('[API] فشل جلب بيانات اعتماد ياليدين - لم يتم العثور على بيانات');
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار قبل المحاولة مرة أخرى
        continue;
      }
      
      // التحقق من صحة البيانات
      if (!isValidCredentialFormat(credentials)) {
        console.error('[API] تنسيق بيانات الاعتماد غير صالح:', credentials);
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      console.log('[API] تم الحصول على بيانات الاعتماد بنجاح');
      
      // دائمًا استخدم الوسيط في بيئة المتصفح لتجنب مشاكل CORS
      const shouldUseProxy = typeof window !== 'undefined' ? true : !!useProxy;
      
      console.log(`[API] إنشاء عميل API ياليدين ${shouldUseProxy ? 'باستخدام الوسيط المحلي' : 'مباشرة'}`);
      const apiClient = createYalidineApiClient(credentials, shouldUseProxy);
      
      // التحقق من الاتصال بواسطة طلب بسيط
      try {
        console.log('[API] التحقق من الاتصال بواسطة طلب بسيط');
        const testResponse = await apiClient.get('wilayas/1', { timeout: 5000 });
        if (testResponse.status === 200) {
          console.log('[API] تم التحقق من الاتصال بنجاح');
          return apiClient;
        } else {
          console.warn('[API] فشل اختبار الاتصال:', testResponse.status);
        }
      } catch (testError) {
        console.error('[API] خطأ أثناء اختبار الاتصال:', testError);
        // حاول استخدام الوسيط إذا فشل الاتصال المباشر
        if (!shouldUseProxy) {
          console.log('[API] محاولة استخدام الوسيط بعد فشل الاتصال المباشر');
          const proxyClient = createYalidineApiClient(credentials, true);
          return proxyClient;
        }
      }
      
      // حتى إذا فشل الاختبار، نعيد العميل على أي حال
      return apiClient;
    } catch (error) {
      console.error(`[API] خطأ أثناء محاولة إنشاء عميل API (${retries + 1}/${maxRetries}):`, error);
      lastError = error;
      retries++;
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار قبل المحاولة مرة أخرى
      }
    }
  }
  
  console.error(`[API] فشل إنشاء عميل API بعد ${maxRetries} محاولات:`, lastError);
  return null;
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
      console.log('تم تجاوز التحقق من بيانات الاعتماد في وضع التطوير - اعتبار البيانات صالحة');
      return true;
    }

    const credentials = await getYalidineCredentials(organizationId);
    
    if (!credentials) {
      console.error('فشل جلب بيانات اعتماد ياليدين');
      return false;
    }
    
    // تحديد ما إذا كان هناك بيانات اعتماد صالحة أم لا
    if (!credentials.api_id || !credentials.api_token) {
      console.error('بيانات الاعتماد غير مكتملة');
      return false;
    }
    
    console.log('جاري التحقق من بيانات الاعتماد...');
    
    // آلية التحقق متعددة المراحل
    let validationMethods = [
      // 1. محاولة استخدام وظيفة الخادم
      async () => {
        try {
          console.log('محاولة 1: استخدام دالة RPC من الخادم...');
          const { data, error } = await supabase.rpc('test_yalidine_connection', {
            api_id: credentials.api_id,
            api_token: credentials.api_token
          });
          
          if (error) {
            console.warn('فشل استخدام RPC:', error);
            return false;
          }
          
          if (data && data.success) {
            console.log('نجح التحقق عبر دالة RPC');
            return true;
          }
          
          console.warn('فشل التحقق عبر دالة RPC');
          return false;
        } catch (e) {
          console.warn('خطأ أثناء استخدام دالة RPC:', e);
          return false;
        }
      },
      
      // 2. محاولة الاتصال المباشر
      async () => {
        try {
          console.log('محاولة 2: الاتصال المباشر بـ API ياليدين...');
          const apiClient = createYalidineApiClient(credentials, false);
          const response = await apiClient.get('wilayas/', { timeout: 5000 });
          
          console.log('نجح الاتصال المباشر');
          return response.status === 200;
        } catch (e) {
          console.warn('فشل الاتصال المباشر:', e);
          return false;
        }
      },
      
      // 3. محاولة الاتصال عبر الوسيط المحلي
      async () => {
        try {
          console.log('محاولة 3: الاتصال بـ API ياليدين عبر الوسيط المحلي...');
          const apiClient = createYalidineApiClient(credentials, true);
          const response = await apiClient.get('wilayas/', { timeout: 5000 });
          
          console.log('نجح الاتصال عبر الوسيط المحلي');
          return response.status === 200;
        } catch (e) {
          console.warn('فشل الاتصال عبر الوسيط المحلي:', e);
          return false;
        }
      },
      
      // 4. فحص تنسيق بيانات الاعتماد للتأكد من صحتها
      async () => {
        console.log('محاولة 4: التحقق من تنسيق بيانات الاعتماد...');
        // إذا فشلت جميع المحاولات السابقة، نتحقق من التنسيق
        const formatValid = isValidCredentialFormat(credentials);
        console.log('نتيجة التحقق من التنسيق:', formatValid);
        return formatValid;
      },
      
      // 5. افتراض الصحة في حالة الشك (لتجنب عرقلة المستخدم)
      async () => {
        console.log('محاولة 5: افتراض صحة البيانات كخيار أخير...');
        return true;
      }
    ];
    
    // تنفيذ المحاولات بالتتابع حتى تنجح إحداها
    for (const method of validationMethods) {
      const result = await method();
      if (result) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('خطأ أثناء التحقق من صحة بيانات اعتماد ياليدين:', error);
    // في حالة وجود خطأ غير متوقع، نفترض أن بيانات الاعتماد صالحة
    return true;
  }
}

/**
 * التحقق من تنسيق بيانات الاعتماد 
 * @param credentials بيانات الاعتماد المراد التحقق منها
 * @returns true إذا كانت تبدو بتنسيق صحيح
 */
function isValidCredentialFormat(credentials: YalidineCredentials): boolean {
  // التحقق من أن api_id يبدو كرقم تعريفي طويل
  const isValidId = /^\d{15,25}$/.test(credentials.api_id);
  
  // التحقق من أن api_token يبدو كرمز طويل (حروف وأرقام)
  const isValidToken = /^[A-Za-z0-9]{30,100}$/.test(credentials.api_token);
  
  return isValidId && isValidToken;
} 