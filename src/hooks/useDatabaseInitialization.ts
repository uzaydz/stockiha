/**
 * Hook لتهيئة قاعدة البيانات تلقائياً
 *
 * ⚡ تم التحديث لاستخدام PowerSync
 * - PowerSync يعمل على جميع المنصات (Browser, Desktop)
 * - التهيئة التلقائية
 * - لا حاجة لـ migration يدوي
 */

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface DatabaseStatus {
  isInitialized: boolean;
  isInitializing: boolean;
  databaseType: 'powersync' | null;
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
      console.log('[DB Init] ⚡ Starting PowerSync initialization...');

      // ⚡ تهيئة PowerSync
      await powerSyncService.initialize();
      console.log('[DB Init] ✅ PowerSync initialized successfully');

      setStatus({
        isInitialized: true,
        isInitializing: false,
        databaseType: 'powersync',
        error: null,
      });

      console.log('[DB Init] ✅ Initialization complete');
    } catch (error: any) {
      console.error('[DB Init] ❌ Initialization failed:', error);
      setStatus(prev => ({
        ...prev,
        isInitializing: false,
        error: error.message || 'Failed to initialize PowerSync',
      }));
    }
  }, [organization?.id, status.isInitializing, status.isInitialized]);

  /**
   * فرض المزامنة الفورية (للاختبار)
   */
  const forceSync = useCallback(async () => {
    try {
      console.log('[DB Init] ⚡ Forcing PowerSync sync...');
      await powerSyncService.forceSync();
      console.log('[DB Init] ✅ Sync completed');
    } catch (error: any) {
      console.error('[DB Init] ❌ Sync failed:', error);
      throw error;
    }
  }, []);

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
    forceSync,
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
      <div><strong>⚡ PowerSync Status:</strong></div>
      <div>Type: {status.databaseType || 'Unknown'}</div>
      <div>Initialized: {status.isInitialized ? '✅' : '❌'}</div>
      {status.isInitializing && <div>⏳ Initializing PowerSync...</div>}
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
      {status.isInitialized && (
        <button
          onClick={status.forceSync}
          style={{
            marginTop: '8px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            width: '100%',
          }}
        >
          🔄 Force Sync
        </button>
      )}
    </div>
  );
};
