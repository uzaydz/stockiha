import { getSupabaseClient } from '@/lib/supabase';
import { DomainVerificationStatus } from '@/types/domain-verification';

/**
 * وظيفة للحصول على معلومات النطاق والتحقق مباشرة من قاعدة البيانات
 */
export async function getDomainInfo(organizationId: string) {
  try {
    const supabase = getSupabaseClient();
    
    // التحقق من صحة عميل Supabase قبل الاستخدام
    if (!supabase) {
      return {
        success: false,
        error: 'فشل في الحصول على عميل Supabase'
      };
    }
    
    // التحقق من وجود النطاق للمؤسسة
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('domain')
      .eq('id', organizationId)
      .single();
    
    if (orgError) {
      return {
        success: false,
        error: 'خطأ في استعلام معلومات المؤسسة: ' + orgError.message
      };
    }
    
    if (!orgData || !orgData.domain) {
      return {
        success: true,
        data: { domain: null, verification: null }
      };
    }
    
    // جلب معلومات التحقق من النطاق
    const { data: verificationData, error: verificationError } = await supabase
      .from('domain_verifications')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('domain', orgData.domain)
      .maybeSingle();
    
    if (verificationError) {
      return {
        success: false,
        error: 'خطأ في استعلام معلومات التحقق من النطاق: ' + verificationError.message
      };
    }
    
    return {
      success: true,
      data: {
        domain: orgData.domain,
        verification: verificationData ? {
          id: verificationData.id,
          status: verificationData.status as DomainVerificationStatus,
          error_message: verificationData.error_message,
          updated_at: verificationData.updated_at,
          verified_at: verificationData.verified_at,
        } : null
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
}
