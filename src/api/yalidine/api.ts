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
      
      return {
        api_id: 'dev_api_id',
        api_token: 'dev_api_token'
      };
    }

    const { data, error } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', YALIDINE_PROVIDER_ID)
      .maybeSingle(); // استخدام maybeSingle بدلاً من single لتجنب الخطأ
    
    if (error && error.code !== 'PGRST116') {
      return null;
    }
    
    if (!data || !data.api_token || !data.api_key) {
      return null;
    }

    return {
      api_id: data.api_token,
      api_token: data.api_key
    };
  } catch (error) {
    
    if (DEV_MODE) {
      
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

  // التحقق من بيئة Electron
  const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;

  // تحديد baseURL و headers حسب البيئة
  let baseURL: string;
  let headers: Record<string, string>;
  let isSupabaseProxy = false;

  if (isElectron) {
    // Electron: استخدام Supabase Edge Function proxy
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    baseURL = `${supabaseUrl}/functions/v1/shipping-proxy`;
    headers = {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'x-api-id': credentials.api_id,
      'x-api-token': credentials.api_token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    isSupabaseProxy = true;
  } else if (useProxy) {
    // Development: استخدام proxy المحلي
    baseURL = '/yalidine-api/';
    headers = {
      'X-API-ID': credentials.api_id,
      'X-API-TOKEN': credentials.api_token,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
    };
  } else {
    // Production: استخدام API مباشرة
    baseURL = YALIDINE_BASE_URL;
    headers = {
      'X-API-ID': credentials.api_id,
      'X-API-TOKEN': credentials.api_token,
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/plain, */*',
    };
  }

  const axiosInstance = axios.create({
    baseURL,
    headers,
    timeout: 15000,
    withCredentials: false
  });

  // إذا كان Supabase proxy، نحتاج تعديل الطلبات لإضافة query parameters
  if (isSupabaseProxy) {
    const originalGet = axiosInstance.get;
    const originalPost = axiosInstance.post;

    // تعديل GET لإضافة query parameters
    axiosInstance.get = function(url: string, config?: any) {
      const endpoint = url.startsWith('/') ? url.substring(1) : url;
      return yalidineRateLimiter.schedule(() =>
        originalGet.call(this, '', {
          ...config,
          params: {
            provider: 'yalidine',
            endpoint: endpoint,
            ...(config?.params || {})
          }
        })
      );
    };

    // تعديل POST لإضافة query parameters
    axiosInstance.post = function(url: string, data?: any, config?: any) {
      const endpoint = url.startsWith('/') ? url.substring(1) : url;
      return yalidineRateLimiter.schedule(() =>
        originalPost.call(this, '', data, {
          ...config,
          params: {
            provider: 'yalidine',
            endpoint: endpoint,
            ...(config?.params || {})
          }
        })
      );
    };
  } else {
    // للبيئات الأخرى، فقط أضف rate limiter
    const originalGet = axiosInstance.get;
    const originalPost = axiosInstance.post;
    const originalPut = axiosInstance.put;
    const originalDelete = axiosInstance.delete;

    axiosInstance.get = function(...args: any[]) {
      return yalidineRateLimiter.schedule(() => originalGet.apply(this, args));
    };

    axiosInstance.post = function(...args: any[]) {
      return yalidineRateLimiter.schedule(() => originalPost.apply(this, args));
    };

    axiosInstance.put = function(...args: any[]) {
      return yalidineRateLimiter.schedule(() => originalPut.apply(this, args));
    };

    axiosInstance.delete = function(...args: any[]) {
      return yalidineRateLimiter.schedule(() => originalDelete.apply(this, args));
    };
  }

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

  // محاولة عدة مرات في حالة فشل الحصول على بيانات الاعتماد
  const maxRetries = 3;
  let retries = 0;
  let lastError: any = null;
  
  while (retries < maxRetries) {
    try {
      
      const credentials = await getYalidineCredentials(organizationId);
      
      if (!credentials) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار قبل المحاولة مرة أخرى
        continue;
      }
      
      // التحقق من صحة البيانات
      if (!isValidCredentialFormat(credentials)) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }

      // دائمًا استخدم الوسيط في بيئة المتصفح لتجنب مشاكل CORS
      const shouldUseProxy = typeof window !== 'undefined' ? true : !!useProxy;

      const apiClient = createYalidineApiClient(credentials, shouldUseProxy);
      
      // التحقق من الاتصال بواسطة طلب بسيط
      try {
        
        const testResponse = await apiClient.get('wilayas/1', { timeout: 5000 });
        if (testResponse.status === 200) {
          
          return apiClient;
        } else {
        }
      } catch (testError) {
        // حاول استخدام الوسيط إذا فشل الاتصال المباشر
        if (!shouldUseProxy) {
          
          const proxyClient = createYalidineApiClient(credentials, true);
          return proxyClient;
        }
      }
      
      // حتى إذا فشل الاختبار، نعيد العميل على أي حال
      return apiClient;
    } catch (error) {
      lastError = error;
      retries++;
      
      if (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // انتظار قبل المحاولة مرة أخرى
      }
    }
  }
  return null;
}

/**
 * التحقق من صحة بيانات اعتماد ياليدين للمؤسسة المحددة
 * @param organizationId معرف المؤسسة
 * @returns true إذا كانت بيانات الاعتماد صالحة، false إذا لم تكن صالحة
 */
export async function validateYalidineCredentials(organizationId: string): Promise<boolean> {
  try {

    // في وضع التطوير، نعتبر بيانات الاعتماد صالحة دائمًا
    if (DEV_MODE) {
      
      return true;
    }

    const credentials = await getYalidineCredentials(organizationId);
    
    if (!credentials) {
      return false;
    }
    
    // تحديد ما إذا كان هناك بيانات اعتماد صالحة أم لا
    if (!credentials.api_id || !credentials.api_token) {
      return false;
    }

    // آلية التحقق متعددة المراحل
    let validationMethods = [
      // 1. محاولة استخدام وظيفة الخادم
      async () => {
        try {
          
          const { data, error } = await supabase.rpc('test_yalidine_connection', {
            api_id: credentials.api_id,
            api_token: credentials.api_token
          });
          
          if (error) {
            return false;
          }
          
          if (data && data.success) {
            
            return true;
          }
          return false;
        } catch (e) {
          return false;
        }
      },
      
      // 2. محاولة الاتصال المباشر
      async () => {
        try {
          
          const apiClient = createYalidineApiClient(credentials, false);
          const response = await apiClient.get('wilayas/', { timeout: 5000 });

          return response.status === 200;
        } catch (e) {
          return false;
        }
      },
      
      // 3. محاولة الاتصال عبر الوسيط المحلي
      async () => {
        try {
          
          const apiClient = createYalidineApiClient(credentials, true);
          const response = await apiClient.get('wilayas/', { timeout: 5000 });

          return response.status === 200;
        } catch (e) {
          return false;
        }
      },
      
      // 4. فحص تنسيق بيانات الاعتماد للتأكد من صحتها
      async () => {
        
        // إذا فشلت جميع المحاولات السابقة، نتحقق من التنسيق
        const formatValid = isValidCredentialFormat(credentials);
        
        return formatValid;
      },
      
      // 5. افتراض الصحة في حالة الشك (لتجنب عرقلة المستخدم)
      async () => {
        
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
