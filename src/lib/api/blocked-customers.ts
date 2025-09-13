import { supabase } from '@/lib/supabase-unified';

export type BlockedCustomer = {
  id: string;
  organization_id: string;
  name: string | null;
  phone_raw: string | null;
  phone_normalized: string;
  reason: string | null;
  source: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export async function listBlockedCustomers(orgId: string, opts?: { search?: string; limit?: number; offset?: number; }) {
  const { search = '', limit = 50, offset = 0 } = opts || {};
  const { data, error } = await supabase.rpc('list_blocked_customers', {
    p_org_id: orgId,
    p_search: search,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw error;
  return (data || []) as BlockedCustomer[];
}

export async function isPhoneBlocked(orgId: string, phone: string) {
  const { data, error } = await supabase.rpc('is_phone_blocked', { p_org_id: orgId, p_phone: phone });
  if (error) throw error;
  const res = (data && Array.isArray(data) ? data[0] : data) as { is_blocked: boolean; reason: string | null; blocked_id: string | null; name: string | null } | null;
  return {
    isBlocked: !!res?.is_blocked,
    reason: res?.reason || null,
    blockedId: res?.blocked_id || null,
    name: res?.name || null,
  };
}

export async function blockCustomer(orgId: string, phone: string, name?: string | null, reason?: string | null) {
  const { data, error } = await supabase.rpc('block_customer', {
    p_org_id: orgId,
    p_phone: phone,
    p_name: name || null,
    p_reason: reason || null,
  });
  if (error) throw error;
  return data as string; // id
}

export async function unblockCustomerById(orgId: string, id: string) {
  const { data, error } = await supabase.rpc('unblock_customer_by_id', { p_org_id: orgId, p_id: id });
  if (error) throw error;
  return !!data;
}

export async function unblockCustomer(orgId: string, phone: string) {
  const { data, error } = await supabase.rpc('unblock_customer', { p_org_id: orgId, p_phone: phone });
  if (error) throw error;
  return !!data;
}

