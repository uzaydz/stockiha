/**
 * Cloudflare for SaaS API - نظام النطاقات مع Nameservers
 * 
 * هذا الملف يحتوي على وظائف للتفاعل مع Cloudflare for SaaS
 * لإدارة النطاقات المخصصة باستخدام Delegated DNS
 */

import { 
  getCloudflareToken, 
  getCloudflareZoneId,
  getCloudflareApiUrl 
} from '@/lib/api/cloudflare-config';

// أنواع البيانات للاستجابات
export interface CloudflareSaaSResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
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

/**
 * الحصول على Nameservers المخصصة لـ Stockiha
 */
export async function getStockihaNameservers(): Promise<CloudflareSaaSResponse> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare'
      };
    }

    // الحصول على معلومات المنطقة والـ nameservers
    const response = await fetch(
      `${getCloudflareApiUrl()}/zones/${zoneId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: {
          nameservers: data.result.name_servers,
          zone_id: data.result.id,
          zone_name: data.result.name
        } as CloudflareNameservers,
        message: 'تم الحصول على Nameservers بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في الحصول على Nameservers',
        message: 'حدث خطأ أثناء الحصول على Nameservers'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * التحقق من حالة تفويض النطاق (Domain Delegation)
 */
export async function checkDomainDelegation(domain: string): Promise<DomainDelegationStatus> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      throw new Error('لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare');
    }

    
    
    // التحقق من DNS records للنطاق
    const dnsResponse = await fetch(
      `https://dns.google.com/resolve?name=${domain}&type=NS`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    const dnsData = await dnsResponse.json();
    
    
    // التحقق من أن الـ nameservers تشير إلى Cloudflare
    const nameservers = dnsData.Answer?.map((answer: any) => answer.data.toLowerCase().replace(/\.$/, '')) || [];
    
    
    // التحقق من nameservers المحددة لـ stockiha
    const expectedNameservers = ['marty.ns.cloudflare.com', 'sue.ns.cloudflare.com'];
    const isUsingCloudflare = nameservers.some((ns: string) => 
      ns.includes('cloudflare.com') || ns.includes('.ns.cloudflare.com')
    );
    
    // تحقق دقيق من nameservers المطلوبة
    const hasCorrectNameservers = expectedNameservers.every(expected => 
      nameservers.some(ns => ns === expected)
    );
    
    
    

    return {
      domain,
      status: hasCorrectNameservers ? 'active' : (isUsingCloudflare ? 'pending' : 'pending'),
      nameservers_configured: isUsingCloudflare,
      ssl_status: hasCorrectNameservers ? 'active' : 'pending',
      verification_errors: !isUsingCloudflare ? [`النطاق يستخدم: ${nameservers.join(', ')}. يجب استخدام: ${expectedNameservers.join(', ')}`] : undefined,
      last_checked: new Date().toISOString()
    };

  } catch (error) {
    return {
      domain,
      status: 'error',
      nameservers_configured: false,
      verification_errors: [error instanceof Error ? error.message : 'حدث خطأ غير متوقع'],
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
): Promise<CloudflareSaaSResponse> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare'
      };
    }

    // تنظيف النطاق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(':')[0]
      .split('/')[0];

    // إضافة Custom Hostname
    const response = await fetch(
      `${getCloudflareApiUrl()}/zones/${zoneId}/custom_hostnames`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          hostname: cleanDomain,
          ssl: {
            method: 'http',
            type: 'dv',
            settings: {
              http2: 'on',
              min_tls_version: '1.2',
              tls_1_3: 'on'
            }
          },
          custom_metadata: {
            organization_id: organizationId,
            created_by: 'stockiha_auto',
            created_at: new Date().toISOString()
          }
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: data.result as CustomHostnameResponse,
        message: 'تم إضافة النطاق بنجاح كـ Custom Hostname'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إضافة Custom Hostname',
        message: 'حدث خطأ أثناء إضافة Custom Hostname'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * التحقق من حالة Custom Hostname
 */
export async function checkCustomHostnameStatus(
  hostname: string
): Promise<CloudflareSaaSResponse> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare'
      };
    }

    // البحث عن Custom Hostname
    const response = await fetch(
      `${getCloudflareApiUrl()}/zones/${zoneId}/custom_hostnames?hostname=${hostname}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      const customHostname = data.result.find((ch: any) => ch.hostname === hostname);
      
      if (customHostname) {
        return {
          success: true,
          data: customHostname as CustomHostnameResponse,
          message: 'تم العثور على Custom Hostname'
        };
      } else {
        return {
          success: false,
          error: 'لم يتم العثور على Custom Hostname',
          message: 'Custom Hostname غير موجود'
        };
      }
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في التحقق من Custom Hostname',
        message: 'حدث خطأ أثناء التحقق من Custom Hostname'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إزالة Custom Hostname
 */
export async function removeCustomHostname(
  hostnameId: string
): Promise<CloudflareSaaSResponse> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare'
      };
    }

    const response = await fetch(
      `${getCloudflareApiUrl()}/zones/${zoneId}/custom_hostnames/${hostnameId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        message: 'تم حذف Custom Hostname بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في حذف Custom Hostname',
        message: 'حدث خطأ أثناء حذف Custom Hostname'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إنشاء CNAME Flattening للنطاق الجذري
 */
export async function setupCnameFlattening(
  domain: string,
  target: string
): Promise<CloudflareSaaSResponse> {
  try {
    const cloudflareToken = getCloudflareToken();
    const zoneId = getCloudflareZoneId();
    
    if (!cloudflareToken || !zoneId) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة لـ Cloudflare'
      };
    }

    // إضافة CNAME record مع CNAME Flattening
    const response = await fetch(
      `${getCloudflareApiUrl()}/zones/${zoneId}/dns_records`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: domain,
          content: target,
          ttl: 1, // Auto TTL
          proxied: true // يفعل CNAME Flattening تلقائياً
        })
      }
    );

    const data = await response.json();

    if (response.ok && data.success) {
      return {
        success: true,
        data: data.result,
        message: 'تم إعداد CNAME Flattening بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إعداد CNAME Flattening',
        message: 'حدث خطأ أثناء إعداد CNAME Flattening'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * التحقق الشامل من النطاق وإعداده تلقائياً
 */
export async function autoSetupDomain(
  domain: string,
  organizationId: string
): Promise<CloudflareSaaSResponse> {
  try {
    // 1. التحقق من تفويض النطاق
    const delegationStatus = await checkDomainDelegation(domain);
    
    if (!delegationStatus.nameservers_configured) {
      return {
        success: false,
        error: 'الـ Nameservers لم يتم تكوينها بعد',
        message: 'يرجى تكوين Nameservers أولاً',
        data: delegationStatus
      };
    }

    // 2. إضافة Custom Hostname
    const customHostnameResult = await addCustomHostname(domain, organizationId);
    
    if (!customHostnameResult.success) {
      return customHostnameResult;
    }

    // 3. إعداد www subdomain أيضاً
    const wwwDomain = `www.${domain}`;
    const wwwCustomHostnameResult = await addCustomHostname(wwwDomain, organizationId);

    // 4. إعداد CNAME Flattening للنطاق الجذري
    const target = `${organizationId}.stockiha.com`;
    await setupCnameFlattening(domain, target);
    await setupCnameFlattening(wwwDomain, target);

    return {
      success: true,
      data: {
        primary_hostname: customHostnameResult.data,
        www_hostname: wwwCustomHostnameResult.data,
        delegation_status: delegationStatus
      },
      message: 'تم إعداد النطاق تلقائياً بنجاح'
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: 'حدث خطأ أثناء الإعداد التلقائي للنطاق'
    };
  }
}
