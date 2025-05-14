/**
 * API لربط نطاق مخصص للمتجر
 * 
 * يمكن استدعاء هذه الدالة مباشرة من المكون
 * 
 * @param {string} domain - اسم النطاق المخصص
 * @param {string} organizationId - معرف المؤسسة المرتبطة بالنطاق
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
import { getSupabaseClient } from '@/lib/supabase';
import { linkDomainToVercelProject, verifyVercelDomainStatus } from './domain-verification-api';
import { getVercelToken, getVercelProjectId, hasVercelConfig } from '@/lib/api/env-config';

export async function linkDomain(domain, organizationId) {
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

    // ربط النطاق بمشروع Vercel
    const linkResult = await linkDomainToVercelProject(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    if (!linkResult.success) {
      return {
        success: false,
        error: linkResult.error || 'حدث خطأ أثناء ربط النطاق'
      };
    }

    // تحديث النطاق في قاعدة البيانات
    const { error: dbError } = await supabase
      .from('organizations')
      .update({ domain: domain })
      .eq('id', organizationId);

    if (dbError) {
      console.error('حدث خطأ أثناء تحديث النطاق في قاعدة البيانات:', dbError);
      return {
        success: false,
        error: 'حدث خطأ أثناء تحديث النطاق في قاعدة البيانات'
      };
    }

    try {
      // التحقق من حالة النطاق (DNS و SSL)
      const verificationStatus = await verifyVercelDomainStatus(
        domain,
        VERCEL_PROJECT_ID,
        VERCEL_TOKEN
      );

      // تخزين معلومات التحقق في قاعدة البيانات
      const { data: existingRecord } = await supabase
        .from('domain_verifications')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('domain', domain)
        .maybeSingle();
      
      const now = new Date().toISOString();
      
      if (existingRecord) {
        // تحديث سجل موجود
        await supabase
          .from('domain_verifications')
          .update({
            status: verificationStatus.verified ? 'verified' : 'pending',
            error_message: verificationStatus.message || null,
            updated_at: now
          })
          .eq('id', existingRecord.id);
      } else {
        // إنشاء سجل جديد
        await supabase
          .from('domain_verifications')
          .insert([{
            organization_id: organizationId,
            domain: domain,
            status: verificationStatus.verified ? 'verified' : 'pending',
            error_message: verificationStatus.message || null,
            created_at: now,
            updated_at: now
          }]);
      }
    } catch (verificationError) {
      console.error('خطأ في التحقق من النطاق:', verificationError);
      // لا نريد إيقاف العملية بسبب خطأ في التحقق
    }

    // إرجاع النتيجة
    return {
      success: true,
      data: {
        domain: domain,
        verification: linkResult.data?.verification || null
      }
    };
  } catch (error) {
    console.error('خطأ غير متوقع أثناء ربط النطاق:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
} 