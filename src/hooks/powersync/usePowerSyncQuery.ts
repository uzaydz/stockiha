/**
 * ⚡ usePowerSyncQuery - v2.0 (Best Practices 2025)
 * ============================================================
 *
 * 🚀 Wrapper حول useQuery من @powersync/react
 *    مع دعم للتوافق مع الكود القديم
 *
 * ⚠️ هذا الملف للتوافق مع الكود القديم فقط!
 *    للمشاريع الجديدة، استخدم useQuery من @powersync/react مباشرة
 *
 * المصادر:
 * - https://powersync-ja.github.io/powersync-js/react-sdk
 * ============================================================
 */

import { useQuery as usePowerSyncReactQuery } from '@powersync/react';

interface QueryResult<T> {
  data: T[];
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

interface UsePowerSyncQueryOptions {
  queryKey?: string[];
  sql: string;
  params?: any[];
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * 🎣 usePowerSyncQuery - للتوافق مع الكود القديم
 *
 * @deprecated Use useQuery from @powersync/react instead
 *
 * ❌ const { data } = usePowerSyncQuery({ sql: '...', queryKey: [...] });
 * ✅ const { data } = useQuery('SELECT ...', [params]);
 */
export function usePowerSyncQuery<T = any>({
  sql,
  params = [],
  enabled = true,
}: UsePowerSyncQueryOptions): QueryResult<T> {
  // استخدام hook الرسمي من @powersync/react
  const result = usePowerSyncReactQuery<T>(sql, params, {
    runQueryOnce: !enabled,
  });

  return {
    data: result.data || [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    error: result.error || null,
    refetch: () => {
      // useQuery من PowerSync لا يحتاج refetch يدوي
      // البيانات تتحدث تلقائياً عند التغيير
      console.log('[usePowerSyncQuery] refetch called - data updates automatically');
    },
  };
}

export default usePowerSyncQuery;
