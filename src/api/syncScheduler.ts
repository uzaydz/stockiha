import { inventoryDB, SyncQueueItem } from '@/database/localDb';
import { syncInventoryData } from '@/lib/db/inventoryDB';

type SyncResult = { processed: number; failed: number };

const JITTER = () => Math.floor(Math.random() * 500);

function backoffDelay(attempts: number): number {
  const base = Math.min(60_000, 2 ** Math.min(attempts, 6) * 1000); // capped exponential backoff
  return base + JITTER();
}

async function processQueueBatch(limit = 20): Promise<SyncResult> {
  const items = await inventoryDB.syncQueue
    .orderBy('priority')
    .limit(limit)
    .toArray();

  if (items.length === 0) return { processed: 0, failed: 0 };

  let processed = 0;
  let failed = 0;

  for (const item of items) {
    try {
      // Route per objectType
      if (item.objectType === 'inventory') {
        await syncInventoryData();
      }
      // TODO: hook product/customer/order handlers here (POS RPC, etc.)

      await inventoryDB.syncQueue.delete(item.id);
      processed++;
    } catch (error) {
      const attempts = (item.attempts || 0) + 1;
      const now = new Date().toISOString();
      const updated: SyncQueueItem = {
        ...item,
        attempts,
        lastAttempt: now,
        updatedAt: now,
        error: error instanceof Error ? error.message : String(error)
      };
      await inventoryDB.syncQueue.put(updated);
      failed++;
    }
  }

  return { processed, failed };
}

let running = false;
let timer: number | null = null as unknown as number;

export async function runSyncSchedulerOnce(): Promise<SyncResult> {
  if (running) return { processed: 0, failed: 0 };
  running = true;
  try {
    // Prefer inventory batching first
    const result = await processQueueBatch(25);
    return result;
  } finally {
    running = false;
  }
}

export function startSyncScheduler(): void {
  if (timer) return;
  const loop = async () => {
    try {
      const pending = await inventoryDB.syncQueue.count();
      if (pending === 0) {
        timer = window.setTimeout(loop, 30_000);
        return;
      }
      const snapshot = await inventoryDB.syncQueue
        .orderBy('priority')
        .first();
      const delay = backoffDelay(snapshot?.attempts || 0);
      await runSyncSchedulerOnce();
      timer = window.setTimeout(loop, Math.max(3_000, delay));
    } catch {
      timer = window.setTimeout(loop, 10_000);
    }
  };
  timer = window.setTimeout(loop, 3_000);
}

export function stopSyncScheduler(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null as unknown as number;
  }
}

export async function triggerImmediateSync(): Promise<void> {
  await runSyncSchedulerOnce();
}


