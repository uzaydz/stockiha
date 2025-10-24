import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Key, Eye, EyeOff, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { staffService } from '@/services/staffService';
import type { POSStaffSession } from '@/types/staff';

interface UpdatePinDialogProps {
  open: boolean;
  onClose: () => void;
  staff: POSStaffSession | null;
}

export const UpdatePinDialog: React.FC<UpdatePinDialogProps> = ({
  open,
  onClose,
  staff,
}) => {
  const queryClient = useQueryClient();

  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  // إعادة تعيين عند الإغلاق
  useEffect(() => {
    if (!open) {
      setNewPin('');
      setConfirmPin('');
      setShowNewPin(false);
      setShowConfirmPin(false);
    }
  }, [open]);

  // تحديث PIN
  const updatePinMutation = useMutation({
    mutationFn: ({ staffId, pin }: { staffId: string; pin: string }) =>
      staffService.updatePin(staffId, pin),
    onSuccess: (data) => {
      if (data.success) {
        toast.success('تم تحديث كود PIN بنجاح');
        queryClient.invalidateQueries({ queryKey: ['pos-staff-sessions'] });
        onClose();
      } else {
        toast.error(data.error || 'فشل تحديث كود PIN');
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'حدث خطأ أثناء تحديث كود PIN');
    },
  });

  // التحقق من الصحة
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!newPin) {
      errors.push('كود PIN الجديد مطلوب');
    } else if (newPin.length !== 6) {
      errors.push('كود PIN يجب أن يكون 6 أرقام بالضبط');
    } else if (!/^\d+$/.test(newPin)) {
      errors.push('كود PIN يجب أن يحتوي على أرقام فقط');
    }

    if (newPin && newPin !== confirmPin) {
      errors.push('كود PIN وتأكيد كود PIN غير متطابقين');
    }

    return errors;
  }, [newPin, confirmPin]);

  const isValid = validationErrors.length === 0;

  // معالجة الحفظ
  const handleSave = useCallback(() => {
    if (!staff || !isValid) {
      if (validationErrors.length > 0) {
        toast.error(validationErrors[0]);
      }
      return;
    }

    updatePinMutation.mutate({
      staffId: staff.id,
      pin: newPin,
    });
  }, [staff, isValid, validationErrors, newPin, updatePinMutation]);

  // التعامل مع Enter
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && isValid) {
        handleSave();
      }
    },
    [isValid, handleSave]
  );

  if (!staff) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            تغيير كود PIN
          </DialogTitle>
          <DialogDescription>
            تحديث كود PIN للموظف: <span className="font-semibold">{staff.staff_name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-pin">
              كود PIN الجديد <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="new-pin"
                type={showNewPin ? 'text' : 'password'}
                placeholder="أدخل كود PIN الجديد (6 أرقام)"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                maxLength={6}
                autoFocus
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowNewPin(!showNewPin)}
              >
                {showNewPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {newPin && newPin.length !== 6 && (
              <p className="text-sm text-yellow-600">كود PIN يجب أن يكون 6 أرقام بالضبط ({newPin.length}/6)</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-pin">
              تأكيد كود PIN <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-new-pin"
                type={showConfirmPin ? 'text' : 'password'}
                placeholder="أعد إدخال كود PIN الجديد"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                onKeyDown={handleKeyDown}
                maxLength={6}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2"
                onClick={() => setShowConfirmPin(!showConfirmPin)}
              >
                {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {confirmPin && newPin !== confirmPin && (
              <p className="text-sm text-red-600">كود PIN غير متطابق</p>
            )}
          </div>

          {validationErrors.length > 0 && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
              <ul className="list-disc space-y-1 pr-4">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!isValid || updatePinMutation.isPending}
              className="flex-1 gap-2"
            >
              <Save className="h-4 w-4" />
              {updatePinMutation.isPending ? 'جاري التحديث...' : 'تحديث كود PIN'}
            </Button>
            <Button variant="outline" onClick={onClose} className="gap-2">
              <X className="h-4 w-4" />
              إلغاء
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
