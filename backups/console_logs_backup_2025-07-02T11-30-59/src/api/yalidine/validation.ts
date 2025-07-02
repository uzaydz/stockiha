/**
 * وظائف للتحقق من صلاحية مفاتيح واعتمادات ياليدين
 */

import { supabase } from '@/lib/supabase-client';
import { yalidineRateLimiter } from './rate-limiter';
import axios from 'axios';

/**
 * وظيفة للتحقق من صلاحية مفاتيح API ياليدين
 * @param organizationId معرف المنظمة
 * @returns true إذا كانت المفاتيح صالحة، false إذا كانت غير صالحة
 */
export async function validateYalidineCredentials(organizationId: string): Promise<boolean> {
  try {

    // تنظيف محدد المعدل قبل البدء للتأكد من عدم وجود حالة عالقة
    if (typeof yalidineRateLimiter.resetStats === 'function') {
      yalidineRateLimiter.resetStats();
    }
    
    // الحصول على بيانات الاعتماد مباشرة من قاعدة البيانات
    const { data: settings, error } = await supabase
      .from('shipping_provider_settings')
      .select('api_token, api_key')
      .eq('organization_id', organizationId)
      .eq('provider_id', 1) // Yalidine provider ID
      .single();
    
    if (error || !settings) {
      return false;
    }

    // استخدام نفس طريقة إنشاء العميل المباشرة كما في وظيفة testCredentials الناجحة

    const directClient = axios.create({
      baseURL: '/yalidine-api/',
      headers: {
        'X-API-ID': settings.api_token || '',     // token هو الرقم التعريفي في نظامنا
        'X-API-TOKEN': settings.api_key || '',    // key هو الرمز الطويل في نظامنا
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      timeout: 10000 // 10 ثواني كحد أقصى
    });
    
    try {

      // استخدام مسار wilayas بدلاً من wilayas/1
      const response = await directClient.get('wilayas');

      // نفس منطق التحقق المستخدم في testCredentials
      if (response.status === 200 && 
         (Array.isArray(response.data) || 
          (response.data && response.data.data && Array.isArray(response.data.data)))) {

        return true;
      }

      return false;
    } catch (apiError: any) {
      
      // معلومات تفصيلية عن الخطأ كما في testCredentials
      if (apiError.response) {
      } else if (apiError.request) {
      } else {
      }
      
      return false;
    }
  } catch (error) {
    return false;
  }
}
