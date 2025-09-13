import { useMemo } from 'react';
import { useTenant as baseUseTenant } from '@/context/TenantContext';

/**
 * A safe wrapper around useTenant that returns a lightweight fallback
 * when no TenantProvider is mounted (public store entry).
 */
export function useTenantSafe(): {
  currentOrganization: any | null;
  isLoading: boolean;
  isOrganizationReady: boolean;
} {
  try {
    const t = baseUseTenant() as any;
    // Normalize optional flag
    return {
      currentOrganization: t?.currentOrganization ?? t?.organization ?? null,
      isLoading: !!t?.isLoading,
      isOrganizationReady: !!t?.isOrganizationReady || !!t?.currentOrganization,
    };
  } catch (_e) {
    // Fallback: derive organization from early store data or localStorage
    const win: any = typeof window !== 'undefined' ? window : {};
    const org = win.__EARLY_STORE_DATA__?.data?.organization_details || win.__CURRENT_STORE_DATA__?.organization || null;
    const currentOrganization = org || (() => {
      try {
        const raw = localStorage.getItem('bazaar_organization_id');
        if (raw && raw.length > 10) return { id: raw };
      } catch {}
      return null;
    })();
    return {
      currentOrganization,
      isLoading: false,
      isOrganizationReady: !!currentOrganization,
    };
  }
}

