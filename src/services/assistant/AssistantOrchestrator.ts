import { IntentEngine } from './IntentEngine';
import { AIGateway } from './AIGateway';
import { AIIntentPlanner } from './AIIntentPlanner';
import { UnifiedMutationService } from './UnifiedMutationService';
import { ExpenseAssistantService } from './UnifiedMutationService';
import { LocalAnalyticsService } from '@/services/LocalAnalyticsService';
import { inventoryDB } from '@/database/localDb';
import { computeAvailableStock } from '@/lib/stock';
import type { ParsedIntent, AssistantResult } from './types';

function norm(s: string) {
  return s.toLowerCase();
}

async function resolveProductByQuery(query: string) {
  const results = await LocalAnalyticsService.searchProduct(query);
  return results || [];
}

async function resolveCustomerByQuery(query: string, organizationId?: string) {
  const q = (query || '').toString();
  const qLower = q.toLowerCase();
  const digits = q.replace(/\D+/g, '');
  const all = await inventoryDB.customers.toArray();
  const pool = all.filter(c => !organizationId || c.organization_id === organizationId);

  // إذا كان هناك أرقام، طابق الهاتف أولاً كأولوية قصوى
  if (digits) {
    const phoneMatches = pool.filter(c => ((c.phone || '').replace(/\D+/g, '')).includes(digits));
    if (phoneMatches.length) return phoneMatches;
  }

  // تطبيع عربي خفيف + bigram similarity
  const normalizeArabicLite = (s: string) => {
    try {
      let t = (s || '').toString().toLowerCase();
      t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
      t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
      t = t.replace(/\u0624/g, '\u0648');
      t = t.replace(/\u0626/g, '\u064a');
      t = t.replace(/\u0629/g, '\u0647');
      t = t.replace(/\u0649/g, '\u064a');
      return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    } catch { return (s || '').toString().toLowerCase(); }
  };
  const bigrams = (s: string) => {
    const t = (' ' + s + ' ').replace(/\s+/g, ' ');
    const arr: string[] = [];
    for (let i = 0; i < t.length - 1; i++) arr.push(t.slice(i, i+2));
    return arr;
  };
  const dice = (a: string, b: string) => {
    const A = bigrams(a); const B = bigrams(b);
    const map = new Map<string, number>();
    A.forEach(x => map.set(x, (map.get(x) || 0) + 1));
    let inter = 0;
    B.forEach(x => { const c = map.get(x) || 0; if (c > 0) { inter += 1; map.set(x, c-1); } });
    return (2 * inter) / (A.length + B.length || 1);
  };

  const nq = normalizeArabicLite(qLower);
  const candidates = pool.map(c => {
    const name = c.name || '';
    const n = normalizeArabicLite(name);
    let score = 0;
    if (n === nq) score = 1.0;
    else if (n.includes(nq) || nq.includes(n)) score = 0.92;
    else score = dice(n, nq);
    return { c, score };
  }).filter(x => x.score >= 0.5) // تخلص من النتائج الضعيفة جداً
    .sort((a,b) => b.score - a.score)
    .map(x => ({ ...x.c, _score: x.score as number })) as any[];

  return candidates;
}

export const AssistantOrchestrator = {
  parse(query: string): ParsedIntent {
    return IntentEngine.parse(query);
  },

  async process(query: string, opts?: { organizationId?: string; history?: Array<{ role: 'user' | 'assistant'; content: string }>; context?: { lastProduct?: any }; signal?: AbortSignal }): Promise<AssistantResult> {
    // =============================
    // 0) فحص إشارة الإلغاء
    // =============================
    if (opts?.signal?.aborted) {
      throw new DOMException('Operation aborted', 'AbortError');
    }

    // =============================
    // 0) دعم اختيار رقم من قائمة التباس العملاء
    // =============================
    // حالة اختيار معلّقة (على مستوى الوحدة)
    const now = Date.now();
    (AssistantOrchestrator as any)._pendingSelection = (AssistantOrchestrator as any)._pendingSelection || null;
    type PendingSel = { type: 'customer_payment' | 'customer_credit' | 'expense_update' | 'repair_status' | 'repair_update_status' | 'repair_add_payment'; candidates: any[]; payload?: any; orgId?: string; createdAt: number } | null;
    let pending: PendingSel = (AssistantOrchestrator as any)._pendingSelection;

    // تنظيف الحالة إذا تقادمت (> 5 دقائق)
    if (pending && now - pending.createdAt > 5 * 60 * 1000) {
      (AssistantOrchestrator as any)._pendingSelection = null;
      pending = null;
    }

    const qTrim = (query || '').trim();
    const numPick = qTrim.match(/^\s*(?:اختر|رقم|num|number)?\s*(\d{1,2})\s*$/i);
    if (pending && numPick) {
      const idx = parseInt(numPick[1], 10) - 1;
      if (idx < 0 || idx >= pending.candidates.length) {
        return { answer: 'رقم غير صالح. الرجاء إدخال رقم من القائمة.' };
      }
      const chosen = pending.candidates[idx];
      // نفّذ حسب النوع
      if (pending.type === 'customer_payment') {
        const amount = Number(pending.payload?.amount || 0);
        if (!amount || amount <= 0) {
          (AssistantOrchestrator as any)._pendingSelection = null;
          return { answer: 'المبلغ غير محدد لتسجيل الدفعة.' };
        }
        const orgId = pending.orgId || opts?.organizationId || '';
        const beforeDebts = await inventoryDB.customerDebts.where('customer_id').equals(chosen.id).toArray();
        const before = beforeDebts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
        const res = await UnifiedMutationService.applyCustomerPayment({
          organizationId: orgId,
          customerId: chosen.id,
          amount
        });
        (AssistantOrchestrator as any)._pendingSelection = null;
        const summary = `✅ تم تسجيل الدفعة ${amount} دج للعميل ${chosen.name}.\nالرصيد السابق: ${before.toFixed(2)} دج • الرصيد الحالي: ${res.totalAfter.toFixed(2)} دج`;
        return { answer: summary, data: res };
      } else if (pending.type === 'customer_credit') {
        const debts = await inventoryDB.customerDebts.where('customer_id').equals(chosen.id).toArray();
        const remaining = debts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
        (AssistantOrchestrator as any)._pendingSelection = null;
        return { answer: `💳 كريدي ${chosen.name}: ${remaining.toFixed(2)} دج`, data: { customer: chosen, debts } };
      } else if (pending.type === 'expense_update') {
        const amount = Number(pending.payload?.amount || 0);
        if (!amount || amount <= 0) {
          (AssistantOrchestrator as any)._pendingSelection = null;
          return { answer: 'يرجى تحديد مبلغ صالح للتعديل.' };
        }
        const beforeAmount = Number(chosen?.amount || 0);
        const updated = await ExpenseAssistantService.updateExpenseAmount({ expenseId: chosen.id, amount });
        (AssistantOrchestrator as any)._pendingSelection = null;
        if (updated) {
          const title = chosen?.title || 'مصروف';
          return { answer: `✅ تم تعديل المصروف "${title}" من ${beforeAmount.toFixed(2)} دج إلى ${amount.toFixed(2)} دج.` };
        }
        return { answer: 'تعذر تعديل المصروف المطلوب.' };
      } else if (pending.type === 'repair_status') {
        const o = chosen;
        (AssistantOrchestrator as any)._pendingSelection = null;
        try {
          const info = await (await import('@/api/localRepairService')).computeLocalQueueInfo(o.id);
          const line = `${o.customer_name} — ${o.device_type || 'جهاز'} • الحالة: ${o.status}${info ? ` • ترتيبك في الطابور: ${info.queue_position}/${info.total_in_queue}` : ''}${o.repair_tracking_code ? ` • التتبع: ${o.repair_tracking_code}` : ''}`;
          return { answer: line };
        } catch {
          const line = `${o.customer_name} — ${o.device_type || 'جهاز'} • الحالة: ${o.status}`;
          return { answer: line };
        }
      } else if (pending.type === 'repair_update_status') {
        const newStatus = String(pending.payload?.status || '').trim();
        (AssistantOrchestrator as any)._pendingSelection = null;
        if (!newStatus) return { answer: 'لم يتم تحديد الحالة الجديدة.' };
        try {
          const { changeLocalRepairStatus } = await import('@/api/localRepairService');
          await changeLocalRepairStatus(chosen.id, newStatus, 'تعديل عبر المساعد', 'assistant');
          return { answer: `✅ تم تغيير حالة طلب ${chosen.order_number || chosen.id.slice(0,8)} إلى ${newStatus}.` };
        } catch {
          return { answer: 'تعذر تغيير حالة الطلب.' };
        }
      } else if (pending.type === 'repair_add_payment') {
        const amount = Number(pending.payload?.amount || 0);
        (AssistantOrchestrator as any)._pendingSelection = null;
        if (!amount || amount <= 0) return { answer: 'يرجى تحديد مبلغ صالح.' };
        // قيود الدفعات: منع تجاوز السعر الكلي
        const total = Number(chosen.total_price ?? 0);
        const paid = Number(chosen.paid_amount || 0);
        const tbd = !!chosen.price_to_be_determined_later || chosen.total_price == null;
        if (tbd || total <= 0) {
          return { answer: 'لا يمكن تسجيل دفعة قبل تحديد السعر الكلي. يرجى تحديد السعر أولاً.' };
        }
        const remaining = Math.max(0, total - paid);
        if (amount > remaining) {
          return { answer: `المبلغ يتجاوز المتبقي (${remaining} دج). يمكنك دفع حتى ${remaining} دج.` };
        }
        try {
          const { addLocalRepairPayment } = await import('@/api/localRepairService');
          await addLocalRepairPayment(chosen.id, amount, 'assistant');
          return { answer: `✅ تم تسجيل دفعة ${amount} دج لطلب ${chosen.order_number || chosen.id.slice(0,8)}. المتبقي: ${remaining - amount} دج` };
        } catch {
          return { answer: 'تعذر تسجيل الدفعة.' };
        }
      }
      // في أي حالة أخرى، امسح الحالة
      (AssistantOrchestrator as any)._pendingSelection = null;
    }

    // 0-bis) تخطيط قائم على الأدوات لطلبات المصروفات (الذكاء يحدد، نحن ننفذ ونلخّص)
    try {
      const plan = await AIIntentPlanner.planTools(query, opts?.history, opts?.signal).catch(()=>null);
      if (plan && Array.isArray(plan.toolCalls) && plan.toolCalls.length) {
        // استخدم معرف مؤسسة صالح، وإلا حاول من localStorage
        let orgId = opts?.organizationId || '';
        try {
          if (!orgId) orgId = localStorage.getItem('currentOrganizationId') || localStorage.getItem('bazaar_organization_id') || '';
        } catch {}
        const results: Array<{ name: string; args: any; data: any }> = [];
        for (const call of plan.toolCalls.slice(0,2)) {
          if (call.name === 'expense_summary') {
            const { getRangeFromTimeframe, summarizeExpensesByRange } = await import('@/services/expenses/LocalExpenseAnalytics');
            const tf = (call.args?.timeframe as any) || 'month';
            const range = getRangeFromTimeframe(tf, call.args?.start, call.args?.end);
            let catId: string | undefined = undefined;
            if (call.args?.categoryName) {
              try {
                const { listLocalExpenseCategories } = await import('@/api/localExpenseCategoryService');
                const cats = await listLocalExpenseCategories();
                const norm = (s:string)=> s.toString().trim().toLowerCase();
                const target = norm(call.args?.categoryName);
                const exact = cats.find((c:any)=> norm(c.name)===target) || cats.find((c:any)=> norm(c.name).includes(target)||target.includes(norm(c.name)));
                if (exact) catId = exact.id;
              } catch {}
            }
            const data = await summarizeExpensesByRange(orgId, range, { categoryId: catId });
            results.push({ name: 'expense_summary', args: call.args, data });
          }
          if (call.name === 'expense_list') {
            const { getRangeFromTimeframe, listExpensesByRange } = await import('@/services/expenses/LocalExpenseAnalytics');
            const tf = (call.args?.timeframe as any) || 'month';
            const range = getRangeFromTimeframe(tf, call.args?.start, call.args?.end);
            let catId: string | undefined = undefined;
            if (call.args?.categoryName) {
              try {
                const { listLocalExpenseCategories } = await import('@/api/localExpenseCategoryService');
                const cats = await listLocalExpenseCategories();
                const norm = (s:string)=> s.toString().trim().toLowerCase();
                const target = norm(call.args?.categoryName);
                const exact = cats.find((c:any)=> norm(c.name)===target) || cats.find((c:any)=> norm(c.name).includes(target)||target.includes(norm(c.name)));
                if (exact) catId = exact.id;
              } catch {}
            }
            const data = await listExpensesByRange(orgId, range, { categoryId: catId, limit: call.args?.limit ?? 10 });
            results.push({ name: 'expense_list', args: call.args, data });
          }
        }
        if (results.length) {
          const summaryParts: string[] = [];
          for (const r of results) {
            if (r.name === 'expense_summary') {
              summaryParts.push(`ملخص المصروفات: إجمالي=${r.data.total}، عدد=${r.data.count}`);
              if (r.data.topCategories?.length) summaryParts.push('أعلى الفئات: ' + r.data.topCategories.map((x:any)=> `${x.name}:${x.sum}`).join(', '));
            } else if (r.name === 'expense_list') {
              const lines = r.data.map((x:any)=> `${x.title} — ${x.amount} دج (${(x.date||'').slice(0,10)}) [${x.category}]`).slice(0,10);
              summaryParts.push(`قائمة (${lines.length}):\n- ` + lines.join('\n- '));
            }
          }
          const answer = await AIGateway.summarize(query, summaryParts.join('\n'), opts?.history, opts?.signal);
          return { answer, data: results };
        }
      }
    } catch {}
    // 1) حاول التعرف على النية عبر الذكاء (متعدد اللغات)
    let intent = await AIIntentPlanner.plan(query, opts?.history, opts?.signal);
    // 2) احتياط: محلل محلي
    if (!intent) intent = this.parse(query);
    const orgId = opts?.organizationId || '';

    // الاعتماد على الذكاء كمرجع أساسي لتحديد النوايا؛ لا تحويلات بنصوص ثابتة هنا.

    switch (intent.type) {
      case 'debts_list': {
        // اجلب الديون الخاصة بالمؤسسة
        const allDebts = orgId
          ? await inventoryDB.customerDebts
              .where('organization_id')
              .equals(orgId)
              .and(d => d.pendingOperation !== 'delete')
              .toArray()
          : await inventoryDB.customerDebts.toArray();

        // احتساب المبالغ المتبقية لكل عميل (pending/partial)
        const byCustomer = new Map<string, { remaining: number }>();
        for (const d of allDebts) {
          const status = (d.status || 'pending').toLowerCase();
          const rem = Math.max(0, Number(d.remaining_amount || 0));
          if ((status === 'pending' || status === 'partial') && rem > 0) {
            const key = d.customer_id || 'unknown';
            const agg = byCustomer.get(key) || { remaining: 0 };
            agg.remaining += rem;
            byCustomer.set(key, agg);
          }
        }

        if (byCustomer.size === 0) {
          return { answer: 'لا يوجد عملاء لديهم ديون حالياً.' };
        }

        // جلب أسماء العملاء
        const customers = await inventoryDB.customers.toArray();
        const nameMap = new Map<string, string>();
        for (const c of customers) {
          if (c && c.id) nameMap.set(c.id, c.name || 'عميل بدون اسم');
        }

        // تحويل و ترتيب
        const rows: Array<{ id: string; name: string; remaining: number }> = [];
        for (const [cid, v] of byCustomer.entries()) {
          rows.push({ id: cid, name: nameMap.get(cid) || 'عميل', remaining: v.remaining });
        }
        rows.sort((a, b) => b.remaining - a.remaining);

        const top = rows.slice(0, 10);
        const lines = top.map((r, i) => `${i + 1}. ${r.name} — ${r.remaining.toFixed(2)} دج`);
        const extra = rows.length > 10 ? `\nو ${rows.length - 10} عميل آخر…` : '';
        const summary = `العملاء ذوو الديون:\n${lines.join('\n')}${extra}`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data: rows };
      }
      case 'sales_today': {
        const data = await LocalAnalyticsService.getTodaySales();
        const summary = `مبيعات اليوم: ${data.totalSales.toFixed(2)} دج من ${data.orderCount} طلب • أرباح تقديرية: ${data.profit.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'sales_yesterday': {
        const data = await LocalAnalyticsService.getYesterdaySales();
        const summary = `مبيعات الأمس: ${data.totalSales.toFixed(2)} دج من ${data.orderCount} طلب • أرباح تقديرية: ${data.profit.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'sales_on_date': {
        const date = new Date((intent as any).date);
        const data = await LocalAnalyticsService.getSalesByDate(date);
        const summary = `مبيعات ${date.toISOString().slice(0,10)}: ${data.totalSales.toFixed(2)} دج من ${data.orderCount} طلب • أرباح تقديرية: ${data.profit.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'weekly_sales': {
        const data = await LocalAnalyticsService.getWeeklySales();
        const summary = `هذا الأسبوع: ${data.totalSales.toFixed(2)} دج من ${data.orderCount} طلب • أرباح تقديرية: ${data.profit.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'monthly_sales': {
        const data = await LocalAnalyticsService.getSalesStats(30);
        const summary = `هذا الشهر: ${data.totalSales.toFixed(2)} دج من ${data.totalOrders} طلب • متوسط الطلب ${data.averageOrderValue.toFixed(2)} دج • أرباح تقديرية ${data.totalProfit.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'top_products': {
        const days = (intent as any).days || 7;
        const data = await LocalAnalyticsService.getTopSellingProducts(days);
        const top = data.slice(0, 5).map((p, i) => `${i+1}. ${p.productName}: ${p.quantitySold} قطعة`).join(' \n');
        const summary = `أفضل المنتجات (آخر ${days} يوم):\n${top || 'لا توجد بيانات'}`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'inventory_stats': {
        const data = await LocalAnalyticsService.getInventoryStats();
        const summary = `مخزون: ${data.totalProducts} منتج • منخفض ${data.lowStockProducts} • نافد ${data.outOfStockProducts} • قيمة ${data.totalStockValue.toFixed(2)} دج`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'low_stock': {
        const data = await LocalAnalyticsService.getLowStockProducts(15);
        const list = data.slice(0, 10).map((p, i) => `${i+1}. ${p.name} — ${p.available_stock}`).join(' \n');
        const summary = `منخفض المخزون:\n${list || 'لا يوجد'}`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'out_of_stock': {
        const data = await LocalAnalyticsService.getOutOfStockProducts(20);
        const list = data.slice(0, 10).map((p, i) => `${i+1}. ${p.name}`).join(' \n');
        const summary = `منتجات نفدت:\n${list || 'لا يوجد'}`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data };
      }
      case 'product_search': {
        const term = query.replace(/^(ابحث|بحث|chercher|search|recherche)\s*/i, '').trim();
        const results = await LocalAnalyticsService.searchProduct(term);
        if (!results || results.length === 0) {
          return { answer: `لم يتم العثور على نتائج للبحث: ${term}` };
        }
        if (results.length === 1) {
          const p: any = results[0];
          const available = computeAvailableStock(p as any);
          return { answer: `${p.name} — المتاح: ${available} قطعة${p.sku ? ` • SKU: ${p.sku}` : ''}${p.barcode ? ` • باركود: ${p.barcode}` : ''}`, data: { product: p } };
        }
        const top = results.slice(0, 5) as any[];
        const enriched = await Promise.all(top.map(async (p: any) => `${p.name} — ${computeAvailableStock(p)} قطعة`));
        const summary = `تم العثور على ${results.length} نتيجة. أبرزها:\n• ${enriched.join('\n• ')}`;
        return { answer: summary, data: results };
      }
      case 'update_stock': {
        const p = intent as any;
        let product: any | null = null;
        if (p.productQuery && p.productQuery.trim().length > 0) {
          const matches = await resolveProductByQuery(p.productQuery);
          if (!matches.length) {
            return { answer: `❌ لم أجد منتجاً مطابقاً لعبارة: ${p.productQuery}` };
          }
          product = matches.find((x: any) => norm(x.name) === norm(p.productQuery)) || matches[0];
        } else if (opts?.context?.lastProduct) {
          product = opts.context.lastProduct;
        } else {
          return { answer: 'يرجى ذكر اسم المنتج أو اختر منتجاً أولاً.' };
        }
        const colors = (product.colors || product.product_colors || []) as any[];
        // resolve color/size by names if provided
        let colorId: string | null = null;
        let sizeId: string | null = null;
        const eqOrContains = (a: any, b: any) => {
          const x = norm(a||'');
          const y = norm(b||'');
          return x === y || x.includes(y) || y.includes(x);
        };
        if (p.colorName && colors.length) {
          const c = colors.find((c: any) => eqOrContains(c.name || c.color_name, p.colorName));
          if (c) {
            colorId = c.id || null;
            const sizes = (c.sizes || c.product_sizes || []) as any[];
            if (p.sizeName && sizes.length) {
              const s = sizes.find((s: any) => eqOrContains(s.name || s.size_name, p.sizeName));
              if (s) sizeId = s.id || null;
            }
          }
        }
        const needsVariant = Array.isArray(colors) && colors.length > 0 && !colorId && !sizeId;
        if (needsVariant || p.quantity == null || !p.mode) {
          // أعد واجهة تفاعلية لاختيار اللون/المقاس/الكمية
          const available = computeAvailableStock(product as any);
          return {
            answer: JSON.stringify({ type: 'product_with_variants', product: { ...product, available } }),
            action_required: 'select_variant',
            ui_schema: { type: 'variant_picker' },
            data: { product }
          };
        }
        const mode = p.mode as 'delta' | 'set';
        const quantity = Number(p.quantity) || 0;
        if (mode === 'set' && quantity <= 0) {
          return { answer: 'يرجى تحديد كمية صحيحة (> 0).' };
        }
        const updated = await UnifiedMutationService.adjustInventory({
          organizationId: orgId,
          productId: product.id,
          colorId,
          sizeId,
          mode,
          quantity
        });
        const available = updated ? computeAvailableStock(updated as any) : computeAvailableStock(product as any);
        const summary = `تم التحديث: ${product.name} • الكمية المتاحة الآن: ${available}`;
        return { answer: summary, data: { product: updated || product } };
      }
      case 'rename_product': {
        const { productQuery, newName } = intent as any;
        const matches = await resolveProductByQuery(productQuery);
        if (!matches.length) return { answer: `❌ لم أجد منتجاً مطابقاً لعبارة: ${productQuery}` };
        const product = matches.find((x: any) => norm(x.name) === norm(productQuery)) || matches[0];
        const res = await UnifiedMutationService.renameProduct({ productId: product.id, newName });
        if (!res) {
          return { answer: '❌ تعذر تغيير اسم المنتج. يرجى المحاولة مرة أخرى.' };
        }
        return { answer: `✅ تم تغيير اسم المنتج إلى: ${newName}` };
      }
      case 'customer_credit': {
        const { customerQuery } = intent as any;
        const customers = await resolveCustomerByQuery(customerQuery, orgId);
        if (!customers.length) return { answer: `❌ لم أجد عميلاً مطابقاً لعبارة: ${customerQuery || ''}` };
        // فضّل التطابق المؤكد وإلا اطلب توضيحاً
        let customer = customers[0] as any;
        const second = customers[1] as any;
        const topScore = Number(customer?._score ?? 0);
        const secondScore = Number(second?._score ?? 0);
        if ((topScore < 0.88) || (second && topScore - secondScore < 0.06)) {
          const sample = customers.slice(0, 5).map((c: any, i: number) => `${i+1}. ${c.name || 'عميل'}${c.phone ? ` (${c.phone})` : ''}`).join('\n');
          // خزّن حالة اختيار
          (AssistantOrchestrator as any)._pendingSelection = { type: 'customer_credit', candidates: customers, createdAt: Date.now(), orgId };
          return { answer: `وجدت أكثر من عميل مشابه:\n${sample}\nاكتب رقم العميل المطلوب أو الاسم الكامل بدقة.` };
        }
        const debts = await inventoryDB.customerDebts.where('customer_id').equals(customer.id).toArray();
        const remaining = debts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
        return { answer: `💳 كريدي ${customer.name}: ${remaining.toFixed(2)} دج`, data: { customer, debts } };
      }
      case 'customer_payment': {
        const { customerQuery, amount } = intent as any;
        const customers = await resolveCustomerByQuery(customerQuery, orgId);
        if (!customers.length) return { answer: `❌ لم أجد عميلاً مطابقاً لعبارة: ${customerQuery || ''}` };
        let customer = customers[0] as any;
        const second = customers[1] as any;
        const topScore = Number(customer?._score ?? 0);
        const secondScore = Number(second?._score ?? 0);
        if ((topScore < 0.9) || (second && topScore - secondScore < 0.08)) {
          const sample = customers.slice(0, 5).map((c: any, i: number) => `${i+1}. ${c.name || 'عميل'}${c.phone ? ` (${c.phone})` : ''}`).join('\n');
          // خزّن حالة اختيار مع حمولة الدفع
          (AssistantOrchestrator as any)._pendingSelection = { type: 'customer_payment', candidates: customers, payload: { amount }, orgId, createdAt: Date.now() };
          return { answer: `وجدت أكثر من عميل مشابه لطلب تسجيل دفعة:\n${sample}\nرجاءً اكتب رقم العميل المطلوب (مثال: 2) أو الاسم الكامل بدقة قبل المتابعة.` };
        }
        if (!amount || amount <= 0) return { answer: 'يرجى تحديد مبلغ صالح للدفع.' };
        const beforeDebts = await inventoryDB.customerDebts.where('customer_id').equals(customer.id).toArray();
        const before = beforeDebts.reduce((s, d) => s + Math.max(0, d.remaining_amount || 0), 0);
        const res = await UnifiedMutationService.applyCustomerPayment({
          organizationId: orgId,
          customerId: customer.id,
          amount
        });
        const summary = `✅ تم تسجيل الدفعة ${amount} دج للعميل ${customer.name}.\nالرصيد السابق: ${before.toFixed(2)} دج • الرصيد الحالي: ${res.totalAfter.toFixed(2)} دج`;
        return { answer: summary, data: res };
      }
      case 'expense_create': {
        const f = (intent as any).fields || {};
        // جلب فئات المصروفات المقترحة
        const orgId2 = orgId;
        const cats = await (await import('@/api/localExpenseCategoryService')).listLocalExpenseCategories().catch(() => [] as any[]);
        const catNames = (cats || []).map((c: any) => c.name);
        const findCategoryId = (name?: string): string | null => {
          if (!name) return null;
          const norm = (s: string) => s.toString().trim().toLowerCase();
          const target = norm(name);
          const exact = cats.find((c: any) => norm(c.name) === target);
          if (exact) return exact.id;
          const contains = cats.find((c: any) => norm(c.name).includes(target) || target.includes(norm(c.name)));
          return contains ? contains.id : null;
        };

        // التحقق من الحقول الأساسية
        const missing: string[] = [];
        if (!f.title) missing.push('title');
        if (!f.amount || !(Number(f.amount) > 0)) missing.push('amount');
        if (!f.category) missing.push('category');

        if (missing.length > 0) {
          // أعد UI schema لملء الحقول
          const form = {
            type: 'expense_form',
            fields: {
              title: f.title || '',
              amount: f.amount || '',
              category: f.category || '',
              date: f.date || new Date().toISOString().slice(0,10),
              payment_method: f.payment_method || 'cash',
              vendor_name: f.vendor_name || '',
              notes: f.notes || ''
            },
            categories: catNames.slice(0, 20)
          };
          return { answer: JSON.stringify(form) };
        }

        // إنشاء المصروف
        // حل معرف الفئة (إن لم توجد فئة مطابقة، أنشئ فئة جديدة محلياً ثم زامن)
        let categoryId = findCategoryId(f.category);
        if (!categoryId && f.category) {
          try {
            const { createLocalExpenseCategory } = await import('@/api/localExpenseCategoryService');
            const { syncPendingExpenseCategories } = await import('@/api/syncExpenseCategories');
            const newCat = await createLocalExpenseCategory(f.category);
            categoryId = newCat.id;
            try { void syncPendingExpenseCategories(); } catch {}
          } catch {}
        }
        const created = await ExpenseAssistantService.createExpense({
          title: f.title,
          amount: Number(f.amount),
          category: categoryId || (f.category || 'أخرى'),
          date: f.date,
          payment_method: f.payment_method,
          vendor_name: f.vendor_name,
          notes: f.notes,
        });
        return { answer: `✅ تم تسجيل المصروف "${f.title}" بقيمة ${Number(f.amount).toFixed(2)} دج` };
      }
      case 'repair_create': {
        const f = (intent as any).fields || {};
        const missing: string[] = [];
        if (!f.customer_name) missing.push('customer_name');
        if (!f.customer_phone) missing.push('customer_phone');
        if (!f.device_type) missing.push('device_type');
        if (missing.length > 0) {
          let locations: string[] = [];
          try {
            const locs = await (await import('@/api/localRepairService')).listLocalRepairLocations(opts?.organizationId || '');
            locations = (locs || []).map((x:any)=> x.name).slice(0, 20);
          } catch {}
          const form = {
            type: 'repair_form',
            fields: {
              customer_name: f.customer_name || '',
              customer_phone: f.customer_phone || '',
              device_type: f.device_type || '',
              issue_description: f.issue_description || '',
              repair_location: f.repair_location || '',
              total_price: f.total_price || '',
              paid_amount: f.paid_amount || '',
              payment_method: f.payment_method || 'cash',
              price_to_be_determined_later: !!f.price_to_be_determined_later
            },
            locations
          };
          return { answer: JSON.stringify(form) };
        }
        try {
          const { createLocalRepairOrder, addLocalRepairHistory, listLocalRepairLocations } = await import('@/api/localRepairService');
          let locationId: string | null = null;
          if (f.repair_location) {
            try {
              const locs = await listLocalRepairLocations(opts?.organizationId || '');
              const norm = (s:string)=> s.toString().trim().toLowerCase();
              const target = norm(f.repair_location);
              const exact = (locs||[]).find((l:any)=> norm(l.name)===target) || (locs||[]).find((l:any)=> norm(l.name).includes(target)||target.includes(norm(l.name)));
              if (exact) locationId = exact.id;
            } catch {}
          }
          const order = await createLocalRepairOrder({
            customer_name: f.customer_name,
            customer_phone: f.customer_phone,
            device_type: f.device_type,
            issue_description: f.issue_description,
            repair_location_id: locationId,
            total_price: typeof f.total_price==='number'? f.total_price : undefined,
            paid_amount: typeof f.paid_amount==='number'? f.paid_amount : undefined,
            payment_method: f.payment_method,
            price_to_be_determined_later: !!f.price_to_be_determined_later,
            received_by: undefined,
            status: 'قيد الانتظار'
          });
          await addLocalRepairHistory({ orderId: order.id, status: 'قيد الانتظار', notes: 'تم إنشاء طلبية التصليح', createdBy: 'assistant' });
          return { answer: `✅ تم إنشاء طلب التصليح للعميل ${order.customer_name} (${order.customer_phone}) لجهاز ${order.device_type || ''}. رقم الطلب: ${order.order_number || order.id}. رمز التتبع: ${order.repair_tracking_code || ''}` };
        } catch {
          return { answer: 'تعذر إنشاء طلبية التصليح.' };
        }
      }
      case 'repair_status': {
        const q = (intent as any).customerQuery || '';
        const orgId2 = opts?.organizationId || '';
        const normalizeArabicLite = (s: string) => {
          try {
            let t = (s || '').toString().toLowerCase();
            t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
            t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
            t = t.replace(/\u0624/g, '\u0648');
            t = t.replace(/\u0626/g, '\u064a');
            t = t.replace(/\u0629/g, '\u0647');
            t = t.replace(/\u0649/g, '\u064a');
            return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          } catch { return (s || '').toString().toLowerCase(); }
        };
        const nq = normalizeArabicLite(q);
        const digits = (q || '').replace(/\D+/g, '');
        const all = orgId2 ? await inventoryDB.repairOrders.where('organization_id').equals(orgId2).toArray() : await inventoryDB.repairOrders.toArray();
        const pool = all.filter((o:any) => o && (!o.pendingOperation || o.pendingOperation !== 'delete'));
        let candidates = pool;
        if (digits) {
          candidates = pool.filter((o:any) => (o.customer_phone || '').replace(/\D+/g,'').includes(digits));
        } else if (nq) {
          candidates = pool.filter((o:any) => (o.customer_name_lower || '').includes(nq));
        }
        if (!candidates.length) return { answer: `❌ لم أجد طلبات تصليح مطابقة لعبارة: ${q}` };
        if (candidates.length === 1) {
          const o = candidates[0];
          try {
            const info = await (await import('@/api/localRepairService')).computeLocalQueueInfo(o.id);
            const line = `${o.customer_name} — ${o.device_type || 'جهاز'} • الحالة: ${o.status}${info ? ` • ترتيبك في الطابور: ${info.queue_position}/${info.total_in_queue}` : ''}${o.repair_tracking_code ? ` • التتبع: ${o.repair_tracking_code}` : ''}`;
            return { answer: line };
          } catch {
            const line = `${o.customer_name} — ${o.device_type || 'جهاز'} • الحالة: ${o.status}`;
            return { answer: line };
          }
        }
        const list = candidates.slice(0, 5).map((o:any, i:number) => `${i+1}. ${o.customer_name} — ${o.device_type || 'جهاز'} • ${o.status} • ${(o.created_at||'').slice(0,10)}${o.repair_tracking_code ? ` • ${o.repair_tracking_code}` : ''}`);
        (AssistantOrchestrator as any)._pendingSelection = { type: 'repair_status', candidates: candidates.slice(0, 5), payload: {}, orgId: orgId2, createdAt: Date.now() };
        return { answer: `وجدت عدة طلبات تصليح مطابقة:\n${list.join('\n')}\nرجاءً اكتب رقم الطلبية المطلوبة (مثال: 2).` };
      }
      case 'expense_update': {
        const f = (intent as any).fields || {};
        const titleRaw: string = (f.title || '').toString().trim();
        const amount: number = Number(f.amount || 0);
        const timeframe: any = f.timeframe || 'month';
        const orgId2 = opts?.organizationId || '';

        if (!titleRaw || !(amount > 0)) {
          return { answer: 'يرجى تحديد عنوان المصروف والمبلغ الجديد بشكل صحيح.' };
        }

        try {
          const { getRangeFromTimeframe, listExpensesByRange } = await import('@/services/expenses/LocalExpenseAnalytics');
          const range = getRangeFromTimeframe(timeframe, f.start, f.end);
          const list = await listExpensesByRange(orgId2, range, {});

          // تطبيع عربي + مقياس تشابه بسيط
          const normalizeArabicLite = (s: string) => {
            try {
              let t = (s || '').toString().toLowerCase();
              t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
              t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
              t = t.replace(/\u0624/g, '\u0648');
              t = t.replace(/\u0626/g, '\u064a');
              t = t.replace(/\u0629/g, '\u0647');
              t = t.replace(/\u0649/g, '\u064a');
              return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
            } catch { return (s || '').toString().toLowerCase(); }
          };
          const bigrams = (s: string) => {
            const t = (' ' + s + ' ').replace(/\s+/g, ' ');
            const arr: string[] = [];
            for (let i = 0; i < t.length - 1; i++) arr.push(t.slice(i, i+2));
            return arr;
          };
          const dice = (a: string, b: string) => {
            const A = bigrams(a); const B = bigrams(b);
            const map = new Map<string, number>();
            A.forEach(x => map.set(x, (map.get(x) || 0) + 1));
            let inter = 0;
            B.forEach(x => { const c = map.get(x) || 0; if (c > 0) { inter += 1; map.set(x, c-1); } });
            return (2 * inter) / (A.length + B.length || 1);
          };

          const nq = normalizeArabicLite(titleRaw);
          const ranked = list.map((ex: any) => {
            const n = normalizeArabicLite(ex.title || '');
            let score = 0;
            if (n === nq) score = 1.0;
            else if (n.includes(nq) || nq.includes(n)) score = 0.94;
            else score = dice(n, nq);
            return { ...ex, _score: score };
          }).filter((x: any) => x._score >= 0.5)
            .sort((a: any, b: any) => (b._score - a._score) || ((b.date||'').localeCompare(a.date||'')));

          if (ranked.length === 0) {
            return { answer: `❌ لم أجد مصروفاً بعنوان مشابه لـ "${titleRaw}" ضمن الفترة المحددة.` };
          }

          const top = ranked[0];
          const second = ranked[1];
          const topScore = Number(top?._score || 0);
          const secondScore = Number(second?._score || 0);

          // إن كان هناك التباس واضح، اطلب الاختيار
          if ((topScore < 0.9) || (second && topScore - secondScore < 0.08)) {
            const sample = ranked.slice(0, 5).map((ex: any, i: number) => `${i+1}. ${ex.title} — ${Number(ex.amount||0).toFixed(2)} دج (${(ex.date||'').slice(0,10)})`).join('\n');
            (AssistantOrchestrator as any)._pendingSelection = { type: 'expense_update', candidates: ranked.slice(0, 5), payload: { amount }, orgId: orgId2, createdAt: Date.now() };
            return { answer: `وجدت أكثر من مصروف متشابه:\n${sample}\nرجاءً اكتب رقم المصروف المطلوب تعديله (مثال: 2).` };
          }

          // تحديث مباشر لأفضل تطابق
          const before = Number(top.amount || 0);
          const updated = await ExpenseAssistantService.updateExpenseAmount({ expenseId: top.id, amount });
          if (updated) {
            return { answer: `✅ تم تعديل المصروف "${top.title}" من ${before.toFixed(2)} دج إلى ${amount.toFixed(2)} دج.` };
          }
          return { answer: 'تعذر تعديل المصروف المطلوب.' };
        } catch {
          return { answer: 'حدث خطأ أثناء محاولة تعديل المصروف.' };
        }
      }
      case 'repair_update_status': {
        const f = (intent as any).fields || {};
        const targetStatus = String(f.status || '').trim();
        const queryStr = String(f.customerQuery || '').trim();
        const orgId2 = opts?.organizationId || '';
        if (!queryStr || !targetStatus) return { answer: 'يرجى تحديد العميل/الهاتف والحالة الجديدة.' };
        // ابحث عن الطلبات بالاسم/الهاتف
        const normalizeArabicLite = (s: string) => {
          try {
            let t = (s || '').toString().toLowerCase();
            t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
            t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
            t = t.replace(/\u0624/g, '\u0648');
            t = t.replace(/\u0626/g, '\u064a');
            t = t.replace(/\u0629/g, '\u0647');
            t = t.replace(/\u0649/g, '\u064a');
            return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          } catch { return (s || '').toString().toLowerCase(); }
        };
        const nq = normalizeArabicLite(queryStr);
        const digits = (queryStr || '').replace(/\D+/g, '');
        const all = orgId2 ? await inventoryDB.repairOrders.where('organization_id').equals(orgId2).toArray() : await inventoryDB.repairOrders.toArray();
        const pool = all.filter((o:any) => o && (!o.pendingOperation || o.pendingOperation !== 'delete'));
        let candidates = pool;
        if (digits) candidates = pool.filter((o:any)=> (o.customer_phone||'').replace(/\D+/g,'').includes(digits));
        else candidates = pool.filter((o:any)=> (o.customer_name_lower||'').includes(nq));
        if (!candidates.length) return { answer: `❌ لم أجد طلبات تصليح مطابقة لعبارة: ${queryStr}` };
        if (candidates.length === 1) {
          try {
            const { changeLocalRepairStatus } = await import('@/api/localRepairService');
            await changeLocalRepairStatus(candidates[0].id, targetStatus, 'تعديل عبر المساعد', 'assistant');
            return { answer: `✅ تم تغيير حالة طلب ${candidates[0].order_number || candidates[0].id.slice(0,8)} إلى ${targetStatus}.` };
          } catch { return { answer: 'تعذر تغيير حالة الطلب.' }; }
        }
        const list = candidates.slice(0, 5).map((o:any, i:number)=> `${i+1}. ${o.customer_name} — ${o.device_type || 'جهاز'} • ${o.status} • ${(o.created_at||'').slice(0,10)}`);
        (AssistantOrchestrator as any)._pendingSelection = { type: 'repair_update_status', candidates: candidates.slice(0,5), payload: { status: targetStatus }, orgId: orgId2, createdAt: Date.now() };
        return { answer: `وجدت عدة طلبات مطابقة:\n${list.join('\n')}\nرجاءً اكتب رقم الطلبية المطلوب تغيير حالتها.` };
      }
      case 'repair_add_payment': {
        const f = (intent as any).fields || {};
        const amount = Number(f.amount || 0);
        const queryStr = String(f.customerQuery || '').trim();
        const orgId2 = opts?.organizationId || '';
        if (!queryStr || !(amount>0)) return { answer: 'يرجى تحديد العميل/الهاتف ومبلغ صحيح.' };
        const normalizeArabicLite = (s: string) => {
          try {
            let t = (s || '').toString().toLowerCase();
            t = t.replace(/[\u064B-\u0652\u0670\u0640]/g, '');
            t = t.replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627');
            t = t.replace(/\u0624/g, '\u0648');
            t = t.replace(/\u0626/g, '\u064a');
            t = t.replace(/\u0629/g, '\u0647');
            t = t.replace(/\u0649/g, '\u064a');
            return t.replace(/[^\u0600-\u06FFa-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          } catch { return (s || '').toString().toLowerCase(); }
        };
        const nq = normalizeArabicLite(queryStr);
        const digits = (queryStr || '').replace(/\D+/g, '');
        const all = orgId2 ? await inventoryDB.repairOrders.where('organization_id').equals(orgId2).toArray() : await inventoryDB.repairOrders.toArray();
        const pool = all.filter((o:any)=> o && (!o.pendingOperation || o.pendingOperation !== 'delete'));
        let candidates = pool;
        if (digits) candidates = pool.filter((o:any)=> (o.customer_phone||'').replace(/\D+/g,'').includes(digits));
        else candidates = pool.filter((o:any)=> (o.customer_name_lower||'').includes(nq));
        if (!candidates.length) return { answer: `❌ لم أجد طلبات تصليح مطابقة لعبارة: ${queryStr}` };
        if (candidates.length === 1) {
          const o = candidates[0];
          const total = Number(o.total_price ?? 0);
          const paid = Number(o.paid_amount || 0);
          const tbd = !!o.price_to_be_determined_later || o.total_price == null;
          if (tbd || total <= 0) {
            return { answer: 'لا يمكن تسجيل دفعة قبل تحديد السعر الكلي. يرجى تحديد السعر أولاً.' };
          }
          const remaining = Math.max(0, total - paid);
          if (amount > remaining) {
            return { answer: `المبلغ يتجاوز المتبقي (${remaining} دج). يمكنك دفع حتى ${remaining} دج.` };
          }
          try {
            const { addLocalRepairPayment } = await import('@/api/localRepairService');
            await addLocalRepairPayment(o.id, amount, 'assistant');
            return { answer: `✅ تم تسجيل دفعة ${amount} دج لطلب ${o.order_number || o.id.slice(0,8)}. المتبقي: ${remaining - amount} دج` };
          } catch { return { answer: 'تعذر تسجيل الدفعة.' }; }
        }
        const list = candidates.slice(0, 5).map((o:any, i:number)=> `${i+1}. ${o.customer_name} — ${o.device_type || 'جهاز'} • ${o.status} • ${(o.created_at||'').slice(0,10)}`);
        (AssistantOrchestrator as any)._pendingSelection = { type: 'repair_add_payment', candidates: candidates.slice(0,5), payload: { amount }, orgId: orgId2, createdAt: Date.now() };
        return { answer: `وجدت عدة طلبات مطابقة:\n${list.join('\n')}\nرجاءً اكتب رقم الطلبية لإضافة الدفعة.` };
      }
      default: {
        const general = await LocalAnalyticsService.getTodaySales();
        const summary = `اليوم: ${general.totalSales.toFixed(2)} دج من ${general.orderCount} طلب`;
        return { answer: await AIGateway.summarize(query, summary, opts?.history, opts?.signal), data: general };
      }
    }
  }
};
