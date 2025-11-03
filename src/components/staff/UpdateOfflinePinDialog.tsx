import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { POSStaffSession, staffService } from '@/services/staffService';
import { verifyStaffPinOffline, updateStaffPinOffline } from '@/lib/offline/staffCredentials';
import { useAuth } from '@/context/AuthContext';

interface UpdateOfflinePinDialogProps {
  open: boolean;
  onClose: () => void;
  staff: POSStaffSession | null;
  onUpdated?: () => void;
}

const UpdateOfflinePinDialog: React.FC<UpdateOfflinePinDialogProps> = ({ open, onClose, staff, onUpdated }) => {
  const { organization, userProfile } = useAuth();
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isManager = useMemo(() => {
    const role = userProfile?.role;
    return role === 'admin' || role === 'owner' || (userProfile as any)?.permissions?.canManageSettings === true;
  }, [userProfile]);

  const reset = () => {
    setNewPin('');
    setConfirmPin('');
    setAdminPin('');
  };

  const handleSubmit = async () => {
    if (!staff || !organization?.id) return;
    const pinRegex = /^\d{4,6}$/;
    if (!pinRegex.test(newPin)) {
      toast.error('الرجاء إدخال PIN من 4 إلى 6 أرقام');
      return;
    }
    if (newPin !== confirmPin) {
      toast.error('تأكيد PIN لا يطابق');
      return;
    }

    setIsLoading(true);
    try {
      // إن لم يكن المستخدم مديراً، نطلب تفويض PIN لمدير لديه صلاحيات
      if (!isManager) {
        if (!pinRegex.test(adminPin)) {
          toast.error('يجب إدخال PIN مدير للتفويض');
          return;
        }
        const adminCheck = await verifyStaffPinOffline({ organizationId: organization.id, pin: adminPin });
        if (!adminCheck.success || !(adminCheck.staff as any)?.permissions?.canManageSettings) {
          toast.error('تفويض المدير غير صالح');
          return;
        }
      }

      if (typeof navigator === 'undefined' || navigator.onLine) {
        const res = await staffService.updatePin(staff.id, newPin);
        if (!res.success) throw new Error(res.error || 'فشل تحديث PIN');
        toast.success('تم تحديث PIN وحفظه للأوفلاين');
      } else {
        await updateStaffPinOffline({ staffId: staff.id, organizationId: organization.id, newPin });
        toast.success('تم تحديث PIN محلياً للأوفلاين');
      }

      onUpdated && onUpdated();
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || 'تعذر تحديث PIN');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تحديث PIN للأوفلاين</DialogTitle>
          <DialogDescription>
            {staff ? `الموظف: ${staff.staff_name}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="text-sm">PIN جديد</label>
            <Input
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              inputMode="numeric"
              placeholder="أدخل PIN (4-6 أرقام)"
            />
          </div>
          <div>
            <label className="text-sm">تأكيد PIN</label>
            <Input
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              inputMode="numeric"
              placeholder="أعد إدخال PIN"
            />
          </div>

          {!isManager && (
            <>
              <Separator />
              <div>
                <label className="text-sm">PIN المدير للتفويض</label>
                <Input
                  value={adminPin}
                  onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="أدخل PIN المدير"
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => { reset(); onClose(); }} disabled={isLoading}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || !newPin || !confirmPin}>
            {isLoading ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpdateOfflinePinDialog;

