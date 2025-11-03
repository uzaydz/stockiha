import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import orderGroupsApi, { OrderGroup } from '@/services/orderGroupsApi';
import onlineOrdersGroupsApi from '@/services/onlineOrdersGroupsApi';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  orderId: string;
  onAssigned?: (staffId?: string) => void;
}

const strategyLabels: Record<string, string> = {
  claim_only: 'تعيين يدوي (Claim)',
  round_robin: 'توزيع دائري',
  least_busy: 'الأقل انشغالاً',
  weighted: 'بالأوزان',
  manual: 'توزيع يدوي',
};

const AutoAssignDialog: React.FC<Props> = ({ open, onOpenChange, organizationId, orderId, onAssigned }) => {
  const [groups, setGroups] = useState<OrderGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!open || !organizationId) return;
      try {
        const list = await orderGroupsApi.list(organizationId);
        const enabled = list.filter(g => g.enabled);
        setGroups(enabled);
        if (enabled.length && !selectedGroupId) {
          setSelectedGroupId(enabled[0].id);
        }
      } catch (e) {
        // ignore
      }
    };
    void load();
  }, [open, organizationId]);

  const selectedGroup = useMemo(() => groups.find(g => g.id === selectedGroupId) || null, [groups, selectedGroupId]);
  const unsupported = selectedGroup ? (selectedGroup.strategy === 'claim_only' || selectedGroup.strategy === 'manual') : false;

  const handleConfirm = async () => {
    if (!selectedGroupId) return;
    if (unsupported) {
      toast.error('لا يمكن التعيين التلقائي لهذه المجموعة (الاستراتيجية ليست تلقائية)');
      return;
    }
    try {
      setWorking(true);
      const res = await onlineOrdersGroupsApi.autoAssignOnlineOrder(orderId, selectedGroupId);
      if (!res.success) {
        toast.error(res.error || 'فشل التعيين التلقائي');
        return;
      }
      toast.success('تم التعيين التلقائي وفق استراتيجية المجموعة');
      onOpenChange(false);
      onAssigned && onAssigned(res.staff_id);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعيين تلقائي</DialogTitle>
          <DialogDescription>
            اختر مجموعة ليتم توزيع الطلب تلقائياً على أحد أعضاء المجموعة حسب الاستراتيجية والقواعد.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>اختر المجموعة</Label>
            <Select value={selectedGroupId} onValueChange={setSelectedGroupId}>
              <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name} • {strategyLabels[g.strategy] || g.strategy}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {unsupported && (
            <div className="text-xs text-muted-foreground">
              هذه المجموعة ليست باستراتيجية تلقائية. اختر مجموعة باستراتيجية تلقائية (round_robin/least_busy/weighted).
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={!selectedGroupId || unsupported || working}>تأكيد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AutoAssignDialog;
