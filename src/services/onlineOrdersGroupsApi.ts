import { supabase } from '@/lib/supabase-unified';

export type OnlineOrdersRPCResponse = {
  success: boolean;
  error?: string;
  orders?: any[];
  counts?: Record<string, number>;
  stats?: Record<string, number>;
  sharedData?: Record<string, any>;
  metadata?: { pagination?: any } & Record<string, any>;
};

export type OrdersFilters = {
  page?: number;
  page_size?: number;
  status?: string | null;
  search?: string | null;
  date_from?: string | null; // ISO
  date_to?: string | null;   // ISO
  provider?: string | null;
  include_items?: boolean;
  include_counts?: boolean;
  mine_only?: boolean;
  unassigned_only?: boolean;
};

export const onlineOrdersGroupsApi = {
  async isBackendReady(orgId: string, staffId: string, groupId?: string | null): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('get_online_orders_for_staff' as any, {
        p_org_id: orgId,
        p_staff_id: staffId,
        p_group_id: groupId || null,
        p_filters: { page: 1, page_size: 1, include_items: false, include_counts: false },
      } as any);
      if (error) return false;
      return Boolean((data as any)?.success);
    } catch {
      return false;
    }
  },

  async getOnlineOrdersForStaff(orgId: string, staffId: string, groupId: string | null, filters: OrdersFilters = {}): Promise<OnlineOrdersRPCResponse> {
    const payload: any = {
      p_org_id: orgId,
      p_staff_id: staffId,
      p_group_id: groupId,
      p_filters: {
        page: filters.page ?? 1,
        page_size: filters.page_size ?? 20,
        status: filters.status ?? null,
        search: filters.search ?? null,
        date_from: filters.date_from ?? null,
        date_to: filters.date_to ?? null,
        provider: filters.provider ?? null,
        include_items: filters.include_items ?? true,
        include_counts: filters.include_counts ?? true,
        mine_only: filters.mine_only ?? false,
        unassigned_only: filters.unassigned_only ?? false,
      },
    };
    const { data, error } = await supabase.rpc('get_online_orders_for_staff' as any, payload);
    if (error) return { success: false, error: error.message };
    return (data as OnlineOrdersRPCResponse) || { success: false, error: 'invalid_response' };
  },

  async claimOnlineOrder(orderId: string, staffId: string, groupId: string): Promise<{ success: boolean; error?: string }>{
    const { data, error } = await supabase.rpc('claim_online_order' as any, {
      p_order_id: orderId,
      p_staff_id: staffId,
      p_group_id: groupId,
    } as any);
    if (error) return { success: false, error: error.message };
    return (data as any) || { success: false, error: 'invalid_response' };
  },

  async reassignOnlineOrder(orderId: string, fromStaffId: string | null, toStaffId: string, groupId: string, actorStaffId: string): Promise<{ success: boolean; error?: string }>{
    const { data, error } = await supabase.rpc('reassign_online_order' as any, {
      p_order_id: orderId,
      p_from_staff: fromStaffId,
      p_to_staff: toStaffId,
      p_group_id: groupId,
      p_actor_staff: actorStaffId,
    } as any);
    if (error) return { success: false, error: error.message };
    return (data as any) || { success: false, error: 'invalid_response' };
  },

  async autoAssignOnlineOrder(orderId: string, groupId: string): Promise<{ success: boolean; error?: string; staff_id?: string }>{
    const { data, error } = await supabase.rpc('auto_assign_online_order' as any, {
      p_order_id: orderId,
      p_group_id: groupId,
    } as any);
    if (error) return { success: false, error: error.message };
    return (data as any) || { success: false, error: 'invalid_response' };
  },
};

export default onlineOrdersGroupsApi;

