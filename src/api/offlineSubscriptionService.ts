/**
 * offlineSubscriptionService - خدمة الاشتراكات المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 * 🔒 محدث: دعم التشفير والتدقيق
 * ⭐ محدث: دعم الخطط الجديدة (v2) والحدود
 *
 * - Offline-First: يعمل بدون إنترنت
 * - Local-First: التحقق محلياً أولاً
 * - المزامنة التلقائية عند الاتصال
 * - تشفير البيانات المحلية
 * - تسجيل سجلات التدقيق
 * - دعم الحدود (المنتجات، المستخدمين، نقاط البيع، الفروع)
 */

import type { LocalSubscription } from '@/database/localDb';
import { supabase } from '@/lib/supabase';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';
import { getSecureNow } from '@/lib/license/licenseService';
import { DEFAULT_PLAN_LIMITS, PLAN_CODES } from '@/lib/subscription-service';
import type { SubscriptionPlanLimits, PlanCode, LimitCheckResult } from '@/types/subscription';

// ⭐ أنواع الاستجابة المحسنة
export interface OfflineSubscriptionStatus {
  isValid: boolean;
  reason?: string;
  expiryDate?: string;
  subscription?: LocalSubscription;
  tamperDetected?: boolean;
  // ⭐ بيانات الخطة الجديدة
  planCode?: PlanCode;
  planName?: string;
  limits?: SubscriptionPlanLimits;
  daysLeft?: number;
}

export const offlineSubscriptionService = {
  /**
   * جلب معلومات الاشتراك من السيرفر وحفظها محلياً
   * ⭐ محدث: يدعم الخطط الجديدة (v2) والحدود
   */
  async syncSubscription(organizationId: string): Promise<boolean> {
    try {
      if (!organizationId) return false;

      // ⭐ استخدام RPC المحسنة للحصول على كل البيانات
      const { data: subscriptionData, error: rpcError } = await (supabase as any).rpc(
        'check_organization_subscription_enhanced',
        { org_id: organizationId }
      );

      if (!rpcError && subscriptionData?.success) {
        // ⭐ جلب تفاصيل الخطة بما فيها الحدود
        const planCode = subscriptionData.plan_code as PlanCode;
        const limits = DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;

        await this.saveLocalSubscription({
          id: subscriptionData.subscription_id || `sub_${organizationId}`,
          organization_id: organizationId,
          plan_id: subscriptionData.subscription_id,
          plan_code: planCode,
          plan_name: subscriptionData.plan_name,
          status: subscriptionData.status as LocalSubscription['status'],
          billing_cycle: subscriptionData.billing_cycle,
          start_date: subscriptionData.start_date || new Date().toISOString(),
          end_date: subscriptionData.end_date || new Date().toISOString(),
          trial_end_date: subscriptionData.subscription_type === 'trial' ? subscriptionData.end_date : undefined,
          limits: limits,
          features: subscriptionData.features || [],
          amount_paid: subscriptionData.amount_paid,
          currency: subscriptionData.currency || 'DZD',
          last_check: new Date().toISOString(),
        });

        console.log('[OfflineSubscription] ⭐ Synced subscription with limits:', planCode, limits);
        return true;
      }

      // Fallback: جلب الاشتراك النشط من السيرفر بالطريقة القديمة
      const { data: subscription, error } = await supabase
        .from('organization_subscriptions')
        .select(`
          *,
          plan:plan_id (
            id, name, code, limits, features, permissions
          )
        `)
        .eq('organization_id', organizationId)
        .in('status', ['active', 'trial'])
        .order('end_date', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[OfflineSubscription] Failed to fetch subscription:', error);
        return false;
      }

      if (!subscription) {
        // لا يوجد اشتراك نشط - قد يكون منتهي الصلاحية
        const { data: lastSub } = await supabase
          .from('organization_subscriptions')
          .select(`
            *,
            plan:plan_id (
              id, name, code, limits, features, permissions
            )
          `)
          .eq('organization_id', organizationId)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();

        if (lastSub) {
          const planCode = (lastSub.plan?.code || 'trial') as PlanCode;
          const limits = lastSub.plan?.limits || DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;

          await this.saveLocalSubscription({
            id: lastSub.id,
            organization_id: lastSub.organization_id,
            plan_id: lastSub.plan_id,
            plan_code: planCode,
            plan_name: lastSub.plan?.name,
            status: 'expired',
            start_date: lastSub.start_date,
            end_date: lastSub.end_date,
            trial_end_date: lastSub.trial_ends_at,
            limits: limits,
            features: lastSub.plan?.features || [],
            last_check: new Date().toISOString(),
            synced: true
          });
        }
        return true;
      }

      // ⭐ حفظ الاشتراك محلياً مع الحدود
      const planCode = (subscription.plan?.code || 'trial') as PlanCode;
      const limits = subscription.plan?.limits || DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;

      await this.saveLocalSubscription({
        id: subscription.id,
        organization_id: subscription.organization_id,
        plan_id: subscription.plan_id,
        plan_code: planCode,
        plan_name: subscription.plan?.name,
        status: subscription.status,
        billing_cycle: subscription.billing_cycle,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        trial_end_date: subscription.trial_ends_at,
        limits: limits,
        permissions: subscription.plan?.permissions,
        features: subscription.plan?.features || [],
        amount_paid: subscription.amount_paid,
        currency: subscription.currency,
        last_check: new Date().toISOString(),
        synced: true
      });

      console.log('[OfflineSubscription] ⭐ Synced subscription with limits via fallback:', planCode);
      return true;
    } catch (error) {
      console.error('[OfflineSubscription] Error syncing subscription:', error);
      return false;
    }
  },

  /**
   * حفظ الاشتراك في قاعدة البيانات المحلية
   * ⚡ الاشتراكات تُزامن تلقائياً من Supabase عبر PowerSync Sync Rules
   * ❌ لا نكتب محلياً عبر writeTransaction لتجنب العمليات المعلقة
   */
  async saveLocalSubscription(subscription: LocalSubscription): Promise<void> {
    // ⚡ الاشتراكات تُدار من السيرفر فقط - لا حاجة للكتابة المحلية
    // PowerSync يجلب البيانات تلقائياً من Supabase
    console.log('[OfflineSubscription] ℹ️ Subscription managed by server, synced via PowerSync:', {
      id: subscription.id,
      status: subscription.status,
      plan: subscription.plan_code
    });
  },

  /**
   * الحصول على الاشتراك المحلي
   * ⚡ يستخدم PowerSync
   * ✅ إصلاح: ترتيب حسب حالة الاشتراك أولاً (active > trial > غيرها) ثم end_date
   */
  async getLocalSubscription(organizationId: string): Promise<LocalSubscription | null> {
    try {
      const subscriptions = await powerSyncService.getAll<LocalSubscription>(
        `SELECT * FROM organization_subscriptions
         WHERE organization_id = ?
         ORDER BY
           CASE status
             WHEN 'active' THEN 1
             WHEN 'trial' THEN 2
             ELSE 3
           END,
           end_date DESC
         LIMIT 1`,
        [organizationId]
      );

      return subscriptions.length > 0 ? subscriptions[0] : null;
    } catch (error) {
      console.error('[OfflineSubscription] Failed to get local subscription:', error);
      return null;
    }
  },

  /**
   * التحقق من حالة الاشتراك محلياً
   * ⚡ Offline-First: يتحقق محلياً أولاً
   * 🔒 محدث: استخدام SecureClock للتحقق من التوقيت
   * @returns { isValid: boolean, reason?: string, expiryDate?: string }
   */
  async checkSubscriptionStatus(organizationId: string): Promise<{
    isValid: boolean;
    reason?: string;
    expiryDate?: string;
    subscription?: LocalSubscription;
    tamperDetected?: boolean;
  }> {
    try {
      // 🔒 استخدام SecureClock للحصول على الوقت الآمن
      const secureTime = await getSecureNow(organizationId);

      // التحقق من حالة الحظر بسبب التلاعب
      if (secureTime.isLocked) {
        await subscriptionAudit.log('VALIDATION_FAILED', organizationId, {
          reason: 'clock_tamper_locked',
          tamperCount: secureTime.tamperCount
        }, { severity: 'critical' });

        return {
          isValid: false,
          reason: 'tamper_detected_locked',
          tamperDetected: true
        };
      }

      // تسجيل محاولة التلاعب
      if (secureTime.tamperDetected) {
        await subscriptionAudit.logTamperDetected(organizationId, 'clock', {
          tamperCount: secureTime.tamperCount,
          source: 'checkSubscriptionStatus'
        });
      }

      // ⚡ جلب الاشتراك محلياً عبر Delta Sync
      let subscription = await this.getLocalSubscription(organizationId);

      if (!subscription) {
        // إذا لم نجد اشتراك محلي، نحاول المزامنة إذا كنا متصلين
        if (navigator.onLine) {
          const synced = await this.syncSubscription(organizationId);
          if (synced) {
            subscription = await this.getLocalSubscription(organizationId);
          }
        }

        if (!subscription) {
          await subscriptionAudit.log('VALIDATION_FAILED', organizationId, {
            reason: 'no_subscription_found'
          });
          return { isValid: false, reason: 'no_subscription_found' };
        }
      }

      // استخدام الوقت الآمن بدلاً من Date.now()
      const now = new Date(secureTime.secureNowMs);
      const endDate = new Date(subscription.end_date);
      const trialEndDate = subscription.trial_end_date ? new Date(subscription.trial_end_date) : null;

      // التحقق من انتهاء الصلاحية
      if (subscription.status === 'expired' || subscription.status === 'cancelled') {
        await subscriptionAudit.logSubscriptionExpired(organizationId, subscription.end_date);
        return {
          isValid: false,
          reason: 'subscription_expired',
          expiryDate: subscription.end_date,
          subscription,
          tamperDetected: secureTime.tamperDetected
        };
      }

      if (endDate < now) {
        // انتهت صلاحية الاشتراك
        await subscriptionAudit.logSubscriptionExpired(organizationId, subscription.end_date);
        return {
          isValid: false,
          reason: 'subscription_expired',
          expiryDate: subscription.end_date,
          subscription,
          tamperDetected: secureTime.tamperDetected
        };
      }

      if (subscription.status === 'trial' && trialEndDate && trialEndDate < now) {
        await subscriptionAudit.logSubscriptionExpired(organizationId, subscription.trial_end_date!);
        return {
          isValid: false,
          reason: 'trial_expired',
          expiryDate: subscription.trial_end_date,
          subscription,
          tamperDetected: secureTime.tamperDetected
        };
      }

      // محاولة تحديث الاشتراك في الخلفية إذا كنا متصلين
      if (navigator.onLine) {
        this.syncSubscriptionBackground(organizationId);
      }

      // تسجيل التحقق الناجح (بدون تفاصيل كثيرة لتجنب الإزعاج)
      await subscriptionAudit.log('OFFLINE_ACCESS', organizationId, {
        status: subscription.status,
        days_remaining: Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      });

      return {
        isValid: true,
        expiryDate: subscription.end_date,
        subscription,
        tamperDetected: secureTime.tamperDetected
      };

    } catch (error) {
      console.error('[OfflineSubscription] Error checking status:', error);
      await subscriptionAudit.log('ERROR', organizationId, {
        error: error instanceof Error ? error.message : 'Unknown error',
        source: 'checkSubscriptionStatus'
      }, { severity: 'error' });
      return { isValid: false, reason: 'check_error' };
    }
  },

  /**
   * مزامنة الاشتراك في الخلفية
   */
  async syncSubscriptionBackground(organizationId: string): Promise<void> {
    try {
      await this.syncSubscription(organizationId);
    } catch (error) {
      console.warn('[OfflineSubscription] Background sync failed:', error);
    }
  },

  /**
   * فرض إعادة المزامنة من السيرفر
   */
  async forceSync(organizationId: string): Promise<boolean> {
    if (!navigator.onLine) {
      console.warn('[OfflineSubscription] Cannot force sync while offline');
      return false;
    }
    return this.syncSubscription(organizationId);
  },

  /**
   * التحقق من ميزة معينة في الاشتراك
   */
  async hasFeature(organizationId: string, featureName: string): Promise<boolean> {
    const subscription = await this.getLocalSubscription(organizationId);
    if (!subscription || !subscription.features) return false;
    return subscription.features.includes(featureName);
  },

  /**
   * الحصول على عدد الأيام المتبقية في الاشتراك
   */
  async getDaysRemaining(organizationId: string): Promise<number> {
    const subscription = await this.getLocalSubscription(organizationId);
    if (!subscription) return 0;

    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  },

  // ============ ⭐ دوال الحدود الجديدة (Offline-First) ============

  /**
   * الحصول على حدود الاشتراك محلياً
   * ⭐ Offline-First: يعمل بدون إنترنت
   */
  async getLocalLimits(organizationId: string): Promise<SubscriptionPlanLimits> {
    const subscription = await this.getLocalSubscription(organizationId);

    if (subscription?.limits) {
      return subscription.limits;
    }

    // استخدام الحدود من كود الخطة
    if (subscription?.plan_code) {
      return DEFAULT_PLAN_LIMITS[subscription.plan_code as PlanCode] || DEFAULT_PLAN_LIMITS.trial;
    }

    // الحدود الافتراضية للفترة التجريبية
    return DEFAULT_PLAN_LIMITS.trial;
  },

  /**
   * التحقق من حد المنتجات محلياً
   * ⭐ Offline-First
   */
  async checkProductLimitOffline(
    organizationId: string,
    currentProductCount: number
  ): Promise<LimitCheckResult> {
    const limits = await this.getLocalLimits(organizationId);
    const maxProducts = limits.max_products;
    const unlimited = maxProducts === null;
    const allowed = unlimited || currentProductCount < (maxProducts || 0);

    return {
      allowed,
      current: currentProductCount,
      limit: maxProducts,
      remaining: unlimited ? undefined : Math.max(0, (maxProducts || 0) - currentProductCount),
      unlimited
    };
  },

  /**
   * التحقق من حد المستخدمين محلياً
   * ⭐ Offline-First
   */
  async checkUserLimitOffline(
    organizationId: string,
    currentUserCount: number
  ): Promise<LimitCheckResult> {
    const limits = await this.getLocalLimits(organizationId);
    const maxUsers = limits.max_users;
    const unlimited = maxUsers === null;
    const allowed = unlimited || currentUserCount < (maxUsers || 0);

    return {
      allowed,
      current: currentUserCount,
      limit: maxUsers,
      remaining: unlimited ? undefined : Math.max(0, (maxUsers || 0) - currentUserCount),
      unlimited
    };
  },

  /**
   * التحقق من حد نقاط البيع محلياً
   * ⭐ Offline-First
   */
  async checkPOSLimitOffline(
    organizationId: string,
    currentPOSCount: number
  ): Promise<LimitCheckResult> {
    const limits = await this.getLocalLimits(organizationId);
    const maxPOS = limits.max_pos;
    const unlimited = maxPOS === null;
    const allowed = unlimited || currentPOSCount < (maxPOS || 0);

    return {
      allowed,
      current: currentPOSCount,
      limit: maxPOS,
      remaining: unlimited ? undefined : Math.max(0, (maxPOS || 0) - currentPOSCount),
      unlimited
    };
  },

  /**
   * التحقق من أي حد محلياً (generic)
   * ⭐ Offline-First
   */
  async checkLimitOffline(
    organizationId: string,
    limitType: keyof SubscriptionPlanLimits,
    currentCount: number
  ): Promise<LimitCheckResult> {
    const limits = await this.getLocalLimits(organizationId);
    const maxLimit = limits[limitType];
    const unlimited = maxLimit === null;
    const allowed = unlimited || currentCount < (maxLimit || 0);

    return {
      allowed,
      current: currentCount,
      limit: maxLimit,
      remaining: unlimited ? undefined : Math.max(0, (maxLimit || 0) - currentCount),
      unlimited
    };
  },

  /**
   * الحصول على ملخص الاشتراك المحلي الكامل
   * ⭐ Offline-First: يعطي كل البيانات المتاحة محلياً
   */
  async getLocalSubscriptionSummary(organizationId: string): Promise<{
    isValid: boolean;
    planCode: PlanCode;
    planName: string;
    status: string;
    daysLeft: number;
    limits: SubscriptionPlanLimits;
    endDate: string | null;
    lastSync: string | null;
  }> {
    const subscription = await this.getLocalSubscription(organizationId);

    if (!subscription) {
      return {
        isValid: false,
        planCode: 'trial',
        planName: 'فترة تجريبية',
        status: 'not_found',
        daysLeft: 0,
        limits: DEFAULT_PLAN_LIMITS.trial,
        endDate: null,
        lastSync: null
      };
    }

    const now = new Date();
    const endDate = new Date(subscription.end_date);
    const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const isValid = daysLeft > 0 && ['active', 'trial'].includes(subscription.status);

    const planCode = (subscription.plan_code || 'trial') as PlanCode;
    const limits = subscription.limits || DEFAULT_PLAN_LIMITS[planCode] || DEFAULT_PLAN_LIMITS.trial;

    return {
      isValid,
      planCode,
      planName: subscription.plan_name || this.getPlanNameFromCode(planCode),
      status: subscription.status,
      daysLeft,
      limits,
      endDate: subscription.end_date,
      lastSync: subscription.last_check
    };
  },

  /**
   * الحصول على اسم الخطة من الكود
   */
  getPlanNameFromCode(planCode: PlanCode): string {
    const planNames: Record<PlanCode, string> = {
      trial: 'الفترة التجريبية',
      starter_v2: 'البداية',
      growth_v2: 'النمو',
      business_v2: 'الأعمال',
      enterprise_v2: 'المؤسسات',
      unlimited_v2: 'غير محدود'
    };
    return planNames[planCode] || planCode;
  },

  /**
   * رسالة الحد بالعربية
   */
  getLimitMessageAr(limitType: keyof SubscriptionPlanLimits, result: LimitCheckResult): string {
    const limitNames: Record<string, string> = {
      max_products: 'المنتجات',
      max_users: 'المستخدمين',
      max_pos: 'نقاط البيع',
      max_branches: 'الفروع',
      max_staff: 'الموظفين',
      max_customers: 'العملاء',
      max_suppliers: 'الموردين'
    };

    const name = limitNames[limitType] || limitType;

    if (result.unlimited) {
      return `عدد ${name} غير محدود`;
    }

    if (result.allowed) {
      return `يمكنك إضافة ${result.remaining} ${name} إضافية (${result.current}/${result.limit})`;
    }

    return `لقد وصلت للحد الأقصى من ${name} (${result.limit}). يرجى ترقية خطتك.`;
  }
};
