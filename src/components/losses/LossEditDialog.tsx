import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { RefreshCw, Edit } from 'lucide-react';
import type { Loss, LossItem } from '@/types/losses';

interface LossEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lossToEdit: Loss | null;
  editFormData: Partial<Loss>;
  setEditFormData: React.Dispatch<React.SetStateAction<Partial<Loss>>>;
  isUpdating: boolean;
  updateLoss: () => Promise<void>;
  selectedLossItems: LossItem[];
  loadingLossItems: boolean;
}

const LossEditDialog: React.FC<LossEditDialogProps> = ({
  open,
  onOpenChange,
  lossToEdit,
  editFormData,
  setEditFormData,
  isUpdating,
  updateLoss,
  selectedLossItems,
  loadingLossItems
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" aria-describedby="edit-dialog-description">
        <DialogHeader>
          <DialogTitle>تعديل تصريح الخسارة</DialogTitle>
          <div id="edit-dialog-description" className="sr-only">
            نموذج تعديل تفاصيل تصريح الخسارة
          </div>
        </DialogHeader>

        {lossToEdit && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-loss-type">نوع الخسارة</Label>
                <Select
                  value={editFormData.loss_type || lossToEdit.loss_type}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, loss_type: value as any }))}
                >
                  <SelectTrigger id="edit-loss-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="damaged">تلف</SelectItem>
                    <SelectItem value="expired">انتهاء صلاحية</SelectItem>
                    <SelectItem value="theft">سرقة</SelectItem>
                    <SelectItem value="spoilage">فساد</SelectItem>
                    <SelectItem value="breakage">كسر</SelectItem>
                    <SelectItem value="defective">معيب</SelectItem>
                    <SelectItem value="other">أخرى</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="edit-incident-date">تاريخ الحادثة</Label>
                <Input
                  id="edit-incident-date"
                  type="date"
                  value={editFormData.incident_date || lossToEdit.incident_date?.split('T')[0]}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, incident_date: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="edit-description">وصف الحادثة</Label>
              <Textarea
                id="edit-description"
                value={editFormData.loss_description || lossToEdit.loss_description}
                onChange={(e) => setEditFormData(prev => ({ ...prev, loss_description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="edit-notes">ملاحظات</Label>
              <Textarea
                id="edit-notes"
                value={editFormData.notes || lossToEdit.notes || ''}
                onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-requires-investigation"
                checked={editFormData.requires_investigation ?? lossToEdit.requires_investigation}
                onCheckedChange={(checked) => setEditFormData(prev => ({ ...prev, requires_investigation: checked as boolean }))}
              />
              <Label htmlFor="edit-requires-investigation">يتطلب تحقيق</Label>
            </div>

            <div className="space-y-2">
              <Label>المنتجات المرتبطة بهذا التصريح:</Label>
              {loadingLossItems ? (
                <div className="flex justify-center py-4">
                  <RefreshCw className="h-6 w-6 animate-spin" />
                </div>
              ) : selectedLossItems.length > 0 ? (
                <div className="max-h-40 overflow-y-auto border rounded p-2">
                  {selectedLossItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-1 text-sm">
                      <div>
                        <span className="font-medium">{item.product_name}</span>
                        {item.variant_display_name && (
                          <span className="text-blue-600 ml-2">({item.variant_display_name})</span>
                        )}
                      </div>
                      <span className="text-muted-foreground">الكمية: {item.quantity_lost}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">لا توجد منتجات مرتبطة</p>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                }}
                disabled={isUpdating}
              >
                إلغاء
              </Button>
              <Button
                onClick={updateLoss}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    جاري التحديث...
                  </>
                ) : (
                  <>
                    <Edit className="h-4 w-4 mr-2" />
                    حفظ التغييرات
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

export default LossEditDialog;







