/**
 * Hook لتهيئة قاعدة البيانات تلقائياً
 * يستخدم في بداية التطبيق
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { initializeDatabase, getDatabaseType } from '@/database/localDb';
import { migrateAllData, hasMigrated, type MigrationResult } from '@/lib/db/migrationTool';
import { isElectron } from '@/lib/db/sqliteAPI';

export interface DatabaseStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  isMigrating: boolean;
  migrationNeeded: boolean;
  migrationComplete: boolean;
  migrationResult: MigrationResult | null;
  databaseType: 'sqlite' | 'indexeddb' | null;
  error: string | null;
}

/**
 * Hook لتهيئة قاعدة البيانات
 */
export const useDatabaseInitialization = () => {
  const { organization } = useAuth();
  const [status, setStatus] = useState<DatabaseStatus>({
    isInitialized: false,
    isInitializing: false,
    isMigrating: false,
    migrationNeeded: false,
    migrationComplete: false,
    migrationResult: null,
    databaseType: null,
    error: null,
  });

  /**
   * تهيئة قاعدة البيانات
   */
  const initialize = useCallback(async () => {
    if (!organization?.id) {
      return;
    }

    if (status.isInitializing || status.isInitialized) {
      return;
    }

    setStatus(prev => ({
      ...prev,
      isInitializing: true,
      error: null,
    }));

    try {
      console.log('[DB Init] Starting database initialization...');

      // 1. تحديد نوع قاعدة البيانات
      const dbType = isElectron() ? 'sqlite' : 'indexeddb';
      console.log(`[DB Init] Database type: ${dbType}`);

      // 2. تهيئة قاعدة البيانات
      await initializeDatabase(organization.id);
      console.log('[DB Init] Database initialized');

      // 3. فحص إذا كان يحتاج ترحيل (فقط في Electron)
      let migrationNeeded = false;
      let migrationComplete = false;

      if (dbType === 'sqlite') {
        migrationComplete = hasMigrated();
        migrationNeeded = !migrationComplete;

        console.log('[DB Init] Migration status:', {
          needed: migrationNeeded,
          complete: migrationComplete,
        });
      }

      setStatus({
        isInitialized: true,
        isInitializing: false,
        isMigrating: false,
        migrationNeeded,
        migrationComplete,
        migrationResult: null,
        databaseType: dbType,
        error: null,
      });

      console.log('[DB Init] Initialization complete');
    } catch (error: any) {
      console.error('[DB Init] Initialization failed:', error);
      setStatus(prev => ({
        ...prev,
        isInitializing: false,
        error: error.message || 'Failed to initialize database',
      }));
    }
  }, [organization?.id, status.isInitializing, status.isInitialized]);

  /**
   * تشغيل الترحيل
   */
  const startMigration = useCallback(async () => {
    if (!organization?.id) {
      throw new Error('Organization ID is required');
    }

    if (!isElectron()) {
      throw new Error('Migration is only available in Electron');
    }

    if (status.isMigrating) {
      return;
    }

    setStatus(prev => ({
      ...prev,
      isMigrating: true,
      error: null,
    }));

    try {
      console.log('[DB Init] Starting data migration...');

      const result = await migrateAllData(organization.id);

      setStatus(prev => ({
        ...prev,
        isMigrating: false,
        migrationNeeded: false,
        migrationComplete: result.success,
        migrationResult: result,
        error: result.success ? null : 'Migration completed with errors',
      }));

      console.log('[DB Init] Migration complete:', result);

      return result;
    } catch (error: any) {
      console.error('[DB Init] Migration failed:', error);
      setStatus(prev => ({
        ...prev,
        isMigrating: false,
        error: error.message || 'Migration failed',
      }));
      throw error;
    }
  }, [organization?.id, status.isMigrating]);

  /**
   * إعادة المحاولة
   */
  const retry = useCallback(() => {
    setStatus({
      isInitialized: false,
      isInitializing: false,
      isMigrating: false,
      migrationNeeded: false,
      migrationComplete: false,
      migrationResult: null,
      databaseType: null,
      error: null,
    });
  }, []);

  /**
   * تهيئة تلقائية عند تحميل المكون
   */
  useEffect(() => {
    if (organization?.id && !status.isInitialized && !status.isInitializing) {
      initialize();
    }
  }, [organization?.id, status.isInitialized, status.isInitializing, initialize]);

  return {
    ...status,
    initialize,
    startMigration,
    retry,
  };
};

/**
 * مكون عرض حالة قاعدة البيانات (للاختبار والتطوير)
 */
export const DatabaseStatusDisplay: React.FC = () => {
  const status = useDatabaseInitialization();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: 10,
      right: 10,
      padding: '10px',
      background: '#1a1a1a',
      border: '1px solid #333',
      borderRadius: '8px',
      fontSize: '12px',
      color: '#fff',
      zIndex: 9999,
      maxWidth: '300px',
    }}>
      <div><strong>Database Status:</strong></div>
      <div>Type: {status.databaseType || 'Unknown'}</div>
      <div>Initialized: {status.isInitialized ? '✅' : '❌'}</div>
      {status.isInitializing && <div>⏳ Initializing...</div>}
      {status.isMigrating && <div>⏳ Migrating data...</div>}
      {status.migrationNeeded && (
        <div style={{ color: '#ffa500' }}>
          ⚠️ Migration needed
          <button
            onClick={status.startMigration}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Start Migration
          </button>
        </div>
      )}
      {status.migrationComplete && (
        <div style={{ color: '#00ff00' }}>✅ Migration complete</div>
      )}
      {status.error && (
        <div style={{ color: '#ff0000', marginTop: '8px' }}>
          ❌ Error: {status.error}
          <button
            onClick={status.retry}
            style={{
              marginLeft: '8px',
              padding: '4px 8px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}
      {status.migrationResult && (
        <div style={{ marginTop: '8px', fontSize: '11px' }}>
          <div>Total: {status.migrationResult.totalRecords}</div>
          <div>Migrated: {status.migrationResult.migratedRecords}</div>
          <div>Failed: {status.migrationResult.failedRecords}</div>
          <div>Duration: {(status.migrationResult.duration / 1000).toFixed(2)}s</div>
        </div>
      )}
    </div>
  );
};
