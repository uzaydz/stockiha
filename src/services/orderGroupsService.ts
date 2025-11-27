/**
 * orderGroupsService - خدمة مجموعات الطلبات
 *
 * ⚡ تم التحديث لاستخدام Delta Sync بالكامل
 */

import { v4 as uuidv4 } from 'uuid';
import { deltaWriteService } from '@/services/DeltaWriteService';

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
    // ⚡ استخدام Delta Sync
    const existing = await deltaWriteService.getAll<LocalOrderGroup>('order_groups' as any, orgId);
    if (existing.length === 0) {
      const id = uuidv4();
      const now = new Date().toISOString();
      // ⚡ إنشاء المجموعة الافتراضية
      await deltaWriteService.create('order_groups' as any, {
        id,
        organization_id: orgId,
        name: 'المجموعة الافتراضية (كل المنتجات)',
        enabled: true,
        strategy: 'claim_only',
        priority: 1,
        created_at: now,
        updated_at: now,
      } as LocalOrderGroup, orgId);
      // ⚡ إنشاء القاعدة الافتراضية
      await deltaWriteService.create('order_group_rules' as any, {
        id: uuidv4(),
        group_id: id,
        type: 'all',
        include: true,
        values: [],
      } as LocalOrderGroupRule, orgId);
    }
  },

  async list(orgId: string): Promise<LocalOrderGroup[]> {
    // ⚡ استخدام Delta Sync
    return await deltaWriteService.getAll<LocalOrderGroup>('order_groups' as any, orgId);
  },

  async get(groupId: string): Promise<LocalOrderGroup | undefined> {
    // ⚡ استخدام Delta Sync
    return await deltaWriteService.get<LocalOrderGroup>('order_groups' as any, groupId) || undefined;
  },

  async getRules(groupId: string): Promise<LocalOrderGroupRule[]> {
    // ⚡ استخدام Delta Sync - نحتاج orgId فارغ لجلب كل القواعد ثم التصفية
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || '';
    const allRules = await deltaWriteService.getAll<LocalOrderGroupRule>('order_group_rules' as any, orgId);
    return allRules.filter(r => r.group_id === groupId);
  },

  async save(group: Partial<LocalOrderGroup> & { organization_id: string; name: string; strategy?: OrderGroupStrategy; enabled?: boolean; priority?: number; id?: string }, rules: LocalOrderGroupRule[]) {
    const id = group.id || uuidv4();
    const now = new Date().toISOString();

    // ⚡ جلب المجموعة الحالية إن وجدت
    let existingCreatedAt = now;
    if (group.id) {
      const existing = await deltaWriteService.get<LocalOrderGroup>('order_groups' as any, group.id);
      if (existing) {
        existingCreatedAt = existing.created_at || now;
      }
    }

    const record: LocalOrderGroup = {
      id,
      organization_id: group.organization_id,
      name: group.name,
      enabled: group.enabled ?? true,
      strategy: group.strategy ?? 'claim_only',
      priority: group.priority ?? 1,
      created_at: existingCreatedAt,
      updated_at: now,
    };

    // ⚡ حفظ المجموعة
    if (group.id) {
      await deltaWriteService.update('order_groups' as any, id, record);
    } else {
      await deltaWriteService.create('order_groups' as any, record, group.organization_id);
    }

    // ⚡ حذف القواعد القديمة
    const existingRules = await this.getRules(id);
    for (const r of existingRules) {
      await deltaWriteService.delete('order_group_rules' as any, r.id);
    }

    // ⚡ إضافة القواعد الجديدة
    for (const r of rules) {
      await deltaWriteService.create('order_group_rules' as any, {
        ...r,
        id: r.id || uuidv4(),
        group_id: id,
      }, group.organization_id);
    }

    return record;
  },

  async remove(groupId: string) {
    // ⚡ حذف القواعد أولاً
    const rules = await this.getRules(groupId);
    for (const r of rules) {
      await deltaWriteService.delete('order_group_rules' as any, r.id);
    }
    // ⚡ حذف المجموعة
    await deltaWriteService.delete('order_groups' as any, groupId);
  },

  async listMembers(groupId: string): Promise<LocalOrderGroupMember[]> {
    // ⚡ استخدام Delta Sync
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || '';
    const allMembers = await deltaWriteService.getAll<LocalOrderGroupMember>('order_group_members' as any, orgId);
    return allMembers.filter(m => m.group_id === groupId);
  },

  async addMember(groupId: string, staffId: string, weight: number = 1, maxOpen: number = 20): Promise<LocalOrderGroupMember> {
    const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || '';
    const rec: LocalOrderGroupMember = {
      id: uuidv4(),
      group_id: groupId,
      staff_id: staffId,
      weight,
      max_open: maxOpen,
      active: true,
    };
    // ⚡ استخدام Delta Sync
    await deltaWriteService.create('order_group_members' as any, rec, orgId);
    return rec;
  },

  async updateMember(member: LocalOrderGroupMember) {
    // ⚡ استخدام Delta Sync
    await deltaWriteService.update('order_group_members' as any, member.id, member);
    return member;
  },

  async removeMember(memberId: string) {
    // ⚡ استخدام Delta Sync
    await deltaWriteService.delete('order_group_members' as any, memberId);
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
    // ⚡ استخدام Delta Sync
    await deltaWriteService.create('order_assignments' as any, rec, orgId);
    return rec;
  },

  async getAssignment(orgId: string, orderId: string): Promise<LocalOrderAssignment | undefined> {
    // ⚡ استخدام Delta Sync
    const all = await deltaWriteService.getAll<LocalOrderAssignment>('order_assignments' as any, orgId);
    return all.find(a => a.order_id === orderId);
  },

  async listAssignmentsForOrders(orgId: string, orderIds: string[]): Promise<Record<string, LocalOrderAssignment>> {
    if (!orderIds.length) return {};
    // ⚡ استخدام Delta Sync
    const all = await deltaWriteService.getAll<LocalOrderAssignment>('order_assignments' as any, orgId);
    const results: Record<string, LocalOrderAssignment> = {};
    for (const a of all) {
      if (orderIds.includes(a.order_id)) results[a.order_id] = a;
    }
    return results;
  },
};
