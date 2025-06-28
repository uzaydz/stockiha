import { supabase } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

/**
 * إنشاء مؤسسة بالطريقة المحسنة والأكثر أمانًا
 * يستخدم الوظيفة الجديدة create_organization_ultimate
 */
export const createOrganizationSafe = async (
  organizationName: string, 
  subdomain: string, 
  userId: string,
  settings: Record<string, any> = {}
): Promise<{ success: boolean; error: Error | null; organizationId?: string }> => {
  try {
    console.log(`🏢 بدء إنشاء المؤسسة: ${organizationName} مع النطاق: ${subdomain}`);
    
    // استدعاء الوظيفة المحسنة الجديدة
    const { data: organizationId, error } = await supabaseAdmin.rpc(
      'create_organization_ultimate' as any,
      {
        p_name: organizationName,
        p_subdomain: subdomain,
        p_owner_id: userId,
        p_settings: settings
      }
    );

    if (error) {
      console.error('❌ خطأ من الوظيفة create_organization_ultimate:', error);
      return { success: false, error: error as Error };
    }

    if (!organizationId) {
      console.error('❌ الوظيفة لم ترجع معرف المؤسسة');
      return { success: false, error: new Error('فشل إنشاء المنظمة: استجابة غير متوقعة.') };
    }

    console.log(`✅ تم إنشاء المؤسسة بنجاح: ${organizationId}`);
    return { success: true, error: null, organizationId: organizationId as string };

  } catch (error) {
    console.error('❌ استثناء في createOrganizationSafe:', error);
    return { success: false, error: error as Error };
  }
};

/**
 * تشخيص مشاكل التسجيل
 */
export const diagnoseTenantRegistration = async (
  subdomain: string,
  userId?: string
): Promise<any[]> => {
  try {
    console.log(`🔧 تشخيص مشاكل التسجيل للنطاق: ${subdomain}`);
    
    const { data, error } = await supabaseAdmin.rpc(
      'diagnose_tenant_registration' as any,
      {
        p_subdomain: subdomain,
        p_user_id: userId || null
      }
    );

    if (error) {
      console.error('❌ خطأ في التشخيص:', error);
      return [];
    }

    console.log('📊 نتائج التشخيص:', data);
    return (data || []) as any[];

  } catch (error) {
    console.error('❌ استثناء في التشخيص:', error);
    return [];
  }
};

/**
 * تنظيف البيانات الفاسدة
 */
export const cleanupOrphanedData = async (): Promise<any[]> => {
  try {
    console.log('🧹 بدء تنظيف البيانات الفاسدة...');
    
    const { data, error } = await supabaseAdmin.rpc('cleanup_orphaned_data' as any);

    if (error) {
      console.error('❌ خطأ في تنظيف البيانات:', error);
      return [];
    }

    console.log('✅ نتائج التنظيف:', data);
    return (data || []) as any[];

  } catch (error) {
    console.error('❌ استثناء في تنظيف البيانات:', error);
    return [];
  }
};
