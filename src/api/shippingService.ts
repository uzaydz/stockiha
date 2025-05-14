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
  ECOTRACK = 'ecotrack'
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
    
    console.log('Creating Yalidine API client with credentials:', credentials);
    console.log('Creating Yalidine API client with headers:', {
      'X-API-ID': credentials.token,   // API ID هو token (الرقم) في نظامنا
      'X-API-TOKEN': credentials.key    // API Token هو key (الرمز الطويل) في نظامنا
    });
    
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
      console.log('Attempting to test credentials by fetching wilayas...');
      
      const response = await this.apiClient.get('wilayas');
      
      console.log('Received API response:', {
        status: response.status,
        data: response.data,
        headers: response.headers
      });
      
      // تحقق من نجاح الاتصال بناءً على بنية البيانات الصحيحة من ياليدين
      if (response.status === 200 && 
         (Array.isArray(response.data) || 
          (response.data && response.data.data && Array.isArray(response.data.data)))) {
        
        console.log('API connection successful, received data from Yalidine');
        return {
          success: true,
          message: 'تم الاتصال بنجاح بخدمة ياليدين'
        };
      }
      
      console.log('API connection failed: Response has unexpected format', response.data);
      return {
        success: false,
        message: 'الاتصال غير ناجح، تحقق من بيانات الاعتماد'
      };
    } catch (error: any) {
      console.error('API connection error:', error);
      
      // معلومات تفصيلية عن الخطأ
      if (error.response) {
        // الخادم استجاب برمز حالة خارج نطاق 2xx
        console.error('API error response:', {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data,
          headers: error.response.headers
        });
        
        // رسالة خطأ أكثر تفصيلاً
        return {
          success: false,
          message: `خطأ ${error.response.status}: ${error.response.data?.error?.message || error.response.statusText}`
        };
      } else if (error.request) {
        // تم إجراء الطلب لكن لم يتم استلام استجابة
        console.error('API no response error:', error.request);
        return {
          success: false,
          message: 'لا توجد استجابة من خدمة ياليدين، تحقق من اتصال الإنترنت'
        };
      } else {
        // حدث خطأ أثناء إعداد الطلب
        console.error('API request setup error:', error.message);
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
      console.error('Error creating Yalidine shipping order:', error);
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
      console.error('Error getting Yalidine tracking info:', error);
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
      console.error('Error getting Yalidine wilayas:', error);
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
      console.error('Error getting Yalidine communes:', error);
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
      console.error('Error calculating Yalidine shipping cost:', error);
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
      console.error('Error generating Yalidine shipping label:', error);
      throw error;
    }
  }
}

// Factory function to create an appropriate shipping service
export function createShippingService(
  provider: ShippingProvider, 
  credentials: ProviderCredentials
): IShippingService {
  switch (provider) {
    case ShippingProvider.YALIDINE:
      return new YalidineShippingService(credentials);
    // Add other providers as they are implemented
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
    console.error(`Error getting ${provider} shipping service:`, error);
    return null;
  }
} 