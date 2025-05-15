/**
 * API للتحقق من حالة النطاق المخصص
 * 
 * يمكن استدعاء هذه الدالة مباشرة من المكون
 * 
 * @param {string} domain - اسم النطاق المخصص
 * @param {string} organizationId - معرف المؤسسة المرتبطة بالنطاق
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
import { getSupabaseClient } from '@/lib/supabase';
import { verifyVercelDomainStatus } from './domain-verification-api';
import { getVercelToken, getVercelProjectId, hasVercelConfig } from '@/lib/api/env-config';

export async function checkDomainStatus(domain, organizationId) {
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

    

    if (!hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      };
    }

    // التحقق من حالة النطاق مع Vercel
    const verificationStatus = await verifyVercelDomainStatus(
      domain,
      VERCEL_PROJECT_ID,
      VERCEL_TOKEN
    );

    try {
      // تحديث سجل النطاق في قاعدة البيانات
      // التحقق من وجود السجل
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
            status: verificationStatus.verified ? 'active' : 'pending',
            error_message: verificationStatus.message || null,
            verified_at: verificationStatus.verified ? now : null,
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
            status: verificationStatus.verified ? 'active' : 'pending',
            error_message: verificationStatus.message || null,
            verified_at: verificationStatus.verified ? now : null,
            created_at: now,
            updated_at: now
          }]);
      }
    } catch (dbError) {
      console.error('خطأ في تحديث سجل النطاق:', dbError);
      // نواصل بغض النظر عن خطأ تحديث قاعدة البيانات
    }

    // إرجاع النتيجة
    return {
      success: true,
      data: {
        domain: domain,
        verified: verificationStatus.verified || false,
        message: verificationStatus.message || '',
        reason: verificationStatus.reason || '',
        verification: verificationStatus.verification || null
      }
    };
  } catch (error) {
    console.error('خطأ غير متوقع أثناء التحقق من حالة النطاق:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
} 