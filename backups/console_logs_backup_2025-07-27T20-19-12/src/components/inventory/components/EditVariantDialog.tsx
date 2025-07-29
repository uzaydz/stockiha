import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Edit3, Loader2, Plus, Minus, Save, X, Info } from 'lucide-react';

interface EditVariantDialogProps {
  open: boolean;
  editingVariant: any;
  updateError: string | null;
  changePreview: any;
  isUpdating: boolean;
  onClose: () => void;
  onPreview: () => void;
  onSave: (newQuantity: number) => Promise<void>;
  onUpdateNotes: (notes: string) => void;
  onUpdateQuantity: (newQuantity: number) => void;
  clearUpdateError: () => void;
}

const EditVariantDialog: React.FC<EditVariantDialogProps> = React.memo(({
  open,
  editingVariant,
  updateError,
  changePreview,
  isUpdating,
  onClose,
  onPreview,
  onSave,
  onUpdateNotes,
  onUpdateQuantity,
  clearUpdateError
}) => {
  const [localQuantity, setLocalQuantity] = useState<number | null>(null);

  useEffect(() => {
    if (open && editingVariant) {
      setLocalQuantity(editingVariant.newQuantity);
    }
  }, [open, editingVariant]);

  if (!editingVariant) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit3 className="w-5 h-5" />
            تعديل كمية المخزون
          </DialogTitle>
          <DialogDescription>
            قم بتحديث كمية المخزون للمتغير المحدد
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {updateError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{updateError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label>الكمية الحالية</Label>
            <Input 
              value={editingVariant.currentQuantity} 
              disabled 
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label>الكمية الجديدة</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocalQuantity(q => Math.max(0, (q ?? 0) - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                min="0"
                value={localQuantity ?? editingVariant.newQuantity}
                onChange={(e) => setLocalQuantity(Number(e.target.value) || 0)}
                onBlur={() => {
                  if (localQuantity !== null && localQuantity !== editingVariant.newQuantity) {
                    onUpdateQuantity(localQuantity);
                  }
                }}
                className="text-center"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setLocalQuantity(q => (q ?? 0) + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              placeholder="أدخل ملاحظات حول التحديث..."
              value={editingVariant.notes}
              onChange={(e) => onUpdateNotes(e.target.value)}
              rows={3}
            />
          </div>

          {changePreview && (
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                {changePreview.estimatedImpact}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => {
            onClose();
            clearUpdateError();
          }}>
            <X className="w-4 h-4 mr-1" />
            إلغاء
          </Button>
          <Button onClick={onPreview} variant="secondary" size="sm">
            معاينة
          </Button>
          <Button 
            onClick={async () => {
              if (localQuantity !== null && localQuantity !== editingVariant.newQuantity) {
                onUpdateQuantity(localQuantity);
              }
              await onSave(localQuantity ?? editingVariant.newQuantity);
            }}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-1" />
            )}
            حفظ التغييرات
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default EditVariantDialog; 