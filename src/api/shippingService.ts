/**
 * Shipping Service
 * 
 * This service handles integrations with shipping providers in Algeria.
 * Based on CourierDZ (https://github.com/PiteurStudio/CourierDZ)
 */

import axios from 'axios';
import { shippingSettingsService } from './shippingSettingsService';

export enum ShippingProvider {
  YALIDINE = 'yalidine',
  ZREXPRESS = 'zrexpress',
  MAYESTO = 'mayesto',
  ECOTRACK = 'ecotrack',
  // Ecotrack-integrated providers
  ANDERSON_DELIVERY = 'anderson_delivery',
  AREEX = 'areex',
  BA_CONSULT = 'ba_consult',
  CONEXLOG = 'conexlog',
  COYOTE_EXPRESS = 'coyote_express',
  DHD = 'dhd',
  DISTAZERO = 'distazero',
  E48HR_LIVRAISON = 'e48hr_livraison',
  FRETDIRECT = 'fretdirect',
  GOLIVRI = 'golivri',
  MONO_HUB = 'mono_hub',
  MSM_GO = 'msm_go',
  NEGMAR_EXPRESS = 'negmar_express',
  PACKERS = 'packers',
  PREST = 'prest',
  RB_LIVRAISON = 'rb_livraison',
  REX_LIVRAISON = 'rex_livraison',
  ROCKET_DELIVERY = 'rocket_delivery',
  SALVA_DELIVERY = 'salva_delivery',
  SPEED_DELIVERY = 'speed_delivery',
  TSL_EXPRESS = 'tsl_express',
  WORLDEXPRESS = 'worldexpress'
}

interface ProviderCredentials {
  token?: string;
  key?: string;
  id?: string;
}

interface CreateOrderParams {
  Tracking: string;
  TypeLivraison: number; // 1: Home delivery, 2: Stop desk
  TypeColis: number; // 0: Regular shipping, 1: Exchange
  Confrimee: number; // 0: Not confirmed, 1: Confirmed
  Client: string;
  MobileA: string;
  MobileB?: string;
  Adresse: string;
  IDWilaya: string;
  Commune: string;
  Total: string;
  Note?: string;
  TProd?: string;
  Produits?: string;
}

export interface YalidineWilaya {
  id: string;
  wilaya_name: string;
  target_tarif: string;
  stop_desk: string;
  desk_fee: string;
}

interface YalidineCommune {
  id: string;
  wilaya_id: string;
  commune_name: string;
  delivery_type: string;
}

interface YalidineTrackingInfo {
  id: number;
  tracking: string;
  status: string;
  datetime: string;
  wilaya: string;
  commune: string;
  feedback: string;
}

export interface TestCredentialsResult {
  success: boolean;
  message: string;
}

/**
 * Interface for a shipping service provider
 */
export interface IShippingService {
  /**
   * Test if credentials are valid
   */
  testCredentials(): Promise<TestCredentialsResult>;
  
  /**
   * Create a shipping order
   */
  createShippingOrder(params: CreateOrderParams): Promise<any>;
  
  /**
   * Get tracking information
   */
  getTrackingInfo(trackingNumber: string): Promise<any>;
  
  /**
   * Get available wilayas (provinces)
   */
  getWilayas(): Promise<any[]>;
  
  /**
   * Get communes (municipalities) for a wilaya
   */
  getCommunes(wilayaId: string): Promise<any[]>;
  
  /**
   * Calculate shipping cost
   */
  calculateShippingCost(fromWilaya: string, toWilaya: string, amount: number): Promise<number>;
  
  /**
   * Generate a shipping label
   */
  generateShippingLabel(trackingNumber: string): Promise<string>;
}

/**
 * Base class for shipping services
 */
abstract class BaseShippingService implements IShippingService {
  protected providerCode: ShippingProvider;
  protected baseUrl: string;
  protected credentials: ProviderCredentials;
  
  constructor(
    providerCode: ShippingProvider,
    baseUrl: string,
    credentials: ProviderCredentials
  ) {
    this.providerCode = providerCode;
    this.baseUrl = baseUrl;
    this.credentials = credentials;
  }
  
  abstract testCredentials(): Promise<TestCredentialsResult>;
  abstract createShippingOrder(params: CreateOrderParams): Promise<any>;
  abstract getTrackingInfo(trackingNumber: string): Promise<any>;
  abstract getWilayas(): Promise<any[]>;
  abstract getCommunes(wilayaId: string): Promise<any[]>;
  abstract calculateShippingCost(fromWilaya: string, toWilaya: string, amount: number): Promise<number>;
  abstract generateShippingLabel(trackingNumber: string): Promise<string>;
}

/**
 * YalidineShippingService implementation
 */
export class YalidineShippingService extends BaseShippingService {
  private apiClient;
  
  constructor(credentials: ProviderCredentials) {
    super(
      ShippingProvider.YALIDINE,
      '/yalidine-api/',
      credentials
    );

    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'X-API-ID': credentials.token || '',     // token هو الرقم التعريفي في نظامنا
        'X-API-TOKEN': credentials.key || '',    // key هو الرمز الطويل في نظامنا
        'Content-Type': 'application/json'
      },
      timeout: 8000 // زيادة مهلة الانتظار إلى 8 ثواني
    });
  }
  
  /**
   * Test if the API credentials are valid by fetching the wilayas
   */
  async testCredentials(): Promise<TestCredentialsResult> {
    try {

      const response = await this.apiClient.get('wilayas');

      // تحقق من نجاح الاتصال بناءً على بنية البيانات الصحيحة من ياليدين
      if (response.status === 200 && 
         (Array.isArray(response.data) || 
          (response.data && response.data.data && Array.isArray(response.data.data)))) {

        return {
          success: true,
          message: 'تم الاتصال بنجاح بخدمة ياليدين'
        };
      }

      return {
        success: false,
        message: 'الاتصال غير ناجح، تحقق من بيانات الاعتماد'
      };
    } catch (error: any) {
      
      // معلومات تفصيلية عن الخطأ
      if (error.response) {
        // الخادم استجاب برمز حالة خارج نطاق 2xx
        
        // رسالة خطأ أكثر تفصيلاً
        return {
          success: false,
          message: `خطأ ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`
        };
      } else if (error.request) {
        // تم إجراء الطلب لكن لم يتم استلام استجابة
        return {
          success: false,
          message: 'لا توجد استجابة من خدمة ياليدين، تحقق من اتصال الإنترنت'
        };
      } else {
        // حدث خطأ أثناء إعداد الطلب
        return {
          success: false,
          message: `فشل إعداد الطلب: ${error.message}`
        };
      }
    }
  }
  
  /**
   * Create a shipping order with Yalidine
   */
  async createShippingOrder(params: CreateOrderParams): Promise<any> {
    try {
      const response = await this.apiClient.post('parcels', params);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get tracking information for a parcel
   */
  async getTrackingInfo(trackingNumber: string): Promise<YalidineTrackingInfo[]> {
    try {
      const response = await this.apiClient.get(`tracking/${trackingNumber}`);
      
      // معالجة بنية البيانات الصحيحة
      return Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all wilayas (provinces) from Yalidine
   */
  async getWilayas(): Promise<YalidineWilaya[]> {
    try {
      const response = await this.apiClient.get('wilayas');
      
      // Yalidine API قد يرجع البيانات مباشرة أو داخل حقل 'data'
      const wilayasData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);

      return wilayasData.map((w: any) => ({
        id: w.id?.toString(),
        wilaya_name: w.name || w.wilaya_name, // تفضيل 'name' إذا كان موجوداً
        target_tarif: w.home_fee?.toString() || w.target_tarif?.toString() || '0', // محاولة home_fee أولاً
        stop_desk: w.stop_desk?.toString() || 'N', // قيمة افتراضية إذا لم تكن موجودة
        desk_fee: w.desk_fee?.toString() || '0' // إضافة desk_fee هنا، بافتراض أن API يرجعه
      }));
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get communes (municipalities) for a wilaya
   */
  async getCommunes(wilayaId: string): Promise<YalidineCommune[]> {
    try {
      const response = await this.apiClient.get(`communes/${wilayaId}`);
      
      // معالجة بنية البيانات الصحيحة
      return Array.isArray(response.data) 
        ? response.data 
        : (response.data?.data || []);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Calculate shipping cost
   */
  async calculateShippingCost(fromWilaya: string, toWilaya: string, amount: number): Promise<number> {
    try {
      // Get the wilayas to find shipping rates
      const wilayas = await this.getWilayas();
      const targetWilaya = wilayas.find(w => w.id === toWilaya);
      
      if (!targetWilaya) {
        throw new Error('Wilaya not found');
      }
      
      // Return the shipping cost as specified in the API (stored in target_tarif)
      return parseFloat(targetWilaya.target_tarif);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate a shipping label
   */
  async generateShippingLabel(trackingNumber: string): Promise<string> {
    try {
      const response = await this.apiClient.get(`labels/${trackingNumber}`, {
        responseType: 'arraybuffer'
      });
      
      // Convert binary data to base64
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      return `data:application/pdf;base64,${base64}`;
    } catch (error) {
      throw error;
    }
  }
}

/**
 * ZRExpressShippingService implementation
 */
export class ZRExpressShippingService extends BaseShippingService {
  private apiClient;
  
  constructor(credentials: ProviderCredentials) {
    super(
      ShippingProvider.ZREXPRESS,
      'https://procolis.com/api_v1/',
      credentials
    );
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'token': credentials.token || '',     // token في ZR Express
        'key': credentials.key || '',         // key في ZR Express
        'Content-Type': 'application/json'
      },
      timeout: 8000 // زيادة مهلة الانتظار إلى 8 ثواني
    });
  }
  
  /**
   * Test if the API credentials are valid by fetching tarification data
   */
  async testCredentials(): Promise<TestCredentialsResult> {
    try {
      const response = await this.apiClient.get('tarification');
      
      // تحقق من نجاح الاتصال بناءً على بنية البيانات الصحيحة من ZR Express
      if (response.status === 200 && Array.isArray(response.data)) {
        return {
          success: true,
          message: 'تم الاتصال بنجاح بخدمة ZR Express'
        };
      }
      
      return {
        success: false,
        message: 'الاتصال غير ناجح، تحقق من بيانات الاعتماد'
      };
    } catch (error: any) {
      
      // معلومات تفصيلية عن الخطأ
      if (error.response) {
        
        return {
          success: false,
          message: `خطأ ${error.response.status}: ${error.response.data?.message || error.response.statusText}`
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'لا توجد استجابة من خدمة ZR Express، تحقق من اتصال الإنترنت'
        };
      } else {
        return {
          success: false,
          message: `فشل إعداد الطلب: ${error.message}`
        };
      }
    }
  }
  
  /**
   * Create a shipping order with ZR Express
   */
  async createShippingOrder(params: CreateOrderParams): Promise<any> {
    try {
      // تحويل الطلب إلى الصيغة المطلوبة لـ ZR Express
      const requestBody = {
        Colis: [{
          Tracking: params.Tracking,
          TypeLivraison: params.TypeLivraison.toString(), // تحويل للنص كما هو مطلوب
          TypeColis: params.TypeColis.toString(),
          Confrimee: params.Confrimee.toString(),
          Client: params.Client,
          MobileA: params.MobileA,
          MobileB: params.MobileB || "",
          Adresse: params.Adresse,
          IDWilaya: params.IDWilaya,
          Commune: params.Commune,
          Total: params.Total,
          Note: params.Note || "",
          TProduit: params.TProd || "",
          id_Externe: params.Tracking, // استخدام Tracking كمعرف خارجي
          Source: ""
        }]
      };
      
      const response = await this.apiClient.post('add_colis', requestBody);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get tracking information for a parcel
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    try {
      const requestBody = {
        Colis: [{ Tracking: trackingNumber }]
      };
      
      const response = await this.apiClient.post('lire', requestBody);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get all wilayas (provinces) from ZR Express
   */
  async getWilayas(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('tarification');
      
      // تحويل البيانات إلى تنسيق موحد
      return response.data.map((item: any) => ({
        id: item.IDWilaya.toString(),
        wilaya_name: item.wilaya || `ولاية ${item.IDWilaya}`,
        target_tarif: item.Domicile.toString(),
        stop_desk: item.Stopdesk ? "Y" : "N",
        desk_fee: item.Stopdesk.toString()
      }));
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get communes (municipalities) for a wilaya
   */
  async getCommunes(wilayaId: string): Promise<any[]> {
    try {
      // ملاحظة: ZR Express قد لا يوفر واجهة لاسترجاع البلديات
      // في هذه الحالة، نرجع قائمة فارغة
      return [];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Calculate shipping cost
   */
  async calculateShippingCost(fromWilaya: string, toWilaya: string, amount: number): Promise<number> {
    try {
      const wilayas = await this.getWilayas();
      const targetWilaya = wilayas.find(w => w.id === toWilaya);
      
      if (!targetWilaya) {
        throw new Error('Wilaya not found');
      }
      
      // استخدام سعر التوصيل إلى المنزل كسعر افتراضي
      return parseFloat(targetWilaya.target_tarif);
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate a shipping label
   */
  async generateShippingLabel(trackingNumber: string): Promise<string> {
    try {
      // ملاحظة: ZR Express قد لا يوفر واجهة برمجية لتوليد الملصقات
      // إرجاع خطأ أو استخدام المنصة مباشرة
      throw new Error('ZR Express API does not support label generation directly');
    } catch (error) {
      throw error;
    }
  }
}

/**
 * Base class for Ecotrack-integrated providers
 */
export class EcotrackShippingService extends BaseShippingService {
  private apiClient;
  
  constructor(providerCode: ShippingProvider, baseUrl: string, credentials: ProviderCredentials) {
    super(providerCode, baseUrl, credentials);
    
    this.apiClient = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${credentials.token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
  }
  
  /**
   * Test credentials by calling the wilayas endpoint
   */
  async testCredentials(): Promise<TestCredentialsResult> {
    try {
      const response = await this.apiClient.get('/api/v1/get/wilayas');
      
      if (response.status === 200) {
        return {
          success: true,
          message: 'تم الاتصال بنجاح مع خدمة Ecotrack'
        };
      }
      
      return {
        success: false,
        message: 'فشل في الاتصال مع خدمة Ecotrack'
      };
    } catch (error: any) {
      if (error.response) {
        const status = error.response.status;
        if (status === 401 || status === 403) {
          return {
            success: false,
            message: 'بيانات الاعتماد غير صحيحة'
          };
        }
        return {
          success: false,
          message: `خطأ ${status}: ${error.response.data?.message || error.response.statusText}`
        };
      } else if (error.request) {
        return {
          success: false,
          message: 'لا توجد استجابة من خدمة Ecotrack، تحقق من اتصال الإنترنت'
        };
      } else {
        return {
          success: false,
          message: `خطأ في الإعداد: ${error.message}`
        };
      }
    }
  }
  
  /**
   * Create a shipping order with Ecotrack API
   */
  async createShippingOrder(params: CreateOrderParams): Promise<any> {
    try {
      const requestBody = {
        recipient_name: params.Client,
        recipient_phone: params.MobileA,
        recipient_phone_alt: params.MobileB || '',
        address: params.Adresse,
        region: params.IDWilaya,
        city: params.Commune,
        amount: parseFloat(params.Total),
        delivery_type: params.TypeLivraison,
        package_type: params.TypeColis,
        is_confirmed: params.Confrimee === 1,
        notes: params.Note || '',
        products_description: params.TProd || '',
        tracking_number: params.Tracking
      };
      
      const response = await this.apiClient.post('/api/v1/create/order', requestBody);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'فشل في إنشاء الطلب');
      }
    } catch (error: any) {
      if (error.response?.data?.success === false) {
        throw new Error(error.response.data.message || 'فشل في إنشاء الطلب');
      }
      throw error;
    }
  }
  
  /**
   * Get tracking information - not implemented in Ecotrack
   */
  async getTrackingInfo(trackingNumber: string): Promise<any> {
    // Ecotrack doesn't provide tracking API - direct users to tracking URL
    throw new Error('تتبع الطلبات غير متاح عبر API، يرجى استخدام رابط التتبع');
  }
  
  /**
   * Get available wilayas from Ecotrack
   */
  async getWilayas(): Promise<any[]> {
    try {
      const response = await this.apiClient.get('/api/v1/get/wilayas');
      
      if (response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return [];
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Get communes - not directly supported by Ecotrack
   */
  async getCommunes(wilayaId: string): Promise<any[]> {
    // Ecotrack doesn't provide communes API
    return [];
  }
  
  /**
   * Calculate shipping cost using Ecotrack fees API
   */
  async calculateShippingCost(fromWilaya: string, toWilaya: string, amount: number): Promise<number> {
    try {
      const params: any = {
        to_wilaya_id: toWilaya
      };
      
      if (fromWilaya) {
        params.from_wilaya_id = fromWilaya;
      }
      
      const response = await this.apiClient.get('/api/v1/get/fees', { params });
      
      if (response.data.success && response.data.data && response.data.data.length > 0) {
        const rate = response.data.data[0];
        // Return home delivery price as default
        return parseFloat(rate.price_domicile || rate.price_local || '0');
      }
      
      return 0;
    } catch (error) {
      throw error;
    }
  }
  
  /**
   * Generate shipping label
   */
  async generateShippingLabel(trackingNumber: string): Promise<string> {
    try {
      const response = await this.apiClient.get(`/api/v1/get/order/label?tracking=${trackingNumber}`, {
        responseType: 'arraybuffer'
      });
      
      if (response.status === 200 && response.data && response.data.length > 0) {
        // Convert to base64
        const base64 = Buffer.from(response.data).toString('base64');
        return `data:application/pdf;base64,${base64}`;
      }
      
      throw new Error('ملصق الشحن فارغ أو غير متاح');
    } catch (error: any) {
      if (error.response?.status === 422) {
        throw new Error('رقم التتبع غير موجود');
      }
      throw error;
    }
  }
}

// Helper function to get provider base URL
function getProviderBaseUrl(provider: ShippingProvider): string {
  const baseUrls: Record<string, string> = {
    [ShippingProvider.ANDERSON_DELIVERY]: 'https://anderson.ecotrack.dz',
    [ShippingProvider.AREEX]: 'https://areex.ecotrack.dz',
    [ShippingProvider.BA_CONSULT]: 'https://baconsult.ecotrack.dz',
    [ShippingProvider.CONEXLOG]: 'https://conexlog.ecotrack.dz',
    [ShippingProvider.COYOTE_EXPRESS]: 'https://coyote.ecotrack.dz',
    [ShippingProvider.DHD]: 'https://dhd.ecotrack.dz',
    [ShippingProvider.DISTAZERO]: 'https://distazero.ecotrack.dz',
    [ShippingProvider.E48HR_LIVRAISON]: 'https://e48hr.ecotrack.dz',
    [ShippingProvider.FRETDIRECT]: 'https://fretdirect.ecotrack.dz',
    [ShippingProvider.GOLIVRI]: 'https://golivri.ecotrack.dz',
    [ShippingProvider.MONO_HUB]: 'https://monohub.ecotrack.dz',
    [ShippingProvider.MSM_GO]: 'https://msmgo.ecotrack.dz',
    [ShippingProvider.NEGMAR_EXPRESS]: 'https://negmar.ecotrack.dz',
    [ShippingProvider.PACKERS]: 'https://packers.ecotrack.dz',
    [ShippingProvider.PREST]: 'https://prest.ecotrack.dz',
    [ShippingProvider.RB_LIVRAISON]: 'https://rb.ecotrack.dz',
    [ShippingProvider.REX_LIVRAISON]: 'https://rex.ecotrack.dz',
    [ShippingProvider.ROCKET_DELIVERY]: 'https://rocket.ecotrack.dz',
    [ShippingProvider.SALVA_DELIVERY]: 'https://salva.ecotrack.dz',
    [ShippingProvider.SPEED_DELIVERY]: 'https://speed.ecotrack.dz',
    [ShippingProvider.TSL_EXPRESS]: 'https://tsl.ecotrack.dz',
    [ShippingProvider.WORLDEXPRESS]: 'https://worldexpress.ecotrack.dz'
  };
  
  return baseUrls[provider] || '';
}

// Factory function to create an appropriate shipping service
export function createShippingService(
  provider: ShippingProvider, 
  credentials: ProviderCredentials
): IShippingService {
  switch (provider) {
    case ShippingProvider.YALIDINE:
      return new YalidineShippingService(credentials);
    case ShippingProvider.ZREXPRESS:
      return new ZRExpressShippingService(credentials);
    case ShippingProvider.ECOTRACK:
      return new EcotrackShippingService(provider, 'https://api.ecotrack.dz', credentials);
    // Ecotrack-integrated providers
    case ShippingProvider.ANDERSON_DELIVERY:
    case ShippingProvider.AREEX:
    case ShippingProvider.BA_CONSULT:
    case ShippingProvider.CONEXLOG:
    case ShippingProvider.COYOTE_EXPRESS:
    case ShippingProvider.DHD:
    case ShippingProvider.DISTAZERO:
    case ShippingProvider.E48HR_LIVRAISON:
    case ShippingProvider.FRETDIRECT:
    case ShippingProvider.GOLIVRI:
    case ShippingProvider.MONO_HUB:
    case ShippingProvider.MSM_GO:
    case ShippingProvider.NEGMAR_EXPRESS:
    case ShippingProvider.PACKERS:
    case ShippingProvider.PREST:
    case ShippingProvider.RB_LIVRAISON:
    case ShippingProvider.REX_LIVRAISON:
    case ShippingProvider.ROCKET_DELIVERY:
    case ShippingProvider.SALVA_DELIVERY:
    case ShippingProvider.SPEED_DELIVERY:
    case ShippingProvider.TSL_EXPRESS:
    case ShippingProvider.WORLDEXPRESS:
      return new EcotrackShippingService(provider, getProviderBaseUrl(provider), credentials);
    default:
      throw new Error(`Shipping provider ${provider} is not supported`);
  }
}

// Helper function to get a shipping service with credentials from the database
export async function getOrganizationShippingService(
  organizationId: string,
  provider: ShippingProvider
): Promise<IShippingService | null> {
  try {
    // Get credentials from database
    const credentials = await shippingSettingsService.getProviderCredentials(
      organizationId,
      provider
    );
    
    // If no credentials are found or the provider is not enabled, return null
    if (!credentials.token || !credentials.key) {
      return null;
    }
    
    // Create a shipping service instance
    return createShippingService(provider, credentials);
  } catch (error) {
    return null;
  }
}
