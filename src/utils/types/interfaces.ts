/**
 * واجهات وأنواع البيانات لنظام preload المبكر
 */

export interface EarlyPreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime: number;
  storeIdentifier?: string;
  domainType?: 'subdomain' | 'custom-domain' | 'localhost';
}

export interface StoreIdentifier {
  storeIdentifier: string | null;
  domainType: 'subdomain' | 'custom-domain' | 'localhost';
}

export interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ProductPreloadResult {
  success: boolean;
  data?: any;
  error?: string;
  executionTime?: number;
}

export interface OrganizationIdResult {
  organizationId: string;
  source: string;
}

export interface CacheData {
  data: any;
  timestamp: number;
}

export interface FastOrgIdCache {
  organizationId: string;
  timestamp: number;
  storeIdentifier: string;
}
