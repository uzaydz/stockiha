import { createClient, SupabaseClient } from '@supabase/supabase-js';
import axios from 'axios';

/**
 * عميل واجهة برمجة التطبيقات لـ Yalidine مع التخزين المؤقت
 * يستخدم نظام التخزين المؤقت لتجنب تجاوز حدود معدل الاستعلامات
 */

// إضافة خيارات تكوين للتحكم في سلوك العميل
interface YalidineApiClientOptions {
  cacheTTL?: number; // عدد الدقائق قبل تحديث البيانات المخزنة مؤقتاً
  maxRetries?: number; // عدد المحاولات القصوى للاتصال بـ API
  preferCache?: boolean; // تفضيل البيانات المخزنة مؤقتاً على API المباشر
  useDirectApi?: boolean; // استخدام API المباشر (تجاوز التخزين المؤقت)
}

export class YalidineApiClient {
  private supabase: SupabaseClient;
  private apiId: string;
  private apiToken: string;
  private baseUrl: string = 'https://api.yalidine.app/v1';
  private static instance: YalidineApiClient | null = null;
  private options: YalidineApiClientOptions;
  private hasReportedError: boolean = false; // لتجنب تكرار رسائل الخطأ
  private organizationId: string;

  // استخدام نمط Singleton لتجنب إنشاء عدة مثيلات
  constructor(
    supabaseUrl: string, 
    supabaseKey: string, 
    yalidineApiId: string, 
    yalidineApiToken: string,
    organizationId: string,
    options: YalidineApiClientOptions = {}
  ) {
    // إذا كان هناك مثيل موجود بالفعل، أعد استخدامه
    if (YalidineApiClient.instance) {
      // تحديث بيانات الاعتماد إذا تم تمريرها
      if (yalidineApiId && yalidineApiToken) {
        YalidineApiClient.instance.apiId = yalidineApiId;
        YalidineApiClient.instance.apiToken = yalidineApiToken;
      }
      return YalidineApiClient.instance;
    }

    // إعداد خيارات العميل الافتراضية
    this.options = {
      cacheTTL: 60, // ساعة واحدة
      maxRetries: 1,
      preferCache: true,
      useDirectApi: false,
      ...options
    };

    // استخدام قيم افتراضية إذا كانت القيم غير صالحة
    this.supabase = createClient(
      supabaseUrl || "https://wrnssatuvmumsczyldth.supabase.co",
      supabaseKey || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXNjenlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE2OTUzNzk2MDUsImV4cCI6MjAxMDk1NTYwNX0.ftKN5POMQr1PVpUMuQRvZ2WoKGexmf3LXj_QA0UBUbw"
    );
    this.apiId = yalidineApiId || "86289860825230294974";
    this.apiToken = yalidineApiToken || "c5ceGQvvk7XxPYEHs8uD02mapnsAVgmqfHebdNBKl234hZFCyTwXl4wVjFRJoZCh";
    this.organizationId = organizationId;
    
    // حفظ المثيل الحالي للاستخدام المستقبلي
    YalidineApiClient.instance = this;
  }

  /**
   * استرجاع قائمة الولايات من التخزين المؤقت أو من API
   */
  async getWilayas(forceRefresh: boolean = false) {
    try {
      // تحقق من حالة التخزين المؤقت
      const { data: cacheStatus } = await this.supabase
        .from('organization_yalidine_data_refresh')
        .select('is_enabled, refresh_status')
        .eq('organization_id', this.organizationId)
        .single();
      
      const cacheEnabled = cacheStatus?.is_enabled;
      const isCacheWorking = cacheStatus?.refresh_status !== 'failed';
      
      // إذا كان التخزين المؤقت مفعل وليس في حالة فشل ولا نريد تحديث إجباري
      if (cacheEnabled && isCacheWorking && !forceRefresh) {
        // جلب البيانات من قاعدة البيانات
        const { data: wilayas, error } = await this.supabase
          .from('yalidine_wilayas')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (wilayas && wilayas.length > 0) {
          return wilayas;
        }
      }
      
      // إذا وصلنا إلى هنا، فإما التخزين المؤقت غير مفعل أو نريد تحديث إجباري أو لا توجد بيانات
      return await this.fetchWilayasDirectly();
    } catch (error) {
      // في حالة حدوث خطأ، حاول الاستدعاء المباشر
      return await this.fetchWilayasDirectly();
    }
  }

  /**
   * استرجاع قائمة الولايات مباشرة من API
   * يتم استدعاء هذه الوظيفة عند عدم وجود بيانات في التخزين المؤقت أو عند فشل التحديث
   */
  async fetchWilayasDirectly() {
    try {

      // تسجيل طلب API
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/wilayas/',
        success: true,
        status_code: 200
      });
      
      // استدعاء API
      const response = await axios.get(`${this.baseUrl}/wilayas/`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      // التحقق من نجاح الاستجابة
      if (response.status !== 200 || !response.data || !response.data.data) {
        throw new Error(`استجابة API غير صالحة: ${response.status}`);
      }
      
      const wilayasData = response.data.data;

      // تخزين البيانات في قاعدة البيانات
      for (const wilaya of wilayasData) {
        const { error } = await this.supabase
          .from('yalidine_wilayas')
          .upsert({
            id: wilaya.id,
            name: wilaya.name,
            zone: wilaya.zone,
            is_deliverable: wilaya.is_deliverable === 1,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
        
        if (error) {
        }
      }
      
      // تحديث حالة التخزين المؤقت
      await this.supabase.rpc('update_yalidine_data_type_refresh', {
        p_organization_id: this.organizationId,
        p_data_type: 'wilayas'
      });
      
      return wilayasData;
    } catch (error) {
      
      // تسجيل فشل الطلب
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/wilayas/',
        success: false,
        status_code: error.response?.status || 500
      });
      
      throw error;
    }
  }

  /**
   * استرجاع قائمة البلديات حسب الولاية من التخزين المؤقت أو من API
   */
  async getCommunes(forceRefresh: boolean = false) {
    try {
      // تحقق من حالة التخزين المؤقت
      const { data: cacheStatus } = await this.supabase
        .from('organization_yalidine_data_refresh')
        .select('is_enabled, refresh_status')
        .eq('organization_id', this.organizationId)
        .single();
      
      const cacheEnabled = cacheStatus?.is_enabled;
      const isCacheWorking = cacheStatus?.refresh_status !== 'failed';
      
      // إذا كان التخزين المؤقت مفعل وليس في حالة فشل ولا نريد تحديث إجباري
      if (cacheEnabled && isCacheWorking && !forceRefresh) {
        // جلب البيانات من قاعدة البيانات
        const { data: communes, error } = await this.supabase
          .from('yalidine_communes')
          .select('*')
          .order('id', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (communes && communes.length > 0) {
          return communes;
        }
      }
      
      // إذا وصلنا إلى هنا، فإما التخزين المؤقت غير مفعل أو نريد تحديث إجباري أو لا توجد بيانات
      return await this.fetchCommunesDirectly();
    } catch (error) {
      // في حالة حدوث خطأ، حاول الاستدعاء المباشر
      return await this.fetchCommunesDirectly();
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
  async getCenters(forceRefresh: boolean = false) {
    try {
      // تحقق من حالة التخزين المؤقت
      const { data: cacheStatus } = await this.supabase
        .from('organization_yalidine_data_refresh')
        .select('is_enabled, refresh_status')
        .eq('organization_id', this.organizationId)
        .single();
      
      const cacheEnabled = cacheStatus?.is_enabled;
      const isCacheWorking = cacheStatus?.refresh_status !== 'failed';
      
      // إذا كان التخزين المؤقت مفعل وليس في حالة فشل ولا نريد تحديث إجباري
      if (cacheEnabled && isCacheWorking && !forceRefresh) {
        // جلب البيانات من قاعدة البيانات
        const { data: centers, error } = await this.supabase
          .from('yalidine_centers')
          .select('*')
          .order('center_id', { ascending: true });
        
        if (error) {
          throw error;
        }
        
        if (centers && centers.length > 0) {
          return centers;
        }
      }
      
      // إذا وصلنا إلى هنا، فإما التخزين المؤقت غير مفعل أو نريد تحديث إجباري أو لا توجد بيانات
      return await this.fetchCentersDirectly();
    } catch (error) {
      // في حالة حدوث خطأ، حاول الاستدعاء المباشر
      return await this.fetchCentersDirectly();
    }
  }

  /**
   * استرجاع بيانات مراكز التوصيل مباشرة من API ياليدين
   */
  private async fetchCentersDirectly() {
    try {
      // تسجيل طلب API
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/centers/',
        success: true,
        status_code: 200
      });
      
      // استدعاء API
      const response = await axios.get(`${this.baseUrl}/centers/`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid API response');
      }
      
      const centersData = response.data.data;
      
      // تخزين البيانات في قاعدة البيانات لاستخدامها لاحقاً
      for (const center of centersData) {
        await this.supabase
          .from('yalidine_centers')
          .upsert({
            center_id: center.center_id,
            name: center.name,
            address: center.address,
            gps: center.gps,
            commune_id: center.commune_id,
            commune_name: center.commune_name,
            wilaya_id: center.wilaya_id,
            wilaya_name: center.wilaya_name,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'center_id'
          });
      }
      
      // تحديث حالة التخزين المؤقت
      await this.supabase.rpc('update_yalidine_data_type_refresh', {
        p_organization_id: this.organizationId,
        p_data_type: 'centers'
      });
      
      return centersData;
    } catch (error) {
      
      // تسجيل فشل طلب API
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/centers/',
        success: false,
        status_code: 500
      });
      
      throw error;
    }
  }

  // #region طرق مساعدة للاتصال المباشر بـ API إذا فشل التخزين المؤقت

  /**
   * استرجاع البلديات مباشرة من API
   */
  private async fetchCommunesDirectly() {
    try {
      // تسجيل طلب API
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/communes/',
        success: true,
        status_code: 200
      });
      
      // استدعاء API
      const response = await axios.get(`${this.baseUrl}/communes/`, {
        headers: {
          'X-API-ID': this.apiId,
          'X-API-TOKEN': this.apiToken
        }
      });
      
      if (!response.data || !response.data.data) {
        throw new Error('Invalid API response');
      }
      
      const communesData = response.data.data;
      
      // تخزين البيانات في قاعدة البيانات لاستخدامها لاحقاً
      for (const commune of communesData) {
        await this.supabase
          .from('yalidine_communes')
          .upsert({
            id: commune.id,
            name: commune.name,
            wilaya_id: commune.wilaya_id,
            wilaya_name: commune.wilaya_name,
            has_stop_desk: commune.has_stop_desk === 1,
            is_deliverable: commune.is_deliverable === 1,
            delivery_time_parcel: commune.delivery_time_parcel,
            delivery_time_payment: commune.delivery_time_payment,
            last_updated: new Date().toISOString()
          }, {
            onConflict: 'id'
          });
      }
      
      // تحديث حالة التخزين المؤقت
      await this.supabase.rpc('update_yalidine_data_type_refresh', {
        p_organization_id: this.organizationId,
        p_data_type: 'communes'
      });
      
      return communesData;
    } catch (error) {
      
      // تسجيل فشل طلب API
      await this.supabase.rpc('log_yalidine_api_request', {
        endpoint: '/communes/',
        success: false,
        status_code: 500
      });
      
      throw error;
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

  // #endregion
}

// مثال للاستخدام:
// const yalidineClient = new YalidineApiClient(
//   'https://your-supabase-url.supabase.co',
//   'your-supabase-anon-key',
//   'your-yalidine-api-id',
//   'your-yalidine-api-token',
//   'your-organization-id'
// );
// 
// yalidineClient.getWilayas().then(result =>  

// بيانات احتياطية للولايات للاستخدام في حالة فشل طلبات API
const FALLBACK_WILAYAS = [
  { id: 1, name: "أدرار", zone: 3, is_deliverable: true },
  { id: 2, name: "الشلف", zone: 1, is_deliverable: true },
  { id: 3, name: "الأغواط", zone: 2, is_deliverable: true },
  { id: 4, name: "أم البواقي", zone: 2, is_deliverable: true },
  { id: 5, name: "باتنة", zone: 2, is_deliverable: true },
  { id: 6, name: "بجاية", zone: 1, is_deliverable: true },
  { id: 7, name: "بسكرة", zone: 2, is_deliverable: true },
  { id: 8, name: "بشار", zone: 3, is_deliverable: true },
  { id: 9, name: "البليدة", zone: 1, is_deliverable: true },
  { id: 10, name: "البويرة", zone: 1, is_deliverable: true },
  { id: 16, name: "الجزائر", zone: 1, is_deliverable: true },
  { id: 31, name: "وهران", zone: 1, is_deliverable: true }
];

// بيانات احتياطية للبلديات للاستخدام في حالة فشل طلبات API
const FALLBACK_COMMUNES = [
  { id: 1, name: "أدرار", wilaya_id: 1, is_deliverable: true },
  { id: 2, name: "تامنطيط", wilaya_id: 1, is_deliverable: true },
  { id: 3, name: "تيميمون", wilaya_id: 1, is_deliverable: true },
  { id: 4, name: "الشلف", wilaya_id: 2, is_deliverable: true },
  { id: 5, name: "تنس", wilaya_id: 2, is_deliverable: true },
  { id: 6, name: "بني حواء", wilaya_id: 2, is_deliverable: true },
  { id: 7, name: "الجزائر وسط", wilaya_id: 16, is_deliverable: true },
  { id: 8, name: "باب الوادي", wilaya_id: 16, is_deliverable: true },
  { id: 9, name: "بئر مراد رايس", wilaya_id: 16, is_deliverable: true },
  { id: 10, name: "الحراش", wilaya_id: 16, is_deliverable: true },
  { id: 11, name: "وهران", wilaya_id: 31, is_deliverable: true },
  { id: 12, name: "عين الترك", wilaya_id: 31, is_deliverable: true }
];
