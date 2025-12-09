/**
 * ⚡ usePOSStatsSmart - Hook للإحصائيات السريعة
 *
 * يستخدم SQL aggregation بدلاً من تحميل كل البيانات وحسابها في JavaScript
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTenant } from '@/context/TenantContext';
import { deltaWriteService } from '@/services/DeltaWriteService';
import { powerSyncService } from '@/lib/powersync/PowerSyncService';

export interface POSStats {
  products: {
    totalProducts: number;
    outOfStock: number;
    totalStock: number;
  };
  orders: {
    totalOrders: number;
    todayOrders: number;
    totalSales: number;
    todaySales: number;
  };
}

export interface POSStatsResult {
  stats: POSStats;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export const usePOSStatsSmart = (options: {
  enabled?: boolean;
  enableWatch?: boolean;
} = {}): POSStatsResult => {
  const { currentOrganization } = useTenant();
  const organizationId = currentOrganization?.id;
  const { enabled = true, enableWatch = true } = options;

  const [stats, setStats] = useState<POSStats>({
    products: { totalProducts: 0, outOfStock: 0, totalStock: 0 },
    orders: { totalOrders: 0, todayOrders: 0, totalSales: 0, todaySales: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const watchCleanupRef = useRef<(() => void) | null>(null);

  const fetchStats = useCallback(async () => {
    if (!organizationId || !enabled) return;

    setIsLoading(true);
    setError(null);

    try {
      // ⚡ جلب الإحصائيات بالتوازي باستخدام SQL aggregation
      const [productStats, orderStats] = await Promise.all([
        deltaWriteService.getProductStats(organizationId),
        deltaWriteService.getOrderStats(organizationId)
      ]);

      setStats({
        products: productStats,
        orders: orderStats
      });
    } catch (err) {
      console.error('[usePOSStatsSmart] Error fetching stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, enabled]);

  // ⚡ Watch for changes
  useEffect(() => {
    if (!enableWatch || !organizationId || !powerSyncService.isReady()) return;

    if (watchCleanupRef.current) {
      watchCleanupRef.current();
      watchCleanupRef.current = null;
    }

    // Watch both products and orders tables
    const productsCleanup = powerSyncService.watch<{ id: string }>(
      { sql: `SELECT id FROM products WHERE organization_id = ? LIMIT 1`, params: [organizationId] },
      {
        onResult: () => fetchStats(),
        throttleMs: 500
      }
    );

    const ordersCleanup = powerSyncService.watch<{ id: string }>(
      { sql: `SELECT id FROM orders WHERE organization_id = ? LIMIT 1`, params: [organizationId] },
      {
        onResult: () => fetchStats(),
        throttleMs: 500
      }
    );

    watchCleanupRef.current = () => {
      productsCleanup();
      ordersCleanup();
    };

    return () => {
      if (watchCleanupRef.current) {
        watchCleanupRef.current();
        watchCleanupRef.current = null;
      }
    };
  }, [enableWatch, organizationId, fetchStats]);

  // Initial fetch
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refetch: fetchStats
  };
};

export default usePOSStatsSmart;
