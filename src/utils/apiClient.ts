/**
 * مكون استدعاءات API
 */

import type { ApiResponse } from './types/interfaces';

export class ApiClient {
  /**
   * استدعاء API مع استراتيجية محسنة للنطاق المخصص - استخدام البيانات المناسبة حسب نوع الصفحة
   */
  static async callStoreInitAPI(storeIdentifier: string, domainType: string): Promise<ApiResponse> {
    try {
      const { supabase } = await import('@/lib/supabase');

      // 🔥 تحسين: استخدام البيانات الكاملة مع دعم النطاقات المخصصة
      const rpcFunction = domainType === 'custom-domain' ? 'get_store_init_data_with_custom_domain_fallback' : 'get_store_init_data';
      const rpcParams = { org_identifier: storeIdentifier };

      console.log('🔍 [ApiClient] بدء استدعاء API للمتجر:', {
        storeIdentifier,
        rpcFunction,
        timestamp: new Date().toISOString()
      });

      const { data, error } = await supabase.rpc(rpcFunction as any, rpcParams);

      if (data) {
        console.log('✅ [ApiClient] نجح استدعاء API:', {
          hasData: !!data,
          dataSize: JSON.stringify(data).length,
          timestamp: new Date().toISOString()
        });
      }

      if (error) {
        console.log('❌ [ApiClient] فشل استدعاء API:', {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          timestamp: new Date().toISOString()
        });

        // محاولة fallback للنطاق المخصص
        if (domainType === 'custom-domain' && error.message?.includes('Organization not found')) {
          console.log('🔄 [ApiClient] محاولة fallback للنطاق المخصص');
          return await this.tryCustomDomainFallback(storeIdentifier);
        }

        return {
          success: false,
          error: error.message || 'RPC error'
        };
      }

      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      console.log('💥 [ApiClient] خطأ عام في استدعاء API:', {
        error: error?.message,
        stack: error?.stack,
        name: error?.name,
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        error: error?.message || 'Network error'
      };
    }
  }

  /**
   * محاولة fallback للنطاق المخصص باستخدام محسن النطاق المخصص
   */
  private static async tryCustomDomainFallback(hostname: string): Promise<ApiResponse> {
    try {
      let cleanHostname = hostname;
      if (cleanHostname.startsWith('www.')) {
        cleanHostname = cleanHostname.substring(4);
      }
      
      const optimizationResult = await optimizeCustomDomain(cleanHostname);
      
      if (optimizationResult.success && optimizationResult.organizationId) {
        const storeData = await this.getStoreDataByOrganizationId(optimizationResult.organizationId);
        if (storeData.success) {
          return storeData;
        }
      }
      
      return {
        success: false,
        error: `Organization not found for custom domain: ${cleanHostname}. Please check the domain configuration.`
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Fallback failed: ${error?.message || 'Unknown error'}`
      };
    }
  }

  /**
   * الحصول على بيانات المتجر باستخدام معرف المؤسسة
   */
  private static async getStoreDataByOrganizationId(organizationId: string): Promise<ApiResponse> {
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('get_store_init_data_with_custom_domain_fallback' as any, {
        org_identifier: organizationId
      });

      if (!error && data) {
        return {
          success: true,
          data: data
        };
      }

      return { success: false, error: 'Failed to get store data by organization ID' };
    } catch (error: any) {
      return {
        success: false,
        error: error?.message || 'Network error'
      };
    }
  }

  /**
   * جلب Organization ID بطريقة سريعة ومحسنة
   */
  static async getOrganizationIdFast(storeIdentifier: string, domainType: string): Promise<string | null> {
    const startTime = performance.now();
    try {
      // استخدام الـ RPC مباشرة عبر Supabase client
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase.rpc('get_store_init_data_with_custom_domain_fallback' as any, {
        org_identifier: storeIdentifier
      });

      if (error) {
        console.warn('🔴 [ApiClient] فشل جلب Organization ID السريع:', {
          error: error.message,
          domainType,
          storeIdentifier
        });
        return null;
      }

      // استخراج organization_id من store_init_data
      const storeData = data as any;
      const organizationId = storeData?.organization_details?.id || storeData?.organization_id || null;

      if (organizationId) {
        return organizationId;
      }

      console.warn('🔴 [ApiClient] لم يتم العثور على Organization ID في الاستجابة:', {
        domainType,
        hasData: !!data,
        dataKeys: data ? Object.keys(data) : []
      });
      return null;
    } catch (error: any) {
      console.warn('🔴 [ApiClient] خطأ عام في جلب Organization ID السريع:', error);
      return null;
    }
  }
}
