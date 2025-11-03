import { supabase } from '@/lib/supabase-unified';

export type OrderGroupStrategy = 'round_robin' | 'least_busy' | 'weighted' | 'claim_only' | 'manual';

export interface OrderGroup {
  id: string;
  organization_id: string;
  name: string;
  enabled: boolean;
  strategy: OrderGroupStrategy;
  priority: number;
  last_assigned_member?: string | null;
  created_at: string;
  updated_at: string;
}

export type RuleType = 'all' | 'product_ids' | 'category_ids' | 'subcategory_ids';

export interface OrderGroupRule {
  id: string;
  organization_id: string;
  group_id: string;
  type: RuleType;
  include: boolean;
  values: string[]; // as array of UUID strings
  created_at: string;
}

export interface OrderGroupMember {
  id: string;
  organization_id: string;
  group_id: string;
  staff_id: string;
  weight: number;
  max_open: number;
  active: boolean;
  created_at: string;
}

export const orderGroupsApi = {
  async ensureDefault(orgId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('ensure_default_online_orders_group' as any, { p_org_id: orgId } as any);
    if (error) return null;
    return (data as string) || null;
  },

  async list(orgId: string): Promise<OrderGroup[]> {
    const { data, error } = await supabase
      .from('order_groups')
      .select('*')
      .eq('organization_id', orgId)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []) as OrderGroup[];
  },

  async get(groupId: string): Promise<OrderGroup | null> {
    const { data, error } = await supabase.from('order_groups').select('*').eq('id', groupId).single();
    if (error) return null;
    return (data as OrderGroup) || null;
  },

  async getRules(groupId: string): Promise<OrderGroupRule[]> {
    const { data, error } = await supabase.from('order_group_rules').select('*').eq('group_id', groupId);
    if (error) throw error;
    return (data || []) as OrderGroupRule[];
  },

  async saveGroupWithRules(group: Partial<OrderGroup> & { organization_id: string; name: string }, rules: Array<Omit<OrderGroupRule, 'id' | 'organization_id' | 'created_at'>>) {
    // Upsert group
    const upsertPayload: any = {
      organization_id: group.organization_id,
      name: group.name,
      enabled: group.enabled ?? true,
      strategy: group.strategy ?? 'claim_only',
      priority: group.priority ?? 1,
      updated_at: new Date().toISOString(),
    };
    if (group.id) upsertPayload.id = group.id;
    const { data: upserted, error: upsertErr } = await supabase.from('order_groups')
      .upsert(upsertPayload, { onConflict: 'id' })
      .select('*')
      .limit(1);
    if (upsertErr) throw upsertErr;
    const saved = (upserted && upserted[0]) as OrderGroup;

    // Replace rules
    await supabase.from('order_group_rules').delete().eq('group_id', saved.id);
    if (rules && rules.length) {
      const rows = rules.map(r => ({
        organization_id: saved.organization_id,
        group_id: saved.id,
        type: r.type,
        include: r.include,
        values: (r.values || []) as any,
      }));
      const { error: rulesErr } = await supabase.from('order_group_rules').insert(rows);
      if (rulesErr) throw rulesErr;
    }
    return saved;
  },

  async removeGroup(groupId: string): Promise<void> {
    await supabase.from('order_group_rules').delete().eq('group_id', groupId);
    await supabase.from('order_groups').delete().eq('id', groupId);
  },

  async listMembers(groupId: string): Promise<OrderGroupMember[]> {
    const { data, error } = await supabase.from('order_group_members').select('*').eq('group_id', groupId).order('created_at');
    if (error) throw error;
    return (data || []) as OrderGroupMember[];
  },

  async addMember(orgId: string, groupId: string, staffId: string, weight = 1, maxOpen = 20): Promise<OrderGroupMember> {
    const { data, error } = await supabase
      .from('order_group_members')
      .insert({ organization_id: orgId, group_id: groupId, staff_id: staffId, weight, max_open: maxOpen, active: true })
      .select('*')
      .limit(1);
    if (error) throw error;
    
    // تحديث صلاحيات الموظف لتشمل معرف المجموعة
    try {
      const { data: userData, error: userFetchError } = await supabase
        .from('users')
        .select('permissions')
        .eq('id', staffId)
        .single();
      
      if (!userFetchError && userData) {
        const currentPermissions = (userData.permissions || {}) as Record<string, any>;
        const updatedPermissions = {
          ...currentPermissions,
          onlineOrdersGroupId: groupId,
        };
        
        await supabase
          .from('users')
          .update({ permissions: updatedPermissions })
          .eq('id', staffId);
      }
    } catch (permError) {
      console.warn('[addMember] فشل تحديث صلاحيات الموظف:', permError);
      // لا نرمي خطأ هنا لأن العضوية تمت بنجاح
    }
    
    return (data && data[0]) as OrderGroupMember;
  },

  async updateMember(member: Partial<OrderGroupMember> & { id: string }): Promise<OrderGroupMember> {
    const { data, error } = await supabase
      .from('order_group_members')
      .update({ weight: member.weight, max_open: member.max_open, active: member.active })
      .eq('id', member.id)
      .select('*')
      .limit(1);
    if (error) throw error;
    return (data && data[0]) as OrderGroupMember;
  },

  async removeMember(memberId: string): Promise<void> {
    // الحصول على معلومات العضو قبل الحذف
    const { data: memberData } = await supabase
      .from('order_group_members')
      .select('staff_id, group_id')
      .eq('id', memberId)
      .single();
    
    // حذف العضوية
    await supabase.from('order_group_members').delete().eq('id', memberId);
    
    // إزالة معرف المجموعة من صلاحيات الموظف
    if (memberData?.staff_id) {
      try {
        const { data: userData, error: userFetchError } = await supabase
          .from('users')
          .select('permissions')
          .eq('id', memberData.staff_id)
          .single();
        
        if (!userFetchError && userData) {
          const currentPermissions = (userData.permissions || {}) as Record<string, any>;
          
          // فقط إزالة إذا كان معرف المجموعة يطابق المجموعة المحذوفة
          if (currentPermissions.onlineOrdersGroupId === memberData.group_id) {
            const updatedPermissions = { ...currentPermissions };
            delete updatedPermissions.onlineOrdersGroupId;
            
            await supabase
              .from('users')
              .update({ permissions: updatedPermissions })
              .eq('id', memberData.staff_id);
          }
        }
      } catch (permError) {
        console.warn('[removeMember] فشل تحديث صلاحيات الموظف:', permError);
      }
    }
  },

  async listOrgStaff(orgId: string): Promise<Array<{ id: string; name: string; email?: string }>> {
    // Use users table to align with FK (order_group_members.staff_id -> users.id)
    const { data, error } = await supabase
      .from('users')
      .select('id,name,email,role,is_active')
      .eq('organization_id', orgId)
      .eq('is_active', true);
    if (error) throw error;
    const rows = (data || []) as Array<{ id: string; name?: string; email?: string; role?: string; is_active?: boolean }>;
    return rows
      .filter(u => (u as any).role ? (u as any).role !== 'customer' : true)
      .map(u => ({ id: u.id, name: u.name || u.email || u.id, email: u.email }));
  },

  async getOpenAssignmentCounts(orgId: string, groupId: string): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from('online_order_assignments')
      .select('staff_id, status')
      .eq('organization_id', orgId)
      .eq('group_id', groupId)
      .in('status', ['assigned','accepted']);
    if (error) throw error;
    const counts: Record<string, number> = {};
    for (const row of (data || []) as any[]) {
      counts[row.staff_id] = (counts[row.staff_id] || 0) + 1;
    }
    return counts;
  },

  /**
   * مزامنة صلاحيات جميع أعضاء المجموعة
   * مفيدة لإصلاح البيانات الحالية أو بعد الترحيل
   */
  async syncMembersPermissions(groupId: string): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      // الحصول على جميع أعضاء المجموعة النشطين
      const { data: members, error: membersError } = await supabase
        .from('order_group_members')
        .select('staff_id')
        .eq('group_id', groupId)
        .eq('active', true);

      if (membersError) throw membersError;

      // تحديث صلاحيات كل موظف
      for (const member of (members || [])) {
        try {
          const { data: userData, error: userFetchError } = await supabase
            .from('users')
            .select('permissions')
            .eq('id', member.staff_id)
            .single();

          if (!userFetchError && userData) {
            const currentPermissions = (userData.permissions || {}) as Record<string, any>;
            const updatedPermissions = {
              ...currentPermissions,
              onlineOrdersGroupId: groupId,
            };

            const { error: updateError } = await supabase
              .from('users')
              .update({ permissions: updatedPermissions })
              .eq('id', member.staff_id);

            if (updateError) {
              failed++;
              console.error(`[syncMembersPermissions] فشل تحديث صلاحيات ${member.staff_id}:`, updateError);
            } else {
              success++;
            }
          } else {
            failed++;
          }
        } catch (err) {
          failed++;
          console.error(`[syncMembersPermissions] خطأ في معالجة ${member.staff_id}:`, err);
        }
      }
    } catch (err) {
      console.error('[syncMembersPermissions] خطأ عام:', err);
    }

    return { success, failed };
  },
};

export default orderGroupsApi;
