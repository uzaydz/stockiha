import { synchronizeWithServer } from '@/api/syncService';
import { syncPendingPOSOrders, syncPendingPOSOrderUpdates } from '@/context/shop/posOrderService';
import { syncPendingWorkSessions } from '@/api/localWorkSessionService';
import { syncInventoryData } from '@/lib/db/inventoryDB';
import { syncPendingCustomerDebts } from '@/api/syncCustomerDebts';
import { syncPendingProductReturns } from '@/api/syncProductReturns';
import { syncPendingLossDeclarations } from '@/api/syncLossDeclarations';
import { syncPendingInvoices } from '@/api/syncInvoices';

export interface SyncEngineResult {
  baseSynced: boolean;
  posOrders: { synced: number; failed: number };
  posOrderUpdates: { synced: number; failed: number };
  workSessions: number; // عدد الجلسات التي تمت مزامنتها (إن لزم). غير متاح حالياً من API، سنعيد -1 كقيمة معنوية
  inventory: number; // عدد معاملات المخزون المتزامنة
  customerDebts: { synced: number; failed: number }; // ديون العملاء
  productReturns: { synced: number; failed: number }; // إرجاع المنتجات
  lossDeclarations: { synced: number; failed: number }; // التصريح بالخسائر
  invoices: { synced: number; failed: number }; // الفواتير
  timings?: Record<string, number>;
  attempts?: Record<string, number>;
}

class SyncEngineClass {
  private runningPromise: Promise<SyncEngineResult> | null = null;
  private lastRunAt: number | null = null;
  private listeners = new Set<(status: { phase: string; timestamp: number; data?: any }) => void>();

  isRunning(): boolean {
    return this.runningPromise != null;
  }

  getLastRunAt(): number | null {
    return this.lastRunAt;
  }

  onStatus(cb: (status: { phase: string; timestamp: number; data?: any }) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(phase: string, data?: any) {
    const payload = { phase, timestamp: Date.now(), data };
    for (const cb of this.listeners) {
      try { cb(payload); } catch { /* ignore */ }
    }
  }

  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async runWithRetry<T>(label: string, fn: () => Promise<T>, maxAttempts = 3): Promise<{ ok: boolean; value?: T; attempts: number; duration: number }> {
    const start = performance.now();
    let attempt = 0;
    while (attempt < maxAttempts) {
      attempt++;
      try {
        this.notify(`${label}:start`, { attempt });
        const v = await fn();
        const dur = performance.now() - start;
        this.notify(`${label}:success`, { attempt, duration: dur });
        return { ok: true, value: v, attempts: attempt, duration: dur };
      } catch {
        if (attempt >= maxAttempts) {
          const dur = performance.now() - start;
          this.notify(`${label}:failed`, { attempts: attempt, duration: dur });
          return { ok: false, attempts: attempt, duration: dur };
        }
        const backoff = Math.min(2000 * attempt, 6000);
        this.notify(`${label}:retry`, { attempt, backoff });
        await this.delay(backoff);
      }
    }
    const duration = performance.now() - start;
    return { ok: false, attempts: maxAttempts, duration };
  }

  async run(): Promise<SyncEngineResult> {
    if (this.runningPromise) {
      return this.runningPromise;
    }
    this.runningPromise = this._run();
    try {
      const res = await this.runningPromise;
      return res;
    } finally {
      this.lastRunAt = Date.now();
      this.runningPromise = null;
    }
  }

  private async _run(): Promise<SyncEngineResult> {
    this.notify('start');
    const result: SyncEngineResult = {
      baseSynced: false,
      posOrders: { synced: 0, failed: 0 },
      posOrderUpdates: { synced: 0, failed: 0 },
      workSessions: -1,
      inventory: 0,
      customerDebts: { synced: 0, failed: 0 },
      productReturns: { synced: 0, failed: 0 },
      lossDeclarations: { synced: 0, failed: 0 },
      invoices: { synced: 0, failed: 0 },
      timings: {},
      attempts: {}
    };

    const useParallel = String((import.meta as any)?.env?.VITE_SYNCENGINE_PARALLEL ?? 'true') !== 'false';

    let base, orders, updates, sessions, inventory, debts, returns, losses, invoices;
    if (useParallel) {
      // تنفيذ متوازي مع تكرار تلقائي عند الفشل لكل مهمة
      [base, orders, updates, sessions, inventory, debts, returns, losses, invoices] = await Promise.all([
        this.runWithRetry('base', async () => {
          this.notify('base');
          return await synchronizeWithServer();
        }),
        this.runWithRetry('orders', async () => {
          this.notify('orders');
          return await syncPendingPOSOrders();
        }),
        this.runWithRetry('orderUpdates', async () => {
          this.notify('orderUpdates');
          return await syncPendingPOSOrderUpdates();
        }),
        this.runWithRetry('workSessions', async () => {
          this.notify('workSessions');
          await syncPendingWorkSessions();
          return -1;
        }),
        this.runWithRetry('inventory', async () => {
          this.notify('inventory');
          return await syncInventoryData();
        }),
        this.runWithRetry('customerDebts', async () => {
          this.notify('customerDebts');
          return await syncPendingCustomerDebts();
        }),
        this.runWithRetry('productReturns', async () => {
          this.notify('productReturns');
          return await syncPendingProductReturns();
        }),
        this.runWithRetry('lossDeclarations', async () => {
          this.notify('lossDeclarations');
          return await syncPendingLossDeclarations();
        }),
        this.runWithRetry('invoices', async () => {
          this.notify('invoices');
          return await syncPendingInvoices();
        })
      ]);
    } else {
      // تنفيذ تسلسلي لتخفيف الضغط على الـ API
      base = await this.runWithRetry('base', async () => {
        this.notify('base');
        return await synchronizeWithServer();
      });
      orders = await this.runWithRetry('orders', async () => {
        this.notify('orders');
        return await syncPendingPOSOrders();
      });
      updates = await this.runWithRetry('orderUpdates', async () => {
        this.notify('orderUpdates');
        return await syncPendingPOSOrderUpdates();
      });
      sessions = await this.runWithRetry('workSessions', async () => {
        this.notify('workSessions');
        await syncPendingWorkSessions();
        return -1;
      });
      inventory = await this.runWithRetry('inventory', async () => {
        this.notify('inventory');
        return await syncInventoryData();
      });
      debts = await this.runWithRetry('customerDebts', async () => {
        this.notify('customerDebts');
        return await syncPendingCustomerDebts();
      });
      returns = await this.runWithRetry('productReturns', async () => {
        this.notify('productReturns');
        return await syncPendingProductReturns();
      });
      losses = await this.runWithRetry('lossDeclarations', async () => {
        this.notify('lossDeclarations');
        return await syncPendingLossDeclarations();
      });
      invoices = await this.runWithRetry('invoices', async () => {
        this.notify('invoices');
        return await syncPendingInvoices();
      });
    }

    result.baseSynced = !!base.value;
    if (orders.value) result.posOrders = orders.value as any;
    if (updates.value) result.posOrderUpdates = updates.value as any;
    if (sessions.value != null) result.workSessions = sessions.value as number;
    if (inventory.value != null) result.inventory = (inventory.value as number) || 0;
    if (debts.value) result.customerDebts = debts.value as any;
    if (returns.value) result.productReturns = returns.value as any;
    if (losses.value) result.lossDeclarations = losses.value as any;
    if (invoices.value) result.invoices = invoices.value as any;

    result.timings!['base'] = Math.round(base.duration);
    result.timings!['orders'] = Math.round(orders.duration);
    result.timings!['orderUpdates'] = Math.round(updates.duration);
    result.timings!['workSessions'] = Math.round(sessions.duration);
    result.timings!['inventory'] = Math.round(inventory.duration);
    result.timings!['customerDebts'] = Math.round(debts.duration);
    result.timings!['productReturns'] = Math.round(returns.duration);
    result.timings!['lossDeclarations'] = Math.round(losses.duration);
    result.timings!['invoices'] = Math.round(invoices.duration);

    result.attempts!['base'] = base.attempts;
    result.attempts!['orders'] = orders.attempts;
    result.attempts!['orderUpdates'] = updates.attempts;
    result.attempts!['workSessions'] = sessions.attempts;
    result.attempts!['inventory'] = inventory.attempts;
    result.attempts!['customerDebts'] = debts.attempts;
    result.attempts!['productReturns'] = returns.attempts;
    result.attempts!['lossDeclarations'] = losses.attempts;
    result.attempts!['invoices'] = invoices.attempts;

    this.notify('done', { timings: result.timings, attempts: result.attempts });

    return result;
  }
}

export const SyncEngine = new SyncEngineClass();
