import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import orderGroupsApi, { OrderGroup } from '@/services/orderGroupsApi';
import onlineOrdersGroupsApi from '@/services/onlineOrdersGroupsApi';
import { supabase } from '@/lib/supabase-unified';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
}

const strategyLabels: Record<string, string> = {
  claim_only: 'تعيين يدوي (Claim)',
  round_robin: 'توزيع دائري',
  least_busy: 'الأقل انشغالاً',
  weighted: 'بالأوزان',
  manual: 'توزيع يدوي',
};

const BulkAutoAssignDialog: React.FC<Props> = ({ open, onOpenChange, organizationId }) => {
  const { userProfile } = useAuth();
  const [groups, setGroups] = useState<OrderGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; success: number; failed: number }>({ processed: 0, success: 0, failed: 0 });
  const [failureReasons, setFailureReasons] = useState<Record<string, number>>({});

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
    if (!userProfile?.id) {
      toast.error('حساب المستخدم غير معروف');
      return;
    }
    try {
      // Start debug logging
      try {
        // eslint-disable-next-line no-console
        console.groupCollapsed('[BulkAutoAssign] Start bulk auto-assign');
        // eslint-disable-next-line no-console
        console.log('[BulkAutoAssign] organizationId:', organizationId);
        // eslint-disable-next-line no-console
        console.log('[BulkAutoAssign] selectedGroupId:', selectedGroupId);
      } catch {}
      setWorking(true);
      setProgress({ processed: 0, success: 0, failed: 0 });
      setFailureReasons({});

      let totalSuccess = 0;
      let totalFailed = 0;
      const reasonsLocal: Record<string, number> = {};

      // Quick validations: active members and any rules present (warn-only)
      try {
        const { count: membersCount } = await supabase
          .from('order_group_members')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', selectedGroupId)
          .eq('active', true);
        try { console.log('[BulkAutoAssign] active members =', membersCount); } catch {}
        if (!membersCount || membersCount <= 0) {
          toast.error('لا يوجد أعضاء نشطون في هذه المجموعة. أضف أعضاء قبل التعيين.');
          return;
        }
        const { count: rulesCount } = await supabase
          .from('order_group_rules')
          .select('id', { count: 'exact', head: true })
          .eq('group_id', selectedGroupId);
        try { console.log('[BulkAutoAssign] rules count =', rulesCount); } catch {}
        if (!rulesCount || rulesCount <= 0) {
          toast.warning('تنبيه: لا توجد قواعد لهذه المجموعة. أضف قاعدة "الكل" أو قواعد المنتجات لتصبح الطلبيات مؤهلة. سيتم المحاولة عبر أفضل مجموعة لكل طلب.');
        }
      } catch {}

      const autoGroups = groups.filter(g => g.enabled && ['round_robin','least_busy','weighted'].includes(g.strategy));

      const fetchUnassignedForGroup = async (groupId: string) => {
        const res = await onlineOrdersGroupsApi.getOnlineOrdersForStaff(
          organizationId,
          userProfile.id,
          groupId,
          {
            page: 1,
            page_size: 200,
            include_items: false,
            include_counts: false,
            mine_only: false,
            unassigned_only: true,
          }
        );
        try {
          console.log('[BulkAutoAssign] fetchUnassignedForGroup', groupId, {
            success: res.success,
            error: res.error,
            count: (res.orders || []).length,
          });
        } catch {}
        if (!res.success) return [] as any[];
        return res.orders || [];
      };

      let orders: any[] = await fetchUnassignedForGroup(selectedGroupId);
      try { console.log('[BulkAutoAssign] initial unassigned in selected group:', orders.length); } catch {}
      if (orders.length === 0) {
        // Fallback: aggregate across all auto groups
        const seen = new Set<string>();
        const agg: any[] = [];
        for (const g of autoGroups) {
          const list = await fetchUnassignedForGroup(g.id);
          for (const o of list) { if (!seen.has(o.id)) { seen.add(o.id); agg.push(o); } }
        }
        orders = agg;
        try { console.log('[BulkAutoAssign] aggregated across auto groups, total:', orders.length); } catch {}
      }

      for (const order of orders) {
        try {
          // Try selected group first
          let assigned = await onlineOrdersGroupsApi.autoAssignOnlineOrder(order.id, selectedGroupId);
          try {
            console.log('[BulkAutoAssign] try assign', {
              orderId: order.id,
              selectedGroupId,
              result: assigned,
            });
          } catch {}
          if (!assigned.success) {
            // Fallback: pick best group per order
            try {
              const { data: best, error: bestErr } = await supabase.rpc('find_best_group_for_order' as any, { p_org_id: organizationId, p_order_id: order.id } as any);
              const bestGroupId = (best as any) || null;
              try { console.log('[BulkAutoAssign] best group for order', order.id, { bestGroupId, bestErr }); } catch {}
              if (!bestErr && bestGroupId) {
                assigned = await onlineOrdersGroupsApi.autoAssignOnlineOrder(order.id, bestGroupId);
                try { console.log('[BulkAutoAssign] fallback assign result', { orderId: order.id, bestGroupId, result: assigned }); } catch {}
              }
            } catch {}
          }
          if (assigned.success) {
            totalSuccess += 1;
          } else {
            totalFailed += 1;
            const reason = (assigned as any)?.error || 'unknown';
            reasonsLocal[reason] = (reasonsLocal[reason] || 0) + 1;
            try { console.warn('[BulkAutoAssign] assign failed', { orderId: order.id, reason }); } catch {}
          }
        } catch {
          totalFailed += 1;
          reasonsLocal.exception = (reasonsLocal.exception || 0) + 1;
          try { console.error('[BulkAutoAssign] exception during assign', { orderId: order.id }); } catch {}
        } finally {
          setProgress(prev => ({ ...prev, processed: prev.processed + 1, success: totalSuccess, failed: totalFailed }));
        }
      }

      setFailureReasons(reasonsLocal);
      const failKeys = Object.keys(reasonsLocal);
      const failText = totalFailed ? `، إخفاقات: ${totalFailed}${failKeys.length ? ` (${failKeys.map(k => `${k}:${reasonsLocal[k]}`).join(', ')})` : ''}` : '';
      toast.success(`تم تعيين ${totalSuccess} طلب${totalSuccess !== 1 ? 'اً' : ''} تلقائياً${failText}`);
      try {
        console.log('[BulkAutoAssign] summary', { processed: progress.processed, success: totalSuccess, failed: totalFailed, reasons: reasonsLocal });
        console.groupEnd?.();
      } catch {}
      onOpenChange(false);
      try { window.dispatchEvent(new CustomEvent('orders:refresh')); } catch {}
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تعيين تلقائي لكل الطلبات غير المعينة</DialogTitle>
          <DialogDescription>
            اختر مجموعة وسيتم تعيين جميع الطلبيات غير المعينة وفق استراتيجية المجموعة المحددة. لن يتم تغيير الطلبيات المعينة مسبقاً.
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
          {working && (
            <div className="text-xs text-muted-foreground">
              جاري التعيين... تمت معالجة {progress.processed} (نجاح: {progress.success}، فشل: {progress.failed})
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

export default BulkAutoAssignDialog;
