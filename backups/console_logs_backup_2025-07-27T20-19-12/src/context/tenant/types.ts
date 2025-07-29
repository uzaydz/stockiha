/**
 * أنواع البيانات للـ Tenant Context
 */

export interface Organization {
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
}

export interface TenantContextType {
  currentOrganization: Organization | null;
  tenant: Organization | null;
  organization: Organization | null;
  isOrgAdmin: boolean;
  isLoading: boolean;
  error: Error | null;
  createOrganization: (name: string, description?: string, domain?: string, subdomain?: string) => Promise<{ success: boolean, organizationId?: string, error?: Error }>;
  inviteUserToOrganization: (email: string, role?: string) => Promise<{ success: boolean, error?: Error }>;
  refreshOrganizationData: () => Promise<void>;
  refreshTenant: () => Promise<void>;
}

export interface DomainInfo {
  hostname: string;
  subdomain: string | null;
  isCustomDomain: boolean;
  isLocalhost: boolean;
}

export interface LanguageSettings {
  defaultLanguage: string;
  availableLanguages: string[];
  source: 'organization' | 'user' | 'browser' | 'fallback';
} 