import React, { createContext, useContext } from 'react';
import type { TenantContextType, Organization } from '@/context/tenant/types';

const TenantPublicContext = createContext<TenantContextType | null>(null);

export const TenantProvider: React.FC<{ children: React.ReactNode }>= ({ children }) => {
  // derive organization from early store data or localStorage
  let org: Organization | null = null;
  try {
    const early = (window as any).__EARLY_STORE_DATA__;
    const o = early?.data?.organization_details || early?.organization;
    if (o?.id) {
      org = {
        id: String(o.id),
        name: String(o.name || ''),
        description: o.description || '',
        logo_url: o.logo_url || null as any,
        domain: o.domain || null as any,
        subdomain: o.subdomain || null as any,
        subscription_tier: o.subscription_tier || 'free',
        subscription_status: o.subscription_status || 'active',
        settings: o.settings || {},
        created_at: o.created_at || new Date().toISOString(),
        updated_at: o.updated_at || new Date().toISOString(),
        owner_id: o.owner_id || undefined,
      } as Organization;
    }
  } catch {}

  const value: TenantContextType = {
    currentOrganization: org,
    tenant: org,
    organization: org,
    isOrgAdmin: false,
    isLoading: false,
    error: null,
    async createOrganization() { return { success: false, error: new Error('Disabled in store build') }; },
    async inviteUserToOrganization() { return { success: false, error: new Error('Disabled in store build') }; },
    async refreshOrganizationData() { /* no-op */ },
    async refreshTenant() { /* no-op */ },
  };

  return (
    <TenantPublicContext.Provider value={value}>
      {children}
    </TenantPublicContext.Provider>
  );
};

export function useTenant(): TenantContextType {
  const ctx = useContext(TenantPublicContext);
  if (ctx) return ctx;
  // static fallback
  return {
    currentOrganization: null,
    tenant: null,
    organization: null,
    isOrgAdmin: false,
    isLoading: false,
    error: null,
    async createOrganization() { return { success: false, error: new Error('Disabled in store build') }; },
    async inviteUserToOrganization() { return { success: false, error: new Error('Disabled in store build') }; },
    async refreshOrganizationData() {},
    async refreshTenant() {},
  } as TenantContextType;
}

export default TenantPublicContext;

