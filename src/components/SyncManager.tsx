import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// Scheduler معطّل لتجنب ازدواج مزامنة المخزون، نعتمد على SyncEngine فقط
// import { startSyncScheduler, triggerImmediateSync } from '@/api/syncScheduler';
import { initializePOSOfflineSync } from '@/context/shop/posOrderService';
import { SyncEngine } from '@/sync/SyncEngine';
import { inventoryDB } from '@/database/localDb';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

interface SyncManagerProps {
  autoSync?: boolean;
  syncInterval?: number;
  onSyncStatusChange?: (isSyncing: boolean) => void;
  showIndicator?: boolean;
  forceDisable?: boolean;
}

type EntitySyncStats = {
  unsynced: number;
  total: number;
};

type QueueSnapshot = {
  queueItems: number;
  products: EntitySyncStats;
  orders: EntitySyncStats;
  customers: EntitySyncStats;
};

const DEFAULT_INTERVAL = 60_000;

const SyncManager: React.FC<SyncManagerProps> = ({
  autoSync = true,
  syncInterval = DEFAULT_INTERVAL,
  onSyncStatusChange,
  showIndicator = true,
  forceDisable = false
}) => {
  const { isOnline } = useNetworkStatus();
  const { organization } = useOrganization();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [queueSnapshot, setQueueSnapshot] = useState<QueueSnapshot>({
    queueItems: 0,
    products: { unsynced: 0, total: 0 },
    orders: { unsynced: 0, total: 0 },
    customers: { unsynced: 0, total: 0 }
  });
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const syncingRef = useRef(false);
  const lastToastRef = useRef<number>(0);

  const effectiveInterval = Math.max(syncInterval, 15_000);

  const notifySyncState = useCallback(
    (state: boolean) => {
      if (onSyncStatusChange) {
        onSyncStatusChange(state);
      }
    },
    [onSyncStatusChange]
  );

  const getQueueSnapshot = useCallback(async (): Promise<QueueSnapshot> => {
    // لا تحاول الوصول للقاعدة إذا لم يتم تحميل المنظمة بعد
    if (!organization?.id) {
      return {
        queueItems: 0,
        products: { unsynced: 0, total: 0 },
        orders: { unsynced: 0, total: 0 },
        customers: { unsynced: 0, total: 0 }
      };
    }

    try {
      const [
        queueCount,
        totalProducts,
        totalOrders,
        totalCustomers,
        unsyncedProducts,
        unsyncedOrders,
        unsyncedCustomers
      ] = await Promise.all([
        inventoryDB.syncQueue.count(),
        inventoryDB.products.count(),
        inventoryDB.posOrders.count(),
        inventoryDB.customers.count(),
        inventoryDB.products.filter((product) => product.synced === false).count(),
        // الطلبيات تستخدم status بدلاً من synced
        inventoryDB.posOrders.filter((order) => 
          order.status === 'pending_sync' || 
          order.status === 'syncing' || 
          order.status === 'failed' ||
          order.synced === false
        ).count(),
        inventoryDB.customers.filter((customer) => customer.synced === false).count()
      ]);

      return {
        queueItems: queueCount,
        products: { unsynced: unsyncedProducts, total: totalProducts },
        orders: { unsynced: unsyncedOrders, total: totalOrders },
        customers: { unsynced: unsyncedCustomers, total: totalCustomers }
      };
    } catch (error) {
      console.error('[SyncManager] فشل في قراءة بيانات المزامنة المحلية', error);
      return {
        queueItems: 0,
        products: { unsynced: 0, total: 0 },
        orders: { unsynced: 0, total: 0 },
        customers: { unsynced: 0, total: 0 }
      };
    }
  }, [organization?.id]);

  const updateSnapshot = useCallback(async () => {
    const snapshot = await getQueueSnapshot();
    setQueueSnapshot(snapshot);
  }, [getQueueSnapshot]);

  const runSync = useCallback(
    async (origin: 'auto' | 'manual' | 'network' = 'auto') => {
      // لا تحاول المزامنة إذا لم يتم تحميل المنظمة بعد
      if (!organization?.id) {
        return;
      }

      if (forceDisable) {
        return;
      }

      // إذا كانت المزامنة يدوية، نحاول حتى لو كان isOnline false
      // (قد يكون هناك خطأ في الكشف)
      if (!isOnline && origin !== 'manual') {
        await updateSnapshot();
        return;
      }

      if (syncingRef.current) {
        return;
      }

      syncingRef.current = true;
      setIsSyncing(true);
      notifySyncState(true);
      setLastSyncError(null);

      initializePOSOfflineSync();

      try {
        const res = await SyncEngine.run();

        const now = Date.now();
        setLastSyncAt(now);

        const processed = (res?.posOrders?.synced || 0) + (res?.posOrderUpdates?.synced || 0);
        const baseDone = !!res?.baseSynced;

        if (origin === 'manual' || origin === 'network') {
          if (processed > 0) {
            toast.success('تمت مزامنة الطلبات بنجاح', {
              description: `تم تحديث ${processed} سجل${processed > 1 ? 'ات' : ''}.`
            });
          } else if (baseDone) {
            toast.success('تم تحديث البيانات المحلية');
          } else {
            // لا شيء مُعالج، نعرض إشعار خفيف فقط عند التنفيذ اليدوي
            toast.message('لا توجد عناصر لمزامنتها الآن');
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'فشل في مزامنة البيانات، سيتم إعادة المحاولة تلقائياً';
        setLastSyncError(message);

        const now = Date.now();
        if (origin === 'manual' || now - lastToastRef.current > 45_000) {
          toast.error('تعذر إكمال المزامنة', {
            description: message
          });
          lastToastRef.current = now;
        }
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
        notifySyncState(false);
        await updateSnapshot();
      }
    },
    [forceDisable, isOnline, notifySyncState, updateSnapshot]
  );

  useEffect(() => {
    if (!autoSync || forceDisable) {
      return;
    }

    // تم تعطيل مُجدول الصف لمنع الازدواج. SyncEngine يدير المزامنة مركزياً.

    syncTimerRef.current = setInterval(() => {
      void runSync('auto');
    }, effectiveInterval);

    return () => {
      if (syncTimerRef.current) {
        clearInterval(syncTimerRef.current);
        syncTimerRef.current = null;
      }
    };
  }, [autoSync, effectiveInterval, forceDisable, runSync]);

  useEffect(() => {
    void updateSnapshot();
  }, [updateSnapshot]);

  useEffect(() => {
    if (forceDisable) {
      return;
    }

    const handleOnline = () => {
      void runSync('network');
      // تم تعطيل triggerImmediateSync لتفادي الازدواج
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [forceDisable, runSync]);

  const statusLabel = useMemo(() => {
    const pendingCount =
      queueSnapshot.queueItems +
      queueSnapshot.products.unsynced +
      queueSnapshot.orders.unsynced +
      queueSnapshot.customers.unsynced;

    if (!isOnline) {
      return 'وضع عدم الاتصال';
    }
    if (isSyncing) {
      return 'جارٍ المزامنة...';
    }
    if (pendingCount > 0) {
      return 'بانتظار المزامنة';
    }
    return 'متزامن';
  }, [
    isOnline,
    isSyncing,
    queueSnapshot.queueItems,
    queueSnapshot.products.unsynced,
    queueSnapshot.orders.unsynced,
    queueSnapshot.customers.unsynced
  ]);

  // إخفاء المؤشر السفلي - الآن لدينا أيقونة في الـ Navbar
  if (forceDisable || !showIndicator) {
    return null;
  }

  // إخفاء المؤشر السفلي بشكل افتراضي
  return null;

  /* المكون القديم - معطل الآن
  return (
    <div className="fixed bottom-4 left-4 z-50 w-[260px] rounded-xl border border-border/60 bg-background/95 shadow-lg backdrop-blur-md">
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-foreground">حالة المزامنة</p>
          <p className="text-xs text-muted-foreground">{statusLabel}</p>
          {lastSyncAt && (
            <p className="mt-1 text-[11px] text-muted-foreground">
              آخر مزامنة: {new Date(lastSyncAt).toLocaleTimeString()}
            </p>
          )}
          <p className="mt-1 text-[11px] text-muted-foreground">
            عناصر قائمة الانتظار: {queueSnapshot.queueItems}
          </p>
          {lastSyncError && (
            <p className="mt-1 text-[11px] text-destructive">{lastSyncError}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => runSync('manual')}
          disabled={isSyncing || !isOnline}
          className="rounded-md bg-primary/90 px-3 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary disabled:cursor-not-allowed disabled:bg-muted"
        >
          مزامنة الآن
        </button>
      </div>
      <div className="grid grid-cols-3 border-t border-border/40 bg-muted/40 px-3 py-2 text-center text-[11px] text-muted-foreground">
        <div>
          <p className="font-semibold text-foreground">
            {queueSnapshot.products.unsynced}
            <span className="text-[10px] text-muted-foreground">
              /{queueSnapshot.products.total}
            </span>
          </p>
          <p>منتجات</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {queueSnapshot.orders.unsynced}
            <span className="text-[10px] text-muted-foreground">
              /{queueSnapshot.orders.total}
            </span>
          </p>
          <p>طلبات</p>
        </div>
        <div>
          <p className="font-semibold text-foreground">
            {queueSnapshot.customers.unsynced}
            <span className="text-[10px] text-muted-foreground">
              /{queueSnapshot.customers.total}
            </span>
          </p>
          <p>عملاء</p>
        </div>
      </div>
    </div>
  );
  */
};

export default SyncManager;
