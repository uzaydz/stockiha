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
      return { success: false, error: error as Error };
    }

    if (!organizationId) {
      return { success: false, error: new Error('فشل إنشاء المنظمة: استجابة غير متوقعة.') };
    }

    return { success: true, error: null, organizationId: organizationId as string };

  } catch (error) {
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
    
    const { data, error } = await supabaseAdmin.rpc(
      'diagnose_tenant_registration' as any,
      {
        p_subdomain: subdomain,
        p_user_id: userId || null
      }
    );

    if (error) {
      return [];
    }

    return (data || []) as any[];

  } catch (error) {
    return [];
  }
};

/**
 * تنظيف البيانات الفاسدة
 */
export const cleanupOrphanedData = async (): Promise<any[]> => {
  try {
    
    const { data, error } = await supabaseAdmin.rpc('cleanup_orphaned_data' as any);

    if (error) {
      return [];
    }

    return (data || []) as any[];

  } catch (error) {
    return [];
  }
};
