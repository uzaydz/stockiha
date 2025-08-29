/**
 * نظام preload مبكر محسن - يحل مشكلة "Organization not found" في النطاق المخصص
 * يحافظ على عمل النطاق الفرعي مع تحسين النطاق المخصص
 */

import { optimizeCustomDomain } from './customDomainOptimizer';

interface EarlyPreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  storeIdentifier?: string;
  domainType?: 'subdomain' | 'custom-domain' | 'localhost';
}

class EarlyPreloader {
  private static instance: EarlyPreloader;
  private preloadPromise: Promise<EarlyPreloadResult> | null = null;
  private preloadResult: EarlyPreloadResult | null = null;
  private domainCache: Map<string, { data: any; timestamp: number }> = new Map();

  static getInstance(): EarlyPreloader {
    if (!EarlyPreloader.instance) {
      EarlyPreloader.instance = new EarlyPreloader();
    }
    return EarlyPreloader.instance;
  }

  /**
   * بدء preload مبكر
   */
  async startEarlyPreload(): Promise<EarlyPreloadResult> {
    // إذا كان هناك preload قيد التشغيل، انتظره
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    // إذا كان preload مكتمل، أرجع النتيجة
    if (this.preloadResult) {
      return this.preloadResult;
    }

    const startTime = performance.now();

    this.preloadPromise = this.executeEarlyPreload(startTime);
    this.preloadResult = await this.preloadPromise;
    
    return this.preloadResult;
  }

  /**
   * تنفيذ preload مبكر
   */
  private async executeEarlyPreload(startTime: number): Promise<EarlyPreloadResult> {
    try {
      const { storeIdentifier, domainType } = this.resolveStoreIdentifier();
      
      if (!storeIdentifier) {
        const executionTime = performance.now() - startTime;
        return {
          success: false,
          error: 'No store identifier found',
          executionTime,
          domainType: 'localhost'
        };
      }

      console.log(`🔍 [earlyPreload] بدء preload للنطاق: ${storeIdentifier} (النوع: ${domainType})`);

      // استدعاء API مباشرة بدون dependencies
      const response = await this.callStoreInitAPI(storeIdentifier, domainType);
      const executionTime = performance.now() - startTime;

      if (response.success) {
        console.log(`✅ [earlyPreload] اكتمل preload للنطاق: ${storeIdentifier} في ${executionTime.toFixed(2)}ms`);
        
        // حفظ البيانات في localStorage مؤقتاً
        try {
          localStorage.setItem(`early_preload_${storeIdentifier}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
            executionTime,
            domainType
          }));

          // حفظ في cache محلي أيضاً
          this.domainCache.set(storeIdentifier, {
            data: response.data,
            timestamp: Date.now()
          });

          // حفظ معرف المؤسسة في localStorage للمراجعة السريعة
          if (response.data?.organization_details?.id) {
            localStorage.setItem('bazaar_organization_id', response.data.organization_details.id);
            console.log(`✅ [earlyPreload] تم حفظ معرف المؤسسة: ${response.data.organization_details.id}`);
          }

        } catch (e) {
          console.warn('⚠️ [earlyPreload] فشل في حفظ البيانات في localStorage:', e);
        }

        // إرسال حدث للإعلام عن اكتمال التحميل المبكر
        window.dispatchEvent(new CustomEvent('earlyPreloadComplete', {
          detail: {
            storeIdentifier,
            data: response.data,
            executionTime,
            domainType
          }
        }));

        return {
          success: true,
          data: response.data,
          executionTime,
          storeIdentifier,
          domainType
        };
      } else {
        console.warn(`⚠️ [earlyPreload] فشل preload للنطاق: ${storeIdentifier} - ${response.error}`);
        return {
          success: false,
          error: response.error,
          executionTime,
          storeIdentifier,
          domainType
        };
      }
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      console.error('❌ [earlyPreload] خطأ في preload:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * تحديد store identifier مع تحسين للنطاق المخصص
   */
  private resolveStoreIdentifier(): { storeIdentifier: string | null; domainType: 'subdomain' | 'custom-domain' | 'localhost' } {
    try {
      // 🔥 إصلاح: فحص النطاق الحالي أولاً، ثم استخدام localStorage كـ fallback
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;

      console.log('🔍 [earlyPreload] تحليل النطاق الحالي:', {
        hostname,
        isLocalhost,
        isBaseDomain,
        isCustomDomain,
        baseDomains
      });

      // 🔥 إصلاح: للنطاقات المخصصة، نستخدم النطاق الكامل مباشرة
      if (isCustomDomain) {
        console.log('🔍 [earlyPreload] نطاق مخصص - استخدام النطاق الكامل:', hostname);
        return { storeIdentifier: hostname, domainType: 'custom-domain' };
      }

      // للنطاقات الأساسية، نستخرج subdomain
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          const cleanSubdomain = parts[0]
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '')
            .replace(/[^a-z0-9-]/g, '')
            .replace(/^-+|-+$/g, '')
            .replace(/-+/g, '-');

          console.log('🔍 [earlyPreload] نطاق أساسي مع subdomain:', cleanSubdomain);
          return { storeIdentifier: cleanSubdomain, domainType: 'subdomain' };
        }
      }

      // للنطاقات المحلية
      if (isLocalhost) {
        if (hostname.includes('localhost')) {
          const subdomain = hostname.split('.')[0];
          if (subdomain && subdomain !== 'localhost') {
            console.log('🔍 [earlyPreload] نطاق محلي مع subdomain:', subdomain);
            return { storeIdentifier: subdomain, domainType: 'subdomain' };
          }
        }
        return { storeIdentifier: null, domainType: 'localhost' };
      }

      // 🔥 fallback: استخدام النطاق المخزن في localStorage فقط إذا لم نتمكن من تحديد النطاق الحالي
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') {
        console.log('🔍 [earlyPreload] استخدام النطاق المخزن كـ fallback:', stored);
        return { storeIdentifier: stored, domainType: 'subdomain' };
      }
    } catch (error) {
      console.warn('⚠️ [earlyPreload] خطأ في resolveStoreIdentifier:', error);
    }

    return { storeIdentifier: null, domainType: 'localhost' };
  }

  /**
   * استدعاء API مع استراتيجية محسنة للنطاق المخصص
   */
  private async callStoreInitAPI(storeIdentifier: string, domainType: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // الحصول على Supabase URL و API Key من environment فقط
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      // التحقق من وجود المتغيرات المطلوبة
      if (!supabaseUrl) {
        throw new Error('VITE_SUPABASE_URL environment variable is required');
      }
      if (!supabaseAnonKey) {
        throw new Error('VITE_SUPABASE_ANON_KEY environment variable is required');
      }

      console.log(`🔄 [earlyPreload] استدعاء API للنطاق: ${storeIdentifier} (النوع: ${domainType})`);
      console.log(`🔄 [earlyPreload] البحث في قاعدة البيانات باستخدام:`, storeIdentifier);

      const requestBody = JSON.stringify({
        org_identifier: storeIdentifier
      });
      console.log(`🔄 [earlyPreload] جسم الطلب:`, requestBody);

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_store_init_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: requestBody
      });

      console.log(`🔄 [earlyPreload] استجابة HTTP:`, response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`⚠️ [earlyPreload] HTTP error ${response.status}:`, errorText);
        
        // محاولة fallback للنطاق المخصص
        if (domainType === 'custom-domain' && response.status === 400) {
          console.log('🔄 [earlyPreload] محاولة fallback للنطاق المخصص...');
          return await this.tryCustomDomainFallback(storeIdentifier);
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🔄 [earlyPreload] بيانات الاستجابة:`, JSON.stringify(data, null, 2));

      if (data.error) {
        console.warn(`⚠️ [earlyPreload] RPC error:`, data.error);
        console.warn(`⚠️ [earlyPreload] تفاصيل الخطأ:`, {
          error: data.error,
          storeIdentifier,
          domainType,
          hostname: window.location.hostname
        });
        
        // محاولة fallback للنطاق المخصص
        if (domainType === 'custom-domain' && data.error.includes('Organization not found')) {
          console.log('🔄 [earlyPreload] محاولة fallback للنطاق المخصص بعد RPC error...');
          return await this.tryCustomDomainFallback(storeIdentifier);
        }
        
        return {
          success: false,
          error: data.error
        };
      }

      console.log(`✅ [earlyPreload] تم العثور على المنظمة بنجاح!`);
      console.log(`✅ [earlyPreload] بيانات المنظمة:`, {
        organizationId: data.organization_details?.id,
        organizationName: data.organization_details?.name,
        subdomain: data.organization_details?.subdomain,
        domain: data.organization_details?.domain
      });

      return {
        success: true,
        data: data
      };
    } catch (error: any) {
      console.error('❌ [earlyPreload] خطأ في callStoreInitAPI:', error);
      return {
        success: false,
        error: error?.message || 'Network error'
      };
    }
  }

  /**
   * محاولة fallback للنطاق المخصص باستخدام محسن النطاق المخصص
   */
  private async tryCustomDomainFallback(hostname: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔄 [earlyPreload] محاولة fallback للنطاق المخصص باستخدام محسن النطاق المخصص:', hostname);
      
      // استخدام محسن النطاق المخصص
      const optimizationResult = await optimizeCustomDomain(hostname);
      
      if (optimizationResult.success && optimizationResult.organizationId) {
        console.log('✅ [earlyPreload] نجح fallback مع محسن النطاق المخصص:', optimizationResult);
        
        // محاولة الحصول على بيانات المتجر باستخدام معرف المؤسسة
        const storeData = await this.getStoreDataByOrganizationId(optimizationResult.organizationId);
        if (storeData.success) {
          return storeData;
        }
      }
      
      // إذا فشل fallback، أرجع خطأ واضح
      return {
        success: false,
        error: `Organization not found for custom domain: ${hostname}. Please check the domain configuration.`
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
  private async getStoreDataByOrganizationId(organizationId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        return { success: false, error: 'Missing environment variables' };
      }

      // استخدام RPC للحصول على بيانات المتجر
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_store_init_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          org_identifier: organizationId
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (!data.error) {
          return {
            success: true,
            data: data
          };
        }
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
   * الحصول على البيانات المحفوظة مسبقاً
   */
  getPreloadedData(storeIdentifier?: string): any | null {
    if (this.preloadResult?.success && this.preloadResult.data) {
      return this.preloadResult.data;
    }

    // محاولة الحصول على البيانات من cache محلي
    if (storeIdentifier && this.domainCache.has(storeIdentifier)) {
      const cached = this.domainCache.get(storeIdentifier)!;
      if (Date.now() - cached.timestamp < 5 * 60 * 1000) {
        return cached.data;
      }
    }

    // محاولة الحصول على البيانات من localStorage
    if (storeIdentifier) {
      try {
        const stored = localStorage.getItem(`early_preload_${storeIdentifier}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          // التحقق من أن البيانات ليست قديمة (أقل من 5 دقائق)
          if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
            return parsed.data;
          } else {
            // إزالة البيانات القديمة
            localStorage.removeItem(`early_preload_${storeIdentifier}`);
          }
        }
      } catch {}
    }

    return null;
  }

  /**
   * مسح البيانات المحفوظة مسبقاً
   */
  clearPreloadedData(): void {
    this.preloadPromise = null;
    this.preloadResult = null;
    this.domainCache.clear();
    
    // مسح من localStorage
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('early_preload_')) {
          localStorage.removeItem(key);
        }
      });
    } catch {}
  }

  /**
   * الحصول على معلومات النطاق
   */
  getDomainInfo(): { storeIdentifier: string | null; domainType: string | null } {
    const { storeIdentifier, domainType } = this.resolveStoreIdentifier();
    return { storeIdentifier, domainType };
  }
}

// تصدير instance واحد
export const earlyPreloader = EarlyPreloader.getInstance();

// دالة لبدء preload مبكر
export const startEarlyPreload = () => earlyPreloader.startEarlyPreload();

// دالة للحصول على البيانات المحفوظة مسبقاً
export const getEarlyPreloadedData = (storeIdentifier?: string) => earlyPreloader.getPreloadedData(storeIdentifier);

// دالة للحصول على معلومات النطاق
export const getEarlyPreloadDomainInfo = () => earlyPreloader.getDomainInfo();
