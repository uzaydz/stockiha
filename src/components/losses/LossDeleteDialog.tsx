import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import type { Loss } from '@/types/losses';
import { formatCurrency, getTypeLabel } from '@/lib/losses/utils';

interface LossDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossToDelete: Loss | null;
  isDeleting: boolean;
  deleteLoss: (lossId: string) => Promise<void>;
}

const LossDeleteDialog: React.FC<LossDeleteDialogProps> = ({
  open,
  onOpenChange,
  lossToDelete,
  isDeleting,
  deleteLoss
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="delete-dialog-description">
        <DialogHeader>
          <DialogTitle>حذف تصريح الخسارة</DialogTitle>
          <div id="delete-dialog-description" className="sr-only">
            تأكيد حذف تصريح الخسارة وإعادة المنتجات للمخزون
          </div>
        </DialogHeader>

        {lossToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-yellow-800">تحذير هام</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    سيتم حذف تصريح الخسارة نهائياً وإعادة جميع المنتجات المفقودة إلى المخزون.
                    هذا الإجراء لا يمكن التراجع عنه.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p><strong>رقم التصريح:</strong> {lossToDelete.loss_number}</p>
              <p><strong>النوع:</strong> {getTypeLabel(lossToDelete.loss_type)}</p>
              <p><strong>قيمة التكلفة:</strong> {formatCurrency(lossToDelete.total_cost_value)}</p>
              <p><strong>عدد العناصر:</strong> {lossToDelete.total_items_count || lossToDelete.items_count || 0}</p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isDeleting}
              >
                إلغاء
              </Button>
              <Button
                variant="destructive"
                onClick={() => deleteLoss(lossToDelete.id)}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري الحذف...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    حذف نهائي
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LossDeleteDialog;



















