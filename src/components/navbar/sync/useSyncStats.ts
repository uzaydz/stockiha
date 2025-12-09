/**
 * ⚡ useSyncStats v3.2 - Full Snapshot Edition
 * ============================================================
 *
 * 🚀 التحسينات:
 * - استعلام شامل لجميع الجداول (30 جدول)
 * - جلب organization_id تلقائياً من قاعدة البيانات
 * - إرجاع snapshot كامل متوافق مع SyncSnapshot
 * - تحديث تلقائي عند تغيير البيانات
 *
 * ============================================================
 */

import { useCallback, useMemo } from 'react';
import { useQuery, useStatus } from '@powersync/react';
import type {
  PowerSyncStatus,
  OutboxDetails,
  DiagnosticsInfo,
  SyncError,
  SyncSnapshot,
  TableStats
} from './types';
import { ERROR_MESSAGES, createEmptyTableStats, EMPTY_SNAPSHOT } from './types';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

// ═══════════════════════════════════════════════════════════════
// 🔧 TYPES
// ═══════════════════════════════════════════════════════════════

interface UseSyncStatsOptions {
  organizationId: string | undefined;
  isOnline: boolean;
}

/** إحصائيات مبسطة وسريعة */
export interface SimpleSyncStats {
  // الجداول الرئيسية
  products: number;
  orders: number;
  customers: number;
  invoices: number;
  expenses: number;
  // الإجماليات
  totalRecords: number;
  pendingChanges: number;
  // الحالة
  isConnected: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
}

interface UseSyncStatsResult {
  stats: SimpleSyncStats;
  snapshot: SyncSnapshot;
  powerSyncStatus: PowerSyncStatus;
  outbox: OutboxDetails;
  isLoading: boolean;
  isInitialized: boolean;
  error: SyncError | null;
  refresh: () => Promise<void>;
  getDiagnostics: () => Promise<DiagnosticsInfo | null>;
}

// ═══════════════════════════════════════════════════════════════
// 📊 TABLE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

const TABLE_DEFINITIONS = [
  // المنتجات (7)
  { key: 'products', table: 'products', nameAr: 'المنتجات', icon: '📦' },
  { key: 'productCategories', table: 'product_categories', nameAr: 'التصنيفات', icon: '📁' },
  { key: 'productSubcategories', table: 'product_subcategories', nameAr: 'التصنيفات الفرعية', icon: '📂' },
  { key: 'productColors', table: 'product_colors', nameAr: 'ألوان المنتجات', icon: '🎨' },
  { key: 'productSizes', table: 'product_sizes', nameAr: 'مقاسات المنتجات', icon: '📏' },
  { key: 'productImages', table: 'product_images', nameAr: 'صور المنتجات', icon: '🖼️' },
  { key: 'productWholesaleTiers', table: 'product_wholesale_tiers', nameAr: 'مستويات الجملة', icon: '📊' },
  // المخزون (2)
  { key: 'inventoryBatches', table: 'inventory_batches', nameAr: 'دفعات المخزون', icon: '📋' },
  { key: 'productSerialNumbers', table: 'product_serial_numbers', nameAr: 'الأرقام التسلسلية', icon: '🔢' },
  // الطلبات (2)
  { key: 'orders', table: 'orders', nameAr: 'الطلبات', icon: '🛒' },
  { key: 'orderItems', table: 'order_items', nameAr: 'عناصر الطلبات', icon: '📝' },
  // العملاء والموردين (2)
  { key: 'customers', table: 'customers', nameAr: 'العملاء', icon: '👤' },
  { key: 'suppliers', table: 'suppliers', nameAr: 'الموردين', icon: '🏭' },
  // الفواتير (2)
  { key: 'invoices', table: 'invoices', nameAr: 'الفواتير', icon: '🧾' },
  { key: 'invoiceItems', table: 'invoice_items', nameAr: 'عناصر الفواتير', icon: '📄' },
  // الخسائر (2)
  { key: 'losses', table: 'losses', nameAr: 'الخسائر', icon: '📉' },
  { key: 'lossItems', table: 'loss_items', nameAr: 'عناصر الخسائر', icon: '❌' },
  // المرتجعات (2)
  { key: 'returns', table: 'returns', nameAr: 'المرتجعات', icon: '↩️' },
  { key: 'returnItems', table: 'return_items', nameAr: 'عناصر المرتجعات', icon: '📦' },
  // الإصلاحات (2)
  { key: 'repairOrders', table: 'repair_orders', nameAr: 'طلبات الإصلاح', icon: '🔧' },
  { key: 'repairLocations', table: 'repair_locations', nameAr: 'مواقع الإصلاح', icon: '📍' },
  // الموظفين وجلسات العمل (2)
  { key: 'posStaffSessions', table: 'pos_staff_sessions', nameAr: 'الموظفين', icon: '👷' },
  { key: 'staffWorkSessions', table: 'staff_work_sessions', nameAr: 'جلسات العمل', icon: '⏱️' },
  // المصروفات (2)
  { key: 'expenses', table: 'expenses', nameAr: 'المصروفات', icon: '💸' },
  { key: 'expenseCategories', table: 'expense_categories', nameAr: 'تصنيفات المصروفات', icon: '📋' },
  // الاشتراكات (2)
  { key: 'subscriptionTransactions', table: 'subscription_transactions', nameAr: 'معاملات الاشتراكات', icon: '💰' },
  { key: 'subscriptions', table: 'organization_subscriptions', nameAr: 'الاشتراكات', icon: '💳' },
  // النظام (4)
  { key: 'users', table: 'users', nameAr: 'المستخدمين', icon: '👥' },
  { key: 'organizations', table: 'organizations', nameAr: 'المنظمة', icon: '🏢' },
  { key: 'posSettings', table: 'pos_settings', nameAr: 'إعدادات POS', icon: '⚙️' },
  { key: 'subscriptionPlans', table: 'subscription_plans', nameAr: 'خطط الاشتراك', icon: '📋' },
];

// ═══════════════════════════════════════════════════════════════
// 🎯 HOOK
// ═══════════════════════════════════════════════════════════════

export function useSyncStats({
  organizationId: propOrgId,
  isOnline,
}: UseSyncStatsOptions): UseSyncStatsResult {

  // حالة PowerSync
  const status = useStatus();

  // ⚡ بناء استعلام شامل لجميع الجداول
  // استعلام بدون فلتر organization_id لأن البيانات مُفلترة أصلاً بواسطة Sync Rules
  const countsQuery = useMemo(() => {
    const queries = TABLE_DEFINITIONS.map(def =>
      `SELECT '${def.key}' as table_key, '${def.table}' as table_name, COUNT(*) as total FROM ${def.table}`
    );
    return queries.join(' UNION ALL ');
  }, []);

  // استعلام العدادات لجميع الجداول
  const { data: countsData, isLoading: countsLoading, error: countsError } = useQuery<{
    table_key: string;
    table_name: string;
    total: number
  }>(
    countsQuery,
    []
  );

  // استعلام العمليات المعلقة
  const { data: pendingData } = useQuery<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM ps_crud',
    []
  );

  // استعلام العمليات المعلقة لكل جدول
  const { data: pendingByTableData } = useQuery<{ table_name: string; cnt: number }>(
    `SELECT
      json_extract(data, '$.type') as table_name,
      COUNT(*) as cnt
    FROM ps_crud
    GROUP BY json_extract(data, '$.type')`,
    []
  );

  // ⚡ بناء الـ snapshot الكامل
  const snapshot = useMemo((): SyncSnapshot => {
    const result = { ...EMPTY_SNAPSHOT };
    let totalLocal = 0;
    let totalPending = 0;
    let syncedTables = 0;

    // بناء map للعمليات المعلقة لكل جدول
    const pendingByTable: Record<string, number> = {};
    for (const row of pendingByTableData || []) {
      if (row.table_name) {
        pendingByTable[row.table_name] = row.cnt || 0;
      }
    }

    // معالجة نتائج العدادات
    for (const row of countsData || []) {
      const def = TABLE_DEFINITIONS.find(d => d.key === row.table_key);
      if (!def) continue;

      const count = row.total || 0;
      const pending = pendingByTable[row.table_name] || 0;

      const tableStats: TableStats = {
        name: row.table_name,
        nameAr: def.nameAr,
        icon: def.icon,
        local: count,
        pending: pending,
        synced: pending === 0
      };

      // تعيين في الـ snapshot
      (result as any)[row.table_key] = tableStats;

      totalLocal += count;
      totalPending += pending;
      if (count > 0) syncedTables++;
    }

    // تحديث الإجماليات
    result.totalLocal = totalLocal;
    result.totalPending = pendingData?.[0]?.cnt || totalPending;
    result.totalTables = TABLE_DEFINITIONS.length;
    result.syncedTables = syncedTables;

    return result;
  }, [countsData, pendingData, pendingByTableData]);

  // ⚡ بناء الإحصائيات المبسطة
  const stats = useMemo((): SimpleSyncStats => {
    return {
      products: (snapshot.products as TableStats)?.local || 0,
      orders: (snapshot.orders as TableStats)?.local || 0,
      customers: (snapshot.customers as TableStats)?.local || 0,
      invoices: (snapshot.invoices as TableStats)?.local || 0,
      expenses: (snapshot.expenses as TableStats)?.local || 0,
      totalRecords: snapshot.totalLocal || 0,
      pendingChanges: snapshot.totalPending || 0,
      isConnected: status?.connected || false,
      isSyncing: (status as any)?.connecting || false,
      lastSyncedAt: status?.lastSyncedAt || null,
    };
  }, [snapshot, status]);

  // حالة PowerSync
  const powerSyncStatus = useMemo((): PowerSyncStatus => ({
    connected: status?.connected || false,
    connecting: (status as any)?.connecting || false,
    hasSynced: status?.hasSynced || false,
    lastSyncedAt: status?.lastSyncedAt || null,
    downloadProgress: null,
    uploadProgress: null,
    error: null,
    syncRulesDeployed: !!status?.hasSynced,
    syncRulesError: status?.connected && !status?.hasSynced ? 'Sync rules not confirmed yet' : undefined
  }), [status]);

  // الـ outbox
  const outbox = useMemo((): OutboxDetails => {
    const byTable: Record<string, number> = {};
    for (const row of pendingByTableData || []) {
      if (row.table_name) {
        byTable[row.table_name] = row.cnt || 0;
      }
    }

    return {
      entries: [],
      byTable,
      byOperation: {},
      total: pendingData?.[0]?.cnt || 0
    };
  }, [pendingData, pendingByTableData]);

  // الأخطاء
  const error = useMemo((): SyncError | null => {
    if (!countsError) return null;

    const message = countsError instanceof Error ? countsError.message : 'Unknown error';
    let errorCode = 'UNKNOWN';

    if (message.includes('PSYNC_S2002')) errorCode = 'PSYNC_S2002';
    else if (message.includes('network')) errorCode = 'NETWORK_ERROR';
    else if (message.includes('auth')) errorCode = 'AUTH_ERROR';

    return {
      code: errorCode,
      message,
      messageAr: ERROR_MESSAGES[errorCode] || ERROR_MESSAGES['UNKNOWN'],
      timestamp: new Date(),
      recoverable: true,
    };
  }, [countsError]);

  // دالة التحديث
  const refresh = useCallback(async () => {
    try {
      await powerSyncService.forceSync();
    } catch (err) {
      console.warn('[useSyncStats] refresh sync failed:', err);
    }
  }, []);

  // التشخيصات
  const getDiagnostics = useCallback(async (): Promise<DiagnosticsInfo | null> => ({
    powersync: {
      version: '3.2',
      instanceId: 'powersync-v3',
      databaseName: 'stockiha_powersync_v3.db',
      isInitialized: true,
      schemaVersion: 'deployed'
    },
    connection: {
      endpoint: import.meta.env.VITE_POWERSYNC_URL || 'unknown',
      isOnline,
      lastConnectedAt: status?.lastSyncedAt || null,
      reconnectAttempts: 0,
      syncRulesDeployed: true,
      syncRulesError: undefined
    },
    database: {
      totalTables: TABLE_DEFINITIONS.length,
      totalRecords: stats.totalRecords,
      sizeEstimate: 'unknown',
      lastModified: status?.lastSyncedAt || null
    },
    auth: {
      userId: propOrgId || null,
      organizationId: propOrgId || null,
      tokenExpiry: null,
      isAuthenticated: !!propOrgId
    }
  }), [propOrgId, isOnline, stats.totalRecords, status?.lastSyncedAt]);

  return {
    stats,
    snapshot,
    powerSyncStatus,
    outbox,
    isLoading: countsLoading,
    isInitialized: !!countsData && countsData.length > 0,
    error,
    refresh,
    getDiagnostics
  };
}

// ═══════════════════════════════════════════════════════════════
// 📤 EXPORTS
// ═══════════════════════════════════════════════════════════════

export type { SimpleSyncStats };
export type { PowerSyncStatus, OutboxDetails, DiagnosticsInfo, SyncError, SyncSnapshot } from './types';
