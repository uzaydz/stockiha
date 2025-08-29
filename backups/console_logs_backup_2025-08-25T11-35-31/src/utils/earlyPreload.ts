/**
 * نظام preload مبكر يتم تشغيله قبل React
 * يجلب بيانات المتجر فور تحميل الصفحة
 */

interface EarlyPreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  storeIdentifier?: string;
}

class EarlyPreloader {
  private static instance: EarlyPreloader;
  private preloadPromise: Promise<EarlyPreloadResult> | null = null;
  private preloadResult: EarlyPreloadResult | null = null;

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

    console.log('🚀 [EarlyPreloader] بدء preload مبكر...');
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
      const storeIdentifier = this.resolveStoreIdentifier();
      
      if (!storeIdentifier) {
        const executionTime = performance.now() - startTime;
        console.log('🤷 [EarlyPreloader] لا يوجد store identifier');
        return {
          success: false,
          error: 'No store identifier found',
          executionTime
        };
      }

      console.log(`🏪 [EarlyPreloader] جلب بيانات المتجر: ${storeIdentifier}`);

      // استدعاء API مباشرة بدون dependencies
      const response = await this.callStoreInitAPI(storeIdentifier);
      const executionTime = performance.now() - startTime;

      if (response.success) {
        console.log(`✅ [EarlyPreloader] اكتمل preload مبكر في ${executionTime.toFixed(2)}ms`);
        
        // حفظ البيانات في localStorage مؤقتاً
        try {
          localStorage.setItem(`early_preload_${storeIdentifier}`, JSON.stringify({
            data: response.data,
            timestamp: Date.now(),
            executionTime
          }));
        } catch (e) {
          console.warn('⚠️ [EarlyPreloader] فشل في حفظ البيانات في localStorage');
        }

        // إرسال حدث للإعلام عن اكتمال التحميل المبكر
        window.dispatchEvent(new CustomEvent('earlyPreloadComplete', {
          detail: {
            storeIdentifier,
            data: response.data,
            executionTime
          }
        }));

        return {
          success: true,
          data: response.data,
          executionTime,
          storeIdentifier
        };
      } else {
        console.error(`❌ [EarlyPreloader] فشل في preload مبكر:`, response.error);
        return {
          success: false,
          error: response.error,
          executionTime,
          storeIdentifier
        };
      }
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      console.error('❌ [EarlyPreloader] خطأ في preload مبكر:', error);
      return {
        success: false,
        error: error?.message || 'Unknown error',
        executionTime
      };
    }
  }

  /**
   * تحديد store identifier
   */
  private resolveStoreIdentifier(): string | null {
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') return stored;
    } catch {}
    
    try {
      const hostname = window.location.hostname.split(':')[0];
      const baseDomains = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
      const isBaseDomain = baseDomains.some((d) => hostname.endsWith(d));
      const isLocalhost = hostname.includes('localhost') || hostname.startsWith('127.');
      const isCustomDomain = !isLocalhost && !isBaseDomain;
      
      if (isBaseDomain) {
        const parts = hostname.split('.');
        if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
          return parts[0];
        }
      }
      
      if (isCustomDomain) {
        return hostname;
      }
    } catch {}
    
    return null;
  }

  /**
   * استدعاء API مباشرة
   */
  private async callStoreInitAPI(storeIdentifier: string): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // الحصول على Supabase URL من environment أو من المتغيرات العامة
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://wrnssatuvmumsczyldth.supabase.co';
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndybnNzYXR1dm11bXN6enlsZHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTkzMjk1NzQsImV4cCI6MjAzNDkwNTU3NH0.3bA5IuYjJqBPJGO1pYnZJoVPOdNJcnFHNMHV_8T8oVc';

      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_store_init_data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify({
          org_identifier: storeIdentifier
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        return {
          success: false,
          error: data.error
        };
      }

      return {
        success: true,
        data: data
      };
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
}

// تصدير instance واحد
export const earlyPreloader = EarlyPreloader.getInstance();

// دالة لبدء preload مبكر
export const startEarlyPreload = () => earlyPreloader.startEarlyPreload();

// دالة للحصول على البيانات المحفوظة مسبقاً
export const getEarlyPreloadedData = (storeIdentifier?: string) => earlyPreloader.getPreloadedData(storeIdentifier);
