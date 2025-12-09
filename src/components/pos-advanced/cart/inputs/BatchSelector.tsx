/**
 * 📦 Batch Selector Component
 *
 * مكون اختيار الدفعة للمنتجات التي تتطلب تتبع الدفعات (FIFO)
 * يعرض الدفعات المتاحة مع معلومات الصلاحية والكمية
 */

import { memo, useMemo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { Package, Calendar, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  batches: BatchInfo[];
  selectedBatchId?: string;
  requiredQuantity: number;
  onBatchSelect: (batchId: string, batchNumber: string) => void;
  disabled?: boolean;
  className?: string;
  autoSelectFIFO?: boolean;
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

const BatchSelector = memo<BatchSelectorProps>(({
  productId,
  productName,
  batches,
  selectedBatchId,
  requiredQuantity,
  onBatchSelect,
  disabled = false,
  className,
  autoSelectFIFO = true,
  showExpiryWarning = true,
}) => {
  // ترتيب الدفعات حسب FIFO (الأقدم أولاً)
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

  // اختيار تلقائي للدفعة الأولى (FIFO)
  useEffect(() => {
    if (autoSelectFIFO && !selectedBatchId && sortedBatches.length > 0) {
      const firstBatch = sortedBatches[0];
      onBatchSelect(firstBatch.id, firstBatch.batch_number);
    }
  }, [autoSelectFIFO, selectedBatchId, sortedBatches, onBatchSelect]);

  // الدفعة المحددة حالياً
  const selectedBatch = useMemo(() =>
    sortedBatches.find(b => b.id === selectedBatchId),
    [sortedBatches, selectedBatchId]
  );

  // التحقق من كفاية الكمية
  const hasEnoughQuantity = selectedBatch
    ? selectedBatch.remaining_quantity >= requiredQuantity
    : false;

  // إذا لم تكن هناك دفعات متاحة
  if (sortedBatches.length === 0) {
    return (
      <div className={cn('p-3 bg-red-50 border border-red-200 rounded-lg', className)}>
        <div className="flex items-center gap-2 text-red-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm font-medium">لا توجد دفعات متاحة لهذا المنتج</span>
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
          </div>
          <Badge variant={status === 'expiring_soon' ? 'destructive' : 'secondary'}>
            متبقي: {batch.remaining_quantity}
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
      </Label>

      <Select
        value={selectedBatchId}
        onValueChange={(value) => {
          const batch = sortedBatches.find(b => b.id === value);
          if (batch) {
            onBatchSelect(batch.id, batch.batch_number);
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
                    <span>({batch.remaining_quantity} متبقي)</span>
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
            الكمية المطلوبة ({requiredQuantity}) أكبر من المتبقي ({selectedBatch.remaining_quantity})
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
