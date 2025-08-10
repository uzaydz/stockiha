/**
 * نظام جلب محسن للمؤسسات
 * يدعم الجلب بطرق مختلفة مع retry logic وإدارة أخطاء محسنة
 */

import { getOrganizationBySubdomain, getOrganizationByDomain } from '@/lib/api/subdomain';
import { getOrganizationById } from '@/lib/api/organization';
import { organizationCache } from './OrganizationCache';

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
  data: any | null;
  source: 'cache' | 'api';
  duration: number;
  success: boolean;
  error?: Error;
}

export class OrganizationFetcher {
  private static readonly DEFAULT_OPTIONS: Required<FetchOptions> = {
    timeout: 10000,
    retries: 2,
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

    try {
      // تحديد نوع الجلب والمفتاح
      const { fetchType, cacheKey, isValid } = this.determineFetchStrategy(params);
      
      if (!isValid) {
        throw new Error('معاملات جلب غير صحيحة');
      }

      let data: any = null;
      let source: 'cache' | 'api' = 'api';

      // محاولة الجلب من Cache أولاً
      if (opts.useCache) {
        data = await this.tryCache(cacheKey, params, opts.contextName);
        if (data) {
          source = 'cache';
        }
      }

      // إذا لم نجد في Cache، اجلب من API
      if (!data) {
        data = await this.fetchFromAPI(params, fetchType as 'byId' | 'byDomain' | 'bySubdomain', opts);
        source = 'api';
      }

      const duration = performance.now() - startTime;

      return {
        data,
        source,
        duration,
        success: true
      };

    } catch (error) {
      const duration = performance.now() - startTime;

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
   * جلب من API مع retry logic
   */
  private static async fetchFromAPI(
    params: FetchParams,
    fetchType: 'byId' | 'byDomain' | 'bySubdomain',
    options: Required<FetchOptions>
  ): Promise<any> {
    const { orgId, hostname, subdomain } = params;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
      try {

        const fetchPromise = this.createFetchPromise(fetchType, { orgId, hostname, subdomain });
        const timeoutPromise = this.createTimeoutPromise(options.timeout);

        const data = await Promise.race([fetchPromise, timeoutPromise]);

        // حفظ في Cache
        if (data && options.useCache) {
          const cacheKey = this.determineFetchStrategy(params).cacheKey;
          organizationCache.set(cacheKey, data, fetchType);
        }

        return data;

      } catch (error) {
        lastError = error as Error;

        // انتظار قبل إعادة المحاولة
        if (attempt < options.retries + 1) {
          await this.delay(Math.pow(2, attempt - 1) * 1000); // Exponential backoff
        }
      }
    }

    throw lastError || new Error('فشل في جلب بيانات المؤسسة');
  }

  /**
   * إنشاء Promise للجلب حسب النوع
   */
  private static createFetchPromise(
    fetchType: 'byId' | 'byDomain' | 'bySubdomain',
    params: FetchParams
  ): Promise<any> {
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
   * تأخير
   */
  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
        retries: 1 // تقليل المحاولات للاحتياطي
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
