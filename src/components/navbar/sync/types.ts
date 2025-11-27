/**
 * ⚡ أنواع مؤشر المزامنة
 */

export type EntitySyncStats = {
  unsynced: number;
  total: number;
};

export type SyncSnapshot = {
  products: EntitySyncStats;
  orders: EntitySyncStats;
  customers: EntitySyncStats;
  invoices: EntitySyncStats;
  workSessions: EntitySyncStats;
  repairs: EntitySyncStats;
  returns: EntitySyncStats;      // مرتجعات
  debts: EntitySyncStats;        // ديون العملاء
  suppliers: EntitySyncStats;    // الموردين
  employees: EntitySyncStats;    // الموظفين
  outbox: number;                // Outbox
};

export type OutboxDetails = {
  byTable: Record<string, number>;
  byOperation: Record<string, number>;
  pending: number;
  failed: number;
  sending: number;
};

export type SyncStatus = 'online' | 'offline' | 'syncing' | 'error' | 'pending';

export const EMPTY_SNAPSHOT: SyncSnapshot = {
  products: { unsynced: 0, total: 0 },
  orders: { unsynced: 0, total: 0 },
  customers: { unsynced: 0, total: 0 },
  invoices: { unsynced: 0, total: 0 },
  workSessions: { unsynced: 0, total: 0 },
  repairs: { unsynced: 0, total: 0 },
  returns: { unsynced: 0, total: 0 },
  debts: { unsynced: 0, total: 0 },
  suppliers: { unsynced: 0, total: 0 },
  employees: { unsynced: 0, total: 0 },
  outbox: 0
};
