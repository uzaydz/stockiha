import { supabase } from '@/lib/supabase-unified';
import { cachedRequests, createCacheKey, requestCache } from '@/lib/requestCache';

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
  
  // إنشاء cache key فريد
  const cacheKey = createCacheKey('list_blocked_customers', { orgId, search, limit, offset });
  
  // استخدام cache مع TTL متوسط (5 دقائق) لأن قائمة المحظورين لا تتغير كثيراً
  return cachedRequests.get(cacheKey, async () => {
    const { data, error } = await supabase.rpc('list_blocked_customers', {
      p_org_id: orgId,
      p_search: search,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw error;
    return (data || []) as BlockedCustomer[];
  });
}

export async function isPhoneBlocked(orgId: string, phone: string) {
  // إنشاء cache key فريد
  const cacheKey = createCacheKey('is_phone_blocked', { orgId, phone });
  
  // استخدام cache مع TTL قصير (30 ثانية) لأن حالة الحظر قد تتغير
  return cachedRequests.getFast(cacheKey, async () => {
    const { data, error } = await supabase.rpc('is_phone_blocked', { p_org_id: orgId, p_phone: phone });
    if (error) throw error;
    const res = (data && Array.isArray(data) ? data[0] : data) as { is_blocked: boolean; reason: string | null; blocked_id: string | null; name: string | null } | null;
    return {
      isBlocked: !!res?.is_blocked,
      reason: res?.reason || null,
      blockedId: res?.blocked_id || null,
      name: res?.name || null,
    };
  });
}

/**
 * دالة محسنة للتحقق من عدة أرقام هاتف في طلب واحد
 * تقلل عدد الطلبات من N إلى 1
 */
export async function checkMultiplePhonesBlocked(orgId: string, phones: string[]): Promise<Map<string, {
  isBlocked: boolean;
  reason: string | null;
  blockedId: string | null;
  name: string | null;
}>> {
  if (phones.length === 0) return new Map();
  
  // إنشاء cache key فريد للمجموعة
  const cacheKey = createCacheKey('check_multiple_phones_blocked', { orgId, phones: phones.sort() });
  
  return cachedRequests.getFast(cacheKey, async () => {
    const { data, error } = await supabase.rpc('check_multiple_phones_blocked', { 
      p_org_id: orgId, 
      p_phones: phones 
    });
    if (error) throw error;
    
    // تحويل النتائج إلى Map للوصول السريع
    const result = new Map<string, {
      isBlocked: boolean;
      reason: string | null;
      blockedId: string | null;
      name: string | null;
    }>();
    
    if (data && Array.isArray(data)) {
      data.forEach((item: any) => {
        result.set(item.phone, {
          isBlocked: !!item.is_blocked,
          reason: item.reason || null,
          blockedId: item.blocked_id || null,
          name: item.name || null,
        });
      });
    }
    
    return result;
  });
}

export async function blockCustomer(orgId: string, phone: string, name?: string | null, reason?: string | null) {
  const { data, error } = await supabase.rpc('block_customer', {
    p_org_id: orgId,
    p_phone: phone,
    p_name: name || null,
    p_reason: reason || null,
  });
  if (error) throw error;
  
  // مسح cache المتعلق بهذا الهاتف والمؤسسة
  const phoneCacheKey = createCacheKey('is_phone_blocked', { orgId, phone });
  const listCacheKey = createCacheKey('list_blocked_customers', { orgId });
  requestCache.clear(phoneCacheKey);
  requestCache.clear(listCacheKey);
  
  return data as string; // id
}

export async function unblockCustomerById(orgId: string, id: string) {
  const { data, error } = await supabase.rpc('unblock_customer_by_id', { p_org_id: orgId, p_id: id });
  if (error) throw error;
  
  // مسح cache قائمة المحظورين
  const listCacheKey = createCacheKey('list_blocked_customers', { orgId });
  requestCache.clear(listCacheKey);
  
  return !!data;
}

export async function unblockCustomer(orgId: string, phone: string) {
  const { data, error } = await supabase.rpc('unblock_customer', { p_org_id: orgId, p_phone: phone });
  if (error) throw error;
  
  // مسح cache المتعلق بهذا الهاتف والمؤسسة
  const phoneCacheKey = createCacheKey('is_phone_blocked', { orgId, phone });
  const listCacheKey = createCacheKey('list_blocked_customers', { orgId });
  requestCache.clear(phoneCacheKey);
  requestCache.clear(listCacheKey);
  
  return !!data;
}

/**
 * مسح جميع cache المتعلقة بقائمة المحظورين
 */
export function clearBlockedCustomersCache(orgId: string) {
  // مسح cache قائمة المحظورين
  const listCacheKey = createCacheKey('list_blocked_customers', { orgId });
  requestCache.clear(listCacheKey);
  
  // مسح جميع cache المتعلقة بـ is_phone_blocked لهذه المؤسسة
  const stats = requestCache.getStats();
  stats.entries.forEach(entry => {
    if (entry.key.includes('is_phone_blocked') && entry.key.includes(orgId)) {
      requestCache.clear(entry.key);
    }
  });
}

