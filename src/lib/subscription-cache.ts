/**
 * خدمة التخزين المؤقت الذكي للاشتراكات
 * تتكامل مع دالة قاعدة البيانات المثالية
 * تحدث البيانات مرة واحدة يومياً فقط
 *
 * ⚡ محدث: يستخدم التشفير والتوقيع الرقمي لحماية البيانات
 */

import { supabase } from './supabase';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { encryptSubscriptionData, decryptSubscriptionData } from '@/lib/security/subscriptionCrypto';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';

// ⭐ استيراد الأنواع الجديدة
import type { SubscriptionPlanLimits, SubscriptionPlanPermissions, PlanCode } from '@/types/subscription';
import { DEFAULT_PLAN_LIMITS } from '@/lib/subscription-service';

export interface SubscriptionData {
  success: boolean;
  status: 'active' | 'trial' | 'expired' | 'canceled' | 'error' | 'not_found' | 'pending';
  subscription_type: 'paid' | 'trial_subscription' | 'organization_trial' | 'none';
  subscription_id: string | null;
  plan_name: string;
  plan_code: PlanCode;
  start_date: string | null;
  end_date: string | null;
  days_left: number;
  features: string[];
  // ⭐ الحدود المحدثة للخطط الجديدة (v2)
  limits: SubscriptionPlanLimits;
  // ⭐ الصلاحيات (اختياري)
  permissions?: SubscriptionPlanPermissions;
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

      // 4. فحص localStorage (مع فك التشفير)
      const localStorageCached = await this.getFromLocalStorage(organizationId);
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

      // ⚡ الاشتراكات تُزامن تلقائياً من Supabase عبر Sync Rules
      // ❌ لا نكتب محلياً - البيانات تأتي من السيرفر فقط
      // هذا يمنع العمليات المعلقة في Outbox
      console.log('[SubscriptionCache] ℹ️ Subscription data synced from server via PowerSync');

      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('subscriptionActivated', { detail: { organizationId } }));
        }
      } catch {}

      // 6. حفظ في جميع أنواع الكاش (مع التشفير)
      this.saveToMemoryCache(organizationId, subscriptionData);
      await this.saveToLocalStorage(organizationId, subscriptionData);
      this.saveToSessionCache(organizationId, subscriptionData);
      this.saveToSessionStorage(organizationId, subscriptionData);

      // تسجيل التحقق الناجح
      await subscriptionAudit.log('VALIDATION_SUCCESS', organizationId, {
        plan: subscriptionData.plan_name,
        status: subscriptionData.status,
        days_left: subscriptionData.days_left
      });

      return subscriptionData;

    } catch (error) {
      // تسجيل الخطأ
      await subscriptionAudit.log('ERROR', organizationId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'getSubscriptionStatus'
      }, { severity: 'error' });
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
   * حفظ في localStorage (مع التشفير)
   */
  private async saveToLocalStorage(organizationId: string, data: SubscriptionData): Promise<void> {
    try {
      const cacheData = {
        data,
        expires: Date.now() + this.CACHE_DURATION,
        version: '2.0' // إصدار جديد مع التشفير
      };

      // تشفير البيانات قبل الحفظ
      const encrypted = await encryptSubscriptionData(organizationId, cacheData);

      if (encrypted) {
        localStorage.setItem(
          `subscription_cache_${organizationId}`,
          encrypted
        );
      } else {
        // في حالة فشل التشفير، نحفظ بدون تشفير (للتوافقية)
        localStorage.setItem(
          `subscription_cache_${organizationId}`,
          JSON.stringify(cacheData)
        );
      }
    } catch (error) {
      // تجاهل أخطاء localStorage (مثل امتلاء التخزين)
      console.warn('[SubscriptionCache] Failed to save to localStorage:', error);
    }
  }

  /**
   * محاولة الحصول من localStorage (مع فك التشفير)
   */
  private async getFromLocalStorage(organizationId: string): Promise<SubscriptionData | null> {
    try {
      const cached = localStorage.getItem(`subscription_cache_${organizationId}`);
      if (!cached) return null;

      // التحقق مما إذا كانت البيانات مشفرة (تبدأ بـ BZR_SUB_V2_)
      if (cached.startsWith('BZR_SUB_V2_')) {
        const result = await decryptSubscriptionData(organizationId, cached);

        if (result.tamperDetected) {
          // ⚡ تحقق: هل هذا تلاعب حقيقي أم مجرد تغيير في بصمة الجهاز؟
          // في معظم الحالات، هذا يحدث بسبب تحديث المتصفح أو تغيير الإعدادات
          // لذلك نحذف الكاش بهدوء ونعيد جلب البيانات
          console.info('[SubscriptionCache] 🔄 Cache invalidated (fingerprint changed), will refresh from server');
          localStorage.removeItem(`subscription_cache_${organizationId}`);
          return null;
        }

        if (!result.valid || !result.data) {
          localStorage.removeItem(`subscription_cache_${organizationId}`);
          return null;
        }

        const parsedCache = result.data;

        // التحقق من انتهاء الصلاحية
        if (parsedCache.expires > Date.now() && parsedCache.data) {
          return parsedCache.data as SubscriptionData;
        }

        localStorage.removeItem(`subscription_cache_${organizationId}`);
        return null;
      }

      // التوافقية مع البيانات القديمة غير المشفرة
      const parsedCache = JSON.parse(cached);

      // التحقق من صحة البيانات وانتهاء الصلاحية
      if (parsedCache.expires > Date.now() && parsedCache.data &&
          (parsedCache.version === '1.0' || parsedCache.version === '2.0')) {
        // ترقية البيانات القديمة إلى التشفير الجديد
        await this.saveToLocalStorage(organizationId, parsedCache.data);
        return parsedCache.data as SubscriptionData;
      }

      // حذف البيانات المنتهية الصلاحية
      localStorage.removeItem(`subscription_cache_${organizationId}`);
      return null;

    } catch (error) {
      // حذف البيانات المتضررة
      console.warn('[SubscriptionCache] Failed to read from localStorage:', error);
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
   * ⭐ محدث: يستخدم الحدود الافتراضية الجديدة
   */
  private getErrorResponse(errorMessage: string): SubscriptionData {
    return {
      success: false,
      status: 'error',
      subscription_type: 'none',
      subscription_id: null,
      plan_name: 'خطأ',
      plan_code: 'trial',
      start_date: null,
      end_date: null,
      days_left: 0,
      features: [],
      limits: DEFAULT_PLAN_LIMITS.trial,
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

      // ⚡ الاشتراكات تُزامن تلقائياً من Supabase عبر Sync Rules
      // ❌ لا نكتب محلياً - البيانات تأتي من السيرفر فقط
      console.log('[SubscriptionCache] ℹ️ Subscription refreshed from server via PowerSync');

      try {
        if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
          window.dispatchEvent(new CustomEvent('subscriptionActivated', { detail: { organizationId } }));
        }
      } catch {}

      // حفظ في جميع أنواع الكاش (مع التشفير)
      this.saveToMemoryCache(organizationId, subscriptionData);
      await this.saveToLocalStorage(organizationId, subscriptionData);
      this.saveToSessionCache(organizationId, subscriptionData);
      this.saveToSessionStorage(organizationId, subscriptionData);

      // تسجيل التحديث الناجح
      await subscriptionAudit.log('SYNC_SUCCESS', organizationId, {
        plan: subscriptionData.plan_name,
        status: subscriptionData.status,
        source: 'forceRefresh'
      });

      return subscriptionData;
    } catch (error) {
      await subscriptionAudit.log('SYNC_FAILED', organizationId, {
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { severity: 'error' });
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
