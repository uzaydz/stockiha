import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Cloud, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { initializePOSOfflineSync } from '@/context/shop/posOrderService';
import { SyncEngine } from '@/sync/SyncEngine';
import { inventoryDB } from '@/database/localDb';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { toast } from 'sonner';

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

interface NavbarSyncIndicatorProps {
  className?: string;
  autoSync?: boolean;
  syncInterval?: number;
}

export function NavbarSyncIndicator({
  className,
  autoSync = true,
  syncInterval = 60000
}: NavbarSyncIndicatorProps) {
  // التحقق من أن التطبيق مكتبي (Electron)
  const isElectron = useMemo(
    () => typeof window !== 'undefined' && Boolean((window as any).electronAPI),
    []
  );

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
  const [isOpen, setIsOpen] = useState(false);
  const syncingRef = React.useRef(false);
  const [events, setEvents] = useState<Array<{ phase: string; timestamp: number; data?: any }>>([]);
  const [lastRun, setLastRun] = useState<any>(null);

  const getQueueSnapshot = useCallback(async (): Promise<QueueSnapshot> => {
    // تحقق من وجود organization_id
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
        inventoryDB.posOrders.filter((order) => 
          order.status === 'pending_sync' || 
          order.status === 'syncing' || 
          order.status === 'failed' ||
          order.synced === false
        ).count(),
        inventoryDB.customers.filter((customer) => customer.synced === false).count()
      ]);

      console.log('[NavbarSync] إحصائيات القاعدة المحلية:', {
        products: totalProducts,
        orders: totalOrders,
        customers: totalCustomers,
        unsyncedProducts,
        unsyncedOrders,
        unsyncedCustomers
      });

      return {
        queueItems: queueCount,
        products: { unsynced: unsyncedProducts, total: totalProducts },
        orders: { unsynced: unsyncedOrders, total: totalOrders },
        customers: { unsynced: unsyncedCustomers, total: totalCustomers }
      };
    } catch (error) {
      console.error('[NavbarSync] فشل في قراءة بيانات المزامنة', error);
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
    async (origin: 'auto' | 'manual' = 'auto') => {
      // لا تحاول المزامنة إذا لم يتم تحميل المنظمة بعد
      if (!organization?.id) {
        return;
      }

      if (!isOnline && origin !== 'manual') {
        await updateSnapshot();
        return;
      }

      if (syncingRef.current) {
        return;
      }

      syncingRef.current = true;
      setIsSyncing(true);
      setLastSyncError(null);

      initializePOSOfflineSync();

      try {
        const res = await SyncEngine.run();

        const now = Date.now();
        setLastSyncAt(now);
        setLastRun(res);

        if (origin === 'manual') {
          const processed = (res?.posOrders?.synced || 0) + (res?.posOrderUpdates?.synced || 0);
          if (processed > 0) {
            toast.success('تمت مزامنة الطلبات بنجاح', {
              description: `تم تحديث ${processed} سجل${processed > 1 ? 'ات' : ''}.`
            });
          } else if (res?.baseSynced) {
            toast.success('تم تحديث البيانات المحلية');
          } else {
            toast.message('لا توجد عناصر لمزامنتها الآن');
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'فشل في مزامنة البيانات';
        setLastSyncError(message);

        if (origin === 'manual') {
          toast.error('تعذر إكمال المزامنة', {
            description: message
          });
        }
      } finally {
        syncingRef.current = false;
        setIsSyncing(false);
        await updateSnapshot();
      }
    },
    [organization?.id, isOnline, updateSnapshot]
  );

  // Auto sync
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(() => {
      void runSync('auto');
    }, syncInterval);

    return () => clearInterval(interval);
  }, [autoSync, syncInterval, runSync]);

  // Initial snapshot
  useEffect(() => {
    void updateSnapshot();
  }, [updateSnapshot]);

  // Subscribe to SyncEngine status events
  useEffect(() => {
    const off = SyncEngine.onStatus((evt) => {
      setEvents(prev => {
        const next = [...prev, evt];
        // احتفظ بآخر 20 حدثاً فقط
        return next.slice(-20);
      });
    });
    return () => off();
  }, []);

  // Sync on network reconnect
  useEffect(() => {
    const handleOnline = () => {
      void runSync('auto');
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [runSync]);

  const pendingCount = useMemo(() => 
    queueSnapshot.queueItems +
    queueSnapshot.products.unsynced +
    queueSnapshot.orders.unsynced +
    queueSnapshot.customers.unsynced,
    [queueSnapshot]
  );

  const statusLabel = useMemo(() => {
    if (!isOnline) return 'غير متصل';
    if (isSyncing) return 'جارٍ المزامنة...';
    if (pendingCount > 0) return 'بانتظار المزامنة';
    return 'متزامن';
  }, [isOnline, isSyncing, pendingCount]);

  const getStatusIcon = () => {
    if (!isOnline) return <CloudOff className="h-4 w-4" />;
    if (isSyncing) return <RefreshCw className="h-4 w-4 animate-spin" />;
    if (lastSyncError) return <AlertCircle className="h-4 w-4" />;
    if (pendingCount > 0) return <Cloud className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (!isOnline) return 'text-white/40';
    if (isSyncing) return 'text-blue-400';
    if (lastSyncError) return 'text-red-400';
    if (pendingCount > 0) return 'text-amber-400';
    return 'text-green-400';
  };

  // إخفاء المكون في المتصفح - يظهر فقط في تطبيق سطح المكتب
  if (!isElectron) {
    return null;
  }

  // لا تعرض المكون حتى يتم تحميل المنظمة
  if (!organization?.id) {
    return null;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative flex items-center justify-center h-7 w-7",
            "rounded-md transition-all duration-200",
            "hover:bg-white/15 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20",
            getStatusColor(),
            className
          )}
          aria-label="حالة المزامنة"
          title={statusLabel}
        >
          {/* أيقونة الحالة */}
          <div className="relative z-10 transition-colors duration-200">
            {getStatusIcon()}
          </div>

          {/* Badge للعناصر المعلقة */}
          {pendingCount > 0 && !isSyncing && (
            <span 
              className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 flex items-center justify-center text-[9px] font-semibold rounded-full bg-red-500 text-white border border-slate-900"
            >
              {pendingCount > 9 ? '9+' : pendingCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-sm">حالة المزامنة</h4>
              <p className="text-xs text-muted-foreground">{statusLabel}</p>
            </div>
            <Button
              size="sm"
              onClick={() => runSync('manual')}
              disabled={isSyncing || !isOnline}
              className="h-8"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="h-3 w-3 ml-1 animate-spin" />
                  جارٍ المزامنة
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 ml-1" />
                  مزامنة الآن
                </>
              )}
            </Button>
          </div>

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-foreground">
                {queueSnapshot.products.unsynced}
                <span className="text-xs text-muted-foreground">
                  /{queueSnapshot.products.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">منتجات</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-foreground">
                {queueSnapshot.orders.unsynced}
                <span className="text-xs text-muted-foreground">
                  /{queueSnapshot.orders.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">طلبات</p>
            </div>
            <div className="p-2 rounded-lg bg-muted/50">
              <p className="text-lg font-bold text-foreground">
                {queueSnapshot.customers.unsynced}
                <span className="text-xs text-muted-foreground">
                  /{queueSnapshot.customers.total}
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">عملاء</p>
            </div>
          </div>

          {/* Last run timings/attempts */}
          {lastRun?.timings && (
            <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground">
              <div className="font-semibold mb-1 text-foreground text-xs">تفاصيل آخر مزامنة</div>
              <div className="grid grid-cols-2 gap-1">
                <div>الأساس: {lastRun.timings.base}ms (محاولات {lastRun.attempts?.base})</div>
                <div>الطلبات: {lastRun.timings.orders}ms (محاولات {lastRun.attempts?.orders})</div>
                <div>تحديثات: {lastRun.timings.orderUpdates}ms (محاولات {lastRun.attempts?.orderUpdates})</div>
                <div>الجلسات: {lastRun.timings.workSessions}ms (محاولات {lastRun.attempts?.workSessions})</div>
                <div>المخزون: {lastRun.timings.inventory}ms (محاولات {lastRun.attempts?.inventory})</div>
              </div>
            </div>
          )}

          {/* Recent events */}
          {events.length > 0 && (
            <div className="rounded-lg bg-muted/40 p-2 text-[11px] text-muted-foreground max-h-40 overflow-auto">
              <div className="font-semibold mb-1 text-foreground text-xs">سجل المزامنة (الأحدث)</div>
              <ul className="space-y-1">
                {[...events].reverse().map((e, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="truncate mr-2">{e.phase}</span>
                    <span className="opacity-70">{new Date(e.timestamp).toLocaleTimeString('ar-DZ')}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Last Sync Info */}
          {lastSyncAt && (
            <div className="text-xs text-muted-foreground text-center">
              آخر مزامنة: {new Date(lastSyncAt).toLocaleTimeString('ar-SA')}
            </div>
          )}

          {/* Error Message */}
          {lastSyncError && (
            <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20">
              <p className="text-xs text-destructive">{lastSyncError}</p>
            </div>
          )}

          {/* Queue Info */}
          <div className="text-xs text-muted-foreground text-center">
            عناصر قائمة الانتظار: {queueSnapshot.queueItems}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
