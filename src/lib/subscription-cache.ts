/**
 * خدمة التخزين المؤقت الذكي للاشتراكات
 * تتكامل مع دالة قاعدة البيانات المثالية
 * تحدث البيانات مرة واحدة يومياً فقط
 */

import { supabase } from './supabase';

export interface SubscriptionData {
  success: boolean;
  status: 'active' | 'trial' | 'expired' | 'error' | 'not_found';
  subscription_type: 'paid' | 'trial_subscription' | 'organization_trial' | 'none';
  subscription_id: string | null;
  plan_name: string;
  plan_code: string;
  start_date: string | null;
  end_date: string | null;
  days_left: number;
  features: string[];
  limits: {
    max_pos: string | null;
    max_users: string | null;
    max_products: string | null;
  };
  billing_cycle?: string;
  amount_paid?: number;
  currency?: string;
  trial_period_days?: number;
  message: string;
  error?: string;
}

class SubscriptionCacheService {
  private static instance: SubscriptionCacheService;
  private memoryCache: Map<string, { data: SubscriptionData; expires: number }> = new Map();
  // زيادة مدة الكاش إلى 24 ساعة بدلاً من 24 ساعة (كانت بالفعل 24 ساعة، لكن سأضيف تحسينات إضافية)
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة بالميلي ثانية
  // إضافة كاش للجلسة الحالية لمنع الاستدعاءات المتكررة في نفس الجلسة
  private sessionCache: Map<string, { data: SubscriptionData; timestamp: number }> = new Map();
  private readonly SESSION_CACHE_DURATION = 5 * 60 * 1000; // 5 دقائق للجلسة الحالية
  // إضافة كاش في sessionStorage لمنع الاستدعاءات المتكررة عند تحديث الصفحة
  private readonly SESSION_STORAGE_KEY = 'subscription_cache';
  private readonly SESSION_STORAGE_DURATION = 30 * 60 * 1000; // 30 دقيقة

  static getInstance(): SubscriptionCacheService {
    if (!SubscriptionCacheService.instance) {
      SubscriptionCacheService.instance = new SubscriptionCacheService();
    }
    return SubscriptionCacheService.instance;
  }

  /**
   * الحصول على حالة الاشتراك مع التخزين المؤقت الذكي المحسن
   */
  async getSubscriptionStatus(organizationId: string): Promise<SubscriptionData> {
    try {
      // 1. فحص sessionStorage أولاً (يبقى بعد تحديث الصفحة)
      const sessionStorageCached = this.getFromSessionStorage(organizationId);
      if (sessionStorageCached) {
        return sessionStorageCached;
      }

      // 2. فحص كاش الجلسة الحالية
      const sessionCached = this.getFromSessionCache(organizationId);
      if (sessionCached) {
        // حفظ في sessionStorage أيضاً
        this.saveToSessionStorage(organizationId, sessionCached);
        return sessionCached;
      }

      // 3. فحص التخزين المؤقت في الذاكرة
      const memoryCached = this.getFromMemoryCache(organizationId);
      if (memoryCached) {
        // حفظ في كاش الجلسة والـ sessionStorage
        this.saveToSessionCache(organizationId, memoryCached);
        this.saveToSessionStorage(organizationId, memoryCached);
        return memoryCached;
      }

      // 4. فحص localStorage
      const localStorageCached = this.getFromLocalStorage(organizationId);
      if (localStorageCached) {
        // حفظ في كاش الذاكرة والجلسة والـ sessionStorage
        this.saveToMemoryCache(organizationId, localStorageCached);
        this.saveToSessionCache(organizationId, localStorageCached);
        this.saveToSessionStorage(organizationId, localStorageCached);
        return localStorageCached;
      }

      // 5. استدعاء دالة قاعدة البيانات المحسنة الجديدة
      const { data, error } = await (supabase as any).rpc('check_organization_subscription_enhanced', {
        org_id: organizationId
      });

      if (error) {
        return this.getErrorResponse(error.message);
      }

      if (!data) {
        return this.getErrorResponse('لم يتم العثور على بيانات الاشتراك');
      }

      const subscriptionData = data as SubscriptionData;

      // 6. حفظ في جميع أنواع الكاش
      this.saveToMemoryCache(organizationId, subscriptionData);
      this.saveToLocalStorage(organizationId, subscriptionData);
      this.saveToSessionCache(organizationId, subscriptionData);
      this.saveToSessionStorage(organizationId, subscriptionData);

      return subscriptionData;

    } catch (error) {
      return this.getErrorResponse('خطأ غير متوقع في فحص الاشتراك');
    }
  }

  /**
   * التحقق من صحة الاشتراك بسرعة
   */
  async isSubscriptionValid(organizationId: string): Promise<boolean> {
    const subscription = await this.getSubscriptionStatus(organizationId);
    return subscription.success && 
           (subscription.status === 'active' || subscription.status === 'trial') &&
           subscription.days_left > 0;
  }



  /**
   * الحصول من التخزين المؤقت في الذاكرة
   */
  private getFromMemoryCache(organizationId: string): SubscriptionData | null {
    const cached = this.memoryCache.get(organizationId);
    if (cached && cached.expires > Date.now()) {
      return cached.data;
    }
    
    // حذف البيانات المنتهية الصلاحية
    if (cached) {
      this.memoryCache.delete(organizationId);
    }
    
    return null;
  }

  /**
   * حفظ في التخزين المؤقت في الذاكرة
   */
  private saveToMemoryCache(organizationId: string, data: SubscriptionData): void {
    this.memoryCache.set(organizationId, {
      data,
      expires: Date.now() + this.CACHE_DURATION
    });
  }

  /**
   * الحصول من كاش الجلسة الحالية
   */
  private getFromSessionCache(organizationId: string): SubscriptionData | null {
    const cached = this.sessionCache.get(organizationId);
    if (cached && (Date.now() - cached.timestamp) < this.SESSION_CACHE_DURATION) {
      return cached.data;
    }
    
    // حذف البيانات المنتهية الصلاحية
    if (cached) {
      this.sessionCache.delete(organizationId);
    }
    
    return null;
  }

  /**
   * حفظ في كاش الجلسة الحالية
   */
  private saveToSessionCache(organizationId: string, data: SubscriptionData): void {
    this.sessionCache.set(organizationId, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * حفظ في localStorage
   */
  private saveToLocalStorage(organizationId: string, data: SubscriptionData): void {
    try {
      const cacheData = {
        data,
        expires: Date.now() + this.CACHE_DURATION,
        version: '1.0' // لضمان توافق الإصدارات المستقبلية
      };
      
      localStorage.setItem(
        `subscription_cache_${organizationId}`, 
        JSON.stringify(cacheData)
      );
    } catch (error) {
      // تجاهل أخطاء localStorage (مثل امتلاء التخزين)
    }
  }

  /**
   * محاولة الحصول من localStorage
   */
  private getFromLocalStorage(organizationId: string): SubscriptionData | null {
    try {
      const cached = localStorage.getItem(`subscription_cache_${organizationId}`);
      if (!cached) return null;

      const parsedCache = JSON.parse(cached);
      
      // التحقق من صحة البيانات وانتهاء الصلاحية
      if (parsedCache.expires > Date.now() && parsedCache.data && parsedCache.version === '1.0') {
        return parsedCache.data as SubscriptionData;
      }
      
      // حذف البيانات المنتهية الصلاحية
      localStorage.removeItem(`subscription_cache_${organizationId}`);
      return null;
      
    } catch (error) {
      // حذف البيانات المتضررة
      localStorage.removeItem(`subscription_cache_${organizationId}`);
      return null;
    }
  }

  /**
   * الحصول من sessionStorage
   */
  private getFromSessionStorage(organizationId: string): SubscriptionData | null {
    try {
      const cached = sessionStorage.getItem(`${this.SESSION_STORAGE_KEY}_${organizationId}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.timestamp && parsed.data) {
          const now = Date.now();
          if ((now - parsed.timestamp) < this.SESSION_STORAGE_DURATION) {
            return parsed.data;
          }
        }
      }
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
    return null;
  }

  /**
   * حفظ في sessionStorage
   */
  private saveToSessionStorage(organizationId: string, data: SubscriptionData): void {
    try {
      const cacheData = {
        data,
        timestamp: Date.now()
      };
      sessionStorage.setItem(`${this.SESSION_STORAGE_KEY}_${organizationId}`, JSON.stringify(cacheData));
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  }

  /**
   * إنشاء استجابة خطأ موحدة
   */
  private getErrorResponse(errorMessage: string): SubscriptionData {
    return {
      success: false,
      status: 'error',
      subscription_type: 'none',
      subscription_id: null,
      plan_name: 'خطأ',
      plan_code: 'error',
      start_date: null,
      end_date: null,
      days_left: 0,
      features: [],
      limits: { max_pos: '0', max_users: '0', max_products: '0' },
      message: errorMessage,
      error: errorMessage
    };
  }

  /**
   * مسح التخزين المؤقت لمؤسسة معينة
   */
  clearCache(organizationId: string): void {
    this.memoryCache.delete(organizationId);
    localStorage.removeItem(`subscription_cache_${organizationId}`);
    this.sessionCache.delete(organizationId);
    try {
      sessionStorage.removeItem(`${this.SESSION_STORAGE_KEY}_${organizationId}`);
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  }

  /**
   * مسح جميع بيانات التخزين المؤقت
   */
  clearAllCache(): void {
    this.memoryCache.clear();
    
    // مسح جميع بيانات الاشتراك من localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('subscription_cache_')) {
        localStorage.removeItem(key);
      }
    });
    this.sessionCache.clear();
    try {
      // مسح جميع مفاتيح sessionStorage المتعلقة بالاشتراك
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith(this.SESSION_STORAGE_KEY)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      // تجاهل أخطاء sessionStorage
    }
  }

  /**
   * إجبار تحديث البيانات (تجاهل التخزين المؤقت)
   */
  async forceRefresh(organizationId: string): Promise<SubscriptionData> {
    try {
      // حذف جميع أنواع التخزين المؤقت
      this.clearCache(organizationId);
      
      // استدعاء دالة قاعدة البيانات مباشرة
      const { data, error } = await (supabase as any).rpc('check_organization_subscription_enhanced', {
        org_id: organizationId
      });

      if (error) {
        return this.getErrorResponse(error.message);
      }

      if (!data) {
        return this.getErrorResponse('لم يتم العثور على بيانات الاشتراك');
      }

      const subscriptionData = data as SubscriptionData;

      // حفظ في جميع أنواع الكاش
      this.saveToMemoryCache(organizationId, subscriptionData);
      this.saveToLocalStorage(organizationId, subscriptionData);
      this.saveToSessionCache(organizationId, subscriptionData);
      this.saveToSessionStorage(organizationId, subscriptionData);

      return subscriptionData;
    } catch (error) {
      return this.getErrorResponse('خطأ في تحديث البيانات');
    }
  }

  /**
   * تنظيف دوري للذاكرة المؤقتة
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.expires <= now) {
        this.memoryCache.delete(key);
      }
    }
  }
}

// إنشاء مثيل واحد للاستخدام في جميع أنحاء التطبيق
export const subscriptionCache = SubscriptionCacheService.getInstance();

// تنظيف دوري كل ساعة
setInterval(() => {
  subscriptionCache.cleanup();
}, 60 * 60 * 1000);
