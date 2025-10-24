import { inventoryDB, type LocalOrganizationSubscription, type LocalSubscriptionPlan } from '@/database/localDb';

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

    await inventoryDB.organizationSubscriptions.put(normalized);
  },

  async saveOrganizationSubscriptions(subscriptions: LocalOrganizationSubscription[]): Promise<void> {
    if (!subscriptions?.length) return;
    const bulk = subscriptions.map((sub) => ({
      ...sub,
      status: NORMALIZE_STATUS(sub.status),
    }));
    await inventoryDB.organizationSubscriptions.bulkPut(bulk);
  },

  async clearOrganizationSubscriptions(organizationId: string): Promise<void> {
    if (!organizationId) return;
    await inventoryDB.organizationSubscriptions.where('organization_id').equals(organizationId).delete();
  },

  async getLatestSubscription(organizationId: string): Promise<LocalOrganizationSubscription | null> {
    if (!organizationId) return null;
    const results = await inventoryDB.organizationSubscriptions
      .where('organization_id')
      .equals(organizationId)
      .toArray();

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
    await inventoryDB.subscriptionPlans.put(plan);
  },

  async saveSubscriptionPlans(plans: LocalSubscriptionPlan[]): Promise<void> {
    if (!plans?.length) return;
    await inventoryDB.subscriptionPlans.bulkPut(plans);
  },

  async getSubscriptionPlan(planId: string): Promise<LocalSubscriptionPlan | null> {
    if (!planId) return null;
    return inventoryDB.subscriptionPlans.get(planId);
  },
};
