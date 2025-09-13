/**
 * كاشف النطاقات الفرعية - محسن للعمل مع Cloudflare Worker
 */

export interface SubdomainInfo {
  subdomain: string | null;
  isSubdomain: boolean;
  domainType: 'main' | 'subdomain';
  originalHost?: string;
}

/**
 * استخراج معلومات النطاق الفرعي من الطلب الحالي
 */
export function getSubdomainInfo(): SubdomainInfo {
  if (typeof window === 'undefined') {
    return {
      subdomain: null,
      isSubdomain: false,
      domainType: 'main'
    };
  }

  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // تحليل النطاق: asraycollection.stockiha.com
  if (parts.length === 3 && parts[1] === 'stockiha' && parts[2] === 'com') {
    const subdomain = parts[0];
    
    // استثناء www
    if (subdomain === 'www') {
      return {
        subdomain: null,
        isSubdomain: false,
        domainType: 'main',
        originalHost: hostname
      };
    }

    return {
      subdomain: subdomain,
      isSubdomain: true,
      domainType: 'subdomain',
      originalHost: hostname
    };
  }

  // النطاق الرئيسي stockiha.com
  if (hostname === 'stockiha.com') {
    return {
      subdomain: null,
      isSubdomain: false,
      domainType: 'main',
      originalHost: hostname
    };
  }

  // للتطوير المحلي - فحص subdomain في hostname أولاً
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // أولاً: فحص إذا كان hostname يحتوي على subdomain (مثل asraycollection.localhost)
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] && parts[0] !== 'localhost') {
      const subdomain = parts[0];
      
      return {
        subdomain: subdomain,
        isSubdomain: true,
        domainType: 'subdomain',
        originalHost: hostname
      };
    }
    
    // ثانياً: محاولة استخراج من localStorage أو URL params
    const urlParams = new URLSearchParams(window.location.search);
    const subdomainParam = urlParams.get('subdomain');
    
    if (subdomainParam) {
      return {
        subdomain: subdomainParam,
        isSubdomain: true,
        domainType: 'subdomain',
        originalHost: hostname
      };
    }
  }

  return {
    subdomain: null,
    isSubdomain: false,
    domainType: 'main',
    originalHost: hostname
  };
}

/**
 * فحص إذا كان النطاق الحالي نطاق فرعي
 */
export function isSubdomain(): boolean {
  return getSubdomainInfo().isSubdomain;
}

/**
 * الحصول على النطاق الفرعي فقط
 */
export function getCurrentSubdomain(): string | null {
  return getSubdomainInfo().subdomain;
}

/**
 * إنشاء URL لنطاق فرعي محدد
 */
export function createSubdomainUrl(subdomain: string, path: string = '/'): string {
  const baseUrl = 'https://stockiha.com';
  const subdomainUrl = `https://${subdomain}.stockiha.com`;
  
  return `${subdomainUrl}${path}`;
}

/**
 * التحقق من صحة النطاق الفرعي
 */
export function isValidSubdomain(subdomain: string): boolean {
  // قواعد التحقق من صحة النطاق الفرعي
  const regex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  
  return regex.test(subdomain) && 
         subdomain.length >= 1 && 
         subdomain.length <= 63 &&
         subdomain !== 'www' &&
         subdomain !== 'api' &&
         subdomain !== 'admin';
}
