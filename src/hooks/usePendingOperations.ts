import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

interface PendingOperationsStats {
  pending: number;
  sending: number;
  failed: number;
  total: number;
}

interface UsePendingOperationsOptions {
  /** فترة التحقق بالميلي ثانية (افتراضي: 10000 = 10 ثواني) */
  checkInterval?: number;
  /** عتبة التحذير (افتراضي: 5 عمليات) */
  warningThreshold?: number;
  /** عتبة الخطر (افتراضي: 20 عملية) */
  criticalThreshold?: number;
  /** تفعيل الإشعارات (افتراضي: true) */
  showNotifications?: boolean;
}

interface UsePendingOperationsReturn {
  /** إحصائيات العمليات */
  stats: PendingOperationsStats;
  /** حالة التحميل */
  isLoading: boolean;
  /** آخر تحديث */
  lastUpdate: Date | null;
  /** هل هناك عمليات معلقة */
  hasPending: boolean;
  /** مستوى الحالة: normal | warning | critical */
  status: 'normal' | 'warning' | 'critical';
  /** تحديث يدوي */
  refresh: () => Promise<void>;
}

/**
 * ⚡ Hook لمراقبة العمليات المعلقة في نظام المزامنة
 *
 * يراقب حالة الـ Outbox ويعرض تحذيرات للمستخدم
 * عند تراكم العمليات المعلقة
 */
export const usePendingOperations = ({
  checkInterval = 10000,
  warningThreshold = 5,
  criticalThreshold = 20,
  showNotifications = true
}: UsePendingOperationsOptions = {}): UsePendingOperationsReturn => {
  const [stats, setStats] = useState<PendingOperationsStats>({
    pending: 0,
    sending: 0,
    failed: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const lastNotificationRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // جلب الإحصائيات من OutboxManager
  const fetchStats = useCallback(async (): Promise<PendingOperationsStats> => {
    try {
      // ⚡ PowerSync لا يحتاج databaseCoordinator و outboxManager - تم إزالتهما
      // const { databaseCoordinator } = await import('@/lib/sync/core/DatabaseCoordinator');
      // if (databaseCoordinator.isSyncPaused()) {
      //   console.log('[usePendingOperations] ⏸️ POS active - skipping fetchStats()');
      //   return { pending: 0, sending: 0, failed: 0, total: 0 };
      // }
      // const { outboxManager } = await import('@/lib/sync/queue/OutboxManager');
      // const outboxStats = await outboxManager.getStats();
      
      // ⚡ PowerSync يتعامل مع المزامنة تلقائياً
      return { pending: 0, sending: 0, failed: 0, total: 0 };

      return {
        pending: outboxStats.pending || 0,
        sending: outboxStats.sending || 0,
        failed: outboxStats.failed || 0,
        total: outboxStats.total || 0
      };
    } catch (error) {
      console.warn('[usePendingOperations] فشل جلب الإحصائيات:', error);
      return { pending: 0, sending: 0, failed: 0, total: 0 };
    }
  }, []);

  // تحديث الإحصائيات
  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const newStats = await fetchStats();
      setStats(newStats);
      setLastUpdate(new Date());

      // إظهار تحذير إذا تجاوزت العتبة
      if (showNotifications && newStats.total > 0) {
        const now = Date.now();
        const timeSinceLastNotification = now - lastNotificationRef.current;

        // لا نظهر إشعار أكثر من مرة كل دقيقة
        if (timeSinceLastNotification > 60000) {
          if (newStats.total >= criticalThreshold) {
            lastNotificationRef.current = now;
            toast.error(
              `⚠️ تحذير: ${newStats.total} عملية معلقة! تحقق من الاتصال بالإنترنت.`,
              { duration: 10000 }
            );
          } else if (newStats.total >= warningThreshold) {
            lastNotificationRef.current = now;
            toast.warning(
              `📡 ${newStats.total} عملية في انتظار المزامنة`,
              { duration: 5000 }
            );
          }

          // تحذير خاص للعمليات الفاشلة
          if (newStats.failed > 0 && newStats.failed >= 3) {
            toast.error(
              `❌ ${newStats.failed} عملية فاشلة تحتاج مراجعة`,
              { duration: 8000 }
            );
          }
        }
      }
    } catch (error) {
      console.error('[usePendingOperations] خطأ في التحديث:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchStats, showNotifications, warningThreshold, criticalThreshold]);

  // بدء المراقبة الدورية
  useEffect(() => {
    // جلب أولي
    refresh();

    // تحديث دوري
    intervalRef.current = setInterval(refresh, checkInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [refresh, checkInterval]);

  // حساب الحالة
  const status: 'normal' | 'warning' | 'critical' =
    stats.total >= criticalThreshold ? 'critical' :
      stats.total >= warningThreshold ? 'warning' : 'normal';

  return {
    stats,
    isLoading,
    lastUpdate,
    hasPending: stats.total > 0,
    status,
    refresh
  };
};

export default usePendingOperations;
