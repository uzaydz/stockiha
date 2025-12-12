/**
 * 📦 Batch Selector Component - محدث للعمل Offline
 *
 * مكون اختيار الدفعة للمنتجات التي تتطلب تتبع الدفعات (FEFO/FIFO)
 * يعرض الدفعات المتاحة مع معلومات الصلاحية والكمية
 *
 * ⚡ v2.0: يعمل 100% offline مع LocalBatchService
 * - جلب الدفعات محلياً
 * - دعم FEFO/FIFO التلقائي
 * - تنبيهات الدفعات القريبة من الانتهاء
 * - دعم الكميات العشرية (decimal) للوزن/المتر
 *
 * @version 2.0.0
 * @date 2025-12-12
 */

import { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { usePowerSync } from '@powersync/react';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Package, Calendar, AlertTriangle, CheckCircle2, Clock, WifiOff, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LocalBatchService, LocalBatch } from '@/services/local';

export interface BatchInfo {
  id: string;
  batch_number: string;
  remaining_quantity: number;
  expiry_date?: string;
  purchase_price?: number;
  received_date?: string;
  status: 'active' | 'low' | 'expired' | 'expiring_soon';
}

interface BatchSelectorProps {
  productId: string;
  productName: string;
  organizationId: string; // ⚡ جديد - مطلوب للجلب المحلي
  batches?: BatchInfo[]; // اختياري - إذا تم تمريره يستخدمه، وإلا يجلب محلياً
  selectedBatchId?: string;
  requiredQuantity: number;
  colorId?: string; // ⚡ جديد - لفلترة حسب اللون
  sizeId?: string;  // ⚡ جديد - لفلترة حسب المقاس
  unitType?: 'piece' | 'weight' | 'meter' | 'box'; // ⚡ جديد - نوع الوحدة
  onBatchSelect: (batchId: string, batchNumber: string, batchData?: LocalBatch) => void;
  disabled?: boolean;
  className?: string;
  autoSelectFEFO?: boolean; // ⚡ تغيير من FIFO إلى FEFO
  showExpiryWarning?: boolean;
}

// حساب حالة الدفعة بناءً على الصلاحية
const getBatchStatus = (batch: BatchInfo): BatchInfo['status'] => {
  if (!batch.expiry_date) return 'active';

  const today = new Date();
  const expiryDate = new Date(batch.expiry_date);
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  if (batch.remaining_quantity <= 5) return 'low';
  return 'active';
};

// تنسيق التاريخ بالعربية
const formatDate = (dateStr?: string): string => {
  if (!dateStr) return 'غير محدد';
  const date = new Date(dateStr);
  return date.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

// حساب الأيام المتبقية للصلاحية
const getDaysUntilExpiry = (expiryDate?: string): number | null => {
  if (!expiryDate) return null;
  const today = new Date();
  const expiry = new Date(expiryDate);
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

// ⚡ تحويل LocalBatch إلى BatchInfo
const localBatchToBatchInfo = (batch: LocalBatch): BatchInfo => {
  const status = getBatchStatusFromLocal(batch);
  return {
    id: batch.id,
    batch_number: batch.batch_number,
    remaining_quantity: batch.quantity_remaining,
    expiry_date: batch.expiry_date,
    purchase_price: batch.purchase_price,
    received_date: batch.created_at,
    status
  };
};

// ⚡ حساب حالة الدفعة من LocalBatch
const getBatchStatusFromLocal = (batch: LocalBatch): BatchInfo['status'] => {
  if (batch.is_expired) return 'expired';
  if (batch.days_until_expiry !== undefined && batch.days_until_expiry <= 30) return 'expiring_soon';
  if (batch.quantity_remaining <= 5) return 'low';
  return 'active';
};

// ⚡ تنسيق الكمية حسب نوع الوحدة
const formatQuantity = (quantity: number, unitType?: string): string => {
  if (unitType === 'weight') {
    return `${quantity.toFixed(2)} كجم`;
  } else if (unitType === 'meter') {
    return `${quantity.toFixed(2)} م`;
  }
  return `${Math.floor(quantity)}`;
};

const BatchSelector = memo<BatchSelectorProps>(({
  productId,
  productName,
  organizationId,
  batches: propBatches,
  selectedBatchId,
  requiredQuantity,
  colorId,
  sizeId,
  unitType = 'piece',
  onBatchSelect,
  disabled = false,
  className,
  autoSelectFEFO = true,
  showExpiryWarning = true,
}) => {
  // ⚡ حالات جديدة للجلب المحلي
  const [localBatches, setLocalBatches] = useState<LocalBatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⚡ خدمة الدفعات المحلية
  const powerSync = usePowerSync();
  const localBatchService = new LocalBatchService(powerSync);

  // ⚡ جلب الدفعات محلياً
  const loadBatchesFromLocal = useCallback(async () => {
    if (propBatches) return; // لا تجلب إذا تم تمرير الدفعات

    setIsLoading(true);
    setError(null);

    try {
      console.log(`📦 [BatchSelector] جلب الدفعات محلياً للمنتج: ${productId}`);

      const batches = await localBatchService.getProductBatchesFEFO(
        productId,
        organizationId,
        { colorId, sizeId }
      );

      setLocalBatches(batches);
      console.log(`✅ [BatchSelector] تم جلب ${batches.length} دفعة`);
    } catch (err: any) {
      console.error('❌ [BatchSelector] خطأ في جلب الدفعات:', err);
      setError('فشل في جلب الدفعات');
    } finally {
      setIsLoading(false);
    }
  }, [productId, organizationId, colorId, sizeId, propBatches]);

  // جلب عند تحميل المكون
  useEffect(() => {
    loadBatchesFromLocal();
  }, [loadBatchesFromLocal]);

  // ⚡ تحديد مصدر الدفعات (props أو محلي)
  const batches = useMemo(() => {
    if (propBatches) return propBatches;
    return localBatches.map(localBatchToBatchInfo);
  }, [propBatches, localBatches]);

  // ترتيب الدفعات حسب FEFO (الأقرب انتهاءً أولاً)
  const sortedBatches = useMemo(() => {
    return [...batches]
      .filter(b => b.remaining_quantity > 0 && getBatchStatus(b) !== 'expired')
      .sort((a, b) => {
        // الأولوية للدفعات الأقرب للانتهاء (FEFO - First Expired First Out)
        if (a.expiry_date && b.expiry_date) {
          return new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime();
        }
        // ثم حسب تاريخ الاستلام (FIFO)
        if (a.received_date && b.received_date) {
          return new Date(a.received_date).getTime() - new Date(b.received_date).getTime();
        }
        return 0;
      });
  }, [batches]);

  // اختيار تلقائي للدفعة الأولى (FEFO)
  useEffect(() => {
    if (autoSelectFEFO && !selectedBatchId && sortedBatches.length > 0) {
      const firstBatch = sortedBatches[0];
      const localBatch = localBatches.find(b => b.id === firstBatch.id);
      onBatchSelect(firstBatch.id, firstBatch.batch_number, localBatch);
    }
  }, [autoSelectFEFO, selectedBatchId, sortedBatches, onBatchSelect, localBatches]);

  // الدفعة المحددة حالياً
  const selectedBatch = useMemo(() =>
    sortedBatches.find(b => b.id === selectedBatchId),
    [sortedBatches, selectedBatchId]
  );

  // التحقق من كفاية الكمية
  const hasEnoughQuantity = selectedBatch
    ? selectedBatch.remaining_quantity >= requiredQuantity
    : false;

  // ⚡ حالة التحميل
  if (isLoading) {
    return (
      <div className={cn('p-3 bg-slate-50 border rounded-lg', className)}>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">جاري جلب الدفعات...</span>
        </div>
      </div>
    );
  }

  // ⚡ حالة الخطأ
  if (error) {
    return (
      <div className={cn('p-3 bg-red-50 border border-red-200 rounded-lg', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">{error}</span>
          </div>
          <button
            onClick={() => loadBatchesFromLocal()}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-red-600" />
          </button>
        </div>
      </div>
    );
  }

  // إذا لم تكن هناك دفعات متاحة
  if (sortedBatches.length === 0) {
    return (
      <div className={cn('p-3 bg-red-50 border border-red-200 rounded-lg', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">لا توجد دفعات متاحة لهذا المنتج</span>
          </div>
          <button
            onClick={() => loadBatchesFromLocal()}
            className="p-1 hover:bg-red-100 rounded transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>
    );
  }

  // إذا كانت هناك دفعة واحدة فقط
  if (sortedBatches.length === 1) {
    const batch = sortedBatches[0];
    const status = getBatchStatus(batch);
    const daysLeft = getDaysUntilExpiry(batch.expiry_date);

    return (
      <div className={cn('p-3 bg-slate-50 border rounded-lg', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium">دفعة: {batch.batch_number}</span>
            {/* ⚡ مؤشر الوضع المحلي */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <WifiOff className="w-3 h-3 text-green-500" />
                </TooltipTrigger>
                <TooltipContent>يعمل offline</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Badge variant={status === 'expiring_soon' ? 'destructive' : 'secondary'}>
            متبقي: {formatQuantity(batch.remaining_quantity, unitType)}
          </Badge>
        </div>
        {batch.expiry_date && (
          <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            <span>تنتهي: {formatDate(batch.expiry_date)}</span>
            {daysLeft !== null && daysLeft <= 30 && (
              <Badge variant="destructive" className="text-xs">
                {daysLeft <= 0 ? 'منتهية!' : `${daysLeft} يوم`}
              </Badge>
            )}
          </div>
        )}
      </div>
    );
  }

  // عدة دفعات - عرض قائمة منسدلة
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Package className="w-4 h-4" />
        اختر الدفعة
        {/* ⚡ مؤشر الوضع المحلي */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <WifiOff className="w-3 h-3 text-green-500" />
            </TooltipTrigger>
            <TooltipContent>يعمل offline</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Label>

      <Select
        value={selectedBatchId}
        onValueChange={(value) => {
          const batch = sortedBatches.find(b => b.id === value);
          if (batch) {
            const localBatch = localBatches.find(b => b.id === value);
            onBatchSelect(batch.id, batch.batch_number, localBatch);
          }
        }}
        disabled={disabled}
      >
        <SelectTrigger className={cn(
          "w-full",
          !hasEnoughQuantity && selectedBatchId && "border-orange-300 bg-orange-50"
        )}>
          <SelectValue placeholder="اختر دفعة..." />
        </SelectTrigger>
        <SelectContent>
          {sortedBatches.map((batch) => {
            const status = getBatchStatus(batch);
            const daysLeft = getDaysUntilExpiry(batch.expiry_date);
            const isLowQuantity = batch.remaining_quantity < requiredQuantity;

            return (
              <SelectItem
                key={batch.id}
                value={batch.id}
                className={cn(
                  status === 'expiring_soon' && 'bg-orange-50',
                  isLowQuantity && 'bg-yellow-50'
                )}
              >
                <div className="flex items-center justify-between w-full gap-3">
                  <div className="flex items-center gap-2">
                    {status === 'expiring_soon' ? (
                      <Clock className="w-4 h-4 text-orange-500" />
                    ) : status === 'low' ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                    <span className="font-medium">{batch.batch_number}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>({formatQuantity(batch.remaining_quantity, unitType)} متبقي)</span>
                    {batch.expiry_date && (
                      <span className={cn(
                        daysLeft !== null && daysLeft <= 30 && 'text-orange-600 font-medium'
                      )}>
                        • {formatDate(batch.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      {/* تحذير إذا كانت الكمية غير كافية */}
      {selectedBatch && !hasEnoughQuantity && (
        <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
          <AlertTriangle className="w-3 h-3" />
          <span>
            الكمية المطلوبة ({formatQuantity(requiredQuantity, unitType)}) أكبر من المتبقي ({formatQuantity(selectedBatch.remaining_quantity, unitType)})
          </span>
        </div>
      )}

      {/* معلومات الدفعة المحددة */}
      {selectedBatch && showExpiryWarning && selectedBatch.expiry_date && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3 h-3" />
                <span>تنتهي صلاحية الدفعة: {formatDate(selectedBatch.expiry_date)}</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>سعر الشراء: {selectedBatch.purchase_price?.toLocaleString('ar-DZ') || 'غير محدد'} د.ج</p>
              <p>تاريخ الاستلام: {formatDate(selectedBatch.received_date)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
});

BatchSelector.displayName = 'BatchSelector';

export default BatchSelector;
