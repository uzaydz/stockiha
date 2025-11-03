import { inventoryDB } from '@/database/localDb';
import { supabase } from '@/lib/supabase';

export type Timeframe = 'today' | 'week' | 'month' | 'year' | 'range';

function startOfToday() {
  const d = new Date(); d.setHours(0,0,0,0); return d;
}
function startOfWeek() {
  const d = startOfToday(); const day = d.getDay(); const diff = day; d.setDate(d.getDate() - diff); return d;
}
function startOfMonth() {
  const d = startOfToday(); d.setDate(1); return d;
}
function startOfYear() {
  const d = startOfToday(); d.setMonth(0,1); return d;
}

export function getRangeFromTimeframe(tf: Timeframe, startISO?: string, endISO?: string): { start: string; end: string } {
  const end = new Date();
  let start = startOfToday();
  if (tf === 'today') start = startOfToday();
  else if (tf === 'week') start = startOfWeek();
  else if (tf === 'month') start = startOfMonth();
  else if (tf === 'year') start = startOfYear();
  else if (tf === 'range') {
    const s = startISO ? new Date(startISO) : startOfToday();
    const e = endISO ? new Date(endISO) : new Date();
    return { start: s.toISOString(), end: e.toISOString() };
  }
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function listExpensesByRange(orgId: string, range: { start: string; end: string }, opts?: { categoryId?: string; limit?: number }) {
  const getOrgIdFallback = (): string | null => {
    try {
      return (
        orgId ||
        localStorage.getItem('currentOrganizationId') ||
        localStorage.getItem('bazaar_organization_id') ||
        null
      );
    } catch { return orgId || null; }
  };
  const isValidUUID = (s: any) => typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
  const org = getOrgIdFallback();
  const effectiveOrgId = org && isValidUUID(org) ? org : null;

  let all = effectiveOrgId
    ? await inventoryDB.expenses.where('organization_id').equals(effectiveOrgId).toArray()
    : await inventoryDB.expenses.toArray();
  const s = Date.parse(range.start); const e = Date.parse(range.end);
  let filtered = all.filter(ex => {
    const t = Date.parse(ex.expense_date || ex.created_at);
    return t >= s && t <= e && (!opts?.categoryId || ex.category === opts.categoryId);
  });
  // إذا كانت فارغة محلياً، حاول جلبها من السيرفر ثم أعد المحاولة
  if (filtered.length === 0 && effectiveOrgId) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', effectiveOrgId)
        .gte('expense_date', new Date(s).toISOString())
        .lte('expense_date', new Date(e).toISOString())
        .order('expense_date', { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const row of data) {
          try {
            await inventoryDB.expenses.put({
              id: row.id,
              organization_id: row.organization_id,
              title: row.title,
              amount: Number(row.amount || 0),
              category: row.category,
              expense_date: row.expense_date || row.created_at,
              notes: row.description || null,
              status: row.status || 'completed',
              is_recurring: !!row.is_recurring,
              payment_method: row.payment_method || null,
              payment_ref: row.payment_ref || null,
              vendor_name: row.vendor_name || null,
              cost_center_id: row.cost_center_id || null,
              receipt_url: row.receipt_url || null,
              created_at: row.created_at,
              updated_at: row.updated_at || row.created_at,
              synced: true,
              pendingOperation: undefined,
            } as any);
          } catch {}
        }
        // إعادة تحميل المحلي
        all = await inventoryDB.expenses.where('organization_id').equals(orgId).toArray();
        filtered = all.filter(ex => {
          const t = Date.parse(ex.expense_date || ex.created_at);
          return t >= s && t <= e && (!opts?.categoryId || ex.category === opts.categoryId);
        });
      }
    } catch {}
  }
  filtered.sort((a,b)=> Date.parse(b.expense_date||b.created_at) - Date.parse(a.expense_date||a.created_at));
  if (opts?.limit) filtered = filtered.slice(0, opts.limit);
  // resolve category names
  const cats = await inventoryDB.expenseCategories.toArray();
  const nameOf = (id?: string) => (cats.find(c => c.id === id)?.name) || 'غير مصنف';
  return filtered.map(ex => ({
    id: ex.id,
    title: ex.title,
    amount: ex.amount,
    categoryId: ex.category,
    category: nameOf(ex.category),
    date: ex.expense_date,
    notes: ex.notes || undefined,
    status: ex.status,
  }));
}

export async function summarizeExpensesByRange(orgId: string, range: { start: string; end: string }, opts?: { categoryId?: string }) {
  const list = await listExpensesByRange(orgId, range, { categoryId: opts?.categoryId });
  const total = list.reduce((s,x)=> s + (Number(x.amount) || 0), 0);
  const count = list.length;
  const byCategory = new Map<string, number>();
  for (const ex of list) byCategory.set(ex.category, (byCategory.get(ex.category)||0) + (Number(ex.amount)||0));
  const topCategories = Array.from(byCategory.entries()).sort((a,b)=> b[1]-a[1]).slice(0,5).map(([name,sum])=>({name, sum}));
  return { total, count, topCategories, list };
}
