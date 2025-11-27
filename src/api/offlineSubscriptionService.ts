/**
 * offlineSubscriptionService - خدمة الاشتراكات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 * 🔒 محدث: دعم التشفير والتدقيق
 *
 * - Offline-First: يعمل بدون إنترنت
 * - Local-First: التحقق محلياً أولاً
 * - المزامنة التلقائية عند الاتصال
 * - تشفير البيانات المحلية
 * - تسجيل سجلات التدقيق
 */

import type { LocalSubscription } from '@/database/localDb';
import { supabase } from '@/lib/supabase';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { subscriptionAudit } from '@/lib/security/subscriptionAudit';
import { getSecureNow } from '@/lib/license/licenseService';

// إضافة نوع الاشتراك لـ Delta Sync
declare module '@/services/DeltaWriteService' {
  interface EntityTypeExtension {
    subscriptions: true;
  }
}

export const offlineSubscriptionService = {
  /**
   * جلب معلومات الاشتراك من السيرفر وحفظها محلياً
   */
  async syncSubscription(organizationId: string): Promise<boolean> {
    try {
      if (!organizationId) return false;

      // جلب الاشتراك النشط من السيرفر
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
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
        // نحاول جلب آخر اشتراك مهما كانت حالته
        const { data: lastSub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', organizationId)
          .order('end_date', { ascending: false })
          .limit(1)
          .single();

        if (lastSub) {
          await this.saveLocalSubscription({
            id: lastSub.id,
            organization_id: lastSub.organization_id,
            plan_id: lastSub.plan_id,
            status: 'expired', // نعتبره منتهي الصلاحية إذا لم يكن active/trial
            start_date: lastSub.start_date,
            end_date: lastSub.end_date,
            trial_end_date: lastSub.trial_end_date,
            features: [], // TODO: fetch plan features
            last_check: new Date().toISOString(),
            synced: true
          });
        }
        return true;
      }

      // حفظ الاشتراك محلياً
      await this.saveLocalSubscription({
        id: subscription.id,
        organization_id: subscription.organization_id,
        plan_id: subscription.plan_id,
        status: subscription.status,
        start_date: subscription.start_date,
        end_date: subscription.end_date,
        trial_end_date: subscription.trial_end_date,
        features: [], // TODO: fetch plan features
        last_check: new Date().toISOString(),
        synced: true
      });

      console.log('[OfflineSubscription] ⚡ Synced subscription via Delta Sync');
      return true;
    } catch (error) {
      console.error('[OfflineSubscription] Error syncing subscription:', error);
      return false;
    }
  },

  /**
   * حفظ الاشتراك في قاعدة البيانات المحلية
   * ⚡ يستخدم Delta Sync
   */
  async saveLocalSubscription(subscription: LocalSubscription): Promise<void> {
    try {
      // ⚡ استخدام Delta Sync بدلاً من sqliteDB.upsert
      await deltaWriteService.saveFromServer('subscriptions' as any, subscription);
      console.log('[OfflineSubscription] ⚡ Saved subscription locally via Delta Sync');
    } catch (error) {
      console.error('[OfflineSubscription] Failed to save local subscription:', error);
    }
  },

  /**
   * الحصول على الاشتراك المحلي
   * ⚡ يستخدم Delta Sync
   */
  async getLocalSubscription(organizationId: string): Promise<LocalSubscription | null> {
    try {
      const subscriptions = await deltaWriteService.getAll<LocalSubscription>(
        'subscriptions' as any,
        organizationId,
        {
          orderBy: 'end_date DESC',
          limit: 1
        }
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
  }
};
