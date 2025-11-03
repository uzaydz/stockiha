import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye as EyeIcon, Edit, Hand, Repeat, Shuffle } from "lucide-react";
import { Link } from "react-router-dom";
import OrderActionsDropdown from "../OrderActionsDropdown";
import OrderEditDialog from "../../dialogs/OrderEditDialog";
import { usePermissions } from '@/hooks/usePermissions';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { orderGroupsService } from '@/services/orderGroupsService';
import onlineOrdersGroupsApi from '@/services/onlineOrdersGroupsApi';
import orderGroupsApi from '@/services/orderGroupsApi';
import ReassignOrderDialog from '@/components/orders/dialogs/ReassignOrderDialog';
import AutoAssignDialog from '@/components/orders/dialogs/AutoAssignDialog';
import { supabase } from '@/lib/supabase-unified';
import { toast } from 'sonner';

interface OrderRowActionsProps {
  order: any;
  hasUpdatePermission: boolean;
  hasCancelPermission: boolean;
  onUpdateStatus: (orderId: string, status: string) => Promise<void>;
  onOrderUpdated?: (updatedOrder: any) => void;
}

const OrderRowActions: React.FC<OrderRowActionsProps> = ({
  order,
  hasUpdatePermission,
  hasCancelPermission,
  onUpdateStatus,
  onOrderUpdated,
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const perms = usePermissions();
  const { currentOrganization } = useTenant();
  const { userProfile } = useAuth();
  const [claimable, setClaimable] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [isMine, setIsMine] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
  const [overrideAssigned, setOverrideAssigned] = useState<{ id?: string; name?: string } | null>(null);
  const staffId = userProfile?.id as string | undefined;
  const groupId = (perms?.data?.permissions as any)?.onlineOrdersGroupId as string | undefined;
  const assignedStaffId = (order as any)?.assignment?.staff_id as string | undefined;

  useEffect(() => {
    let mounted = true;
    const evalClaimable = async () => {
      try {
        if (!perms?.ready || !currentOrganization?.id) return;
        const groupId = (perms?.data?.permissions as any)?.onlineOrdersGroupId as string | undefined;
        const canSelfAssign = perms.anyOf(['canSelfAssignOnlineOrders']);
        const assignedStaff = (order as any)?.assignment?.staff_id as string | undefined;
        const mine = assignedStaff && staffId ? assignedStaff === staffId : false;
        setIsMine(Boolean(mine));
        if (!groupId || !canSelfAssign) { if (mounted) setClaimable(false); return; }
        const group = await orderGroupsApi.get(groupId);
        if (!group || group.strategy !== 'claim_only') { if (mounted) setClaimable(false); return; }
        // order in this list is already server-visible; claimable if not assigned
        if (mounted) setClaimable(!assignedStaff);
      } catch { if (mounted) setClaimable(false); }
    };
    void evalClaimable();
    return () => { mounted = false; };
  }, [perms.ready, currentOrganization?.id, order?.id, (order as any)?.assignment?.staff_id]);
  
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const detailsUrl = order?.customer_order_number
    ? `/dashboard/orders-v2/${order.customer_order_number}`
    : `/dashboard/orders-v2/${order?.id}`;

  return (
    <TableCell 
      className="text-right py-4 px-4" 
      onClick={handleCellClick}
      style={{ 
        contain: 'layout',
        willChange: 'auto'
      }}
    >
      <div className="flex items-center justify-end gap-2" style={{ willChange: 'auto', contain: 'layout' }}>
        {isMine && (
          <Badge variant="secondary">معين لك</Badge>
        )}
        {!isMine && ((overrideAssigned?.id || (order as any)?.assignment?.staff_id)) && ((overrideAssigned?.name || (order as any)?.assigned_staff_name || (order as any)?.assigned_staff_name_resolved)) && (
          <Badge variant="outline">معين لـ {(overrideAssigned?.name) || (order as any).assigned_staff_name || (order as any).assigned_staff_name_resolved}</Badge>
        )}
        {/* إعادة تعيين (للمدراء) */}
        {perms.anyOf(['canReassignOnlineOrders','canManageOnlineOrderGroups']) && (
          <Button variant="outline" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setReassignOpen(true); }} aria-label="إعادة تعيين">
            <Repeat className="h-4 w-4" />
            <span>إعادة تعيين</span>
          </Button>
        )}

        {/* تعيين تلقائي (للمدراء) */}
        {perms.anyOf(['canManageOnlineOrderGroups']) && (
          <Button variant="outline" size="sm" className="gap-1" onClick={(e) => { e.stopPropagation(); setAutoAssignOpen(true); }} aria-label="تعيين تلقائي">
            <Shuffle className="h-4 w-4" />
            <span>تعيين تلقائي</span>
          </Button>
        )}

        {claimable && (
          <Button variant="outline" size="sm" className="gap-1" disabled={assigning} onClick={async (e) => {
            e.stopPropagation();
            if (!currentOrganization?.id) return;
            const groupId = (perms?.data?.permissions as any)?.onlineOrdersGroupId as string | undefined;
            if (!groupId || !staffId) return;
            try {
              setAssigning(true);
              // Try server-side claim; fallback to local service
              const res = await onlineOrdersGroupsApi.claimOnlineOrder(order.id, staffId, groupId);
              if (!res.success) {
                // fallback to local Dexie when RPC not ready
                await orderGroupsService.assignToMe(currentOrganization.id, order.id, groupId, staffId);
              }
              setClaimable(false);
              toast.success('تم تعيين الطلب لك');
            } catch (err: any) {
              toast.error(err?.message || 'فشل تعيين الطلب');
            } finally {
              setAssigning(false);
            }
          }} aria-label="تعيين لنفسي">
            <Hand className="h-4 w-4" />
            <span>تعيين</span>
          </Button>
        )}
        {/* زر تفاصيل سريع */}
        <Button variant="ghost" size="icon" asChild aria-label="تفاصيل الطلب">
          <Link to={detailsUrl} target="_self" onClick={(e) => e.stopPropagation()}>
            <EyeIcon className="h-4 w-4" />
          </Link>
        </Button>

        {/* زر التعديل */}
        {hasUpdatePermission && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setEditDialogOpen(true)}
            aria-label="تعديل الطلب"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}

        {/* قائمة الإجراءات */}
        <OrderActionsDropdown
          order={order}
          onUpdateStatus={onUpdateStatus}
          hasUpdatePermission={hasUpdatePermission}
          hasCancelPermission={hasCancelPermission}
        />
      </div>

      {/* نافذة إعادة التعيين */}
      {reassignOpen && (
        <ReassignOrderDialog
          open={reassignOpen}
          onOpenChange={setReassignOpen}
          organizationId={currentOrganization?.id || ''}
          groupId={groupId}
          orderId={order.id}
          currentAssigneeId={assignedStaffId || null}
          reassign={groupId ? async (orderId, fromStaffId, toStaffId, gid) => {
            const effectiveGroupId = gid || groupId;
            if (!effectiveGroupId) return { success: false, error: 'no_group' } as any;
            if (!staffId) return { success: false, error: 'no_actor' } as any;
            const res = await onlineOrdersGroupsApi.reassignOnlineOrder(orderId, fromStaffId, toStaffId, effectiveGroupId, staffId);
            if (!res.success) toast.error(res.error || 'فشل إعادة التعيين');
            else toast.success('تمت إعادة التعيين');
            return res as any;
          } : undefined}
        />
      )}

      {/* نافذة التعيين التلقائي */}
      {autoAssignOpen && (
        <AutoAssignDialog
          open={autoAssignOpen}
          onOpenChange={setAutoAssignOpen}
          organizationId={currentOrganization?.id || ''}
          orderId={order.id}
          onAssigned={async (newStaffId) => {
            try {
              if (newStaffId) {
                const { data, error } = await supabase.from('users').select('id,name,email').eq('id', newStaffId).maybeSingle();
                if (!error && data) {
                  setOverrideAssigned({ id: data.id, name: data.name || data.email || data.id });
                } else {
                  setOverrideAssigned({ id: newStaffId, name: `${newStaffId.slice(0,6)}…` });
                }
              }
            } finally {
              try { window.dispatchEvent(new CustomEvent('orders:refresh')); } catch {}
            }
          }}
        />
      )}

      {/* حوار التعديل */}
      <OrderEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        order={order}
        onOrderUpdated={onOrderUpdated}
      />
    </TableCell>
  );
};

export default memo(OrderRowActions);
