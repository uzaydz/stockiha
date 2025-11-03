import { inventoryDB } from '@/database/localDb';
import { v4 as uuidv4 } from 'uuid';

export type OrderGroupStrategy = 'round_robin' | 'least_busy' | 'weighted' | 'claim_only' | 'manual';

export interface LocalOrderGroup {
  id: string;
  organization_id: string;
  name: string;
  enabled: boolean;
  strategy: OrderGroupStrategy;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface LocalOrderGroupRule {
  id: string;
  group_id: string;
  type: 'all' | 'product_ids';
  include: boolean;
  values: string[]; // product ids when type=product_ids
}

export interface LocalOrderGroupMember {
  id: string;
  group_id: string;
  staff_id: string;
  weight?: number;
  max_open?: number;
  active: boolean;
}

export interface LocalOrderAssignment {
  id: string;
  organization_id: string;
  order_id: string;
  group_id: string;
  staff_id: string;
  status: 'assigned' | 'accepted' | 'closed';
  assigned_at: string;
}

export const orderGroupsService = {
  async ensureDefaultGroup(orgId: string) {
    const existing = await inventoryDB.orderGroups.where('organization_id').equals(orgId).toArray();
    if (existing.length === 0) {
      const id = uuidv4();
      const now = new Date().toISOString();
      await inventoryDB.orderGroups.put({
        id,
        organization_id: orgId,
        name: 'المجموعة الافتراضية (كل المنتجات)',
        enabled: true,
        strategy: 'claim_only',
        priority: 1,
        created_at: now,
        updated_at: now,
      } as LocalOrderGroup);
      await inventoryDB.orderGroupRules.put({
        id: uuidv4(),
        group_id: id,
        type: 'all',
        include: true,
        values: [],
      } as LocalOrderGroupRule);
    }
  },

  async list(orgId: string): Promise<LocalOrderGroup[]> {
    return await inventoryDB.orderGroups.where('organization_id').equals(orgId).toArray();
  },

  async get(groupId: string): Promise<LocalOrderGroup | undefined> {
    return await inventoryDB.orderGroups.get(groupId);
  },

  async getRules(groupId: string): Promise<LocalOrderGroupRule[]> {
    return await inventoryDB.orderGroupRules.where('group_id').equals(groupId).toArray();
  },

  async save(group: Partial<LocalOrderGroup> & { organization_id: string; name: string; strategy?: OrderGroupStrategy; enabled?: boolean; priority?: number; id?: string }, rules: LocalOrderGroupRule[]) {
    const id = group.id || uuidv4();
    const now = new Date().toISOString();
    const record: LocalOrderGroup = {
      id,
      organization_id: group.organization_id,
      name: group.name,
      enabled: group.enabled ?? true,
      strategy: group.strategy ?? 'claim_only',
      priority: group.priority ?? 1,
      created_at: group.id ? (await inventoryDB.orderGroups.get(group.id))?.created_at || now : now,
      updated_at: now,
    };
    await inventoryDB.orderGroups.put(record);
    // Replace rules
    const existing = await inventoryDB.orderGroupRules.where('group_id').equals(id).toArray();
    await inventoryDB.orderGroupRules.bulkDelete(existing.map(r => r.id));
    await inventoryDB.orderGroupRules.bulkPut(rules.map(r => ({ ...r, id: r.id || uuidv4(), group_id: id })));
    return record;
  },

  async remove(groupId: string) {
    await inventoryDB.orderGroupRules.where('group_id').equals(groupId).delete();
    await inventoryDB.orderGroups.delete(groupId);
  },

  async listMembers(groupId: string): Promise<LocalOrderGroupMember[]> {
    return await inventoryDB.orderGroupMembers.where('group_id').equals(groupId).toArray();
  },
  async addMember(groupId: string, staffId: string, weight: number = 1, maxOpen: number = 20): Promise<LocalOrderGroupMember> {
    const rec: LocalOrderGroupMember = { id: uuidv4(), group_id: groupId, staff_id: staffId, weight, max_open: maxOpen, active: true };
    await inventoryDB.orderGroupMembers.put(rec);
    return rec;
  },
  async updateMember(member: LocalOrderGroupMember) {
    await inventoryDB.orderGroupMembers.put(member);
    return member;
  },
  async removeMember(memberId: string) {
    await inventoryDB.orderGroupMembers.delete(memberId);
  },

  isOrderEligible(order: any, rules: LocalOrderGroupRule[]): boolean {
    // If 'all include' exists and true -> allow
    const allRule = rules.find(r => r.type === 'all' && r.include);
    if (allRule) return true;
    const productIds = new Set<string>();
    const items: any[] = Array.isArray(order.order_items) ? order.order_items : [];
    for (const it of items) {
      if (it?.product_id) productIds.add(it.product_id);
    }
    const prodRule = rules.find(r => r.type === 'product_ids' && r.include);
    if (prodRule && prodRule.values?.length) {
      return prodRule.values.some(v => productIds.has(v));
    }
    // Default deny if rules exist; if no rules at all, deny
    return false;
  },

  async assignToMe(orgId: string, orderId: string, groupId: string, staffId: string) {
    const id = uuidv4();
    const rec: LocalOrderAssignment = {
      id,
      organization_id: orgId,
      order_id: orderId,
      group_id: groupId,
      staff_id: staffId,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    };
    await inventoryDB.orderAssignments.put(rec);
    return rec;
  },

  async getAssignment(orgId: string, orderId: string): Promise<LocalOrderAssignment | undefined> {
    return await inventoryDB.orderAssignments.where('[organization_id+order_id]').equals([orgId, orderId]).first();
  },
  async listAssignmentsForOrders(orgId: string, orderIds: string[]): Promise<Record<string, LocalOrderAssignment>> {
    if (!orderIds.length) return {};
    // Fetch in batches using compound index
    const results: Record<string, LocalOrderAssignment> = {};
    // Dexie doesn't support anyOf on compound in older patterns; fallback to filter
    const all = await inventoryDB.orderAssignments.where('organization_id').equals(orgId).toArray();
    for (const a of all) {
      if (orderIds.includes(a.order_id)) results[a.order_id] = a;
    }
    return results;
  },
};
