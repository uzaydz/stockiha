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
    max_pos: number | null;
    max_users: number | null;
    max_products: number | null;
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
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 ساعة بالميلي ثانية

  static getInstance(): SubscriptionCacheService {
    if (!SubscriptionCacheService.instance) {
      SubscriptionCacheService.instance = new SubscriptionCacheService();
    }
    return SubscriptionCacheService.instance;
  }

  /**
   * الحصول على حالة الاشتراك مع التخزين المؤقت الذكي
   */
  async getSubscriptionStatus(organizationId: string): Promise<SubscriptionData> {
    try {
      // 1. فحص التخزين المؤقت في الذاكرة أولاً (أسرع)
      const memoryCached = this.getFromMemoryCache(organizationId);
      if (memoryCached) {
        return memoryCached;
      }

      // 2. استدعاء دالة قاعدة البيانات المحسنة مع التخزين المؤقت
      const { data, error } = await supabase.rpc('get_organization_subscription_cached', {
        org_id: organizationId
      });

      if (error) {
        return this.getErrorResponse(error.message);
      }

      if (!data) {
        return this.getErrorResponse('لم يتم العثور على بيانات الاشتراك');
      }

      const subscriptionData = data as SubscriptionData;

      // 3. حفظ في التخزين المؤقت في الذاكرة
      this.saveToMemoryCache(organizationId, subscriptionData);

      // 4. حفظ في localStorage للجلسات المستقبلية
      this.saveToLocalStorage(organizationId, subscriptionData);

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
      limits: { max_pos: 0, max_users: 0, max_products: 0 },
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
  }

  /**
   * إجبار تحديث البيانات (تجاهل التخزين المؤقت)
   */
  async forceRefresh(organizationId: string): Promise<SubscriptionData> {
    this.clearCache(organizationId);
    return this.getSubscriptionStatus(organizationId);
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
