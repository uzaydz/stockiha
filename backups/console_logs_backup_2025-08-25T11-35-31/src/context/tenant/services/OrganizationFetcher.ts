/**
 * نظام جلب محسن للمؤسسات
 * يدعم الجلب بطرق مختلفة مع retry logic وإدارة أخطاء محسنة
 */

import { getOrganizationById } from '@/lib/api/organization';
import { getOrganizationBySubdomain } from '@/lib/api/subdomain';
import { getOrganizationByDomain } from '@/lib/api/subdomain';
import { organizationCache } from './OrganizationCache';
import { API_TIMEOUTS } from '@/config/api-timeouts';

export interface FetchParams {
  orgId?: string;
  hostname?: string;
  subdomain?: string;
}

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  useCache?: boolean;
  contextName?: string;
}

export interface FetchResult {
  data: any;
  source: 'cache' | 'api';
  duration: number;
  success: boolean;
  error?: Error;
}

export class OrganizationFetcher {
  private static readonly DEFAULT_OPTIONS: Required<FetchOptions> = {
    timeout: API_TIMEOUTS.ORGANIZATION_LOAD, // تحسين: استخدام timeout من الإعدادات (8 ثوان)
    retries: 0, // تحسين: إلغاء المحاولات المتكررة لتجنب التأخير
    useCache: true,
    contextName: 'OrganizationFetcher'
  };

  /**
   * جلب المؤسسة بالطريقة المثلى
   */
  static async fetch(
    params: FetchParams,
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    const startTime = performance.now();
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    console.log('🚀 [OrganizationFetcher] بدء جلب المؤسسة:', {
      params,
      options: opts,
      timestamp: new Date().toISOString()
    });

    try {
      // تحديد نوع الجلب والمفتاح
      const strategyStartTime = performance.now();
      const { fetchType, cacheKey, isValid } = this.determineFetchStrategy(params);
      const strategyTime = performance.now() - strategyStartTime;
      
      console.log('🎯 [OrganizationFetcher] تحديد استراتيجية الجلب:', {
        fetchType,
        cacheKey,
        isValid,
        strategyTime: `${strategyTime.toFixed(2)}ms`
      });
      
      if (!isValid) {
        throw new Error('معاملات جلب غير صحيحة');
      }

      let data: any = null;
      let source: 'cache' | 'api' = 'api';

      // محاولة الجلب من Cache أولاً
      if (opts.useCache) {
        const cacheStartTime = performance.now();
        console.log('🔍 [OrganizationFetcher] محاولة الجلب من Cache...');
        
        data = await this.tryCache(cacheKey, params, opts.contextName);
        
        const cacheTime = performance.now() - cacheStartTime;
        if (data) {
          source = 'cache';
          console.log('✅ [OrganizationFetcher] تم العثور على البيانات في Cache:', {
            cacheTime: `${cacheTime.toFixed(2)}ms`,
            cacheKey
          });
        } else {
          console.log('❌ [OrganizationFetcher] لم يتم العثور على البيانات في Cache:', {
            cacheTime: `${cacheTime.toFixed(2)}ms`,
            cacheKey
          });
        }
      }

      // إذا لم نجد في Cache، اجلب من API
      if (!data) {
        const apiStartTime = performance.now();
        console.log('📡 [OrganizationFetcher] بدء جلب البيانات من API...');
        
        data = await this.fetchFromAPI(params, fetchType as 'byId' | 'byDomain' | 'bySubdomain', opts);
        source = 'api';
        
        const apiTime = performance.now() - apiStartTime;
        console.log('✅ [OrganizationFetcher] انتهى جلب البيانات من API:', {
          apiTime: `${apiTime.toFixed(2)}ms`,
          fetchType,
          hasData: !!data
        });
      }

      const duration = performance.now() - startTime;

      console.log('🏁 [OrganizationFetcher] انتهى جلب المؤسسة:', {
        success: true,
        source,
        duration: `${duration.toFixed(2)}ms`,
        hasData: !!data,
        timestamp: new Date().toISOString()
      });

      return {
        data,
        source,
        duration,
        success: true
      };

    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.error('💥 [OrganizationFetcher] خطأ في جلب المؤسسة:', {
        error: error.message,
        duration: `${duration.toFixed(2)}ms`,
        params,
        timestamp: new Date().toISOString()
      });

      return {
        data: null,
        source: 'api',
        duration,
        success: false,
        error: error as Error
      };
    }
  }

  /**
   * تحديد استراتيجية الجلب
   */
  private static determineFetchStrategy(params: FetchParams) {
    const { orgId, hostname, subdomain } = params;
    
    if (orgId) {
      return {
        fetchType: 'byId' as const,
        cacheKey: `org-id-${orgId}`,
        isValid: true
      };
    } else if (hostname) {
      return {
        fetchType: 'byDomain' as const,
        cacheKey: `org-domain-${hostname}`,
        isValid: !hostname.includes('localhost')
      };
    } else if (subdomain) {
      return {
        fetchType: 'bySubdomain' as const,
        cacheKey: `org-subdomain-${subdomain}`,
        isValid: subdomain !== 'main'
      };
    }
    
    return {
      fetchType: 'invalid' as const,
      cacheKey: '',
      isValid: false
    };
  }

  /**
   * محاولة الجلب من Cache
   */
  private static async tryCache(
    cacheKey: string,
    params: FetchParams,
    contextName: string
  ): Promise<any> {
    try {
      return await organizationCache.get(
        cacheKey,
        () => Promise.resolve(null), // Dummy function - won't be called if cache exists
        contextName
      );
    } catch {
      return null;
    }
  }

  /**
   * جلب من API مع retry logic محسن
   */
  private static async fetchFromAPI(
    params: FetchParams,
    fetchType: 'byId' | 'byDomain' | 'bySubdomain',
    options: Required<FetchOptions>
  ): Promise<any> {
    const { orgId, hostname, subdomain } = params;
    let lastError: Error | null = null;

    console.log('📡 [OrganizationFetcher] جلب من API:', {
      fetchType,
      params: { orgId, hostname, subdomain },
      timeout: options.timeout,
      retries: options.retries
    });

    // محاولة واحدة فقط مع timeout قصير
    try {
      const fetchStartTime = performance.now();
      const fetchPromise = this.createFetchPromise(fetchType, { orgId, hostname, subdomain });
      const timeoutPromise = this.createTimeoutPromise(options.timeout);

      console.log('⏱️ [OrganizationFetcher] انتظار استجابة API...');
      const data = await Promise.race([fetchPromise, timeoutPromise]);
      const fetchTime = performance.now() - fetchStartTime;

      console.log('✅ [OrganizationFetcher] تم جلب البيانات من API:', {
        fetchTime: `${fetchTime.toFixed(2)}ms`,
        hasData: !!data,
        dataSize: data ? JSON.stringify(data).length : 0
      });

      // حفظ في Cache
      if (data && options.useCache) {
        const cacheStartTime = performance.now();
        const cacheKey = this.determineFetchStrategy(params).cacheKey;
        organizationCache.set(cacheKey, data, fetchType);
        const cacheTime = performance.now() - cacheStartTime;
        
        console.log('💾 [OrganizationFetcher] تم حفظ البيانات في Cache:', {
          cacheTime: `${cacheTime.toFixed(2)}ms`,
          cacheKey
        });
      }

      return data;

    } catch (error) {
      lastError = error as Error;
      console.error('❌ [OrganizationFetcher] خطأ في جلب البيانات من API:', {
        error: lastError.message,
        fetchType,
        params
      });
      throw lastError;
    }
  }

  /**
   * إنشاء Promise للجلب حسب النوع
   */
  private static createFetchPromise(
    fetchType: 'byId' | 'byDomain' | 'bySubdomain',
    params: FetchParams
  ): Promise<any> {
    console.log('🔧 [OrganizationFetcher] إنشاء Promise للجلب:', {
      fetchType,
      params
    });

    switch (fetchType) {
      case 'byId':
        if (!params.orgId) throw new Error('معرف المؤسسة مطلوب');
        return getOrganizationById(params.orgId);
        
      case 'byDomain':
        if (!params.hostname) throw new Error('اسم النطاق مطلوب');
        return getOrganizationByDomain(params.hostname);
        
      case 'bySubdomain':
        if (!params.subdomain) throw new Error('النطاق الفرعي مطلوب');
        return getOrganizationBySubdomain(params.subdomain);
        
      default:
        throw new Error('نوع جلب غير صحيح');
    }
  }

  /**
   * إنشاء Promise للTimeout
   */
  private static createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`انتهت مهلة الانتظار (${timeout}ms)`)), timeout)
    );
  }

  /**
   * جلب متعدد مع أولوية
   */
  static async fetchWithPriority(
    primaryParams: FetchParams,
    fallbackParams: FetchParams[],
    options: FetchOptions = {}
  ): Promise<FetchResult> {
    // محاولة الجلب الأساسي
    const primaryResult = await this.fetch(primaryParams, options);
    if (primaryResult.success && primaryResult.data) {
      return primaryResult;
    }

    // محاولة الجلب الاحتياطي
    for (const fallbackParam of fallbackParams) {
      const fallbackResult = await this.fetch(fallbackParam, {
        ...options,
        retries: 0 // لا توجد محاولات إضافية للاحتياطي
      });
      
      if (fallbackResult.success && fallbackResult.data) {
        return fallbackResult;
      }
    }

    return primaryResult; // إرجاع النتيجة الأساسية مع الخطأ
  }

  /**
   * تطهير Cache للمؤسسة
   */
  static clearCache(organizationId?: string): void {
    if (organizationId) {
      organizationCache.clear();
    } else {
      organizationCache.clear();
    }
  }

  /**
   * إحصائيات الأداء
   */
  static getStats() {
    return {
      cache: organizationCache.getStats(),
      fetchStrategies: ['byId', 'byDomain', 'bySubdomain'],
      defaultOptions: this.DEFAULT_OPTIONS
    };
  }
}
