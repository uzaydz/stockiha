/**
 * Vercel Domains API Service (Secure Version)
 * خدمة إدارة النطاقات المخصصة عبر Supabase Edge Function
 *
 * الـ Vercel Token محفوظ بشكل آمن في الـ Server
 * جميع الطلبات تمر عبر Edge Function للحماية
 */

import { supabase } from '@/lib/supabase-unified';

// ==================== Types ====================

export interface VercelDomainConflict {
  name: string;
  type: string;
  value: string;
  reason: string;
}

export interface DnsInstructions {
  apex: { type: 'A'; name: string; value: string };
  www: { type: 'CNAME'; name: string; value: string };
}

export interface DomainStatus {
  exists: boolean;
  verified: boolean;
  configured: boolean;
  configuredBy: 'CNAME' | 'A' | 'http' | null;
  misconfigured: boolean;
  conflicts: VercelDomainConflict[];
}

export interface DomainSetupResult {
  success: boolean;
  apex?: any;
  www?: any;
  error?: string;
  dnsInstructions?: DnsInstructions;
}

export interface DomainStatusResult {
  success: boolean;
  apex: DomainStatus;
  www: DomainStatus;
  dnsInstructions: DnsInstructions;
}

export interface DomainVerifyResult {
  success: boolean;
  apex: { verified: boolean; data: any };
  www: { verified: boolean; data: any };
  allVerified: boolean;
}

// ==================== Constants ====================

/** عنوان IP لـ Vercel - يعمل مع جميع مزودي DNS */
export const VERCEL_IP = '76.76.21.21';

/** CNAME المطلوب للـ www */
export const VERCEL_CNAME = 'cname.vercel-dns.com';

// ==================== Helper Functions ====================

/**
 * استدعاء Edge Function لإدارة النطاقات
 */
async function callDomainFunction<T>(
  action: string,
  domain: string,
  organizationId: string
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-domains', {
    body: {
      action,
      domain,
      organizationId
    }
  });

  if (error) {
    throw new Error(error.message || 'فشل في الاتصال بالخادم');
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

// ==================== Main API Functions ====================

/**
 * إعداد نطاق مخصص (النطاق الأساسي + www)
 * @param organizationId - معرف المؤسسة
 * @param domain - اسم النطاق
 */
export async function setupCustomDomain(
  organizationId: string,
  domain: string
): Promise<DomainSetupResult> {
  try {
    const result = await callDomainFunction<DomainSetupResult>(
      'setup',
      domain,
      organizationId
    );

    return {
      success: result.success,
      apex: result.apex,
      www: result.www,
      dnsInstructions: result.dnsInstructions
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * إزالة نطاق مخصص
 * @param organizationId - معرف المؤسسة
 * @param domain - اسم النطاق
 */
export async function removeCustomDomain(
  organizationId: string,
  domain: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callDomainFunction<{ success: boolean }>(
      'remove',
      domain,
      organizationId
    );

    return { success: result.success };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير معروف'
    };
  }
}

/**
 * التحقق من حالة النطاق
 * @param organizationId - معرف المؤسسة
 * @param domain - اسم النطاق
 */
export async function getDomainStatusWithWww(
  organizationId: string,
  domain: string
): Promise<{ apex: DomainStatus | null; www: DomainStatus | null }> {
  try {
    const result = await callDomainFunction<DomainStatusResult>(
      'status',
      domain,
      organizationId
    );

    return {
      apex: result.apex,
      www: result.www
    };
  } catch {
    return { apex: null, www: null };
  }
}

/**
 * إعادة التحقق من النطاق
 * @param organizationId - معرف المؤسسة
 * @param domain - اسم النطاق
 */
export async function refreshDomainStatus(
  organizationId: string,
  domain: string
): Promise<{ verified: boolean; apex: any; www: any } | null> {
  try {
    const result = await callDomainFunction<DomainVerifyResult>(
      'verify',
      domain,
      organizationId
    );

    return {
      verified: result.allVerified,
      apex: result.apex,
      www: result.www
    };
  } catch {
    return null;
  }
}

/**
 * الحصول على حالة التحقق من قاعدة البيانات
 * @param organizationId - معرف المؤسسة
 */
export async function getDomainVerificationStatus(
  organizationId: string
): Promise<{
  domain: string | null;
  status: 'pending' | 'verified' | 'failed' | null;
  verifiedAt: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('domain_verifications')
      .select('domain, status, verified_at')
      .eq('organization_id', organizationId)
      .single();

    if (error || !data) return null;

    return {
      domain: data.domain,
      status: data.status as 'pending' | 'verified' | 'failed',
      verifiedAt: data.verified_at
    };
  } catch {
    return null;
  }
}

/**
 * الحصول على تعليمات DNS الكاملة
 */
export function getFullDnsInstructions(domain: string): DnsInstructions {
  return {
    apex: {
      type: 'A',
      name: '@',
      value: VERCEL_IP
    },
    www: {
      type: 'CNAME',
      name: 'www',
      value: VERCEL_CNAME
    }
  };
}

/**
 * التحقق مما إذا كان النطاق apex
 */
export function isApexDomain(domain: string): boolean {
  const parts = domain.split('.');
  return parts.length === 2 || (parts.length === 3 && parts[0] === 'www');
}

/**
 * استخراج النطاق الأساسي من أي شكل
 */
export function extractApexDomain(domain: string): string {
  return domain.replace(/^www\./i, '');
}
