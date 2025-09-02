/**
 * Cloudflare API لإدارة النطاقات المخصصة
 * 
 * هذا الملف يحتوي على وظائف للتفاعل مع Cloudflare Pages API
 * لإدارة النطاقات المخصصة
 */

import { 
  getCloudflareToken, 
  getCloudflareProjectName, 
  getCloudflareZoneId,
  hasCloudflareConfig,
  getCloudflareApiUrl 
} from '@/lib/api/cloudflare-config';

// أنواع البيانات للاستجابات
export interface CloudflareDomainResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

export interface CloudflareDomainStatus {
  verified: boolean;
  status: 'pending' | 'active' | 'error' | 'verified';
  message: string;
  verification?: any;
  errorCode?: string;
}

/**
 * التحقق من حالة النطاق في Cloudflare Pages
 */
export async function verifyCloudflareDomainStatus(
  domain: string,
  projectName: string,
  cloudflareToken: string
): Promise<CloudflareDomainStatus> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectName || !cloudflareToken) {
      return {
        verified: false,
        status: 'error',
        message: 'معلمات التحقق غير مكتملة'
      };
    }

    // استعلام حالة النطاق من Cloudflare Pages API
    const response = await fetch(
      `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects/${projectName}/domains/${domain}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    // التحقق من أن الاستجابة صالحة
    if (response.ok && data.success) {
      const domainData = data.result;

      if (domainData.status === 'active') {
        return {
          verified: true,
          status: 'active',
          message: 'تم التحقق من النطاق بنجاح'
        };
      } else if (domainData.status === 'pending') {
        return {
          verified: false,
          status: 'pending',
          message: 'النطاق قيد التحقق',
          verification: domainData.verification
        };
      } else {
        return {
          verified: false,
          status: 'error',
          message: domainData.error_message || 'حدث خطأ في التحقق من النطاق'
        };
      }
    } else {
      return {
        verified: false,
        status: 'error',
        message: data.errors?.[0]?.message || 'فشل في التحقق من حالة النطاق'
      };
    }
  } catch (error) {
    return {
      verified: false,
      status: 'error',
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * ربط نطاق بمشروع Cloudflare Pages
 */
export async function linkDomainToCloudflareProject(
  domain: string,
  projectName: string,
  cloudflareToken: string
): Promise<CloudflareDomainResponse> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectName || !cloudflareToken) {
      return {
        success: false,
        error: 'معلمات ربط النطاق غير مكتملة'
      };
    }

    // تنظيف النطاق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '') // إزالة البروتوكول
      .replace(/^www\./i, '')      // إزالة www.
      .split(':')[0]               // إزالة المنفذ
      .split('/')[0];              // إزالة المسارات

    // محاولة إضافة النطاق إلى مشروع Cloudflare Pages
    const response = await fetch(
      `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects/${projectName}/domains`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          name: cleanDomain,
          type: 'CNAME'
        })
      }
    );

    const data = await response.json();

    // التحقق من أن الاستجابة صالحة
    if (response.ok && data.success) {
      return {
        success: true,
        data: data.result,
        message: 'تم ربط النطاق بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في ربط النطاق',
        message: data.errors?.[0]?.message || 'حدث خطأ أثناء ربط النطاق'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إزالة نطاق من مشروع Cloudflare Pages
 */
export async function removeDomainFromCloudflareProject(
  domain: string,
  projectName: string,
  cloudflareToken: string
): Promise<CloudflareDomainResponse> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectName || !cloudflareToken) {
      return {
        success: false,
        error: 'معلمات إزالة النطاق غير مكتملة'
      };
    }

    // تنظيف النطاق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(':')[0]
      .split('/')[0];

    // إزالة النطاق من مشروع Cloudflare Pages
    const response = await fetch(
      `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects/${projectName}/domains/${cleanDomain}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    // التحقق من أن الاستجابة صالحة
    if (response.ok && data.success) {
      return {
        success: true,
        message: 'تم إزالة النطاق بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في إزالة النطاق',
        message: data.errors?.[0]?.message || 'حدث خطأ أثناء إزالة النطاق'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * الحصول على قائمة النطاقات المرتبطة بمشروع Cloudflare Pages
 */
export async function getCloudflareProjectDomains(
  projectName: string,
  cloudflareToken: string
): Promise<CloudflareDomainResponse> {
  try {
    // التحقق من صحة المعلمات
    if (!projectName || !cloudflareToken) {
      return {
        success: false,
        error: 'معلمات الحصول على النطاقات غير مكتملة'
      };
    }

    // الحصول على قائمة النطاقات
    const response = await fetch(
      `${getCloudflareApiUrl()}/accounts/${getCloudflareZoneId()}/pages/projects/${projectName}/domains`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cloudflareToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();

    // التحقق من أن الاستجابة صالحة
    if (response.ok && data.success) {
      return {
        success: true,
        data: data.result,
        message: 'تم الحصول على النطاقات بنجاح'
      };
    } else {
      return {
        success: false,
        error: data.errors?.[0]?.message || 'فشل في الحصول على النطاقات',
        message: data.errors?.[0]?.message || 'حدث خطأ أثناء الحصول على النطاقات'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      message: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * الحصول على تعليمات DNS للنطاق
 */
export function getCloudflareDnsInstructions(domain: string): Array<{
  type: string;
  name: string;
  value: string;
  description: string;
}> {
  return [
    {
      type: 'CNAME',
      name: domain,
      value: `${getCloudflareProjectName()}.pages.dev`,
      description: 'سجل CNAME الرئيسي للنطاق'
    },
    {
      type: 'CNAME',
      name: `www.${domain}`,
      value: `${getCloudflareProjectName()}.pages.dev`,
      description: 'سجل CNAME للنطاق الفرعي www'
    }
  ];
}
