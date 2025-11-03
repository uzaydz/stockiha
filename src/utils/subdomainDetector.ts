/**
 * كاشف النطاقات الفرعية - محسن للعمل مع Cloudflare Worker
 */

export interface SubdomainInfo {
  subdomain: string | null;
  isSubdomain: boolean;
  domainType: 'main' | 'subdomain' | 'custom-domain';
  originalHost?: string;
}

/**
 * استخراج معلومات النطاق الفرعي من الطلب الحالي
 */
export function getSubdomainInfo(): SubdomainInfo {
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  // Admin-only: لا يوجد ساب-دومين ولا نطاقات مخصصة
  return { subdomain: null, isSubdomain: false, domainType: 'main', originalHost: hostname };
}

/**
 * فحص إذا كان النطاق الحالي نطاق فرعي
 */
export function isSubdomain(): boolean { return false; }

/**
 * الحصول على النطاق الفرعي فقط
 */
export function getCurrentSubdomain(): string | null { return null; }

/**
 * إنشاء URL لنطاق فرعي محدد
 */
import { getWebOrigin } from '@/lib/navigation';
export function createSubdomainUrl(_subdomain: string, path: string = '/'): string { return `${getWebOrigin()}${path}`; }

/**
 * التحقق من صحة النطاق الفرعي
 */
export function isValidSubdomain(_subdomain: string): boolean { return true; }
