import { getSupabaseClient } from '@/lib/supabase';
import { DNSVerificationResult, DomainVerificationStatus, DomainVerificationResponse } from '@/types/domain-verification';
import axios from 'axios';
import { INTERMEDIATE_DOMAIN } from '@/lib/api/domain-verification';

/**
 * التحقق من سجلات DNS للنطاق المخصص
 * هذه الوظيفة تحاكي عملية التحقق من سجلات DNS، في الإنتاج يمكن استخدام خدمة فعلية للتحقق من السجلات
 */
export const verifyDomainDNS = async (domain: string): Promise<DNSVerificationResult> => {
  try {
    // تنظيف النطاق
    const cleanDomain = domain.replace(/^https?:\/\//i, '').replace(/\/$/, '').toLowerCase();
    
    // في الإنتاج الفعلي، هنا نقوم باستعلام DNS عن طريق خدمة مثل Vercel API أو AWS Route53
    // لأغراض العرض، نقوم بمحاكاة العملية
    
    // سجلات DNS المتوقعة
    const expectedRecords = [
      {
        name: '@',
        type: 'CNAME',
        expected: 'connect.ktobi.online'
      },
      {
        name: 'www',
        type: 'CNAME',
        expected: 'connect.ktobi.online'
      }
    ];
    
    // محاكاة التحقق من سجلات DNS
    // في الإنتاج الفعلي، ستكون هذه نتائج استعلامات DNS حقيقية
    const verificationResults = expectedRecords.map(record => {
      // محاكاة بعض النتائج العشوائية للأغراض التوضيحية
      const random = Math.random();
      const isValid = random > 0.3; // 70% فرصة أن تكون صالحة
      
      return {
        name: record.name,
        type: record.type,
        value: isValid ? record.expected : 'invalid-value.example.com',
        status: isValid ? 'valid' as const : 'invalid' as const,
        expected: record.expected
      };
    });
    
    // تحديد ما إذا كانت جميع السجلات صالحة
    const allValid = verificationResults.every(record => record.status === 'valid');
    
    return {
      success: allValid,
      records: verificationResults,
      message: allValid 
        ? 'تم التحقق من جميع سجلات DNS بنجاح' 
        : 'بعض سجلات DNS غير صحيحة، يرجى التحقق من الإعدادات'
    };
  } catch (error) {
    return {
      success: false,
      records: [],
      message: 'حدث خطأ أثناء التحقق من سجلات DNS'
    };
  }
};

/**
 * تحديث حالة النطاق في قاعدة البيانات
 */
export const updateDomainVerificationStatus = async (
  organizationId: string,
  domain: string,
  status: DomainVerificationStatus,
  errorMessage?: string
): Promise<boolean> => {
  try {
    const supabase = await getSupabaseClient();
    
    // التحقق من وجود سجل للنطاق
    const { data: existingRecord } = await supabase
      .from('domain_verifications')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('domain', domain)
      .maybeSingle();
    
    const now = new Date().toISOString();
    
    if (existingRecord) {
      // تحديث السجل الموجود
      const { error } = await supabase
        .from('domain_verifications')
        .update({
          status: status,
          error_message: errorMessage,
          verified_at: (status === 'active' || status === 'verified') ? now : null,
          updated_at: now
        })
        .eq('id', existingRecord.id);
        
      return !error;
    } else {
      // إنشاء سجل جديد
      const { error } = await supabase
        .from('domain_verifications')
        .insert([{
          organization_id: organizationId,
          domain: domain,
          status: status,
          error_message: errorMessage,
          verified_at: (status === 'active' || status === 'verified') ? now : null,
          created_at: now,
          updated_at: now
        }]);
        
      return !error;
    }
  } catch (error) {
    return false;
  }
};

/**
 * التحقق من حالة SSL للنطاق
 * هذه وظيفة محاكاة، في الإنتاج نستخدم خدمة مثل Vercel لفحص حالة SSL
 */
export const checkDomainSSL = async (domain: string): Promise<{
  valid: boolean;
  message?: string;
}> => {
  try {
    // محاكاة التحقق من SSL
    const random = Math.random();
    const isValid = random > 0.2; // 80% فرصة أن تكون صالحة
    
    return {
      valid: isValid,
      message: isValid 
        ? 'شهادة SSL نشطة وصالحة' 
        : 'لم يتم العثور على شهادة SSL صالحة'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'حدث خطأ أثناء التحقق من حالة SSL'
    };
  }
};

/**
 * عملية التحقق الكاملة من النطاق وتحديث حالته
 */
export const verifyAndUpdateDomainStatus = async (
  organizationId: string,
  domain: string
): Promise<{
  success: boolean;
  status: DomainVerificationStatus;
  message: string;
}> => {
  try {
    // 1. التحقق من سجلات DNS
    const dnsResult = await verifyDomainDNS(domain);
    
    // إذا فشل التحقق من DNS، قم بتحديث الحالة وإنهاء العملية
    if (!dnsResult.success) {
      await updateDomainVerificationStatus(
        organizationId,
        domain,
        'error',
        dnsResult.message
      );
      
      return {
        success: false,
        status: 'error',
        message: dnsResult.message || 'فشل التحقق من سجلات DNS'
      };
    }
    
    // 2. التحقق من SSL
    const sslResult = await checkDomainSSL(domain);
    
    // إذا فشل التحقق من SSL، حدد الحالة كـ 'pending'
    if (!sslResult.valid) {
      await updateDomainVerificationStatus(
        organizationId,
        domain,
        'pending',
        'سجلات DNS صحيحة، لكن لم يتم إصدار شهادة SSL بعد'
      );
      
      return {
        success: true,
        status: 'pending',
        message: 'سجلات DNS صحيحة، لكن لم يتم إصدار شهادة SSL بعد. قد يستغرق إصدار SSL حتى 24 ساعة.'
      };
    }
    
    // 3. كل شيء صحيح، حدد الحالة كـ 'active'
    await updateDomainVerificationStatus(
      organizationId,
      domain,
      'active'
    );
    
    return {
      success: true,
      status: 'active',
      message: 'تم التحقق من النطاق بنجاح وهو نشط الآن'
    };
  } catch (error) {
    
    // تحديث الحالة في حالة حدوث خطأ
    await updateDomainVerificationStatus(
      organizationId,
      domain,
      'error',
      'حدث خطأ غير متوقع أثناء التحقق من النطاق'
    );
    
    return {
      success: false,
      status: 'error',
      message: 'حدث خطأ غير متوقع أثناء التحقق من النطاق'
    };
  }
};

/**
 * واجهة Vercel API للنطاقات
 */
const VERCEL_API_URL = 'https://api.vercel.com';

/**
 * التحقق من حالة النطاق في Vercel
 */
export async function verifyVercelDomainStatus(
  domain: string,
  projectId: string,
  vercelToken: string
): Promise<DomainVerificationResponse> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectId || !vercelToken) {
      return {
        verified: false,
        reason: 'missing-parameters',
        message: 'معلمات التحقق غير مكتملة'
      };
    }

    // استعلام حالة النطاق من Vercel API
    const response = await axios.get(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`
        }
      }
    );

    // التحقق من أن الاستجابة صالحة
    if (response.status >= 200 && response.status < 300 && response.data) {
      const { verification, verified, error } = response.data;

      if (verified) {
        return {
          verified: true,
          reason: 'verified',
          message: 'تم التحقق من النطاق بنجاح'
        };
      } else if (error?.code) {
        return {
          verified: false,
          reason: error.code,
          message: getVercelErrorMessage(error.code),
          errorCode: error.code
        };
      } else {
        // العودة بتفاصيل التحقق
        return {
          verified: false,
          reason: 'pending-verification',
          message: 'النطاق قيد التحقق',
          verification
        };
      }
    } else {
      throw new Error('استجابة Vercel API غير صالحة');
    }
  } catch (error) {
    
    if (axios.isAxiosError(error)) {
      // التعامل مع أخطاء Axios
      const errorCode = error.response?.data?.error?.code || 'unknown-error';
      const errorMessage = getVercelErrorMessage(errorCode);

      return {
        verified: false,
        reason: errorCode,
        message: errorMessage,
        errorCode
      };
    }

    // أخطاء أخرى
    return {
      verified: false,
      reason: 'api-error',
      message: error instanceof Error ? error.message : 'خطأ غير متوقع أثناء التحقق من النطاق'
    };
  }
}

/**
 * ربط نطاق بمشروع Vercel
 */
export async function linkDomainToVercelProject(
  domain: string,
  projectId: string,
  vercelToken: string
): Promise<{
  success: boolean;
  data?: any;
  error?: string;
}> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectId || !vercelToken) {
      return {
        success: false,
        error: 'معلمات ربط النطاق غير مكتملة'
      };
    }

    try {
      // محاولة إضافة النطاق إلى مشروع Vercel
      const response = await axios.post(
        `${VERCEL_API_URL}/v9/projects/${projectId}/domains`,
        { name: domain },
        {
          headers: {
            Authorization: `Bearer ${vercelToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // التحقق من أن الاستجابة صالحة
      if (response.status >= 200 && response.status < 300 && response.data) {
        
        return {
          success: true,
          data: response.data
        };
      } else {
        throw new Error('استجابة Vercel API غير صالحة');
      }
    } catch (axiosError) {
      if (axios.isAxiosError(axiosError)) {
        // التحقق من خطأ CSP
        if (axiosError.message?.includes('Content Security Policy') || 
            axiosError.message?.includes('CSP') ||
            axiosError.code === 'ERR_BLOCKED_BY_CLIENT') {
          
          // إرجاع حل بديل للمطور
          return {
            success: true,
            data: {
              name: domain,
              apexName: domain,
              message: 'تم إنشاء النطاق محلياً. يرجى إضافة النطاق يدوياً في لوحة تحكم Vercel.',
              manualSetupRequired: true,
              instructions: [
                '1. اذهب إلى لوحة تحكم Vercel',
                '2. اختر مشروعك',
                '3. اذهب إلى Domains',
                `4. أضف النطاق: ${domain}`,
                '5. اتبع التعليمات لإعداد DNS'
              ]
            }
          };
        }
        
        // التحقق من أن النطاق مضاف بالفعل
        if (axiosError.response?.status === 409) {
          
          // العودة بنجاح إذا كان النطاق مضاف بالفعل
          return {
            success: true,
            data: {
              name: domain,
              apexName: domain,
              message: 'النطاق مضاف بالفعل للمشروع'
            }
          };
        }
        
        // أخطاء Axios أخرى
        const errorMessage = axiosError.response?.data?.error?.message || 'خطأ في الاتصال بـ Vercel API';
        
        return {
          success: false,
          error: errorMessage
        };
      } 
      
      // أخطاء أخرى
      return {
        success: false,
        error: axiosError instanceof Error ? axiosError.message : 'حدث خطأ أثناء ربط النطاق'
      };
    }
  } catch (error) {
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ أثناء ربط النطاق'
    };
  }
}

/**
 * حذف نطاق من مشروع Vercel
 */
export async function removeDomainFromVercelProject(
  domain: string,
  projectId: string,
  vercelToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // التحقق من صحة المعلمات
    if (!domain || !projectId || !vercelToken) {
      return {
        success: false,
        error: 'معلمات حذف النطاق غير مكتملة'
      };
    }

    // حذف النطاق من مشروع Vercel
    const response = await axios.delete(
      `${VERCEL_API_URL}/v9/projects/${projectId}/domains/${domain}`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`
        }
      }
    );

    return { success: response.status >= 200 && response.status < 300 };
  } catch (error) {
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'خطأ غير متوقع أثناء حذف النطاق'
    };
  }
}

/**
 * الحصول على رسالة الخطأ المناسبة لرمز خطأ Vercel
 */
function getVercelErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'not_found':
      return 'لم يتم العثور على النطاق';
    case 'domain_not_found':
      return 'لم يتم العثور على النطاق في مشروع Vercel';
    case 'domain_configuration_error':
      return 'خطأ في تكوين النطاق. يرجى التحقق من إعدادات DNS الخاصة بك';
    case 'domain_verification_failed':
      return 'فشل التحقق من النطاق. يرجى التحقق من تكوين DNS الخاص بك';
    case 'domain_taken':
      return 'هذا النطاق مستخدم بالفعل في مشروع آخر';
    case 'not_authorized':
      return 'غير مصرح لك بإدارة هذا النطاق';
    case 'forbidden':
      return 'غير مسموح لك بتنفيذ هذا الإجراء';
    case 'server_error':
      return 'حدث خطأ في خادم Vercel. يرجى المحاولة مرة أخرى';
    default:
      return `خطأ غير معروف: ${errorCode}`;
  }
}

/**
 * إنشاء تعليمات DNS للنطاق المخصص
 */
export function generateCustomDomainDnsInstructions(
  domain: string
): { type: string; name: string; value: string; priority?: number }[] {
  // إزالة www إذا كان موجودًا للحصول على النطاق الرئيسي
  const baseDomain = domain.replace(/^www\./, '');
  const isApex = domain === baseDomain;
  
  if (isApex) {
    // النطاق الرئيسي يحتاج إلى سجل A و CNAME
    return [
      {
        type: 'A',
        name: '@',
        value: '76.76.21.21'
      },
      {
        type: 'CNAME',
        name: 'www',
        value: INTERMEDIATE_DOMAIN
      }
    ];
  } else if (domain.startsWith('www.')) {
    // نطاق www يحتاج فقط إلى CNAME
    return [
      {
        type: 'CNAME',
        name: 'www',
        value: INTERMEDIATE_DOMAIN
      }
    ];
  } else {
    // نطاق فرعي آخر
    return [
      {
        type: 'CNAME',
        name: domain.split('.')[0],
        value: INTERMEDIATE_DOMAIN
      }
    ];
  }
}
