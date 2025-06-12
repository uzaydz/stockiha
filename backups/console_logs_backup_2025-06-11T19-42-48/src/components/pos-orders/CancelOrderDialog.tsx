import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import type { POSOrderWithDetails } from '@/api/posOrdersService';

interface CancelOrderDialogProps {
  order: POSOrderWithDetails | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (
    orderId: string, 
    itemsToCancel: string[], 
    cancellationReason: string,
    restoreInventory: boolean
  ) => Promise<boolean>;
}

interface CancellationItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selected: boolean;
}

export const CancelOrderDialog: React.FC<CancelOrderDialogProps> = ({
  order,
  open,
  onOpenChange,
  onConfirm,
}) => {
  const [cancellationReason, setCancellationReason] = useState('');
  const [restoreInventory, setRestoreInventory] = useState(true);
  const [selectedItems, setSelectedItems] = useState<CancellationItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // تحضير قائمة المنتجات عند فتح النافذة
  React.useEffect(() => {
    if (order && open) {
      const items: CancellationItem[] = order.order_items.map(item => ({
        id: item.id,
        productName: item.product_name || item.name || 'منتج',
        quantity: item.quantity,
        unitPrice: parseFloat(item.unit_price.toString()),
        totalPrice: parseFloat(item.total_price.toString()),
        selected: true, // افتراضياً جميع المنتجات محددة
      }));
      setSelectedItems(items);
      setCancellationReason('');
    }
  }, [order, open]);

  // تبديل تحديد منتج
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, selected: !item.selected } : item
    ));
  };

  // تحديد/إلغاء تحديد جميع المنتجات
  const toggleAllItems = (selected: boolean) => {
    setSelectedItems(prev => prev.map(item => ({ ...item, selected })));
  };

  // حساب إجمالي المبلغ المُلغى
  const getTotalCancelledAmount = () => {
    return selectedItems
      .filter(item => item.selected)
      .reduce((total, item) => total + item.totalPrice, 0);
  };

  // التحقق من صحة البيانات
  const isValid = () => {
    const hasSelectedItems = selectedItems.some(item => item.selected);
    const hasReason = cancellationReason.trim().length > 0;
    return hasSelectedItems && hasReason;
  };

  // معالج التأكيد
  const handleConfirm = async () => {
    if (!order || !isValid()) {
      toast.error('يرجى تحديد المنتجات وسبب الإلغاء');
      return;
    }

    setIsProcessing(true);
    try {
      const itemsToCancel = selectedItems
        .filter(item => item.selected)
        .map(item => item.id);

      const success = await onConfirm(
        order.id,
        itemsToCancel,
        cancellationReason,
        restoreInventory
      );

      if (success) {
        toast.success('تم إلغاء الطلبية بنجاح');
        onOpenChange(false);
      }
    } catch (error) {
      toast.error('حدث خطأ أثناء إلغاء الطلبية');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!order) return null;

  const selectedCount = selectedItems.filter(item => item.selected).length;
  const totalItems = selectedItems.length;
  const isPartialCancellation = selectedCount > 0 && selectedCount < totalItems;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            إلغاء الطلبية #{order.slug?.slice(-8) || order.id.slice(-8)}
          </DialogTitle>
          <DialogDescription>
            اختر المنتجات التي تريد إلغاءها من الطلبية وحدد سبب الإلغاء
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* معلومات الطلبية */}
          <div className="bg-muted/30 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">المجموع الكلي:</span>
                <span className="mr-2">{parseFloat(order.total).toFixed(2)} دج</span>
              </div>
              <div>
                <span className="font-medium">حالة الدفع:</span>
                <Badge variant="outline" className="mr-2">
                  {order.payment_status === 'paid' ? 'مدفوع' : 
                   order.payment_status === 'partial' ? 'دفع جزئي' : 'معلق'}
                </Badge>
              </div>
            </div>
          </div>

          {/* قائمة المنتجات */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                المنتجات ({selectedCount} من {totalItems} محدد)
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllItems(true)}
                  disabled={selectedCount === totalItems}
                >
                  تحديد الكل
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllItems(false)}
                  disabled={selectedCount === 0}
                >
                  إلغاء التحديد
                </Button>
              </div>
            </div>

            <div className="border rounded-lg">
              {selectedItems.map((item, index) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-3 ${
                    index !== selectedItems.length - 1 ? 'border-b' : ''
                  } ${item.selected ? 'bg-red-50 dark:bg-red-950/20' : ''}`}
                >
                  <Checkbox
                    checked={item.selected}
                    onCheckedChange={() => toggleItemSelection(item.id)}
                  />
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-muted-foreground">
                      الكمية: {item.quantity} × {item.unitPrice.toFixed(2)} دج
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{item.totalPrice.toFixed(2)} دج</div>
                    {item.selected && (
                      <Badge variant="destructive" className="text-xs">
                        سيتم الإلغاء
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* ملخص الإلغاء */}
            {selectedCount > 0 && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                    {isPartialCancellation ? 'إلغاء جزئي' : 'إلغاء كامل'}
                  </span>
                  <span className="text-sm font-bold text-red-900 dark:text-red-100">
                    مبلغ الإلغاء: {getTotalCancelledAmount().toFixed(2)} دج
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* خيارات الإلغاء */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox
                id="restore-inventory"
                checked={restoreInventory}
                onCheckedChange={(checked) => setRestoreInventory(checked as boolean)}
              />
              <Label htmlFor="restore-inventory" className="flex items-center gap-2">
                <Undo2 className="h-4 w-4" />
                إرجاع المنتجات إلى المخزون
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cancellation-reason">سبب الإلغاء *</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="اكتب سبب إلغاء الطلبية..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            إلغاء
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid() || isProcessing}
          >
            {isProcessing ? 'جاري الإلغاء...' : 'تأكيد الإلغاء'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};