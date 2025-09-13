/**
 * أنواع وواجهات TenantContext
 * ملف منفصل لتحسين الأداء وسهولة الصيانة
 */

export type Organization = {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  domain?: string;
  subdomain?: string;
  subscription_tier: string;
  subscription_status: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  owner_id?: string;
};

export type TenantContextType = {
  currentOrganization: Organization | null;
  tenant: Organization | null;
  organization: Organization | null;
  isOrgAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  // ✅ إضافة: للتحقق من جاهزية organization ID
  isOrganizationReady?: boolean;
  isReady?: boolean;
  createOrganization: (name: string, description?: string, domain?: string, subdomain?: string) => Promise<{ success: boolean, organizationId?: string, error?: Error }>;
  inviteUserToOrganization: (email: string, role?: string) => Promise<{ success: boolean, error?: Error }>;
  refreshOrganizationData: () => Promise<void>;
  refreshTenant: () => Promise<void>;
};

export interface OrganizationCacheItem {
  data: any;
  timestamp: number;
  type: 'byId' | 'byDomain' | 'bySubdomain';
}

export interface OrganizationFetchParams {
  orgId?: string;
  hostname?: string;
  subdomain?: string;
}

export interface CustomDomainResult {
  id: string;
  subdomain: string;
}

// Global window extensions
declare global {
  interface Window {
    organizationCache?: Map<string, OrganizationCacheItem>;
    bazaarTenantLoading?: boolean;
  }
}
