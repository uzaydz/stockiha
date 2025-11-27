/**
 * ⚡ Hook لجلب إحصائيات المزامنة من SQLite
 * 
 * يستخدم استعلام SQL واحد لجلب كل الإحصائيات دفعة واحدة
 * بدلاً من 12+ استعلام منفصل
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { tauriQuery } from '@/lib/db/tauriSqlClient';
import { deltaSyncEngine, outboxManager } from '@/lib/sync/delta';
import type { SyncSnapshot, OutboxDetails } from './types';
import { EMPTY_SNAPSHOT } from './types';

const isDev = process.env.NODE_ENV === 'development';

// ⚡ بناء استعلام SQL ديناميكياً مع الـ orgId
// الجداول الموجودة في tauriSchema.ts:
// - products ✅
// - customers ✅
// - pos_orders ✅
// - invoices ✅
// - work_sessions ✅
// - repair_orders ✅
// - product_returns ✅
// - customer_debts ✅
// - employees ✅
// - suppliers ✅
// ❌ expenses غير موجود
function buildStatsSQL(orgId: string): string {
  // استعلامات آمنة - تعيد 0 إذا الجدول غير موجود
  // ⚡ المنتجات: فقط النشطة (is_active = 1) لتتطابق مع ما يظهر في نقطة البيع
  return `
    SELECT 
      COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = '${orgId}' AND (is_active = 1 OR is_active IS NULL)), 0) as total_products,
      COALESCE((SELECT COUNT(*) FROM products WHERE organization_id = '${orgId}' AND (is_active = 1 OR is_active IS NULL) AND synced = 0), 0) as unsynced_products,
      COALESCE((SELECT COUNT(*) FROM customers WHERE organization_id = '${orgId}'), 0) as total_customers,
      COALESCE((SELECT COUNT(*) FROM customers WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_customers,
      COALESCE((SELECT COUNT(*) FROM pos_orders WHERE organization_id = '${orgId}'), 0) as total_orders,
      COALESCE((SELECT COUNT(*) FROM pos_orders WHERE organization_id = '${orgId}' AND (synced = 0 OR synced IS NULL OR status IN ('pending_sync', 'syncing', 'failed'))), 0) as unsynced_orders,
      COALESCE((SELECT COUNT(*) FROM invoices WHERE organization_id = '${orgId}'), 0) as total_invoices,
      COALESCE((SELECT COUNT(*) FROM invoices WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_invoices,
      COALESCE((SELECT COUNT(*) FROM work_sessions WHERE organization_id = '${orgId}'), 0) as total_sessions,
      COALESCE((SELECT COUNT(*) FROM work_sessions WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_sessions,
      COALESCE((SELECT COUNT(*) FROM repair_orders WHERE organization_id = '${orgId}'), 0) as total_repairs,
      COALESCE((SELECT COUNT(*) FROM repair_orders WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_repairs,
      COALESCE((SELECT COUNT(*) FROM product_returns WHERE organization_id = '${orgId}'), 0) as total_returns,
      COALESCE((SELECT COUNT(*) FROM product_returns WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_returns,
      COALESCE((SELECT COUNT(*) FROM customer_debts WHERE organization_id = '${orgId}'), 0) as total_debts,
      COALESCE((SELECT COUNT(*) FROM customer_debts WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_debts
  `;
}

// استعلام منفصل للموردين والموظفين (قد لا يكون الجدول موجوداً)
function buildSuppliersEmployeesSQL(orgId: string): string {
  return `
    SELECT 
      COALESCE((SELECT COUNT(*) FROM suppliers WHERE organization_id = '${orgId}'), 0) as total_suppliers,
      COALESCE((SELECT COUNT(*) FROM suppliers WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_suppliers,
      COALESCE((SELECT COUNT(*) FROM employees WHERE organization_id = '${orgId}'), 0) as total_employees,
      COALESCE((SELECT COUNT(*) FROM employees WHERE organization_id = '${orgId}' AND synced = 0), 0) as unsynced_employees
  `;
}

interface UseSyncStatsOptions {
  organizationId: string | undefined;
  isOnline: boolean;
}

interface UseSyncStatsResult {
  snapshot: SyncSnapshot;
  outboxDetails: OutboxDetails | null;
  pendingOutbox: number;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSyncStats({ organizationId, isOnline }: UseSyncStatsOptions): UseSyncStatsResult {
  const [snapshot, setSnapshot] = useState<SyncSnapshot>(EMPTY_SNAPSHOT);
  const [outboxDetails, setOutboxDetails] = useState<OutboxDetails | null>(null);
  const [pendingOutbox, setPendingOutbox] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // منع التحديثات المتكررة
  const lastFetchRef = useRef<number>(0);
  const MIN_FETCH_INTERVAL = 2000; // ⚡ 2 ثانية بين كل تحديث (لتجنب القراءة أثناء الكتابة)
  const isSyncingRef = useRef<boolean>(false); // ⚡ منع القراءة أثناء المزامنة

  // ⚡ الاستماع لبدء وانتهاء المزامنة
  useEffect(() => {
    const handleSyncStart = () => {
      isSyncingRef.current = true;
    };
    const handleSyncEnd = () => {
      isSyncingRef.current = false;
    };

    window.addEventListener('sync-started', handleSyncStart);
    window.addEventListener('delta-sync-complete', handleSyncEnd);
    window.addEventListener('sync-error', handleSyncEnd);
    
    return () => {
      window.removeEventListener('sync-started', handleSyncStart);
      window.removeEventListener('delta-sync-complete', handleSyncEnd);
      window.removeEventListener('sync-error', handleSyncEnd);
    };
  }, []);

  const fetchStats = useCallback(async () => {
    if (!organizationId) {
      setSnapshot(EMPTY_SNAPSHOT);
      return;
    }

    // ⚡ لا تقرأ الإحصائيات أثناء المزامنة (لتجنب الأرقام المتغيرة)
    if (isSyncingRef.current) {
      return;
    }

    // منع التحديثات المتكررة
    const now = Date.now();
    if (now - lastFetchRef.current < MIN_FETCH_INTERVAL) {
      return;
    }
    lastFetchRef.current = now;

    setIsLoading(true);
    setError(null);

    try {
      // ⚡ استعلام واحد لكل الإحصائيات
      const sql = buildStatsSQL(organizationId);
      const result = await tauriQuery(organizationId, sql, []);
      
      if (isDev) {
        console.log('[useSyncStats] Query result:', { 
          success: result.success, 
          hasData: !!result.data?.[0],
          error: result.error 
        });
      }
      
      if (result.success && result.data?.[0]) {
        const row = result.data[0];
        
        const newSnapshot: SyncSnapshot = {
          products: { 
            total: row.total_products || 0, 
            unsynced: row.unsynced_products || 0 
          },
          orders: { 
            total: row.total_orders || 0, 
            unsynced: row.unsynced_orders || 0 
          },
          customers: { 
            total: row.total_customers || 0, 
            unsynced: row.unsynced_customers || 0 
          },
          invoices: { 
            total: row.total_invoices || 0, 
            unsynced: row.unsynced_invoices || 0 
          },
          workSessions: { 
            total: row.total_sessions || 0, 
            unsynced: row.unsynced_sessions || 0 
          },
          repairs: { 
            total: row.total_repairs || 0, 
            unsynced: row.unsynced_repairs || 0 
          },
          returns: { 
            total: row.total_returns || 0, 
            unsynced: row.unsynced_returns || 0 
          },
          debts: { 
            total: row.total_debts || 0, 
            unsynced: row.unsynced_debts || 0 
          },
          suppliers: { total: 0, unsynced: 0 },
          employees: { total: 0, unsynced: 0 },
          outbox: 0 // سيتم تحديثه من Delta Sync
        };

        // ⚡ جلب إحصائيات الموردين والموظفين بشكل منفصل (قد لا تكون الجداول موجودة)
        try {
          const suppEmpSQL = buildSuppliersEmployeesSQL(organizationId);
          const suppEmpResult = await tauriQuery(organizationId, suppEmpSQL, []);
          if (suppEmpResult.success && suppEmpResult.data?.[0]) {
            const suppEmpRow = suppEmpResult.data[0];
            newSnapshot.suppliers = {
              total: suppEmpRow.total_suppliers || 0,
              unsynced: suppEmpRow.unsynced_suppliers || 0
            };
            newSnapshot.employees = {
              total: suppEmpRow.total_employees || 0,
              unsynced: suppEmpRow.unsynced_employees || 0
            };
          }
        } catch {
          // الجداول غير موجودة - نتجاهل الخطأ
        }

        // ⚡ جلب حالة Outbox من Delta Sync
        try {
          const deltaStatus = await deltaSyncEngine.getStatus();
          
          // ⚡ تجاهل إذا لم يتم تهيئة Delta Sync بعد
          if (!deltaStatus.isInitialized) {
            if (isDev) {
              console.log('[useSyncStats] ⏳ Delta Sync not initialized yet');
            }
            setPendingOutbox(0);
            setOutboxDetails(null);
          } else {
            newSnapshot.outbox = deltaStatus.pendingOutboxCount || 0;
            setPendingOutbox(deltaStatus.pendingOutboxCount || 0);

            // جلب تفاصيل Outbox إذا كانت هناك عناصر معلقة
            if (deltaStatus.pendingOutboxCount > 0) {
              const stats = await outboxManager.getStats();
              setOutboxDetails({
                byTable: stats.byTable,
                byOperation: stats.byOperation,
                pending: stats.pending,
                failed: stats.failed,
                sending: stats.sending
              });

              if (isDev) {
                console.log('[useSyncStats] 📊 Outbox:', {
                  total: stats.total,
                  pending: stats.pending,
                  failed: stats.failed
                });
              }
            } else {
              setOutboxDetails(null);
            }
          }
        } catch {
          // Delta قد لا يكون مُهيأ
          setPendingOutbox(0);
          setOutboxDetails(null);
        }

        setSnapshot(newSnapshot);

        if (isDev) {
          const totalUnsynced = 
            newSnapshot.products.unsynced +
            newSnapshot.orders.unsynced +
            newSnapshot.customers.unsynced +
            newSnapshot.invoices.unsynced +
            newSnapshot.outbox;
          
          if (totalUnsynced > 0) {
            console.log('[useSyncStats] 📊 Stats:', {
              unsynced: totalUnsynced,
              outbox: newSnapshot.outbox
            });
          }
        }
      } else {
        // فشل الاستعلام - ربما الجداول غير موجودة
        if (isDev && result.error) {
          console.warn('[useSyncStats] Query failed:', result.error);
        }
        setSnapshot(EMPTY_SNAPSHOT);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطأ في جلب الإحصائيات';
      setError(message);
      if (isDev) {
        console.error('[useSyncStats] Error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  // ⚡ تحديث أولي
  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  // ⚡ الاستماع لأحداث Delta Sync
  useEffect(() => {
    const handleDeltaSyncComplete = () => {
      void fetchStats();
    };

    window.addEventListener('delta-sync-complete', handleDeltaSyncComplete);
    return () => {
      window.removeEventListener('delta-sync-complete', handleDeltaSyncComplete);
    };
  }, [fetchStats]);

  // ⚡ Polling ذكي - فقط عند وجود عناصر معلقة أو كل 30 ثانية
  useEffect(() => {
    const hasPending = 
      snapshot.products.unsynced > 0 ||
      snapshot.orders.unsynced > 0 ||
      snapshot.customers.unsynced > 0 ||
      pendingOutbox > 0;

    // Polling سريع (5 ثواني) إذا كانت هناك عناصر معلقة
    // Polling بطيء (30 ثانية) إذا كان كل شيء متزامن
    const interval = hasPending ? 5000 : 30000;

    const pollingInterval = setInterval(() => {
      // لا تفحص إذا كنا offline
      if (!isOnline) return;
      void fetchStats();
    }, interval);

    return () => clearInterval(pollingInterval);
  }, [fetchStats, isOnline, snapshot, pendingOutbox]);

  return {
    snapshot,
    outboxDetails,
    pendingOutbox,
    isLoading,
    error,
    refresh: fetchStats
  };
}
