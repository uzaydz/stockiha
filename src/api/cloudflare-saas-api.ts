/**
 * Cloudflare for SaaS API - نظام النطاقات مع Nameservers
 *
 * هذا الملف يوفر واجهة موحّدة من جانب المتصفح للتفاعل مع الراوتر المحلي
 * /api/cloudflare-saas الذي يقوم بدوره باستدعاء Cloudflare بشكل آمن من الخادم.
 */

// أنواع البيانات للاستجابات
export interface CloudflareSaaSResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: any;
}

export interface CloudflareNameservers {
  nameservers: string[];
  zone_id: string;
  zone_name: string;
}

export interface DomainDelegationStatus {
  domain: string;
  status: 'pending' | 'active' | 'moved' | 'error';
  nameservers_configured: boolean;
  ssl_status?: 'pending' | 'active' | 'error';
  verification_errors?: string[];
  last_checked?: string;
  detected_nameservers?: string[];
}

export interface CustomHostnameResponse {
  id: string;
  hostname: string;
  status: 'pending' | 'active' | 'moved' | 'error';
  ssl: {
    status: 'pending' | 'active' | 'error';
    certificate_authority: string;
  };
  verification_errors?: string[];
}

const DEFAULT_NAMESERVERS = ['marty.ns.cloudflare.com', 'sue.ns.cloudflare.com'];
const CLOUDFLARE_SAAS_ENDPOINT = '/api/cloudflare-saas';

const toErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء الاتصال بنظام Cloudflare';

const callCloudflareSaaS = async <T = any>(
  action: string,
  payload: Record<string, any> = {}
): Promise<CloudflareSaaSResponse<T>> => {
  try {
    const response = await fetch(CLOUDFLARE_SAAS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action, ...payload })
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data?.error || 'فشل في تنفيذ طلب Cloudflare',
        message: data?.message,
        details: data?.details
      };
    }

    return data;
  } catch (error) {
    return {
      success: false,
      error: toErrorMessage(error)
    };
  }
};

/**
 * الحصول على Nameservers المخصصة لـ Stockiha
 */
export async function getStockihaNameservers(): Promise<CloudflareSaaSResponse<CloudflareNameservers>> {
  const result = await callCloudflareSaaS<{ nameservers?: string[]; zone?: { id?: string; name?: string } }>('get-nameservers');

  if (!result.success) {
    return result;
  }

  const nameservers = result.data?.nameservers && result.data.nameservers.length > 0
    ? result.data.nameservers
    : DEFAULT_NAMESERVERS;

  return {
    success: true,
    data: {
      nameservers,
      zone_id: result.data?.zone?.id || '',
      zone_name: result.data?.zone?.name || ''
    }
  };
}

/**
 * التحقق من حالة تفويض النطاق (Domain Delegation)
 */
export async function checkDomainDelegation(
  domain: string,
  expectedNameservers?: string[]
): Promise<DomainDelegationStatus> {
  const normalizedDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '')
    .replace(/\.$/, '');

  const expected = (expectedNameservers && expectedNameservers.length > 0
    ? expectedNameservers
    : DEFAULT_NAMESERVERS).map((ns) => ns.toLowerCase());

  try {
    const response = await fetch(`https://dns.google.com/resolve?name=${normalizedDomain}&type=NS`, {
      headers: { Accept: 'application/json' }
    });

    const data = await response.json();
    const answers = Array.isArray(data?.Answer) ? data.Answer : [];
    const detected = answers
      .map((answer: any) => answer.data?.toLowerCase().replace(/\.$/, ''))
      .filter(Boolean);

    const hasCloudflareNs = detected.some((ns) => ns.includes('cloudflare.com'));
    const hasExactMatch = expected.every((ns) => detected.includes(ns));

    return {
      domain: normalizedDomain,
      status: hasExactMatch ? 'active' : hasCloudflareNs ? 'pending' : 'pending',
      nameservers_configured: hasCloudflareNs,
      ssl_status: hasExactMatch ? 'active' : 'pending',
      verification_errors: hasCloudflareNs
        ? undefined
        : detected.length
          ? [`النطاق يستخدم: ${detected.join(', ')}. يجب استخدام: ${expected.join(', ')}`]
          : ['لم يتم العثور على سجلات Nameserver لهذا النطاق حتى الآن.'],
      last_checked: new Date().toISOString(),
      detected_nameservers: detected
    };
  } catch (error) {
    return {
      domain: normalizedDomain,
      status: 'error',
      nameservers_configured: false,
      verification_errors: [toErrorMessage(error)],
      last_checked: new Date().toISOString()
    };
  }
}

/**
 * إضافة نطاق كـ Custom Hostname تلقائياً
 */
export async function addCustomHostname(
  domain: string,
  organizationId: string
): Promise<CloudflareSaaSResponse<CustomHostnameResponse>> {
  const cleanDomain = domain.trim().toLowerCase();
  return callCloudflareSaaS('add-hostname', { domain: cleanDomain, organizationId });
}

/**
 * التحقق من حالة Custom Hostname
 */
export async function checkCustomHostnameStatus(
  hostname: string
): Promise<CloudflareSaaSResponse<CustomHostnameResponse>> {
  return callCloudflareSaaS('check-hostname', { hostname });
}

/**
 * إزالة Custom Hostname
 */
export async function removeCustomHostname(
  hostnameId: string
): Promise<CloudflareSaaSResponse> {
  return callCloudflareSaaS('remove-hostname', { hostnameId });
}

/**
 * إنشاء CNAME Flattening للنطاق الجذري
 */
export async function setupCnameFlattening(
  domain: string,
  target: string
): Promise<CloudflareSaaSResponse> {
  return callCloudflareSaaS('create-cname', { name: domain, target });
}

/**
 * التحقق الشامل من النطاق وإعداده تلقائياً
 */
export async function autoSetupDomain(
  domain: string,
  organizationId: string
): Promise<CloudflareSaaSResponse> {
  const cleanDomain = domain.trim().toLowerCase();
  return callCloudflareSaaS('auto-setup', { domain: cleanDomain, organizationId });
}
