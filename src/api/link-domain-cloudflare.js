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
  removeDomainFromCloudflareProject,
  getUserIntermediateDomain
} from './cloudflare-domain-api';
import { 
  getCloudflareToken, 
  getCloudflareProjectName, 
  getCloudflareZoneId,
  hasCloudflareConfig 
} from '@/lib/api/cloudflare-config';

export async function linkDomainCloudflare(domain, organizationId) {
  console.log('🚀 بدء عملية ربط النطاق:', {
    domain,
    organizationId,
    timestamp: new Date().toISOString()
  });

  try {
    if (!domain || !organizationId) {
      console.error('❌ بيانات مفقودة:', { domain, organizationId });
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

    // الحصول على معلومات المشروع من متغيرات البيئة العامة
    const CLOUDFLARE_PROJECT_NAME = getCloudflareProjectName();
    
    // التحقق من إعدادات Cloudflare عبر API Route الآمن
    const configResponse = await fetch('/api/cloudflare-config');
    const configData = await configResponse.json();

    if (!configData.hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Cloudflare API.'
      };
    }

    // سنستخدم API Route للتعامل مع Cloudflare API بدلاً من الاتصال المباشر
    // هذا أكثر أماناً ولا يتطلب كشف المتغيرات الحساسة

    // التحقق من حالة المؤسسة قبل التحديث
    const { data: organizationBefore } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    // ربط النطاق باستخدام API Route الآمن
    const linkResponse = await fetch('/api/cloudflare-domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'add-domain',
        domain: domain
      })
    });

    const linkResult = await linkResponse.json();

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
    console.log('🔄 محاولة تحديث النطاق في قاعدة البيانات:', {
      organizationId,
      cleanDomain,
      originalDomain: domain
    });

    const { data: updateData, error: dbError } = await supabase
      .from('organizations')
      .update({ domain: cleanDomain })
      .eq('id', organizationId)
      .select('id, name, domain');

    console.log('📊 نتيجة تحديث قاعدة البيانات:', {
      updateData,
      dbError,
      errorCode: dbError?.code,
      errorMessage: dbError?.message,
      errorDetails: dbError?.details
    });

    if (dbError) {
      console.error('❌ خطأ في تحديث قاعدة البيانات:', dbError);
      return {
        success: false,
        error: `حدث خطأ أثناء تحديث النطاق في قاعدة البيانات: ${dbError.message}`
      };
    }

    // التحقق من نجاح تحديث المؤسسة
    const { data: organizationAfter } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    try {
      // التحقق من حالة النطاق عبر API Route
      const verificationResponse = await fetch('/api/cloudflare-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'verify-domain',
          domain: cleanDomain
        })
      });

      const verificationResult = await verificationResponse.json();
      const verificationStatus = verificationResult.success ? { verified: true, message: null } : { verified: false, message: verificationResult.error };

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
              intermediate_domain: getUserIntermediateDomain(organizationId),
              dns_instructions: getCloudflareDnsInstructions(cleanDomain, organizationId)
            })
          }])
          .select();
      }
    } catch (verificationError) {
      // لا نريد إيقاف العملية بسبب خطأ في التحقق
      console.warn('خطأ في التحقق من النطاق:', verificationError);
    }

    // إرجاع النتيجة
    const finalResult = {
      success: true,
      data: {
        domain: cleanDomain,
        verification: linkResult.data?.verification || null,
        intermediate_domain: getUserIntermediateDomain(organizationId),
        dns_instructions: getCloudflareDnsInstructions(cleanDomain, organizationId),
        cloudflare_project: CLOUDFLARE_PROJECT_NAME
      }
    };

    console.log('✅ نجحت عملية ربط النطاق:', {
      finalResult,
      organizationAfter,
      cleanDomain
    });

    return finalResult;
  } catch (error) {
    console.error('💥 خطأ عام في عملية ربط النطاق:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      stack: error instanceof Error ? error.stack : null,
      domain,
      organizationId
    });

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
  console.log('🗑️ بدء عملية إزالة النطاق:', {
    domain,
    organizationId,
    timestamp: new Date().toISOString()
  });

  try {
    if (!domain || !organizationId) {
      console.error('❌ بيانات مفقودة لإزالة النطاق:', { domain, organizationId });
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

    // التحقق من إعدادات Cloudflare عبر API Route الآمن
    const configResponse = await fetch('/api/cloudflare-config');
    const configData = await configResponse.json();

    if (!configData.hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Cloudflare API.'
      };
    }

    // إزالة النطاق عبر API Route الآمن
    const removeResponse = await fetch('/api/cloudflare-domains', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'remove-domain',
        domain: domain
      })
    });

    const removeResult = await removeResponse.json();

    // حتى لو فشل الحذف من Cloudflare (النطاق غير موجود)، نستمر لحذفه من قاعدة البيانات
    
    
    if (!removeResult.success) {
      console.warn('⚠️ فشل حذف النطاق من Cloudflare (ربما غير موجود)، لكن سنحذفه من قاعدة البيانات:', removeResult.error);
      // لا نتوقف هنا - نستمر لحذف النطاق من قاعدة البيانات
    }

    // تنظيف النطاق
    const cleanDomain = domain.toLowerCase()
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .split(':')[0]
      .split('/')[0];

    // تحديث النطاق في قاعدة البيانات (إزالة النطاق)
    console.log('🗄️ محاولة حذف النطاق من قاعدة البيانات:', {
      organizationId,
      cleanDomain,
      originalDomain: domain
    });

    const { data: updateData, error: dbError } = await supabase
      .from('organizations')
      .update({ domain: null })
      .eq('id', organizationId)
      .select('id, name, domain');

    console.log('📊 نتيجة حذف النطاق من قاعدة البيانات:', {
      updateData,
      dbError,
      errorCode: dbError?.code,
      errorMessage: dbError?.message
    });

    if (dbError) {
      console.error('❌ خطأ في حذف النطاق من قاعدة البيانات:', dbError);
      return {
        success: false,
        error: `حدث خطأ أثناء حذف النطاق من قاعدة البيانات: ${dbError.message}`
      };
    }

    // حذف سجل التحقق
    await supabase
      .from('domain_verifications')
      .delete()
      .eq('organization_id', organizationId)
      .eq('domain', cleanDomain);

    const finalResult = {
      success: true,
      data: {
        domain: null,
        message: 'تم إزالة النطاق بنجاح'
      }
    };

    

    return finalResult;
  } catch (error) {
    console.error('💥 خطأ عام في عملية إزالة النطاق:', {
      error,
      errorMessage: error instanceof Error ? error.message : 'حدث خطأ غير متوقع',
      stack: error instanceof Error ? error.stack : null,
      domain,
      organizationId
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}
