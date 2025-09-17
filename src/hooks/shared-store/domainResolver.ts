/**
 * محلل النطاقات والـ subdomain للمتجر
 * يتعامل مع مختلف أنواع النطاقات والتحقق من الصلاحية
 */

const BASE_DOMAINS = ['.ktobi.online', '.stockiha.com', '.bazaar.dev', '.vercel.app', '.bazaar.com'];
const PUBLIC_DOMAINS = ['stockiha.pages.dev', 'ktobi.online', 'www.ktobi.online', 'stockiha.com', 'www.stockiha.com'];

/**
 * التحقق من أن النطاق أساسي
 */
export const isBaseDomain = (hostname: string): boolean => {
  return BASE_DOMAINS.some((domain) => hostname.endsWith(domain));
};

/**
 * التحقق من أن النطاق عام
 */
export const isPublicDomain = (hostname: string): boolean => {
  return PUBLIC_DOMAINS.includes(hostname);
};

/**
 * التحقق من أن النطاق محلي
 */
export const isLocalhost = (hostname: string): boolean => {
  return hostname.includes('localhost') || hostname.startsWith('127.');
};

/**
 * التحقق من أن النطاق مخصص
 */
export const isCustomDomain = (hostname: string): boolean => {
  return !isLocalhost(hostname) && !isBaseDomain(hostname) && !isPublicDomain(hostname);
};

/**
 * استخراج subdomain من hostname
 */
export const extractSubdomain = (hostname: string): string | null => {
  try {
    const parts = hostname.split(':')[0].split('.');

    // النطاقات العامة - لا تحتاج subdomain
    if (isPublicDomain(hostname)) {
      return null;
    }

    // للنطاقات المخصصة، نتحقق من localStorage
    if (isCustomDomain(hostname)) {
      if (process.env.NODE_ENV === 'development' && parts.length === 0) {
        console.log('تم الكشف عن نطاق مخصص:', hostname);
      }
      return null;
    }

    // للنطاقات الأساسية، نستخرج subdomain
    if (isBaseDomain(hostname)) {
      if (parts.length > 2 && parts[0] && parts[0] !== 'www') {
        const subdomain = parts[0];
        if (process.env.NODE_ENV === 'development' && parts.length === 0) {
          console.log('تم استخراج subdomain:', subdomain);
        }
        return subdomain;
      }
    }

    // للنطاقات المحلية
    if (isLocalhost(hostname)) {
      if (hostname.includes('localhost')) {
        const subdomain = hostname.split('.')[0];
        if (subdomain && subdomain !== 'localhost') {
          if (process.env.NODE_ENV === 'development' && parts.length === 0) {
            console.log('تم استخراج subdomain محلي:', subdomain);
          }
          return subdomain;
        }
      }
      return null;
    }

    // fallback: استخدام النطاق المخزن في localStorage
    try {
      const stored = localStorage.getItem('bazaar_current_subdomain');
      if (stored && stored !== 'main' && stored !== 'www') {
        if (process.env.NODE_ENV === 'development' && parts.length === 0) {
          console.log('تم استخدام subdomain من localStorage:', stored);
        }
        return stored;
      }
    } catch {}

    return null;
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('خطأ في تحليل subdomain:', error);
    }
    return null;
  }
};

/**
 * الحصول على معرف المنظمة من مصادر مختلفة
 */
export const getOrganizationId = (): { organizationId: string | null; source: string } => {
  try {
    // المصدر الأول: window object
    const early = (window as any).__EARLY_STORE_DATA__ || (window as any).__PREFETCHED_STORE_DATA__;
    const earlyOrg = early?.data?.organization_details || early?.organization || early?.organization_details;
    if (earlyOrg?.id) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [getOrganizationId] وجد ID من window object:', earlyOrg.id);
      }
      return { organizationId: String(earlyOrg.id), source: 'window' };
    }

    // المصدر الثاني: localStorage
    const storedOrgId = localStorage.getItem('bazaar_organization_id');
    if (storedOrgId) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [getOrganizationId] وجد ID من localStorage:', storedOrgId);
      }
      return { organizationId: storedOrgId, source: 'localStorage' };
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('⚠️ [getOrganizationId] لم يتم العثور على organizationId في أي مصدر');
    }
    return { organizationId: null, source: 'none' };
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ [getOrganizationId] خطأ:', error);
    }
    return { organizationId: null, source: 'error' };
  }
};

/**
 * الحصول على hostname الحالي
 */
export const getCurrentHostname = (): string => {
  try {
    return typeof window !== 'undefined' ? window.location.hostname.split(':')[0] : '';
  } catch {
    return '';
  }
};

/**
 * تحليل معلومات النطاق الكاملة - محسن للنطاقات المخصصة
 */
export const analyzeDomain = () => {
  const hostname = getCurrentHostname();
  const subdomain = extractSubdomain(hostname);
  const { organizationId, source } = getOrganizationId();

  let storeIdentifier: string | null = null;

  // للنطاقات المخصصة، استخدم النطاق كنفسه كمعرف مع تحسينات
  if (isCustomDomain(hostname)) {
    // إزالة www. إذا وُجد
    let cleanHostname = hostname;
    if (cleanHostname.startsWith('www.')) {
      cleanHostname = cleanHostname.substring(4);
    }

    // 🔥 إصلاح: محاولة استخراج subdomain من النطاق المخصص للنطاقات التي قد تكون مشابهة للنطاقات الفرعية
    const potentialSubdomain = extractPotentialSubdomain(cleanHostname);
    if (potentialSubdomain) {
      storeIdentifier = potentialSubdomain;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [analyzeDomain] تم استخراج subdomain من النطاق المخصص:', {
          hostname,
          cleanHostname,
          potentialSubdomain,
          storeIdentifier
        });
      }
    } else {
      storeIdentifier = cleanHostname;
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 [analyzeDomain] نطاق مخصص مكتشف:', {
          hostname,
          cleanHostname,
          storeIdentifier
        });
      }
    }
  }
  // للنطاقات الفرعية والأساسية، استخدم subdomain أو organizationId
  else {
    storeIdentifier = subdomain || organizationId;
  }

  return {
    hostname,
    subdomain,
    organizationId,
    source,
    isBaseDomain: isBaseDomain(hostname),
    isPublicDomain: isPublicDomain(hostname),
    isLocalhost: isLocalhost(hostname),
    isCustomDomain: isCustomDomain(hostname),
    storeIdentifier
  };
};

/**
 * استخراج subdomain محتمل من النطاق المخصص
 */
const extractPotentialSubdomain = (hostname: string): string | null => {
  try {
    // للنطاقات مثل "subdomain.example.com" حيث example.com قد يكون نطاق مخصص
    // نحاول استخراج الجزء الأول كـ subdomain
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] && parts[0] !== 'www') {
      return parts[0];
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('خطأ في استخراج subdomain محتمل:', error);
    }
  }
  return null;
};

/**
 * إنشاء مفتاح cache للنطاق
 */
export const createDomainCacheKey = (storeIdentifier?: string | null): string => {
  if (!storeIdentifier) return 'store-data-unified-no-identifier';

  const hostname = getCurrentHostname();

  // للنطاقات المخصصة، استخدم النطاق بدون www
  if (isCustomDomain(hostname)) {
    let cleanHostname = hostname;
    if (cleanHostname.startsWith('www.')) {
      cleanHostname = cleanHostname.substring(4);
    }
    return `store-data-unified-${cleanHostname}`;
  }

  return `store-data-unified-${storeIdentifier}`;
};
