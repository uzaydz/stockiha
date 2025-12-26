import type { LocalCustomerDebt, LocalCustomerDebtPayment } from '@/database/localDb';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { updateLocalProduct, markProductAsSynced } from '@/api/localProductService';
import { replaceProductInPOSCache, patchProductInAllPOSCaches } from '@/lib/cache/posCacheUpdater';
import { supabase } from '@/lib/supabase';
import { updateCustomerDebtSyncStatus } from '@/api/localCustomerDebtService';
import { createLocalExpense } from '@/api/localExpenseService';
// ⚡ تم إزالة syncExpenses - PowerSync يتعامل مع المزامنة تلقائياً
// import { syncPendingExpenses } from '@/api/syncExpenses';
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
      // Need to find which color contains this size, or if sizes are top level (rare but possible in some schemas)
      // Assuming standard: product -> color -> sizes
      // We search all colors to find the size
      let foundSize = null;
      for (const col of colors) {
        const sizes = col.sizes || col.product_sizes || [];
        const s = sizes.find((u: any) => u?.id === sizeId);
        if (s) {
          foundSize = s;
          break;
        }
      }
      currentQty = Number(foundSize?.quantity ?? 0) || 0;
    } else if (colorId) {
      const c = colors.find((x: any) => x?.id === colorId);
      if (c?.has_sizes) {
        // Sum of sizes for this color
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
      try { void import('@/api/syncService').then(m => (m.syncUnsyncedProducts?.())); } catch { }
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
      try { replaceProductInPOSCache(updated as any); } catch { }
      try { patchProductInAllPOSCaches(updated.id, { name: newName }); } catch { }
      // ⚡ Offline-First: استخدام UnifiedProductService (PowerSync)
      try {
        const { unifiedProductService } = await import('@/services/UnifiedProductService');
        const orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id');
        if (orgId) {
          unifiedProductService.setOrganizationId(orgId);
          await unifiedProductService.updateProduct(updated.id, {
            name: newName,
            updated_at: new Date().toISOString()
          });
          console.log(`[UnifiedMutation] ✅ Product renamed via PowerSync: ${updated.id}`);
          // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
          return updated;
        }
      } catch (powerSyncError) {
        console.warn('[UnifiedMutation] ⚠️ PowerSync update failed, product saved locally:', powerSyncError);
      }

      // ⚡ المزامنة تحدث تلقائياً عبر PowerSync عند الاتصال
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

    // ⚡ اجلب ديون العميل المفتوحة عبر Delta Sync
    const allDebts = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts' as any, organizationId);
    const debts = allDebts.filter(d =>
      d.customer_id === customerId &&
      (d.status === 'pending' || d.status === 'partial') &&
      d.pendingOperation !== 'delete'
    );

    // ترتيب بالأقدم
    debts.sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));

    const totalBefore = debts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
    let remaining = amount;
    const affected: Array<{ id: string; paid: number; remaining: number; status: LocalCustomerDebt['status'] }> = [];

    const affectedWithOrder: Array<{ id: string; orderId: string; paid: number; remaining: number; status: LocalCustomerDebt['status'] }> = [];

    // ⚡ استخدام Delta Sync بدلاً من IndexedDB transaction
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
    await deltaWriteService.create('customer_debt_payments' as any, payment, organizationId);

    // Distribute payment across debts
    for (const d of debts) {
      if (remaining <= 0) break;
      const rest = Math.max(0, d.remaining_amount || 0);
      if (rest <= 0) continue;
      const pay = Math.min(remaining, rest);
      const newPaid = (d.paid_amount || 0) + pay;
      const newRemaining = Math.max(0, (d.total_amount || 0) - newPaid);
      const status: LocalCustomerDebt['status'] = newRemaining <= 0 ? 'paid' : 'partial';
      await deltaWriteService.update('customer_debts' as any, d.id, {
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        status,
        updated_at: new Date().toISOString(),
        synced: false,
        pendingOperation: 'update'
      });
      remaining -= pay;
      affected.push({ id: d.id, paid: pay, remaining: newRemaining, status });
      affectedWithOrder.push({ id: d.id, orderId: d.order_id, paid: pay, remaining: newRemaining, status });
    }

    // If remaining > 0 (overpayment), it's just credit (handled by the payment record itself being > applied)
    // In future we might want to store 'credit' explicitly

    // ⚡ جلب الديون المفتوحة بعد التحديث
    const allDebtsAfter = await deltaWriteService.getAll<LocalCustomerDebt>('customer_debts' as any, organizationId);
    const openDebts = allDebtsAfter.filter(d =>
      d.customer_id === customerId &&
      (d.status === 'pending' || d.status === 'partial') &&
      d.pendingOperation !== 'delete'
    );
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
            try { await updateCustomerDebtSyncStatus(a.id, true); } catch { }
          }
        })
      );
    } catch {
      // سيحاول نظام المزامنة لاحقاً
    }

    return { totalBefore, totalAfter, applied, debtsAffected: affected };
  },

  async createCustomerDebt(args: {
    organizationId: string;
    customerId: string;
    customerName: string;
    amount: number;
    description?: string;
  }): Promise<{ debtId: string; amount: number }> {
    const { organizationId, customerId, customerName, amount, description } = args;

    if (!customerId || !amount || amount <= 0) {
      throw new Error('معلومات غير صحيحة لإنشاء الدين');
    }

    const debtId = `debt_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const newDebt: LocalCustomerDebt = {
      id: debtId,
      customer_id: customerId,
      customer_name: customerName,
      organization_id: organizationId,
      amount, // legacy field for backward compatibility with schema
      total_amount: amount,
      paid_amount: 0,
      remaining_amount: amount,
      status: 'pending',
      description: description || `دين بمبلغ ${amount} دج`,
      created_at: now,
      updated_at: now,
      synced: false,
      pendingOperation: 'create'
    };

    // ⚡ استخدام Delta Sync دائماً - المسار الموحد للكتابة
    const result = await deltaWriteService.create('customer_debts' as any, {
      ...newDebt,
      synced: false,
      pending_operation: 'INSERT'
    }, organizationId);

    if (!result.success) {
      console.error('[createCustomerDebt] Failed to save via Delta Sync:', result.error);
      throw new Error(`Failed to create customer debt: ${result.error}`);
    }

    return { debtId, amount };
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
      category: fields.category || '',
      expense_date: fields.date || new Date().toISOString(),
      notes: fields.notes || '',
      status: 'approved', // ⚡ استخدام approved بدلاً من completed
      is_recurring: false,
      payment_method: fields.payment_method || 'cash', // ⚡ Default: cash
      vendor_name: fields.vendor_name || '',
    } as any);
    // ⚡ PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
    // try { void syncPendingExpenses(); } catch {}
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
    // ⚡ PowerSync يتعامل مع المزامنة تلقائياً - لا حاجة لاستدعاء صريح
    // try { void (await import('@/api/syncExpenses')).syncPendingExpenses(); } catch {}
    return ex;
  }
};
