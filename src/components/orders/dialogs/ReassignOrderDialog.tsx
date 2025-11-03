import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import orderGroupsApi, { OrderGroupMember } from '@/services/orderGroupsApi';
import onlineOrdersGroupsApi from '@/services/onlineOrdersGroupsApi';
import { useAuth } from '@/context/AuthContext';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  groupId?: string; // optional: allow selecting group if missing
  orderId: string;
  onReassigned?: () => void;
  // optional: parent can override reassign behavior; should accept selected group id
  reassign?: (orderId: string, fromStaffId: string | null, toStaffId: string, groupId: string) => Promise<{ success: boolean; error?: string }>;
  currentAssigneeId?: string | null;
}

const ReassignOrderDialog: React.FC<Props> = ({ open, onOpenChange, organizationId, groupId, orderId, onReassigned, reassign, currentAssigneeId }) => {
  const [members, setMembers] = useState<OrderGroupMember[]>([]);
  const [staff, setStaff] = useState<Array<{ id: string; name: string; email?: string }>>([]);
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | ''>('');
  const [targetId, setTargetId] = useState<string>('');
  const [working, setWorking] = useState(false);
  const { userProfile } = useAuth();

  useEffect(() => {
    const load = async () => {
      if (!open || !organizationId) return;
      try {
        // load staff list
        const s = await orderGroupsApi.listOrgStaff(organizationId);
        setStaff(s);

        // resolve group selection
        let effectiveGroupId = groupId;
        if (!effectiveGroupId) {
          const gs = await orderGroupsApi.list(organizationId);
          setGroups(gs.map(g => ({ id: g.id, name: g.name })));
          if (gs.length > 0) {
            effectiveGroupId = gs[0].id;
          }
        }
        setSelectedGroupId(effectiveGroupId || '');

        // load members for selected group if any
        if (effectiveGroupId) {
          const ms = await orderGroupsApi.listMembers(effectiveGroupId);
          setMembers(ms);
        } else {
          setMembers([]);
        }
      } catch {}
    };
    void load();
  }, [open, organizationId, groupId]);

  // reload members when user picks a different group
  useEffect(() => {
    const reloadMembers = async () => {
      if (!open) return;
      if (!selectedGroupId) { setMembers([]); return; }
      try {
        const ms = await orderGroupsApi.listMembers(selectedGroupId);
        setMembers(ms);
      } catch {}
    };
    void reloadMembers();
  }, [selectedGroupId, open]);

  const memberOptions = useMemo(() => {
    return members.map(m => ({ id: m.staff_id, label: staff.find(s => s.id === m.staff_id)?.name || m.staff_id }));
  }, [members, staff]);

  const handleConfirm = async () => {
    if (!targetId) return;
    const effectiveGroupId = groupId || selectedGroupId;
    if (!effectiveGroupId) return;
    try {
      setWorking(true);
      let res: { success: boolean; error?: string } = { success: false };
      if (typeof reassign === 'function') {
        res = await reassign(orderId, currentAssigneeId || null, targetId, effectiveGroupId);
      } else {
        const actorId = userProfile?.id as string | undefined;
        if (!actorId) { res = { success: false, error: 'no_actor' }; }
        else {
          res = await onlineOrdersGroupsApi.reassignOnlineOrder(orderId, currentAssigneeId || null, targetId, effectiveGroupId, actorId);
        }
      }
      if (res.success) {
        onOpenChange(false);
        onReassigned && onReassigned();
      }
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>إعادة تعيين الطلب</DialogTitle>
          <DialogDescription>
            اختر عضواً من مجموعة الطلبات لإعادة تعيين هذا الطلب إليه.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {!groupId && (
            <div>
              <Label>اختر المجموعة</Label>
              <Select value={selectedGroupId} onValueChange={(v) => setSelectedGroupId(v)}>
                <SelectTrigger><SelectValue placeholder="اختر المجموعة" /></SelectTrigger>
                <SelectContent>
                  {groups.map(g => (
                    <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <Label>اختر الموظف</Label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger><SelectValue placeholder="اختر الموظف" /></SelectTrigger>
              <SelectContent>
                {memberOptions.map(opt => (
                  <SelectItem key={opt.id} value={opt.id}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>إلغاء</Button>
          <Button onClick={handleConfirm} disabled={!targetId || (!groupId && !selectedGroupId) || working}>تأكيد</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReassignOrderDialog;
