/**
 * API لإزالة النطاق المخصص
 * 
 * يمكن استدعاء هذه الدالة مباشرة من المكون
 * 
 * @param {string} domain - اسم النطاق المخصص
 * @param {string} organizationId - معرف المؤسسة المرتبطة بالنطاق
 * @returns {Promise<{success: boolean, message?: string, error?: string}>}
 */
import { getSupabaseClient } from '@/lib/supabase';
import { removeDomainFromVercelProject } from './domain-verification-api';
import { getVercelToken, getVercelProjectId, hasVercelConfig } from '@/lib/api/env-config';

export async function removeDomain(domain, organizationId) {
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
        error: 'فشل في الاتصال بقاعدة البيانات'
      };
    }

    // التحقق من أن النطاق مرتبط بالمؤسسة المحددة
    const { data: organization, error: orgError } = await supabase
      .from('organizations')
      .select('domain')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      return {
        success: false,
        error: 'المؤسسة غير موجودة'
      };
    }

    if (organization.domain !== domain) {
      return {
        success: false,
        error: 'النطاق غير مرتبط بهذه المؤسسة'
      };
    }

    // الحصول على معلومات المشروع و token من وظائف متغيرات البيئة
    const VERCEL_TOKEN = getVercelToken();
    const VERCEL_PROJECT_ID = getVercelProjectId();
    const hasConfig = hasVercelConfig();

    console.log('Vercel Configuration:', { 
      hasToken: !!VERCEL_TOKEN, 
      hasProjectId: !!VERCEL_PROJECT_ID,
      configValid: hasConfig,
      domain,
      organizationId
    });

    if (!hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      };
    }

    // إزالة النطاق من Vercel
    const removeResult = await removeDomainFromVercelProject(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    if (!removeResult.success) {
      console.error('خطأ في إزالة النطاق من Vercel:', removeResult.error);
      // سنستمر في تنفيذ الحذف من قاعدة البيانات حتى لو فشل الحذف من Vercel
    }

    // إزالة النطاق من المؤسسة
    const { error: updateError } = await supabase
      .from('organizations')
      .update({ domain: null })
      .eq('id', organizationId);

    if (updateError) {
      return {
        success: false,
        error: 'حدث خطأ أثناء إزالة النطاق من المؤسسة'
      };
    }

    try {
      // حذف سجل التحقق
      const { error: deleteError } = await supabase
        .from('domain_verifications')
        .delete()
        .eq('organization_id', organizationId)
        .eq('domain', domain);

      if (deleteError) {
        console.error('خطأ في حذف سجل التحقق:', deleteError);
      }
    } catch (deleteError) {
      console.error('خطأ غير متوقع في حذف سجل التحقق:', deleteError);
      // سنتجاهل هذا الخطأ ونستمر
    }

    // إرجاع النتيجة
    return {
      success: true,
      message: 'تمت إزالة النطاق بنجاح'
    };
  } catch (error) {
    console.error('خطأ غير متوقع أثناء إزالة النطاق:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
} 