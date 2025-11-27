/**
 * localSubscriptionService - خدمة الاشتراكات المحلية
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 */

import type { LocalOrganizationSubscription, LocalSubscriptionPlan } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';

const NORMALIZE_STATUS = (status?: string | null): string => {
  if (!status) return 'unknown';
  return status.toLowerCase();
};

export const localSubscriptionService = {
  async saveOrganizationSubscription(subscription: LocalOrganizationSubscription): Promise<void> {
    if (!subscription?.id) return;

    const normalized: LocalOrganizationSubscription = {
      ...subscription,
      status: NORMALIZE_STATUS(subscription.status),
    };

    // ⚡ استخدام Delta Sync
    await deltaWriteService.saveFromServer('organization_subscriptions' as any, normalized);
  },

  async saveOrganizationSubscriptions(subscriptions: LocalOrganizationSubscription[]): Promise<void> {
    if (!subscriptions?.length) return;

    // ⚡ استخدام Delta Sync
    for (const sub of subscriptions) {
      const normalized = {
        ...sub,
        status: NORMALIZE_STATUS(sub.status),
      };
      await deltaWriteService.saveFromServer('organization_subscriptions' as any, normalized);
    }
  },

  async clearOrganizationSubscriptions(organizationId: string): Promise<void> {
    if (!organizationId) return;

    // ⚡ استخدام Delta Sync - جلب الكل ثم حذفها
    const subs = await deltaWriteService.getAll<LocalOrganizationSubscription>(
      'organization_subscriptions' as any,
      organizationId
    );
    for (const sub of subs) {
      await deltaWriteService.delete('organization_subscriptions' as any, sub.id);
    }
  },

  async getLatestSubscription(organizationId: string): Promise<LocalOrganizationSubscription | null> {
    if (!organizationId) return null;

    // ⚡ استخدام Delta Sync
    const results = await deltaWriteService.getAll<LocalOrganizationSubscription>(
      'organization_subscriptions' as any,
      organizationId
    );

    if (!results || results.length === 0) {
      return null;
    }

    const sorted = results.sort((a, b) => {
      const dateA = new Date(a.updated_at || a.end_date || a.created_at || 0).getTime();
      const dateB = new Date(b.updated_at || b.end_date || b.created_at || 0).getTime();
      return dateB - dateA;
    });

    return sorted[0];
  },

  async saveSubscriptionPlan(plan: LocalSubscriptionPlan): Promise<void> {
    if (!plan?.id) return;
    // ⚡ استخدام Delta Sync
    await deltaWriteService.saveFromServer('subscription_plans' as any, plan);
  },

  async saveSubscriptionPlans(plans: LocalSubscriptionPlan[]): Promise<void> {
    if (!plans?.length) return;
    // ⚡ استخدام Delta Sync
    for (const plan of plans) {
      await deltaWriteService.saveFromServer('subscription_plans' as any, plan);
    }
  },

  async getSubscriptionPlan(planId: string): Promise<LocalSubscriptionPlan | null> {
    if (!planId) return null;
    // ⚡ استخدام Delta Sync
    return deltaWriteService.get<LocalSubscriptionPlan>('subscription_plans' as any, planId);
  },
};
