import React, { memo, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Eye,
  Edit,
  Hand,
  Repeat,
  Shuffle,
  MoreVertical,
  Loader2,
  Trash2,
  Ban,
} from "lucide-react";
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
  const [reassignOpen, setReassignOpen] = useState(false);
  const [autoAssignOpen, setAutoAssignOpen] = useState(false);
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
        if (!groupId || !canSelfAssign) { if (mounted) setClaimable(false); return; }
        const group = await orderGroupsApi.get(groupId);
        if (!group || group.strategy !== 'claim_only') { if (mounted) setClaimable(false); return; }
        // order in this list is already server-visible; claimable if not assigned
        if (mounted) setClaimable(!assignedStaff);
      } catch { if (mounted) setClaimable(false); }
    };
    void evalClaimable();
    return () => { mounted = false; };
  }, [perms.ready, currentOrganization?.id, order?.id, (order as any)?.assignment?.staff_id, staffId]);
  
  const handleCellClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const detailsUrl = order?.customer_order_number
    ? `/dashboard/orders-v2/${order.customer_order_number}`
    : `/dashboard/orders-v2/${order?.id}`;

  return (
    <>
      <div className="flex items-center justify-center gap-1" onClick={handleCellClick}>
        {/* زر التفاصيل السريعة */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-md hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:text-blue-600 transition-colors"
          asChild
        >
          <Link to={detailsUrl} target="_self" onClick={(e) => e.stopPropagation()}>
            <Eye className="h-3.5 w-3.5" />
            <span className="sr-only">عرض التفاصيل</span>
          </Link>
        </Button>

        {/* قائمة الإجراءات الوحيدة */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-muted/60 transition-colors data-[state=open]:bg-muted"
            >
              <MoreVertical className="h-3.5 w-3.5 text-foreground/70" />
              <span className="sr-only">الإجراءات</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs text-muted-foreground font-medium">
              الإجراءات
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* تعديل الطلب */}
            {hasUpdatePermission && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setEditDialogOpen(true);
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-amber-50 dark:hover:bg-amber-950/20"
              >
                <Edit className="h-4 w-4 text-amber-600" />
                <span className="text-sm">تعديل</span>
              </DropdownMenuItem>
            )}

            {/* تعيين لنفسي */}
            {claimable && (
              <DropdownMenuItem
                disabled={assigning}
                onClick={async (e) => {
                  e.stopPropagation();
                  if (!currentOrganization?.id) return;
                  const groupId = (perms?.data?.permissions as any)?.onlineOrdersGroupId as string | undefined;
                  if (!groupId || !staffId) return;
                  try {
                    setAssigning(true);
                    const res = await onlineOrdersGroupsApi.claimOnlineOrder(order.id, staffId, groupId);
                    if (!res.success) {
                      await orderGroupsService.assignToMe(currentOrganization.id, order.id, groupId, staffId);
                    }
                    setClaimable(false);
                    toast.success('تم تعيين الطلب لك');
                  } catch (err: any) {
                    toast.error(err?.message || 'فشل تعيين الطلب');
                  } finally {
                    setAssigning(false);
                  }
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-green-50 dark:hover:bg-green-950/20"
              >
                {assigning ? (
                  <Loader2 className="h-4 w-4 animate-spin text-green-600" />
                ) : (
                  <Hand className="h-4 w-4 text-green-600" />
                )}
                <span className="text-sm">تعيين لي</span>
              </DropdownMenuItem>
            )}

            {/* إعادة تعيين (للمدراء) */}
            {perms.anyOf(['canReassignOnlineOrders','canManageOnlineOrderGroups']) && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setReassignOpen(true);
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                <Repeat className="h-4 w-4 text-purple-600" />
                <span className="text-sm">إعادة تعيين</span>
              </DropdownMenuItem>
            )}

            {/* تعيين تلقائي (للمدراء) */}
            {perms.anyOf(['canManageOnlineOrderGroups']) && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setAutoAssignOpen(true);
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-950/20"
              >
                <Shuffle className="h-4 w-4 text-indigo-600" />
                <span className="text-sm">تعيين تلقائي</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            {/* حذف الطلب */}
            {hasCancelPermission && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // افتح حوار الحذف من OrderActionsDropdown
                  const dropdownTrigger = document.querySelector('[data-delete-trigger]') as HTMLElement;
                  dropdownTrigger?.click?.();
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">حذف</span>
              </DropdownMenuItem>
            )}

            {/* حظر العميل */}
            {(hasUpdatePermission || hasCancelPermission) && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  // افتح حوار الحظر من OrderActionsDropdown
                  const blockTrigger = document.querySelector('[data-block-trigger]') as HTMLElement;
                  blockTrigger?.click?.();
                }}
                className="flex items-center gap-2.5 py-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <Ban className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">حظر</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* عنصر مخفي لـ trigger حوارات الحذف والحظر من OrderActionsDropdown */}
        <div className="hidden">
          <OrderActionsDropdown
            order={order}
            onUpdateStatus={onUpdateStatus}
            hasUpdatePermission={hasUpdatePermission}
            hasCancelPermission={hasCancelPermission}
          />
        </div>
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
          onAssigned={async () => {
            try {
              window.dispatchEvent(new CustomEvent('orders:refresh'));
            } catch {}
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
    </>
  );
};

export default memo(OrderRowActions);
