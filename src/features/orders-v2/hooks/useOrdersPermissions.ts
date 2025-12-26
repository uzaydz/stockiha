/**
 * Hook لإدارة صلاحيات الطلبيات
 */

import { useMemo } from 'react';
import { useUnifiedPermissions } from '@/hooks/useUnifiedPermissions';

export interface OrdersPermissions {
  canView: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canProcessPayments: boolean;
  canManageGroups: boolean;
  canBulkAssign: boolean;
  isReady: boolean;
}

export const useOrdersPermissions = (): OrdersPermissions => {
  const perms = useUnifiedPermissions();

  return useMemo(() => ({
    canView: perms.ready ? perms.anyOf(['viewOrders', 'canViewOnlineOrders', 'canManageOnlineOrders']) : false,
    canUpdate: perms.ready ? perms.anyOf(['canUpdateOrderStatus', 'canManageOnlineOrders']) : false,
    canCancel: perms.ready ? perms.anyOf(['canCancelOrders', 'canManageOnlineOrders']) : false,
    canProcessPayments: perms.ready ? perms.anyOf(['canProcessOrderPayments', 'canManageOnlineOrders']) : false,
    canManageGroups: perms.ready ? perms.anyOf(['canManageOnlineOrderGroups']) : false,
    canBulkAssign: perms.ready ? perms.anyOf(['canManageOnlineOrderGroups']) : false,
    isReady: perms.ready,
  }), [perms]);
};

export default useOrdersPermissions;
