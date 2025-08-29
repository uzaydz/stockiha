import { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../src/lib/supabase-unified';

/**
 * عميل واجهة برمجة التطبيقات لـ Yalidine مع التخزين المؤقت
 * يستخدم نظام التخزين المؤقت لتجنب تجاوز حدود معدل الاستعلامات
 */
export class YalidineApiClient {
  private supabase: SupabaseClient;
  private apiId: string;
  private apiToken: string;
  private baseUrl: string = 'https://api.yalidine.app/v1';

  constructor(yalidineApiId: string, yalidineApiToken: string) {
    this.supabase = supabase; // استخدام العميل الموحد
    this.apiId = yalidineApiId;
    this.apiToken = yalidineApiToken;
  }

  /**
   * استرجاع قائمة الولايات من التخزين المؤقت أو من API
   */
  async getWilayas() {
    try {
      // محاولة تحديث البيانات من API إذا لزم الأمر
      await this.supabase.rpc('update_yalidine_wilayas');
      
      // استرجاع البيانات من قاعدة البيانات
      const { data, error } = await this.supabase
        .from('yalidine_wilayas')
        .select('*')
        .order('id', { ascending: true });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data,
        fromCache: true
      };
    } catch (error) {
      
      // في حالة فشل التخزين المؤقت، حاول استرجاع البيانات مباشرة من API
      return this.fetchWilayasDirectly();
    }
  }

  /**
   * استرجاع قائمة البلديات حسب الولاية من التخزين المؤقت أو من API
   */
  async getCommunes(wilayaId?: number, maxAgeHours: number = 24) {
    try {
      // استرجاع البيانات من وظيفة التخزين المؤقت
      const { data, error } = await this.supabase
        .rpc('get_yalidine_communes', { 
          p_wilaya_id: wilayaId || null,
          p_max_age_hours: maxAgeHours
        });
      
      if (error) throw error;
      
      return {
        success: true,
        data: data,
        fromCache: true
      };
    } catch (error) {
      
      // في حالة فشل التخزين المؤقت، حاول استرجاع البيانات مباشرة من API
      return this.fetchCommunesDirectly(wilayaId);
    }
  }

  /**
   * استرجاع تفاصيل الطرد من التخزين المؤقت أو من API
   */
  async getParcel(tracking: string, maxAgeMinutes: number = 60) {
    try {
      // استرجاع البيانات من وظيفة التخزين المؤقت
      const { data, error } = await this.supabase
        .rpc('get_yalidine_parcel', { 
          p_tracking: tracking,
          p_max_age_minutes: maxAgeMinutes
        });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          success: true,
          data: data[0],
          fromCache: true,
          isFresh: data[0].is_fresh
        };
      } else {
        // الطرد غير موجود في قاعدة البيانات، استرجاعه من API
        return this.fetchParcelDirectly(tracking);
      }
    } catch (error) {
      
      // في حالة فشل التخزين المؤقت، حاول استرجاع البيانات مباشرة من API
      return this.fetchParcelDirectly(tracking);
    }
  }

  /**
   * استرجاع رسوم الشحن من التخزين المؤقت أو من API
   */
  async getShippingFees(fromWilayaId: number, toWilayaId: number, maxAgeDays: number = 7) {
    try {
      // استرجاع البيانات من وظيفة التخزين المؤقت
      const { data, error } = await this.supabase
        .rpc('get_yalidine_fees', { 
          p_from_wilaya_id: fromWilayaId,
          p_to_wilaya_id: toWilayaId,
          p_max_age_days: maxAgeDays
        });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        return {
          success: true,
          data: data[0],
          fromCache: true,
          isFresh: data[0].is_fresh
        };
      } else {
        // بيانات الرسوم غير موجودة في قاعدة البيانات، استرجاعها من API
        return this.fetchFeesDirectly(fromWilayaId, toWilayaId);
      }
    } catch (error) {
      
      // في حالة فشل التخزين المؤقت، حاول استرجاع البيانات مباشرة من API
      return this.fetchFeesDirectly(fromWilayaId, toWilayaId);
    }
  }

  /**
   * إنشاء طرد جديد
   */
  async createParcel(parcelData: any) {
    try {
      // نتحقق أولاً مما إذا كان يمكن إجراء طلب API
      const { data: canRequest, error: canRequestError } = await this.supabase
        .rpc('can_request_yalidine_api');
      
      if (canRequestError) throw canRequestError;
      
      if (!canRequest) {
        throw new Error('Cannot make API request at this time due to rate limits');
      }
      
      // إجراء طلب API لإنشاء طرد جديد
      const response = await fetch(`${this.baseUrl}/parcels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        },
        body: JSON.stringify([parcelData])
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: '/v1/parcels',
          p_success: response.ok,
          p_response_code: response.status
        });
      
      // إذا كان الطلب ناجحًا، نقوم بتحديث التخزين المؤقت
      if (response.ok && responseData) {
        // استخراج بيانات الطرد الجديد
        const trackingKey = parcelData.order_id;
        if (responseData[trackingKey] && responseData[trackingKey].success) {
          const newParcel = {
            tracking: responseData[trackingKey].tracking,
            order_id: parcelData.order_id,
            firstname: parcelData.firstname,
            familyname: parcelData.familyname,
            address: parcelData.address,
            contact_phone: parcelData.contact_phone,
            is_stopdesk: parcelData.is_stopdesk,
            stopdesk_id: parcelData.stopdesk_id,
            from_wilaya_id: null, // سيتم استخراجه من from_wilaya_name
            to_commune_id: null, // سيتم استخراجه من to_commune_name
            to_wilaya_id: null, // سيتم استخراجه من to_wilaya_name
            product_list: parcelData.product_list,
            price: parcelData.price,
            last_status: 'En préparation',
            date_creation: new Date().toISOString(),
            complete_data: responseData[trackingKey]
          };
          
          // إدراج الطرد في قاعدة البيانات
          await this.supabase
            .from('yalidine_parcels')
            .insert(newParcel);
        }
      }
      
      return {
        success: response.ok,
        data: responseData
      };
    } catch (error) {
      return {
        success: false,
        error: error
      };
    }
  }

  /**
   * تتبع الطرود من التخزين المؤقت أو من API
   */
  async trackParcel(tracking: string) {
    return this.getParcel(tracking, 30); // تحديث البيانات إذا كانت أقدم من 30 دقيقة
  }

  /**
   * استرجاع بيانات مراكز التوصيل
   */
  async getCenters(communeId?: number) {
    try {
      // استرجاع البيانات من قاعدة البيانات
      let query = this.supabase
        .from('yalidine_centers')
        .select('*');
      
      if (communeId) {
        query = query.eq('commune_id', communeId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      return {
        success: true,
        data: data,
        fromCache: true
      };
    } catch (error) {
      
      // في حالة فشل التخزين المؤقت، حاول استرجاع البيانات مباشرة من API
      return this.fetchCentersDirectly(communeId);
    }
  }

  // #region طرق مساعدة للاتصال المباشر بـ API إذا فشل التخزين المؤقت

  private async fetchWilayasDirectly() {
    try {
      const response = await fetch(`${this.baseUrl}/wilayas`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: '/v1/wilayas',
          p_success: response.ok,
          p_response_code: response.status
        });
      
      return {
        success: response.ok,
        data: responseData.data,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        fromCache: false
      };
    }
  }

  private async fetchCommunesDirectly(wilayaId?: number) {
    try {
      let url = `${this.baseUrl}/communes`;
      if (wilayaId) {
        url += `?wilaya_id=${wilayaId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: `/v1/communes${wilayaId ? `?wilaya_id=${wilayaId}` : ''}`,
          p_success: response.ok,
          p_response_code: response.status
        });
      
      return {
        success: response.ok,
        data: responseData.data,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        fromCache: false
      };
    }
  }

  private async fetchParcelDirectly(tracking: string) {
    try {
      const response = await fetch(`${this.baseUrl}/parcels/${tracking}`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: `/v1/parcels/${tracking}`,
          p_success: response.ok,
          p_response_code: response.status
        });
      
      // حفظ البيانات في قاعدة البيانات إذا كان الطلب ناجحًا
      if (response.ok && responseData) {
        await this.supabase
          .from('yalidine_parcels')
          .upsert({
            tracking: tracking,
            order_id: responseData.order_id,
            firstname: responseData.firstname,
            familyname: responseData.familyname,
            address: responseData.address,
            contact_phone: responseData.contact_phone,
            is_stopdesk: responseData.is_stopdesk,
            stopdesk_id: responseData.stopdesk_id,
            from_wilaya_id: responseData.from_wilaya_id,
            to_commune_id: responseData.to_commune_id,
            to_wilaya_id: responseData.to_wilaya_id,
            product_list: responseData.product_list,
            price: responseData.price,
            last_status: responseData.last_status,
            date_creation: responseData.date_creation,
            date_last_status: responseData.date_last_status,
            complete_data: responseData,
            last_updated: new Date().toISOString()
          });
      }
      
      return {
        success: response.ok,
        data: responseData,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        fromCache: false
      };
    }
  }

  private async fetchFeesDirectly(fromWilayaId: number, toWilayaId: number) {
    try {
      const response = await fetch(`${this.baseUrl}/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: `/v1/fees/?from_wilaya_id=${fromWilayaId}&to_wilaya_id=${toWilayaId}`,
          p_success: response.ok,
          p_response_code: response.status
        });
      
      // حفظ البيانات في قاعدة البيانات إذا كان الطلب ناجحًا
      if (response.ok && responseData) {
        await this.supabase
          .from('yalidine_fees')
          .upsert({
            from_wilaya_id: fromWilayaId,
            to_wilaya_id: toWilayaId,
            zone: responseData.zone,
            retour_fee: responseData.retour_fee,
            cod_percentage: responseData.cod_percentage,
            insurance_percentage: responseData.insurance_percentage,
            oversize_fee: responseData.oversize_fee,
            fee_data: responseData,
            last_updated: new Date().toISOString()
          });
      }
      
      return {
        success: response.ok,
        data: responseData,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        fromCache: false
      };
    }
  }

  private async fetchCentersDirectly(communeId?: number) {
    try {
      let url = `${this.baseUrl}/centers`;
      if (communeId) {
        url += `?commune_id=${communeId}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      const responseData = await response.json();
      
      // تسجيل طلب API
      await this.supabase
        .rpc('log_yalidine_api_request', {
          p_endpoint: `/v1/centers${communeId ? `?commune_id=${communeId}` : ''}`,
          p_success: response.ok,
          p_response_code: response.status
        });
      
      return {
        success: response.ok,
        data: responseData.data,
        fromCache: false
      };
    } catch (error) {
      return {
        success: false,
        error: error,
        fromCache: false
      };
    }
  }

  // #endregion
}

// مثال للاستخدام:
// const yalidineClient = new YalidineApiClient(
//   'https://your-supabase-url.supabase.co',
//   'your-supabase-anon-key',
//   'your-yalidine-api-id',
//   'your-yalidine-api-token'
// );
// 
// yalidineClient.getWilayas().then(result =>
