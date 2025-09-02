/**
 * API لربط نطاق مخصص مع Cloudflare Pages
 * 
 * يمكن استدعاء هذه الدالة مباشرة من المكون
 * 
 * @param {string} domain - اسم النطاق المخصص
 * @param {string} organizationId - معرف المؤسسة المرتبطة بالنطاق
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
import { getSupabaseClient } from '@/lib/supabase';
import { 
  linkDomainToCloudflareProject, 
  verifyCloudflareDomainStatus,
  getCloudflareDnsInstructions,
  removeDomainFromCloudflareProject
} from './cloudflare-domain-api';
import { 
  getCloudflareToken, 
  getCloudflareProjectName, 
  getCloudflareZoneId,
  hasCloudflareConfig 
} from '@/lib/api/cloudflare-config';

export async function linkDomainCloudflare(domain, organizationId) {
  try {
    if (!domain || !organizationId) {
      return {
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false, 
        error: 'فشل في الاتصال بقاعدة البيانات - عميل Supabase غير متاح'
      };
    }

    // الحصول على معلومات المشروع و token من وظائف متغيرات البيئة
    const CLOUDFLARE_TOKEN = getCloudflareToken();
    const CLOUDFLARE_PROJECT_NAME = getCloudflareProjectName();
    const CLOUDFLARE_ZONE_ID = getCloudflareZoneId();
    const hasConfig = hasCloudflareConfig();

    if (!hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Cloudflare API.'
      };
    }

    // التحقق من حالة المؤسسة قبل التحديث
    const { data: organizationBefore } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    // ربط النطاق بمشروع Cloudflare Pages
    const linkResult = await linkDomainToCloudflareProject(
      domain,
      CLOUDFLARE_PROJECT_NAME,
      CLOUDFLARE_TOKEN
    );

    if (!linkResult.success) {
      return {
        success: false,
        error: linkResult.error || 'حدث خطأ أثناء ربط النطاق'
      };
    }

    // تنظيف النطاق للتأكد من تخزينه بتنسيق متناسق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '') // إزالة البروتوكول
      .replace(/^www\./i, '')      // إزالة www.
      .split(':')[0]               // إزالة المنفذ (مثل :3000)
      .split('/')[0];              // إزالة المسارات

    // تحديث النطاق في قاعدة البيانات
    const { data: updateData, error: dbError } = await supabase
      .from('organizations')
      .update({ domain: cleanDomain })
      .eq('id', organizationId)
      .select('id, name, domain');

    if (dbError) {
      return {
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      };
    }

    // التحقق من نجاح تحديث المؤسسة
    const { data: organizationAfter } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    try {
      // التحقق من حالة النطاق (DNS و SSL)
      const verificationStatus = await verifyCloudflareDomainStatus(
        domain,
        CLOUDFLARE_PROJECT_NAME,
        CLOUDFLARE_TOKEN
      );

      // تخزين معلومات التحقق في قاعدة البيانات
      const { data: existingRecord } = await supabase
        .from('domain_verifications')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('domain', cleanDomain)
        .maybeSingle();
      
      const now = new Date().toISOString();
      
      if (existingRecord) {
        // تحديث سجل موجود
        const { data: updatedVerification, error: verificationUpdateError } = await supabase
          .from('domain_verifications')
          .update({
            status: verificationStatus.verified ? 'verified' : 'pending',
            error_message: verificationStatus.message || null,
            updated_at: now,
            verification_data: JSON.stringify({
              cloudflare: true,
              project_name: CLOUDFLARE_PROJECT_NAME,
              zone_id: CLOUDFLARE_ZONE_ID,
              dns_instructions: getCloudflareDnsInstructions(cleanDomain)
            })
          })
          .eq('id', existingRecord.id)
          .select();

      } else {
        // إنشاء سجل جديد
        const { data: newVerification, error: verificationInsertError } = await supabase
          .from('domain_verifications')
          .insert([{
            organization_id: organizationId,
            domain: cleanDomain,
            status: verificationStatus.verified ? 'verified' : 'pending',
            error_message: verificationStatus.message || null,
            created_at: now,
            updated_at: now,
            verification_data: JSON.stringify({
              cloudflare: true,
              project_name: CLOUDFLARE_PROJECT_NAME,
              zone_id: CLOUDFLARE_ZONE_ID,
              dns_instructions: getCloudflareDnsInstructions(cleanDomain)
            })
          }])
          .select();
      }
    } catch (verificationError) {
      // لا نريد إيقاف العملية بسبب خطأ في التحقق
      console.warn('خطأ في التحقق من النطاق:', verificationError);
    }

    // إرجاع النتيجة
    return {
      success: true,
      data: {
        domain: cleanDomain,
        verification: linkResult.data?.verification || null,
        dns_instructions: getCloudflareDnsInstructions(cleanDomain),
        cloudflare_project: CLOUDFLARE_PROJECT_NAME
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}

/**
 * إزالة نطاق من Cloudflare Pages
 */
export async function removeDomainCloudflare(domain, organizationId) {
  try {
    if (!domain || !organizationId) {
      return {
        success: false,
        error: 'البيانات المطلوبة غير مكتملة. يرجى توفير domain و organizationId.'
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false, 
        error: 'فشل في الاتصال بقاعدة البيانات - عميل Supabase غير متاح'
      };
    }

    // الحصول على معلومات المشروع و token
    const CLOUDFLARE_TOKEN = getCloudflareToken();
    const CLOUDFLARE_PROJECT_NAME = getCloudflareProjectName();
    const hasConfig = hasCloudflareConfig();

    if (!hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Cloudflare API.'
      };
    }

    // إزالة النطاق من Cloudflare Pages
    const removeResult = await removeDomainFromCloudflareProject(
      domain,
      CLOUDFLARE_PROJECT_NAME,
      CLOUDFLARE_TOKEN
    );

    if (!removeResult.success) {
      return {
        success: false,
        error: removeResult.error || 'حدث خطأ أثناء إزالة النطاق'
      };
    }

    // تنظيف النطاق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(':')[0]
      .split('/')[0];

    // تحديث النطاق في قاعدة البيانات (إزالة النطاق)
    const { data: updateData, error: dbError } = await supabase
      .from('organizations')
      .update({ domain: null })
      .eq('id', organizationId)
      .select('id, name, domain');

    if (dbError) {
      return {
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      };
    }

    // حذف سجل التحقق
    await supabase
      .from('domain_verifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('domain', cleanDomain);

    return {
      success: true,
      data: {
        domain: null,
        message: 'تم إزالة النطاق بنجاح'
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}
