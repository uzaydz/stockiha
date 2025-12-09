/**
 * localSubscriptionService - خدمة الاشتراكات المحلية
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 * 🔒 محدث: الاشتراكات تُدار من السيرفر فقط - لا كتابة محلية
 */

import type { LocalOrganizationSubscription, LocalSubscriptionPlan } from '@/database/localDb';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

const NORMALIZE_STATUS = (status?: string | null): string => {
  if (!status) return 'unknown';
  return status.toLowerCase();
};

export const localSubscriptionService = {
  /**
   * ⚠️ الاشتراكات تُدار من السيرفر فقط عبر PowerSync Sync Rules
   * ❌ لا نكتب محلياً لتجنب العمليات المعلقة في Outbox
   */
  async saveOrganizationSubscription(subscription: LocalOrganizationSubscription): Promise<void> {
    // ⚡ الاشتراكات تُزامن تلقائياً من Supabase عبر PowerSync
    console.log('[LocalSubscriptionService] ℹ️ Subscription managed by server, synced via PowerSync:', {
      id: subscription?.id,
      status: subscription?.status
    });
  },

  /**
   * ⚠️ الاشتراكات تُدار من السيرفر فقط
   */
  async saveOrganizationSubscriptions(subscriptions: LocalOrganizationSubscription[]): Promise<void> {
    console.log('[LocalSubscriptionService] ℹ️ Subscriptions managed by server, synced via PowerSync. Count:', subscriptions?.length || 0);
  },

  /**
   * ⚠️ حذف الاشتراكات غير مسموح محلياً
   */
  async clearOrganizationSubscriptions(organizationId: string): Promise<void> {
    console.log('[LocalSubscriptionService] ℹ️ Cannot clear subscriptions locally - managed by server. OrgId:', organizationId);
  },

  /**
   * ✅ جلب أحدث اشتراك - إصلاح: أولوية للاشتراك النشط
   */
  async getLatestSubscription(organizationId: string): Promise<LocalOrganizationSubscription | null> {
    if (!organizationId) return null;

    // ⚡ استخدام PowerSync مع ترتيب صحيح (active > trial > غيرها)
    if (!powerSyncService.db) {
      console.warn('[localSubscriptionService] PowerSync DB not initialized');
      return null;
    }
    const results = await powerSyncService.query<LocalOrganizationSubscription>({
      sql: `SELECT * FROM organization_subscriptions
       WHERE organization_id = ?
       ORDER BY
         CASE status
           WHEN 'active' THEN 1
           WHEN 'trial' THEN 2
           ELSE 3
         END,
         end_date DESC
       LIMIT 1`,
      params: [organizationId]
    });

    return results && results.length > 0 ? results[0] : null;
  },

  /**
   * ⚠️ خطط الاشتراك تُدار من السيرفر فقط
   */
  async saveSubscriptionPlan(plan: LocalSubscriptionPlan): Promise<void> {
    console.log('[LocalSubscriptionService] ℹ️ Subscription plan managed by server, synced via PowerSync:', plan?.id);
  },

  /**
   * ⚠️ خطط الاشتراك تُدار من السيرفر فقط
   */
  async saveSubscriptionPlans(plans: LocalSubscriptionPlan[]): Promise<void> {
    console.log('[LocalSubscriptionService] ℹ️ Subscription plans managed by server, synced via PowerSync. Count:', plans?.length || 0);
  },

  /**
   * ✅ جلب خطة الاشتراك
   */
  async getSubscriptionPlan(planId: string): Promise<LocalSubscriptionPlan | null> {
    if (!planId) return null;
    // ⚡ استخدام PowerSync
    return powerSyncService.queryOne<LocalSubscriptionPlan>({
      sql: 'SELECT * FROM subscription_plans WHERE id = ?',
      params: [planId]
    });
  },
};
