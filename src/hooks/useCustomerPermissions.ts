import { useEffect, useState } from 'react';
import { checkUserPermissionsLocal } from '@/lib/utils/permissions-utils';

export interface CustomerPermissionsState {
  hasViewPermission: boolean;
  hasAddPermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
  permissionLoading: boolean;
}

export function useCustomerPermissions(user: any, userProfile: any): CustomerPermissionsState {
  const [state, setState] = useState<CustomerPermissionsState>({
    hasViewPermission: false,
    hasAddPermission: false,
    hasEditPermission: false,
    hasDeletePermission: false,
    permissionLoading: true,
  });

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      if (!user) {
        if (mounted) setState((s) => ({ ...s, permissionLoading: false }));
        return;
      }

      try {
        const canViewCustomers = checkUserPermissionsLocal(user, 'viewCustomers' as any, userProfile);
        const canManageCustomers = checkUserPermissionsLocal(user, 'manageCustomers' as any, userProfile);

        if (mounted) {
          setState({
            hasViewPermission: !!canViewCustomers,
            hasAddPermission: !!canManageCustomers,
            hasEditPermission: !!canManageCustomers,
            hasDeletePermission: !!canManageCustomers,
            permissionLoading: false,
          });
        }
      } catch {
        if (mounted) setState((s) => ({ ...s, permissionLoading: false }));
      }
    };

    check();
    return () => {
      mounted = false;
    };
  }, [user, userProfile]);

  return state;
}
