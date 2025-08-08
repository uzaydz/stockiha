/**
 * أدوات مساعدة للتعامل مع النطاقات والـ subdomain
 */

import { OrganizationFetcher } from '../services/OrganizationFetcher';
import { DomainInfo } from '../types';

/**
 * التحقق ما إذا كان اسم المضيف هو النطاق الرئيسي
 */
export const isMainDomain = (hostname: string): boolean => {
  return hostname === 'www.ktobi.online' || hostname === 'ktobi.online';
};

/**
 * استخراج النطاق الفرعي من اسم المضيف
 */
export const extractSubdomain = async (hostname: string): Promise<string | null> => {
  
  // التعامل مع السابدومين في بيئة localhost المحلية
  if (hostname.includes('localhost')) {
    // إزالة رقم المنفذ إذا كان موجوداً
    const hostnameWithoutPort = hostname.split(':')[0];
    const parts = hostnameWithoutPort.split('.');

    // مثال: mystore.localhost أو lmrpoxcvvd.localhost
    if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www' && parts[0] !== '') {
      // تنظيف النطاق الفرعي
      const cleanSubdomain = parts[0]
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '') // إزالة جميع المسافات
        .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
        .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
        .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
      return cleanSubdomain;
    }
    
    // إذا كان فقط localhost بدون سابدومين
    if (hostnameWithoutPort === 'localhost') {
      return 'main';
    }
  }
  
  // التعامل مع عناوين IP المحلية (127.0.0.1, etc.)
  if (hostname.match(/^127\.\d+\.\d+\.\d+$/) || hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
    return 'main';
  }
  
  // اختبار ما إذا كان النطاق الرئيسي
  if (isMainDomain(hostname)) {
    return 'main';
  }
  
  // تقسيم اسم المضيف إلى أجزاء للنطاقات العادية
  const hostParts = hostname.split('.');
  
  // إذا كان لدينا أكثر من جزئين، الجزء الأول هو النطاق الفرعي
  if (hostParts.length > 2) {
    const subdomain = hostParts[0];
    
    // لا نعتبر 'www' كنطاق فرعي حقيقي
    if (subdomain === 'www') {
      return 'main';
    }

    // تنظيف النطاق الفرعي
    const cleanSubdomain = subdomain
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '') // إزالة جميع المسافات
      .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
      .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
      .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
    return cleanSubdomain;
  }
  
  // التحقق من النطاق المخصص باستخدام النظام الموحد
  const result = await OrganizationFetcher.fetch({ hostname });
  if (result.success && result.data?.subdomain) {
    return result.data.subdomain;
  }
  
  // إذا لم نتمكن من استخراج نطاق فرعي، نعيد null
  return null;
};

/**
 * الحصول على معلومات النطاق الكاملة
 */
export const getDomainInfo = async (hostname?: string): Promise<DomainInfo> => {
  const currentHostname = hostname || window.location.hostname;
  const isLocalhost = currentHostname.includes('localhost') || 
                     !!currentHostname.match(/^127\.\d+\.\d+\.\d+$/) ||
                     !!currentHostname.match(/^\d+\.\d+\.\d+\.\d+$/);
  
  const subdomain = await extractSubdomain(currentHostname);
  const isCustomDomain = !isLocalhost && !isMainDomain(currentHostname) && !subdomain;
  
  return {
    hostname: currentHostname,
    subdomain,
    isCustomDomain,
    isLocalhost
  };
};

/**
 * التحقق من النطاق المخصص والحصول على معلومات المؤسسة
 */
export const getOrganizationFromCustomDomain = async (
  hostname: string
): Promise<{ id: string; subdomain: string } | null> => {
  if (!hostname || hostname.includes('localhost')) {
    return null;
  }
  
  try {
    
    const result = await OrganizationFetcher.fetch({ hostname });
    
    if (result.success && result.data && result.data.id && result.data.subdomain) {
      
      return {
        id: result.data.id,
        subdomain: result.data.subdomain
      };
    }
  } catch (error) {
  }
  
  return null;
};

/**
 * تحديد أفضل استراتيجية لجلب المؤسسة
 */
export const determineFetchStrategy = async (): Promise<{
  orgId?: string;
  hostname?: string;
  subdomain?: string;
  strategy: 'stored' | 'custom-domain' | 'subdomain' | 'fallback';
}> => {
  // أولوية 1: معرف محفوظ
  const storedOrgId = localStorage.getItem('bazaar_organization_id');
  if (storedOrgId) {
    return {
      orgId: storedOrgId,
      strategy: 'stored'
    };
  }
  
  const domainInfo = await getDomainInfo();
  
  // أولوية 2: النطاق المخصص
  if (domainInfo.isCustomDomain) {
    return {
      hostname: domainInfo.hostname,
      strategy: 'custom-domain'
    };
  }
  
  // أولوية 3: النطاق الفرعي
  if (domainInfo.subdomain && domainInfo.subdomain !== 'main') {
    return {
      subdomain: domainInfo.subdomain,
      strategy: 'subdomain'
    };
  }
  
  // أولوية 4: fallback
  return {
    strategy: 'fallback'
  };
};

/**
 * تنظيف وتطهير النطاق
 */
export const sanitizeDomain = (domain: string): string => {
  return domain
    .toLowerCase()
    .replace(/[^a-z0-9.-]/g, '')
    .replace(/^-+|-+$/g, '');
};

/**
 * تنظيف وتطهير النطاق الفرعي
 */
export const sanitizeSubdomain = (subdomain: string): string => {
  return subdomain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // إزالة جميع المسافات
    .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
    .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
    .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
};

/**
 * التحقق من صحة النطاق الفرعي
 */
export const isValidSubdomain = (subdomain: string): boolean => {
  // تنظيف النطاق الفرعي أولاً
  const cleanSubdomain = subdomain
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '') // إزالة جميع المسافات
    .replace(/[^a-z0-9-]/g, '') // إزالة الأحرف غير المسموحة
    .replace(/^-+|-+$/g, '') // إزالة الشرطات من البداية والنهاية
    .replace(/-+/g, '-'); // تحويل الشرطات المتعددة إلى شرطة واحدة
  const subdomainRegex = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  return subdomainRegex.test(cleanSubdomain);
};

/**
 * التحقق من صحة النطاق
 */
export const isValidDomain = (domain: string): boolean => {
  const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/;
  return domainRegex.test(domain.toLowerCase());
};
