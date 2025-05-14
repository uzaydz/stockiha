/**
 * API للحصول على النطاق المخصص للمؤسسة
 * 
 * يمكن استدعاء هذه الدالة مباشرة من المكون
 * 
 * @param {string} organizationId - معرف المؤسسة
 * @returns {Promise<{success: boolean, data?: any, error?: string}>}
 */
import { getSupabaseClient } from '@/lib/supabase';

export async function getDomainInfo(organizationId) {
  try {
    if (!organizationId) {
      return {
        success: false,
        error: 'معرف المؤسسة مطلوب'
      };
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return {
        success: false, 
        error: 'فشل في الاتصال بقاعدة البيانات'
      };
    }

    console.log(`جلب معلومات النطاق للمؤسسة: ${organizationId}`);

    // 1. جلب معلومات المؤسسة من قاعدة البيانات
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, domain')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('خطأ في استعلام معلومات المؤسسة:', orgError);
      return {
        success: false,
        error: orgError.message || 'فشل في جلب معلومات المؤسسة'
      };
    }

    if (!orgData) {
      return {
        success: false,
        error: 'المؤسسة غير موجودة'
      };
    }

    console.log('معلومات المؤسسة:', orgData);

    // 2. جلب حالة التحقق من النطاق إذا كان النطاق موجودًا
    let verificationData = null;
    
    if (orgData.domain) {
      const { data: verificationInfo, error: verificationError } = await supabase
        .from('domain_verifications')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('domain', orgData.domain)
        .maybeSingle();

      if (verificationError) {
        console.error('خطأ في استعلام معلومات التحقق من النطاق:', verificationError);
      } else {
        verificationData = verificationInfo;
        console.log('معلومات التحقق من النطاق:', verificationData);
      }
    }

    return {
      success: true,
      data: {
        domain: orgData.domain,
        verification: verificationData
      }
    };
  } catch (error) {
    console.error('خطأ غير متوقع أثناء جلب معلومات النطاق:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'حدث خطأ غير متوقع'
    };
  }
} 