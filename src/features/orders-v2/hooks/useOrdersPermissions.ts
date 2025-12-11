/**
 * Hook لإدارة صلاحيات الطلبيات
 */

import { useMemo } from 'react';
import { usePermissions } from '@/hooks/usePermissions';

export interface OrdersPermissions {
  canView: boolean;
  canUpdate: boolean;
  canCancel: boolean;
  canManageGroups: boolean;
  canBulkAssign: boolean;
  isReady: boolean;
}

export const useOrdersPermissions = (): OrdersPermissions => {
  const perms = usePermissions();

  return useMemo(() => ({
    canView: perms.ready ? perms.anyOf(['viewOrders']) : false,
    canUpdate: perms.ready ? perms.anyOf(['updateOrders', 'manageOrders']) : false,
    canCancel: perms.ready ? perms.anyOf(['cancelOrders', 'manageOrders']) : false,
    canManageGroups: perms.ready ? perms.anyOf(['canManageOnlineOrderGroups']) : false,
    canBulkAssign: perms.ready ? perms.anyOf(['canManageOnlineOrderGroups']) : false,
    isReady: perms.ready,
  }), [perms]);
};

export default useOrdersPermissions;
