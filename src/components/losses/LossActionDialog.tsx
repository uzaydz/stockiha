import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Search, Package } from 'lucide-react';
import type { Loss } from '@/types/losses';

interface LossActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedLoss: Loss | null;
  processLoss: (lossId: string, action: 'approve' | 'reject' | 'investigate' | 'process') => Promise<void>;
}

const LossActionDialog: React.FC<LossActionDialogProps> = ({
  open,
  onOpenChange,
  selectedLoss,
  processLoss
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="action-dialog-description">
        <DialogHeader>
          <DialogTitle>معالجة تصريح الخسارة</DialogTitle>
          <div id="action-dialog-description" className="sr-only">
            خيارات معالجة تصريح الخسارة مثل الموافقة أو الرفض أو بدء التحقيق
          </div>
        </DialogHeader>

        {selectedLoss && (
          <div className="space-y-4">
            <p>هل تريد معالجة تصريح الخسارة {selectedLoss.loss_number}؟</p>

            <div className="flex gap-2">
              {selectedLoss.status === 'pending' && (
                <>
                  <Button
                    onClick={() => processLoss(selectedLoss.id, 'approve')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    موافقة
                  </Button>
                  <Button
                    onClick={() => processLoss(selectedLoss.id, 'reject')}
                    variant="destructive"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    رفض
                  </Button>
                  {selectedLoss.requires_investigation && (
                    <Button
                      onClick={() => processLoss(selectedLoss.id, 'investigate')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      بدء التحقيق
                    </Button>
                  )}
                </>
              )}
              {selectedLoss.status === 'approved' && (
                <Button
                  onClick={() => processLoss(selectedLoss.id, 'process')}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Package className="h-4 w-4 mr-2" />
                  معالجة وتعديل المخزون
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default LossActionDialog;



















