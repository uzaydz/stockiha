/**
 * محسن النطاق المخصص - يحل مشكلة "Organization not found" نهائياً
 * يستخدم استراتيجيات متعددة للعثور على المؤسسة في النطاق المخصص
 */

interface CustomDomainResult {
  success: boolean;
  organizationId?: string;
  subdomain?: string;
  domain?: string;
  error?: string;
  strategy?: string;
}

interface OrganizationDetails {
  id: string;
  subdomain: string;
  domain?: string;
}

interface StoreInitData {
  organization_details: OrganizationDetails;
}

class CustomDomainOptimizer {
  private static instance: CustomDomainOptimizer;
  private cache: Map<string, { result: CustomDomainResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 دقائق

  static getInstance(): CustomDomainOptimizer {
    if (!CustomDomainOptimizer.instance) {
      CustomDomainOptimizer.instance = new CustomDomainOptimizer();
    }
    return CustomDomainOptimizer.instance;
  }

  /**
   * تحسين النطاق المخصص باستخدام استراتيجيات متعددة - محسّن للإنتاج
   */
  async optimizeCustomDomain(hostname: string): Promise<CustomDomainResult> {
    console.log('🌐 [CustomDomainOptimizer] بدء تحسين النطاق:', hostname);

    // 🔥 فحص النطاقات العامة أولاً - لا تحتاج تحسين
    const publicDomains = ['stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];
    if (publicDomains.includes(hostname)) {
      return {
        success: false,
        error: 'Public domain does not need optimization',
        strategy: 'public-domain-skip'
      };
    }

    // إضافة استراتيجية جديدة: البحث بالنطاق بدون www أولاً
    const cleanHostname = hostname.replace(/^www\./, '');
    console.log('🔄 [CustomDomainOptimizer] البحث بالنطاق النظيف:', cleanHostname);
    
    // فحص cache أولاً
    const cached = this.cache.get(hostname);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_TTL) {
      return cached.result;
    }

    // الاستراتيجية 0: البحث بالنطاق النظيف (بدون www) إذا كان مختلفاً
    if (cleanHostname !== hostname) {
      let result = await this.strategyDirectDomain(cleanHostname);
      if (result.success) {
        this.cacheResult(hostname, result, 'clean-domain-first');
        return result;
      }
    }

    // الاستراتيجية 1: البحث المباشر في النطاق الأصلي
    let result = await this.strategyDirectDomain(hostname);
    if (result.success) {
      this.cacheResult(hostname, result, 'direct-domain');
      return result;
    }

    // الاستراتيجية 1.5: البحث بالنطاق النظيف إذا لم ينجح الأصلي
    if (cleanHostname !== hostname) {
      result = await this.strategyDirectDomain(cleanHostname);
      if (result.success) {
        this.cacheResult(hostname, result, 'clean-domain-fallback');
        return result;
      }
    }

    // الاستراتيجية 2: استخراج subdomain من النطاق
    result = await this.strategyExtractSubdomain(hostname);
    if (result.success) {
      this.cacheResult(hostname, result, 'extract-subdomain');
      return result;
    }

    // الاستراتيجية 3: البحث في النطاقات المشابهة
    result = await this.strategySimilarDomains(hostname);
    if (result.success) {
      this.cacheResult(hostname, result, 'similar-domains');
      return result;
    }

    // الاستراتيجية 4: البحث في localStorage
    result = await this.strategyLocalStorage(hostname);
    if (result.success) {
      this.cacheResult(hostname, result, 'localstorage');
      return result;
    }

    // إذا فشلت جميع الاستراتيجيات
    const finalResult: CustomDomainResult = {
      success: false,
      error: `Organization not found for custom domain: ${hostname}. All strategies failed.`,
      strategy: 'all-failed'
    };

    this.cacheResult(hostname, finalResult, 'failed');
    return finalResult;
  }

  /**
   * الاستراتيجية 1: البحث المباشر في النطاق
   */
  private async strategyDirectDomain(hostname: string): Promise<CustomDomainResult> {
    try {
      console.log('🌐 [CustomDomainOptimizer] البحث المباشر بالنطاق:', hostname);
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('⚠️ [CustomDomainOptimizer] متغيرات البيئة مفقودة');
        return { success: false, error: 'Missing environment variables' };
      }

      // استخدام الـ RPC مباشرة عبر Supabase client
      const { supabase } = await import('@/lib/supabase');
      
      console.log('🔍 [CustomDomainOptimizer] استدعاء get_store_init_data_with_custom_domain_fallback مع:', hostname);
      const { data, error } = await supabase.rpc('get_store_init_data_with_custom_domain_fallback' as any, {
        org_identifier: hostname
      });

      console.log('📊 [CustomDomainOptimizer] نتيجة RPC:', { 
        hasData: !!data, 
        hasError: !!error, 
        error: error?.message || error 
      });

      const typedData = data as unknown as StoreInitData | null;

      if (!error && typedData?.organization_details?.id) {
        console.log('✅ [CustomDomainOptimizer] تم العثور على المؤسسة:', {
          id: typedData.organization_details.id,
          subdomain: typedData.organization_details.subdomain,
          domain: hostname
        });
        
        return {
          success: true,
          organizationId: typedData.organization_details.id,
          subdomain: typedData.organization_details.subdomain,
          domain: hostname,
          strategy: 'direct-domain'
        };
      } else {
        console.warn('⚠️ [CustomDomainOptimizer] لم يتم العثور على المؤسسة في RPC:', { 
          error: error?.message || error,
          hasData: !!data,
          dataError: typeof data === 'object' && data && 'error' in data ? (data as any).error : 'no error field'
        });
      }
    } catch (error) {
      console.error('❌ [CustomDomainOptimizer] خطأ في البحث المباشر:', error);
    }

    return { success: false };
  }

  /**
   * الاستراتيجية 2: استخراج subdomain من النطاق
   */
  private async strategyExtractSubdomain(hostname: string): Promise<CustomDomainResult> {
    try {
      
      const domainParts = hostname.split('.');
      if (domainParts.length > 2 && domainParts[0] && domainParts[0] !== 'www') {
        const possibleSubdomain = domainParts[0].toLowerCase().trim();
        
        // محاولة استخدام subdomain
        const subdomainResult = await this.strategyDirectDomain(possibleSubdomain);
        if (subdomainResult.success) {
          return {
            success: true,
            organizationId: subdomainResult.organizationId,
            subdomain: possibleSubdomain,
            domain: hostname,
            strategy: 'extract-subdomain'
          };
        }
      }
    } catch (error) {
    }

    return { success: false };
  }

  /**
   * الاستراتيجية 3: البحث في النطاقات المشابهة
   */
  private async strategySimilarDomains(hostname: string): Promise<CustomDomainResult> {
    try {
      
      // البحث في localStorage عن نطاقات مشابهة
      const keys = Object.keys(localStorage);
      const domainKeys = keys.filter(key => 
        key.includes('domain') || key.includes('hostname') || key.includes('org')
      );

      for (const key of domainKeys) {
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            
            // البحث عن نطاق مشابه
            if (parsed.domain && this.isSimilarDomain(hostname, parsed.domain)) {
              
              // محاولة استخدام النطاق المشابه
              const similarResult = await this.strategyDirectDomain(parsed.domain);
              if (similarResult.success) {
                return {
                  success: true,
                  organizationId: similarResult.organizationId,
                  subdomain: similarResult.subdomain,
                  domain: parsed.domain,
                  strategy: 'similar-domains'
                };
              }
            }
          }
        } catch (e) {
          // تجاهل الأخطاء
        }
      }
    } catch (error) {
    }

    return { success: false };
  }

  /**
   * الاستراتيجية 4: البحث في localStorage
   */
  private async strategyLocalStorage(hostname: string): Promise<CustomDomainResult> {
    try {
      
      // البحث عن معرف المؤسسة المحفوظ
      const orgId = localStorage.getItem('bazaar_organization_id');
      if (orgId && orgId.length > 10) {
        
        // محاولة الحصول على معلومات المؤسسة
        const orgInfo = await this.getOrganizationInfo(orgId);
        if (orgInfo) {
          return {
            success: true,
            organizationId: orgId,
            subdomain: orgInfo.subdomain,
            domain: orgInfo.domain,
            strategy: 'localstorage'
          };
        }
      }

      // البحث في مفاتيح أخرى
      const keys = Object.keys(localStorage);
      for (const key of keys) {
        if (key.includes('organization') || key.includes('org')) {
          try {
            const value = localStorage.getItem(key);
            if (value) {
              const parsed = JSON.parse(value);
              if (parsed.id && parsed.id.length > 10) {
                
                const orgInfo = await this.getOrganizationInfo(parsed.id);
                if (orgInfo) {
                  return {
                    success: true,
                    organizationId: parsed.id,
                    subdomain: orgInfo.subdomain,
                    domain: orgInfo.domain,
                    strategy: 'localstorage'
                  };
                }
              }
            }
          } catch (e) {
            // تجاهل الأخطاء
          }
        }
      }
    } catch (error) {
    }

    return { success: false };
  }

  /**
   * الحصول على معلومات المؤسسة
   */
  private async getOrganizationInfo(organizationId: string): Promise<{ subdomain?: string; domain?: string } | null> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return null;
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/organizations?id=eq.${organizationId}&select=subdomain,domain`, {
        headers: {
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data[0]) {
          return {
            subdomain: data[0].subdomain,
            domain: data[0].domain
          };
        }
      }
    } catch (error) {
    }

    return null;
  }

  /**
   * فحص إذا كان النطاقان متشابهان
   */
  private isSimilarDomain(domain1: string, domain2: string): boolean {
    if (!domain1 || !domain2) return false;
    
    const clean1 = domain1.toLowerCase().replace(/^www\./, '');
    const clean2 = domain2.toLowerCase().replace(/^www\./, '');
    
    // فحص التشابه الأساسي
    if (clean1 === clean2) return true;
    
    // فحص إذا كان أحدهما subdomain للآخر
    if (clean1.endsWith(clean2) || clean2.endsWith(clean1)) return true;
    
    // فحص التشابه في الأجزاء
    const parts1 = clean1.split('.');
    const parts2 = clean2.split('.');
    
    if (parts1.length >= 2 && parts2.length >= 2) {
      const base1 = parts1.slice(-2).join('.');
      const base2 = parts2.slice(-2).join('.');
      if (base1 === base2) return true;
    }
    
    return false;
  }

  /**
   * حفظ النتيجة في cache
   */
  private cacheResult(hostname: string, result: CustomDomainResult, strategy: string): void {
    this.cache.set(hostname, {
      result: { ...result, strategy },
      timestamp: Date.now()
    });
  }

  /**
   * مسح cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * الحصول على إحصائيات cache
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

// تصدير instance واحد
export const customDomainOptimizer = CustomDomainOptimizer.getInstance();

// دوال مساعدة
export const optimizeCustomDomain = (hostname: string) => customDomainOptimizer.optimizeCustomDomain(hostname);
export const clearCustomDomainCache = () => customDomainOptimizer.clearCache();
export const getCustomDomainCacheStats = () => customDomainOptimizer.getCacheStats();
