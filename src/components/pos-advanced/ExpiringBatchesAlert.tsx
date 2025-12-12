/**
 * 📦 Expiring Batches Alert - تنبيهات الدفعات القريبة من الانتهاء
 *
 * يعرض تنبيهات للدفعات التي ستنتهي صلاحيتها قريباً
 * يعمل 100% offline مع LocalBatchService
 *
 * @version 1.0.0
 * @date 2025-12-12
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { usePowerSync } from '@powersync/react';
import { AnimatePresence, motion } from 'framer-motion';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Clock,
  AlertTriangle,
  Package,
  X,
  ChevronRight,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalBatchService, LocalBatch } from '@/services/local';

// =====================================================
// الأنواع
// =====================================================

interface ExpiringBatch extends LocalBatch {
  product_name?: string;
}

interface ExpiringBatchesAlertProps {
  organizationId: string;
  daysAhead?: number; // عدد الأيام للتنبيه (افتراضي: 30)
  checkInterval?: number; // فترة الفحص بالمللي ثانية (افتراضي: 5 دقائق)
  enabled?: boolean;
  onBatchClick?: (batch: ExpiringBatch) => void;
  className?: string;
}

// =====================================================
// Hook لجلب الدفعات القريبة من الانتهاء
// =====================================================

export function useExpiringBatches(
  organizationId: string,
  options?: {
    daysAhead?: number;
    checkInterval?: number;
    enabled?: boolean;
  }
) {
  const {
    daysAhead = 30,
    checkInterval = 5 * 60 * 1000, // 5 دقائق
    enabled = true
  } = options || {};

  const [expiringBatches, setExpiringBatches] = useState<ExpiringBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const powerSync = usePowerSync();
  const localBatchService = new LocalBatchService(powerSync);

  const checkExpiringBatches = useCallback(async () => {
    if (!enabled || !organizationId) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log(`📦 [ExpiringBatches] فحص الدفعات القريبة من الانتهاء (${daysAhead} يوم)`);

      const batches = await localBatchService.getExpiringBatches(organizationId, daysAhead);

      // جلب أسماء المنتجات
      const batchesWithNames: ExpiringBatch[] = await Promise.all(
        batches.map(async (batch) => {
          try {
            const productResult = await powerSync.execute(
              'SELECT name FROM products WHERE id = ?',
              [batch.product_id]
            );
            const productName = productResult.rows?._array?.[0]?.name || 'منتج غير معروف';
            return { ...batch, product_name: productName };
          } catch {
            return { ...batch, product_name: 'منتج غير معروف' };
          }
        })
      );

      setExpiringBatches(batchesWithNames);
      setLastChecked(new Date());

      console.log(`✅ [ExpiringBatches] تم العثور على ${batchesWithNames.length} دفعة قريبة من الانتهاء`);
    } catch (err: any) {
      console.error('❌ [ExpiringBatches] خطأ في فحص الدفعات:', err);
      setError('فشل في فحص الدفعات');
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, daysAhead, enabled, powerSync]);

  // فحص أولي
  useEffect(() => {
    checkExpiringBatches();
  }, [checkExpiringBatches]);

  // فحص دوري
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(checkExpiringBatches, checkInterval);
    return () => clearInterval(interval);
  }, [checkExpiringBatches, checkInterval, enabled]);

  return {
    expiringBatches,
    isLoading,
    error,
    lastChecked,
    refresh: checkExpiringBatches,
    hasExpiring: expiringBatches.length > 0,
    criticalCount: expiringBatches.filter(b => (b.days_until_expiry || 0) <= 7).length,
    warningCount: expiringBatches.filter(b => (b.days_until_expiry || 0) > 7).length
  };
}

// =====================================================
// مكون عنصر الدفعة
// =====================================================

const ExpiringBatchItem = memo<{
  batch: ExpiringBatch;
  onClick?: () => void;
}>(({ batch, onClick }) => {
  const daysLeft = batch.days_until_expiry || 0;
  const isCritical = daysLeft <= 7;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
        isCritical ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          'p-2 rounded-full',
          isCritical ? 'bg-red-100' : 'bg-orange-100'
        )}>
          {isCritical ? (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          ) : (
            <Clock className="w-4 h-4 text-orange-600" />
          )}
        </div>

        <div>
          <p className="text-sm font-medium">{batch.product_name}</p>
          <p className="text-xs text-muted-foreground">
            دفعة: {batch.batch_number} • متبقي: {batch.quantity_remaining}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={isCritical ? 'destructive' : 'outline'} className="text-xs">
          {daysLeft <= 0 ? 'منتهية!' : `${daysLeft} يوم`}
        </Badge>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </motion.div>
  );
});

ExpiringBatchItem.displayName = 'ExpiringBatchItem';

// =====================================================
// المكون الرئيسي
// =====================================================

const ExpiringBatchesAlert = memo<ExpiringBatchesAlertProps>(({
  organizationId,
  daysAhead = 30,
  checkInterval = 5 * 60 * 1000,
  enabled = true,
  onBatchClick,
  className
}) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const {
    expiringBatches,
    isLoading,
    refresh,
    hasExpiring,
    criticalCount,
    warningCount
  } = useExpiringBatches(organizationId, { daysAhead, checkInterval, enabled });

  // لا تعرض شيئاً إذا لا توجد دفعات أو تم الرفض
  if (!hasExpiring || isDismissed) return null;

  const totalCount = expiringBatches.length;
  const hasCritical = criticalCount > 0;

  return (
    <>
      {/* التنبيه المصغر */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        className={cn('fixed top-20 right-4 z-40 max-w-sm', className)}
      >
        <Alert className={cn(
          'cursor-pointer transition-all hover:shadow-lg',
          hasCritical ? 'border-red-300 bg-red-50' : 'border-orange-300 bg-orange-50'
        )}>
          <div className="flex items-start gap-3">
            <div className={cn(
              'p-2 rounded-full shrink-0',
              hasCritical ? 'bg-red-100' : 'bg-orange-100'
            )}>
              {hasCritical ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <Clock className="w-5 h-5 text-orange-600" />
              )}
            </div>

            <div className="flex-1 min-w-0" onClick={() => setIsDialogOpen(true)}>
              <AlertTitle className={cn(
                'text-sm font-semibold',
                hasCritical ? 'text-red-700' : 'text-orange-700'
              )}>
                {hasCritical ? 'تنبيه! دفعات منتهية' : 'دفعات قريبة من الانتهاء'}
              </AlertTitle>
              <AlertDescription className="text-xs text-muted-foreground mt-1">
                {criticalCount > 0 && (
                  <span className="text-red-600 font-medium">{criticalCount} دفعة حرجة • </span>
                )}
                {warningCount > 0 && (
                  <span>{warningCount} دفعة تحذيرية</span>
                )}
              </AlertDescription>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setIsDismissed(true);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      </motion.div>

      {/* مربع حوار التفاصيل */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              الدفعات القريبة من الانتهاء
              <Badge variant="outline">{totalCount}</Badge>
            </DialogTitle>
            <DialogDescription>
              الدفعات التي ستنتهي صلاحيتها خلال {daysAhead} يوم
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 py-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : expiringBatches.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد دفعات قريبة من الانتهاء</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {expiringBatches.map((batch) => (
                  <ExpiringBatchItem
                    key={batch.id}
                    batch={batch}
                    onClick={() => {
                      onBatchClick?.(batch);
                      setIsDialogOpen(false);
                    }}
                  />
                ))}
              </AnimatePresence>
            )}
          </div>

          <DialogFooter className="flex-row gap-2">
            <Button variant="outline" onClick={refresh} disabled={isLoading}>
              <RefreshCw className={cn('w-4 h-4 ml-2', isLoading && 'animate-spin')} />
              تحديث
            </Button>
            <Button onClick={() => setIsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

ExpiringBatchesAlert.displayName = 'ExpiringBatchesAlert';

export default ExpiringBatchesAlert;
