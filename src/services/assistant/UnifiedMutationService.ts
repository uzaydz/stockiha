import { inventoryDB, type LocalCustomerDebt, type LocalCustomerDebtPayment } from '@/database/localDb';
import { updateLocalProduct, markProductAsSynced } from '@/api/localProductService';
import { replaceProductInPOSCache, patchProductInAllPOSCaches } from '@/lib/cache/posCacheUpdater';
import { syncProduct } from '@/api/syncService';
import { supabase } from '@/lib/supabase';
import { updateCustomerDebtSyncStatus } from '@/api/localCustomerDebtService';
import { createLocalExpense } from '@/api/localExpenseService';
import { syncPendingExpenses } from '@/api/syncExpenses';
import { updateProductStock, setProductStockAbsolute } from '@/api/offlineProductService';
import { updateVariantInventory } from '@/services/InventoryService';

function normalizeArabicLite(s: string): string {
  try {
    let t = (s || '').toString().toLowerCase();
    t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
    t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
    t = t.replace(/\u0624/g, '\u0648');
    t = t.replace(/\u0626/g, '\u064a');
    t = t.replace(/\u0629/g, '\u0647');
    t = t.replace(/\u0649/g, '\u064a');
    t = t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ');
    return t.replace(/\s+/g, ' ').trim();
  } catch {
    return (s || '').toString().toLowerCase();
  }
}

export const UnifiedMutationService = {
  // تعديل المخزون لمنتج واحد (مع/بدون متغيرات) في استدعاء واحد
  async adjustInventory(args: {
    organizationId: string;
    productId: string;
    colorId?: string | null;
    sizeId?: string | null;
    mode: 'delta' | 'set';
    quantity: number; // يمكن أن يكون سالباً في وضع delta
  }) {
    const { organizationId, productId, colorId, sizeId, mode } = args;
    const q = Number(args.quantity) || 0;

    // 1) تعديل محلي أولاً
    let updatedLocal;
    if (mode === 'set') {
      const abs = Math.max(0, Math.abs(q));
      updatedLocal = await setProductStockAbsolute(organizationId, productId, abs, { colorId: colorId ?? null, sizeId: sizeId ?? null });
    } else {
      const isReduction = q < 0;
      const abs = Math.abs(q);
      if (abs === 0) return null;
      updatedLocal = await updateProductStock(organizationId, productId, abs, isReduction, { colorId: colorId ?? null, sizeId: sizeId ?? null });
    }

    // 2) حساب الكمية المطلقة للمتغير/المنتج بعد التعديل المحلي
    const productObj: any = updatedLocal || {};
    const colors = (productObj.colors || productObj.product_colors || []) as any[];
    let currentQty = 0;
    if (sizeId) {
      const c = colors.find((x: any) => x?.id === (colorId || x?.id));
      const sizes = c?.sizes || c?.product_sizes || [];
      const s = sizes.find((u: any) => u?.id === sizeId);
      currentQty = Number(s?.quantity ?? 0) || 0;
    } else if (colorId) {
      const c = colors.find((x: any) => x?.id === colorId);
      if (c?.has_sizes) {
        const sizes = c?.sizes || c?.product_sizes || [];
        currentQty = sizes.reduce((sum: number, u: any) => sum + (Number(u?.quantity ?? 0) || 0), 0);
      } else {
        currentQty = Number(c?.quantity ?? 0) || 0;
      }
    } else {
      currentQty = Number(productObj?.actual_stock_quantity ?? productObj?.stock_quantity ?? 0) || 0;
    }

    const targetAbsolute = mode === 'set' ? Math.max(0, Math.abs(q)) : Math.max(0, currentQty);

    // 3) تحديث بعيد (قاعدة البيانات) عبر RPC update_variant_inventory
    try {
      const variantId = sizeId ?? colorId ?? null;
      await updateVariantInventory({
        productId,
        variantId,
        newQuantity: targetAbsolute,
        operationType: 'assistant',
        notes: 'AI assistant adjustment'
      });
    } catch (e) {
      // إذا فشل بسبب عدم المصادقة أو RLS، سيبقى التحديث محلياً وتُحاول المزامنة لاحقاً
      try { void import('@/api/syncService').then(m => (m.syncUnsyncedProducts?.())); } catch {}
    }

    return updatedLocal;
  },

  // إعادة تسمية منتج وتحديث مفاتيح البحث
  async renameProduct(args: { productId: string; newName: string }) {
    const newName = (args.newName || '').toString();
    const name_lower = newName.toLowerCase();
    const name_search = normalizeArabicLite(newName);
    const updated = await updateLocalProduct(args.productId, { name: newName, name_lower, name_search } as any);
    // تحديث كاش منتجات POS لتنعكس التسمية فوراً دون إعادة جلب
    if (updated) {
      try { replaceProductInPOSCache(updated as any); } catch {}
      try { patchProductInAllPOSCaches(updated.id, { name: newName }); } catch {}
      // مزامنة مباشرة مع قاعدة البيانات البعيدة (Supabase)
      try {
        // 1) محاولة عبر RPC الآمن (يفحص RLS داخلياً)
        const payload = { name: newName, updated_at: new Date().toISOString() } as any;
        const { error: rpcErr } = await (supabase.rpc as any)('update_product_safe', {
          product_id: updated.id,
          product_data: payload
        });
        if (!rpcErr) {
          await markProductAsSynced(updated.id);
          return updated;
        }
      } catch {}
      try {
        // 2) تحديث مباشر مع فلترة المؤسسة إن أمكن
        const orgId = (updated as any).organization_id || null;
        const upd = supabase.from('products').update({ name: newName, updated_at: new Date().toISOString() }).eq('id', updated.id);
        const { error: updErr } = orgId ? await upd.eq('organization_id', orgId) : await upd;
        if (!updErr) {
          await markProductAsSynced(updated.id);
          return updated;
        }
      } catch {}
      try {
        // 3) fallback على syncProduct (قد ينجح إن تم تعديل المنطق لاحقاً)
        await syncProduct(updated);
      } catch {}
    }
    return updated;
  },

  // تطبيق دفعة على ديون عميل (يوزع على الأقدم فالأحدث) + تسجيل في ledger
  async applyCustomerPayment(args: {
    organizationId: string;
    customerId: string;
    amount: number;
    method?: string;
    note?: string;
    appliedBy?: string;
  }): Promise<{ totalBefore: number; totalAfter: number; applied: number; debtsAffected: Array<{ id: string; paid: number; remaining: number; status: LocalCustomerDebt['status'] }> }> {
    const { organizationId, customerId } = args;
    const amount = Math.max(0, Number(args.amount) || 0);
    if (amount <= 0) {
      return { totalBefore: 0, totalAfter: 0, applied: 0, debtsAffected: [] };
    }

    // اجلب ديون العميل المفتوحة
    const debts = await inventoryDB.customerDebts
      .where('customer_id')
      .equals(customerId)
      .and(d => (d.status === 'pending' || d.status === 'partial') && d.pendingOperation !== 'delete')
      .toArray();

    // ترتيب بالأقدم
    debts.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    const totalBefore = debts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
    let remaining = amount;
    const affected: Array<{ id: string; paid: number; remaining: number; status: LocalCustomerDebt['status'] }> = [];

    const affectedWithOrder: Array<{ id: string; orderId: string; paid: number; remaining: number; status: LocalCustomerDebt['status'] }> = [];
    await inventoryDB.transaction('rw', inventoryDB.customerDebts, inventoryDB.customerDebtPayments, async () => {
      // سجل دفعة عامة للعميل
      const payment: LocalCustomerDebtPayment = {
        id: crypto.randomUUID(),
        organization_id: organizationId,
        customer_id: customerId,
        amount,
        method: args.method || null,
        note: args.note || null,
        created_at: new Date().toISOString(),
        applied_by: args.appliedBy || null,
        synced: false,
        pendingOperation: 'create'
      };
      await inventoryDB.customerDebtPayments.add(payment);

      for (const d of debts) {
        if (remaining <= 0) break;
        const rest = Math.max(0, d.remaining_amount || 0);
        if (rest <= 0) continue;
        const pay = Math.min(remaining, rest);
        const newPaid = (d.paid_amount || 0) + pay;
        const newRemaining = Math.max(0, (d.total_amount || 0) - newPaid);
        const status: LocalCustomerDebt['status'] = newRemaining <= 0 ? 'paid' : 'partial';
        await inventoryDB.customerDebts.update(d.id, {
          paid_amount: newPaid,
          remaining_amount: newRemaining,
          status,
          updated_at: new Date().toISOString(),
          synced: false,
          pendingOperation: 'update'
        } as any);
        remaining -= pay;
        affected.push({ id: d.id, paid: pay, remaining: newRemaining, status });
        affectedWithOrder.push({ id: d.id, orderId: d.order_id, paid: pay, remaining: newRemaining, status });
      }
    });

    const openDebts = await inventoryDB.customerDebts
      .where('customer_id').equals(customerId)
      .and(d => (d.status === 'pending' || d.status === 'partial') && d.pendingOperation !== 'delete')
      .toArray();
    const totalAfter = openDebts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
    const applied = amount - remaining;
    // 4) محاولة تحديث قاعدة البيانات (orders) فوراً لكل دين متأثر
    try {
      await Promise.all(
        affectedWithOrder.map(async (a) => {
          const { error } = await supabase
            .from('orders')
            .update({
              remaining_amount: a.remaining,
              payment_status: a.status === 'paid' ? 'paid' : a.status === 'partial' ? 'partial' : 'pending'
            })
            .eq('id', a.orderId);
          if (!error) {
            try { await updateCustomerDebtSyncStatus(a.id, true); } catch {}
          }
        })
      );
    } catch {
      // سيحاول نظام المزامنة لاحقاً
      try { void import('@/api/syncCustomerDebts').then(m => (m.syncPendingCustomerDebts?.())); } catch {}
    }

    return { totalBefore, totalAfter, applied, debtsAffected: affected };
  }
};

export const ExpenseAssistantService = {
  async createExpense(fields: {
    title: string;
    amount: number;
    category: string;
    date?: string;
    payment_method?: string;
    vendor_name?: string;
    notes?: string;
  }) {
    const exp = await createLocalExpense({
      title: fields.title,
      amount: fields.amount,
      category: fields.category,
      expense_date: fields.date || new Date().toISOString(),
      notes: fields.notes,
      status: 'completed',
      is_recurring: false,
      payment_method: fields.payment_method,
      vendor_name: fields.vendor_name,
    } as any);
    try { void syncPendingExpenses(); } catch {}
    return exp;
  }
  ,
  async updateExpenseAmount(args: { expenseId: string; amount: number }) {
    const ex = await (await import('@/api/localExpenseService')).updateLocalExpense(args.expenseId, {
      title: undefined as any,
      amount: args.amount,
      category: undefined as any,
      expense_date: undefined as any,
      is_recurring: false,
    } as any);
    try { void (await import('@/api/syncExpenses')).syncPendingExpenses(); } catch {}
    return ex;
  }
};
