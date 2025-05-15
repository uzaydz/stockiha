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

    

    if (!hasConfig) {
      return {
        success: false,
        error: 'لم يتم تكوين متغيرات البيئة اللازمة للاتصال بـ Vercel API.'
      };
    }

    // التحقق من حالة المؤسسة قبل التحديث
    const { data: organizationBefore } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();
    
    

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
      console.error('حدث خطأ أثناء تحديث النطاق في قاعدة البيانات:', dbError);
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
            updated_at: now
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
            updated_at: now
          }])
          .select();
          
        
      }
    } catch (verificationError) {
      console.error('خطأ في التحقق من النطاق:', verificationError);
      // لا نريد إيقاف العملية بسبب خطأ في التحقق
    }

    // إرجاع النتيجة
    return {
      success: true,
      data: {
        domain: cleanDomain,
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